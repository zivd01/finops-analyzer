import { State } from './state';
import { CONFIG } from './config';
import { Templates } from './templates';
import { FinOpsCalculator } from './calculator';

export const UIManager = {
    safeSetText(id: string, text: string) {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    },

    safeSetHTML(id: string, html: string) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    },

    showSkeleton(show: boolean) {
        const dashboard = document.getElementById('dashboard');
        if (!dashboard) return;
        if (show) {
            dashboard.classList.add('loading-skeleton');
            this.showSections(true); 
        } else {
            dashboard.classList.remove('loading-skeleton');
        }
    },

    showSections(show: boolean) {
        const display = show ? 'block' : 'none';
        const emptyDisplay = show ? 'none' : 'flex';
        
        const emptyEl = document.getElementById('empty-state');
        if (emptyEl) emptyEl.style.display = emptyDisplay;
        
        ['insight-section', 'qa-section', 'wow-features'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = display;
        });
    },

    updateSlider(oldLimitStr: string, newLimitStr: string) {
        const cpuSlider = document.getElementById('cpu-slider') as HTMLInputElement;
        const oldLimitInt = FinOpsCalculator.parseMillicores(oldLimitStr);
        const newLimitInt = FinOpsCalculator.parseMillicores(newLimitStr);
        
        if (cpuSlider) {
            cpuSlider.max = (oldLimitInt > 0 ? oldLimitInt : CONFIG.fallbackMaxCpu).toString();
            cpuSlider.value = Math.min(newLimitInt, parseInt(cpuSlider.max)).toString();
            this.safeSetText('slider-val', cpuSlider.value + 'm');
        }
        return { newVal: cpuSlider ? parseInt(cpuSlider.value) : newLimitInt, oldLimitInt };
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

    appendChatMsg(type: 'user' | 'bot' | 'system', html: string) {
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
        const yamlContent = document.getElementById('code-yaml')?.innerText || '';
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
    },

    async shareInsights() {
        if (!State.data) return;
        
        const subject = `FinOps Alert: Optimization for ${State.data.workload}`;
        const esgVal = document.getElementById('co2-val')?.innerText || '0';
        const body = `FinOps Optimization Opportunity
Workload: ${State.data.workload} (${State.data.namespace})
Target Savings: $${State.data.savingsAbs}/mo
Environmental Impact: ${esgVal} lbs CO2 saved
Action: Reduce CPU limit from ${State.data.oldLimit} to ${State.data.newLimit}

Risk is mitigated. Historic peak usage remains below the new proposed limit.`;

        if (navigator.share) {
            try {
                await navigator.share({ title: subject, text: body });
            } catch (err) {
                console.log("Share cancelled or failed", err);
            }
        } else {
            navigator.clipboard.writeText(body);
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            alert("Insights copied to clipboard for Slack, and opened in your email client!");
        }
    }
};
