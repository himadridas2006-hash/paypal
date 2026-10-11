# Agent Finance Command Center

A responsive desktop-and-mobile interface for managing agent finance operations, featuring core modules for Command Center, Mandates, and Approvals with specialized financial tools.

## Overview

This project implements a comprehensive financial command center for AI agents, providing tools for budget management, expense tracking, procurement, dispute resolution, and more. The interface is designed to work seamlessly across desktop and mobile devices.

## Features

### Core Navigation
- **Command Center**: Main dashboard with financial overview
- **Mandates**: Budget limits and spending rules management
- **Approvals**: Transaction approval workflow

### Financial Modules
- **Agent Spend Firewall**: Real-time spending controls and monitoring
- **Dispute Resolver**: Transaction dispute management with evidence tracking
- **Procurement**: Purchase order management and supplier invoice matching
- **Freelancer CFO**: Invoice creation, payment tracking, and multi-currency support
- **FairShare**: Contextual expense splitting with natural language processing
- **Inventory/Hardware Triggers**: Automated reordering based on consumption sensors
- **Triage/Medical Billing**: Patient insurance claims and medical billing automation
- **Developer-Bounty Escrow**: Secure payment system for software development bounties

### Demo Capabilities
All modules include interactive demonstrations with preserved sample data:
- Vault balance: $142,580.00
- Committed funds: $10,720.00
- Available funds: $14,280.00 of $25,000
- Transaction feeds with categorized expenses
- Mandate examples for SaaS, marketing, and office operations
- Interactive approval/reject workflows
- Context-aware expense splitting examples
- Dispute resolution simulations
- Procurement matching demonstrations

### Technical Implementation
- Express backend (`server.js`) with `@paypal/paypal-server-sdk` integration
- REST API client (`api-client.js`) with health monitoring & seamless sandbox fallback
- Multi-theme design system:
  - **Light mode**: Crisp modern fintech palette with indigo-to-blue primary accents
  - **Dark mode**: Obsidian & navy dark fintech with high contrast cards & glowing accents
  - **Forest mode**: Emerald & moss palette
- Responsive design: desktop sidebar + mobile bottom navigation & drawer
- Scoped guardrail engine that validates merchant allowlists, per-transaction ceilings, and review thresholds before payments
- Generic "Pay with PayPal" execution with simulated or live Sandbox order creation
- Local state persistence (`localStorage`) with full server-side sync

## File Structure
```
├── server.js           # Express backend with PayPal Server SDK & guardrail engine
├── api-client.js       # Client API connector for frontend-to-backend communication
├── index.html          # Main application shell with theme switchers & navigation
├── app.js              # View renderers for all 10 screens
├── data.js             # Initial state, seed metrics, and sample datasets
├── interactions.js     # User interaction handlers, theme manager, dialog workflows
├── styles.css          # Design system with light, dark, and forest mode themes
├── .env.example        # Template for PayPal Sandbox credentials
├── package.json        # Dependencies (Express, @paypal/paypal-server-sdk, cors, dotenv)
└── assets/             # Icons and static resources
```

## Running the Application

### 1. Install dependencies
```bash
npm install
```

### 2. Configure PayPal Sandbox (Optional)
Copy `.env.example` to `.env` and insert your sandbox credentials from [developer.paypal.com](https://developer.paypal.com/dashboard/applications/sandbox):
```env
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_ENVIRONMENT=sandbox
PORT=3000
```
*(If no credentials are provided, the app runs in full simulated sandbox mode with realistic order tokens and local persistence).*

### 3. Start the Server
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

