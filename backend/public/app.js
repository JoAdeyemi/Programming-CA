const API = "http://localhost:4000/api";
const $ = (id) => document.querySelector(id);

let editingPayerId = null;
let editingAssessmentId = null;

/* ================= TABS ================= */
document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  };
});

/* ================= TAXPAYERS ================= */
async function loadTaxpayers() {
  const res = await fetch(`${API}/taxpayers`);
  const taxpayers = await res.json();

  $("#payerSelect").innerHTML =
    `<option value="">Select taxpayer</option>` +
    taxpayers.map(t => `<option value="${t.payerId}">${t.payerId} - ${t.lastName}</option>`).join("");

  $("#taxpayerTable tbody").innerHTML = taxpayers.map(t => `
    <tr>
      <td>${t.payerId}</td>
      <td>${t.firstName} ${t.lastName}</td>
      <td>${t.email}</td>
      <td>₦${t.annualIncome}</td>
      <td>
        <button onclick="editTaxpayer('${t.payerId}')">Edit</button>
        <button onclick="deleteTaxpayer('${t.payerId}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

$("#registerForm").onsubmit = async (e) => {
  e.preventDefault();

  const data = {
    payerId: editingPayerId || `P-${Date.now()}`,
    firstName: $("#firstName").value,
    lastName: $("#lastName").value,
    email: $("#email").value,
    phone: $("#phone").value,
    address: $("#address").value,
    dob: $("#dob").value,
    occupation: $("#occupation").value,
    annualIncome: Number($("#annualIncome").value),
  };

  const method = editingPayerId ? "PUT" : "POST";
  const url = editingPayerId
    ? `${API}/taxpayers/${editingPayerId}`
    : `${API}/taxpayers`;

  await fetch(url, {
    method,
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data)
  });

  editingPayerId = null;
  $("#registerTitle").textContent = "Register New Taxpayer";
  $("#registerForm").reset();
  loadTaxpayers();
};

async function editTaxpayer(id) {
  const res = await fetch(`${API}/taxpayers/${id}`);
  const t = await res.json();

  Object.keys(t).forEach(k => {
    if ($(`#${k}`)) $(`#${k}`).value = t[k];
  });

  editingPayerId = id;
  $("#registerTitle").textContent = "Update Taxpayer";
  document.querySelector('[data-tab="register"]').click();
}

async function deleteTaxpayer(id) {
  if (!confirm("Delete taxpayer?")) return;
  await fetch(`${API}/taxpayers/${id}`, { method: "DELETE" });
  loadTaxpayers();
}

/* ================= ASSESSMENTS ================= */
function computeTax(taxable) {
  const band = 36800;
  return taxable <= band
    ? taxable * 0.2
    : band * 0.2 + (taxable - band) * 0.4;
}

$("#assessmentForm").onsubmit = async (e) => {
  e.preventDefault();

  const declared = Number($("#declaredIncome").value || 0);
  const other = Number($("#otherIncome").value || 0);
  const pension = Number($("#pensionRelief").value || 0);

  const total = declared + other;
  const relief = total * 0.2;
  const taxable = Math.max(0, total - pension - relief);
  const taxDue = computeTax(taxable);

  const data = {
    assessmentId: editingAssessmentId || `A-${Date.now()}`,
    payerId: $("#payerSelect").value,
    year: Number($("#taxYear").value),
    declaredIncome: declared,
    otherIncome: other,
    totalIncome: total,
    pensionRelief: pension,
    consolidatedRelief: relief,
    taxable,
    taxDue
  };

  const method = editingAssessmentId ? "PUT" : "POST";
  const url = editingAssessmentId
    ? `${API}/assessments/${editingAssessmentId}`
    : `${API}/assessments`;

  await fetch(url, {
    method,
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data)
  });

  editingAssessmentId = null;
  $("#assessmentTitle").textContent = "Raise Tax Assessment";
  $("#computeBtn").textContent = "Compute & Save Assessment";
  loadAssessments();
};

async function loadAssessments() {
  const res = await fetch(`${API}/assessments`);
  const list = await res.json();

  $("#assessmentTable tbody").innerHTML = list.map(a => `
    <tr>
      <td>${a.assessmentId}</td>
      <td>${a.payerId}</td>
      <td>${a.year}</td>
      <td>₦${a.taxable}</td>
      <td>₦${a.taxDue}</td>
      <td>
        <button onclick="editAssessment('${a.assessmentId}')">Edit</button>
        <button onclick="deleteAssessment('${a.assessmentId}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

async function editAssessment(id) {
  const res = await fetch(`${API}/assessments/${id}`);
  const a = await res.json();

  $("#payerSelect").value = a.payerId;
  $("#taxYear").value = a.year;
  $("#declaredIncome").value = a.declaredIncome;
  $("#otherIncome").value = a.otherIncome;
  $("#pensionRelief").value = a.pensionRelief;

  editingAssessmentId = id;
  $("#assessmentTitle").textContent = "Update Tax Assessment";
  $("#computeBtn").textContent = "Update & Save Assessment";
  document.querySelector('[data-tab="assessment"]').click();
}

async function deleteAssessment(id) {
  if (!confirm("Delete assessment?")) return;
  await fetch(`${API}/assessments/${id}`, { method: "DELETE" });
  loadAssessments();
}

/* ================= INIT ================= */
loadTaxpayers();
loadAssessments();
