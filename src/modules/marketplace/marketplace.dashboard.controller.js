/**
 * Marketplace Dashboard Controller
 * JWT-based endpoints for dashboard marketplace operations
 */

import * as listingService from './listing.service.js';
import * as tradeService from './trade.service.js';
import prisma from '../../config/db.js';
import { ApiError } from '../../errors/ApiError.js';
import logger from '../../utils/logger.js';

/**
 * POST /v1/marketplace/dashboard/listings
 * Create a new listing from dashboard
 */
export const createListingDashboard = async (req, res, next) => {
  try {
    const { assetId, price, currency, expiryDate, quantity } = req.body;
    
    // Get user info from JWT token
    const userId = req.user?.sub; // JWT token uses 'sub' for user ID
    const userEmail = req.user?.email;
    
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }
    
    logger.info('Creating listing from dashboard', {
      assetId,
      userId,
      price
    });
    
    // For dashboard, the platform owner is creating the listing
    // We'll use their user ID as both tenantId and sellerId
    const listing = await listingService.createListing(
      { assetId, price, currency, expiryDate, quantity },
      userId, // sellerId
      { ipAddress: req.ip, userAgent: req.get('user-agent'), userId, userEmail }
    );
    
    res.status(201).json({
      success: true,
      data: listing
    });
  } catch (error) {
    logger.error('Failed to create listing from dashboard', {
      error: error.message
    });
    next(error);
  }
};

/**
 * GET /v1/marketplace/dashboard/listings
 * List all active listings (platform owner view)
 */
export const listActiveListingsDashboard = async (req, res, next) => {
  try {
    const { assetType, priceMin, priceMax, blockchain, sortBy, sortOrder } = req.query;
    
    const userId = req.user?.sub; // JWT token uses 'sub' for user ID
    
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }
    
    logger.info('Listing active listings from dashboard', {
      userId,
      assetType,
      priceMin,
      priceMax
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
    logger.error('Failed to list listings from dashboard', {
      error: error.message
    });
    next(error);
  }
};

/**
 * GET /v1/marketplace/dashboard/my-listings
 * Get listings created by the current dashboard user
 */
export const getMyListingsDashboard = async (req, res, next) => {
  try {
    const userId = req.user?.sub; // JWT token uses 'sub' for user ID
    
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }
    
    logger.info('Getting my listings from dashboard', { userId });
    
    const listings = await prisma.listing.findMany({
      where: { 
        sellerId: userId
      },
      include: {
        bids: {
          where: {
            status: 'PENDING'
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Enrich with custody record data
    const enrichedListings = await Promise.all(
      listings.map(async (listing) => {
        const custodyRecord = await prisma.custodyRecord.findUnique({
          where: { id: listing.custodyRecordId },
          include: {
            assetMetadata: true
          }
        });
        
        return {
          ...listing,
          asset: custodyRecord
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: enrichedListings
    });
  } catch (error) {
    logger.error('Failed to get my listings from dashboard', {
      error: error.message
    });
    next(error);
  }
};

/**
 * GET /v1/marketplace/dashboard/portfolios
 * Get all portfolios (platform owner view - see all end users' holdings)
 */
export const getAllPortfoliosDashboard = async (req, res, next) => {
  try {
    const userId = req.user?.sub; // JWT token uses 'sub' for user ID
    
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }
    
    logger.info('Getting all portfolios from dashboard', { userId });
    
    // Get all ownerships (platform owner sees everything)
    const ownerships = await prisma.ownership.findMany({
      include: {
        custodyRecord: {
          include: {
            assetMetadata: true
          }
        }
      },
      orderBy: { acquiredAt: 'desc' }
    });
    
    res.status(200).json({
      success: true,
      data: ownerships
    });
  } catch (error) {
    logger.error('Failed to get all portfolios from dashboard', {
      error: error.message
    });
    next(error);
  }
};

/**
 * PUT /v1/marketplace/dashboard/listings/:listingId/cancel
 * Cancel a listing from dashboard
 */
export const cancelListingDashboard = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const userId = req.user?.sub; // JWT token uses 'sub' for user ID
    
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }
    
    logger.info('Cancelling listing from dashboard', { listingId, userId });
    
    const listing = await listingService.cancelListing(
      listingId,
      userId,
      { ipAddress: req.ip, userAgent: req.get('user-agent'), userId }
    );
    
    res.status(200).json({
      success: true,
      data: listing
    });
  } catch (error) {
    logger.error('Failed to cancel listing from dashboard', {
      listingId: req.params.listingId,
      error: error.message
    });
    next(error);
  }
};

/**
 * POST /v1/marketplace/dashboard/bids/:bidId/accept
 * Accept a bid from dashboard
 */
export const acceptBidDashboard = async (req, res, next) => {
  try {
    const { bidId } = req.params;
    const userId = req.user?.sub; // JWT token uses 'sub' for user ID
    
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }
    
    logger.info('Accepting bid from dashboard', { bidId, userId });
    
    const result = await tradeService.acceptBid(
      bidId,
      userId,
      { ipAddress: req.ip, userAgent: req.get('user-agent'), userId }
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to accept bid from dashboard', {
      bidId: req.params.bidId,
      error: error.message
    });
    next(error);
  }
};

/**
 * POST /v1/marketplace/dashboard/bids/:bidId/reject
 * Reject a bid from dashboard
 */
export const rejectBidDashboard = async (req, res, next) => {
  try {
    const { bidId } = req.params;
    const userId = req.user?.sub; // JWT token uses 'sub' for user ID
    
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }
    
    logger.info('Rejecting bid from dashboard', { bidId, userId });
    
    const bid = await tradeService.rejectBid(
      bidId,
      userId,
      { ipAddress: req.ip, userAgent: req.get('user-agent'), userId }
    );
    
    res.status(200).json({
      success: true,
      data: bid
    });
  } catch (error) {
    logger.error('Failed to reject bid from dashboard', {
      bidId: req.params.bidId,
      error: error.message
    });
    next(error);
  }
};

/**
 * GET /v1/marketplace/dashboard/minted-tokens
 * Get all minted tokens that can be listed
 */
export const getMintedTokensDashboard = async (req, res, next) => {
  try {
    const userId = req.user?.sub; // JWT token uses 'sub' for user ID
    
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }
    
    logger.info('Getting minted tokens from dashboard', { userId });
    
    // Get all custody records with MINTED status
    // For dashboard users, we get all MINTED tokens where:
    // - They created it (createdBy = userId)
    // - OR it belongs to their tenant (tenantId = userId, since platform owner's tenantId = userId)
    const mintedTokens = await prisma.custodyRecord.findMany({
      where: {
        status: 'MINTED',
        OR: [
          { createdBy: userId },
          { tenantId: userId }
        ]
      },
      include: {
        assetMetadata: true
      },
      orderBy: { mintedAt: 'desc' }
    });
    
    res.status(200).json({
      success: true,
      data: mintedTokens
    });
  } catch (error) {
    logger.error('Failed to get minted tokens from dashboard', {
      error: error.message
    });
    next(error);
  }
};

export default {
  createListingDashboard,
  listActiveListingsDashboard,
  getMyListingsDashboard,
  getAllPortfoliosDashboard,
  cancelListingDashboard,
  acceptBidDashboard,
  rejectBidDashboard,
  getMintedTokensDashboard
};
