// ======================================================
// Taxpayer Registry & Assessment Backend API
// Node.js + Express + SQLite3
// ======================================================
const { calculateTax } = require("./utils/tax");

const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

/* ======================================================
   CORS — MUST COME FIRST
   ====================================================== */

app.use(
  cors({
    origin: "*", // ✅ Allow all origins (safe for CA/demo)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// Handle preflight requests
app.options("*", cors());

/* ======================================================
   BODY PARSER
   ====================================================== */

app.use(express.json());

/* ======================================================
   STATIC FRONTEND (optional, local only)
   ====================================================== */

app.use(express.static(path.join(__dirname, "public")));

/* ======================================================
   DATABASE SETUP (SQLite)
   ====================================================== */

const dbPath = path.join(__dirname, "tax_app.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("SQLite connection error:", err.message);
  } else {
    console.log("Connected to SQLite:", dbPath);
  }
});

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS taxpayers (
      payerId TEXT PRIMARY KEY,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      address TEXT,
      dob TEXT,
      occupation TEXT,
      annualIncome REAL NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS assessments (
      assessmentId TEXT PRIMARY KEY,
      payerId TEXT NOT NULL,
      year INTEGER NOT NULL,
      declaredIncome REAL NOT NULL,
      otherIncome REAL NOT NULL,
      totalIncome REAL NOT NULL,
      pensionRelief REAL NOT NULL,
      consolidatedRelief REAL NOT NULL,
      taxable REAL NOT NULL,
      taxDue REAL NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (payerId) REFERENCES taxpayers(payerId)
    )
  `);
});

/* ======================================================
   ERROR HELPER
   ====================================================== */

function dbError(res, err, message = "Database error") {
  console.error(message, err);
  res.status(500).json({ error: message });
}

/* ======================================================
   TAXPAYERS API
   ====================================================== */

// Get all taxpayers
app.get("/api/taxpayers", (req, res) => {
  db.all(
    "SELECT * FROM taxpayers ORDER BY createdAt DESC",
    [],
    (err, rows) => {
      if (err) return dbError(res, err);
      res.json(rows);
    }
  );
});

// Get one taxpayer
app.get("/api/taxpayers/:payerId", (req, res) => {
  db.get(
    "SELECT * FROM taxpayers WHERE payerId = ?",
    [req.params.payerId],
    (err, row) => {
      if (err) return dbError(res, err);
      if (!row) return res.status(404).json({ error: "Taxpayer not found" });
      res.json(row);
    }
  );
});

// Create taxpayer
app.post("/api/taxpayers", (req, res) => {
  const {
    payerId,
    firstName,
    lastName,
    email,
    phone,
    address,
    dob,
    occupation,
    annualIncome,
  } = req.body;

  if (!payerId || !firstName || !lastName || !email || annualIncome == null) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const createdAt = new Date().toISOString();

  db.run(
    `
    INSERT INTO taxpayers (
      payerId, firstName, lastName, email, phone,
      address, dob, occupation, annualIncome, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      payerId,
      firstName,
      lastName,
      email.toLowerCase(),
      phone || null,
      address || null,
      dob || null,
      occupation || null,
      annualIncome,
      createdAt,
    ],
    function (err) {
      if (err)
        return res.status(400).json({ error: "Could not create taxpayer" });

      res.status(201).json({
        message: "Taxpayer created",
        payerId,
      });
    }
  );
});

// Update taxpayer
app.put("/api/taxpayers/:payerId", (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    address,
    dob,
    occupation,
    annualIncome,
  } = req.body;

  db.run(
    `
    UPDATE taxpayers SET
      firstName = ?, lastName = ?, email = ?, phone = ?,
      address = ?, dob = ?, occupation = ?, annualIncome = ?
    WHERE payerId = ?
  `,
    [
      firstName,
      lastName,
      email.toLowerCase(),
      phone || null,
      address || null,
      dob || null,
      occupation || null,
      annualIncome,
      req.params.payerId,
    ],
    function (err) {
      if (err) return dbError(res, err);
      if (this.changes === 0)
        return res.status(404).json({ error: "Taxpayer not found" });

      res.json({ message: "Taxpayer updated" });
    }
  );
});

// Delete taxpayer
app.delete("/api/taxpayers/:payerId", (req, res) => {
  db.run(
    "DELETE FROM taxpayers WHERE payerId = ?",
    [req.params.payerId],
    function (err) {
      if (err) return dbError(res, err);
      if (this.changes === 0)
        return res.status(404).json({ error: "Taxpayer not found" });

      res.json({ message: "Taxpayer deleted" });
    }
  );
});

/* ======================================================
   ASSESSMENTS API
   ====================================================== */

// Get all assessments
app.get("/api/assessments", (req, res) => {
  db.all(
    "SELECT * FROM assessments ORDER BY createdAt DESC",
    [],
    (err, rows) => {
      if (err) return dbError(res, err);
      res.json(rows);
    }
  );
});

// Create assessment
app.post("/api/assessments", (req, res) => {
  const {
    assessmentId,
    payerId,
    year,
    declaredIncome,
    otherIncome,
    pensionRelief,
    consolidatedRelief
  } = req.body;

  const totalIncome = declaredIncome + otherIncome;
  const taxable = Math.max(
    0,
    totalIncome - pensionRelief - consolidatedRelief
  );

  const taxDue = calculateTax(taxable); // ✅ HERE

  const createdAt = new Date().toISOString();

  db.run(
    `
    INSERT INTO assessments (
      assessmentId, payerId, year, declaredIncome, otherIncome,
      totalIncome, pensionRelief, consolidatedRelief,
      taxable, taxDue, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      assessmentId,
      payerId,
      year,
      declaredIncome,
      otherIncome,
      totalIncome,
      pensionRelief,
      consolidatedRelief,
      taxable,
      taxDue,
      createdAt
    ],
    function (err) {
      if (err) return res.status(500).json({ error: "Could not create assessment" });

      res.status(201).json({
        message: "Assessment created",
        assessmentId,
        taxDue
      });
    }
  );
});


// Delete assessment
app.delete("/api/assessments/:assessmentId", (req, res) => {
  db.run(
    "DELETE FROM assessments WHERE assessmentId = ?",
    [req.params.assessmentId],
    function (err) {
      if (err) return dbError(res, err);
      if (this.changes === 0)
        return res.status(404).json({ error: "Assessment not found" });

      res.json({ message: "Assessment deleted" });
    }
  );
});

/* ======================================================
   ROOT (Health Check)
   ====================================================== */

app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Tax API running" });
});

/* ======================================================
   START SERVER
   ====================================================== */

if (require.main === module) {
  app.listen(PORT, () =>
    console.log(`Backend running at http://localhost:${PORT}`)
  );
}

module.exports = app;

