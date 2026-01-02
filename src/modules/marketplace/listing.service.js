/**
 * Listing Service
 * Manages marketplace listings for tokenized assets
 */

import prisma from '../../config/db.js';
import * as auditService from '../audit/audit.service.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../errors/ApiError.js';
import logger from '../../utils/logger.js';

/**
 * Listing Status Enum
 */
export const ListingStatus = {
  ACTIVE: 'ACTIVE',
  SOLD: 'SOLD',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

/**
 * Create a new listing
 */
export const createListing = async (data, sellerId, context = {}) => {
  const { assetId, price, currency, expiryDate, quantity } = data;
  
  // Validate required parameters
  const missingFields = [];
  if (!assetId) missingFields.push('assetId');
  if (!price) missingFields.push('price');
  if (!currency) missingFields.push('currency');
  if (!expiryDate) missingFields.push('expiryDate');
  
  if (missingFields.length > 0) {
    throw new BadRequestError(`Missing required parameters: ${missingFields.join(', ')}`);
  }
  
  // Find custody record
  const custodyRecord = await prisma.custodyRecord.findUnique({
    where: { assetId }
  });
  
  if (!custodyRecord) {
    throw new NotFoundError(`Asset ${assetId} not found`);
  }
  
  // Verify custody record is in MINTED status
  if (custodyRecord.status !== 'MINTED') {
    throw new BadRequestError(`Asset must be minted before listing. Current status: ${custodyRecord.status}`);
  }
  
  // For dashboard users, we need to create an ownership record if it doesn't exist
  // Check if ownership exists
  let ownership = await prisma.ownership.findUnique({
    where: {
      assetId_ownerId: {
        assetId,
        ownerId: sellerId
      }
    }
  });
  
  // If no ownership exists, create one (platform owner owns the minted token initially)
  if (!ownership) {
    ownership = await prisma.ownership.create({
      data: {
        assetId,
        custodyRecordId: custodyRecord.id,
        tenantId: custodyRecord.tenantId,
        ownerId: sellerId,
        quantity: quantity || '1',
        purchasePrice: '0', // Initial minting, no purchase price
        currency: currency || 'USD'
      }
    });
    
    logger.info('Created initial ownership record for listing', {
      assetId,
      ownerId: sellerId,
      quantity: quantity || '1'
    });
  }
  
  // Verify user has enough quantity to list
  const availableQuantity = parseFloat(ownership.quantity);
  const listingQuantity = parseFloat(quantity || '1');
  
  if (availableQuantity < listingQuantity) {
    throw new BadRequestError(`Insufficient quantity. Available: ${availableQuantity}, Requested: ${listingQuantity}`);
  }
  
  // Create listing
  const listing = await prisma.listing.create({
    data: {
      assetId,
      custodyRecordId: custodyRecord.id,
      tenantId: custodyRecord.tenantId,
      sellerId,
      price,
      currency,
      quantityListed: quantity || '1',
      quantitySold: '0',
      status: ListingStatus.ACTIVE,
      expiryDate: new Date(expiryDate)
    }
  });
  
  logger.info('Listing created', {
    listingId: listing.id,
    assetId,
    sellerId,
    price
  });
  
  // Log audit event
  await auditService.logEvent('LISTING_CREATED', {
    listingId: listing.id,
    assetId,
    price,
    currency,
    expiryDate
  }, {
    custodyRecordId: custodyRecord.id,
    actor: sellerId,
    ...context
  });
  
  return listing;
};

/**
 * Get listing details
 */
export const getListingDetails = async (listingId) => {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      bids: {
        orderBy: {
          amount: 'desc'
        }
      }
    }
  });
  
  if (!listing) {
    throw new NotFoundError(`Listing ${listingId} not found`);
  }
  
  // Get custody record and asset metadata
  const custodyRecord = await prisma.custodyRecord.findUnique({
    where: { id: listing.custodyRecordId },
    include: {
      assetMetadata: true
    }
  });
  
  // Calculate bid statistics
  const bidCount = listing.bids.length;
  const highestBid = listing.bids.length > 0 ? listing.bids[0].amount : null;
  
  return {
    ...listing,
    asset: custodyRecord,
    bidCount,
    highestBid
  };
};

/**
 * List active listings with filters and sorting
 */
export const listActiveListings = async (filters = {}) => {
  const { assetType, priceMin, priceMax, blockchain, sortBy, sortOrder } = filters;
  
  // Build where clause
  const where = {
    status: ListingStatus.ACTIVE
  };
  
  // Apply filters
  if (assetType || blockchain) {
    where.custodyRecordId = {
      in: await prisma.custodyRecord.findMany({
        where: {
          ...(blockchain && { blockchain }),
          ...(assetType && {
            assetMetadata: {
              assetType
            }
          })
        },
        select: { id: true }
      }).then(records => records.map(r => r.id))
    };
  }
  
  // Price range filter
  if (priceMin || priceMax) {
    where.price = {};
    if (priceMin) where.price.gte = priceMin;
    if (priceMax) where.price.lte = priceMax;
  }
  
  // Build orderBy clause
  let orderBy = {};
  if (sortBy === 'price') {
    orderBy.price = sortOrder || 'asc';
  } else if (sortBy === 'createdAt') {
    orderBy.createdAt = sortOrder || 'desc';
  } else if (sortBy === 'expiryDate') {
    orderBy.expiryDate = sortOrder || 'asc';
  } else {
    orderBy.createdAt = 'desc'; // Default sort
  }
  
  const listings = await prisma.listing.findMany({
    where,
    orderBy,
    include: {
      bids: {
        orderBy: {
          amount: 'desc'
        },
        take: 1
      }
    }
  });
  
  // Enrich with asset metadata and bid statistics
  const enrichedListings = await Promise.all(
    listings.map(async (listing) => {
      const custodyRecord = await prisma.custodyRecord.findUnique({
        where: { id: listing.custodyRecordId },
        include: {
          assetMetadata: true
        }
      });
      
      const bidCount = await prisma.bid.count({
        where: { listingId: listing.id }
      });
      
      const highestBid = listing.bids.length > 0 ? listing.bids[0].amount : null;
      
      return {
        ...listing,
        asset: custodyRecord,
        bidCount,
        highestBid
      };
    })
  );
  
  return enrichedListings;
};

/**
 * Cancel a listing
 */
export const cancelListing = async (listingId, userId, context = {}) => {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId }
  });
  
  if (!listing) {
    throw new NotFoundError(`Listing ${listingId} not found`);
  }
  
  // Verify requester is the original seller
  if (listing.sellerId !== userId) {
    throw new ForbiddenError('Only the seller can cancel this listing');
  }
  
  // Check if listing can be cancelled
  if (listing.status !== ListingStatus.ACTIVE) {
    throw new BadRequestError(`Cannot cancel listing with status ${listing.status}`);
  }
  
  // Update listing status
  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: ListingStatus.CANCELLED,
      updatedAt: new Date()
    }
  });
  
  logger.info('Listing cancelled', {
    listingId,
    assetId: listing.assetId,
    sellerId: userId
  });
  
  // Log audit event
  await auditService.logEvent('LISTING_CANCELLED', {
    listingId,
    assetId: listing.assetId
  }, {
    custodyRecordId: listing.custodyRecordId,
    actor: userId,
    ...context
  });
  
  return updated;
};

/**
 * Expire listings that have passed their expiry date
 * This should be called by a background job
 */
export const expireListings = async () => {
  const now = new Date();
  
  const expiredListings = await prisma.listing.updateMany({
    where: {
      status: ListingStatus.ACTIVE,
      expiryDate: {
        lt: now
      }
    },
    data: {
      status: ListingStatus.EXPIRED,
      updatedAt: now
    }
  });
  
  logger.info('Expired listings updated', {
    count: expiredListings.count
  });
  
  return expiredListings.count;
};

export default {
  createListing,
  getListingDetails,
  listActiveListings,
  cancelListing,
  expireListings,
  ListingStatus
};
