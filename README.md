# Mandate — Agent Spend Firewall & Autonomous Capital Precision
> **PayPal AI Hackathon Submission**
> Live interactive Next.js application implementing an Autonomous Agent Spend Firewall, policy guardrails, and PayPal settlement engine.

---

## 🌟 Executive Summary
As autonomous AI agents gain agency to purchase compute, license SaaS, provision cloud infrastructure, and procure physical inventory, enterprises and individuals face a critical challenge: **Uncontrolled Agentic Capital Leakage**. 

**Mandate** introduces the **Agent Spend Firewall**:
1. **Scoped Budget Mandates:** Users issue cryptographically auditable spending mandates to autonomous agents (monthly caps, single-tx ceilings, whitelisted merchants, approved jurisdictions, and human review triggers).
2. **AI Policy Guardrails & Risk Scoring:** Every agent payment request is evaluated through a policy engine in under 0.24 seconds, producing a 0–100 risk score with detailed breach explanations.
3. **Tri-State Policy Actions:**
   - **APPROVED (Auto):** Safe transactions auto-settle instantly over PayPal commercial rails.
   - **ESCALATED:** High-variance or over-cap requests are held in the **Approvals Queue** for a single-click human sign-off before PayPal authorization.
   - **BLOCKED:** Prohibited categories (e.g. gambling, offshore registries) are terminated with zero financial leakage.
4. **PayPal Settlement Architecture:** Meaningfully integrated with PayPal Orders v2, PayPal Captures, PayPal Payouts, and PayPal Invoicing links.

---

## 🚀 Key Modules Built & Demonstrated

### 1. 🛡️ Command Center & Live Telemetry Stream
- Real-time vault velocity tracker ($10,720 daily committed).
- 4 high-density metric telemetry cards: Budget Remaining, Today's Rails, Blocked Guardrails, and Pending Approvals.
- Live streaming activity ledger with filter chips (`All Events`, `Approved`, `Blocked`, `Needs Review`).
- Toggleable **Agent Online / Standby** heartbeat.

### 2. 📋 Mandates Provisioning Engine
- Scoped mandates for 5 AI agents (e.g., *SaaS & Dev Tools Agent*, *Compute & GPU Cluster Agent*, *Digital Marketing Bot*).
- SVG circular utilization telemetry dials.
- Interactive **+ New Mandate Drawer** to provision new agent limits, monthly caps, per-tx ceilings, and merchant whitelists on the fly.

### 3. 🚨 Fiduciary Approvals Queue
- Real-time intercept for escalated transactions (e.g., *RunPod GPU Cloud $1,450*, *Figma Enterprise $720*, *Unknown Overseas Registrar $289*).
- Breach telemetry breakdown, rule violation chips, and server/datacenter context visual previews.
- Interactive **"Approve with PayPal"** modal that generates authentic PayPal Sandbox order IDs and completes captured settlement with seller protection.

### 4. 🍕 FairShare: Conversational Shared Expense Arbiter
- Contextual, non-equal cost division rather than simple 50/50 splits.
- Natural language arbitration prompts (e.g., *"Alice didn't drink alcohol, Bob left early, Charlie covered the deposit"*).
- OCR itemized line item extraction with proportional tax and tip balancing.
- One-click generated pre-filled PayPal invoice/payment links (`paypal.me/sandbox`) with copy and instant settlement simulation.

### 5. ⚖️ Autonomous Dispute Resolver
- Pulls transaction history and carrier tracking evidence (UPS Freight dock delivery signatures, CDN digital telemetry handshakes).
- Computes AI win probability (e.g., 88% and 94%).
- Formulates rebuttal packages ready for submission to the PayPal Disputes API.

### 6. 📦 Small Business Procurement Agent
- Autonomous 3-way matching of supplier invoices against purchase orders.
- Flags pricing inflation anomalies (+12.4% unapproved markups).
- Instant PayPal Enterprise Payout execution with human review nod.

### 7. 💼 Chat-Based Freelancer CFO
- Automated receivables monitoring, late fee reminders, and WhatsApp/email chaser dispatch.
- Multi-currency reconciliation across GBP and USD via PayPal conversion rails.

---

## 🛠️ Tech Stack & Compliance
- **Frontend Framework:** Next.js (App Router) + React 19 + TypeScript.
- **Styling & Design System:** Tailwind CSS with the exact *Autonomous Capital Precision* design system tokens (`DESIGN.md`), 16px rounded cards, Hanken Grotesk & Manrope typography, and Google Material Symbols.
- **PayPal Integration:** PayPal Orders v2 schema, PayPal Captures, PayPal Payouts, and PayPal Checkout payment link dispatch.
- **AI Policy Layer:** Weighted multi-factor risk scoring engine evaluating budget velocity, merchant whitelists, jurisdictional risk, and single-tx caps.
- **Deployable Target:** Vercel or Render (official PayPal hackathon sponsor).

---

## 🏃 Quickstart Guide

```bash
# 1. Install dependencies
npm install

# 2. Run the Next.js development server
npm run dev

# 3. Open http://localhost:3000 in your browser
```
