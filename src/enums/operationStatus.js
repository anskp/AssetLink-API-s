/**
 * Operation Status Enum
 * Represents the maker-checker workflow states
 */

export const OperationStatus = Object.freeze({
    PENDING_MAKER: 'PENDING_MAKER',       // Initiated, awaiting maker submission
    PENDING_CHECKER: 'PENDING_CHECKER',   // Submitted by maker, awaiting checker approval
    APPROVED: 'APPROVED',                 // Approved by checker, ready for execution
    EXECUTED: 'EXECUTED',                 // Successfully executed on-chain
    REJECTED: 'REJECTED',                 // Rejected by checker
    FAILED: 'FAILED'                      // Execution failed
});

export const isValidOperationStatus = (status) => {
    return Object.values(OperationStatus).includes(status);
};

export const canTransitionTo = (currentStatus, newStatus) => {
    const validTransitions = {
        [OperationStatus.PENDING_MAKER]: [OperationStatus.PENDING_CHECKER],
        [OperationStatus.PENDING_CHECKER]: [OperationStatus.APPROVED, OperationStatus.REJECTED],
        [OperationStatus.APPROVED]: [OperationStatus.EXECUTED, OperationStatus.FAILED],
        [OperationStatus.EXECUTED]: [],
        [OperationStatus.REJECTED]: [],
        [OperationStatus.FAILED]: []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
};

export const isTerminalStatus = (status) => {
    return [
        OperationStatus.EXECUTED,
        OperationStatus.REJECTED,
        OperationStatus.FAILED
    ].includes(status);
};
