/**
 * Marketplace Routes
 * API endpoints for marketplace listings and trading
 */

import express from 'express';
import * as marketplaceController from '../modules/marketplace/marketplace.controller.js';

const router = express.Router();

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
router.post('/listings', marketplaceController.createListing);

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
router.get('/listings', marketplaceController.listActiveListings);

/**
 * GET /v1/marketplace/listings/:listingId
 * Get listing details including asset metadata and bids
 */
router.get('/listings/:listingId', marketplaceController.getListingDetails);

/**
 * PUT /v1/marketplace/listings/:listingId/cancel
 * Cancel a listing
 * 
 * Body:
 * - userId: string (required if no auth context)
 */
router.put('/listings/:listingId/cancel', marketplaceController.cancelListing);

/**
 * POST /v1/marketplace/listings/:listingId/bids
 * Place a bid on a listing
 * 
 * Body:
 * - amount: string (required)
 * - buyerId: string (required if no auth context)
 */
router.post('/listings/:listingId/bids', marketplaceController.placeBid);

/**
 * GET /v1/marketplace/listings/:listingId/bids
 * Get all bids for a listing
 */
router.get('/listings/:listingId/bids', marketplaceController.getListingBids);

/**
 * POST /v1/marketplace/bids/:bidId/accept
 * Accept a bid (executes off-chain trade)
 * 
 * Body:
 * - sellerId: string (required if no auth context)
 */
router.post('/bids/:bidId/accept', marketplaceController.acceptBid);

/**
 * POST /v1/marketplace/bids/:bidId/reject
 * Reject a bid
 * 
 * Body:
 * - sellerId: string (required if no auth context)
 */
router.post('/bids/:bidId/reject', marketplaceController.rejectBid);

/**
 * GET /v1/marketplace/my-listings
 * Get listings created by the current end user
 */
router.get('/my-listings', marketplaceController.getMyListings);

/**
 * GET /v1/marketplace/my-portfolio
 * Get assets owned by the current end user
 */
router.get('/my-portfolio', marketplaceController.getMyPortfolio);

export default router;
