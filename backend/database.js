const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./tax.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS taxpayers (
      payerId TEXT PRIMARY KEY,
      firstName TEXT,
      lastName TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      dob TEXT,
      occupation TEXT,
      annualIncome REAL,
      createdAt TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS assessments (
      assessmentId TEXT PRIMARY KEY,
      payerId TEXT,
      year INTEGER,
      declaredIncome REAL,
      otherIncome REAL,
      pensionRelief REAL,
      consolidatedRelief REAL,
      taxable REAL,
      taxDue REAL,
      createdAt TEXT
    )
  `);
});

module.exports = db;
