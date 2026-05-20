import * as echarts from 'echarts';
import { CONFIG } from './config';
import { FinOpsData } from './types';

export const ChartManager = {
    instances: {} as Record<string, echarts.ECharts>,
    graphData: [] as any[],
    graphLinks: [] as any[],

    disposeOld() {
        Object.values(this.instances).forEach(chart => {
            if(chart && !chart.isDisposed()) {
                chart.dispose();
            }
        });
        this.instances = {};
    },

    init() {
        this.disposeOld();
        this.instances.gaugeSavings = echarts.init(document.getElementById('gauge-savings') as HTMLElement);
        this.instances.gaugeSavings.setOption(this.getLargeGaugeOpts([
            [0.3, CONFIG.colors.red], [0.7, CONFIG.colors.orange], [1, CONFIG.colors.green]
        ]));

        this.instances.gaugeConsumption = echarts.init(document.getElementById('gauge-consumption') as HTMLElement);
        this.instances.gaugeConsumption.setOption(this.getLargeGaugeOpts([
            [0.2, CONFIG.colors.bluePrimary], [0.8, CONFIG.colors.blueSecondary], [1, CONFIG.colors.red]
        ]));

        this.instances.gaugeCpuRes = this.createSmallGauge('gauge-cpu-res', CONFIG.colors.green);
        this.instances.gaugeCpuNs = this.createSmallGauge('gauge-cpu-ns', CONFIG.colors.green);
        this.instances.gaugeMemUse = this.createSmallGauge('gauge-mem-use', CONFIG.colors.bluePrimary);
        this.instances.gaugeMemPeak = this.createSmallGauge('gauge-mem-peak', CONFIG.colors.bluePrimary);

        this.instances.blastChart = echarts.init(document.getElementById('blast-graph') as HTMLElement);

        window.addEventListener('resize', () => {
            Object.values(this.instances).forEach(chart => {
                if(!chart.isDisposed()) chart.resize();
            });
        });
    },

    getLargeGaugeOpts(colorStops: any[]) {
        return {
            series: [{
                type: 'gauge', startAngle: 180, endAngle: 0, radius: '100%', center: ['50%', '70%'],
                pointer: { icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z', length: '60%', width: 8, offsetCenter: [0, '-10%'], itemStyle: { color: 'auto' } },
                axisLine: { lineStyle: { width: 20, color: colorStops } },
                axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, detail: { show: false },
                data: [{ value: 0 }]
            }]
        };
    },

    createSmallGauge(elementId: string, color: string) {
        const chart = echarts.init(document.getElementById(elementId) as HTMLElement);
        chart.setOption({
            series: [{
                type: 'gauge', startAngle: 210, endAngle: -30, radius: '100%', center: ['50%', '55%'],
                pointer: { length: '50%', width: 4 },
                axisLine: { lineStyle: { width: 10, color: [[1, color]] } },
                axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
                detail: { formatter: '{value}%', fontSize: 16, color: '#fff', offsetCenter: [0, '40%'] },
                data: [{ value: 0 }]
            }]
        });
        return chart;
    },

    updateGauges(data: FinOpsData) {
        const setVal = (chart: echarts.ECharts, val: number) => {
            if(chart && !chart.isDisposed()) {
                chart.setOption({ series: [{ data: [{ value: val || 0 }] }] });
            }
        };
        setVal(this.instances.gaugeSavings, data.savingsPct);
        setVal(this.instances.gaugeConsumption, data.consumptionPct);
        setVal(this.instances.gaugeCpuRes, data.cpuResCluster);
        setVal(this.instances.gaugeCpuNs, data.cpuNsCluster);
        setVal(this.instances.gaugeMemUse, data.memUseCluster);
        setVal(this.instances.gaugeMemPeak, data.memUsePeak);
    },

    renderBlastGraph(targetWl: string) {
        setTimeout(() => {
            if(!this.instances.blastChart.isDisposed()) this.instances.blastChart.resize();
        }, 50);

        const rootName = targetWl || 'target';
        this.graphData = [
            { id: 'root', name: rootName, itemStyle: { color: CONFIG.colors.green }, symbolSize: 30 },
            { id: 'db1', name: 'db-primary', itemStyle: { color: CONFIG.colors.bluePrimary }, symbolSize: 20 },
            { id: 'cache', name: 'cache-redis', itemStyle: { color: CONFIG.colors.bluePrimary }, symbolSize: 20 },
            { id: 'auth', name: 'auth-service', itemStyle: { color: CONFIG.colors.orange }, symbolSize: 20 }
        ];
        this.graphLinks = [
            { source: 'root', target: 'db1' },
            { source: 'root', target: 'cache' },
            { source: 'auth', target: 'root' }
        ];

        const option = {
            tooltip: { formatter: '{b} <br/><em>Click to drill down</em>' }, 
            animationDurationUpdate: 800, animationEasingUpdate: 'quinticInOut',
            series: [{
                type: 'graph', layout: 'force', 
                force: { repulsion: 300, edgeLength: 80, gravity: 0.1 }, 
                roam: true,
                label: { show: true, position: 'right', color: '#fff' },
                data: this.graphData,
                links: this.graphLinks
            }]
        };
        this.instances.blastChart.setOption(option);
        this.instances.blastChart.off('click');
        
        this.instances.blastChart.on('click', (params: any) => {
            if (params.dataType === 'node') {
                const clickedId = params.data.id;
                const numNew = Math.floor(Math.random() * 2) + 1;
                for(let i = 0; i < numNew; i++) {
                    const newId = Math.random().toString(36).substring(2, 6);
                    const isDb = Math.random() > 0.5;
                    this.graphData.push({
                        id: newId, 
                        name: (isDb ? 'db-shard-' : 'microsvc-') + newId, 
                        itemStyle: { color: CONFIG.colors.blueSecondary }, 
                        symbolSize: 15
                    });
                    if (Math.random() > 0.5) {
                        this.graphLinks.push({ source: clickedId, target: newId });
                    } else {
                        this.graphLinks.push({ source: newId, target: clickedId });
                    }
                }
                this.instances.blastChart.setOption({
                    series: [{ data: this.graphData, links: this.graphLinks }]
                });
            }
        });
    }
};
