/* ======================================================
   Taxpayer Registry & Assessment – Frontend Controller
   Backend: Node.js + Express + SQLite
   ====================================================== */

const API_BASE = "https://taxpayer-registry-api.onrender.com/api";


/* =======================
   SEQUENCES (local only)
   ======================= */
const SEQ_KEY = "tax_mvp_sequences";

function initSequences() {
  if (!localStorage.getItem(SEQ_KEY)) {
    localStorage.setItem(SEQ_KEY, JSON.stringify({ payer: 0, assess: 0 }));
  }
}

function nextPayerId() {
  const seq = JSON.parse(localStorage.getItem(SEQ_KEY));
  seq.payer++;
  localStorage.setItem(SEQ_KEY, JSON.stringify(seq));
  const d = new Date();
  return `P-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${String(seq.payer).padStart(4, "0")}`;
}

function nextAssessmentId(year) {
  const seq = JSON.parse(localStorage.getItem(SEQ_KEY));
  seq.assess++;
  localStorage.setItem(SEQ_KEY, JSON.stringify(seq));
  return `A-${year}-${String(seq.assess).padStart(4, "0")}`;
}

/* =======================
   IN-MEMORY CACHE
   ======================= */
let taxpayers = [];
let assessments = [];

window.editingPayerId = null;
window.editingAssessmentId = null;

/* =======================
   API HELPER
   ======================= */
async function api(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  // If backend returns empty body sometimes, guard:
  let data = null;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    const msg = data?.error || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/* =======================
   DOM HELPERS
   ======================= */
const $ = (s) => document.querySelector(s);

function toast(el, msg, type = "success") {
  if (!el) return;

  // If a notice is showing, do not overwrite/clear it
  if (el.querySelector(".notice")) return;

  el.textContent = msg;
  el.className = `msg ${type}`;

  clearTimeout(el._toastTimer);
  el._toastTimer = setTimeout(() => {
    // still do not clear if notice exists
    if (el.querySelector(".notice")) return;
    el.textContent = "";
    el.className = "msg";
  }, 3000);
}

/* =======================
   LOAD FROM BACKEND
   ======================= */
async function loadTaxpayers() {
  taxpayers = await api("/taxpayers");
  renderTaxpayerTable();
  renderTaxpayerOptions();
}

async function loadAssessments() {
  assessments = await api("/assessments");
  renderAssessmentTable();
}

/* =======================
   TAXPAYERS (CRUD)
   ======================= */
async function onRegisterSubmit(e) {
  e.preventDefault();
  const msg = $("#registerMsg");

  const record = {
    payerId: window.editingPayerId || nextPayerId(),
    firstName: $("#firstName").value.trim(),
    lastName: $("#lastName").value.trim(),
    email: $("#email").value.trim().toLowerCase(),
    phone: $("#phone").value.trim(),
    address: $("#address").value.trim(),
    dob: $("#dob").value,
    occupation: $("#occupation").value.trim(),
    annualIncome: Number($("#annualIncome").value),
    createdAt: new Date().toISOString()
  };

  if (!record.firstName || !record.lastName || !record.email) {
    toast(msg, "Required fields missing", "error");
    return;
  }

  // ---------- SAVE ----------
  if (window.editingPayerId) {
    await api(`/taxpayers/${record.payerId}`, {
      method: "PUT",
      body: JSON.stringify(record)
    });
    window.editingPayerId = null;
  } else {
    await api("/taxpayers", {
      method: "POST",
      body: JSON.stringify(record)
    });
  }

  // ---------- SHOW SUCCESS (DO NOT RESET YET) ----------
  msg.innerHTML = `
    <div class="notice">
      <h3>Registration Successful</h3>
      <p><strong>Payer ID:</strong> ${record.payerId}</p>
      <p>Name: ${record.firstName} ${record.lastName}</p>
      <p>Email: ${record.email}</p>
      <p>Annual Income: ₦${record.annualIncome.toLocaleString()}</p>
      <br>
      <button id="closeNotice">Close</button>
    </div>
  `;

  // ---------- WAIT FOR USER ----------
  document.querySelector("#closeNotice").onclick = async () => {
    msg.innerHTML = "";
    $("#registerForm").reset();          // ✅ reset AFTER close
    await loadTaxpayers();               // ✅ reload AFTER close
  };
}


/* ---- Taxpayer Row Actions ---- */
function viewTaxpayer(id) {
  const t = taxpayers.find(x => x.payerId === id);
  if (!t) return alert("Taxpayer not found.");
  alert(
    `Taxpayer Details\n\n` +
    `Payer ID: ${t.payerId}\n` +
    `Name: ${t.firstName} ${t.lastName}\n` +
    `Email: ${t.email}\n` +
    `Phone: ${t.phone || "-"}\n` +
    `Annual Income: ₦${Number(t.annualIncome || 0).toLocaleString()}`
  );
}

function editTaxpayer(id) {
  const t = taxpayers.find(x => x.payerId === id);
  if (!t) return alert("Taxpayer not found.");

  window.editingPayerId = id;

  $("#firstName").value = t.firstName || "";
  $("#lastName").value = t.lastName || "";
  $("#email").value = t.email || "";
  $("#phone").value = t.phone || "";
  $("#address").value = t.address || "";
  $("#dob").value = t.dob || "";
  $("#occupation").value = t.occupation || "";
  $("#annualIncome").value = t.annualIncome || 0;

  // switch tab
  document.querySelector('[data-tab="register"]')?.click();

  // (Optional) change button text if you want
  const btn = $("#registerForm button[type='submit']");
  if (btn) btn.textContent = "Update";
  const title = document.querySelector("#register h2");
  if (title) title.textContent = "Update Taxpayer";
}

async function deleteTaxpayer(id) {
  if (!confirm("Delete this taxpayer? This cannot be undone.")) return;
  await api(`/taxpayers/${id}`, { method: "DELETE" });
  await loadTaxpayers();
  await loadAssessments();
}

/* =======================
   ASSESSMENTS (CRUD)
   ======================= */
function computeTax(taxable) {
  const FLAT_TAX_RATE = 0.23; // 23%
  return +(taxable * FLAT_TAX_RATE).toFixed(2);
}


function updateIncomeDisplays() {
  const declared = Number($("#declaredIncome")?.value || 0);
  const other = Number($("#otherIncome")?.value || 0);
  const total = declared + other;
  const relief = +(total * 0.2).toFixed(2);

  $("#totalIncomeDisplay").textContent = `₦${total.toLocaleString()}`;
  $("#consolDisplay").textContent = `₦${relief.toLocaleString()}`;
}

async function onAssessmentSubmit(e) {
  e.preventDefault();
  const msg = $("#assessmentResult");

  const payerId = $("#payerSelect").value;
  const year = Number($("#taxYear").value);

  if (!payerId || !year) {
    toast(msg, "Please select a taxpayer and enter a valid year.", "error");
    return;
  }

  const declared = Number($("#declaredIncome").value || 0);
  const other = Number($("#otherIncome").value || 0);
  const pension = Number($("#pensionRelief").value || 0);

  // ✅ correct computation
  const total = declared + other;
  const relief = +(total * 0.2).toFixed(2);
  const taxable = Math.max(0, total - pension - relief);
  const taxDue = computeTax(taxable);

  const record = {
    assessmentId: window.editingAssessmentId || nextAssessmentId(year),
    payerId,
    year,
    declaredIncome: declared,
    otherIncome: other,
    totalIncome: total,
    pensionRelief: pension,
    consolidatedRelief: relief,
    taxable,
    taxDue,
    createdAt: new Date().toISOString()
  };

  try {
    if (window.editingAssessmentId) {
      await api(`/assessments/${record.assessmentId}`, {
        method: "PUT",
        body: JSON.stringify(record)
      });
      window.editingAssessmentId = null;

      // reset heading/button if you want
      const title = document.querySelector("#assessment h2");
      if (title) title.textContent = "Raise Tax Assessment";
      const btn = $("#computeBtn");
      if (btn) btn.textContent = "Compute & Save Assessment";

      toast(msg, "Assessment updated successfully.");
    } else {
      await api("/assessments", {
        method: "POST",
        body: JSON.stringify(record)
      });
      toast(msg, "Assessment created successfully.");
    }

    $("#assessmentForm").reset();
    updateIncomeDisplays();
    await loadAssessments();

  } catch (err) {
    toast(msg, err.message || "Assessment failed.", "error");
  }
}

/* ---- Assessment Row Actions (FIXED) ---- */
function viewAssessment(id) {
  const a = assessments.find(x => x.assessmentId === id);
  if (!a) return alert("Assessment not found.");

  alert(
    `Assessment Details\n\n` +
    `Assessment ID: ${a.assessmentId}\n` +
    `Payer ID: ${a.payerId}\n` +
    `Year: ${a.year}\n` +
    `Declared Income: ₦${Number(a.declaredIncome || 0).toLocaleString()}\n` +
    `Other Income: ₦${Number(a.otherIncome || 0).toLocaleString()}\n` +
    `Total Income: ₦${Number(a.totalIncome || 0).toLocaleString()}\n` +
    `Pension Relief: ₦${Number(a.pensionRelief || 0).toLocaleString()}\n` +
    `Consolidated Relief (20%): ₦${Number(a.consolidatedRelief || 0).toLocaleString()}\n` +
    `Taxable: ₦${Number(a.taxable || 0).toLocaleString()}\n` +
    `Tax Due: ₦${Number(a.taxDue || 0).toLocaleString()}`
  );
}

function editAssessment(id) {
  const a = assessments.find(x => x.assessmentId === id);
  if (!a) return alert("Assessment not found.");

  window.editingAssessmentId = id;

  $("#payerSelect").value = a.payerId;
  $("#taxYear").value = a.year;
  $("#declaredIncome").value = a.declaredIncome || 0;
  $("#otherIncome").value = a.otherIncome || 0;
  $("#pensionRelief").value = a.pensionRelief || 0;

  updateIncomeDisplays();

  // switch tab
  document.querySelector('[data-tab="assessment"]')?.click();

  // change heading/button
  const title = document.querySelector("#assessment h2");
  if (title) title.textContent = "Tax Assessment Update";

  const btn = $("#computeBtn");
  if (btn) btn.textContent = "Update & Save Assessment";
}

async function deleteAssessment(id) {
  if (!confirm("Delete this assessment? This cannot be undone.")) return;
  await api(`/assessments/${id}`, { method: "DELETE" });
  await loadAssessments();
}

/* =======================
   RENDERING
   ======================= */
function renderTaxpayerOptions() {
  const sel = $("#payerSelect");
  if (!sel) return;

  sel.innerHTML =
    `<option value="">-- choose --</option>` +
    taxpayers.map(t => `<option value="${t.payerId}">${t.payerId} – ${t.lastName}</option>`).join("");
}

function renderTaxpayerTable() {
  const tbody = $("#taxpayerTable tbody");
  if (!tbody) return;

  tbody.innerHTML =
    taxpayers.map(t => `
      <tr>
        <td>${t.payerId}</td>
        <td>${t.lastName}, ${t.firstName}</td>
        <td>${t.email}</td>
        <td>₦${Number(t.annualIncome || 0).toLocaleString()}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-view" onclick="viewTaxpayer('${t.payerId}')">View</button>
            <button class="btn-edit" onclick="editTaxpayer('${t.payerId}')">Edit</button>
            <button class="btn-delete" onclick="deleteTaxpayer('${t.payerId}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");
}

function renderAssessmentTable() {
  const tbody = document.querySelector("#assessmentTable tbody");
  if (!tbody) return;

  tbody.innerHTML = assessments.map(a => `
    <tr>
      <td>${a.assessmentId}</td>
      <td>${a.payerId}</td>
      <td>${a.year}</td>
      <td>₦${Number(a.declaredIncome).toLocaleString()}</td>
      <td>₦${Number(a.otherIncome).toLocaleString()}</td>
      <td>₦${Number(a.totalIncome).toLocaleString()}</td>
      <td>₦${Number(a.pensionRelief).toLocaleString()}</td>
      <td>₦${Number(a.consolidatedRelief).toLocaleString()}</td>
      <td>₦${Number(a.taxDue).toLocaleString()}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-view"
            onclick="viewAssessment('${a.assessmentId}')">View</button>
          <button class="btn-edit"
            onclick="editAssessment('${a.assessmentId}')">Edit</button>
          <button class="btn-delete"
            onclick="deleteAssessment('${a.assessmentId}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}



/* =======================
   TABS (ensure working)
   ======================= */
function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  const sections = document.querySelectorAll(".tab-content");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(b => b.classList.remove("active"));
      tab.classList.add("active");

      sections.forEach(s => s.classList.remove("active"));
      document.getElementById(tab.dataset.tab)?.classList.add("active");
    });
  });
}

/* =======================
   BOOTSTRAP
   ======================= */
document.addEventListener("DOMContentLoaded", async () => {
  initSequences();
  setupTabs();

  $("#registerForm")?.addEventListener("submit", onRegisterSubmit);
  $("#assessmentForm")?.addEventListener("submit", onAssessmentSubmit);

  // ✅ auto-fill declared income from registration (annualIncome)
  $("#payerSelect")?.addEventListener("change", () => {
    const id = $("#payerSelect").value;
    const t = taxpayers.find(x => x.payerId === id);
    if (t) $("#declaredIncome").value = Number(t.annualIncome || 0);
    updateIncomeDisplays();
  });

  // live updates
  ["#declaredIncome", "#otherIncome", "#pensionRelief"].forEach(sel => {
    $(sel)?.addEventListener("input", updateIncomeDisplays);
  });

  await loadTaxpayers();
  await loadAssessments();
  updateIncomeDisplays();
});
