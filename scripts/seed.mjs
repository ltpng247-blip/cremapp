// ---------------------------------------------------------------------------
// NJSS Registrar mobile — backend seed (service role, run once).
//   bun scripts/seed.mjs
// Reuses the EXISTING tables. Idempotent: clears prior FF3-MOB-/FF4-MOB- rows.
// Discovers the allowed status/urgency values so we never break a CHECK
// constraint. Writes credentials + chosen values to scripts/seed-result.txt.
// ---------------------------------------------------------------------------
import { writeFileSync } from "node:fs";

const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

const REGISTRAR_ROLE_ID = "0cff046e-1773-4a38-a4db-a523dec894f2";
const NJSS_DEPT_ID = "f3053501-3912-4248-a1c4-833e2233d9b3";
const REG_EMAIL = "registrar@pngjudiciary.gov.pg";
const REG_PASSWORD = "Registrar#2026";

const LOG = [];
const flush = () => writeFileSync("scripts/seed-result.txt", LOG.join("\n") + "\n");
const log = (...a) => { LOG.push(a.join(" ")); flush(); };

async function rest(method, path, body, extra = {}) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(`${U}/rest/v1/${path}`, {
      method,
      headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json", ...extra },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const txt = await r.text();
    let json = null;
    try { json = JSON.parse(txt); } catch {}
    return { status: r.status, txt, json };
  } catch (e) {
    return { status: 0, txt: String(e?.name || e), json: null };
  } finally { clearTimeout(to); }
}
const get = (p) => rest("GET", p);
const insert = (t, row) => rest("POST", t, row, { Prefer: "return=representation" });
const insertMany = (t, rows) => rest("POST", t, rows, { Prefer: "return=representation" });
const patch = (t, filter, row) => rest("PATCH", `${t}?${filter}`, row, { Prefer: "return=representation" });
const del = (t, filter) => rest("DELETE", `${t}?${filter}`);

async function authAdmin(method, path, body) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(`${U}/auth/v1/${path}`, {
      method,
      headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const txt = await r.text();
    let json = null; try { json = JSON.parse(txt); } catch {}
    return { status: r.status, txt, json };
  } catch (e) { return { status: 0, txt: String(e), json: null }; }
  finally { clearTimeout(to); }
}

const isoDaysFromNow = (d) => new Date(Date.now() + d * 86400000).toISOString();
const dateDaysFromNow = (d) => isoDaysFromNow(d).slice(0, 10);
const round = (n) => Math.max(1, Math.round(n));

// --------------------------------------------------------------------------
(async () => {
  log(`SEED ${new Date().toISOString()}`);

  // 1) Registrar auth user ------------------------------------------------
  log("\n== Registrar login ==");
  let authId = null;
  const created = await authAdmin("POST", "admin/users", {
    email: REG_EMAIL, password: REG_PASSWORD, email_confirm: true,
    user_metadata: { full_name: "Ian Augerea", title: "Registrar" },
  });
  if (created.status === 200 || created.status === 201) {
    authId = created.json?.id;
    log(`created auth user ${REG_EMAIL} id=${authId}`);
  } else {
    log(`create returned ${created.status}: ${created.txt.slice(0, 160)}`);
    // already exists -> find it
    const list = await authAdmin("GET", "admin/users?per_page=200");
    const u = (list.json?.users || []).find((x) => x.email === REG_EMAIL);
    authId = u?.id;
    // ensure password is set to known value
    if (authId) {
      await authAdmin("PUT", `admin/users/${authId}`, { password: REG_PASSWORD, email_confirm: true });
      log(`reused existing auth user id=${authId}, password reset`);
    }
  }

  // users row + role
  let regUserId = null;
  const existingUser = await get(`users?email=eq.${encodeURIComponent(REG_EMAIL)}&select=id,auth_user_id`);
  if (existingUser.json?.[0]) {
    regUserId = existingUser.json[0].id;
    await patch("users", `id=eq.${regUserId}`, { auth_user_id: authId, position: "Registrar", is_active: true });
    log(`reused users row ${regUserId}`);
  } else {
    const ins = await insert("users", {
      auth_user_id: authId, full_name: "Ian Augerea", email: REG_EMAIL,
      position: "Registrar", department_id: NJSS_DEPT_ID, is_active: true,
    });
    regUserId = ins.json?.[0]?.id;
    log(`inserted users row ${regUserId} (status ${ins.status}) ${ins.status >= 400 ? ins.txt.slice(0, 200) : ""}`);
  }
  if (regUserId) {
    const hasRole = await get(`user_roles?user_id=eq.${regUserId}&role_id=eq.${REGISTRAR_ROLE_ID}&select=id`);
    if (!hasRole.json?.[0]) {
      const ir = await insert("user_roles", { user_id: regUserId, role_id: REGISTRAR_ROLE_ID });
      log(`assigned Registrar role (status ${ir.status})`);
    } else log("Registrar role already assigned");
  }

  // 2) Reference data -----------------------------------------------------
  log("\n== Reference data ==");
  const allocsRes = await get("budget_allocations?select=id,financial_year,department_id,section_id,cost_centre_id,expense_code_registry_id,revised_budget&is_active=eq.true&limit=20");
  const allocs = allocsRes.json || [];
  const ctrlRes = await get("v_budget_control?select=budget_allocation_id,quarterly_released,committed_amount,actual_expenditure,available_balance");
  const ctrlBy = {};
  for (const c of ctrlRes.json || []) ctrlBy[c.budget_allocation_id] = c;
  const usableAllocs = allocs
    .filter((a) => a.expense_code_registry_id && a.cost_centre_id && a.department_id)
    .map((a) => {
      const c = ctrlBy[a.id] || {};
      const released = Number(c.quarterly_released ?? a.revised_budget ?? 0);
      const committed = Number(c.committed_amount ?? 0);
      const actual = Number(c.actual_expenditure ?? 0);
      const available = c.available_balance != null ? Number(c.available_balance) : released - committed - actual;
      return { ...a, released, committed, actual, available: available > 0 ? available : Number(a.revised_budget || 100000) };
    });
  log(`budget_allocations usable: ${usableAllocs.length}`);
  if (usableAllocs.length === 0) { log("NO USABLE ALLOCATIONS — abort"); flush(); return; }

  const usersRes = await get(`users?select=id,full_name,position&is_active=eq.true&email=neq.${encodeURIComponent(REG_EMAIL)}&limit=20`);
  const officers = (usersRes.json || []).filter((u) => u.id !== regUserId);
  const officer = (i) => officers[i % officers.length] || officers[0] || { id: null, full_name: "Officer" };
  const fy = usableAllocs[0].financial_year || new Date().getFullYear();

  // 3) Discover allowed status / urgency ----------------------------------
  log("\n== Discovery ==");
  const baseAlloc = usableAllocs[0];
  const baseFF3 = (extra) => ({
    ff3_number: `FF3-PROBE-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    financial_year: fy, request_date: dateDaysFromNow(0),
    department_id: baseAlloc.department_id, section_id: baseAlloc.section_id,
    cost_centre_id: baseAlloc.cost_centre_id, expense_code_registry_id: baseAlloc.expense_code_registry_id,
    purpose: "probe", justification: "probe", procurement_method: "QUOTATION",
    total_estimated_amount: 1000, is_within_budget: true, status: "APPROVED", urgency_level: "MEDIUM",
    ...extra,
  });
  async function probe(field, candidates) {
    const ok = [];
    for (const v of candidates) {
      const r = await insert("ff3_headers", baseFF3({ [field]: v }));
      if (r.status === 201) { ok.push(v); const id = r.json?.[0]?.id; if (id) await del("ff3_headers", `id=eq.${id}`); }
      else log(`  probe ${field}=${v} -> ${r.status} ${r.txt.slice(0, 90)}`);
    }
    return ok;
  }
  const okStatus = await probe("status", ["SUBMITTED", "PENDING", "PENDING_APPROVAL", "ENDORSED", "UNDER_REVIEW", "RETURNED", "REJECTED", "DRAFT", "APPROVED"]);
  const okUrg = await probe("urgency_level", ["LOW", "MEDIUM", "HIGH", "CRITICAL", "URGENT"]);
  log(`allowed status: ${JSON.stringify(okStatus)}`);
  log(`allowed urgency: ${JSON.stringify(okUrg)}`);
  const pick = (list, prefs, fb) => prefs.find((p) => list.includes(p)) || fb;
  const ST = {
    pending: pick(okStatus, ["SUBMITTED", "PENDING_APPROVAL", "PENDING", "ENDORSED", "UNDER_REVIEW"], "SUBMITTED"),
    approved: pick(okStatus, ["APPROVED"], "APPROVED"),
    rejected: pick(okStatus, ["REJECTED"], "REJECTED"),
    returned: pick(okStatus, ["RETURNED"], "RETURNED"),
  };
  const URG = {
    critical: pick(okUrg, ["CRITICAL", "URGENT", "HIGH"], "MEDIUM"),
    urgent: pick(okUrg, ["HIGH", "URGENT"], "MEDIUM"),
    routine: pick(okUrg, ["MEDIUM", "LOW"], "MEDIUM"),
    low: pick(okUrg, ["LOW", "MEDIUM"], "MEDIUM"),
  };

  // FF4 status discovery
  const sampleFF3 = await get("ff3_headers?select=id&status=eq.APPROVED&limit=1");
  const sampleCmt = await get("ff3_commitments?select=id&limit=1");
  let okFF4 = [];
  if (sampleFF3.json?.[0] && sampleCmt.json?.[0]) {
    const baseFF4 = (extra) => ({
      ff4_number: `FF4-PROBE-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
      ff3_header_id: sampleFF3.json[0].id, commitment_id: sampleCmt.json[0].id,
      financial_year: fy, payment_request_date: dateDaysFromNow(0),
      payee_type: "SUPPLIER", payee_name: "probe", gross_amount: 100,
      payment_method: "EFT", status: "PAID", ...extra,
    });
    for (const v of ["SUBMITTED", "VERIFIED", "PENDING", "PENDING_APPROVAL", "APPROVED", "REJECTED", "RETURNED", "PAID"]) {
      const r = await insert("ff4_headers", baseFF4({ status: v }));
      if (r.status === 201) { okFF4.push(v); const id = r.json?.[0]?.id; if (id) await del("ff4_headers", `id=eq.${id}`); }
      else log(`  probe ff4.status=${v} -> ${r.status} ${r.txt.slice(0, 90)}`);
    }
  }
  log(`allowed ff4 status: ${JSON.stringify(okFF4)}`);
  const FF4ST = {
    pending: pick(okFF4, ["SUBMITTED", "VERIFIED", "PENDING_APPROVAL", "PENDING"], "SUBMITTED"),
    approved: pick(okFF4, ["APPROVED"], "APPROVED"),
    rejected: pick(okFF4, ["REJECTED"], "REJECTED"),
    returned: pick(okFF4, ["RETURNED"], "RETURNED"),
  };

  // 4) Clean prior mobile seed -------------------------------------------
  log("\n== Cleanup prior FF3-MOB / FF4-MOB ==");
  async function cleanupFF(table, numCol, childTables) {
    const ex = await get(`${table}?select=id&${numCol}=like.*-MOB-*`);
    const ids = (ex.json || []).map((r) => r.id);
    if (!ids.length) return 0;
    const inList = `(${ids.join(",")})`;
    for (const ct of childTables) await del(ct.t, `${ct.fk}=in.${inList}`);
    await del(table, `id=in.${inList}`);
    return ids.length;
  }
  // payment_transactions + ff4 attachments first
  const ff4Ids = (await get("ff4_headers?select=id&ff4_number=like.*-MOB-*")).json?.map((r) => r.id) || [];
  if (ff4Ids.length) {
    const inl = `(${ff4Ids.join(",")})`;
    await del("payment_transactions", `ff4_header_id=in.${inl}`);
    await del("ff4_attachments", `ff4_header_id=in.${inl}`);
    await del("ff4_headers", `id=in.${inl}`);
  }
  const c3 = await cleanupFF("ff3_headers", "ff3_number", [
    { t: "ff3_items", fk: "ff3_header_id" },
    { t: "ff3_quotations", fk: "ff3_header_id" },
    { t: "ff3_attachments", fk: "ff3_header_id" },
    { t: "ff3_approvals", fk: "ff3_header_id" },
    { t: "ff3_commitments", fk: "ff3_header_id" },
  ]);
  await del("notifications", `reference_id=like.*-MOB-*`);
  await del("audit_logs", `entity_reference=like.*-MOB-*`);
  log(`cleaned ${ff4Ids.length} ff4, ${c3} ff3 + children`);

  // 5) Seed pending FF3 ---------------------------------------------------
  log("\n== Seed pending FF3 ==");
  const SUPPLIERS = ["Pacific Office Supplies Ltd", "Niugini ICT Solutions", "Highlands Motors Ltd", "Moresby Legal Books", "Guard Force PNG Ltd", "Coral Sea Catering"];
  const PURPOSES = [
    { p: "Supply and installation of courtroom audio-recording equipment", j: "Two district courtrooms require digital audio recorders to comply with the new evidence-recording directive ahead of the sittings.", items: [["Digital court recorder unit", "unit", 2], ["Ceiling microphone set", "set", 4], ["Installation & commissioning", "lot", 1]] },
    { p: "Emergency repair of the Chief Justice's official vehicle", j: "The official vehicle has a major transmission fault and is grounded. Repair is critical for circuit court movements this week.", items: [["Transmission overhaul", "job", 1], ["Replacement parts", "set", 1], ["Labour", "lot", 1]] },
    { p: "Restocking of the National Court legal library", j: "Annual replenishment of statutes, law reports and reference texts for judges and associates.", items: [["PNG Law Reports (set)", "set", 3], ["Commonwealth statutes", "set", 2], ["Reference texts", "lot", 1]] },
    { p: "Procurement of ICT equipment for the Registry", j: "Replacement of failed registry workstations and a network printer to clear the case-filing backlog.", items: [["Desktop workstation", "unit", 6], ["Network laser printer", "unit", 1], ["UPS units", "unit", 6]] },
    { p: "Security guard services for the National Court precinct", j: "Quarterly engagement of licensed guards for the court precinct and registry strong-room.", items: [["Guard services (quarter)", "month", 3], ["Patrol vehicle hire", "month", 3]] },
    { p: "Circuit court travel and accommodation — Highlands", j: "Travel, accommodation and per-diem for the circuit court team covering the Highlands region.", items: [["Airfares", "trip", 6], ["Accommodation", "night", 30], ["Per-diem", "day", 30]] },
  ];
  const scenarios = [
    { urg: URG.urgent, factor: 0.5, due: 0.4 },
    { urg: URG.critical, factor: 0.18, due: -0.2 },   // overdue
    { urg: URG.urgent, factor: 0.42, due: 1.2 },
    { urg: URG.routine, factor: 0.9, due: 5 },          // LOW budget
    { urg: URG.routine, factor: 1.35, due: 8 },         // EXCEEDED budget
    { urg: URG.routine, factor: 0.6, due: 12, highValue: true },
  ];
  const pendingFF3 = [];
  for (let i = 0; i < scenarios.length; i++) {
    const a = usableAllocs[i % usableAllocs.length];
    const c = ctrlBy[a.id] || {};
    const available = a.available;
    let amount = round(available * scenarios[i].factor);
    if (scenarios[i].highValue) amount = Math.max(amount, 80000);
    const off = officer(i);
    const num = `FF3-MOB-${String(i + 1).padStart(4, "0")}`;
    const submittedAt = isoDaysFromNow(-2 - i * 0.3);
    const row = {
      ff3_number: num, financial_year: a.financial_year || fy, request_date: dateDaysFromNow(-3 - i),
      requesting_officer_id: off.id, department_id: a.department_id, section_id: a.section_id,
      cost_centre_id: a.cost_centre_id, expense_code_registry_id: a.expense_code_registry_id,
      purpose: PURPOSES[i].p, justification: PURPOSES[i].j,
      required_by_date: dateDaysFromNow(scenarios[i].due < 0 ? 1 : Math.ceil(scenarios[i].due) + 2),
      urgency_level: scenarios[i].urg, procurement_method: "QUOTATION",
      selected_supplier_name: SUPPLIERS[i % SUPPLIERS.length],
      supplier_selection_justification: "Lowest compliant quotation of three obtained.",
      status: ST.pending, submitted_date: submittedAt,
      supervisor_endorsed_date: isoDaysFromNow(-1.5 - i * 0.3), section_head_endorsed_date: isoDaysFromNow(-1.2 - i * 0.3),
      total_estimated_amount: amount, is_within_budget: amount <= available,
      created_at: isoDaysFromNow(-3 - i),
    };
    const r = await insert("ff3_headers", row);
    if (r.status !== 201) { log(`FF3 ${num} FAILED ${r.status}: ${r.txt.slice(0, 200)}`); continue; }
    const hid = r.json[0].id;
    pendingFF3.push({ id: hid, num, amount, available, dueDays: scenarios[i].due, urg: scenarios[i].urg });
    // items
    const items = PURPOSES[i].items;
    const baseUnit = amount / items.reduce((s, it) => s + it[2], 0);
    const itemRows = items.map((it, idx) => {
      const qty = it[2]; const unitPrice = round(baseUnit);
      return { ff3_header_id: hid, line_number: idx + 1, item_description: it[0], unit_of_measure: it[1], quantity: qty, estimated_unit_price: unitPrice };
    });
    const itemRes = await insertMany("ff3_items", itemRows);
    if (itemRes.status >= 400) log(`  items insert ${num} -> ${itemRes.status} ${itemRes.txt.slice(0, 120)}`);
    // quotations (3, one selected = chosen supplier)
    const qrows = [0, 1, 2].map((k) => ({
      ff3_header_id: hid, supplier_name: k === 0 ? SUPPLIERS[i % SUPPLIERS.length] : `${["Alt", "Bid", "Quote"][k]} Vendor ${k}`,
      quotation_number: `Q-${num}-${k + 1}`, quotation_date: dateDaysFromNow(-6 - i),
      quotation_amount: round(amount * (1 + k * 0.06)), is_selected: k === 0,
    }));
    await insertMany("ff3_quotations", qrows);
    // attachments
    await insertMany("ff3_attachments", [
      { ff3_header_id: hid, file_name: `Quotation - ${SUPPLIERS[i % SUPPLIERS.length]}.pdf`, file_type: "application/pdf", file_url: "", attachment_type: "QUOTATION" },
      { ff3_header_id: hid, file_name: "Supporting memo.pdf", file_type: "application/pdf", file_url: "", attachment_type: "SUPPORTING" },
    ]);
    // audit history
    await insertMany("audit_logs", [
      { action: "CREATED", entity_type: "FF3", entity_id: hid, entity_reference: num, user_name: off.full_name, created_at: isoDaysFromNow(-3 - i) },
      { action: "SUBMITTED", entity_type: "FF3", entity_id: hid, entity_reference: num, user_name: off.full_name, created_at: submittedAt },
      { action: "ENDORSED", entity_type: "FF3", entity_id: hid, entity_reference: num, user_name: "Section Head", created_at: isoDaysFromNow(-1.2 - i * 0.3) },
    ]);
    log(`FF3 ${num} amount=${amount} avail=${round(available)} urg=${scenarios[i].urg}`);
  }

  // 6) Approved FF3 + commitments (to back FF4) ---------------------------
  log("\n== Approved FF3 + commitments ==");
  const commitments = [];
  for (let k = 0; k < 2; k++) {
    const a = usableAllocs[(k + 2) % usableAllocs.length];
    const amount = round((a.available || 100000) * 0.7) || 50000;
    const num = `FF3-MOB-A${String(k + 1).padStart(3, "0")}`;
    const r = await insert("ff3_headers", {
      ff3_number: num, financial_year: a.financial_year || fy, request_date: dateDaysFromNow(-30),
      requesting_officer_id: officer(k).id, department_id: a.department_id, section_id: a.section_id,
      cost_centre_id: a.cost_centre_id, expense_code_registry_id: a.expense_code_registry_id,
      purpose: k === 0 ? "Supply of office furniture for new chambers" : "Annual maintenance of court air-conditioning",
      justification: "Approved under earlier procurement round.", procurement_method: "QUOTATION",
      selected_supplier_name: SUPPLIERS[k], status: ST.approved, submitted_date: isoDaysFromNow(-30),
      approved_date: isoDaysFromNow(-25), approved_by: regUserId, total_estimated_amount: amount, is_within_budget: true,
      created_at: isoDaysFromNow(-30),
    });
    if (r.status !== 201) { log(`approved FF3 ${num} FAILED ${r.txt.slice(0, 160)}`); continue; }
    const hid = r.json[0].id;
    const paid = k === 0 ? round(amount * 0.4) : round(amount * 0.85); // k1 leaves small balance -> exceed demo
    const remaining = amount - paid;
    const cnum = `CMT-MOB-${String(k + 1).padStart(3, "0")}`;
    const cr = await insert("ff3_commitments", {
      commitment_number: cnum, ff3_header_id: hid, budget_allocation_id: a.id, financial_year: a.financial_year || fy,
      commitment_date: dateDaysFromNow(-25), committed_amount: amount, paid_amount: paid,
      status: "PARTIALLY_PAID",
    });
    if (cr.status === 201) {
      commitments.push({ id: cr.json[0].id, num: cnum, ff3Id: hid, committed: amount, paid, remaining });
      log(`commitment ${cnum} committed=${amount} paid=${paid} remaining=${remaining}`);
    } else log(`commitment ${cnum} FAILED ${cr.txt.slice(0, 160)}`);
  }

  // 7) Pending FF4 --------------------------------------------------------
  log("\n== Seed pending FF4 ==");
  if (commitments.length >= 2) {
    const within = commitments[0];     // big remaining
    const tight = commitments[1];      // small remaining -> exceed
    const ff4Defs = [
      { cmt: within, net: round(within.remaining * 0.5), payee: SUPPLIERS[0], urg: URG.urgent, due: 0.5, desc: "Part-payment for office furniture (first delivery)" },
      { cmt: tight, net: round(tight.remaining * 1.6), payee: SUPPLIERS[1], urg: URG.urgent, due: 0.3, desc: "Payment for additional A/C maintenance works", exceeds: true },
      { cmt: within, net: round(within.remaining * 0.3), payee: SUPPLIERS[0], urg: URG.routine, due: 4, desc: "Progress payment for office furniture (second delivery)" },
    ];
    for (let i = 0; i < ff4Defs.length; i++) {
      const d = ff4Defs[i];
      const num = `FF4-MOB-${String(i + 1).padStart(4, "0")}`;
      const gross = round(d.net * 1.1); const tax = round(gross * 0.06); const ded = gross - tax - d.net;
      const submittedAt = isoDaysFromNow(-1 - i * 0.4);
      const r = await insert("ff4_headers", {
        ff4_number: num, ff3_header_id: d.cmt.ff3Id, commitment_id: d.cmt.id, financial_year: fy,
        payment_request_date: dateDaysFromNow(-2 - i), payee_type: "SUPPLIER", payee_name: d.payee,
        invoice_number: `INV-${1000 + i}`, invoice_date: dateDaysFromNow(-4 - i),
        payment_description: d.desc, gross_amount: gross, tax_amount: tax, deductions: ded > 0 ? ded : 0,
        payment_method: "EFT", status: FF4ST.pending, submitted_date: submittedAt,
        created_at: isoDaysFromNow(-2 - i),
      });
      if (r.status !== 201) { log(`FF4 ${num} FAILED ${r.status}: ${r.txt.slice(0, 200)}`); continue; }
      const hid = r.json[0].id;
      await insertMany("ff4_attachments", [
        { ff4_header_id: hid, file_name: `Invoice INV-${1000 + i}.pdf`, file_type: "application/pdf", file_url: "", attachment_type: "INVOICE" },
        { ff4_header_id: hid, file_name: "Delivery note.pdf", file_type: "application/pdf", file_url: "", attachment_type: "RECEIPT" },
      ]);
      await insertMany("audit_logs", [
        { action: "RAISED", entity_type: "FF4", entity_id: hid, entity_reference: num, user_name: "Accounts Officer", created_at: isoDaysFromNow(-2 - i) },
        { action: "SUBMITTED", entity_type: "FF4", entity_id: hid, entity_reference: num, user_name: "Finance Manager", created_at: submittedAt },
      ]);
      log(`FF4 ${num} net=${d.net} commitmentRemaining=${d.cmt.remaining}${d.exceeds ? " (EXCEEDS)" : ""}`);
    }
  } else log("not enough commitments for FF4 seed");

  // 8) Notifications for the Registrar ------------------------------------
  log("\n== Notifications ==");
  if (regUserId && pendingFF3.length) {
    const overdue = pendingFF3.find((f) => f.dueDays < 0) || pendingFF3[1];
    const notifs = [
      { notification_type: "ESCALATION", title: `Overdue approval — ${overdue.num}`, message: `${overdue.num} has passed its approval deadline and needs your urgent attention.`, reference_type: "FF3", reference_id: overdue.num, priority: "CRITICAL", created_at: isoDaysFromNow(-0.05) },
      { notification_type: "FF4_APPROVAL", title: "Payment approval required — FF4-MOB-0001", message: "A supplier payment is awaiting your approval.", reference_type: "FF4", reference_id: "FF4-MOB-0001", priority: "HIGH", created_at: isoDaysFromNow(-0.1) },
      { notification_type: "FF3_APPROVAL", title: `New requisition — ${pendingFF3[0].num}`, message: `${pendingFF3[0].num} has been endorsed and is awaiting your approval.`, reference_type: "FF3", reference_id: pendingFF3[0].num, priority: "HIGH", created_at: isoDaysFromNow(-0.2) },
      { notification_type: "BUDGET_ALERT", title: "Budget exceeded warning", message: `${(pendingFF3[4] || pendingFF3[0]).num} would exceed the available budget for its expense line.`, reference_type: "FF3", reference_id: (pendingFF3[4] || pendingFF3[0]).num, priority: "CRITICAL", created_at: isoDaysFromNow(-0.25) },
      { notification_type: "HIGH_VALUE", title: "High-value transaction", message: `${(pendingFF3[5] || pendingFF3[0]).num} is a high-value requisition requiring executive approval.`, reference_type: "FF3", reference_id: (pendingFF3[5] || pendingFF3[0]).num, priority: "MEDIUM", created_at: isoDaysFromNow(-0.4) },
      { notification_type: "REMINDER", title: "Approvals pending over 24h", message: "You have requisitions awaiting decision beyond the 24-hour target.", reference_type: "SYSTEM", reference_id: "SYS-MOB-1", priority: "LOW", created_at: isoDaysFromNow(-1) },
    ].map((n) => ({ ...n, user_id: regUserId, is_read: false }));
    const nr = await insertMany("notifications", notifs);
    log(`notifications inserted: ${nr.status} (${(nr.json || []).length})`);
  }

  // 9) Summary ------------------------------------------------------------
  log("\n== DONE ==");
  log(`REGISTRAR LOGIN: ${REG_EMAIL} / ${REG_PASSWORD}`);
  log(`registrar users.id=${regUserId} auth_user_id=${authId}`);
  log(`status map: ${JSON.stringify(ST)}`);
  log(`urgency map: ${JSON.stringify(URG)}`);
  log(`ff4 status map: ${JSON.stringify(FF4ST)}`);
  log(`pending FF3: ${pendingFF3.length}, commitments: ${commitments.length}`);
  flush();
})().catch((e) => { log("FATAL " + (e?.stack || e)); flush(); });
