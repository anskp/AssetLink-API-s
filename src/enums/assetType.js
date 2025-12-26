/**
 * Asset Type Enumeration
 * Supported asset types for custody
 */

export const AssetType = Object.freeze({
    WATCH: 'WATCH',
    JEWELRY: 'JEWELRY',
    ART: 'ART',
    COLLECTIBLE: 'COLLECTIBLE',
    REAL_ESTATE: 'REAL_ESTATE',
    VEHICLE: 'VEHICLE',
    PRECIOUS_METAL: 'PRECIOUS_METAL',
    WINE: 'WINE',
    OTHER: 'OTHER'
});

/**
 * Check if asset type is valid
 */
export const isValidAssetType = (type) => {
    return Object.values(AssetType).includes(type);
};

/**
 * Get all asset types
 */
export const getAllAssetTypes = () => {
    return Object.values(AssetType);
};

export default AssetType;
