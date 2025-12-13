// ================================
//  LOGIN.JS — Frontend Login Logic
// ================================

const API_URL = "http://localhost:4000/api";

// Make sure login form exists
const form = document.querySelector("#loginForm");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.querySelector("#loginEmail").value.trim();
    const password = document.querySelector("#loginPassword").value.trim();
    const msgEl = document.querySelector("#loginMsg");

    console.log("Submitting login:", email, password);

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      console.log("Login response:", data);

      if (!res.ok) {
        msgEl.textContent = data.error || "Login failed";
        msgEl.className = "msg error";
        return;
      }

      // Save login session
      localStorage.setItem("loggedInUser", email);

      console.log("Redirecting to index.html...");

      // Redirect inside PUBLIC folder
      window.location.href = "/index.html";

    } catch (err) {
      console.error("Login error:", err);
      msgEl.textContent = "Network error — backend not running?";
      msgEl.className = "msg error";
    }
  });
}
