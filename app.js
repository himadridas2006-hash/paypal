(() => {
  "use strict";
  const D = window.MANDATE_DATA;
  const ROUTES = ["overview", "mandates", "approvals", "fairshare", "disputes", "procurement", "cfo", "inventory", "triage", "escrow"];
  const ROUTE_FOR_CONCEPT = { firewall: "mandates", disputes: "disputes", procurement: "procurement", cfo: "cfo", fairshare: "fairshare", inventory: "inventory", triage: "triage", escrow: "escrow" };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const initialState = () => ({
    route: "overview", agentOnline: true, mandates: [],
    approvals: [], activity: [],
    fairParticipants: clone(D.fairShare.participants || ["Alice", "Bob", "Charlie", "Dave"]),
    fairItems: clone(D.fairShare.items), fairContext: D.fairShare.context,
    fairReceiptName: "", activityFilter: "all", approvalFilter: "all", mandateFilter: "all",
    procurement: { invoiceRef: "", poRef: "", invoiceLine: "", poLine: "", invoiceQty: "", poQty: "", invoiceTotal: "", poTotal: "", checked: false, approved: false },
    cfo: { messages: [], invoices: [], reconcile: null },
    inventory: { item: "", stock: "", threshold: "", supplierA: "", supplierADays: "", supplierB: "", supplierBDays: "", evaluated: false, approved: false },
    triage: { queue: [], billingTarget: "Patient" },
    escrow: { milestone: "", criteria: "", evidence: "", verified: false, humanApproved: false }
  });
  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(D.storageKey) || "null");
      if (!stored || typeof stored !== "object") return initialState();
      const cleanedMandates = (stored.mandates || []).filter((m) => !["mdt-7749", "mdt-9122", "mdt-4431"].includes(m.id));
      const cleanedApprovals = (stored.approvals || []).filter((a) => !["runpod-gpu", "figma-enterprise", "overseas-registrar"].includes(a.id));
      const cleanedActivity = (stored.activity || []).filter((act) => !["aws-scale", "design-assets", "gpu-cluster", "unverified-merchant"].includes(act.id));
      const participants = Array.isArray(stored.fairParticipants) && stored.fairParticipants.length >= 2 ? stored.fairParticipants : clone(D.fairShare.participants || ["Alice", "Bob", "Charlie", "Dave"]);
      return { ...initialState(), ...stored, fairParticipants: participants, mandates: cleanedMandates, approvals: cleanedApprovals, activity: cleanedActivity };
    } catch (_) { return initialState(); }
  }
  let state = loadState();
  const routeFromHash = window.location.hash.replace(/^#/, "");
  if (ROUTES.includes(routeFromHash)) state.route = routeFromHash;
  let toastTimer = 0;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
  const money = (value, digits = 2) => "$" + Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const wholeMoney = (value) => "$" + Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
  const pct = (value, max) => max > 0 ? Math.min(100, Math.max(0, (Number(value) / Number(max)) * 100)) : 0;
  const app = () => $("#app");
  function persist() {
    try { localStorage.setItem(D.storageKey, JSON.stringify(state)); } catch (_) { /* The in-memory demo still works when storage is unavailable. */ }
    syncChrome();
  }
  function toast(message) {
    const node = $("#toast");
    node.textContent = message;
    node.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("visible"), 2600);
  }
  function navigate(route) {
    if (!ROUTES.includes(route)) route = "overview";
    state.route = route;
    history.replaceState(null, "", "#" + route);
    $("#sidebar").classList.remove("open");
    $("#mobile-menu-button").setAttribute("aria-expanded", "false");
    $("#mobile-more-panel").hidden = true;
    $("#mobile-more").setAttribute("aria-expanded", "false");
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function pageHeader(title, subtitle, eyebrow = "Agent finance control room", actions = "") {
    return `<div class="page-header"><div class="page-title-wrap"><div class="eyebrow"><span class="eyebrow-dot"></span>${esc(eyebrow)}</div><h1>${esc(title)}</h1><p class="page-subtitle">${esc(subtitle)}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</div>`;
  }
  function syncChrome() {
    const pending = state.approvals.filter((item) => item.status === "pending").length;
    const mandateCount = state.mandates.length;
    $$(".nav-link").forEach((node) => node.classList.toggle("active", node.dataset.route === state.route));
    $$(".mobile-nav [data-route]").forEach((node) => node.classList.toggle("active", node.dataset.route === state.route));
    const badge = $(".nav-count.attention");
    if (badge) {
      badge.textContent = String(pending);
      badge.style.display = pending > 0 ? "inline-block" : "none";
    }
    const mandateBadge = $('[data-route="mandates"] .nav-count');
    if (mandateBadge) {
      mandateBadge.textContent = String(mandateCount);
    }
  }
  function render() {
    const views = {
      overview: renderOverview, mandates: renderMandates, approvals: renderApprovals,
      fairshare: renderFairShare, disputes: renderDisputes, procurement: renderProcurement,
      cfo: renderCfo, inventory: renderInventory, triage: renderTriage, escrow: renderEscrow
    };
    app().innerHTML = (views[state.route] || renderOverview)();
    if (state.route === "cfo") {
      const invoiceForm = state.cfo?.form || {};
      const fxForm = state.cfo?.reconcileInput || {};
      $("#cfo-client").value = invoiceForm.client || "";
      $("#cfo-amount").value = invoiceForm.amount || "";
      $("#cfo-currency").value = invoiceForm.currency || "USD";
      $("#reconcile-amount").value = fxForm.amount || "";
      $("#reconcile-rate").value = fxForm.rate || "";
      $("#reconcile-from").value = fxForm.from || "EUR";
      $("#reconcile-to").value = fxForm.to || "USD";
    }
    syncChrome();
  }
  function metric(label, value, note, icon, color = "", track = null) {
    return `<article class="metric-card"><div class="metric-head"><span>${label}</span><span class="metric-icon ${color}">${icon}</span></div><div><strong class="metric-value ${String(value).includes("$") ? "money" : ""}">${value}</strong><div class="metric-note">${note}</div>${track !== null ? `<div class="metric-track"><span style="width:${track}%"></span></div>` : ""}</div></article>`;
  }
  function activityRows(filter = "all") {
    const list = state.activity || [];
    const filtered = list.filter((item) => filter === "all" || item.status === filter);
    if (!filtered.length) {
      return `<div class="empty-state" style="padding:28px 16px; text-align:center"><span class="empty-symbol" style="font-size:24px; display:block; margin-bottom:8px">⌕</span><strong>No payment activity yet</strong><p style="font-size:12px; color:var(--muted); margin-top:4px">Payments approved, evaluated via firewall, or settled through PayPal Sandbox will appear here.</p></div>`;
    }
    return filtered.map((item) => `
      <div class="activity-row"><span class="activity-icon ${item.status === "review" ? "review" : item.status === "blocked" ? "blocked" : ""}">${item.status === "approved" ? "✓" : item.status === "blocked" ? "×" : "!"}</span>
        <div class="activity-main"><strong>${esc(item.title)}</strong><small>${esc(item.merchant)} · ${esc(item.agent)}</small></div>
        <div class="activity-meta"><span class="activity-amount">${money(item.amount)}</span><span class="status-pill ${item.status}">${item.status === "review" ? "Escalated" : item.status}</span></div>
      </div>`).join("");
  }
  function moduleCards() {
    const icons = { firewall: ["⬡", ""], disputes: ["↗", "indigo"], procurement: ["▤", "green"], cfo: ["◌", "indigo"], fairshare: ["⇄", "green"], inventory: ["▦", "amber"], triage: ["＋", "red"], escrow: ["◇", "indigo"] };
    return D.concepts.map((item) => {
      const [symbol, color] = icons[item.id] || ["·", ""];
      const route = ROUTE_FOR_CONCEPT[item.id] || item.id;
      return `<button class="module-card" data-route="${route}" type="button"><span class="module-icon ${color}">${symbol}</span><strong>${esc(item.label)}</strong><p>${esc(item.description)}</p><span class="module-group">${esc(item.group)}</span></button>`;
    }).join("");
  }
  function renderOverview() {
    const budgetPool = state.mandates.reduce((sum, m) => sum + (Number(m.limit) || 0), 0);
    const committed = state.mandates.reduce((sum, m) => sum + (Number(m.spent) || 0), 0);
    const budgetLeft = Math.max(0, budgetPool - committed);
    const committedPct = budgetPool > 0 ? pct(committed, budgetPool).toFixed(1) : "0.0";
    const pending = state.approvals.filter((item) => item.status === "pending").length;
    const activity = state.activity || [];
    const railsToday = activity.filter((a) => a.status === "approved").length;
    const paymentsToday = activity.filter((a) => a.status === "approved").reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const blockedCount = activity.filter((a) => a.status === "blocked").length;
    const protectedTotal = activity.filter((a) => a.status === "blocked").reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const autoApprovedPayments = activity.filter((a) => a.decision && a.decision.includes("Auto")).length;
    const autoApprovalRate = (railsToday + blockedCount) > 0 ? Math.round((railsToday / (railsToday + blockedCount)) * 100) : 100;
    const latency = activity.length > 0 ? "0.18s" : "0.00s";

    return `${pageHeader("Command center", "A clear view of what your agents can spend, what the policy layer stopped, and what needs a human decision.", "Autonomous finance · sandbox")}
      <div class="trust-banner"><span class="trust-icon">✓</span><div class="trust-copy"><strong>Autonomous guardrails active</strong><span>Each proposed payment is checked against its mandate before the simulated PayPal settlement step.</span></div><span class="status-pill approved">Policy layer on</span></div>
      <section class="hero-panel"><div class="hero-copy"><div class="eyebrow">Scoped authority, visible by design</div><h2>Every agent move stays inside its mandate.</h2><p>Review budget boundaries, inspect exceptions, and let the policy layer make only the decisions your team has explicitly allowed.</p><div class="page-actions"><button class="btn btn-primary" data-route="${pending > 0 ? 'approvals' : 'mandates'}" type="button">${pending > 0 ? `Review ${pending} pending approvals →` : '＋ Create first mandate'}</button><button class="btn btn-secondary" data-action="open-mandate" type="button">＋ Create mandate</button></div></div><div class="hero-visual"><div class="hero-visual-top"><span>Daily vault limit velocity</span><strong>PayPal settlement rail · sandbox</strong></div><div class="hero-visual-bottom"><div><strong>${money(committed)}</strong><span> committed of ${wholeMoney(budgetPool)} pool</span></div><span class="status-pill ${committedPct > 90 ? 'blocked' : 'approved'}">${budgetPool > 0 ? 'Within policy' : 'No active pool'}</span></div><div class="flow-track"><span style="width:${committedPct}%"></span></div><div class="hero-visual-top"><span>Payment request → policy → human review → settlement</span><span>${latency}</span></div></div></section>
      <section class="metric-grid" aria-label="Command-center metrics">
        ${metric("Budget left", wholeMoney(budgetLeft), `of ${wholeMoney(budgetPool)} pool · ${committedPct}% committed`, "◈", "", committedPct)}
        ${metric("Today's rails", String(railsToday), `<strong>+${railsToday}</strong> · ${money(paymentsToday)} via PayPal`, "↗", "green")}
        ${metric("Guardrails", String(blockedCount), `<strong>${wholeMoney(protectedTotal)}</strong> protected by policy`, "⬡", "red")}
        ${metric("Pending review", String(pending), pending > 0 ? "Human sign-off required" : "Queue all clear", "!", pending > 0 ? "amber" : "")}
      </section>
      <div class="overview-grid">
        <section class="card overview-pipeline"><div class="card-heading"><div><span class="card-kicker">Policy telemetry</span><h2 style="margin-top:5px">Settlement pipeline</h2><p>Live telemetry reflecting your configured mandates and payments.</p></div><span class="status-pill approved">Active</span></div><div class="policy-list"><div class="policy-row"><span class="policy-icon">↗</span><div><strong>Auto-approved</strong><small>Payments passed under policy caps</small></div><span class="policy-value">${autoApprovedPayments}</span></div><div class="policy-row"><span class="policy-icon">⏱</span><div><strong>Median decision latency</strong><small>Policy execution time</small></div><span class="policy-value">${latency}</span></div><div class="policy-row"><span class="policy-icon">⬡</span><div><strong>Policy-protected</strong><small>Blocked transactions protected</small></div><span class="policy-value">${wholeMoney(protectedTotal)}</span></div></div><div class="ring-row"><span class="ring" aria-label="${autoApprovalRate} percent"></span><div class="ring-copy"><strong>${autoApprovalRate}% auto-settlement rate</strong><span>Real-time calculation from your transactions</span></div></div></section>
        <section class="overview-workflows"><div class="section-row"><div><h2>Agent workflows</h2><p>Open a module to explore its guarded flow.</p></div><span class="sandbox-tag">8 concepts · active</span></div><div class="module-grid">${moduleCards()}</div></section>
        <section class="card overview-activity"><div class="card-heading"><div><span class="card-kicker">Decision ledger</span><h2 style="margin-top:5px">Recent payment activity</h2><p>Live transaction ledger for your autonomous agents.</p></div><div class="segmented" role="group" aria-label="Filter activity"><button data-activity-filter="all" class="${state.activityFilter === "all" ? "active" : ""}" type="button">All</button><button data-activity-filter="approved" class="${state.activityFilter === "approved" ? "active" : ""}" type="button">Allowed</button><button data-activity-filter="review" class="${state.activityFilter === "review" ? "active" : ""}" type="button">Review</button><button data-activity-filter="blocked" class="${state.activityFilter === "blocked" ? "active" : ""}" type="button">Blocked</button></div></div><div class="activity-list">${activityRows(state.activityFilter)}</div></section>
        <aside class="card overview-authority"><div class="card-heading"><div><span class="card-kicker">Authority boundary</span><h2 style="margin-top:5px">Policy before payment</h2><p>Mandates define what the agent may propose.</p></div><span class="metric-icon">⬡</span></div><div class="workflow-step"><span class="step-number">1</span><div><strong>Scoped mandate</strong><small>Budget, merchant allowlist, per-transaction ceiling, expiry.</small></div></div><div class="workflow-step"><span class="step-number">2</span><div><strong>Approve · block · escalate</strong><small>Policy evaluates each payment before a person or rule permits the next step.</small></div></div><div class="workflow-step"><span class="step-number">3</span><div><strong>PayPal rail</strong><small>Orders and captures dispatched via PayPal Sandbox SDK.</small></div></div></aside>
      </div>`;
  }
  function renderMandates() {
    const actions = `<button class="btn btn-primary" data-action="open-mandate" type="button">＋ New mandate</button>`;
    const filter = state.mandateFilter || "all";
    const totalCount = state.mandates.length;
    const highCount = state.mandates.filter((item) => pct(item.spent, item.limit) >= 80).length;
    const autoCount = state.mandates.filter((item) => item.humanApprovalAbove == null).length;
    const list = state.mandates.filter((item) => filter === "all" || (filter === "high" && pct(item.spent, item.limit) >= 80) || (filter === "auto" && item.humanApprovalAbove == null));
    const cards = list.map((item) => {
      const usage = pct(item.spent, item.limit);
      const threshold = item.humanApprovalAbove == null ? "All within cap" : `Above ${money(item.humanApprovalAbove)}`;
      const hasHumanThreshold = item.humanApprovalAbove != null;
      return `<article class="card mandate-card"><div class="mandate-title"><span class="mandate-symbol">⬡</span><div><h2>${esc(item.name)}</h2><p>ID: ${esc(item.id)} · ${esc(item.description || "Scoped spend mandate")}</p></div><span class="status-pill ${item.status === "active" ? "approved" : "blocked"}">${esc(item.status)}</span></div><div class="utilization-block"><div class="utilization-top"><div><small>Monthly spend cap</small><div><strong>${wholeMoney(item.spent)} <span>/ ${wholeMoney(item.limit)}</span></strong></div></div><span class="tag">${usage.toFixed(0)}%</span></div><div class="utilization-track ${usage >= 80 ? "warning" : ""}"><span style="width:${usage}%"></span></div><div class="utilization-foot"><span>${wholeMoney(Math.max(0, item.limit - item.spent))} runway left</span><span>${esc(item.reset || "Monthly cycle")}</span></div></div><div class="mandate-specs"><div class="spec-box"><small>Per-transaction cap</small><strong>${money(item.perTransaction)}</strong></div><div class="spec-box"><small>Human approval</small><strong>${esc(threshold)}</strong></div></div><div><span class="card-kicker">Authorized merchants</span><div class="merchant-list" style="margin-top:7px">${(item.merchants || []).map((merchant) => `<span class="merchant-chip">${esc(merchant)}</span>`).join("")}</div>${item.categories?.length ? `<span class="card-kicker" style="display:block;margin-top:10px">Authorized categories</span><div class="merchant-list" style="margin-top:7px">${item.categories.map((category) => `<span class="merchant-chip">${esc(category)}</span>`).join("")}</div>` : ""}</div><div class="mandate-bottom"><div><small>${hasHumanThreshold ? "Escalates above the human-review threshold" : "Auto-approves within the scoped caps"}</small><small>${item.expiry ? `Expires ${esc(item.expiry)}` : "No expiry set"}</small>${item.fundingSource ? `<small>Funding · ${esc(item.fundingSource)}</small>` : ""}</div><div style="display:flex; gap:8px"><button class="btn btn-secondary btn-sm" data-action="simulate-mandate-payment" data-id="${esc(item.id)}" type="button" title="Simulate agent spending under this mandate">Test payment</button><button class="link-button" data-action="toggle-mandate" data-id="${esc(item.id)}" type="button">${item.status === "active" ? "Pause" : "Resume"}</button></div></div></article>`;
    }).join("");

    return `${pageHeader("Agent spend firewall", "Give each agent a bounded mandate: amount, merchant, review threshold, and expiry—all checked before a payment reaches the PayPal rail.", "Guardrails · scoped authority", actions)}
      <div class="trust-banner"><span class="trust-icon">✓</span><div class="trust-copy"><strong>${totalCount} active agent mandate${totalCount === 1 ? "" : "s"} configured</strong><span>${totalCount > 0 ? "Every agent spend proposal is checked against its mandate before PayPal settlement." : "No mandates configured yet. Create a mandate to establish scoped authority for an agent."}</span></div><span class="status-pill approved">Policy active</span></div>
      <div class="filter-row" role="group" aria-label="Filter mandates"><button class="filter-chip ${filter === "all" ? "active" : ""}" data-mandate-filter="all" type="button">All active (${totalCount})</button><button class="filter-chip ${filter === "high" ? "active" : ""}" data-mandate-filter="high" type="button">High utilization (${highCount})</button><button class="filter-chip ${filter === "auto" ? "active" : ""}" data-mandate-filter="auto" type="button">Auto-approving (${autoCount})</button></div>
      <div class="mandate-grid">${cards || `<div class="card empty-state" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center;"><span class="empty-symbol" style="font-size:36px; display:block; margin-bottom:12px; color:var(--blue)">⬡</span><h3 style="font-size:19px; margin-bottom:8px">No spend mandates created yet</h3><p style="color:var(--muted); max-width:500px; margin:0 auto 22px; font-size:13px; line-height:1.6">Protect your wallet before letting autonomous agents run. Click the button below to define budget caps, allowed merchants, and approval rules.</p><button class="btn btn-primary" data-action="open-mandate" type="button" style="padding:0 20px; font-size:13px">＋ Create your first mandate</button></div>`}</div>
      <section class="card" style="margin-top:15px"><div class="card-heading"><div><span class="card-kicker">How the firewall decides</span><h2 style="margin-top:5px">A predictable policy path</h2><p>Merchant scope, budget headroom, transaction cap, and expiry are evaluated together.</p></div><span class="sandbox-tag">PayPal Sandbox Integrated</span></div><div class="evidence-grid"><div class="evidence-tile"><strong>Within mandate</strong><small>Eligible for auto-approval only when merchant, cap, budget, and expiry all match.</small></div><div class="evidence-tile"><strong>Outside the boundary</strong><small>Blocked for hard policy violations or escalated when the mandate requires a human decision.</small></div></div></section>`;
  }
  function renderApprovals() {
    const filter = state.approvalFilter || "all";
    const all = state.approvals;
    const filtered = all.filter((item) => filter === "all" || (filter === "high-risk" && item.category === "high-risk") || (filter === "cap-exceeded" && item.category === "cap-exceeded"));
    const pending = all.filter((item) => item.status === "pending").length;
    const highRiskCount = all.filter((item) => item.category === "high-risk").length;
    const capExceededCount = all.filter((item) => item.category === "cap-exceeded").length;
    const cards = filtered.map((item) => {
      const done = item.status !== "pending";
      return `<article class="approval-card" data-approval-id="${esc(item.id)}"><div class="approval-main"><div class="approval-title"><div class="approval-merchant"><span class="activity-icon ${item.risk >= 80 ? "blocked" : "review"}">${item.risk >= 80 ? "!" : "↗"}</span><div><strong>${esc(item.merchant)}</strong><small>${esc(item.agent)}</small></div></div><div class="approval-amount"><strong>${money(item.amount)}</strong><small>USD</small></div></div><div class="approval-signals"><span class="status-pill ${item.risk >= 80 ? "blocked" : "review"}">Risk ${item.risk}/100</span><span class="tag">${esc(item.signal)}</span><span class="tag">${esc(item.breach)}</span></div><div class="approval-detail"><div class="approval-detail-top"><span>Autonomous policy detail</span><span>${done ? `<span class="status-pill ${item.status === "approved" ? "approved" : "blocked"}">${item.status === "approved" ? "Approved in sandbox" : "Denied in sandbox"}</span>` : "Human decision required"}</span></div><p>${esc(item.detail)}</p><div class="approval-foot"><span>${esc(item.funding)}${item.available ? ` · Available: ${money(item.available)}` : ""}</span><span>${item.evidence ? esc(item.evidence) : item.netSavings ? `Net savings ${esc(item.netSavings)}` : "Policy check"}</span></div></div></div><div class="approval-actions">${done ? `<span class="status-pill ${item.status === "approved" ? "approved" : "blocked"}">${item.status === "approved" ? "Approved" : "Denied"}</span><button class="btn btn-secondary btn-sm" data-action="undo-approval" data-id="${esc(item.id)}" type="button">Undo decision</button>` : `<button class="btn btn-secondary btn-sm" data-action="simulate-deny" data-id="${esc(item.id)}" type="button">Deny</button><button class="btn btn-primary btn-sm" data-action="simulate-approve" data-id="${esc(item.id)}" type="button">Approve</button><button class="btn-paypal" data-action="pay-with-paypal" data-id="${esc(item.id)}" type="button" title="Execute PayPal Sandbox Payment"><span class="pp-badge">Pay</span> with PayPal</button>`}</div></article>`;
    }).join("");
    return `${pageHeader("Approvals queue", `${pending} escalated transaction${pending === 1 ? "" : "s"} requiring human sign-off before the PayPal execution step.`, "Human-in-the-loop · policy exceptions")}
      <div class="trust-banner"><span class="trust-icon">!</span><div class="trust-copy"><strong>Review the exception. Keep the rail moving.</strong><span>Approving or executing below settles transactions securely through your PayPal sandbox environment.</span></div><span class="sandbox-tag">PayPal Sandbox</span></div>
      <div class="filter-row" role="group" aria-label="Filter approvals"><button class="filter-chip ${filter === "all" ? "active" : ""}" data-approval-filter="all" type="button">All (${all.length})</button><button class="filter-chip ${filter === "high-risk" ? "active" : ""}" data-approval-filter="high-risk" type="button">High risk (${highRiskCount})</button><button class="filter-chip ${filter === "cap-exceeded" ? "active" : ""}" data-approval-filter="cap-exceeded" type="button">Cap exceeded (${capExceededCount})</button></div>
      <section class="card"><div class="card-heading"><div><span class="card-kicker">Policy escalation queue</span><h2 style="margin-top:5px">${pending} awaiting human review</h2><p>Payments exceeding agent thresholds are held until you confirm or deny.</p></div><span class="status-pill ${pending > 0 ? 'review' : 'approved'}">${pending > 0 ? 'PayPal step held' : 'Queue clear'}</span></div><div>${cards || `<div class="empty-state" style="padding:48px 24px; text-align:center"><span class="empty-symbol" style="font-size:34px; display:block; margin-bottom:12px; color:var(--green)">✓</span><h3 style="font-size:18px; margin-bottom:8px">Approvals queue is clear</h3><p style="color:var(--muted); max-width:440px; margin:0 auto; font-size:13px; line-height:1.6">No payments currently awaiting human policy review. When an agent requests a payment exceeding its review threshold, it will appear here.</p></div>`}</div></section>`;
  }
  function fairTotals() {
    const participants = state.fairParticipants || D.fairShare.participants;
    const rows = participants.map((name) => ({ name, share: 0, paid: 0, net: 0 }));
    let total = 0;
    let unallocated = 0;
    state.fairItems.forEach((item) => {
      const cents = Math.max(0, Math.round((Number.parseFloat(item.amount) || 0) * 100));
      if (!cents) return;
      total += cents;
      const included = participants.filter((name) => (item.included || []).includes(name));
      if (!included.length) { unallocated += cents; return; }
      const base = Math.floor(cents / included.length);
      const remainder = cents % included.length;
      included.forEach((name, index) => {
        const row = rows.find((entry) => entry.name === name);
        if (row) row.share += base + (index < remainder ? 1 : 0);
      });
      const payer = rows.find((entry) => entry.name === item.paidBy);
      if (payer) payer.paid += cents;
    });
    rows.forEach((row) => { row.net = row.share - row.paid; });
    return { rows, total, unallocated };
  }
  function fairSummaryHtml() {
    const { rows, total, unallocated } = fairTotals();
    if (!total) return `<div class="empty-state"><span class="empty-symbol">⇄</span><strong>Add item amounts to calculate</strong><p>Participation is set per line, so excluded items do not affect that person's share.</p></div>`;
    const owes = rows.filter((row) => row.net > 0);
    const allocationWarning = unallocated ? `<div class="trust-banner" style="margin-bottom:10px" role="alert"><span class="trust-icon">!</span><div class="trust-copy"><strong>${money(unallocated / 100)} unallocated</strong><span>Assign at least one person to every priced line before preparing request previews.</span></div></div>` : "";
    return `${allocationWarning}<div class="share-result">${rows.map((row) => `<div class="share-person"><span><strong>${esc(row.name)}</strong><small>Fair share ${money(row.share / 100)} · paid ${money(row.paid / 100)}</small></span><strong>${row.net > 0 ? `Owes ${money(row.net / 100)}` : row.net < 0 ? `Receives ${money(Math.abs(row.net) / 100)}` : unallocated ? "Pending allocation" : "Settled"}</strong></div>`).join("")}<div class="preview-token"><span>Group total · ${money(total / 100)}</span><span>Rounded to cents</span></div>${owes.map((row) => `<div class="preview-token"><span>PayPal request preview · ${esc(row.name)} · ${money(row.net / 100)} · DEMO ONLY</span><button class="link-button" data-action="copy-fair-preview" data-person="${esc(row.name)}" data-amount="${row.net}" type="button">Copy preview</button></div>`).join("")}</div>`;
  }
  function renderFairShare() {
    const participants = state.fairParticipants || D.fairShare.participants;
    const friendTags = participants.map((name) => `
      <span class="friend-tag">
        <span class="friend-avatar">${esc(name.charAt(0).toUpperCase())}</span>
        <span>${esc(name)}</span>
        ${participants.length > 2 ? `<button class="friend-remove-btn" data-action="remove-fair-friend" data-name="${esc(name)}" type="button" title="Remove ${esc(name)}">×</button>` : ""}
      </span>`).join("");

    const items = state.fairItems.map((item, index) => `
      <div class="split-item">
        <div>
          <label class="field-label" for="fair-name-${index}">Line item</label>
          <input id="fair-name-${index}" type="text" value="${esc(item.name)}" data-fair-name="${index}" aria-label="Line item name">
        </div>
        <div>
          <label class="field-label" for="fair-amount-${index}">Amount · USD</label>
          <input id="fair-amount-${index}" type="number" min="0" step="0.01" placeholder="0.00" value="${esc(item.amount)}" data-fair-amount="${index}" aria-label="${esc(item.name)} amount">
        </div>
        <div class="participants-cell">
          <span class="field-label">Split this item with</span>
          <div class="participant-picks">
            ${participants.map((person) => `<label class="person-chip"><input type="checkbox" data-fair-person="${esc(person)}" data-fair-index="${index}" ${(item.included || []).includes(person) ? "checked" : ""}>${esc(person)}</label>`).join("")}
          </div>
        </div>
        <div>
          <label class="field-label" for="fair-payer-${index}">Already paid by</label>
          <select id="fair-payer-${index}" data-fair-payer="${index}">
            <option value="">Not paid yet</option>
            ${participants.map((person) => `<option value="${esc(person)}" ${item.paidBy === person ? "selected" : ""}>${esc(person)}</option>`).join("")}
          </select>
        </div>
        <div class="split-item-actions">
          <button class="split-item-delete" data-action="delete-fair-item" data-index="${index}" type="button" title="Delete this line">×</button>
        </div>
      </div>`).join("");

    return `${pageHeader("FairShare", "Turn itemized group receipts into fair individual balances—then preview a PayPal request for each person. Add any friends, trip members, or roommates.", "Group expenses · transparent math", `<button class="btn btn-secondary" data-action="fair-add-item" type="button">＋ Add item</button>`)}
      <div class="trust-banner"><span class="trust-icon">⇄</span><div class="trust-copy"><strong>Receipt → item-level split → individual request preview</strong><span>OCR and payment links are represented as a live sandbox demo; add as many friends as you want.</span></div><span class="sandbox-tag">FairShare Sandbox</span></div>
      
      <div class="card" style="margin-bottom:15px">
        <div class="card-heading">
          <div>
            <span class="card-kicker">Group participants (${participants.length} members)</span>
            <h2 style="margin-top:5px">Who is in this split group?</h2>
            <p>Add custom friends, roommates, or trip companions. You are not limited to 3 people!</p>
          </div>
          <span class="tag">${participants.length} Active Friends</span>
        </div>
        <div class="friends-bar">
          <div class="friends-list">
            ${friendTags}
          </div>
          <form class="add-friend-form" id="add-friend-form" onsubmit="return false;">
            <input type="text" id="new-friend-input" placeholder="New friend's name..." maxlength="30" aria-label="Add friend name">
            <button class="btn btn-primary btn-sm" data-action="add-fair-friend" type="button">＋ Add friend</button>
          </form>
        </div>
      </div>

      <div class="split-layout"><div class="stack"><section class="card"><div class="card-heading"><div><span class="card-kicker">1 · Receipt input</span><h2 style="margin-top:5px">Add a group bill</h2><p>Select a receipt image or PDF; this demo displays the filename only.</p></div><span class="tag">OCR preview</span></div><label class="file-drop"><span class="module-icon green">▤</span><strong>${state.fairReceiptName ? esc(state.fairReceiptName) : "Choose a receipt or itemized bill"}</strong><small>Image or PDF · demo does not upload or run OCR</small><input type="file" accept="image/*,.pdf" id="fair-receipt"></label></section>
        <section class="card"><div class="card-heading"><div><span class="card-kicker">2 · Itemize and allocate</span><h2 style="margin-top:5px">Who shares each line?</h2><p>Enter amounts, check off which friends share each item, and mark who paid.</p></div><span class="tag">${state.fairItems.length} items</span></div><div class="split-items">${items || `<div class="empty-state"><span class="empty-symbol">▤</span><strong>No items added yet</strong><p>Click "Add item" to record items from your bill.</p></div>`}</div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn btn-secondary btn-sm" data-action="fair-add-item" type="button">＋ Add another line</button></div></section>
        <section class="card"><div class="card-heading"><div><span class="card-kicker">3 · Natural-language context &amp; smart allocations</span><h2 style="margin-top:5px">Keep the real-world details visible</h2><p>Write what happened in plain English (e.g. who skipped drinks, who paid for what). Click "Auto-apply note" to automatically check/uncheck lines!</p></div><button class="btn btn-secondary btn-sm" data-action="apply-fair-note" type="button" title="Auto-adjust line items from note">⚡ Auto-apply note</button></div><div class="form-field"><label for="fair-context">Group note</label><textarea id="fair-context" data-fair-context>${esc(state.fairContext)}</textarea><span class="form-hint">Tip: Mention any friend currently in the roster. Example: "Alice did not drink alcohol, Bob left early, and Charlie covered the car rental deposit."</span></div></section>
      </div><aside class="stack"><section class="card"><div class="card-heading"><div><span class="card-kicker">Fair split</span><h2 style="margin-top:5px">Individual balances</h2><p>Integer-cent allocation; leftover cents go to the first included participants in the displayed order.</p></div></div><div id="fair-summary">${fairSummaryHtml()}</div></section><section class="card"><div class="card-heading"><div><span class="card-kicker">PayPal request previews</span><h2 style="margin-top:5px">Ready for human review</h2><p>Net balances update dynamically as you add friends or edit the bill.</p></div><span class="status-pill review">Ready to dispatch</span></div><div class="demo-note"><span>ⓘ</span><div><strong>Live PayPal Sandbox Request</strong>Click below to generate individual PayPal request links for everyone who owes money.</div></div><button class="btn btn-primary" style="width:100%;margin-top:12px" data-action="prepare-fair-requests" type="button">Prepare request previews</button></section></aside></div>`;
  }
  function renderDisputes() {
    const c = state.dispute || (state.dispute = { transactionRef: "", shippingEvidence: "", draft: "" });
    const draft = c.draft || "Your draft will appear here after you enter a transaction reference and shipping evidence, then prepare a response.";
    return `${pageHeader("Autonomous dispute resolver", "Bring transaction history and shipping evidence together, prepare a response draft, and surface the supplied demo win estimate for merchant review.", "Merchant protection · evidence-first")}
      <div class="trust-banner"><span class="trust-icon">↗</span><div class="trust-copy"><strong>1 active case · 88% estimated recovery win rate</strong><span>Estimate retained from the supplied command-center screen; it is not a live model prediction.</span></div><span class="sandbox-tag">Review required</span></div>
      <div class="workflow-layout"><div class="stack"><section class="card"><div class="card-heading"><div><span class="card-kicker">Evidence intake</span><h2 style="margin-top:5px">Assemble the case record</h2><p>Enter or attach the evidence that supports the merchant's response.</p></div><span class="tag">No PSP connection</span></div><div class="form-grid"><div class="form-field full"><label for="dispute-ref">Transaction reference</label><input id="dispute-ref" type="text" data-dispute-field="transactionRef" value="${esc(c.transactionRef)}" placeholder="Enter the transaction ID or order reference"><span class="form-hint">Transaction history is not fetched in this front-end demo; add a reference to the response draft.</span></div><div class="form-field full"><label for="dispute-shipping">Shipping or delivery evidence</label><textarea id="dispute-shipping" data-dispute-field="shippingEvidence" placeholder="Add tracking, delivery confirmation, or other shipping evidence">${esc(c.shippingEvidence)}</textarea></div></div><div class="evidence-grid" style="margin-top:13px"><div class="evidence-tile"><strong>Transaction history</strong><small>${c.transactionRef ? `Reference supplied: ${esc(c.transactionRef)}` : "Waiting for a transaction or order reference."}</small></div><div class="evidence-tile"><strong>Shipping evidence</strong><small>${c.shippingEvidence ? "Merchant evidence entered for this local draft." : "Waiting for tracking or delivery details."}</small></div></div><div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn btn-primary" data-action="prepare-dispute" type="button">Prepare response draft</button></div></section>
        <section class="card"><div class="card-heading"><div><span class="card-kicker">Response draft</span><h2 style="margin-top:5px">Merchant-facing narrative</h2><p>Editable before any real submission; no dispute is sent from this demo.</p></div><span class="status-pill review">Human review</span></div><div class="form-field"><label for="dispute-draft">Draft response</label><textarea id="dispute-draft" data-dispute-draft>${esc(draft)}</textarea></div></section></div>
        <aside class="stack"><section class="card"><div class="card-heading"><div><span class="card-kicker">Case outlook</span><h2 style="margin-top:5px">Estimated recovery</h2><p>Source-screen demo metric.</p></div><span class="status-pill approved">88% estimate</span></div><div class="ring-row" style="border-top:0;margin-top:0;padding-top:0"><span class="ring" aria-label="88 percent demo estimate"></span><div class="ring-copy"><strong>1 active case</strong><span>Confidence indicator from the supplied screen, not a promise or a legal determination.</span></div></div><div class="demo-note" style="margin-top:14px"><span>ⓘ</span><div><strong>Evidence stays reviewable</strong>The agent concept drafts from transaction history and shipping evidence; a merchant must validate all facts.</div></div></section><section class="card"><div class="card-heading"><div><span class="card-kicker">Decision path</span><h2 style="margin-top:5px">Prepare, inspect, submit</h2></div></div><div class="workflow-step"><span class="step-number">1</span><div><strong>Retrieve records</strong><small>Transaction and fulfillment records would be connected by a real provider integration.</small></div></div><div class="workflow-step"><span class="step-number">2</span><div><strong>Draft the response</strong><small>Review the generated narrative against the attached evidence.</small></div></div><div class="workflow-step"><span class="step-number">3</span><div><strong>Merchant decides</strong><small>Submission is deliberately not wired to an external dispute system.</small></div></div></section></aside></div>`;
  }
  function renderProcurement() {
    const p = state.procurement;
    const hasTotals = p.invoiceTotal !== "" && p.poTotal !== "";
    const variance = hasTotals ? Math.round((Number(p.invoiceTotal) - Number(p.poTotal)) * 100) / 100 : 0;
    const hasRefs = Boolean(p.invoiceRef?.trim() && p.poRef?.trim());
    const hasLines = Boolean(p.invoiceLine?.trim() && p.poLine?.trim() && p.invoiceQty !== "" && p.poQty !== "");
    const lineMatch = hasLines && p.invoiceLine.trim().toLowerCase() === p.poLine.trim().toLowerCase() && Number(p.invoiceQty) === Number(p.poQty);
    const match = hasRefs && hasTotals && hasLines && lineMatch && Math.abs(variance) < 0.01;
    const result = !p.checked ? "Enter document references, at least one line item, quantities, and totals before comparison." : !hasRefs ? "Anomaly flagged: invoice or purchase-order reference is missing." : !hasLines ? "Anomaly flagged: line item descriptions or quantities are missing." : !lineMatch ? "Anomaly flagged: line item or quantity does not match the purchase order." : !hasTotals ? "Anomaly flagged: one or both document totals are missing." : Math.abs(variance) >= 0.01 ? "Anomaly flagged: invoice and purchase-order totals differ." : "Invoice references, line item, quantity, and total match. A human may approve this payout.";
    return `${pageHeader("Small-business procurement", "Read a supplier invoice, compare it with its purchase order, flag mismatches, and keep a human approval step before any payout.", "Supplier controls · human approval")}
      <div class="trust-banner"><span class="trust-icon">▤</span><div class="trust-copy"><strong>Invoice → PO match → anomaly review → human-approved payout</strong><span>Document parsing and PayPal Payouts are shown as a local front-end prototype only.</span></div><span class="sandbox-tag">No payout sent</span></div>
      <div class="workflow-layout"><div class="stack"><section class="card"><div class="card-heading"><div><span class="card-kicker">Document intake</span><h2 style="margin-top:5px">Supplier invoice and purchase order</h2><p>Choose documents or enter their references, line items, quantities, and totals.</p></div><span class="tag">OCR / matching preview</span></div><div class="evidence-grid"><label class="file-drop"><strong>${p.invoiceName ? esc(p.invoiceName) : "Supplier invoice"}</strong><small>PDF or image · local filename only</small><input id="supplier-invoice" data-procurement-file="invoiceName" type="file" accept="image/*,.pdf"></label><label class="file-drop"><strong>${p.poName ? esc(p.poName) : "Purchase order"}</strong><small>PDF or image · local filename only</small><input id="supplier-po" data-procurement-file="poName" type="file" accept="image/*,.pdf"></label></div><div class="form-grid" style="margin-top:14px"><div class="form-field"><label for="invoice-ref">Invoice reference</label><input id="invoice-ref" data-procurement-field="invoiceRef" value="${esc(p.invoiceRef)}" placeholder="Supplier invoice ID"></div><div class="form-field"><label for="po-ref">Purchase-order reference</label><input id="po-ref" data-procurement-field="poRef" value="${esc(p.poRef)}" placeholder="PO number"></div><div class="form-field"><label for="invoice-line">Invoice line description</label><input id="invoice-line" data-procurement-field="invoiceLine" value="${esc(p.invoiceLine)}" placeholder="Enter line item"></div><div class="form-field"><label for="po-line">PO line description</label><input id="po-line" data-procurement-field="poLine" value="${esc(p.poLine)}" placeholder="Enter matching PO item"></div><div class="form-field"><label for="invoice-qty">Invoice quantity</label><input id="invoice-qty" type="number" min="0" step="0.01" data-procurement-field="invoiceQty" value="${esc(p.invoiceQty)}" placeholder="0"></div><div class="form-field"><label for="po-qty">PO quantity</label><input id="po-qty" type="number" min="0" step="0.01" data-procurement-field="poQty" value="${esc(p.poQty)}" placeholder="0"></div><div class="form-field"><label for="invoice-total">Invoice total · USD</label><input id="invoice-total" type="number" min="0" step="0.01" data-procurement-field="invoiceTotal" value="${esc(p.invoiceTotal)}" placeholder="0.00"></div><div class="form-field"><label for="po-total">PO approved total · USD</label><input id="po-total" type="number" min="0" step="0.01" data-procurement-field="poTotal" value="${esc(p.poTotal)}" placeholder="0.00"></div></div><button class="btn btn-primary" style="margin-top:14px" data-action="compare-procurement" type="button">Compare invoice with PO</button></section>
        <section class="card"><div class="card-heading"><div><span class="card-kicker">Comparison result</span><h2 style="margin-top:5px">Automated anomaly scan</h2></div><span class="status-pill ${!p.checked ? "review" : match ? "approved" : "blocked"}">${!p.checked ? "Awaiting documents" : match ? "Match" : "Anomaly"}</span></div><p style="font-size:11px;line-height:1.5;color:var(--muted)">${esc(result)}</p>${p.checked && hasTotals ? `<div class="preview-token" style="margin-top:10px"><span>Invoice ${money(p.invoiceTotal)} · PO ${money(p.poTotal)}</span><strong>${variance === 0 ? "Variance $0.00" : `Variance ${money(variance)}`}</strong></div>` : ""}${p.checked && hasLines ? `<div class="preview-token" style="margin-top:8px"><span>${esc(p.invoiceLine)} · qty ${esc(p.invoiceQty)}</span><strong>${lineMatch ? "Line matched" : "Line mismatch"}</strong></div>` : ""}</section></div>
      <aside class="stack"><section class="card"><div class="card-heading"><div><span class="card-kicker">Human approval gate</span><h2 style="margin-top:5px">Payout authorization</h2><p>Mismatch or missing documents keep payment held.</p></div><span class="metric-icon green">✓</span></div><div class="workflow-step"><span class="step-number">1</span><div><strong>Review matched totals</strong><small>Supplier invoice must agree with the approved PO amount in this prototype.</small></div></div><div class="workflow-step"><span class="step-number">2</span><div><strong>Human sign-off</strong><small>Approval is available only after an exact match.</small></div></div><div class="workflow-step"><span class="step-number">3</span><div><strong>PayPal Payouts</strong><small>The payout action below is simulation-only.</small></div></div><div style="display:grid;gap:8px;margin-top:13px"><button class="btn btn-secondary" data-action="approve-procurement" type="button" ${!p.checked || !match || p.approved ? "disabled" : ""}>${p.approved ? "Human approval recorded (demo)" : "Approve matched invoice"}</button><button class="btn btn-primary" data-action="simulate-procurement-payout" type="button" ${!p.approved ? "disabled" : ""}>Simulate payout step</button></div><div class="demo-note" style="margin-top:12px"><span>ⓘ</span><div><strong>Not connected</strong>Documents, supplier identity, and funds remain untouched outside this page.</div></div></section></aside></div>`;
  }
  function renderCfo() {
    const c = state.cfo;
    const messages = c.messages.length ? c.messages.map((message) => `<div class="chat-bubble ${message.role === "user" ? "user" : ""}">${esc(message.text)}</div>`).join("") : `<div class="chat-bubble">I can help prepare an invoice, draft a late-payment follow-up, or reconcile amounts you enter. WhatsApp and voice delivery are not connected in this demo.</div>`;
    const invoices = c.invoices.length ? c.invoices.map((item, index) => `<div class="activity-row"><span class="activity-icon">＄</span><div class="activity-main"><strong>${esc(item.client || "Client")}</strong><small>${esc(item.currency)} invoice · ${esc(item.status || "Draft")}</small></div><div class="activity-meta"><span class="activity-amount">${money(item.amount)} ${esc(item.currency)}</span><button class="link-button" data-action="chase-invoice" data-index="${index}" type="button">Draft follow-up</button></div></div>`).join("") : `<div class="empty-state"><span class="empty-symbol">＄</span><strong>No invoice drafts yet</strong><p>Create a draft below; nothing is issued or sent.</p></div>`;
    const reconcile = c.reconcile;
    return `${pageHeader("Chat-based freelancer CFO", "Create invoice drafts, prepare late-payer follow-ups, and reconcile across currencies—with a chat interface designed for WhatsApp or voice workflows.", "Freelancer finance · conversational demo")}
      <div class="trust-banner"><span class="trust-icon">◌</span><div class="trust-copy"><strong>One finance assistant · three practical workflows</strong><span>Messaging, voice, invoice delivery, and live foreign-exchange services are not connected here.</span></div><span class="sandbox-tag">Local demo</span></div>
      <div class="chat-layout"><section class="card chat-panel"><div class="card-heading"><div><span class="card-kicker">Conversational workspace</span><h2 style="margin-top:5px">WhatsApp / voice-ready CFO</h2><p>Draft the next action before choosing a real channel.</p></div><span class="status-pill review">Not connected</span></div><div class="chat-messages" id="cfo-messages">${messages}</div><div class="chat-compose"><input id="cfo-chat-input" type="text" placeholder="Try: remind a client about a late invoice" aria-label="Message the CFO demo"><button class="btn btn-primary btn-sm" data-action="send-cfo" type="button">Send</button></div><div class="evidence-grid"><div class="evidence-tile"><strong>WhatsApp</strong><small>Provider not connected · no message sent.</small></div><div class="evidence-tile"><strong>Voice</strong><small>Microphone and calling are not enabled in this prototype.</small></div></div></section>
        <div class="stack"><section class="card"><div class="card-heading"><div><span class="card-kicker">Create receivable</span><h2 style="margin-top:5px">New invoice draft</h2><p>Enter a client and amount.</p></div></div><div class="form-grid"><div class="form-field full"><label for="cfo-client">Client name</label><input id="cfo-client" type="text" data-cfo-field="client" placeholder="Client or business"></div><div class="form-field"><label for="cfo-amount">Amount</label><input id="cfo-amount" type="number" min="0" step="0.01" data-cfo-field="amount" placeholder="0.00"></div><div class="form-field"><label for="cfo-currency">Currency</label><select id="cfo-currency" data-cfo-field="currency"><option>USD</option><option>EUR</option><option>GBP</option><option>CAD</option><option>AUD</option><option>INR</option></select></div></div><button class="btn btn-primary" style="margin-top:12px" data-action="create-invoice" type="button">Create local draft</button></section>
        <section class="card"><div class="card-heading"><div><span class="card-kicker">Receivables</span><h2 style="margin-top:5px">Invoice drafts &amp; follow-ups</h2></div><span class="tag">${c.invoices.length} drafts</span></div><div class="activity-list">${invoices}</div></section></div></div>
      <section class="card" style="margin-top:14px"><div class="card-heading"><div><span class="card-kicker">Cross-currency ledger</span><h2 style="margin-top:5px">Manual reconciliation preview</h2><p>Enter your own exchange rate; no rates are fetched.</p></div><span class="tag">No FX provider</span></div><div class="form-grid"><div class="form-field"><label for="reconcile-amount">Received amount</label><input id="reconcile-amount" type="number" min="0" step="0.01" data-reconcile="amount" placeholder="0.00"></div><div class="form-field"><label for="reconcile-from">Received currency</label><select id="reconcile-from" data-reconcile="from"><option>EUR</option><option>USD</option><option>GBP</option><option>CAD</option><option>AUD</option><option>INR</option></select></div><div class="form-field"><label for="reconcile-rate">Manual rate · target units per 1 source unit</label><input id="reconcile-rate" type="number" min="0" step="0.0001" data-reconcile="rate" placeholder="Enter a rate you have verified"></div><div class="form-field"><label for="reconcile-to">Target currency</label><select id="reconcile-to" data-reconcile="to"><option>USD</option><option>EUR</option><option>GBP</option><option>CAD</option><option>AUD</option><option>INR</option></select></div></div><div class="preview-token" id="reconcile-result" style="margin-top:12px">${reconcile ? `${money(reconcile.amount)} ${esc(reconcile.from)} × ${esc(reconcile.rate)} = ${money(reconcile.converted)} ${esc(reconcile.to)} · manual demo` : "Enter an amount and verified manual rate for a preview."}</div><button class="btn btn-secondary btn-sm" style="margin-top:11px" data-action="reconcile" type="button">Calculate preview</button></section>`;
  }
  function renderInventory() {
    const i = state.inventory;
    const hasStock = i.stock !== "" && i.threshold !== "";
    const low = hasStock && Number(i.stock) <= Number(i.threshold);
    const quotes = [
      { name: i.supplierA, price: Number(i.priceA), days: Number(i.daysA) },
      { name: i.supplierB, price: Number(i.priceB), days: Number(i.daysB) }
    ].filter((quote) => quote.name && Number.isFinite(quote.price) && quote.price >= 0 && Number.isFinite(quote.days) && quote.days >= 0).sort((a, b) => a.price - b.price || a.days - b.days);
    const best = quotes[0];
    return `${pageHeader("Autonomous inventory agent", "Represent the ESP32 stock trigger, compare supplier price and lead time, and require a mobile-friendly human approval before the PayPal Checkout step.", "Hardware triggers · restock control")}
      <div class="trust-banner"><span class="trust-icon">▦</span><div class="trust-copy"><strong>Sensor trigger → supplier comparison → human approval → checkout</strong><span>Sensor feeds, supplier catalogs, mobile approvals, and PayPal Checkout are not connected in this demo.</span></div><span class="sandbox-tag">Simulation</span></div>
      <div class="workflow-layout"><div class="stack"><section class="card"><div class="card-heading"><div><span class="card-kicker">Hardware trigger</span><h2 style="margin-top:5px">Stock threshold monitor</h2><p>Enter sample readings to explore the low-stock gate.</p></div><span class="status-pill review">ESP32 · awaiting data</span></div><div class="vitals-grid"><div class="vital-box"><small>Item / SKU</small><input class="inline-input" data-inventory-field="item" value="${esc(i.item)}" placeholder="Enter an inventory item"></div><div class="vital-box"><small>Current stock</small><input class="inline-input" type="number" min="0" data-inventory-field="stock" value="${esc(i.stock)}" placeholder="—"></div><div class="vital-box"><small>Reorder threshold</small><input class="inline-input" type="number" min="0" data-inventory-field="threshold" value="${esc(i.threshold)}" placeholder="—"></div></div><div style="display:flex;justify-content:flex-end;margin-top:13px"><button class="btn btn-secondary" data-action="evaluate-inventory" type="button">Evaluate restock trigger</button></div><div class="demo-note" style="margin-top:12px"><span>ⓘ</span><div><strong>${i.evaluated ? low ? "Low-stock trigger met" : "No restock trigger" : "Awaiting evaluation"}</strong>${i.evaluated ? low ? "Compare supplier offers before requesting a human approval." : "Current stock is above the entered threshold." : "No sensor reading is prefilled; enter test values to evaluate."}</div></div></section>
        <section class="card"><div class="card-heading"><div><span class="card-kicker">Supplier review</span><h2 style="margin-top:5px">Price and delivery comparison</h2><p>Enter quotes from sources you trust. Lowest price breaks ties by delivery time.</p></div><span class="tag">${quotes.length} quotes</span></div><div class="form-grid"><div class="form-field"><label for="supplier-a">Supplier A</label><input id="supplier-a" data-inventory-field="supplierA" value="${esc(i.supplierA)}" placeholder="Supplier name"></div><div class="form-field"><label for="price-a">Quote · USD</label><input id="price-a" data-inventory-field="priceA" type="number" min="0" step="0.01" value="${esc(i.priceA || "")}" placeholder="0.00"></div><div class="form-field"><label for="days-a">Delivery time · days</label><input id="days-a" data-inventory-field="daysA" type="number" min="0" step="1" value="${esc(i.daysA || "")}" placeholder="—"></div><div class="form-field"><label for="supplier-b">Supplier B</label><input id="supplier-b" data-inventory-field="supplierB" value="${esc(i.supplierB)}" placeholder="Supplier name"></div><div class="form-field"><label for="price-b">Quote · USD</label><input id="price-b" data-inventory-field="priceB" type="number" min="0" step="0.01" value="${esc(i.priceB || "")}" placeholder="0.00"></div><div class="form-field"><label for="days-b">Delivery time · days</label><input id="days-b" data-inventory-field="daysB" type="number" min="0" step="1" value="${esc(i.daysB || "")}" placeholder="—"></div></div><div class="preview-token" style="margin-top:12px">${best ? `Current best entered offer · ${esc(best.name)} · ${money(best.price)} · ${best.days} days` : "Enter supplier names, quotes, and delivery times to compare."}</div></section></div>
      <aside class="stack"><section class="card"><div class="card-heading"><div><span class="card-kicker">Human checkpoint</span><h2 style="margin-top:5px">Approve the restock</h2><p>The agent may prepare a recommendation, not commit spend.</p></div><span class="metric-icon amber">!</span></div><div class="workflow-step"><span class="step-number">1</span><div><strong>Detect stock depletion</strong><small>ESP32 signal is represented by the user-entered stock and threshold fields.</small></div></div><div class="workflow-step"><span class="step-number">2</span><div><strong>Compare supplier offers</strong><small>Only entered quotes participate; no catalog is fetched.</small></div></div><div class="workflow-step"><span class="step-number">3</span><div><strong>Human approval</strong><small>Approve the recommendation before the simulated Checkout action.</small></div></div><div style="display:grid;gap:8px;margin-top:14px"><button class="btn btn-secondary" data-action="approve-inventory" type="button" ${!i.evaluated || !low || !best || i.approved ? "disabled" : ""}>${i.approved ? "Approved in demo" : "Request human approval"}</button><button class="btn btn-primary" data-action="inventory-checkout" type="button" ${!i.approved ? "disabled" : ""}>Simulate PayPal Checkout</button></div><p class="form-hint" style="margin-top:10px">${!low ? "Enter a stock level at or below its threshold and evaluate the trigger." : !best ? "Enter at least one complete supplier offer." : "Checkout remains a non-payment demonstration."}</p></section></aside></div>`;
  }
  function renderTriage() {
    const t = state.triage;
    const queue = t.queue.map((item, index) => `<div class="activity-row"><span class="activity-icon review">${index + 1}</span><div class="activity-main"><strong>${esc(item.label)}</strong><small>Offline queue · awaiting clinician assessment · no vitals attached</small></div><div class="activity-meta"><span class="status-pill review">Needs clinician</span></div></div>`).join("");
    return `${pageHeader("AI triage & medical billing", "A front-end prototype for an offline-capable triage station, local queue, sensor-vital handoff, and invoice routing to a patient or insurer.", "Clinical workflow concept · offline-ready")}
      <div class="demo-note" style="margin-bottom:14px"><span>ⓘ</span><div><strong>Prototype safety</strong>Do not enter real patient or health information. This demo does not measure vitals, classify severity, give medical advice, or create a real bill.</div></div>
      <div class="workflow-layout"><div class="stack"><section class="card"><div class="card-heading"><div><span class="card-kicker">Offline-capable station</span><h2 style="margin-top:5px">Sensor handoff</h2><p>Local queue concept for offline operation; live device and sync are not connected.</p></div><span class="status-pill review">Awaiting sensor data</span></div><div class="vitals-grid"><div class="vital-box"><small>Pulse sensor</small><strong>—</strong><small>Not connected</small></div><div class="vital-box"><small>Motion / activity</small><strong>—</strong><small>Not connected</small></div><div class="vital-box"><small>Severity assessment</small><strong>Not run</strong><small>Clinician decision required</small></div></div><div class="form-grid" style="margin-top:14px"><div class="form-field"><label for="triage-label">Test-only queue label</label><input id="triage-label" data-triage-label placeholder="e.g., Test row 01"></div><div class="form-field"><label for="triage-target">Invoice recipient preview</label><select id="triage-target" data-triage-target><option ${t.billingTarget === "Patient" ? "selected" : ""}>Patient</option><option ${t.billingTarget === "Insurer" ? "selected" : ""}>Insurer</option></select></div></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn btn-secondary" data-action="add-triage-row" type="button">Add test queue row</button><button class="btn btn-primary" data-action="triage-invoice-preview" type="button" ${!t.queue.length ? "disabled" : ""}>Prepare invoice preview</button></div><div class="demo-note" style="margin-top:12px"><span>ⓘ</span><div><strong>PayPal Invoicing · preview only</strong>The concept routes a copay bill to a patient or insurer after clinician review; no bill is issued.</div></div></section>
        <section class="card"><div class="card-heading"><div><span class="card-kicker">Local queue</span><h2 style="margin-top:5px">Offline triage queue</h2><p>Use test labels only; each row waits for clinician assessment.</p></div><span class="tag">${t.queue.length} rows</span></div><div class="activity-list">${queue || `<div class="empty-state"><span class="empty-symbol">＋</span><strong>No demo rows queued</strong><p>Add a test-only row to explore the offline queue presentation.</p></div>`}</div></section></div>
      <aside class="stack"><section class="card"><div class="card-heading"><div><span class="card-kicker">Human-led care</span><h2 style="margin-top:5px">Safety boundary</h2></div><span class="status-pill review">No clinical AI</span></div><div class="workflow-step"><span class="step-number">1</span><div><strong>Capture locally</strong><small>Sensor data would be buffered on the station while the network is unavailable.</small></div></div><div class="workflow-step"><span class="step-number">2</span><div><strong>Clinical assessment</strong><small>A qualified clinician reviews the patient and any verified measurements.</small></div></div><div class="workflow-step"><span class="step-number">3</span><div><strong>Billing route</strong><small>Patient or insurer recipient is a draft choice, not a financial record submission.</small></div></div></section><section class="card"><div class="card-heading"><div><span class="card-kicker">Connectivity</span><h2 style="margin-top:5px">Offline-first concept</h2><p>Queue and sensor states are shown without asserting that hardware is installed.</p></div><span class="tag">Device disconnected</span></div></section></aside></div>`;
  }
  function renderEscrow() {
    const e = state.escrow;
    const hasEvidence = Boolean(String(e.evidence || "").trim());
    const canApprove = Boolean(e.verified && hasEvidence && e.milestone && e.criteria);
    return `${pageHeader("Agentic escrow for developer bounties", "Represent milestone-based contracts and GitHub commit or pull-request evidence, then add a human checkpoint before a simulated PayPal Payouts release.", "Developer bounties · milestone escrow")}
      <div class="trust-banner"><span class="trust-icon">◇</span><div class="trust-copy"><strong>Acceptance criteria → GitHub reference → human approval → payout step</strong><span>GitHub is not connected. The evidence gate only records a supplied reference; it does not verify a repository.</span></div><span class="sandbox-tag">Demo escrow</span></div>
      <div class="workflow-layout"><div class="stack"><section class="card"><div class="card-heading"><div><span class="card-kicker">Contract milestone</span><h2 style="margin-top:5px">Define the acceptance gate</h2><p>Use a test milestone; no contract or funds are created.</p></div><span class="tag">Milestone-based</span></div><div class="form-grid"><div class="form-field full"><label for="escrow-milestone">Milestone name</label><input id="escrow-milestone" data-escrow-field="milestone" value="${esc(e.milestone)}" placeholder="e.g., Delivery milestone"></div><div class="form-field full"><label for="escrow-criteria">Acceptance criteria</label><textarea id="escrow-criteria" data-escrow-field="criteria" placeholder="Describe the agreed milestone conditions">${esc(e.criteria)}</textarea></div><div class="form-field full"><label for="escrow-evidence">GitHub pull-request or commit reference</label><input id="escrow-evidence" data-escrow-field="evidence" value="${esc(e.evidence)}" placeholder="Add a GitHub PR/commit URL or test reference"></div></div><div style="display:flex;justify-content:flex-end;margin-top:13px"><button class="btn btn-secondary" data-action="verify-escrow" type="button">Check evidence reference</button></div><div class="milestone-track"><div class="milestone-node ${e.verified ? "active" : ""}">1 · Evidence reference</div><div class="milestone-node ${e.humanApproved ? "active" : ""}">2 · Human approval</div><div class="milestone-node ${e.humanApproved ? "active" : ""}">3 · Payout preview</div></div><div class="demo-note"><span>ⓘ</span><div><strong>${e.verified ? "Reference present · not GitHub-verified" : "Waiting for milestone evidence"}</strong>${e.verified ? "A real integration would inspect the commit or pull request against the agreed criteria." : "Enter the milestone, acceptance criteria, and an evidence reference first."}</div></div></section></div>
        <aside class="stack"><section class="card"><div class="card-heading"><div><span class="card-kicker">Human release gate</span><h2 style="margin-top:5px">Funds stay held until approval</h2><p>Evidence alone never releases escrow.</p></div><span class="status-pill ${e.humanApproved ? "approved" : "review"}">${e.humanApproved ? "Approved in demo" : "Awaiting review"}</span></div><div class="workflow-step"><span class="step-number">1</span><div><strong>Milestone evaluation</strong><small>Check the entered evidence against contract terms in a connected verifier.</small></div></div><div class="workflow-step"><span class="step-number">2</span><div><strong>Human approval</strong><small>An authorized reviewer confirms the milestone before release.</small></div></div><div class="workflow-step"><span class="step-number">3</span><div><strong>PayPal Payouts</strong><small>Only a preview button is implemented here; no payout is possible.</small></div></div><div style="display:grid;gap:8px;margin-top:13px"><button class="btn btn-secondary" data-action="approve-escrow" type="button" ${!canApprove || e.humanApproved ? "disabled" : ""}>${e.humanApproved ? "Human approval recorded (demo)" : "Approve milestone in demo"}</button><button class="btn btn-primary" data-action="release-escrow" type="button" ${!e.humanApproved ? "disabled" : ""}>Simulate payout release</button></div></section><section class="card"><div class="card-heading"><div><span class="card-kicker">Demo boundary</span><h2 style="margin-top:5px">No contract or transfer</h2><p>Use test content only. GitHub, escrow custody, and payout execution are not configured.</p></div></div></section></aside></div>`;
  }
  window.MANDATE_APP = {
    get state() { return state; },
    setState(next) { state = next; },
    reset() { state = initialState(); },
    render, persist, navigate, toast, fairTotals, fairSummaryHtml,
    initialState, routes: ROUTES, data: D
  };
  render();
})();
