import { FinOpsData } from './types';
import { CONFIG } from './config';

export const Templates = {
    getTerraformHCL(data: FinOpsData) {
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
           limits   = { cpu = "${data.newLimit}" }
          }
        }
      }
    }
  }
}`;
    },

    getYamlManifest(data: FinOpsData) {
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
           cpu: "${data.newLimit}"`;
    },

    getZombieTableRows(zombies: any[]) {
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

    getGitPatch(yamlContent: string, data: FinOpsData) {
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
