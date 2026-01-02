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
  const { amount, quantity } = data;
  
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
  
  const bidQuantity = parseFloat(quantity || '1');
  const totalBidAmount = parseFloat(amount) * bidQuantity;
  
  if (!userBalance || parseFloat(userBalance.balance) < totalBidAmount) {
    throw new BadRequestError(`Insufficient balance. Required: ${totalBidAmount}, Available: ${userBalance?.balance || 0}`);
  }
  
  // Create bid
  const bid = await prisma.bid.create({
    data: {
      listingId,
      tenantId: listing.tenantId,
      buyerId,
      amount,
      quantity: quantity || '1',
      status: BidStatus.PENDING
    }
  });
  
  logger.info('Bid placed', {
    bidId: bid.id,
    listingId,
    buyerId,
    amount,
    quantity: bidQuantity
  });
  
  // Log audit event
  await auditService.logEvent('BID_PLACED', {
    bidId: bid.id,
    listingId,
    assetId: listing.assetId,
    amount,
    quantity: bidQuantity
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
  
  const bidQuantity = parseFloat(bid.quantity || '1');
  const totalAmount = parseFloat(bid.amount) * bidQuantity;
  
  // Verify buyer has sufficient funds
  const buyerBalance = await prisma.userBalance.findUnique({
    where: { userId: bid.buyerId }
  });
  
  if (!buyerBalance || parseFloat(buyerBalance.balance) < totalAmount) {
    throw new BadRequestError('Buyer has insufficient funds');
  }
  
  // Execute atomic transaction:
  // 1. Transfer ownership in off-chain ledger
  // 2. Update buyer balance (decrease)
  // 3. Update seller balance (increase)
  // 4. Update listing status to SOLD (or reduce quantity)
  // 5. Update bid status to ACCEPTED
  
  const result = await prisma.$transaction(async (tx) => {
    // 1. Transfer ownership
    // Reduce seller's ownership
    const sellerOwnership = await tx.ownership.findUnique({
      where: {
        assetId_ownerId: {
          assetId: listing.assetId,
          ownerId: sellerId
        }
      }
    });
    
    if (!sellerOwnership) {
      throw new BadRequestError('Seller does not own this asset');
    }
    
    const sellerQuantity = parseFloat(sellerOwnership.quantity);
    if (sellerQuantity < bidQuantity) {
      throw new BadRequestError(`Insufficient quantity. Available: ${sellerQuantity}, Required: ${bidQuantity}`);
    }
    
    if (sellerQuantity === bidQuantity) {
      // Delete seller's ownership if selling all
      await tx.ownership.delete({
        where: {
          assetId_ownerId: {
            assetId: listing.assetId,
            ownerId: sellerId
          }
        }
      });
    } else {
      // Reduce seller's quantity
      await tx.ownership.update({
        where: {
          assetId_ownerId: {
            assetId: listing.assetId,
            ownerId: sellerId
          }
        },
        data: {
          quantity: (sellerQuantity - bidQuantity).toString()
        }
      });
    }
    
    // Create or update buyer's ownership
    const buyerOwnership = await tx.ownership.findUnique({
      where: {
        assetId_ownerId: {
          assetId: listing.assetId,
          ownerId: bid.buyerId
        }
      }
    });
    
    if (buyerOwnership) {
      // Update existing ownership
      await tx.ownership.update({
        where: {
          assetId_ownerId: {
            assetId: listing.assetId,
            ownerId: bid.buyerId
          }
        },
        data: {
          quantity: (parseFloat(buyerOwnership.quantity) + bidQuantity).toString()
        }
      });
    } else {
      // Create new ownership
      await tx.ownership.create({
        data: {
          assetId: listing.assetId,
          custodyRecordId: listing.custodyRecordId,
          tenantId: listing.tenantId,
          ownerId: bid.buyerId,
          quantity: bidQuantity.toString(),
          purchasePrice: bid.amount,
          currency: listing.currency
        }
      });
    }
    
    // 2. Update buyer balance (decrease)
    await tx.userBalance.update({
      where: { userId: bid.buyerId },
      data: {
        balance: (parseFloat(buyerBalance.balance) - totalAmount).toString()
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
          balance: (parseFloat(sellerBalance.balance) + totalAmount).toString()
        }
      });
    } else {
      await tx.userBalance.create({
        data: {
          userId: sellerId,
          balance: totalAmount.toString(),
          currency: listing.currency
        }
      });
    }
    
    // 4. Update listing status
    const newQuantitySold = parseFloat(listing.quantitySold) + bidQuantity;
    const totalListed = parseFloat(listing.quantityListed);
    
    const updatedListing = await tx.listing.update({
      where: { id: listing.id },
      data: {
        quantitySold: newQuantitySold.toString(),
        status: newQuantitySold >= totalListed ? ListingStatus.SOLD : ListingStatus.ACTIVE,
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
    amount: totalAmount,
    quantity: bidQuantity
  });
  
  // Log audit event
  await auditService.logEvent('BID_ACCEPTED', {
    bidId,
    listingId: listing.id,
    assetId: listing.assetId,
    sellerId,
    buyerId: bid.buyerId,
    amount: totalAmount,
    quantity: bidQuantity
  }, {
    custodyRecordId: listing.custodyRecordId,
    actor: sellerId,
    ...context
  });
  
  await auditService.logEvent('OWNERSHIP_TRANSFERRED', {
    assetId: listing.assetId,
    fromUserId: sellerId,
    toUserId: bid.buyerId,
    amount: totalAmount,
    quantity: bidQuantity
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
