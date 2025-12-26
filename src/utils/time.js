/**
 * Time Utilities
 * Timestamp and time-related helper functions
 */

/**
 * Get current Unix timestamp in seconds
 */
export const getCurrentTimestamp = () => {
    return Math.floor(Date.now() / 1000);
};

/**
 * Get current ISO timestamp
 */
export const getCurrentISOTimestamp = () => {
    return new Date().toISOString();
};

/**
 * Check if timestamp is within acceptable window (for replay attack prevention)
 */
export const isTimestampValid = (timestamp, windowSeconds = 300) => {
    const now = getCurrentTimestamp();
    const diff = Math.abs(now - timestamp);
    return diff <= windowSeconds;
};

/**
 * Convert seconds to milliseconds
 */
export const secondsToMs = (seconds) => {
    return seconds * 1000;
};

/**
 * Convert milliseconds to seconds
 */
export const msToSeconds = (ms) => {
    return Math.floor(ms / 1000);
};

/**
 * Format duration in human-readable format
 */
export const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
};

export default {
    getCurrentTimestamp,
    getCurrentISOTimestamp,
    isTimestampValid,
    secondsToMs,
    msToSeconds,
    formatDuration
};
