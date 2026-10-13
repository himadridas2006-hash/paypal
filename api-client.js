/**
 * Mandate — API Client
 * =====================
 * Bridges the frontend state machine with the Express backend.
 * Falls back to local-only mode if the server isn't reachable.
 */
(() => {
  "use strict";

  const BASE =
    (typeof window !== "undefined" && window.__MANDATE_API_URL__) ||
    (typeof window !== "undefined" && window.location.hostname === "localhost"
      ? window.location.origin
      : (typeof window !== "undefined" && window.location.origin));
  let backendOnline = false;

  async function request(path, options = {}) {
    try {
      const resp = await fetch(`${BASE}${path}`, {
        headers: { "Content-Type": "application/json", ...options.headers },
        ...options,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        throw new Error(err.error || resp.statusText);
      }
      return await resp.json();
    } catch (err) {
      console.warn(`[API] ${path} failed:`, err.message);
      throw err;
    }
  }

  // Health check — determine if backend is available
  async function checkHealth() {
    try {
      const data = await request("/api/health");
      backendOnline = data.status === "ok";
      return data;
    } catch {
      backendOnline = false;
      return { status: "offline", paypalConnected: false };
    }
  }

  // ---------- Dashboard ----------
  async function getDashboard() {
    return request("/api/dashboard");
  }

  // ---------- Mandates ----------
  async function getMandates() {
    return request("/api/mandates");
  }

  async function createMandate(data) {
    return request("/api/mandates", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async function toggleMandate(id) {
    return request(`/api/mandates/${id}/toggle`, { method: "PATCH" });
  }

  // ---------- Guardrails ----------
  async function evaluateGuardrails(mandateId, merchant, amount, category) {
    return request("/api/guardrails/evaluate", {
      method: "POST",
      body: JSON.stringify({ mandateId, merchant, amount, category }),
    });
  }

  // ---------- Approvals ----------
  async function getApprovals(filter) {
    const qs = filter && filter !== "all" ? `?filter=${filter}` : "";
    return request(`/api/approvals${qs}`);
  }

  async function approvePayment(id) {
    return request(`/api/approvals/${id}/approve`, { method: "POST" });
  }

  async function denyPayment(id) {
    return request(`/api/approvals/${id}/deny`, { method: "POST" });
  }

  async function undoDecision(id) {
    return request(`/api/approvals/${id}/undo`, { method: "POST" });
  }

  // ---------- PayPal ----------
  async function createPayPalOrder(amount, currency, description, mandateId, merchant) {
    return request("/api/paypal/create-order", {
      method: "POST",
      body: JSON.stringify({ amount, currency, description, mandateId, merchant }),
    });
  }

  async function capturePayPalOrder(orderId, mandateId) {
    return request(`/api/paypal/capture-order/${orderId}`, {
      method: "POST",
      body: JSON.stringify({ mandateId }),
    });
  }

  // ---------- FairShare ----------
  async function calculateFairShare(participants, items, context) {
    return request("/api/fairshare/calculate", {
      method: "POST",
      body: JSON.stringify({ participants, items, context }),
    });
  }

  async function sendFairShareRequests(sessionId) {
    return request("/api/fairshare/send-requests", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    });
  }

  // ---------- CFO ----------
  async function createInvoice(client, amount, currency) {
    return request("/api/cfo/invoices", {
      method: "POST",
      body: JSON.stringify({ client, amount, currency }),
    });
  }

  async function getInvoices() {
    return request("/api/cfo/invoices");
  }

  async function reconcileCurrencies(amount, rate, from, to) {
    return request("/api/cfo/reconcile", {
      method: "POST",
      body: JSON.stringify({ amount, rate, from, to }),
    });
  }

  // ---------- Procurement ----------
  async function compareProcurement(data) {
    return request("/api/procurement/compare", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async function procurementPay(amount, invoiceRef, supplier) {
    return request("/api/procurement/pay", {
      method: "POST",
      body: JSON.stringify({ amount, invoiceRef, supplier }),
    });
  }

  // ---------- Audit Log ----------
  async function getAuditLog(filters = {}) {
    const params = new URLSearchParams();
    if (filters.action) params.set("action", filters.action);
    if (filters.decision) params.set("decision", filters.decision);
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.offset) params.set("offset", String(filters.offset));
    const qs = params.toString();
    return request(`/api/audit${qs ? "?" + qs : ""}`);
  }

  // ---------- Reset ----------
  async function resetDemo() {
    return request("/api/reset", { method: "POST" });
  }

  // ---------- Public API ----------
  window.MANDATE_API = {
    get isOnline() { return backendOnline; },
    checkHealth,
    getDashboard,
    getMandates,
    createMandate,
    toggleMandate,
    evaluateGuardrails,
    getApprovals,
    approvePayment,
    denyPayment,
    undoDecision,
    createPayPalOrder,
    capturePayPalOrder,
    calculateFairShare,
    sendFairShareRequests,
    createInvoice,
    getInvoices,
    reconcileCurrencies,
    compareProcurement,
    procurementPay,
    getAuditLog,
    resetDemo,
  };

  // Auto-check health on load
  checkHealth().then((health) => {
    if (health.paypalConnected) {
      console.log("%c[Mandate] PayPal sandbox connected ✓", "color: #006947; font-weight: bold");
    } else if (health.status === "ok") {
      console.log("%c[Mandate] Server online, PayPal credentials missing", "color: #9a5a00; font-weight: bold");
    } else {
      console.log("%c[Mandate] Backend offline — running in local-only mode", "color: #ba1a1a; font-weight: bold");
    }
  });
})();
