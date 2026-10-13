# Mandate — Agent Spend Firewall & Autonomous Capital Precision (V2)
> **PayPal AI Hackathon Submission**  
> Complete Autonomous Agent Spend Firewall, Policy Guardrails, MCP Server, and PayPal Sandbox Settlement Engine.

---

## 🌟 Executive Summary
As autonomous AI agents gain agency to purchase compute, license SaaS, provision cloud infrastructure, and procure physical inventory, enterprises and individuals face a critical challenge: **Uncontrolled Agentic Capital Leakage**. 

**Mandate** introduces the **Agent Spend Firewall**:
1. **Scoped Budget Mandates:** Users issue cryptographically auditable spending mandates to autonomous agents (monthly caps, single-tx ceilings, whitelisted merchants, approved jurisdictions, and human review triggers).
2. **Deterministic Policy Guardrails & Risk Scoring:** Every agent payment request is evaluated in under 20ms, producing a 0–100 risk index with detailed breach explanations.
3. **Tri-State Policy Actions:**
   - **APPROVED (Auto):** Safe transactions auto-settle instantly over PayPal Sandbox commercial rails.
   - **ESCALATED:** High-variance or over-cap requests are held in the **Approvals Queue** for a single-click human sign-off before PayPal authorization.
   - **BLOCKED:** Prohibited categories (e.g. gambling, offshore registries) are terminated with zero financial leakage.
4. **PayPal Settlement Architecture:** Integrated with PayPal Orders v2 (`/api/paypal/create-order` & `/api/paypal/capture-order`), Vault balance ledger, and instant peer-to-peer settlement links.

---

## 🏛️ V2 Architecture Diagram

```
                                  ┌────────────────────────┐
                                  │  External Agents (MCP) │
                                  │ Claude Desktop / Cursor│
                                  └───────────┬────────────┘
                                              │ stdio / JSON-RPC
                                              ▼
┌────────────────────────┐        ┌────────────────────────┐        ┌────────────────────────┐
│  Agent Playground Chat ├───────►│  Mandate MCP Server    │        │ Prompt-Injection Shield│
│  (Google Gemini 2.5)   │        │     (/mcp-server)      │        │    (Attack Lab L0)     │
└────────────────────────┘        └───────────┬────────────┘        └───────────┬────────────┘
                                              │                                 │
                                              ▼                                 ▼
                         ┌─────────────────────────────────────────────────────────────┐
                         │              MANDATE SPEND FIREWALL ENGINE                  │
                         │   • Merchant Allowlist Filter   • Single-Tx Limit ($150-$500)│
                         │   • Monthly Runway Cap Budget   • Sanctions Jurisdiction KYB│
                         └──────────────────────────────┬──────────────────────────────┘
                                                        │
                      ┌─────────────────────────────────┴─────────────────────────────────┐
                      ▼                                                                   ▼
       [ In-Policy: APPROVED ]                                             [ Out-of-Policy: ESCALATE/BLOCK ]
                      │                                                                   │
                      ▼                                                                   ▼
     ⚡ PayPal Sandbox Rail                                            🛡️ Fiduciary Escrow Quarantine
   (/api/paypal/capture-order)                                          (Zero Capital Leakage Hold)
                      │                                                                   │
                      ▼                                                                   ▼
     📜 SHA-256 Tamper-Evident Ledger                                    📱 Telegram Approvals Bot
        (Cryptographic Hash Chain)                                       (Mobile Long-Polling Push)
```

---

## 🚀 Key Features

### 1. Model Context Protocol (MCP) Server (`/mcp-server`)
Exposes the Mandate Spend Firewall directly to external coding and research agents via `@modelcontextprotocol/sdk`.
- **Tools Exposed:**
  - `list_mandates`: Inspect active agent budgets, caps, and allowed merchants.
  - `check_mandate`: Pre-screen candidate purchases without moving funds.
  - `request_payment`: Execute in-policy orders via PayPal Sandbox or quarantine to Fiduciary Escrow.

### 2. Autonomous Agent Playground
Interactive chat where an LLM agent powered by Google Gemini (or deterministic fallback) evaluates user purchasing instructions, triggers inline tool calls, and captures PayPal Sandbox orders. Includes pre-configured test scenarios.

### 3. Prompt-Injection Shield (Attack Lab)
Layer 0 pre-screen combining deterministic regex heuristic checks with a structured Google Gemini JSON classifier. Pre-screens invoice payloads, merchant descriptions, and system instructions for adversarial jailbreaks or rule cancellations before reaching the policy engine.

### 4. Red-Team Scoreboard
Automated test suite executing 24+ adversarial scenarios (over-cap requests, sanctions evasion, prompt injection bypasses, expired mandates, and benchmark in-policy controls). Features pass/fail telemetry, category breakdown, and instant CSV/JSON exports.

### 5. Telegram Approvals Bot
Long-polling Telegram bot enabling remote fiduciary sign-offs. Escalated transactions dispatch interactive `Approve with PayPal` and `Deny` buttons directly to your mobile device with zero public webhook URLs needed.

### 6. Cryptographic Tamper-Evident Ledger
SHA-256 hash-chained audit ledger connecting each transaction and policy decision to its parent block. Includes live cryptographic verification and a safe in-memory tamper simulation proving that any unauthorized ledger alteration breaks the chain.

### 7. Real-Time Event Stream & Webhooks
Server-Sent Events (SSE) telemetry streaming live heartbeats and PayPal webhook notifications (`/api/v2/webhooks/paypal`).

### 8. Anomaly Detection & Cap Forecasting
Statistical velocity anomaly detector that flags sudden burn spikes, identifies new unlisted merchants, and forecasts the exact date a mandate will hit its budget cap based on daily burn rate.

### 9. Agent-to-Agent Marketplace
Split-screen visual demonstration where a Buyer Agent and a Seller Agent autonomously negotiate compute pricing across 3 rounds within their respective mandate limits, settling the consensus price over PayPal Sandbox.

### 10. Command Palette (`Ctrl+K` / `Cmd+K`)
Fast keyboard-driven navigation palette allowing instant jumps between screens, tool suites, and realistic demo data generation.

---

## ⚙️ Environment Variables Configuration

Create a `.env.local` file in the project root (see `.env.example`):

```env
# PayPal Sandbox Credentials
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com

# Base App URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Google Gemini API (Unified LLM Provider for Playground, Attack Lab, Marketplace)
# (Leave empty to use deterministic offline fallback mode)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Telegram Approvals Bot (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here
```

---

## 🔌 Connecting Local Agents via MCP

### Claude Desktop Configuration
Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mandate": {
      "command": "node",
      "args": [
        "C:/Users/Lp/Downloads/frontend/stitch_mandate_ai_spend_guardrails/mcp-server/index.mjs"
      ],
      "env": {
        "MANDATE_APP_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Cursor IDE Configuration
In **Cursor Settings > Features > MCP Servers**, add a new command server:
- **Name:** `mandate`
- **Type:** `command`
- **Command:** `node C:/Users/Lp/Downloads/frontend/stitch_mandate_ai_spend_guardrails/mcp-server/index.mjs`

---

## 📱 Telegram Approvals Bot Setup (Long-Polling)

1. Open Telegram and message `@BotFather` to create a bot and receive your `TELEGRAM_BOT_TOKEN`.
2. Message your new bot, then find your numeric chat ID using `@userinfobot` and set `TELEGRAM_CHAT_ID`.
3. Add both values to `.env.local`.
4. In the Mandate application, click **Send Test Notification** in the right rail or Telegram card to verify mobile delivery.

---

## 🧪 Running the Red-Team Suite

1. Open the application and navigate to **Tools > Red-Team Scoreboard**.
2. Click **Run 24 Red-Team Scenarios**.
3. Inspect the pass/fail matrix, accuracy score (100%), and block rate.
4. Click **CSV** or **JSON** to export the verification report for compliance auditing.

---

## 🛠️ Development & Production Build

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run production build
npm run build
```

---

## 🛡️ License & Acknowledgements
Built for the **PayPal AI Hackathon 2026**. Powered by **PayPal Sandbox** and **Google Gemini API**.
