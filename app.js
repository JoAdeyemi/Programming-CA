/* =======================
   Data Model & Utilities
   =======================

Taxpayer {
  payerId: string, // e.g., P-202511-0007
  firstName, lastName, email, phone, address, dob, occupation,
  annualIncome: number,
  createdAt: ISO string
}

Assessment {
  assessmentId: string, // e.g., A-2025-0001
  payerId: string,
  year: number,
  declaredIncome: number,
  deductions: number,
  taxable: number,
  taxDue: number,
  createdAt: ISO string
}
*/

const STORAGE_KEYS = {
  taxpayers: "tax_mvp_taxpayers",
  assessments: "tax_mvp_assessments",
  seq: "tax_mvp_sequences"
};

const store = {
  get(key, fallback) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }
};

function initSequences() {
  const seq = store.get(STORAGE_KEYS.seq, null);
  if (!seq) {
    store.set(STORAGE_KEYS.seq, { payer: 0, assess: 0 });
  }
}

function nextPayerId() {
  const seq = store.get(STORAGE_KEYS.seq, { payer: 0, assess: 0 });
  seq.payer += 1;
  store.set(STORAGE_KEYS.seq, seq);
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const n = String(seq.payer).padStart(4, "0");
  return `P-${y}${m}-${n}`;
}

function nextAssessmentId(year) {
  const seq = store.get(STORAGE_KEYS.seq, { payer: 0, assess: 0 });
  seq.assess += 1;
  store.set(STORAGE_KEYS.seq, seq);
  const n = String(seq.assess).padStart(4, "0");
  return `A-${year}-${n}`;
}

function getTaxpayers() {
  return store.get(STORAGE_KEYS.taxpayers, []);
}
function setTaxpayers(list) {
  store.set(STORAGE_KEYS.taxpayers, list);
}

function getAssessments() {
  return store.get(STORAGE_KEYS.assessments, []);
}
function setAssessments(list) {
  store.set(STORAGE_KEYS.assessments, list);
}

/* =======================
   Tax Computation (Simple)
   =======================
   Progressive brackets (example):
   - 0 – 36,800 @ 20%
   - Above 36,800 @ 40%
*/
function computeTax(taxable) {
  const band = 36800;
  const lowRate = 0.20;
  const highRate = 0.40;

  const lowPart = Math.min(taxable, band);
  const highPart = Math.max(0, taxable - band);

  return +(lowPart * lowRate + highPart * highRate).toFixed(2);
}

/* =======================
   DOM Helpers
   ======================= */
const $ = (sel) => document.querySelector(sel);
function renderOptions(selectEl, taxpayers) {
  selectEl.innerHTML = `<option value="">-- choose --</option>` +
    taxpayers
      .map(t => `<option value="${t.payerId}">${t.payerId} — ${t.lastName}, ${t.firstName}</option>`)
      .join("");
}
function toast(el, msg, type = "success") {
  el.textContent = msg;
  el.className = `msg ${type}`;
  setTimeout(() => { el.textContent = ""; el.className = "msg"; }, 4000);
}

/* =======================
   Registration
   ======================= */
function onRegisterSubmit(e) {
  e.preventDefault();
  const msgEl = $("#registerMsg");
  const firstName = $("#firstName").value.trim();
  const lastName = $("#lastName").value.trim();
  const email = $("#email").value.trim().toLowerCase();
  const phone = $("#phone").value.trim();
  const address = $("#address").value.trim();
  const dob = $("#dob").value;
  const occupation = $("#occupation").value.trim();
  const annualIncome = parseFloat($("#annualIncome").value);

  if (!firstName || !lastName || !email || Number.isNaN(annualIncome) || annualIncome < 0) {
    toast(msgEl, "Please fill all required fields correctly.", "error");
    return;
  }

  const taxpayers = getTaxpayers();

  // Prevent duplicate email
  if (taxpayers.some(t => t.email === email)) {
    toast(msgEl, "A taxpayer with this email already exists.", "error");
    return;
  }

  const payerId = nextPayerId();
  const record = {
    payerId,
    firstName, lastName, email, phone, address, dob, occupation,
    annualIncome,
    createdAt: new Date().toISOString()
  };

  taxpayers.push(record);
  setTaxpayers(taxpayers);
  $("#registerForm").reset();
  refreshAllTables();
  refreshSelects();
msgEl.innerHTML = `
<div class="notice">
Registration Successful!<br>
<strong>Payer ID:</strong> ${payerId}<br><br>
This ID has been generated and recorded.<br>
Please keep it safe.
<br><br>
<button id="closeNotice">Close</button>
</div>
`;
document.querySelector("#closeNotice").onclick = () => {
  msgEl.innerHTML = "";
};

}

/* =======================
   Assessment
   ======================= */
function onAssessmentSubmit(e) {
  e.preventDefault();

  const payerId = $("#payerSelect").value;
  const year = parseInt($("#taxYear").value);
  const declaredIncome = parseFloat($("#declaredIncome").value) || 0;
  const otherIncome = parseFloat($("#otherIncome").value) || 0;
  const pensionRelief = parseFloat($("#pensionRelief").value) || 0;

  // Total income and deductions
  const totalIncome = declaredIncome + otherIncome;
  const deductions = +(totalIncome * 0.20).toFixed(2);

  // Taxable & tax due
  let taxable =
    totalIncome -
    deductions -
    pensionRelief -
    consolidatedRelief;

  if (taxable < 0) taxable = 0;

  const taxDue = computeTax(taxable);

  const resEl = $("#assessmentResult");
  resEl.innerHTML = "";

  if (!payerId || isNaN(year) || isNaN(declaredIncome)) {
    resEl.innerHTML = `<p class="msg error">Please enter valid values.</p>`;
    return;
  }

  const assessmentId = nextAssessmentId(year);

  const assessment = {
    assessmentId,
    payerId,
    year,
    declaredIncome,
    otherIncome,
    totalIncome,
    deductions,
    pensionRelief,
    consolidatedRelief,
    taxable,
    taxDue,
    createdAt: new Date().toISOString()
  };

  const assessments = getAssessments();
  assessments.push(assessment);
  setAssessments(assessments);

  refreshAllTables();

  resEl.innerHTML = `
    <h3>Assessment Created</h3>
    <p><strong>Payer:</strong> ${payerId}</p>
    <p><strong>Declared Income:</strong> €${declaredIncome.toLocaleString()}</p>
    <p><strong>Other Income:</strong> €${otherIncome.toLocaleString()}</p>
    <p><strong>Total Income:</strong> €${totalIncome.toLocaleString()}</p>
    <p><strong>Allowable Deductions (10%):</strong> €${deductions.toLocaleString()}</p>
    <p><strong>Pension Relief:</strong> €${pensionRelief.toLocaleString()}</p>
    <p><strong>Consolidated Relief (20%):</strong> €${consolidatedRelief.toLocaleString()}</p>
    <p><strong>Taxable Income:</strong> €${taxable.toLocaleString()}</p>
    <p><strong>Tax Due:</strong> €${taxDue.toLocaleString()}</p>
  `;
}


/* =======================
   Records (Tables/Search)
   ======================= */
function renderTaxpayerTable(filter = "") {
  const tbody = $("#taxpayerTable tbody");
  const list = getTaxpayers();
  const term = filter.trim().toLowerCase();

  const rows = list
    .filter(t =>
      !term ||
      t.payerId.toLowerCase().includes(term) ||
      t.email.toLowerCase().includes(term) ||
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(term)
    )
    .map(t => `
      <tr>
        <td>${t.payerId}</td>
        <td>${t.lastName}, ${t.firstName}</td>
        <td>${t.email}</td>
        <td>${t.phone || ""}</td>
        <td>€${(+t.annualIncome).toLocaleString()}</td>
      </tr>
    `).join("");

  tbody.innerHTML = rows || `<tr><td colspan="5" style="opacity:.7">No taxpayers yet.</td></tr>`;
}

function renderAssessmentTable() {
  const tbody = $("#assessmentTable tbody");
  const list = getAssessments();

  tbody.innerHTML = list.length
    ? list.slice().reverse().map(a => `
      <tr>
        <td>${a.assessmentId}</td>
        <td>${a.payerId}</td>
        <td>${a.year}</td>
        <td>€${a.declaredIncome.toLocaleString()}</td>
        <td>€${a.otherIncome.toLocaleString()}</td>
        <td>€${a.taxable.toLocaleString()}</td>
        <td>€${a.taxDue.toLocaleString()}</td>
        <td>${new Date(a.createdAt).toLocaleString()}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="8" style="opacity:.7">No assessments yet.</td></tr>`;
}

function refreshSelects() {
  renderOptions($("#payerSelect"), getTaxpayers());
}

function refreshAllTables() {
  renderTaxpayerTable($("#searchBox").value || "");
  renderAssessmentTable();
}

/* =======================
   Import/Export
   ======================= */
function exportJSON() {
  const payload = {
    taxpayers: getTaxpayers(),
    assessments: getAssessments(),
    sequences: store.get(STORAGE_KEYS.seq, { payer: 0, assess: 0 })
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tax-data-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.taxpayers) || !Array.isArray(data.assessments)) {
        alert("Invalid file structure.");
        return;
      }
      setTaxpayers(data.taxpayers);
      setAssessments(data.assessments);
      if (data.sequences) store.set(STORAGE_KEYS.seq, data.sequences);
      refreshAllTables();
      refreshSelects();
      alert("Import successful.");
    } catch {
      alert("Failed to parse JSON.");
    }
  };
  reader.readAsText(file);
}

/* =======================
   Tabs & Event Bindings
   ======================= */
function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  const sections = document.querySelectorAll(".tab-content");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(b => b.classList.remove("active"));
      tab.classList.add("active");
      sections.forEach(s => s.classList.remove("active"));
      const targetId = tab.dataset.tab;
      document.getElementById(targetId).classList.add("active");
    });
  });
}

document.addEventListener("DOMContentLoaded", setupTabs);

function setupEvents() {

  // Register taxpayer form
  $("#registerForm").addEventListener("submit", onRegisterSubmit);

  // Assessment form
  $("#assessmentForm").addEventListener("submit", onAssessmentSubmit);

  // Search taxpayers
  $("#searchBox").addEventListener("input", (e) => {
    renderTaxpayerTable(e.target.value);
  });

  // When selecting a taxpayer, auto-load declared income
$("#payerSelect").addEventListener("change", () => {
  const payerId = $("#payerSelect").value;
  const taxpayers = getTaxpayers();
  const t = taxpayers.find(x => x.payerId === payerId);

  if (t) {
    const income = parseFloat(t.annualIncome) || 0;
    $("#declaredIncome").value = income;

    // Auto-update total income and relief
    updateIncomeCalculations();
  }
});

// When "Other Income" changes, update total income & relief
$("#otherIncome").addEventListener("input", updateIncomeCalculations);

// Reusable function
function updateIncomeCalculations() {
  const declared = parseFloat($("#declaredIncome").value) || 0;
  const other = parseFloat($("#otherIncome").value) || 0;

  const total = declared + other;
  const relief = +(total * 0.10).toFixed(2);

  $("#totalIncomeDisplay").textContent = `€${total.toLocaleString()}`;
  $("#reliefDisplay").textContent = `€${relief.toLocaleString()}`;
}


  // Export JSON
  $("#exportBtn").addEventListener("click", exportJSON);

  
  // Import JSON triggers hidden file input
  $("#importBtn").addEventListener("click", () => {
    $("#importFile").click();
  });

  // Handle JSON file selection
  $("#importFile").addEventListener("change", (e) => {
    if (e.target.files?.[0]) {
      importJSON(e.target.files[0]);
    }
  });

}


/* =======================
   Bootstrap
   ======================= */
(function bootstrap() {
  initSequences();
  setupTabs();
  setupEvents();

  // Force render tables on load
  refreshAllTables();
  refreshSelects();

  // Force tab initialization (critical fix)
  document.querySelector('.tab[data-tab="records"]').click();
  document.querySelector('.tab[data-tab="register"]').click();
})();


