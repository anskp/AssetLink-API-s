/**
 * Listing Status Enum
 * Represents marketplace listing states (off-chain)
 */

export const ListingStatus = Object.freeze({
    DRAFT: 'DRAFT',           // Created but not published
    ACTIVE: 'ACTIVE',         // Published and available for purchase
    SOLD: 'SOLD',             // Successfully sold
    CANCELLED: 'CANCELLED'    // Cancelled by seller
});

export const isValidListingStatus = (status) => {
    return Object.values(ListingStatus).includes(status);
};

export const canTransitionTo = (currentStatus, newStatus) => {
    const validTransitions = {
        [ListingStatus.DRAFT]: [ListingStatus.ACTIVE, ListingStatus.CANCELLED],
        [ListingStatus.ACTIVE]: [ListingStatus.SOLD, ListingStatus.CANCELLED],
        [ListingStatus.SOLD]: [],
        [ListingStatus.CANCELLED]: []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
};
