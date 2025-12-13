const API_URL = "http://localhost:4000/api";

document.querySelector("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.querySelector("#loginEmail").value.trim();
    const password = document.querySelector("#loginPassword").value.trim();
    const msgEl = document.querySelector("#loginMsg");

    console.log("Submitting login:", email, password);

    const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    console.log("Login response:", data);

    if (!res.ok) {
        msgEl.textContent = data.error;
        msgEl.className = "msg error";
        return;
    }

    // Save login session
    localStorage.setItem("loggedInUser", email);

    console.log("Redirecting to index.html...");

    // USE ABSOLUTE PATH
    window.location.href = "./index.html";
});
