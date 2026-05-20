export interface FinOpsData {
    workload: string;
    namespace: string;
    oldLimit: string;
    newLimit: string;
    savingsPct: number;
    savingsAbs: number;
    consumptionPct: number;
    cpuResCluster: number;
    cpuNsCluster: number;
    memUseCluster: number;
    memUsePeak: number;
}
