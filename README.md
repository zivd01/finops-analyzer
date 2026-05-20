# ☁️ FinOps Analyzer Dashboard

<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success.svg?style=for-the-badge" alt="Status Active" />
  <img src="https://img.shields.io/badge/Environment-k3s_Kubernetes-326ce5.svg?style=for-the-badge&logo=kubernetes" alt="Kubernetes k3s" />
  <img src="https://img.shields.io/badge/Tech_Stack-HTML_|_CSS_|_JS-f59e0b.svg?style=for-the-badge" alt="Tech Stack" />
</div>
<br/>

## Overview
A lightweight, high-performance, purely client-side web application designed to analyze and visualize FinOps telemetry data (from exports like Turbonomic and Apptio Cloudability). The dashboard specializes in visualizing **Kubernetes (k3s)** workload optimization—ensuring safe, data-driven resource limit reductions without modifying application source code.

## 🚀 Key Features

- 🕹️ **Time-Machine Simulator**: An interactive slider allowing you to manually project cost savings and efficiency gains by adjusting CPU limits dynamically.
- 🌍 **ESG Metrics Engine**: Translates reclaimed vCPU capacity into real-world environmental impact (calculating lbs of CO2 saved and equivalent trees planted).
- 🧟‍♂️ **Zombie Workload Scanner**: Automatically scans the uploaded telemetry to highlight orphaned or idle workloads (`< 2% CPU`) to target for decommissioning.
- 🕸️ **Blast Radius Topography**: An interactive ECharts force-directed graph that maps namespaces to visually prove workload isolation boundaries prior to deployment.
- 💾 **1-Click GitOps Downloader**: Securely generates and downloads ready-to-deploy `.patch` files containing optimized Kubernetes YAML manifests right from the browser.
- 💬 **Conversational FinOps Q&A**: An interactive chat assistant that dynamically explains the exact financial, technical, and runtime impact of telemetry alerts using natural language data bindings.

## 🛠️ Architecture & Tech Stack

The goal of this project is maximum portability and speed. It requires **zero build steps** and **zero backend APIs**.

- **Structure**: Vanilla HTML5
- **Styling**: Vanilla CSS3 (Glassmorphism aesthetics, Custom Dark Mode, CSS Variables)
- **Logic**: Vanilla ES6 JavaScript
- **Data Visualization**: [Apache ECharts (via CDN)](https://echarts.apache.org/)

## 📖 How to Run Locally

Because the application runs entirely client-side, setup takes less than 10 seconds:

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/zivd01/finops-analyzer.git
   ```
2. Navigate to the folder:
   ```bash
   cd finops-analyzer
   ```
3. Open `index.html` in any modern web browser. (Double-clicking the file works perfectly).
4. Click **Upload New File** and select your telemetry export (`.json` or `.csv`).

## 🔒 Security & Privacy

Data security is paramount. Because this is a **100% client-side application**, none of your proprietary infrastructure telemetry or billing data is ever transmitted over the network or sent to a backend server. All parsing, calculations, and visual rendering happen securely and locally within your browser's memory.
