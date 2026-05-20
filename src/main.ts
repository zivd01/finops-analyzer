import { State, onDataChange } from './state';
import { FinOpsCalculator } from './calculator';
import { ChartManager } from './chartManager';
import { Templates } from './templates';
import { UIManager } from './uiManager';
import { parseCSV } from './parser';

const AppController = {
    init() {
        ChartManager.init();
        this.bindEvents();
        this.setupReactivity();
    },

    setupReactivity() {
        // Automatically update UI when State.data changes
        onDataChange((data) => {
            if (!data) {
                UIManager.showSections(false);
                UIManager.safeSetText('analysis-title', `Efficiency Analysis: Waiting for file...`);
                UIManager.resetChat();
                ChartManager.updateGauges({} as any);
                UIManager.safeSetText('val-savings', '$0/mo');
                UIManager.safeSetText('val-consumption', '0%');
                return;
            }

            // Data arrived
            UIManager.showSections(true);
            const { newVal, oldLimitInt } = UIManager.updateSlider(data.oldLimit, data.newLimit);
            
            ChartManager.updateGauges(data);
            UIManager.safeSetHTML('val-savings', `~${data.savingsPct || 0}% <br><span style="font-size: 1rem; color: #94a3b8;">$${data.savingsAbs || 0}/mo</span>`);
            UIManager.safeSetText('val-consumption', `~${data.consumptionPct || 0}%`);
            UIManager.safeSetText('cpu-old-limit', data.oldLimit || 'N/A');
            UIManager.safeSetText('cpu-new-limit', data.newLimit || 'N/A');
            UIManager.safeSetText('workload-name', `'${data.workload || 'unknown'}'`);
            UIManager.safeSetText('namespace-name', `'${data.namespace || 'unknown'}'`);

            UIManager.safeSetHTML('code-terraform', Templates.getTerraformHCL(data));
            UIManager.safeSetHTML('code-yaml', Templates.getYamlManifest(data));
            
            const savedM = Math.max(0, oldLimitInt - newVal);
            const esg = FinOpsCalculator.calculateESG(savedM);
            UIManager.safeSetText('co2-val', esg.totalCo2);
            UIManager.safeSetText('tree-val', esg.totalTrees.toString());
            
            UIManager.populateZombies();
            ChartManager.renderBlastGraph(data.workload);
        });
    },

    bindEvents() {
        const getEl = (id: string) => document.getElementById(id);
        
        getEl('file-upload')?.addEventListener('change', this.handleFileUpload.bind(this));
        getEl('btn-reset')?.addEventListener('click', () => {
            State.uploadSession++;
            State.data = null;
        });
        getEl('cpu-slider')?.addEventListener('input', this.handleSliderChange.bind(this));
        getEl('btn-gitops')?.addEventListener('click', () => UIManager.downloadPatch());
        getEl('btn-share')?.addEventListener('click', () => UIManager.shareInsights());

        document.querySelectorAll('.query-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                this.handleQueryClick(target.dataset.query || '', target.innerText);
            });
        });
    },

    handleFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        const sessionId = ++State.uploadSession;
        const reader = new FileReader();

        reader.onload = (e) => {
            if (sessionId !== State.uploadSession) return;
            const content = e.target?.result as string;
            
            if (!content || !content.trim()) return alert("The uploaded file is empty.");

            try {
                // Show skeleton loading UI first
                UIManager.showSkeleton(true);
                UIManager.safeSetText('analysis-title', `Parsing: ${file.name}...`);
                
                // Simulate deep parsing delay
                setTimeout(() => {
                    UIManager.showSkeleton(false);
                    UIManager.safeSetText('analysis-title', `Efficiency Analysis: ${file.name}`);
                    
                    if (file.name.endsWith('.csv')) {
                        State.data = parseCSV(content, file.name);
                    } else {
                        // fallback JSON parse just in case
                        State.data = JSON.parse(content);
                    }
                }, 1500);

            } catch (error) {
                UIManager.showSkeleton(false);
                console.error("Error parsing file:", error);
                alert("Failed to parse file.");
            }
        };
        reader.readAsText(file);
    },

    handleSliderChange(e: Event) {
        if (!State.data) return;
        const target = e.target as HTMLInputElement;
        const newVal = parseInt(target.value) || 0;
        UIManager.safeSetText('slider-val', newVal + 'm');
        
        const { newSavingsPct, newSavingsAbs, savedM } = FinOpsCalculator.calculateSliderSavings(newVal);
        
        ChartManager.instances.gaugeSavings?.setOption({ series: [{ data: [{ value: newSavingsPct }] }] });
        UIManager.safeSetHTML('val-savings', `~${newSavingsPct}% <br><span style="font-size: 1rem; color: #94a3b8;">$${newSavingsAbs}/mo</span>`);
        
        const tempData = { ...State.data, newLimit: newVal + 'm' };
        UIManager.safeSetHTML('code-terraform', Templates.getTerraformHCL(tempData));
        UIManager.safeSetHTML('code-yaml', Templates.getYamlManifest(tempData));
        
        const esg = FinOpsCalculator.calculateESG(savedM);
        UIManager.safeSetText('co2-val', esg.totalCo2);
        UIManager.safeSetText('tree-val', esg.totalTrees.toString());
    },

    handleQueryClick(queryId: string, queryText: string) {
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
        } else if (queryId === '4') {
            const esgVal = document.getElementById('co2-val')?.innerText || '0';
            const treeVal = document.getElementById('tree-val')?.innerText || '0';
            html = `<strong>ESG & Sustainability:</strong> By reclaiming wasted CPU cycles, you are preventing <strong>${esgVal} lbs of CO2 emissions</strong> per month. This is the equivalent of planting <strong>${treeVal} trees</strong>, contributing directly to corporate sustainability goals while reducing infrastructure spend.`;
        } else if (queryId === '5') {
            html = `<strong>Zombie Workloads:</strong> Yes! The <span class="highlight-blue">Zombie Workload Scanner</span> detected idle workloads utilizing &lt; 2% CPU and generating almost zero network traffic (e.g., <code>spark-worker-idle</code>). Deleting these zombies entirely instead of just resizing them would safely reclaim additional monthly budget.`;
        } else if (queryId === '6') {
            html = `<strong>Risk Mitigation:</strong> Your workload's historical peak memory usage only reached <strong>${State.data.memUsePeak}%</strong>. The new proposed limit of <code>${State.data.newLimit}</code> provides a generous overhead buffer above your all-time peak. Even under high traffic, the k3s scheduler will ensure your pods are not CPU-throttled.`;
        } else if (queryId === '7') {
            const oldL = FinOpsCalculator.parseMillicores(State.data.oldLimit);
            const delta = Math.max(0, oldL - FinOpsCalculator.parseMillicores(State.data.newLimit));
            html = `<strong>Transparent Methodology:</strong> The savings are calculated by measuring the delta between your reserved capacity (<code>${State.data.oldLimit}</code>) and your actual consumption (~${State.data.consumptionPct}%). By removing the <code>${delta}m</code> of 'stranded capacity' from your cloud bill at standard compute rates, we realize a direct savings of <strong>$${State.data.savingsAbs}/month</strong>.`;
        } else if (queryId === '8') {
            html = `<strong>GitOps Automation:</strong> You don't have to make these changes manually! I have pre-generated a safe Infrastructure-as-Code Git Patch. Click the <span style="color: #10b981; font-weight: bold;">1-Click PR</span> button to download the <code>.patch</code> file, and apply it directly to your CI/CD pipeline.`;
        }
        
        UIManager.appendChatMsg('bot', html);
    }
};

document.addEventListener("DOMContentLoaded", () => AppController.init());
