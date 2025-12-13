const API_URL = "http://localhost:4000/api";

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = loginEmail.value;
  const password = loginPassword.value;

  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem("authToken", data.token);
    location.href = "index.html";
  } else {
    loginMsg.textContent = data.error;
    loginMsg.classList.add("error");
  }
});
