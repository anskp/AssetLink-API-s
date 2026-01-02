/**
 * Marketplace Controller
 * Handles HTTP requests for marketplace operations with two-level isolation
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
    const { assetId, price, currency, expiryDate, quantity } = req.body;
    
    // Two-level isolation
    const tenantId = req.auth?.tenantId;
    const sellerId = req.auth?.endUserId; // End user from X-USER-ID header
    
    if (!tenantId) {
      throw new ApiError(401, 'Tenant ID not found in authentication context');
    }
    
    if (!sellerId) {
      throw new ApiError(401, 'X-USER-ID header is required to identify the seller');
    }
    
    logger.info('Creating listing', {
      assetId,
      tenantId,
      sellerId,
      price
    });
    
    const listing = await listingService.createListing(
      { assetId, price, currency, expiryDate, quantity },
      tenantId,
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
 * Platform owner sees all, end user sees all available listings
 */
export const listActiveListings = async (req, res, next) => {
  try {
    const { assetType, priceMin, priceMax, blockchain, sortBy, sortOrder } = req.query;
    
    const tenantId = req.auth?.tenantId;
    
    if (!tenantId) {
      throw new ApiError(401, 'Tenant ID not found in authentication context');
    }
    
    logger.info('Listing active listings', {
      tenantId,
      assetType,
      priceMin,
      priceMax,
      blockchain,
      sortBy
    });
    
    const listings = await listingService.listActiveListings({
      tenantId,
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
    
    const tenantId = req.auth?.tenantId;
    
    if (!tenantId) {
      throw new ApiError(401, 'Tenant ID not found in authentication context');
    }
    
    logger.info('Getting listing details', { listingId, tenantId });
    
    const listing = await listingService.getListingDetails(listingId, tenantId);
    
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
    
    const tenantId = req.auth?.tenantId;
    const sellerId = req.auth?.endUserId;
    
    if (!tenantId) {
      throw new ApiError(401, 'Tenant ID not found in authentication context');
    }
    
    if (!sellerId) {
      throw new ApiError(401, 'X-USER-ID header is required');
    }
    
    logger.info('Cancelling listing', { listingId, tenantId, sellerId });
    
    const listing = await listingService.cancelListing(
      listingId,
      tenantId,
      sellerId,
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
    const { amount, quantity } = req.body;
    
    const tenantId = req.auth?.tenantId;
    const buyerId = req.auth?.endUserId;
    
    if (!tenantId) {
      throw new ApiError(401, 'Tenant ID not found in authentication context');
    }
    
    if (!buyerId) {
      throw new ApiError(401, 'X-USER-ID header is required to identify the buyer');
    }
    
    logger.info('Placing bid', { listingId, tenantId, buyerId, amount, quantity });
    
    const bid = await tradeService.placeBid(
      listingId,
      { amount, quantity },
      tenantId,
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
 * Accept a bid (executes off-chain trade)
 */
export const acceptBid = async (req, res, next) => {
  try {
    const { bidId } = req.params;
    
    const tenantId = req.auth?.tenantId;
    const sellerId = req.auth?.endUserId;
    
    if (!tenantId) {
      throw new ApiError(401, 'Tenant ID not found in authentication context');
    }
    
    if (!sellerId) {
      throw new ApiError(401, 'X-USER-ID header is required to identify the seller');
    }
    
    logger.info('Accepting bid', { bidId, tenantId, sellerId });
    
    const result = await tradeService.acceptBid(
      bidId,
      tenantId,
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
    
    const tenantId = req.auth?.tenantId;
    const sellerId = req.auth?.endUserId;
    
    if (!tenantId) {
      throw new ApiError(401, 'Tenant ID not found in authentication context');
    }
    
    if (!sellerId) {
      throw new ApiError(401, 'X-USER-ID header is required');
    }
    
    logger.info('Rejecting bid', { bidId, tenantId, sellerId });
    
    const bid = await tradeService.rejectBid(
      bidId,
      tenantId,
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
    
    const tenantId = req.auth?.tenantId;
    
    if (!tenantId) {
      throw new ApiError(401, 'Tenant ID not found in authentication context');
    }
    
    logger.info('Getting listing bids', { listingId, tenantId });
    
    const bids = await tradeService.getListingBids(listingId, tenantId);
    
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
 * GET /v1/marketplace/my-listings
 * Get listings created by the current end user
 */
export const getMyListings = async (req, res, next) => {
  try {
    const tenantId = req.auth?.tenantId;
    const sellerId = req.auth?.endUserId;
    
    if (!tenantId) {
      throw new ApiError(401, 'Tenant ID not found in authentication context');
    }
    
    if (!sellerId) {
      throw new ApiError(401, 'X-USER-ID header is required');
    }
    
    logger.info('Getting my listings', { tenantId, sellerId });
    
    const listings = await prisma.listing.findMany({
      where: { 
        tenantId,
        sellerId 
      },
      include: {
        custodyRecord: true,
        bids: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.status(200).json({
      success: true,
      data: listings
    });
  } catch (error) {
    logger.error('Failed to get my listings', {
      error: error.message
    });
    next(error);
  }
};

/**
 * GET /v1/marketplace/my-portfolio
 * Get assets owned by the current end user
 */
export const getMyPortfolio = async (req, res, next) => {
  try {
    const tenantId = req.auth?.tenantId;
    const ownerId = req.auth?.endUserId;
    
    if (!tenantId) {
      throw new ApiError(401, 'Tenant ID not found in authentication context');
    }
    
    if (!ownerId) {
      throw new ApiError(401, 'X-USER-ID header is required');
    }
    
    logger.info('Getting my portfolio', { tenantId, ownerId });
    
    const ownerships = await prisma.ownership.findMany({
      where: { 
        tenantId,
        ownerId 
      },
      include: {
        custodyRecord: true
      },
      orderBy: { acquiredAt: 'desc' }
    });
    
    res.status(200).json({
      success: true,
      data: ownerships
    });
  } catch (error) {
    logger.error('Failed to get my portfolio', {
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
  getMyListings,
  getMyPortfolio
};
