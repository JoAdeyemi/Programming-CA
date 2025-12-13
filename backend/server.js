// ======================================================
//  Taxpayer Registry & Assessment Backend API
//  Tools: Node.js + Express + SQLite3 + CORS
// ======================================================

const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 4000;

// -------------------- MIDDLEWARE --------------------
app.use(cors());           // allow frontend (browser) to call API
app.use(express.json());   // parse JSON bodies

// -------------------- DATABASE SETUP --------------------
const dbPath = path.join(__dirname, "tax_app.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("SQLite connection error:", err.message);
  else console.log("Connected to SQLite:", dbPath);
});

// Create required tables
db.serialize(() => {
  db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`);
  db.run(
  `INSERT OR IGNORE INTO users (email, password) VALUES (?, ?)`,
  ["20072545@dbs.ie", "admin"]
);

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

// Helper for DB errors
function dbError(res, err, message = "Database error") {
  console.error(message, err);
  res.status(500).json({ error: message });
}

// ======================================================
//  TAXPAYERS ENDPOINTS (CRUD)
// ======================================================

// Get all taxpayers
app.get("/api/taxpayers", (req, res) => {
  db.all("SELECT * FROM taxpayers ORDER BY createdAt DESC", [], (err, rows) => {
    if (err) return dbError(res, err);
    res.json(rows);
  });
});

// Get one taxpayer
app.get("/api/taxpayers/:payerId", (req, res) => {
  const { payerId } = req.params;
  db.get("SELECT * FROM taxpayers WHERE payerId = ?", [payerId], (err, row) => {
    if (err) return dbError(res, err);
    if (!row) return res.status(404).json({ error: "Taxpayer not found" });
    res.json(row);
  });
});

// Create taxpayer
app.post("/api/taxpayers", (req, res) => {
  const {
    payerId, firstName, lastName, email,
    phone, address, dob, occupation, annualIncome
  } = req.body;

  if (!payerId || !firstName || !lastName || !email || annualIncome == null) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const createdAt = new Date().toISOString();

  const sql = `
    INSERT INTO taxpayers (
      payerId, firstName, lastName, email, phone,
      address, dob, occupation, annualIncome, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql,
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
      if (err) {
        console.error(err);
        return res.status(400).json({ error: "Could not create taxpayer." });
      }
      res.status(201).json({ message: "Taxpayer created", payerId });
    }
  );
});

// Update taxpayer
app.put("/api/taxpayers/:payerId", (req, res) => {
  const { payerId } = req.params;
  const {
    firstName, lastName, email, phone,
    address, dob, occupation, annualIncome
  } = req.body;

  const sql = `
    UPDATE taxpayers SET
      firstName = ?, lastName = ?, email = ?, phone = ?,
      address = ?, dob = ?, occupation = ?, annualIncome = ?
    WHERE payerId = ?
  `;

  db.run(sql,
    [
      firstName,
      lastName,
      email.toLowerCase(),
      phone || null,
      address || null,
      dob || null,
      occupation || null,
      annualIncome,
      payerId,
    ],
    function (err) {
      if (err) return dbError(res, err);
      if (this.changes === 0)
        return res.status(404).json({ error: "Taxpayer not found" });

      res.json({ message: "Taxpayer updated", payerId });
    }
  );
});

// Delete taxpayer
app.delete("/api/taxpayers/:payerId", (req, res) => {
  const { payerId } = req.params;

  db.run("DELETE FROM taxpayers WHERE payerId = ?", [payerId], function (err) {
    if (err) return dbError(res, err);
    if (this.changes === 0)
      return res.status(404).json({ error: "Taxpayer not found" });

    res.json({ message: "Taxpayer deleted", payerId });
  });
});

// ======================================================
//  ASSESSMENTS ENDPOINTS (CRUD)
// ======================================================

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

// Get one assessment
app.get("/api/assessments/:assessmentId", (req, res) => {
  db.get(
    "SELECT * FROM assessments WHERE assessmentId = ?",
    [req.params.assessmentId],
    (err, row) => {
      if (err) return dbError(res, err);
      if (!row)
        return res.status(404).json({ error: "Assessment not found" });

      res.json(row);
    }
  );
});

// Create assessment
app.post("/api/assessments", (req, res) => {
  const {
    assessmentId, payerId, year,
    declaredIncome, otherIncome, totalIncome,
    pensionRelief, consolidatedRelief,
    taxable, taxDue
  } = req.body;

  const createdAt = new Date().toISOString();

  const sql = `
    INSERT INTO assessments (
      assessmentId, payerId, year,
      declaredIncome, otherIncome, totalIncome,
      pensionRelief, consolidatedRelief, taxable, taxDue,
      createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql,
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
      if (err) return dbError(res, err, "Could not create assessment.");
      res.status(201).json({ message: "Assessment created", assessmentId });
    }
  );
});

// Update assessment
app.put("/api/assessments/:assessmentId", (req, res) => {
  const {
    payerId, year, declaredIncome,
    otherIncome, totalIncome, pensionRelief,
    consolidatedRelief, taxable, taxDue
  } = req.body;

  const sql = `
    UPDATE assessments SET
      payerId = ?, year = ?, declaredIncome = ?, otherIncome = ?,
      totalIncome = ?, pensionRelief = ?, consolidatedRelief = ?,
      taxable = ?, taxDue = ?
    WHERE assessmentId = ?
  `;

  db.run(sql,
    [
      payerId,
      year,
      declaredIncome,
      otherIncome,
      totalIncome,
      pensionRelief,
      consolidatedRelief,
      taxable,
      taxDue,
      req.params.assessmentId
    ],
    function (err) {
      if (err) return dbError(res, err);
      if (this.changes === 0)
        return res.status(404).json({ error: "Assessment not found" });

      res.json({ message: "Assessment updated" });
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

//--------------------ADD LOGIN ROUTE------------------

// =========================
// SIMPLE LOGIN (Demo Only)
// =========================

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  // Temporary hard-coded login for demo
  if (email === "20072545@dbs.ie" && password === "admin") {
    return res.json({ message: "Login successful" });
  }

  return res.status(401).json({ error: "Invalid email or password" });
});


  db.get(
    "SELECT * FROM users WHERE email = ? AND password = ?",
    [email, password],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!row) return res.status(401).json({ error: "Invalid credentials" });

      return res.json({
        message: "Login successful",
        token: "SIMPLE_TOKEN_123",  // CA-friendly simplified auth
      });
    }
  );
});


// -------------------- ROOT TEST --------------------
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Tax API running" });
});

// -------------------- START SERVER --------------------
app.listen(PORT, () =>
  console.log(`Backend running at http://localhost:${PORT}`)
);
