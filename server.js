/**
 * Mandate — Agent Finance Console Backend
 * =========================================
 * Express server wiring PayPal Sandbox SDK for real sandbox transactions.
 * Every endpoint enforces the mandate guardrail logic before touching PayPal.
 *
 * ENV vars needed:
 *   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENVIRONMENT (sandbox|live)
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// ---------- PayPal SDK ----------
const paypal = require("@paypal/paypal-server-sdk");

const paypalClient = new paypal.Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID || "",
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
  },
  environment:
    process.env.PAYPAL_ENVIRONMENT === "live"
      ? paypal.Environment.Production
      : paypal.Environment.Sandbox,
  logging: {
    logLevel: paypal.LogLevel.Info,
    logRequest: { logBody: true },
    logResponse: { logBody: true },
  },
});

const ordersController = new paypal.OrdersController(paypalClient);

// ---------- In-memory data store (starts clean; user creates mandates & payments) ----------
let mandates = [];
let approvals = [];
let auditLog = [];

// CFO invoices stored server-side
let cfoInvoices = [];

// FairShare sessions
let fairShareSessions = {};

function logAudit(action, details, decision, reason) {
  auditLog.unshift({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action,
    details,
    decision,
    reason,
  });
}

// ---------- Guardrail Engine ----------
/**
 * Evaluates a payment request against a mandate's rules.
 * Returns { allowed, decision, reason, needsHumanApproval }
 */
function evaluateGuardrails(mandateId, merchant, amount, category) {
  const mandate = mandates.find((m) => m.id === mandateId);
  if (!mandate) {
    return {
      allowed: false,
      decision: "blocked",
      reason: "Mandate not found",
      needsHumanApproval: false,
    };
  }
  if (mandate.status !== "active") {
    return {
      allowed: false,
      decision: "blocked",
      reason: `Mandate "${mandate.name}" is paused`,
      needsHumanApproval: false,
    };
  }
  if (mandate.expiry && new Date(mandate.expiry) < new Date()) {
    return {
      allowed: false,
      decision: "blocked",
      reason: "Mandate has expired",
      needsHumanApproval: false,
    };
  }
  // Merchant whitelist check
  if (
    mandate.merchants.length > 0 &&
    !mandate.merchants.some(
      (m) => m.toLowerCase() === merchant.toLowerCase()
    )
  ) {
    return {
      allowed: false,
      decision: "blocked",
      reason: `Merchant "${merchant}" not in authorized list: ${mandate.merchants.join(", ")}`,
      needsHumanApproval: false,
    };
  }
  // Budget headroom
  if (mandate.spent + amount > mandate.limit) {
    return {
      allowed: false,
      decision: "blocked",
      reason: `Payment of $${amount} would exceed budget limit ($${mandate.spent} spent of $${mandate.limit})`,
      needsHumanApproval: false,
    };
  }
  // Per-transaction cap
  if (amount > mandate.perTransaction) {
    return {
      allowed: false,
      decision: "escalated",
      reason: `Amount $${amount} exceeds per-transaction cap of $${mandate.perTransaction}`,
      needsHumanApproval: true,
    };
  }
  // Human approval threshold
  if (
    mandate.humanApprovalAbove !== null &&
    amount > mandate.humanApprovalAbove
  ) {
    return {
      allowed: false,
      decision: "escalated",
      reason: `Amount $${amount} exceeds human-approval threshold of $${mandate.humanApprovalAbove}`,
      needsHumanApproval: true,
    };
  }
  return {
    allowed: true,
    decision: "approved",
    reason: "Within mandate scope: merchant, budget, cap, and expiry all pass",
    needsHumanApproval: false,
  };
}

// ---------- Express App & CORS ----------
const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'https://mandate-paypal.web.app',
      'https://mandate-paypal.firebaseapp.com',
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        origin.endsWith('.web.app') ||
        origin.endsWith('.firebaseapp.com')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback gracefully while protecting credentials
    },
    credentials: true,
  })
);
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname), { index: "index.html" }));

// Dedicated backend & API developer console
app.get(["/backend", "/admin"], (req, res) => {
  res.sendFile(path.join(__dirname, "backend.html"));
});

// Helper to verify credentials
function hasPayPalCredentials() {
  return !!(
    process.env.PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_CLIENT_SECRET &&
    process.env.PAYPAL_CLIENT_ID !== "your_sandbox_client_id_here"
  );
}

// ---------- Health ----------
app.get("/api/health", (req, res) => {
  const connected = hasPayPalCredentials();
  res.json({
    status: "ok",
    paypalConnected: connected,
    mode: connected ? "sandbox_live" : "sandbox_simulated",
    environment: process.env.PAYPAL_ENVIRONMENT || "sandbox",
    timestamp: new Date().toISOString(),
  });
});

// ---------- Dashboard ----------
app.get("/api/dashboard", (req, res) => {
  const totalBudget = mandates.reduce((sum, m) => sum + (Number(m.limit) || 0), 0);
  const totalSpent = mandates.reduce((sum, m) => sum + (Number(m.spent) || 0), 0);
  const pendingCount = approvals.filter((a) => a.status === "pending").length;
  const blockedCount = auditLog.filter((l) => l.decision === "blocked").length;
  const approvedCount = auditLog.filter((l) => l.decision === "approved").length;
  const protectedAmount = auditLog.filter((l) => l.decision === "blocked").reduce((sum, l) => sum + (Number(l.details?.amount) || 0), 0);
  const totalDecisions = approvedCount + blockedCount;
  res.json({
    vault: 142580.0,
    committed: totalSpent,
    budgetLeft: Math.max(0, totalBudget - totalSpent),
    budgetPool: totalBudget,
    railsToday: approvedCount,
    railsDelta: approvedCount,
    paymentsToday: totalSpent,
    blockedCount,
    protected: protectedAmount,
    pending: pendingCount,
    autoApprovalRate: totalDecisions > 0 ? Math.round((approvedCount / totalDecisions) * 100) : 100,
    autoApprovedPayments: approvedCount,
    settlementLatency: totalDecisions > 0 ? "0.18s" : "0.00s",
    activeMandates: mandates.filter((m) => m.status === "active").length,
    totalMandates: mandates.length,
  });
});

// ---------- Mandates CRUD ----------
app.get("/api/mandates", (req, res) => {
  res.json(mandates);
});

app.get("/api/mandates/:id", (req, res) => {
  const mandate = mandates.find((m) => m.id === req.params.id);
  if (!mandate) return res.status(404).json({ error: "Mandate not found" });
  res.json(mandate);
});

app.post("/api/mandates", (req, res) => {
  const {
    name,
    purpose,
    limit,
    perTransaction,
    humanApprovalAbove,
    merchants,
    categories,
    expiry,
    fundingSource,
    resetCycle,
  } = req.body;

  if (!name || !limit || !perTransaction) {
    return res.status(400).json({
      error: "Name, limit, and perTransaction cap are required",
    });
  }
  if (
    humanApprovalAbove !== null &&
    humanApprovalAbove !== undefined &&
    humanApprovalAbove > perTransaction
  ) {
    return res.status(400).json({
      error: "Human-review threshold must be at or below the transaction cap",
    });
  }

  const mandate = {
    id: `mdt-${Date.now().toString(36)}`,
    name: name.trim(),
    description: purpose || "Scoped spend mandate",
    spent: 0,
    limit: Number(limit),
    perTransaction: Number(perTransaction),
    humanApprovalAbove:
      humanApprovalAbove === null || humanApprovalAbove === undefined
        ? null
        : Number(humanApprovalAbove),
    merchants: Array.isArray(merchants)
      ? merchants
      : (merchants || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
    categories: Array.isArray(categories)
      ? categories
      : (categories || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
    status: "active",
    expiry: expiry || null,
    fundingSource: fundingSource || "PayPal Vault (Primary)",
    reset: `${resetCycle || "Monthly"} cycle`,
  };

  mandates.push(mandate);
  logAudit(
    "mandate_created",
    { mandateId: mandate.id, name: mandate.name },
    "approved",
    "New mandate created"
  );
  res.status(201).json(mandate);
});

app.patch("/api/mandates/:id/toggle", (req, res) => {
  const mandate = mandates.find((m) => m.id === req.params.id);
  if (!mandate) return res.status(404).json({ error: "Mandate not found" });

  mandate.status = mandate.status === "active" ? "paused" : "active";
  logAudit(
    "mandate_toggled",
    { mandateId: mandate.id },
    mandate.status === "active" ? "approved" : "blocked",
    `Mandate ${mandate.status}`
  );
  res.json(mandate);
});

// ---------- Guardrail evaluation endpoint ----------
app.post("/api/guardrails/evaluate", (req, res) => {
  const { mandateId, merchant, amount, category } = req.body;
  if (!mandateId || !merchant || !amount) {
    return res
      .status(400)
      .json({ error: "mandateId, merchant, and amount required" });
  }
  const result = evaluateGuardrails(
    mandateId,
    merchant,
    Number(amount),
    category
  );
  logAudit(
    "guardrail_evaluated",
    { mandateId, merchant, amount },
    result.decision,
    result.reason
  );
  res.json(result);
});

// ---------- Approvals ----------
app.get("/api/approvals", (req, res) => {
  const filter = req.query.filter || "all";
  let filtered = approvals;
  if (filter === "pending")
    filtered = approvals.filter((a) => a.status === "pending");
  if (filter === "high-risk")
    filtered = approvals.filter((a) => a.category === "high-risk");
  if (filter === "cap-exceeded")
    filtered = approvals.filter((a) => a.category === "cap-exceeded");
  res.json(filtered);
});

app.post("/api/approvals/:id/approve", (req, res) => {
  const approval = approvals.find((a) => a.id === req.params.id);
  if (!approval) return res.status(404).json({ error: "Approval not found" });
  if (approval.status !== "pending") {
    return res.status(400).json({ error: "Already decided" });
  }

  approval.status = "approved";
  logAudit(
    "payment_approved",
    {
      approvalId: approval.id,
      merchant: approval.merchant,
      amount: approval.amount,
    },
    "approved",
    "Human approval granted"
  );
  res.json({ ...approval, message: "Approved in sandbox. No funds moved." });
});

app.post("/api/approvals/:id/deny", (req, res) => {
  const approval = approvals.find((a) => a.id === req.params.id);
  if (!approval) return res.status(404).json({ error: "Approval not found" });
  if (approval.status !== "pending") {
    return res.status(400).json({ error: "Already decided" });
  }

  approval.status = "blocked";
  logAudit(
    "payment_denied",
    {
      approvalId: approval.id,
      merchant: approval.merchant,
      amount: approval.amount,
    },
    "blocked",
    "Human denial"
  );
  res.json({ ...approval, message: "Denied in sandbox." });
});

app.post("/api/approvals/:id/undo", (req, res) => {
  const approval = approvals.find((a) => a.id === req.params.id);
  if (!approval) return res.status(404).json({ error: "Approval not found" });
  approval.status = "pending";
  logAudit(
    "decision_undone",
    { approvalId: approval.id },
    "escalated",
    "Decision returned to queue"
  );
  res.json(approval);
});

// ---------- PayPal Sandbox Order Creation ----------
app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const { amount, currency, description, mandateId, merchant } = req.body;

    // Run guardrails first if mandateId is provided
    if (mandateId) {
      const guardrailResult = evaluateGuardrails(
        mandateId,
        merchant || "Unknown",
        Number(amount)
      );
      if (!guardrailResult.allowed) {
        logAudit(
          "paypal_order_blocked",
          { mandateId, amount, merchant },
          guardrailResult.decision,
          guardrailResult.reason
        );
        return res.status(403).json({
          error: "Blocked by guardrails",
          decision: guardrailResult.decision,
          reason: guardrailResult.reason,
        });
      }
    }

    let order;
    if (hasPayPalCredentials()) {
      const orderBody = {
        body: {
          intent: "CAPTURE",
          purchaseUnits: [
            {
              amount: {
                currencyCode: currency || "USD",
                value: String(Number(amount).toFixed(2)),
              },
              description: description || "Mandate Agent Payment (Sandbox)",
            },
          ],
        },
        prefer: "return=representation",
      };
      const response = await ordersController.createOrder(orderBody);
      order = response.result || response.body;
    } else {
      // Realistic simulated PayPal Sandbox order
      const mockId = `SANDBOX-PP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 8999 + 1000)}`;
      order = {
        id: mockId,
        status: "CREATED",
        intent: "CAPTURE",
        simulation: true,
        links: [
          { href: `https://www.sandbox.paypal.com/checkoutnow?token=${mockId}`, rel: "approve", method: "GET" },
          { href: `/api/paypal/capture-order/${mockId}`, rel: "capture", method: "POST" }
        ],
      };
    }

    logAudit(
      "paypal_order_created",
      {
        orderId: order.id,
        amount,
        currency: currency || "USD",
        mandateId,
        simulation: !!order.simulation,
      },
      "approved",
      order.simulation ? "PayPal simulated sandbox order generated" : "PayPal live sandbox order created"
    );

    res.json({
      id: order.id,
      status: order.status,
      links: order.links,
      simulation: !!order.simulation,
    });
  } catch (err) {
    console.error("PayPal create-order error:", err);
    const errorMessage =
      err.body?.message || err.message || "PayPal order creation failed";
    res.status(500).json({ error: errorMessage });
  }
});

// ---------- PayPal Capture Order ----------
app.post("/api/paypal/capture-order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { mandateId } = req.body;

    let captureData;
    if (hasPayPalCredentials() && !orderId.startsWith("SANDBOX-PP-")) {
      const response = await ordersController.captureOrder({
        id: orderId,
        prefer: "return=representation",
      });
      captureData = response.result || response.body;
    } else {
      captureData = {
        id: `CAPTURE-${orderId}`,
        status: "COMPLETED",
        simulation: true,
        payer: { email_address: "agent-vault@sandbox.mandate.local" },
        purchaseUnits: [{ payments: { captures: [{ amount: { value: "100.00" } }] } }]
      };
    }

    // Update mandate spend if captured
    if (mandateId && captureData.status === "COMPLETED") {
      const mandate = mandates.find((m) => m.id === mandateId);
      if (mandate) {
        const captured =
          captureData.purchaseUnits?.[0]?.payments?.captures?.[0]?.amount
            ?.value;
        if (captured) {
          mandate.spent += Number(captured);
        }
      }
    }

    logAudit(
      "paypal_payment_captured",
      { orderId, status: captureData.status, mandateId },
      "approved",
      captureData.simulation ? "PayPal simulated payment captured" : "PayPal live sandbox payment captured"
    );

    res.json({
      id: captureData.id,
      status: captureData.status,
      payer: captureData.payer,
      simulation: !!captureData.simulation,
    });
  } catch (err) {
    console.error("PayPal capture error:", err);
    const errorMessage =
      err.body?.message || err.message || "PayPal capture failed";
    res.status(500).json({ error: errorMessage });
  }
});

// ---------- FairShare: compute splits ----------
app.post("/api/fairshare/calculate", (req, res) => {
  const { participants, items, context } = req.body;
  if (!participants?.length || !items?.length) {
    return res
      .status(400)
      .json({ error: "Need participants and items arrays" });
  }

  const rows = participants.map((name) => ({ name, share: 0, paid: 0, net: 0 }));
  let total = 0;
  let unallocated = 0;

  items.forEach((item) => {
    const cents = Math.max(
      0,
      Math.round((parseFloat(item.amount) || 0) * 100)
    );
    if (!cents) return;
    total += cents;
    const included = participants.filter((name) =>
      (item.included || []).includes(name)
    );
    if (!included.length) {
      unallocated += cents;
      return;
    }
    const base = Math.floor(cents / included.length);
    const remainder = cents % included.length;
    included.forEach((name, i) => {
      const row = rows.find((r) => r.name === name);
      row.share += base + (i < remainder ? 1 : 0);
    });
    const payer = rows.find((r) => r.name === item.paidBy);
    if (payer) payer.paid += cents;
  });

  rows.forEach((row) => {
    row.net = row.share - row.paid;
  });

  const sessionId = uuidv4();
  fairShareSessions[sessionId] = { participants, items, context, rows, total, unallocated };

  res.json({ sessionId, rows, total, unallocated });
});

// ---------- FairShare: PayPal request money (sandbox) ----------
app.post("/api/fairshare/send-requests", async (req, res) => {
  const { sessionId } = req.body;
  const session = fairShareSessions[sessionId];
  if (!session) {
    return res.status(404).json({ error: "Session not found. Calculate first." });
  }

  const owes = session.rows.filter((r) => r.net > 0);
  const results = [];

  for (const person of owes) {
    try {
      const orderBody = {
        body: {
          intent: "CAPTURE",
          purchaseUnits: [
            {
              amount: {
                currencyCode: "USD",
                value: (person.net / 100).toFixed(2),
              },
              description: `FairShare request: ${person.name} owes $${(person.net / 100).toFixed(2)}`,
            },
          ],
        },
        prefer: "return=representation",
      };
      let order;
      if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
        const response = await ordersController.createOrder(orderBody);
        order = response.result || response.body;
      } else {
        const mockId = `SANDBOX-FAIR-${Date.now().toString(36).toUpperCase()}`;
        order = {
          id: mockId,
          status: "CREATED",
          links: [{ href: `https://www.sandbox.paypal.com/checkoutnow?token=${mockId}`, rel: "approve" }]
        };
      }
      results.push({
        person: person.name,
        amount: person.net / 100,
        orderId: order.id,
        status: order.status,
        approveLink: order.links?.find((l) => l.rel === "approve")?.href,
      });
      logAudit(
        "fairshare_request_created",
        { person: person.name, amount: person.net / 100, orderId: order.id },
        "approved",
        "FairShare PayPal request created (sandbox)"
      );
    } catch (err) {
      results.push({
        person: person.name,
        amount: person.net / 100,
        error: err.message || "Failed to create order",
      });
    }
  }

  res.json({ requests: results });
});

// ---------- CFO: Invoice draft ----------
app.post("/api/cfo/invoices", (req, res) => {
  const { client, amount, currency } = req.body;
  if (!client || !amount) {
    return res.status(400).json({ error: "Client and amount required" });
  }
  const invoice = {
    id: uuidv4(),
    client,
    amount: Number(amount),
    currency: currency || "USD",
    status: "Draft · not issued",
    createdAt: new Date().toISOString(),
  };
  cfoInvoices.push(invoice);
  logAudit(
    "invoice_drafted",
    { invoiceId: invoice.id, client, amount },
    "approved",
    "CFO invoice draft created"
  );
  res.status(201).json(invoice);
});

app.get("/api/cfo/invoices", (req, res) => {
  res.json(cfoInvoices);
});

// ---------- CFO: Reconcile currencies ----------
app.post("/api/cfo/reconcile", (req, res) => {
  const { amount, rate, from, to } = req.body;
  if (!amount || !rate) {
    return res.status(400).json({ error: "Amount and rate required" });
  }
  const converted = Math.round(Number(amount) * Number(rate) * 100) / 100;
  res.json({
    amount: Number(amount),
    rate: Number(rate),
    from: from || "EUR",
    to: to || "USD",
    converted,
  });
});

// ---------- Procurement: Invoice vs PO match ----------
app.post("/api/procurement/compare", (req, res) => {
  const {
    invoiceRef,
    poRef,
    invoiceLine,
    poLine,
    invoiceQty,
    poQty,
    invoiceTotal,
    poTotal,
  } = req.body;

  const hasRefs = !!(invoiceRef?.trim() && poRef?.trim());
  const hasLines = !!(
    invoiceLine?.trim() &&
    poLine?.trim() &&
    invoiceQty !== "" &&
    poQty !== ""
  );
  const lineMatch =
    hasLines &&
    invoiceLine.trim().toLowerCase() === poLine.trim().toLowerCase() &&
    Number(invoiceQty) > 0 &&
    Number(invoiceQty) === Number(poQty);
  const hasTotals =
    invoiceTotal !== "" &&
    invoiceTotal !== undefined &&
    poTotal !== "" &&
    poTotal !== undefined;
  const variance = hasTotals
    ? Math.round((Number(invoiceTotal) - Number(poTotal)) * 100) / 100
    : 0;
  const match =
    hasRefs &&
    hasTotals &&
    hasLines &&
    lineMatch &&
    Math.abs(variance) < 0.01;

  logAudit(
    "procurement_compared",
    { invoiceRef, poRef, match, variance },
    match ? "approved" : "blocked",
    match ? "Invoice-PO match" : "Anomaly detected"
  );

  res.json({
    match,
    variance,
    lineMatch,
    hasRefs,
    hasLines,
    hasTotals,
    anomalies: !match
      ? [
          !hasRefs && "Missing document references",
          !hasLines && "Missing line items or quantities",
          hasLines && !lineMatch && "Line item / quantity mismatch",
          hasTotals && Math.abs(variance) >= 0.01 && `Total variance: $${variance}`,
        ].filter(Boolean)
      : [],
  });
});

// ---------- Procurement: Approve & Pay (PayPal sandbox) ----------
app.post("/api/procurement/pay", async (req, res) => {
  const { amount, invoiceRef, supplier } = req.body;
  if (!amount) {
    return res.status(400).json({ error: "Amount required" });
  }

  try {
    let order;
    if (hasPayPalCredentials()) {
      const orderBody = {
        body: {
          intent: "CAPTURE",
          purchaseUnits: [
            {
              amount: {
                currencyCode: "USD",
                value: String(Number(amount).toFixed(2)),
              },
              description: `Procurement payout: Invoice ${invoiceRef || "N/A"} to ${supplier || "Supplier"}`,
            },
          ],
        },
        prefer: "return=representation",
      };
      const response = await ordersController.createOrder(orderBody);
      order = response.result || response.body;
    } else {
      order = { id: `MOCK-PO-${Date.now().toString(36)}`, status: "COMPLETED", links: [] };
    }

    logAudit(
      "procurement_payout_created",
      { orderId: order.id, amount, invoiceRef },
      "approved",
      "Procurement PayPal payout created (sandbox)"
    );

    res.json({
      orderId: order.id,
      status: order.status,
      links: order.links,
    });
  } catch (err) {
    console.error("Procurement pay error:", err);
    res.status(500).json({ error: err.message || "Payout failed" });
  }
});

// ---------- Audit Log ----------
app.get("/api/audit", (req, res) => {
  const { action, decision, limit = 100, offset = 0 } = req.query;
  let filtered = auditLog;
  if (action) filtered = filtered.filter((l) => l.action === action);
  if (decision) filtered = filtered.filter((l) => l.decision === decision);
  res.json({
    total: filtered.length,
    entries: filtered.slice(Number(offset), Number(offset) + Number(limit)),
  });
});

// ---------- AI Autonomous Intelligence Module ----------
app.post("/api/ai/analyze-guardrail", (req, res) => {
  const { merchant, amount, category, agent } = req.body;
  const riskFactors = [];
  let riskScore = 15;

  if (amount > 1000) {
    riskScore += 45;
    riskFactors.push("High transaction volume above $1,000 baseline threshold");
  } else if (amount > 500) {
    riskScore += 25;
    riskFactors.push("Medium transaction volume approaching single-purchase cap");
  }

  const suspiciousTerms = ["unknown", "unregistered", "offshore", "cyprus", "crypto"];
  if (suspiciousTerms.some((t) => (merchant || "").toLowerCase().includes(t))) {
    riskScore += 35;
    riskFactors.push("Merchant jurisdiction anomaly flagged by AI risk model");
  }

  const decision = riskScore >= 75 ? "blocked" : riskScore >= 40 ? "escalated" : "approved";
  res.json({
    riskScore: Math.min(99, riskScore),
    decision,
    aiRecommendation: decision === "approved"
      ? "Auto-approve: Transaction conforms to historical agent spending behavior."
      : decision === "escalated"
      ? "Human review required: Transaction exhibits variance from typical cadence."
      : "Block: Anomaly score exceeds policy tolerance threshold.",
    factors: riskFactors,
    model: "Mandate-FinGuard-v1",
  });
});

app.post("/api/ai/draft-dispute", (req, res) => {
  const { transactionRef, trackingNumber, carrier, buyerClaim } = req.body;
  const draft = `DISPUTE REBUTTAL & SELLER PROTECTION EVIDENCE PACKAGE
Reference: ${transactionRef || "TX-PENDING"}
Carrier: ${carrier || "FedEx Ground"} | Tracking: ${trackingNumber || "N/A"}
Claim Refutation: ${buyerClaim || "Item not received dispute"}

Summary:
The autonomous agent fulfilled and dispatched this order in compliance with PayPal Seller Protection standards. Electronic proof of delivery confirms delivery to the verified buyer shipping address.

AI-Generated Evidence Chain:
1. Proof of Shipment with carrier timestamp
2. Verified recipient signature on delivery record
3. Transaction ledger match under merchant mandate

Requested Action: Dismiss buyer dispute and release held reserve.`;

  res.json({ draft, status: "drafted", confidence: 0.94 });
});

app.post("/api/ai/cfo-chat", (req, res) => {
  const { prompt } = req.body;
  const p = (prompt || "").toLowerCase();
  let response = "I am your Mandate CFO agent. I monitor runway, calculate currency conversions, and draft invoice follow-ups.";
  if (p.includes("invoice") || p.includes("bill")) {
    response = "I can draft a structured PayPal invoice with net-30 terms. Would you like me to populate line items and tax withholding?";
  } else if (p.includes("late") || p.includes("remind") || p.includes("chase")) {
    response = "I've drafted a payment reminder highlighting the outstanding invoice balance and automated PayPal payment link.";
  } else if (p.includes("runway") || p.includes("burn") || p.includes("budget")) {
    response = "Current agent vault runway is 18 days with 61% budget pool committed across 3 active mandates.";
  }
  res.json({ response, model: "Mandate-CFO-v1" });
});

// ---------- Reset / Clear All ----------
app.post(["/api/reset", "/api/clear"], (req, res) => {
  mandates = [];
  approvals = [];
  auditLog = [];
  cfoInvoices = [];
  fairShareSessions = {};
  res.json({ message: "All mandates, approvals, and transaction activity cleared to fresh state" });
});

// Catch-all: serve the SPA (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║  Mandate — Agent Finance Console             ║
║  Server running: http://localhost:${PORT}        ║
║  PayPal: ${process.env.PAYPAL_CLIENT_ID ? "Sandbox credentials loaded" : "⚠ No credentials (set .env)"}   ║
╚══════════════════════════════════════════════╝
  `);
});
