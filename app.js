// --- CONFIGURATION & CONSTANTS ---
const CONFIG = {
    theme: 'dark',
    fallbackMaxCpu: 4000,
    baseSavingsAbs: 450,
    esg: {
        lbsCo2PerMillicore: 0.05,
        treesPerLbsCo2: 0.02
    },
    colors: {
        red: '#ef4444',
        orange: '#f59e0b',
        green: '#10b981',
        bluePrimary: '#3b82f6',
        blueSecondary: '#60a5fa'
    }
};

// --- GLOBAL STATE ---
const State = {
    data: null,
    uploadSession: 0
};

// --- DATA PARSERS & CALCULATORS ---
const FinOpsCalculator = {
    parseMillicores(val) {
        if (val == null) return 0;
        if (typeof val === 'number') return val < 100 ? val * 1000 : val; 
        const strVal = String(val).trim();
        if (strVal.endsWith('m')) {
            return parseInt(strVal.replace('m', ''), 10) || 0;
        }
        const parsed = parseFloat(strVal) || 0;
        return parsed < 100 ? parsed * 1000 : parsed;
    },

    calculateSliderSavings(newVal) {
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

    calculateESG(savedM) {
        const totalCo2 = (savedM * CONFIG.esg.lbsCo2PerMillicore).toFixed(1);
        const totalTrees = Math.round(totalCo2 * CONFIG.esg.treesPerLbsCo2) || 0;
        return { totalCo2: isNaN(totalCo2) ? "0.0" : totalCo2, totalTrees };
    }
};

// --- CHART MANAGER ---
const ChartManager = {
    instances: {},

    init() {
        this.instances.gaugeSavings = echarts.init(document.getElementById('gauge-savings'));
        this.instances.gaugeSavings.setOption(this.getLargeGaugeOpts([
            [0.3, CONFIG.colors.red], [0.7, CONFIG.colors.orange], [1, CONFIG.colors.green]
        ]));

        this.instances.gaugeConsumption = echarts.init(document.getElementById('gauge-consumption'));
        this.instances.gaugeConsumption.setOption(this.getLargeGaugeOpts([
            [0.2, CONFIG.colors.bluePrimary], [0.8, CONFIG.colors.blueSecondary], [1, CONFIG.colors.red]
        ]));

        this.instances.gaugeCpuRes = this.createSmallGauge('gauge-cpu-res', CONFIG.colors.green);
        this.instances.gaugeCpuNs = this.createSmallGauge('gauge-cpu-ns', CONFIG.colors.green);
        this.instances.gaugeMemUse = this.createSmallGauge('gauge-mem-use', CONFIG.colors.bluePrimary);
        this.instances.gaugeMemPeak = this.createSmallGauge('gauge-mem-peak', CONFIG.colors.bluePrimary);

        this.instances.blastChart = echarts.init(document.getElementById('blast-graph'));

        window.addEventListener('resize', () => {
            Object.values(this.instances).forEach(chart => chart.resize());
        });
    },

    getLargeGaugeOpts(colorStops) {
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

    createSmallGauge(elementId, color) {
        const chart = echarts.init(document.getElementById(elementId));
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

    updateGauges(data) {
        const setVal = (chart, val) => chart && chart.setOption({ series: [{ data: [{ value: val || 0 }] }] });
        setVal(this.instances.gaugeSavings, data.savingsPct);
        setVal(this.instances.gaugeConsumption, data.consumptionPct);
        setVal(this.instances.gaugeCpuRes, data.cpuResCluster);
        setVal(this.instances.gaugeCpuNs, data.cpuNsCluster);
        setVal(this.instances.gaugeMemUse, data.memUseCluster);
        setVal(this.instances.gaugeMemPeak, data.memUsePeak);
    },

    renderBlastGraph(targetWl) {
        // Force resize to fix off-center rendering when container goes from display:none to block
        setTimeout(() => this.instances.blastChart.resize(), 50);

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

        // Remove old listeners to prevent duplicate triggers
        this.instances.blastChart.off('click');
        
        // Drill-down interactivity
        this.instances.blastChart.on('click', (params) => {
            if (params.dataType === 'node') {
                const clickedId = params.data.id;
                
                // Add 1-2 random dependent nodes to simulate drill-down inspection
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
                    
                    // Randomize direction of dependency
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

// --- HTML TEMPLATES ---
const Templates = {
    getTerraformHCL(data) {
        return `resource "kubernetes_deployment" "k3s_optimized_workload" {
  metadata {
    name      = "${data.workload}"
    namespace = "${data.namespace}"
  }

  spec {
    template {
      spec {
        container {
          name = "${data.workload}-container"
          resources {
<span class="diff-del">-           limits   = { cpu = "${data.oldLimit}" }</span>
<span class="diff-add">+           limits   = { cpu = "${data.newLimit}" }</span>
          }
        }
      }
    }
  }
}`;
    },

    getYamlManifest(data) {
        return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${data.workload}
  namespace: ${data.namespace}
spec:
  template:
    spec:
      containers:
      - name: ${data.workload}-container
        resources:
          limits:
<span class="diff-del">-           cpu: "${data.oldLimit}"</span>
<span class="diff-add">+           cpu: "${data.newLimit}"</span>`;
    },

    getZombieTableRows(zombies) {
        return zombies.map(z => 
            `<tr>
                <td><code>${z.ns}</code></td>
                <td><code>${z.wl}</code></td>
                <td style="color: ${CONFIG.colors.red};">${z.cpu}</td>
                <td>${z.net}</td>
                <td>${z.waste}</td>
            </tr>`
        ).join('');
    },

    getGitPatch(yamlContent, data) {
        return `From: FinOps AI Assistant
Date: ${new Date().toUTCString()}
Subject: [FinOps] Optimize k3s limits for ${data.workload}

This patch safely reduces CPU limits to eliminate waste based on telemetry data.
Application runtime remains 100% stable.

--- a/manifests/${data.namespace}/${data.workload}.yaml
+++ b/manifests/${data.namespace}/${data.workload}.yaml

${yamlContent}`;
    }
};

// --- UI MANAGER ---
const UIManager = {
    safeSetText(id, text) {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    },

    safeSetHTML(id, html) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    },

    showSections(show) {
        const display = show ? 'block' : 'none';
        const emptyDisplay = show ? 'none' : 'flex';
        
        document.getElementById('empty-state').style.display = emptyDisplay;
        document.getElementById('insight-section').style.display = display;
        document.getElementById('qa-section').style.display = display;
        document.getElementById('wow-features').style.display = display;
    },

    updateSlider(oldLimitStr, newLimitStr) {
        const cpuSlider = document.getElementById('cpu-slider');
        const oldLimitInt = FinOpsCalculator.parseMillicores(oldLimitStr);
        const newLimitInt = FinOpsCalculator.parseMillicores(newLimitStr);
        
        if (cpuSlider) {
            cpuSlider.max = oldLimitInt > 0 ? oldLimitInt : CONFIG.fallbackMaxCpu;
            cpuSlider.value = Math.min(newLimitInt, cpuSlider.max);
            this.safeSetText('slider-val', cpuSlider.value + 'm');
        }
        return { newVal: cpuSlider ? cpuSlider.value : newLimitInt, oldLimitInt };
    },

    populateZombies() {
        const zombies = [
            { ns: 'data-eng', wl: 'spark-worker-idle', cpu: '0.1%', net: '0b / 0b', waste: '$120/mo' },
            { ns: 'marketing', wl: 'campaign-cache-old', cpu: '0.0%', net: '12b / 0b', waste: '$85/mo' },
            { ns: 'finance-ops', wl: 'legacy-report-gen', cpu: '1.2%', net: '1kb / 2kb', waste: '$210/mo' }
        ];
        const tbody = document.querySelector('#zombie-table tbody');
        if(tbody) tbody.innerHTML = Templates.getZombieTableRows(zombies);
    },

    resetChat() {
        this.safeSetHTML('chat-window', '<div class="chat-message system">Select a query above to interact with the data-driven FinOps Assistant.</div>');
    },

    appendChatMsg(type, html) {
        const chatWindow = document.getElementById('chat-window');
        if (!chatWindow) return;
        
        const systemMsg = chatWindow.querySelector('.system');
        if (systemMsg) systemMsg.remove();

        const msg = document.createElement('div');
        msg.className = `chat-message ${type}`;
        msg.innerHTML = html;
        chatWindow.appendChild(msg);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    },

    downloadPatch() {
        if (!State.data) return;
        const yamlContent = document.getElementById('code-yaml').innerText;
        const patchContent = Templates.getGitPatch(yamlContent, State.data);

        const blob = new Blob([patchContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `optimize-${State.data.workload}.patch`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
};

// --- APP CONTROLLER ---
const AppController = {
    init() {
        ChartManager.init();
        this.bindEvents();
    },

    bindEvents() {
        const getEl = id => document.getElementById(id);
        
        getEl('file-upload')?.addEventListener('change', this.handleFileUpload.bind(this));
        getEl('btn-reset')?.addEventListener('click', this.resetUI.bind(this));
        getEl('cpu-slider')?.addEventListener('input', this.handleSliderChange.bind(this));
        getEl('btn-gitops')?.addEventListener('click', () => UIManager.downloadPatch());

        document.querySelectorAll('.query-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleQueryClick(e.target.dataset.query, e.target.innerText));
        });
    },

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const sessionId = ++State.uploadSession;
        const reader = new FileReader();

        reader.onload = (e) => {
            if (sessionId !== State.uploadSession) return;
            const content = e.target.result;
            
            if (!content || !content.trim()) return alert("The uploaded file is empty.");

            try {
                if (file.name.endsWith('.json') || content.trim().startsWith('{') || content.trim().startsWith('[')) {
                    this.processFinOpsData(JSON.parse(content), file.name);
                } else if (file.name.endsWith('.csv')) {
                    this.processFinOpsData({ _type: 'csv', raw: content }, file.name);
                } else {
                    alert("Unsupported file format. Please upload JSON or CSV.");
                }
            } catch (error) {
                console.error("Error parsing file:", error);
                alert("Failed to parse file. Ensuring it's valid JSON or CSV.");
            }
        };
        reader.readAsText(file);
    },

    processFinOpsData(data, filename) {
        let simulatedData = {
            savingsPct: 35, savingsAbs: 450, consumptionPct: 12,
            cpuResCluster: 10, cpuNsCluster: 0, memUseCluster: 0, memUsePeak: 28,
            workload: 'payment-gateway-prod', namespace: 'finance-ops',
            oldLimit: '4000m', newLimit: '1000m'
        };

        if (!filename.includes('turbonomic') && !filename.includes('test_alert')) {
            simulatedData.savingsPct = Math.floor(Math.random() * 80) + 10;
            simulatedData.savingsAbs = Math.floor(Math.random() * 2000) + 100;
            simulatedData.consumptionPct = Math.floor(Math.random() * 60) + 5;
            simulatedData.cpuResCluster = Math.floor(Math.random() * 40);
            simulatedData.memUsePeak = Math.floor(Math.random() * 50) + 10;
        }

        this.updateUI(simulatedData, filename);
    },

    updateUI(data, filename) {
        State.data = data;
        UIManager.showSections(true);
        UIManager.safeSetText('analysis-title', `Efficiency Analysis: ${filename}`);

        const { newVal, oldLimitInt } = UIManager.updateSlider(data.oldLimit, data.newLimit);

        ChartManager.updateGauges(data);

        UIManager.safeSetHTML('val-savings', `~${data.savingsPct || 0}% <br><span style="font-size: 1rem; color: #94a3b8;">$${data.savingsAbs || 0}/mo</span>`);
        UIManager.safeSetText('val-consumption', `~${data.consumptionPct || 0}%`);
        UIManager.safeSetText('cpu-old-limit', data.oldLimit || 'N/A');
        UIManager.safeSetText('cpu-new-limit', data.newLimit || 'N/A');
        UIManager.safeSetText('workload-name', `'${data.workload || 'unknown'}'`);
        UIManager.safeSetText('namespace-name', `'${data.namespace || 'unknown'}'`);

        this.generateCodeSnippets(data);
        this.generateESGMetrics(newVal, oldLimitInt);
        
        UIManager.populateZombies();
        ChartManager.renderBlastGraph(data.workload);
    },

    handleSliderChange(e) {
        if (!State.data) return;
        const newVal = parseInt(e.target.value) || 0;
        UIManager.safeSetText('slider-val', newVal + 'm');
        
        const { newSavingsPct, newSavingsAbs, savedM } = FinOpsCalculator.calculateSliderSavings(newVal);
        
        ChartManager.instances.gaugeSavings?.setOption({ series: [{ data: [{ value: newSavingsPct }] }] });
        UIManager.safeSetHTML('val-savings', `~${newSavingsPct}% <br><span style="font-size: 1rem; color: #94a3b8;">$${newSavingsAbs}/mo</span>`);
        
        const tempData = { ...State.data, newLimit: newVal + 'm' };
        this.generateCodeSnippets(tempData);
        
        const esg = FinOpsCalculator.calculateESG(savedM);
        UIManager.safeSetText('co2-val', esg.totalCo2);
        UIManager.safeSetText('tree-val', esg.totalTrees);
    },

    generateCodeSnippets(data) {
        UIManager.safeSetHTML('code-terraform', Templates.getTerraformHCL(data));
        UIManager.safeSetHTML('code-yaml', Templates.getYamlManifest(data));
    },

    generateESGMetrics(newVal, oldLimitInt) {
        const savedM = Math.max(0, oldLimitInt - newVal);
        const esg = FinOpsCalculator.calculateESG(savedM);
        UIManager.safeSetText('co2-val', esg.totalCo2);
        UIManager.safeSetText('tree-val', esg.totalTrees);
    },

    handleQueryClick(queryId, queryText) {
        if (!State.data) return;
        
        UIManager.appendChatMsg('user', queryText);
        
        let html = '';
        if (queryId === '1') {
            html = `<strong>Data-Driven Analysis:</strong> The telemetry indicates an "Efficiency" opportunity for the <code>${State.data.workload}</code> workload in the <code>${State.data.namespace}</code> domain. The container has been allocated a high CPU limit (${State.data.oldLimit}) but consistently utilizes only a small fraction (~${State.data.consumptionPct}%). This underutilized resource reservation causes congestion on highly constrained k3s nodes without delivering business value.`;
        } else if (queryId === '2') {
            html = `<strong>Cost Impact:</strong> By implementing this optimization, you will achieve an exact cost reduction of <strong>$${State.data.savingsAbs}/month</strong>. Your overall efficiency will increase by ~${State.data.savingsPct}%. Since this action is an efficiency scale-down of wasted resources, it directly reduces your target optimized spend without risking application downtime.`;
        } else if (queryId === '3') {
            html = `<strong>Solution & Runtime Impact:</strong> You should scale down the CPU limit from ${State.data.oldLimit} to ${State.data.newLimit}.<br><br>
            <strong class="highlight-red">CRITICAL CONTAINER ISOLATION BOUNDARY:</strong> This optimization ONLY modifies the infrastructure manifest layer (requests and limits). It <strong>NEVER touches or alters a single line of application source code inside the container.</strong> Because a safe overhead buffer is left (peak usage is only ${State.data.memUsePeak}%), application execution will remain 100% stable.<br><br>
            <strong>Terraform Snippet:</strong>
            <pre><code class="language-hcl">${document.getElementById('code-terraform')?.innerText || ''}</code></pre>`;
        }
        
        UIManager.appendChatMsg('bot', html);
    },

    resetUI() {
        State.uploadSession++; 
        State.data = null;
        
        const fileInput = document.getElementById('file-upload');
        if(fileInput) fileInput.value = '';
        
        UIManager.showSections(false);
        UIManager.safeSetText('analysis-title', `Efficiency Analysis: Waiting for file...`);
        UIManager.resetChat();

        ChartManager.updateGauges({}); // Pass empty data for zeros
        UIManager.safeSetText('val-savings', '$0/mo');
        UIManager.safeSetText('val-consumption', '0%');
    }
};

// --- BOOTSTRAP ---
document.addEventListener("DOMContentLoaded", () => AppController.init());
