
/* =======================
   API CONFIG & STORAGE
   ======================= */

const API_BASE = "http://localhost:4000/api";

const STORAGE_KEYS = {
  seq: "tax_mvp_sequences", // for payerId / assessmentId generation
};

const store = {
  get(key, fallback) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },
};

// In-memory caches for frontend
let taxpayersCache = [];
let assessmentsCache = [];

function getTaxpayers() {
  return taxpayersCache;
}
function setTaxpayers(list) {
  taxpayersCache = Array.isArray(list) ? list : [];
}
function getAssessments() {
  return assessmentsCache;
}
function setAssessments(list) {
  assessmentsCache = Array.isArray(list) ? list : [];
}

/* =======================
   API WRAPPERS
   ======================= */

// ---- Taxpayers ----
async function apiGetTaxpayers() {
  const res = await fetch(`${API_BASE}/taxpayers`);
  if (!res.ok) throw new Error("Failed to fetch taxpayers");
  return res.json();
}

async function apiCreateTaxpayer(data) {
  const res = await fetch(`${API_BASE}/taxpayers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function apiUpdateTaxpayer(payerId, data) {
  const res = await fetch(`${API_BASE}/taxpayers/${payerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function apiDeleteTaxpayer(payerId) {
  const res = await fetch(`${API_BASE}/taxpayers/${payerId}`, {
    method: "DELETE",
  });
  return res.json();
}

// ---- Assessments ----
async function apiGetAssessments() {
  const res = await fetch(`${API_BASE}/assessments`);
  if (!res.ok) throw new Error("Failed to fetch assessments");
  return res.json();
}

async function apiCreateAssessment(data) {
  const res = await fetch(`${API_BASE}/assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function apiUpdateAssessment(id, data) {
  const res = await fetch(`${API_BASE}/assessments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function apiDeleteAssessment(id) {
  const res = await fetch(`${API_BASE}/assessments/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

/* =======================
   SEQUENCES / IDs
   ======================= */

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

/* =======================
   TAX COMPUTATION
   ======================= */

function computeTax(taxable) {
  const band = 36800;
  const lowRate = 0.2;
  const highRate = 0.4;

  const lowPart = Math.min(taxable, band);
  const highPart = Math.max(0, taxable - band);

  return +(lowPart * lowRate + highPart * highRate).toFixed(2);
}

/* =======================
   DOM HELPERS
   ======================= */

const $ = (sel) => document.querySelector(sel);

function toast(el, msg, type = "success") {
  if (!el) return;
  el.textContent = msg;
  el.className = `msg ${type}`;
  setTimeout(() => {
    el.textContent = "";
    el.className = "msg";
  }, 3500);
}

function renderOptions(selectEl, taxpayers) {
  if (!selectEl) return;
  selectEl.innerHTML =
    `<option value="">-- choose --</option>` +
    taxpayers
      .map(
        (t) =>
          `<option value="${t.payerId}">${t.payerId} — ${t.lastName}, ${t.firstName}</option>`
      )
      .join("");
}

/* =======================
   GLOBAL EDIT FLAGS
   ======================= */

window.editingPayerId = null;
window.editingAssessmentId = null;

/* =======================
   REFRESH HELPERS
   ======================= */

async function refreshTaxpayersFromBackend() {
  try {
    const data = await apiGetTaxpayers();
    setTaxpayers(data);
    renderTaxpayerTable($("#searchBox")?.value || "");
    refreshSelects();
  } catch (err) {
    console.error("Failed to refresh taxpayers:", err);
  }
}

async function refreshAssessmentsFromBackend() {
  try {
    const data = await apiGetAssessments();
    setAssessments(data);
    renderAssessmentTable();
  } catch (err) {
    console.error("Failed to refresh assessments:", err);
  }
}

function refreshAllTables() {
  renderTaxpayerTable($("#searchBox") ? $("#searchBox").value : "");
  renderAssessmentTable();
}

/* =======================
   REGISTRATION (CREATE / UPDATE)
   ======================= */

function setRegisterFormMode(mode) {
  // mode: "create" | "update"
  const titleEl =
    document.querySelector("#register h2") || document.querySelector("#registerTitle");
  const btn = $("#registerForm button[type='submit']");

  if (titleEl) {
    titleEl.textContent =
      mode === "update" ? "Update Taxpayer" : "Register New Taxpayer";
  }
  if (btn) {
    btn.textContent = mode === "update" ? "Update" : "Register";
  }
}

async function onRegisterSubmit(e) {
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

  if (
    !firstName ||
    !lastName ||
    !email ||
    Number.isNaN(annualIncome) ||
    annualIncome < 0
  ) {
    toast(msgEl, "Please fill all required fields correctly.", "error");
    return;
  }

  const taxpayers = getTaxpayers();

  // ===== UPDATE MODE =====
  if (window.editingPayerId) {
    const idx = taxpayers.findIndex((t) => t.payerId === window.editingPayerId);
    if (idx === -1) {
      toast(msgEl, "Error: taxpayer not found.", "error");
      window.editingPayerId = null;
      setRegisterFormMode("create");
      return;
    }

    // Prevent duplicate email except self
    if (
      taxpayers.some(
        (t) => t.email === email && t.payerId !== window.editingPayerId
      )
    ) {
      toast(msgEl, "Another taxpayer with this email already exists.", "error");
      return;
    }

    const updated = {
      firstName,
      lastName,
      email,
      phone,
      address,
      dob,
      occupation,
      annualIncome,
    };

    await apiUpdateTaxpayer(window.editingPayerId, updated);

    window.editingPayerId = null;
    setRegisterFormMode("create");
    $("#registerForm").reset();
    await refreshTaxpayersFromBackend();
    toast(msgEl, "Taxpayer updated successfully.");
    return;
  }

  // ===== CREATE MODE =====

  if (taxpayers.some((t) => t.email === email)) {
    toast(msgEl, "A taxpayer with this email already exists.", "error");
    return;
  }

  const payerId = nextPayerId();
  const record = {
    payerId,
    firstName,
    lastName,
    email,
    phone,
    address,
    dob,
    occupation,
    annualIncome,
    createdAt: new Date().toISOString(),
  };

  const resp = await apiCreateTaxpayer(record);
  if (resp.error) {
    toast(msgEl, resp.error || "Failed to create taxpayer.", "error");
    return;
  }

  $("#registerForm").reset();
  await refreshTaxpayersFromBackend();

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
  const closeBtn = document.querySelector("#closeNotice");
  if (closeBtn) {
    closeBtn.onclick = () => {
      msgEl.innerHTML = "";
    };
  }
}

/* ===== Taxpayer Row Actions ===== */

function viewTaxpayer(payerId) {
  const t = getTaxpayers().find((x) => x.payerId === payerId);
  if (!t) return alert("Taxpayer not found.");
  alert(
    `Taxpayer Details\n\n` +
      `ID: ${t.payerId}\n` +
      `Name: ${t.firstName} ${t.lastName}\n` +
      `Email: ${t.email}\n` +
      `Phone: ${t.phone || "-"}\n` +
      `Address: ${t.address || "-"}\n` +
      `Annual Income: ₦${(+t.annualIncome).toLocaleString()}`
  );
}

function editTaxpayer(payerId) {
  const t = getTaxpayers().find((x) => x.payerId === payerId);
  if (!t) return alert("Taxpayer not found.");

  // Switch to Register tab
  const tabBtn = document.querySelector('.tab[data-tab="register"]');
  if (tabBtn) tabBtn.click();

  $("#firstName").value = t.firstName;
  $("#lastName").value = t.lastName;
  $("#email").value = t.email;
  $("#phone").value = t.phone || "";
  $("#address").value = t.address || "";
  $("#dob").value = t.dob || "";
  $("#occupation").value = t.occupation || "";
  $("#annualIncome").value = t.annualIncome || 0;

  window.editingPayerId = payerId;
  setRegisterFormMode("update");
  alert(
    "Editing mode activated for this taxpayer.\nUpdate the fields and click 'Update'."
  );
}

async function deleteTaxpayer(payerId) {
  if (!confirm("Delete this taxpayer? This cannot be undone.")) return;
  await apiDeleteTaxpayer(payerId);
  await refreshTaxpayersFromBackend();
  await refreshAssessmentsFromBackend(); // in case you later cascade/delete related assessments
}

/* =======================
   ASSESSMENT (CREATE / UPDATE)
   ======================= */

function setAssessmentFormMode(mode) {
  // mode: "create" | "update"
  const titleEl =
    $("#assessmentTitle") || document.querySelector("#assessment h2");
  const btn =
    $("#computeBtn") ||
    document.querySelector("#assessmentForm button[type='submit']");

  if (titleEl) {
    titleEl.textContent =
      mode === "update" ? "Tax Assessment Update" : "Raise Tax Assessment";
  }
  if (btn) {
    btn.textContent =
      mode === "update"
        ? "Update & Save Assessment"
        : "Compute & Save Assessment";
  }
}

function gatherAssessmentInputs() {
  const payerId = $("#payerSelect").value;
  const year = parseInt($("#taxYear").value, 10);
  const declaredIncome = parseFloat($("#declaredIncome").value) || 0;
  const otherIncome = parseFloat($("#otherIncome").value) || 0;
  const pensionRelief = parseFloat($("#pensionRelief").value) || 0;

  return { payerId, year, declaredIncome, otherIncome, pensionRelief };
}

function computeAssessmentFigures(inputs) {
  const { declaredIncome, otherIncome, pensionRelief } = inputs;
  const totalIncome = declaredIncome + otherIncome;
  const deductions = 0;
  const consolidatedRelief = +(totalIncome * 0.2).toFixed(2);

  let taxable = totalIncome - pensionRelief - consolidatedRelief;
  if (taxable < 0) taxable = 0;

  const taxDue = computeTax(taxable);

  return { totalIncome, deductions, consolidatedRelief, taxable, taxDue };
}

async function onAssessmentSubmit(e) {
  e.preventDefault();
  const msgEl = $("#assessmentResult");
  const inputs = gatherAssessmentInputs();
  const { payerId, year } = inputs;

  if (!payerId || isNaN(year)) {
    msgEl.innerHTML =
      `<p class="msg error">Please select a taxpayer and enter a valid year.</p>`;
    return;
  }

  const figures = computeAssessmentFigures(inputs);

  // =======================
  // UPDATE MODE
  // =======================
  if (window.editingAssessmentId) {
    const updated = {
      payerId: inputs.payerId,
      year,
      declaredIncome: inputs.declaredIncome,
      otherIncome: inputs.otherIncome,
      totalIncome: figures.totalIncome,
      pensionRelief: inputs.pensionRelief,
      consolidatedRelief: figures.consolidatedRelief,
      taxable: figures.taxable,
      taxDue: figures.taxDue,
    };

    await apiUpdateAssessment(window.editingAssessmentId, updated);

    window.editingAssessmentId = null;
    setAssessmentFormMode("create");
    await refreshAssessmentsFromBackend();
    toast(msgEl, "Assessment updated successfully.");
    return;
  }

  // =======================
  // CREATE NEW ASSESSMENT
  // =======================

  const assessmentId = nextAssessmentId(year);
  const assessment = {
    assessmentId,
    payerId,
    year,
    declaredIncome: inputs.declaredIncome,
    otherIncome: inputs.otherIncome,
    totalIncome: figures.totalIncome,
    pensionRelief: inputs.pensionRelief,
    consolidatedRelief: figures.consolidatedRelief,
    taxable: figures.taxable,
    taxDue: figures.taxDue,
    createdAt: new Date().toISOString(),
  };

  const resp = await apiCreateAssessment(assessment);
  if (resp.error) {
    toast(msgEl, resp.error || "Failed to create assessment.", "error");
    return;
  }

  await refreshAssessmentsFromBackend();

  msgEl.innerHTML = `
    <h3>Assessment Created</h3>
    <p><strong>Payer:</strong> ${payerId}</p>
    <p><strong>Declared Income:</strong> ₦${inputs.declaredIncome.toLocaleString()}</p>
    <p><strong>Other Income:</strong> ₦${inputs.otherIncome.toLocaleString()}</p>
    <p><strong>Total Income:</strong> ₦${figures.totalIncome.toLocaleString()}</p>
    <p><strong>Pension Relief:</strong> ₦${inputs.pensionRelief.toLocaleString()}</p>
    <p><strong>Consolidated Relief (20%):</strong> ₦${figures.consolidatedRelief.toLocaleString()}</p>
    <p><strong>Taxable Income:</strong> ₦${figures.taxable.toLocaleString()}</p>
    <p><strong>Tax Due:</strong> ₦${figures.taxDue.toLocaleString()}</p>
  `;
}

/* ===== Assessment Row Actions ===== */

function viewAssessment(assessmentId) {
  const a = getAssessments().find((x) => x.assessmentId === assessmentId);
  if (!a) return alert("Assessment not found.");
  alert(
    `Assessment Details\n\n` +
      `ID: ${a.assessmentId}\n` +
      `Payer ID: ${a.payerId}\n` +
      `Year: ${a.year}\n` +
      `Declared Income: ₦${(+a.declaredIncome || 0).toLocaleString()}\n` +
      `Other Income: ₦${(+a.otherIncome || 0).toLocaleString()}\n` +
      `Pension Relief: ₦${(+a.pensionRelief || 0).toLocaleString()}\n` +
      `Consolidated Relief: ₦${(+a.consolidatedRelief || 0).toLocaleString()}\n` +
      `Taxable: ₦${(+a.taxable || 0).toLocaleString()}\n` +
      `Tax Due: ₦${(+a.taxDue || 0).toLocaleString()}`
  );
}

function editAssessment(assessmentId) {
  const a = getAssessments().find((x) => x.assessmentId === assessmentId);
  if (!a) return alert("Assessment not found.");

  // Switch to Assessment tab
  const tabBtn = document.querySelector('.tab[data-tab="assessment"]');
  if (tabBtn) tabBtn.click();

  $("#payerSelect").value = a.payerId;
  $("#taxYear").value = a.year;
  $("#declaredIncome").value = a.declaredIncome;
  $("#otherIncome").value = a.otherIncome;
  $("#pensionRelief").value = a.pensionRelief || 0;

  updateIncomeCalculations();

  window.editingAssessmentId = assessmentId;
  setAssessmentFormMode("update");

  alert(
    "Editing mode activated for this assessment.\nUpdate the fields and click 'Update & Save Assessment'."
  );
}

async function deleteAssessment(id) {
  if (!confirm("Delete this assessment? This cannot be undone.")) return;
  await apiDeleteAssessment(id);
  await refreshAssessmentsFromBackend();
}

/* =======================
   RECORDS RENDERING
   ======================= */

function renderTaxpayerTable(filter = "") {
  const tbody = $("#taxpayerTable tbody");
  if (!tbody) return;

  const list = getTaxpayers();
  const term = (filter || "").trim().toLowerCase();

  const rows = list
    .filter(
      (t) =>
        !term ||
        t.payerId.toLowerCase().includes(term) ||
        t.email.toLowerCase().includes(term) ||
        `${t.firstName} ${t.lastName}`.toLowerCase().includes(term)
    )
    .map(
      (t) => `
      <tr>
        <td>${t.payerId}</td>
        <td>${t.lastName}, ${t.firstName}</td>
        <td>${t.email}</td>
        <td>${t.phone || ""}</td>
        <td>₦${(+t.annualIncome).toLocaleString()}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-view" onclick="viewTaxpayer('${t.payerId}')">View</button>
            <button class="btn-edit" onclick="editTaxpayer('${t.payerId}')">Edit</button>
            <button class="btn-delete" onclick="deleteTaxpayer('${t.payerId}')">Delete</button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");

  tbody.innerHTML =
    rows || `<tr><td colspan="6" style="opacity:.7">No taxpayers yet.</td></tr>`;
}

function renderAssessmentTable() {
  const tbody = $("#assessmentTable tbody");
  if (!tbody) return;

  const list = getAssessments();

  tbody.innerHTML = list.length
    ? list
        .slice()
        .reverse()
        .map((a) => {
          const declared = Number(a.declaredIncome || 0);
          const other = Number(a.otherIncome || 0);
          const taxable = Number(a.taxable || 0);
          const taxDue = Number(a.taxDue || 0);
          const created = a.createdAt
            ? new Date(a.createdAt).toLocaleString()
            : "";

          return `
        <tr>
          <td>${a.assessmentId}</td>
          <td>${a.payerId}</td>
          <td>${a.year}</td>
          <td>₦${declared.toLocaleString()}</td>
          <td>₦${other.toLocaleString()}</td>
          <td>₦${taxable.toLocaleString()}</td>
          <td>₦${taxDue.toLocaleString()}</td>
          <td>${created}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-view" onclick="viewAssessment('${a.assessmentId}')">View</button>
              <button class="btn-edit" onclick="editAssessment('${a.assessmentId}')">Edit</button>
              <button class="btn-delete" onclick="deleteAssessment('${a.assessmentId}')">Delete</button>
            </div>  
          </td>
        </tr>
      `;
        })
        .join("")
    : `<tr><td colspan="9" style="opacity:.7">No assessments yet.</td></tr>`;
}

function refreshSelects() {
  renderOptions($("#payerSelect"), getTaxpayers());
}

/* =======================
   IMPORT / EXPORT JSON
   ======================= */

function exportJSON() {
  const payload = {
    taxpayers: getTaxpayers(),
    assessments: getAssessments(),
    sequences: store.get(STORAGE_KEYS.seq, { payer: 0, assess: 0 }),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tax-data-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Simple import that POSTS all records to backend
function importJSON(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.taxpayers) || !Array.isArray(data.assessments)) {
        alert("Invalid file structure.");
        return;
      }

      // Optional: restore sequences
      if (data.sequences) store.set(STORAGE_KEYS.seq, data.sequences);

      // Push taxpayers
      for (const t of data.taxpayers) {
        try {
          await apiCreateTaxpayer(t);
        } catch (e) {
          console.warn("Skipping taxpayer on import:", t.payerId, e);
        }
      }

      // Push assessments
      for (const a of data.assessments) {
        try {
          await apiCreateAssessment(a);
        } catch (e) {
          console.warn("Skipping assessment on import:", a.assessmentId, e);
        }
      }

      await refreshTaxpayersFromBackend();
      await refreshAssessmentsFromBackend();
      alert("Import successful.");
    } catch (err) {
      console.error(err);
      alert("Failed to parse JSON.");
    }
  };
  reader.readAsText(file);
}

/* =======================
   TABS & EVENTS
   ======================= */

function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  const sections = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      tab.classList.add("active");

      sections.forEach((s) => s.classList.remove("active"));
      const targetId = tab.dataset.tab;
      const target = document.getElementById(targetId);
      if (target) target.classList.add("active");

      if (targetId === "assessment") {
        refreshSelects();
      }
    });
  });
}

function updateIncomeCalculations() {
  const declared = parseFloat($("#declaredIncome")?.value || "0") || 0;
  const other = parseFloat($("#otherIncome")?.value || "0") || 0;
  const total = declared + other;

  const consolidatedRelief = +(total * 0.2).toFixed(2);

  const totalEl = $("#totalIncomeDisplay");
  const consolEl = $("#consolDisplay");

  if (totalEl) totalEl.textContent = `₦${total.toLocaleString()}`;
  if (consolEl) consolEl.textContent = `₦${consolidatedRelief.toLocaleString()}`;
}

function setupEvents() {
  // Register form
  const regForm = $("#registerForm");
  if (regForm) {
    regForm.addEventListener("submit", onRegisterSubmit);
  }

  // Assessment form
  const assessForm = $("#assessmentForm");
  if (assessForm) {
    assessForm.addEventListener("submit", onAssessmentSubmit);
  }

  // Search box
  const search = $("#searchBox");
  if (search) {
    search.addEventListener("input", (e) => {
      renderTaxpayerTable(e.target.value);
    });
  }

  // Payer selection auto-load declared income
  const payerSel = $("#payerSelect");
  if (payerSel) {
    payerSel.addEventListener("change", () => {
      const payerId = payerSel.value;
      const taxpayers = getTaxpayers();
      const t = taxpayers.find((x) => x.payerId === payerId);
      if (t) {
        $("#declaredIncome").value = parseFloat(t.annualIncome) || 0;
      }
      updateIncomeCalculations();
    });
  }

  // Income & pension fields live update
  ["#declaredIncome", "#otherIncome", "#pensionRelief"].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("input", updateIncomeCalculations);
  });

  // Export / Import
  const exportBtn = $("#exportBtn");
  const importBtn = $("#importBtn");
  const importFile = $("#importFile");

  if (exportBtn) exportBtn.addEventListener("click", exportJSON);
  if (importBtn && importFile) {
    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", (e) => {
      if (e.target.files?.[0]) {
        importJSON(e.target.files[0]);
        e.target.value = "";
      }
    });
  }
}

/* =======================
   BOOTSTRAP
   ======================= */

(async function bootstrap() {
  initSequences();
  setupTabs();
  setupEvents();
  setRegisterFormMode("create");
  setAssessmentFormMode("create");

  await refreshTaxpayersFromBackend();
  await refreshAssessmentsFromBackend();
})();
