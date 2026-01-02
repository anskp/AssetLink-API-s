/**
 * Marketplace Routes
 * API endpoints for marketplace listings and trading
 */

import express from 'express';
import * as marketplaceController from '../modules/marketplace/marketplace.controller.js';
import * as dashboardController from '../modules/marketplace/marketplace.dashboard.controller.js';
import { authenticateJwt, authenticate } from '../modules/auth/auth.middleware.js';

const router = express.Router();

// ============================================
// DASHBOARD ENDPOINTS (JWT Authentication)
// ============================================

/**
 * POST /v1/marketplace/dashboard/listings
 * Create a new listing from dashboard
 */
router.post('/dashboard/listings', authenticateJwt, dashboardController.createListingDashboard);

/**
 * GET /v1/marketplace/dashboard/listings
 * List all active listings (platform owner view)
 */
router.get('/dashboard/listings', authenticateJwt, dashboardController.listActiveListingsDashboard);

/**
 * GET /v1/marketplace/dashboard/my-listings
 * Get listings created by the current dashboard user
 */
router.get('/dashboard/my-listings', authenticateJwt, dashboardController.getMyListingsDashboard);

/**
 * GET /v1/marketplace/dashboard/portfolios
 * Get all portfolios (platform owner view)
 */
router.get('/dashboard/portfolios', authenticateJwt, dashboardController.getAllPortfoliosDashboard);

/**
 * GET /v1/marketplace/dashboard/minted-tokens
 * Get all minted tokens that can be listed
 */
router.get('/dashboard/minted-tokens', authenticateJwt, dashboardController.getMintedTokensDashboard);

/**
 * PUT /v1/marketplace/dashboard/listings/:listingId/cancel
 * Cancel a listing from dashboard
 */
router.put('/dashboard/listings/:listingId/cancel', authenticateJwt, dashboardController.cancelListingDashboard);

/**
 * POST /v1/marketplace/dashboard/bids/:bidId/accept
 * Accept a bid from dashboard
 */
router.post('/dashboard/bids/:bidId/accept', authenticateJwt, dashboardController.acceptBidDashboard);

/**
 * POST /v1/marketplace/dashboard/bids/:bidId/reject
 * Reject a bid from dashboard
 */
router.post('/dashboard/bids/:bidId/reject', authenticateJwt, dashboardController.rejectBidDashboard);

// ============================================
// API ENDPOINTS (HMAC Authentication)
// ============================================

/**
 * POST /v1/marketplace/listings
 * Create a new listing
 * 
 * Body:
 * - assetId: string (required)
 * - price: string (required)
 * - currency: string (required)
 * - expiryDate: string (required, ISO 8601 format)
 * - sellerId: string (required if no auth context)
 */
router.post('/listings', authenticate, marketplaceController.createListing);

/**
 * GET /v1/marketplace/listings
 * List active listings with filters
 * 
 * Query params:
 * - assetType: string (optional)
 * - priceMin: string (optional)
 * - priceMax: string (optional)
 * - blockchain: string (optional)
 * - sortBy: string (optional: price, createdAt, expiryDate)
 * - sortOrder: string (optional: asc, desc)
 */
router.get('/listings', authenticate, marketplaceController.listActiveListings);

/**
 * GET /v1/marketplace/listings/:listingId
 * Get listing details including asset metadata and bids
 */
router.get('/listings/:listingId', authenticate, marketplaceController.getListingDetails);

/**
 * PUT /v1/marketplace/listings/:listingId/cancel
 * Cancel a listing
 * 
 * Body:
 * - userId: string (required if no auth context)
 */
router.put('/listings/:listingId/cancel', authenticate, marketplaceController.cancelListing);

/**
 * POST /v1/marketplace/listings/:listingId/bids
 * Place a bid on a listing
 * 
 * Body:
 * - amount: string (required)
 * - buyerId: string (required if no auth context)
 */
router.post('/listings/:listingId/bids', authenticate, marketplaceController.placeBid);

/**
 * GET /v1/marketplace/listings/:listingId/bids
 * Get all bids for a listing
 */
router.get('/listings/:listingId/bids', authenticate, marketplaceController.getListingBids);

/**
 * POST /v1/marketplace/bids/:bidId/accept
 * Accept a bid (executes off-chain trade)
 * 
 * Body:
 * - sellerId: string (required if no auth context)
 */
router.post('/bids/:bidId/accept', authenticate, marketplaceController.acceptBid);

/**
 * POST /v1/marketplace/bids/:bidId/reject
 * Reject a bid
 * 
 * Body:
 * - sellerId: string (required if no auth context)
 */
router.post('/bids/:bidId/reject', authenticate, marketplaceController.rejectBid);

/**
 * GET /v1/marketplace/my-listings
 * Get listings created by the current end user
 */
router.get('/my-listings', authenticate, marketplaceController.getMyListings);

/**
 * GET /v1/marketplace/my-portfolio
 * Get assets owned by the current end user
 */
router.get('/my-portfolio', authenticate, marketplaceController.getMyPortfolio);

export default router;
