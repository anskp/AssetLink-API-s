/**
 * Trade Service
 * Manages marketplace bids and trade execution
 */

import prisma from '../../config/db.js';
import * as auditService from '../audit/audit.service.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../errors/ApiError.js';
import logger from '../../utils/logger.js';
import { ListingStatus } from './listing.service.js';

/**
 * Bid Status Enum
 */
export const BidStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED'
};

/**
 * Place a bid on a listing
 */
export const placeBid = async (listingId, data, buyerId, context = {}) => {
  const { amount } = data;
  
  if (!amount) {
    throw new BadRequestError('Bid amount is required');
  }
  
  // Get listing
  const listing = await prisma.listing.findUnique({
    where: { id: listingId }
  });
  
  if (!listing) {
    throw new NotFoundError(`Listing ${listingId} not found`);
  }
  
  // Verify listing is in ACTIVE status
  if (listing.status !== ListingStatus.ACTIVE) {
    throw new BadRequestError(`Cannot bid on listing with status ${listing.status}`);
  }
  
  // Verify buyer has sufficient balance
  const userBalance = await prisma.userBalance.findUnique({
    where: { userId: buyerId }
  });
  
  if (!userBalance || parseFloat(userBalance.balance) < parseFloat(amount)) {
    throw new BadRequestError('Insufficient balance');
  }
  
  // Create bid
  const bid = await prisma.bid.create({
    data: {
      listingId,
      buyerId,
      amount,
      status: BidStatus.PENDING
    }
  });
  
  logger.info('Bid placed', {
    bidId: bid.id,
    listingId,
    buyerId,
    amount
  });
  
  // Log audit event
  await auditService.logEvent('BID_PLACED', {
    bidId: bid.id,
    listingId,
    assetId: listing.assetId,
    amount
  }, {
    custodyRecordId: listing.custodyRecordId,
    actor: buyerId,
    ...context
  });
  
  return bid;
};

/**
 * Accept a bid (executes off-chain ownership transfer and payment settlement)
 */
export const acceptBid = async (bidId, sellerId, context = {}) => {
  // Get bid with listing
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: {
      listing: true
    }
  });
  
  if (!bid) {
    throw new NotFoundError(`Bid ${bidId} not found`);
  }
  
  const listing = bid.listing;
  
  // Verify seller owns the listing
  if (listing.sellerId !== sellerId) {
    throw new ForbiddenError('Only the listing owner can accept bids');
  }
  
  // Verify bid is still valid
  if (bid.status !== BidStatus.PENDING) {
    throw new BadRequestError(`Cannot accept bid with status ${bid.status}`);
  }
  
  // Verify listing is still active
  if (listing.status !== ListingStatus.ACTIVE) {
    throw new BadRequestError(`Cannot accept bid for listing with status ${listing.status}`);
  }
  
  // Verify buyer has sufficient funds
  const buyerBalance = await prisma.userBalance.findUnique({
    where: { userId: bid.buyerId }
  });
  
  if (!buyerBalance || parseFloat(buyerBalance.balance) < parseFloat(bid.amount)) {
    throw new BadRequestError('Buyer has insufficient funds');
  }
  
  // Execute atomic transaction:
  // 1. Transfer ownership in off-chain ledger
  // 2. Update buyer balance (decrease)
  // 3. Update seller balance (increase)
  // 4. Update listing status to SOLD
  // 5. Update bid status to ACCEPTED
  
  const result = await prisma.$transaction(async (tx) => {
    // 1. Transfer ownership
    await tx.ownership.delete({
      where: {
        assetId_ownerId: {
          assetId: listing.assetId,
          ownerId: sellerId
        }
      }
    });
    
    await tx.ownership.create({
      data: {
        assetId: listing.assetId,
        custodyRecordId: listing.custodyRecordId,
        ownerId: bid.buyerId,
        quantity: '1' // For now, assuming single token
      }
    });
    
    // 2. Update buyer balance (decrease)
    await tx.userBalance.update({
      where: { userId: bid.buyerId },
      data: {
        balance: (parseFloat(buyerBalance.balance) - parseFloat(bid.amount)).toString()
      }
    });
    
    // 3. Update seller balance (increase)
    const sellerBalance = await tx.userBalance.findUnique({
      where: { userId: sellerId }
    });
    
    if (sellerBalance) {
      await tx.userBalance.update({
        where: { userId: sellerId },
        data: {
          balance: (parseFloat(sellerBalance.balance) + parseFloat(bid.amount)).toString()
        }
      });
    } else {
      await tx.userBalance.create({
        data: {
          userId: sellerId,
          balance: bid.amount,
          currency: listing.currency
        }
      });
    }
    
    // 4. Update listing status to SOLD
    const updatedListing = await tx.listing.update({
      where: { id: listing.id },
      data: {
        status: ListingStatus.SOLD,
        updatedAt: new Date()
      }
    });
    
    // 5. Update bid status to ACCEPTED
    const updatedBid = await tx.bid.update({
      where: { id: bidId },
      data: {
        status: BidStatus.ACCEPTED,
        updatedAt: new Date()
      }
    });
    
    return {
      bid: updatedBid,
      listing: updatedListing
    };
  });
  
  logger.info('Bid accepted and trade executed', {
    bidId,
    listingId: listing.id,
    assetId: listing.assetId,
    sellerId,
    buyerId: bid.buyerId,
    amount: bid.amount
  });
  
  // Log audit event
  await auditService.logEvent('BID_ACCEPTED', {
    bidId,
    listingId: listing.id,
    assetId: listing.assetId,
    sellerId,
    buyerId: bid.buyerId,
    amount: bid.amount
  }, {
    custodyRecordId: listing.custodyRecordId,
    actor: sellerId,
    ...context
  });
  
  await auditService.logEvent('OWNERSHIP_TRANSFERRED', {
    assetId: listing.assetId,
    fromUserId: sellerId,
    toUserId: bid.buyerId,
    amount: bid.amount
  }, {
    custodyRecordId: listing.custodyRecordId,
    actor: 'SYSTEM',
    ...context
  });
  
  return result;
};

/**
 * Reject a bid
 */
export const rejectBid = async (bidId, sellerId, context = {}) => {
  // Get bid with listing
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: {
      listing: true
    }
  });
  
  if (!bid) {
    throw new NotFoundError(`Bid ${bidId} not found`);
  }
  
  const listing = bid.listing;
  
  // Verify seller owns the listing
  if (listing.sellerId !== sellerId) {
    throw new ForbiddenError('Only the listing owner can reject bids');
  }
  
  // Verify bid is still pending
  if (bid.status !== BidStatus.PENDING) {
    throw new BadRequestError(`Cannot reject bid with status ${bid.status}`);
  }
  
  // Update bid status to REJECTED
  const updatedBid = await prisma.bid.update({
    where: { id: bidId },
    data: {
      status: BidStatus.REJECTED,
      updatedAt: new Date()
    }
  });
  
  logger.info('Bid rejected', {
    bidId,
    listingId: listing.id,
    assetId: listing.assetId,
    sellerId
  });
  
  // Log audit event
  await auditService.logEvent('BID_REJECTED', {
    bidId,
    listingId: listing.id,
    assetId: listing.assetId
  }, {
    custodyRecordId: listing.custodyRecordId,
    actor: sellerId,
    ...context
  });
  
  return updatedBid;
};

/**
 * Get bids for a listing
 */
export const getListingBids = async (listingId) => {
  const bids = await prisma.bid.findMany({
    where: { listingId },
    orderBy: {
      amount: 'desc'
    }
  });
  
  return bids;
};

export default {
  placeBid,
  acceptBid,
  rejectBid,
  getListingBids,
  BidStatus
};
