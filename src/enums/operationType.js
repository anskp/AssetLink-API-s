/**
 * Operation Type Enum
 * Defines the types of operations that require approval
 */

export const OperationType = Object.freeze({
    MINT: 'MINT',
    TRANSFER: 'TRANSFER',
    BURN: 'BURN',
    UPDATE_VAULT: 'UPDATE_VAULT',
    LINK_ASSET: 'LINK_ASSET'
});

export const isValidOperationType = (type) => {
    return Object.values(OperationType).includes(type);
};

export default OperationType;
