### url: https://taxpayer-registry-api.onrender.com/

### Github Repo: https://github.com/JoAdeyemi/Programming-CA.git

***********************************************

## 📌 Sources, Assistance & Learning References

This project was developed with a combination of self-learning, official documentation, and guided support.  
Below is a full list of all external help sources used during development, based on the CA requirement to disclose support received.

### 1. ChatGPT (OpenAI)
ChatGPT was used extensively for:
- Explaining backend concepts (Node.js, Express, SQLite)
- Generating boilerplate server code (server.js)
- Debugging errors (npm setup, Git, API routing)
- Designing CRUD operations for both taxpayers and assessments
- Assisting with JavaScript refactoring and UI improvements
- Helping with GitHub workflow, commits, and deployment steps
- Structuring README documentation and commit messages

ChatGPT sessions included:
- Interface layout guidance  
- Fixes for form behaviour and tab switching  
- CRUD edit/update/delete logic  
- LocalStorage → API migration help  
- Hosting and backend connectivity walkthrough  

### 2. Official Documentation
The following documentation was referenced:
- Node.js Docs — https://nodejs.org/en/docs
- Express.js Docs — https://expressjs.com/
- SQLite3 NPM Docs — https://www.npmjs.com/package/sqlite3
- MDN Web Docs — https://developer.mozilla.org/
- Git & GitHub Docs — https://docs.github.com/

### 3. Additional Resources
- StackOverflow posts for troubleshooting specific CLI and npm issues  
- YouTube references for understanding REST APIs & CRUD operations  
- VS Code documentation for environment setup  


While ChatGPT provided explanations, templates, and debugging assistance, **all final logic, implementation decisions, and structural choices were written, tested, and validated by myself**, in line with the module’s requirements.


**************************************************

# Taxpayer Registry & Assessment System
A full–stack mini-application designed for my MSc **Continuous Assessment (CA)** requirement.  
The system allows the creation, updating, deletion, and assessment of taxpayers using a modern frontend and a backend powered by **Node.js + Express + SQLite3**.

---

## 📌 **Project Overview**
This application simulates a simplified revenue/taxpayer processing workflow:

- Register new taxpayers  
- Raise and compute tax assessments  
- Apply pension relief and consolidated relief rules  
- Update and delete records  
- View taxpayer and assessment details  
- Persist data in an SQLite database  
- Communicate between the frontend and backend via REST APIs  

The UI is built to be clean, modern, and responsive.

---

## ✅ **Features**
### **Frontend**
- Register taxpayers (Create)
- Update taxpayer details (Update)
- Delete taxpayer records (Delete)
- Raise new assessments (Create)
- Update assessments (Update)
- Delete assessments (Delete)
- Auto-compute:
  - Total income  
  - Consolidated relief (20%)  
  - Pension relief  
  - Taxable income  
  - Final tax due  
- View taxpayer & assessment details
- Tab-based navigation
- JSON import/export
- Fully integrated with backend API

### **Backend (Node.js + Express + SQLite3)**
- REST endpoints for taxpayers and assessments  
- Uses SQLite for persistent storage  
- Auto-creates database and tables on startup  
- Error handling and validation  
- CORS enabled for frontend communication  

---

## 🛠️ **Technologies Used**

### **Frontend**
- HTML5  
- CSS3  
- Vanilla JavaScript  
- Fetch API  
- GitHub Pages (optional hosting)

### **Backend**
- Node.js  
- Express.js  
- SQLite3  
- Nodemon (development)  
- REST API architecture  

---

## 

