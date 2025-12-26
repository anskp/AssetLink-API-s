/**
 * Marketplace Controller
 * Handles HTTP requests for marketplace operations
 */

import * as listingService from './listing.service.js';
import * as tradeService from './trade.service.js';
import prisma from '../../config/db.js';
import { ApiError } from '../../errors/ApiError.js';
import logger from '../../utils/logger.js';

/**
 * POST /v1/marketplace/listings
 * Create a new listing
 */
export const createListing = async (req, res, next) => {
  try {
    const { assetId, price, currency, expiryDate } = req.body;
    const sellerId = req.user?.id || req.body.sellerId; // Get from auth context or body
    
    if (!sellerId) {
      throw new ApiError(401, 'User authentication required');
    }
    
    logger.info('Creating listing', {
      assetId,
      sellerId,
      price
    });
    
    const listing = await listingService.createListing(
      { assetId, price, currency, expiryDate },
      sellerId,
      { ipAddress: req.ip, userAgent: req.get('user-agent') }
    );
    
    res.status(201).json({
      success: true,
      data: listing
    });
  } catch (error) {
    logger.error('Failed to create listing', {
      error: error.message
    });
    next(error);
  }
};

/**
 * GET /v1/marketplace/listings
 * List active listings with filters
 */
export const listActiveListings = async (req, res, next) => {
  try {
    const { assetType, priceMin, priceMax, blockchain, sortBy, sortOrder } = req.query;
    
    logger.info('Listing active listings', {
      assetType,
      priceMin,
      priceMax,
      blockchain,
      sortBy
    });
    
    const listings = await listingService.listActiveListings({
      assetType,
      priceMin,
      priceMax,
      blockchain,
      sortBy,
      sortOrder
    });
    
    res.status(200).json({
      success: true,
      data: listings
    });
  } catch (error) {
    logger.error('Failed to list listings', {
      error: error.message
    });
    next(error);
  }
};

/**
 * GET /v1/marketplace/listings/:listingId
 * Get listing details
 */
export const getListingDetails = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    
    logger.info('Getting listing details', { listingId });
    
    const listing = await listingService.getListingDetails(listingId);
    
    res.status(200).json({
      success: true,
      data: listing
    });
  } catch (error) {
    logger.error('Failed to get listing details', {
      listingId: req.params.listingId,
      error: error.message
    });
    next(error);
  }
};

/**
 * PUT /v1/marketplace/listings/:listingId/cancel
 * Cancel a listing
 */
export const cancelListing = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const userId = req.user?.id || req.body.userId;
    
    if (!userId) {
      throw new ApiError(401, 'User authentication required');
    }
    
    logger.info('Cancelling listing', { listingId, userId });
    
    const listing = await listingService.cancelListing(
      listingId,
      userId,
      { ipAddress: req.ip, userAgent: req.get('user-agent') }
    );
    
    res.status(200).json({
      success: true,
      data: listing
    });
  } catch (error) {
    logger.error('Failed to cancel listing', {
      listingId: req.params.listingId,
      error: error.message
    });
    next(error);
  }
};

/**
 * POST /v1/marketplace/listings/:listingId/bids
 * Place a bid on a listing
 */
export const placeBid = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const { amount } = req.body;
    const buyerId = req.user?.id || req.body.buyerId;
    
    if (!buyerId) {
      throw new ApiError(401, 'User authentication required');
    }
    
    logger.info('Placing bid', { listingId, buyerId, amount });
    
    const bid = await tradeService.placeBid(
      listingId,
      { amount },
      buyerId,
      { ipAddress: req.ip, userAgent: req.get('user-agent') }
    );
    
    res.status(201).json({
      success: true,
      data: bid
    });
  } catch (error) {
    logger.error('Failed to place bid', {
      listingId: req.params.listingId,
      error: error.message
    });
    next(error);
  }
};

/**
 * POST /v1/marketplace/bids/:bidId/accept
 * Accept a bid
 */
export const acceptBid = async (req, res, next) => {
  try {
    const { bidId } = req.params;
    const sellerId = req.user?.id || req.body.sellerId;
    
    if (!sellerId) {
      throw new ApiError(401, 'User authentication required');
    }
    
    logger.info('Accepting bid', { bidId, sellerId });
    
    const result = await tradeService.acceptBid(
      bidId,
      sellerId,
      { ipAddress: req.ip, userAgent: req.get('user-agent') }
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to accept bid', {
      bidId: req.params.bidId,
      error: error.message
    });
    next(error);
  }
};

/**
 * POST /v1/marketplace/bids/:bidId/reject
 * Reject a bid
 */
export const rejectBid = async (req, res, next) => {
  try {
    const { bidId } = req.params;
    const sellerId = req.user?.id || req.body.sellerId;
    
    if (!sellerId) {
      throw new ApiError(401, 'User authentication required');
    }
    
    logger.info('Rejecting bid', { bidId, sellerId });
    
    const bid = await tradeService.rejectBid(
      bidId,
      sellerId,
      { ipAddress: req.ip, userAgent: req.get('user-agent') }
    );
    
    res.status(200).json({
      success: true,
      data: bid
    });
  } catch (error) {
    logger.error('Failed to reject bid', {
      bidId: req.params.bidId,
      error: error.message
    });
    next(error);
  }
};

/**
 * GET /v1/marketplace/listings/:listingId/bids
 * Get bids for a listing
 */
export const getListingBids = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    
    logger.info('Getting listing bids', { listingId });
    
    const bids = await tradeService.getListingBids(listingId);
    
    res.status(200).json({
      success: true,
      data: bids
    });
  } catch (error) {
    logger.error('Failed to get listing bids', {
      listingId: req.params.listingId,
      error: error.message
    });
    next(error);
  }
};

/**
 * GET /v1/marketplace/portfolio/:userId
 * Get user's owned assets
 */
export const getUserPortfolio = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    logger.info('Getting user portfolio', { userId });
    
    // Get ownership records for user
    const ownerships = await prisma.ownership.findMany({
      where: { ownerId: userId },
      include: {
        custodyRecord: {
          include: {
            assetMetadata: true
          }
        }
      }
    });
    
    const portfolio = ownerships.map(ownership => ({
      assetId: ownership.assetId,
      custodyRecordId: ownership.custodyRecordId,
      quantity: ownership.quantity,
      acquiredAt: ownership.acquiredAt,
      asset: {
        ...ownership.custodyRecord,
        assetMetadata: ownership.custodyRecord?.assetMetadata
      }
    }));
    
    res.status(200).json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    logger.error('Failed to get user portfolio', {
      userId: req.params.userId,
      error: error.message
    });
    next(error);
  }
};

export default {
  createListing,
  listActiveListings,
  getListingDetails,
  cancelListing,
  placeBid,
  acceptBid,
  rejectBid,
  getListingBids,
  getUserPortfolio
};
