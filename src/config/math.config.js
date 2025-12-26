import Decimal from 'decimal.js';

/**
 * Math Configuration for AssetLink Custody
 * Ensures precision for token quantities and pricing calculations
 */

// Configure Decimal.js for financial precision
Decimal.set({
    precision: 28,        // Maximum precision for calculations
    rounding: Decimal.ROUND_DOWN, // Always round down for safety
    toExpNeg: -7,         // Exponential notation threshold
    toExpPos: 21,
    minE: -9e15,
    maxE: 9e15
});

export const MathConfig = {
    // Token quantity precision (supports fractional ownership)
    TOKEN_DECIMALS: 18,

    // Price precision (USD cents)
    PRICE_DECIMALS: 2,

    // Fee calculation precision
    FEE_DECIMALS: 4,

    // Rounding mode
    ROUNDING_MODE: Decimal.ROUND_DOWN
};

/**
 * Safe decimal operations
 */
export class SafeMath {
    static fromString(value) {
        return new Decimal(value);
    }

    static add(a, b) {
        return new Decimal(a).plus(new Decimal(b)).toString();
    }

    static subtract(a, b) {
        return new Decimal(a).minus(new Decimal(b)).toString();
    }

    static multiply(a, b) {
        return new Decimal(a).times(new Decimal(b)).toString();
    }

    static divide(a, b) {
        if (new Decimal(b).isZero()) {
            throw new Error('Division by zero');
        }
        return new Decimal(a).dividedBy(new Decimal(b)).toString();
    }

    static isGreaterThan(a, b) {
        return new Decimal(a).greaterThan(new Decimal(b));
    }

    static isLessThan(a, b) {
        return new Decimal(a).lessThan(new Decimal(b));
    }

    static isEqual(a, b) {
        return new Decimal(a).equals(new Decimal(b));
    }

    static isZero(value) {
        return new Decimal(value).isZero();
    }

    static isNegative(value) {
        return new Decimal(value).isNegative();
    }

    static toFixed(value, decimals = MathConfig.TOKEN_DECIMALS) {
        return new Decimal(value).toFixed(decimals);
    }
}

export default MathConfig;
