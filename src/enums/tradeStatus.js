/**
 * Trade Status Enum
 * Represents off-chain trade settlement states
 */

export const TradeStatus = Object.freeze({
    PENDING: 'PENDING',       // Trade initiated, awaiting settlement
    COMPLETED: 'COMPLETED',   // Successfully settled
    FAILED: 'FAILED',         // Settlement failed
    CANCELLED: 'CANCELLED'    // Cancelled before completion
});

export const isValidTradeStatus = (status) => {
    return Object.values(TradeStatus).includes(status);
};

export const canTransitionTo = (currentStatus, newStatus) => {
    const validTransitions = {
        [TradeStatus.PENDING]: [TradeStatus.COMPLETED, TradeStatus.FAILED, TradeStatus.CANCELLED],
        [TradeStatus.COMPLETED]: [],
        [TradeStatus.FAILED]: [],
        [TradeStatus.CANCELLED]: []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
};

export const isTerminalStatus = (status) => {
    return [
        TradeStatus.COMPLETED,
        TradeStatus.FAILED,
        TradeStatus.CANCELLED
    ].includes(status);
};
