/**
 * Custody Record Status Enum
 * Represents the lifecycle state of an asset in custody
 */

export const CustodyStatus = Object.freeze({
    UNLINKED: 'UNLINKED',     // Asset not yet registered
    PENDING: 'PENDING',       // Awaiting checker approval for linking
    LINKED: 'LINKED',         // Asset registered, awaiting mint
    MINTED: 'MINTED',         // Token minted and in custody vault
    WITHDRAWN: 'WITHDRAWN',   // Token transferred to external wallet
    BURNED: 'BURNED'          // Token burned (physical redemption)
});

export const isValidCustodyStatus = (status) => {
    return Object.values(CustodyStatus).includes(status);
};

export const canTransitionTo = (currentStatus, newStatus) => {
    const validTransitions = {
        [CustodyStatus.UNLINKED]: [CustodyStatus.PENDING],
        [CustodyStatus.PENDING]: [CustodyStatus.LINKED],
        [CustodyStatus.LINKED]: [CustodyStatus.MINTED],
        [CustodyStatus.MINTED]: [CustodyStatus.WITHDRAWN, CustodyStatus.BURNED],
        [CustodyStatus.WITHDRAWN]: [],
        [CustodyStatus.BURNED]: []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
};
