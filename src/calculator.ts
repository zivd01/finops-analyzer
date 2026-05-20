import { CONFIG } from './config';
import { State } from './state';

export const FinOpsCalculator = {
    /**
     * Parses a millicore string into a raw integer.
     * @param val - The value to parse (e.g. '4000m' or 4).
     * @returns The raw millicore integer.
     */
    parseMillicores(val: any): number {
        if (val == null) return 0;
        if (typeof val === 'number') return val < 100 ? val * 1000 : val; 
        const strVal = String(val).trim();
        if (strVal.endsWith('m')) {
            return parseInt(strVal.replace('m', ''), 10) || 0;
        }
        const parsed = parseFloat(strVal) || 0;
        return parsed < 100 ? parsed * 1000 : parsed;
    },

    /**
     * Calculates the savings ratios based on a new slider limit.
     * @param newVal - The newly proposed limit in millicores.
     */
    calculateSliderSavings(newVal: number) {
        if (!State.data) return { newSavingsPct: 0, newSavingsAbs: 0, savedM: 0 };
        const oldLimitInt = this.parseMillicores(State.data.oldLimit);
        const safeOldLimit = oldLimitInt > 0 ? oldLimitInt : 1; 
        
        const savedM = Math.max(0, oldLimitInt - newVal);
        const savingsRatio = savedM / safeOldLimit;
        
        const newSavingsPct = Math.max(0, Math.round(savingsRatio * 100) || 0);
        
        const baseSavings = State.data.savingsAbs || CONFIG.baseSavingsAbs;
        const currentNewLimitInt = this.parseMillicores(State.data.newLimit);
        const baseSavingsRatio = (oldLimitInt - currentNewLimitInt) / safeOldLimit || 1;
        
        const newSavingsAbs = Math.max(0, Math.round((savingsRatio / baseSavingsRatio) * baseSavings) || 0);

        return { newSavingsPct, newSavingsAbs, savedM };
    },

    /**
     * Calculates the environmental impact of the reclaimed millicores.
     * @param savedM - The millicores reclaimed.
     */
    calculateESG(savedM: number) {
        const totalCo2 = (savedM * CONFIG.esg.lbsCo2PerMillicore).toFixed(1);
        const totalTrees = Math.round(parseFloat(totalCo2) * CONFIG.esg.treesPerLbsCo2) || 0;
        return { totalCo2: isNaN(parseFloat(totalCo2)) ? "0.0" : totalCo2, totalTrees };
    }
};
