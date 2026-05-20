import { describe, it, expect } from 'vitest';
import { FinOpsCalculator } from '../src/calculator';

describe('FinOpsCalculator', () => {
    describe('parseMillicores', () => {
        it('parses strings with "m" correctly', () => {
            expect(FinOpsCalculator.parseMillicores('4000m')).toBe(4000);
            expect(FinOpsCalculator.parseMillicores('100m')).toBe(100);
        });

        it('handles bare numbers and assumes cores if < 100', () => {
            expect(FinOpsCalculator.parseMillicores(4)).toBe(4000);
            expect(FinOpsCalculator.parseMillicores(0.5)).toBe(500);
            expect(FinOpsCalculator.parseMillicores(150)).toBe(150);
        });

        it('handles nulls and invalid strings', () => {
            expect(FinOpsCalculator.parseMillicores(null)).toBe(0);
            expect(FinOpsCalculator.parseMillicores('invalid')).toBe(0);
        });
    });

    describe('calculateESG', () => {
        it('calculates CO2 and trees based on reclaimed millicores', () => {
            const result = FinOpsCalculator.calculateESG(1000);
            expect(result.totalCo2).toBe('50.0');
            expect(result.totalTrees).toBe(1);
        });
    });
});
