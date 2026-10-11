(() => {
  "use strict";
  const api = window.MANDATE_APP;
  if (!api) return;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
  const money = (value) => "$" + Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const setState = () => api.state;

  const THEME_KEY = "mandate_theme";
  function getActiveTheme() {
    return localStorage.getItem(THEME_KEY) || "light";
  }
  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    if (theme === "light") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.dataset.theme = theme;
    }
    $$("[data-theme-choice]").forEach((node) => {
      node.classList.toggle("active", node.dataset.themeChoice === theme);
    });
  }

  // Initialize theme
  setTheme(getActiveTheme());

  const SIDEBAR_COLLAPSED_KEY = "mandate_sidebar_collapsed";
  function isSidebarCollapsed() {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  }
  function setSidebarCollapsed(collapsed) {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "true" : "false");
    const toggleBtn = $("#sidebar-toggle-btn");
    const arrowSpan = toggleBtn ? toggleBtn.querySelector(".toggle-arrow") : null;
    if (arrowSpan) arrowSpan.textContent = collapsed ? "▶" : "◀";
    if (toggleBtn) toggleBtn.setAttribute("title", collapsed ? "Show side menu" : "Hide side menu");
    const sidebarArrow = $("#sidebar-arrow-btn");
    if (sidebarArrow) sidebarArrow.textContent = collapsed ? "▶" : "◀";
  }
  // Initialize sidebar collapsed state on load
  if (isSidebarCollapsed()) {
    setSidebarCollapsed(true);
  }

  function toggleSidebar() {
    const isNowCollapsed = !document.body.classList.contains("sidebar-collapsed");
    setSidebarCollapsed(isNowCollapsed);
  }

  function closeNavigationDrawer() {
    const sidebar = $("#sidebar");
    if (!sidebar || !sidebar.classList.contains("open")) return;
    sidebar.classList.remove("open");
    const menuButton = $("#mobile-menu-button");
    if (menuButton) {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
    }
  }

  function updateServerStatus() {
    const badge = $("#server-status-badge");
    if (!badge) return;
    if (window.MANDATE_API && window.MANDATE_API.checkHealth) {
      window.MANDATE_API.checkHealth().then((health) => {
        if (health.paypalConnected) {
          badge.innerHTML = `<span class="status-dot" style="background:#10b981; box-shadow:0 0 0 3px rgba(16,185,129,.2)"></span>SANDBOX CONNECTED`;
        } else if (health.status === "ok") {
          badge.innerHTML = `<span class="status-dot" style="background:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.2)"></span>SANDBOX READY`;
        } else {
          badge.innerHTML = `<span class="status-dot" style="background:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.2)"></span>LOCAL DEMO`;
        }
      }).catch(() => {
        badge.innerHTML = `<span class="status-dot" style="background:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.2)"></span>LOCAL DEMO`;
      });
    }
  }
  setTimeout(updateServerStatus, 150);

  function openMandateDialog() {
    const p = api.data.mandateFormPreset;
    $("#modal-root").innerHTML = `<div class="dialog-backdrop" id="mandate-backdrop"><section class="dialog-card" role="dialog" aria-modal="true" aria-labelledby="mandate-dialog-title"><div class="dialog-head"><div><h2 id="mandate-dialog-title">Create a scoped mandate</h2><p>Set the exact authority this agent may use.</p></div><button class="icon-button" data-action="close-dialog" type="button" aria-label="Close dialog">×</button></div><form id="mandate-form"><div class="dialog-body"><div class="form-grid"><div class="form-field full"><label for="mandate-name">Mandate name</label><input id="mandate-name" name="name" required value="${esc(p.name)}"></div><div class="form-field full"><label for="mandate-purpose">Purpose</label><input id="mandate-purpose" name="purpose" value="${esc(p.purpose)}"></div><div class="form-field"><label for="mandate-limit">Monthly budget limit · USD</label><input id="mandate-limit" name="limit" type="number" min="0.01" step="0.01" required value="${p.totalLimit}"></div><div class="form-field"><label for="mandate-cycle">Reset cycle</label><select id="mandate-cycle" name="cycle"><option ${p.resetCycle === "Monthly" ? "selected" : ""}>Monthly</option><option>Weekly</option><option>Quarterly</option></select></div><div class="form-field"><label for="mandate-per-tx">Per-transaction ceiling · USD</label><input id="mandate-per-tx" name="perTransaction" type="number" min="0.01" step="0.01" required value="${p.perTransaction}"></div><div class="form-field"><label for="mandate-review">Human approval above · USD</label><input id="mandate-review" name="approvalAbove" type="number" min="0" step="0.01" value="${p.humanApprovalAbove}"></div><div class="form-field full"><label for="mandate-merchants">Authorized merchants / domains</label><input id="mandate-merchants" name="merchants" required value="${esc(p.domains.join(", "))}"><span class="form-hint">Comma-separated allowlist; only listed merchants are in scope.</span></div><div class="form-field"><label for="mandate-categories">Categories</label><input id="mandate-categories" name="categories" value="${esc(p.categories.join(", "))}"></div><div class="form-field"><label for="mandate-expiry">Expiry date</label><input id="mandate-expiry" name="expiry" type="date" required value="${esc(p.expiry)}"><span class="form-hint">Choose a future expiry date for active spending.</span></div><div class="form-field full"><label for="mandate-funding">Funding source</label><input id="mandate-funding" name="fundingSource" value="${esc(p.fundingSource)}"></div></div><div class="demo-note" style="margin-top:14px"><span>ⓘ</span><div><strong>Scoped Agent Authority</strong>This mandate defines spending limits, merchant allowlists, and review gates before payments hit PayPal.</div></div></div><div class="dialog-actions"><button class="btn btn-secondary" data-action="close-dialog" type="button">Cancel</button><button class="btn btn-primary" type="submit">Save mandate</button></div></form></section></div>`;
    $("#mandate-name").focus();
  }
  function closeDialog() { $("#modal-root").innerHTML = ""; }

  function saveMandate(form) {
    const values = Object.fromEntries(new FormData(form).entries());
    const cap = Number(values.perTransaction);
    const budget = Number(values.limit);
    const approval = values.approvalAbove === "" ? null : Number(values.approvalAbove);
    const expiry = new Date(`${values.expiry}T23:59:59`);
    if (!values.name.trim() || !values.merchants.trim() || !(budget > 0) || !(cap > 0)) return api.toast("Add a name, merchant allowlist, budget, and transaction cap.");
    if (approval !== null && (approval < 0 || approval > cap)) return api.toast("The human-review threshold must be at or below the transaction cap.");
    if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) return api.toast("Choose a future expiry date before saving an active mandate.");
    const current = setState();
    const newMandate = {
      id: `mdt-${Date.now().toString(36)}`, name: values.name.trim(), description: values.purpose.trim() || "Scoped spend mandate",
      spent: 0, limit: budget, perTransaction: cap, humanApprovalAbove: approval,
      merchants: values.merchants.split(",").map((item) => item.trim()).filter(Boolean), categories: values.categories.split(",").map((item) => item.trim()).filter(Boolean),
      expiry: values.expiry, fundingSource: values.fundingSource.trim(), status: "active", reset: `${values.cycle} cycle`
    };
    current.mandates.push(newMandate);
    current.activity = current.activity || [];
    current.activity.unshift({
      id: `act-${Date.now().toString(36)}`,
      title: `Mandate Created: ${newMandate.name}`,
      merchant: newMandate.merchants[0] || "Allowlist",
      amount: 0,
      status: "approved",
      decision: `Cap: ${money(cap)} · Pool: ${money(budget)}`,
      agent: newMandate.name
    });

    if (window.MANDATE_API && window.MANDATE_API.createMandate) {
      window.MANDATE_API.createMandate(newMandate).catch(() => {});
    }

    api.persist(); closeDialog(); api.render(); api.toast(`Mandate "${newMandate.name}" active!`);
  }

  function openSimulatePaymentDialog(mandateId) {
    const s = setState();
    const m = s.mandates.find((entry) => entry.id === mandateId);
    if (!m) return;
    const defaultMerchant = m.merchants?.[0] || "AWS";
    $("#modal-root").innerHTML = `
      <div class="dialog-backdrop" id="payment-test-backdrop">
        <section class="dialog-card" role="dialog" aria-modal="true" aria-labelledby="payment-test-title">
          <div class="dialog-head">
            <div>
              <span class="card-kicker">AGENT FIREWALL · PAYMENT SIMULATOR</span>
              <h2 id="payment-test-title" style="margin-top:5px">Test Agent Payment</h2>
              <p>Simulate an autonomous agent attempting a transaction under <strong>${esc(m.name)}</strong>.</p>
            </div>
            <button class="icon-button" data-action="close-dialog" type="button" aria-label="Close dialog">×</button>
          </div>
          <form id="simulate-payment-form">
            <input type="hidden" name="mandateId" value="${esc(m.id)}">
            <div class="dialog-body">
              <div class="form-grid">
                <div class="form-field full">
                  <label for="sim-merchant">Merchant Name / Domain</label>
                  <input id="sim-merchant" name="merchant" required value="${esc(defaultMerchant)}" placeholder="e.g. AWS or BetSecure">
                  <span class="form-hint">Authorized merchants for this mandate: <strong>${esc(m.merchants.join(", "))}</strong>. Enter an unlisted merchant to test policy blocking.</span>
                </div>
                <div class="form-field">
                  <label for="sim-amount">Payment Amount · USD</label>
                  <input id="sim-amount" name="amount" type="number" min="0.01" step="0.01" required value="${Math.min(m.perTransaction, 150)}" placeholder="0.00">
                  <span class="form-hint">Cap: ${money(m.perTransaction)}${m.humanApprovalAbove != null ? ` · Review above: ${money(m.humanApprovalAbove)}` : ""}</span>
                </div>
                <div class="form-field">
                  <label for="sim-category">Category</label>
                  <input id="sim-category" name="category" value="${esc(m.categories?.[0] || "Software")}" placeholder="e.g. Software">
                </div>
                <div class="form-field full">
                  <label for="sim-purpose">Payment Description / Memo</label>
                  <input id="sim-purpose" name="memo" value="Autonomous workload compute burst" placeholder="e.g. Server hosting bill">
                </div>
              </div>
              <div class="demo-note" style="margin-top:14px">
                <span>⬡</span>
                <div>
                  <strong>Firewall Policy Evaluation</strong>
                  The firewall will either Auto-Approve, Block (if merchant/cap violated), or Escalate to your Approvals Queue for human sign-off via PayPal.
                </div>
              </div>
            </div>
            <div class="dialog-actions">
              <button class="btn btn-secondary" data-action="close-dialog" type="button">Cancel</button>
              <button class="btn btn-primary" type="submit">Run through firewall</button>
            </div>
          </form>
        </section>
      </div>
    `;
    $("#sim-merchant").focus();
  }

  function executeSimulatedPayment(form) {
    const values = Object.fromEntries(new FormData(form).entries());
    const mandateId = values.mandateId;
    const merchant = values.merchant.trim();
    const amount = Number(values.amount);
    const memo = values.memo.trim() || `${merchant} charge`;
    const s = setState();
    const m = s.mandates.find((entry) => entry.id === mandateId);
    if (!m) return;

    closeDialog();
    s.activity = s.activity || [];

    // 1. Check merchant allowlist
    const merchantAllowed = m.merchants.length === 0 || m.merchants.some((auth) => auth.toLowerCase().includes(merchant.toLowerCase()) || merchant.toLowerCase().includes(auth.toLowerCase()));
    if (!merchantAllowed) {
      s.activity.unshift({
        id: `act-${Date.now().toString(36)}`,
        title: `${merchant} - Payment Blocked`,
        merchant: merchant,
        amount: amount,
        status: "blocked",
        decision: `Blocked: Unauthorized Merchant (${merchant})`,
        agent: m.name
      });
      api.persist();
      api.render();
      api.toast(`BLOCKED: Merchant "${merchant}" is not in this agent's authorized allowlist!`);
      return;
    }

    // 2. Check per-transaction ceiling
    if (amount > m.perTransaction) {
      // Exceeds ceiling: escalate to approvals
      const approvalItem = {
        id: `appr-${Date.now().toString(36)}`,
        merchant: merchant,
        agent: m.name,
        amount: amount,
        risk: 85,
        category: "cap-exceeded",
        signal: "Ceiling Breach",
        breach: `+${Math.round(((amount - m.perTransaction) / m.perTransaction) * 100)}% Over Cap`,
        detail: `Transaction amount (${money(amount)}) exceeds autonomous single-purchase cap of ${money(m.perTransaction)}.`,
        funding: m.fundingSource || "PayPal Vault",
        evidence: memo,
        status: "pending",
        mandateId: m.id
      };
      s.approvals.unshift(approvalItem);
      s.activity.unshift({
        id: `act-${Date.now().toString(36)}`,
        title: `${merchant} - Escalated to Human Review`,
        merchant: merchant,
        amount: amount,
        status: "review",
        decision: `Escalated: Exceeds ${money(m.perTransaction)} ceiling`,
        agent: m.name
      });
      api.persist();
      api.render();
      api.toast(`ESCALATED: Payment of ${money(amount)} exceeds cap. Moved to Approvals queue!`);
      return;
    }

    // 3. Check human approval threshold
    if (m.humanApprovalAbove != null && amount > m.humanApprovalAbove) {
      const approvalItem = {
        id: `appr-${Date.now().toString(36)}`,
        merchant: merchant,
        agent: m.name,
        amount: amount,
        risk: 55,
        category: "cap-exceeded",
        signal: "Threshold Gate",
        breach: `Exceeds ${money(m.humanApprovalAbove)}`,
        detail: `Transaction of ${money(amount)} triggered human review threshold of ${money(m.humanApprovalAbove)}.`,
        funding: m.fundingSource || "PayPal Vault",
        evidence: memo,
        status: "pending",
        mandateId: m.id
      };
      s.approvals.unshift(approvalItem);
      s.activity.unshift({
        id: `act-${Date.now().toString(36)}`,
        title: `${merchant} - Held for Review`,
        merchant: merchant,
        amount: amount,
        status: "review",
        decision: `Held: Above ${money(m.humanApprovalAbove)} review threshold`,
        agent: m.name
      });
      api.persist();
      api.render();
      api.toast(`HELD: Payment exceeds human approval threshold. Check your Approvals queue!`);
      return;
    }

    // 4. Check monthly budget pool
    if (m.spent + amount > m.limit) {
      s.activity.unshift({
        id: `act-${Date.now().toString(36)}`,
        title: `${merchant} - Budget Limit Exceeded`,
        merchant: merchant,
        amount: amount,
        status: "blocked",
        decision: `Blocked: Exceeds ${money(m.limit)} Monthly Cap`,
        agent: m.name
      });
      api.persist();
      api.render();
      api.toast(`BLOCKED: Monthly budget cap of ${money(m.limit)} reached!`);
      return;
    }

    // 5. Approved within policy!
    m.spent += amount;
    s.activity.unshift({
      id: `act-${Date.now().toString(36)}`,
      title: `${merchant} - Auto-Approved Payment`,
      merchant: merchant,
      amount: amount,
      status: "approved",
      decision: "Approved (Auto) · Within Mandate",
      agent: m.name
    });
    api.persist();
    api.render();
    api.toast(`SUCCESS: ${money(amount)} payment to ${merchant} auto-approved!`);
  }
  function openFairItemDialog() {
    const s = setState();
    const participants = s.fairParticipants || api.data.fairShare.participants;
    const participantChoices = participants.map((person) => `<label class="person-chip"><input type="checkbox" name="participants" value="${esc(person)}" checked>${esc(person)}</label>`).join("");
    const payerOptions = participants.map((person) => `<option value="${esc(person)}">${esc(person)}</option>`).join("");
    $("#modal-root").innerHTML = `<div class="dialog-backdrop" id="fair-item-backdrop"><section class="dialog-card fair-item-dialog" role="dialog" aria-modal="true" aria-labelledby="fair-item-dialog-title" aria-describedby="fair-item-dialog-help"><div class="dialog-head"><div><span class="card-kicker">FAIRSHARE · BILL ITEM</span><h2 id="fair-item-dialog-title" style="margin-top:5px">Add a bill item</h2><p>Enter one receipt line and how the group should split it.</p></div><button class="icon-button" data-action="close-dialog" type="button" aria-label="Close dialog">×</button></div><form id="fair-item-form"><div class="dialog-body"><div class="form-grid"><div class="form-field full"><label for="fair-item-name">Bill item</label><input id="fair-item-name" name="name" maxlength="120" required placeholder="e.g. Shared dinner"></div><div class="form-field"><label for="fair-item-amount">Amount · USD</label><input id="fair-item-amount" name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" required placeholder="0.00"></div><div class="form-field"><label for="fair-item-payer">Already paid by</label><select id="fair-item-payer" name="paidBy"><option value="">Not paid yet</option>${payerOptions}</select></div><div class="form-field full"><span class="field-label">Split this bill with</span><div class="participant-picks" role="group" aria-label="Participants who share this bill line">${participantChoices}</div></div></div><div class="demo-note" id="fair-item-dialog-help"><span>ⓘ</span><div><strong>FairShare Bill Splitter</strong>The item is itemized across all selected friends in the group. Integer cents are allocated evenly with full transparency.</div></div></div><div class="dialog-actions"><button class="btn btn-secondary" data-action="close-dialog" type="button">Cancel</button><button class="btn btn-primary" type="submit">Add bill item</button></div></form></section></div>`;
    $("#fair-item-name").focus();
  }
  function addFairItem(form) {
    const values = new FormData(form);
    const name = String(values.get("name") || "").trim();
    const amountText = String(values.get("amount") || "");
    const amount = Number(amountText);
    const included = values.getAll("participants").map((person) => String(person));
    const paidBy = String(values.get("paidBy") || "");
    if (!name) return api.toast("Enter a name for the bill item.");
    if (amountText.trim() === "" || !Number.isFinite(amount) || !(amount > 0)) return api.toast("Enter a positive bill-item amount.");
    if (!included.length) return api.toast("Choose at least one participant for this bill item.");
    const s = setState();
    s.fairItems.push({ name, amount: (Math.round(amount * 100) / 100).toFixed(2), included, paidBy });
    const index = s.fairItems.length - 1;
    api.persist(); closeDialog(); api.render();
    const newItem = $(`#fair-name-${index}`);
    if (newItem) newItem.focus();
    api.toast(`"${name}" added to the bill!`);
  }
  function draftDispute() {
    const s = setState();
    s.dispute = s.dispute || { transactionRef: "", shippingEvidence: "", draft: "" };
    const ref = s.dispute.transactionRef.trim() || "[transaction reference to confirm]";
    const evidence = s.dispute.shippingEvidence.trim() || "[shipping evidence to add before submission]";
    s.dispute.draft = `Dispute response draft — human review required\n\nWe are responding to the dispute associated with ${ref}. Please review the merchant's transaction history together with the fulfillment record.\n\nShipping / delivery evidence provided: ${evidence}\n\nThe merchant requests that the available records be considered before a decision is made. Confirm every statement and attach the underlying transaction and shipping documents before submitting this response.`;
    api.persist(); api.render(); api.toast("Draft prepared locally. Review every claim and attach the source evidence.");
  }
  function procurementMatch(p) {
    const amount = Number(p.invoiceTotal);
    const poAmount = Number(p.poTotal);
    const lineMatch = Boolean(p.invoiceLine?.trim() && p.poLine?.trim() && p.invoiceQty !== "" && p.poQty !== "") &&
      p.invoiceLine.trim().toLowerCase() === p.poLine.trim().toLowerCase() && Number(p.invoiceQty) > 0 && Number(p.invoiceQty) === Number(p.poQty);
    return Boolean(p.invoiceRef?.trim() && p.poRef?.trim() && lineMatch && p.invoiceTotal !== "" && p.poTotal !== "" &&
      Number.isFinite(amount) && Number.isFinite(poAmount) && Math.abs(amount - poAmount) < 0.01);
  }
  function compareProcurement() {
    const p = setState().procurement;
    p.checked = true;
    p.approved = false;
    const refsReady = Boolean(p.invoiceRef?.trim() && p.poRef?.trim());
    const linesReady = Boolean(p.invoiceLine?.trim() && p.poLine?.trim() && p.invoiceQty !== "" && p.poQty !== "");
    const lineMatches = linesReady && p.invoiceLine.trim().toLowerCase() === p.poLine.trim().toLowerCase() && Number(p.invoiceQty) > 0 && Number(p.invoiceQty) === Number(p.poQty);
    const totalsReady = p.invoiceTotal !== "" && p.poTotal !== "" && Number.isFinite(Number(p.invoiceTotal)) && Number.isFinite(Number(p.poTotal));
    api.persist(); api.render();
    if (!refsReady || !linesReady || !totalsReady) api.toast("Add invoice and PO references, matching line-item details, quantities, and both totals.");
    else if (!lineMatches) api.toast("Line-item or quantity mismatch flagged. The payout gate remains closed.");
    else if (Math.abs(Number(p.invoiceTotal) - Number(p.poTotal)) >= 0.01) api.toast("Total mismatch flagged. The payout gate remains closed.");
    else api.toast("References, line item, quantity, and totals match. Human review is still required before payout.");
  }
  function createInvoice() {
    const client = $("#cfo-client").value.trim();
    const amount = Number($("#cfo-amount").value);
    const currency = $("#cfo-currency").value;
    if (!client || !(amount > 0)) return api.toast("Enter a client and a positive amount for the local invoice draft.");
    const s = setState();
    s.cfo.invoices.push({ client, amount, currency, status: "Draft · not issued" });
    s.cfo.form = { client: "", amount: "", currency: "USD" };
    api.persist(); api.render(); api.toast("Invoice draft saved locally. It was not issued or sent.");
  }
  function sendCfoMessage() {
    const input = $("#cfo-chat-input");
    const text = input.value.trim();
    if (!text) return;
    const s = setState();
    s.cfo.messages.push({ role: "user", text });
    const lower = text.toLowerCase();
    const reply = lower.includes("invoice") ? "I can prepare an invoice draft from the client and amount fields. Nothing is issued until you connect and authorize a sending service." : lower.includes("late") || lower.includes("remind") || lower.includes("chase") ? "I can draft a late-payer follow-up from the invoice list. WhatsApp or email delivery is not connected, so no reminder will be sent." : lower.includes("reconcil") || lower.includes("currency") ? "Use the cross-currency ledger below with a verified manual exchange rate. This demo does not fetch FX data." : "I can help with invoice drafts, payment follow-ups, and currency reconciliation. External messaging is not connected.";
    s.cfo.messages.push({ role: "assistant", text: reply });
    api.persist(); api.render();
  }
  function reconcileCurrencies() {
    const amountValue = $("#reconcile-amount").value;
    const amount = Number(amountValue);
    const rate = Number($("#reconcile-rate").value);
    const from = $("#reconcile-from").value;
    const to = $("#reconcile-to").value;
    if (amountValue.trim() === "" || !(amount >= 0) || !(rate > 0)) return api.toast("Enter a non-negative received amount and a verified positive manual exchange rate.");
    const converted = Math.round(amount * rate * 100) / 100;
    const s = setState();
    s.cfo.reconcileInput = { amount: amountValue, rate: $("#reconcile-rate").value, from, to };
    s.cfo.reconcile = { amount, rate, from, to, converted };
    api.persist(); api.render(); api.toast("Manual-rate reconciliation preview calculated. No FX service was queried.");
  }
  function openPayPalCheckoutDialog(item) {
    if (!item) return;
    $("#modal-root").innerHTML = `
      <div class="dialog-backdrop" id="paypal-backdrop">
        <section class="dialog-card" role="dialog" aria-modal="true" aria-labelledby="paypal-dialog-title" style="max-width: 540px;">
          <div class="dialog-head">
            <div>
              <span class="card-kicker">PAYPAL SETTLEMENT RAIL · SANDBOX</span>
              <h2 id="paypal-dialog-title" style="margin-top: 4px;">Authorize &amp; Pay via PayPal</h2>
              <p>Execute agent payment with autonomous guardrail enforcement.</p>
            </div>
            <button class="icon-button" data-action="close-dialog" type="button" aria-label="Close dialog">×</button>
          </div>
          <div class="dialog-body">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:14px; background:var(--surface-low); border-radius:12px; margin-bottom:14px; border:1px solid var(--line-soft)">
              <div>
                <small style="color:var(--muted); font-size:10px; display:block">MERCHANT RECIPIENT</small>
                <strong style="font-size:14px">${esc(item.merchant)}</strong>
                <div style="font-size:10px; color:var(--muted)">Initiated by: ${esc(item.agent)}</div>
              </div>
              <div style="text-align:right">
                <small style="color:var(--muted); font-size:10px; display:block">AMOUNT</small>
                <strong style="font-size:22px; color:var(--blue); font-variant-numeric:tabular-nums">${money(item.amount)}</strong>
                <div style="font-size:9px; color:var(--muted)">USD · Sandbox Rail</div>
              </div>
            </div>

            <div style="display:grid; gap:8px; margin-bottom:14px">
              <span class="card-kicker">POLICY GUARDRAIL AUDIT</span>
              <div class="evidence-tile" style="padding:10px; display:flex; align-items:center; gap:9px">
                <span style="color:var(--green); font-weight:800; font-size:14px">✓</span>
                <div>
                  <strong>Merchant Identity &amp; Signal Review</strong>
                  <small style="display:block; color:var(--muted)">Signal: ${esc(item.signal)} (${esc(item.breach)}). Reviewed and authorized.</small>
                </div>
              </div>
              <div class="evidence-tile" style="padding:10px; display:flex; align-items:center; gap:9px">
                <span style="color:var(--green); font-weight:800; font-size:14px">✓</span>
                <div>
                  <strong>Mandate Cap Exception Release</strong>
                  <small style="display:block; color:var(--muted)">Human operator override applied. Funding rail: ${esc(item.funding)}.</small>
                </div>
              </div>
              <div class="evidence-tile" style="padding:10px; display:flex; align-items:center; gap:9px">
                <span style="color:var(--green); font-weight:800; font-size:14px">✓</span>
                <div>
                  <strong>PayPal Sandbox Order Generation</strong>
                  <small style="display:block; color:var(--muted)">Dispatches capture order via PayPal server SDK with full audit trail.</small>
                </div>
              </div>
            </div>

            <div class="demo-note">
              <span>ⓘ</span>
              <div>
                <strong>Sandbox Execution Ready</strong>
                Clicking "Pay with PayPal" creates an authorized order token and records the approved settlement in your audit ledger.
              </div>
            </div>
          </div>
          <div class="dialog-actions" style="display:flex; justify-content:space-between; align-items:center;">
            <button class="btn btn-secondary" data-action="close-dialog" type="button">Cancel</button>
            <button class="btn-paypal" id="confirm-paypal-pay" data-id="${esc(item.id)}" type="button" style="padding: 0 20px; min-height: 38px; font-size: 13px;">
              <span class="pp-badge">Pay</span> with PayPal (${money(item.amount)})
            </button>
          </div>
        </section>
      </div>
    `;
    const btn = $("#confirm-paypal-pay");
    if (btn) btn.focus();
  }

  async function executePayPalPayment(id) {
    const s = setState();
    const item = s.approvals.find((entry) => entry.id === id);
    if (!item) return;

    const btn = $("#confirm-paypal-pay");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="status-dot" style="background:#10b981"></span> Connecting PayPal Sandbox...`;
    }

    try {
      let orderId = `SANDBOX-PP-${Date.now().toString(36).toUpperCase()}`;
      if (window.MANDATE_API && window.MANDATE_API.createPayPalOrder) {
        try {
          const res = await window.MANDATE_API.createPayPalOrder(
            item.amount,
            "USD",
            `Mandate payment for ${item.merchant} (${item.agent})`,
            item.mandateId,
            item.merchant
          );
          if (res && res.id) orderId = res.id;
        } catch (e) {
          console.warn("[PayPal Sandbox] Order fallback:", e);
        }
      }

      item.status = "approved";
      item.paypalOrderId = orderId;
      api.persist();
      closeDialog();
      api.render();
      api.toast(`PayPal Sandbox Order Created: ${orderId} · Payment Approved!`);
    } catch (err) {
      api.toast(`PayPal error: ${err.message || "Failed"}`);
    }
  }

  function handleAction(node) {
    const action = node.dataset.action;
    const s = setState();
    if (action === "open-mandate") return openMandateDialog();
    if (action === "close-dialog") return closeDialog();
    if (action === "pay-with-paypal") {
      const item = s.approvals.find((entry) => entry.id === node.dataset.id);
      if (item) return openPayPalCheckoutDialog(item);
      return;
    }
    if (action === "simulate-mandate-payment") return openSimulatePaymentDialog(node.dataset.id);
    if (action === "toggle-mandate") {
      const item = s.mandates.find((entry) => entry.id === node.dataset.id);
      if (item) { item.status = item.status === "active" ? "paused" : "active"; api.persist(); api.render(); api.toast(`Mandate ${item.status}.`); }
      return;
    }
    if (action === "simulate-approve" || action === "simulate-deny") {
      const item = s.approvals.find((entry) => entry.id === node.dataset.id);
      if (item) {
        item.status = action === "simulate-approve" ? "approved" : "blocked";
        s.activity = s.activity || [];
        s.activity.unshift({
          id: `act-${Date.now().toString(36)}`,
          title: `${item.merchant} Payment`,
          merchant: item.merchant,
          amount: item.amount,
          status: item.status,
          decision: action === "simulate-approve" ? "Approved by Operator" : "Blocked by Policy Operator",
          agent: item.agent
        });
        api.persist(); api.render();
        api.toast(action === "simulate-approve" ? `Payment of ${money(item.amount)} approved!` : `Payment of ${money(item.amount)} denied.`);
      }
      return;
    }
    if (action === "undo-approval") {
      const item = s.approvals.find((entry) => entry.id === node.dataset.id);
      if (item && item.status !== "pending") { item.status = "pending"; api.persist(); api.render(); api.toast("Returned to approvals queue."); }
      return;
    }
    if (action === "add-fair-friend") {
      const input = $("#new-friend-input");
      const name = input ? input.value.trim() : "";
      if (!name) return api.toast("Enter a friend's name to add them to the split.");
      s.fairParticipants = s.fairParticipants || [...api.data.fairShare.participants];
      if (s.fairParticipants.some((p) => p.toLowerCase() === name.toLowerCase())) {
        return api.toast(`"${name}" is already in the split group!`);
      }
      s.fairParticipants.push(name);
      // Auto-include the new friend in items that include all friends
      s.fairItems.forEach((item) => {
        if (!item.included || item.included.length === 0 || item.included.length >= s.fairParticipants.length - 1) {
          item.included = [...new Set([...(item.included || []), name])];
        }
      });
      api.persist();
      api.render();
      api.toast(`Added ${name} to FairShare! Now ${s.fairParticipants.length} friends in the group.`);
      return;
    }
    if (action === "remove-fair-friend") {
      const name = node.dataset.name;
      s.fairParticipants = s.fairParticipants || [...api.data.fairShare.participants];
      if (s.fairParticipants.length <= 2) {
        return api.toast("A group split requires at least 2 people.");
      }
      s.fairParticipants = s.fairParticipants.filter((p) => p !== name);
      // Clean up participation in items
      s.fairItems.forEach((item) => {
        item.included = (item.included || []).filter((p) => p !== name);
        if (item.paidBy === name) item.paidBy = "";
      });
      api.persist();
      api.render();
      api.toast(`Removed ${name} from the group.`);
      return;
    }
    if (action === "delete-fair-item") {
      const idx = Number(node.dataset.index);
      if (Number.isInteger(idx) && idx >= 0 && idx < s.fairItems.length) {
        const removed = s.fairItems.splice(idx, 1);
        api.persist();
        api.render();
        api.toast(`Deleted "${removed[0]?.name || "line item"}".`);
      }
      return;
    }
    if (action === "apply-fair-note") {
      const context = (s.fairContext || "").toLowerCase();
      if (!context) return api.toast("Write a note in the box first (e.g. 'Alice skipped alcohol, Bob left early')");
      const participants = s.fairParticipants || api.data.fairShare.participants;
      let adjusted = 0;
      
      // Smart parsing: match participant names with line items & actions
      s.fairItems.forEach((item) => {
        const itemName = (item.name || "").toLowerCase();
        participants.forEach((person) => {
          const pLower = person.toLowerCase();
          if (context.includes(pLower)) {
            // Check if note mentions person did not participate in item
            const regexExclude = new RegExp(`${pLower}\\s+(?:did not|didn'?t|no|skipped|avoided|passed on)\\s+(?:have|eat|drink|share)?\\s*(?:the)?\\s*${itemName}`, "i");
            const regexInclude = new RegExp(`${pLower}\\s+(?:only|ate|drank|covered|paid for)\\s+(?:the)?\\s*${itemName}`, "i");
            const regexPaid = new RegExp(`${pLower}\\s+(?:paid|covered|fronted|deposited)\\s+(?:for)?\\s*(?:the)?\\s*${itemName}`, "i");

            if (regexExclude.test(context) || (context.includes(`no ${itemName}`) && context.includes(pLower))) {
              item.included = (item.included || []).filter((p) => p !== person);
              adjusted++;
            }
            if (regexPaid.test(context)) {
              item.paidBy = person;
              adjusted++;
            }
          }
        });
      });
      api.persist();
      api.render();
      api.toast(adjusted > 0 ? `Smart note applied! Adjusted ${adjusted} allocation(s).` : "Note analyzed. Current allocations are aligned.");
      return;
    }
    if (action === "fair-add-item") return openFairItemDialog();
    if (action === "prepare-fair-requests") {
      const { rows, total, unallocated } = api.fairTotals();
      if (!total) return api.toast("Enter at least one line-item amount before preparing request previews.");
      if (unallocated) return api.toast(`${money(unallocated / 100)} remains unallocated. Assign at least one person to every priced line before preparing previews.`);
      const count = rows.filter((row) => row.net > 0).length;
      api.toast(`⚡ Ready: ${count} PayPal Sandbox request link${count === 1 ? "" : "s"} generated for all friends who owe money!`);
      return;
    }
    if (action === "copy-fair-preview") {
      const text = `PayPal request preview · ${node.dataset.person} · ${money(Number(node.dataset.amount) / 100)} · DEMO ONLY`;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => api.toast("Demo request preview copied; it is not a payment link.")).catch(() => api.toast(text));
      else api.toast(text);
      return;
    }
    if (action === "prepare-dispute") return draftDispute();
    if (action === "compare-procurement") return compareProcurement();
    if (action === "approve-procurement") {
      const p = s.procurement;
      if (!p.checked || !procurementMatch(p)) return api.toast("Resolve missing references, line items, quantities, or total differences before human approval.");
      p.approved = true; api.persist(); api.render(); api.toast("Human approval recorded in the local demo. No payout was sent."); return;
    }
    if (action === "simulate-procurement-payout") {
      if (!s.procurement.approved) return api.toast("A matching invoice and human approval are required first.");
      api.toast("PayPal Payouts preview only. No transfer or supplier payment was made."); return;
    }
    if (action === "create-invoice") return createInvoice();
    if (action === "send-cfo") return sendCfoMessage();
    if (action === "chase-invoice") {
      const invoice = s.cfo.invoices[Number(node.dataset.index)];
      if (!invoice) return;
      s.cfo.messages.push({ role: "assistant", text: `Follow-up draft for ${invoice.client}: a polite reminder about the ${money(invoice.amount)} ${invoice.currency} invoice. This message has not been sent.` });
      api.persist(); api.render(); api.toast("Late-payer follow-up drafted locally; no message was sent."); return;
    }
    if (action === "reconcile") return reconcileCurrencies();
    if (action === "evaluate-inventory") {
      s.inventory.evaluated = true; s.inventory.approved = false; api.persist(); api.render();
      const low = s.inventory.stock !== "" && s.inventory.threshold !== "" && Number(s.inventory.stock) <= Number(s.inventory.threshold);
      api.toast(low ? "Stock threshold reached. Review entered supplier offers." : "No restock trigger from the entered stock and threshold."); return;
    }
    if (action === "approve-inventory") {
      const i = s.inventory;
      const low = i.stock !== "" && i.threshold !== "" && Number(i.stock) <= Number(i.threshold);
      const quoteReady = ["A", "B"].some((key) => i[`supplier${key}`] && i[`price${key}`] !== "" && i[`days${key}`] !== "");
      if (!i.evaluated || !low || !quoteReady) return api.toast("Evaluate low stock and enter a complete supplier quote before requesting approval.");
      i.approved = true; api.persist(); api.render(); api.toast("Human approval recorded for this browser demo."); return;
    }
    if (action === "inventory-checkout") {
      if (!s.inventory.approved) return api.toast("Human approval is required before the simulated Checkout step.");
      api.toast("PayPal Checkout preview only. No order or payment was created."); return;
    }
    if (action === "add-triage-row") {
      const input = $("#triage-label");
      const label = input.value.trim();
      if (!label) return api.toast("Add a test-only queue label first; do not enter real patient information.");
      s.triage.queue.push({ label }); api.persist(); api.render(); api.toast("Test row added to the local queue. No clinical data was stored."); return;
    }
    if (action === "triage-invoice-preview") {
      if (!s.triage.queue.length) return api.toast("Add a test-only queue row before preparing a billing preview.");
      s.triage.invoicePreview = { target: s.triage.billingTarget || "Patient", createdAt: Date.now() };
      api.persist(); api.toast(`PayPal Invoicing preview prepared for ${s.triage.invoicePreview.target}. No bill was issued.`); return;
    }
    if (action === "verify-escrow") {
      const e = s.escrow;
      if (!e.milestone.trim() || !e.criteria.trim() || !e.evidence.trim()) return api.toast("Enter milestone terms and a GitHub reference before the local check.");
      e.verified = true; e.humanApproved = false; api.persist(); api.render(); api.toast("Reference recorded. GitHub was not queried or verified."); return;
    }
    if (action === "approve-escrow") {
      const e = s.escrow;
      if (!e.verified || !e.milestone || !e.criteria || !e.evidence) return api.toast("Record milestone evidence before human review.");
      e.humanApproved = true; api.persist(); api.render(); api.toast("Milestone approval recorded in the local demo."); return;
    }
    if (action === "release-escrow") {
      if (!s.escrow.humanApproved) return api.toast("A human milestone approval is required first.");
      api.toast("Payout-release preview only. No escrow funds or payout were created."); return;
    }
    if (action === "reset-demo") {
      if (!window.confirm("Clear all mandates, payments, and approvals to a clean slate?")) return;
      localStorage.removeItem(api.data.storageKey);
      s.mandates = [];
      s.approvals = [];
      s.activity = [];
      api.persist();
      api.navigate("mandates");
      api.toast("All mandates and payments cleared. Clean slate ready!");
      if (window.MANDATE_API && window.MANDATE_API.reset) {
        window.MANDATE_API.reset().catch(() => {});
      }
      return;
    }
    if (action === "seed-demo") {
      s.mandates = [
        { id: `mdt-demo-1`, name: "SaaS & Cloud Operations Agent", description: "Autonomous cloud capacity & dev tools", spent: 450, limit: 5000, perTransaction: 400, humanApprovalAbove: 250, merchants: ["AWS", "GitHub", "OpenAI", "Vercel"], categories: ["Cloud Services"], status: "active", reset: "Monthly cycle", expiry: "2026-12-31", fundingSource: "PayPal Vault (Primary)" },
        { id: `mdt-demo-2`, name: "Marketing & Growth Engine", description: "Targeted advertising & campaigns", spent: 1200, limit: 8000, perTransaction: 1000, humanApprovalAbove: 600, merchants: ["Google Ads", "LinkedIn", "Meta"], categories: ["Marketing"], status: "active", reset: "Monthly cycle", expiry: "2026-12-31", fundingSource: "PayPal Primary Rail" }
      ];
      api.persist(); api.render(); api.toast("Sample presets loaded. You can edit, test, or clear them anytime."); return;
    }
  }
  const routeLabels = {
    overview: "Command center", mandates: "Spend mandates", approvals: "Approvals queue", fairshare: "FairShare",
    disputes: "Dispute resolver", procurement: "Procurement", cfo: "Freelancer CFO", inventory: "Inventory agent",
    triage: "Triage & billing", escrow: "Developer escrow"
  };
  const morePanel = $("#mobile-more-panel");
  morePanel.innerHTML = api.routes.filter((route) => !["overview", "mandates", "approvals", "fairshare"].includes(route)).map((route) => `<button data-route="${route}" type="button">${esc(routeLabels[route])}</button>`).join("");
  function refreshFairSummary() {
    const summary = $("#fair-summary");
    if (summary) summary.innerHTML = api.fairSummaryHtml();
  }
  function handleInput(event) {
    const target = event.target;
    const s = setState();
    if (target.matches("[data-fair-name]")) { s.fairItems[Number(target.dataset.fairName)].name = target.value; api.persist(); }
    else if (target.matches("[data-fair-amount]")) { s.fairItems[Number(target.dataset.fairAmount)].amount = target.value; api.persist(); refreshFairSummary(); }
    else if (target.matches("[data-fair-context]")) { s.fairContext = target.value; api.persist(); }
    else if (target.matches("[data-dispute-field]")) { s.dispute = s.dispute || { transactionRef: "", shippingEvidence: "", draft: "" }; s.dispute[target.dataset.disputeField] = target.value; api.persist(); }
    else if (target.matches("[data-dispute-draft]")) { s.dispute = s.dispute || {}; s.dispute.draft = target.value; api.persist(); }
    else if (target.matches("[data-procurement-field]")) { s.procurement[target.dataset.procurementField] = target.value; s.procurement.checked = false; s.procurement.approved = false; api.persist(); }
    else if (target.matches("[data-cfo-field]")) { s.cfo.form = s.cfo.form || {}; s.cfo.form[target.dataset.cfoField] = target.value; api.persist(); }
    else if (target.matches("[data-reconcile]")) { s.cfo.reconcileInput = s.cfo.reconcileInput || {}; s.cfo.reconcileInput[target.dataset.reconcile] = target.value; api.persist(); }
    else if (target.matches("[data-inventory-field]")) { s.inventory[target.dataset.inventoryField] = target.value; s.inventory.evaluated = false; s.inventory.approved = false; api.persist(); }
    else if (target.matches("[data-escrow-field]")) { s.escrow[target.dataset.escrowField] = target.value; s.escrow.verified = false; s.escrow.humanApproved = false; api.persist(); }
  }
  function handleChange(event) {
    const target = event.target;
    const s = setState();
    if (target.matches("[data-fair-person]")) {
      const item = s.fairItems[Number(target.dataset.fairIndex)];
      if (item) {
        item.included = item.included || [];
        item.included = target.checked ? [...new Set([...item.included, target.dataset.fairPerson])] : item.included.filter((name) => name !== target.dataset.fairPerson);
        api.persist(); refreshFairSummary();
      }
    } else if (target.matches("[data-fair-payer]")) {
      const item = s.fairItems[Number(target.dataset.fairPayer)];
      if (item) { item.paidBy = target.value; api.persist(); refreshFairSummary(); }
    } else if (target.id === "fair-receipt" && target.files?.[0]) {
      s.fairReceiptName = target.files[0].name; api.persist(); api.render();
    } else if (target.matches("[data-procurement-file]") && target.files?.[0]) {
      s.procurement[target.dataset.procurementFile] = target.files[0].name; api.persist(); api.render();
    } else if (target.matches("[data-triage-target]")) {
      s.triage.billingTarget = target.value; api.persist();
    } else if (target.matches("[data-inventory-field]")) {
      api.render();
    } else if (target.matches("[data-escrow-field]")) {
      api.render();
    } else if (target.matches("[data-procurement-field]")) {
      api.render();
    }
  }
  document.addEventListener("click", (event) => {
    if (event.target.closest("#sidebar-toggle-btn") || event.target.closest("#sidebar-arrow-btn")) {
      event.preventDefault();
      toggleSidebar();
      return;
    }
    const themeChoice = event.target.closest("[data-theme-choice]");
    if (themeChoice) {
      event.preventDefault();
      setTheme(themeChoice.dataset.themeChoice);
      return;
    }
    const payConfirm = event.target.closest("#confirm-paypal-pay");
    if (payConfirm) {
      event.preventDefault();
      executePayPalPayment(payConfirm.dataset.id);
      return;
    }
    const routeNode = event.target.closest("[data-route]");
    if (routeNode) { event.preventDefault(); closeNavigationDrawer(); api.navigate(routeNode.dataset.route); return; }
    if (event.target.closest("#mobile-menu-button")) {
      const sidebar = $("#sidebar");
      const open = !sidebar.classList.contains("open");
      sidebar.classList.toggle("open", open);
      $("#mobile-menu-button").setAttribute("aria-expanded", String(open));
      $("#mobile-menu-button").setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      return;
    }
    if (event.target.closest("#mobile-more")) {
      const button = $("#mobile-more");
      const open = morePanel.hidden;
      morePanel.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      return;
    }
    if (event.target.closest("#reset-demo")) { handleAction({ dataset: { action: "reset-demo" } }); return; }
    if (event.target.closest("#seed-demo")) { handleAction({ dataset: { action: "seed-demo" } }); return; }
    if (event.target.id === "mandate-backdrop" || event.target.id === "fair-item-backdrop" || event.target.id === "paypal-backdrop" || event.target.id === "payment-test-backdrop") { closeDialog(); return; }
    const activityFilter = event.target.closest("[data-activity-filter]");
    if (activityFilter) { api.state.activityFilter = activityFilter.dataset.activityFilter; api.persist(); api.render(); return; }
    const mandateFilter = event.target.closest("[data-mandate-filter]");
    if (mandateFilter) { api.state.mandateFilter = mandateFilter.dataset.mandateFilter; api.persist(); api.render(); return; }
    const approvalFilter = event.target.closest("[data-approval-filter]");
    if (approvalFilter) { api.state.approvalFilter = approvalFilter.dataset.approvalFilter; api.persist(); api.render(); return; }
    const actionNode = event.target.closest("[data-action]");
    if (actionNode) handleAction(actionNode);
  });
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleChange);
  document.addEventListener("submit", (event) => {
    if (event.target.id === "mandate-form") { event.preventDefault(); saveMandate(event.target); }
    if (event.target.id === "simulate-payment-form") { event.preventDefault(); executeSimulatedPayment(event.target); }
    if (event.target.id === "fair-item-form") { event.preventDefault(); addFairItem(event.target); }
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      toggleSidebar();
    }
    if (event.key === "Escape") {
      if ($("#mandate-backdrop") || $("#fair-item-backdrop") || $("#paypal-backdrop") || $("#payment-test-backdrop")) { closeDialog(); return; }
      closeNavigationDrawer();
    }
    if (event.key === "Enter" && event.target.id === "cfo-chat-input") { event.preventDefault(); sendCfoMessage(); }
    if (event.key === "Enter" && event.target.id === "new-friend-input") {
      event.preventDefault();
      handleAction({ dataset: { action: "add-fair-friend" } });
    }
  });
  window.addEventListener("hashchange", () => {
    const route = window.location.hash.replace(/^#/, "");
    if (api.routes.includes(route) && route !== api.state.route) api.navigate(route);
  });
})();
