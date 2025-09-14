(function () {
  const form = document.getElementById("loginForm");
  const btn = document.getElementById("loginBtn");
  const spinner = document.getElementById("loginSpinner");
  const errorBox = document.getElementById("loginError");

  function setLoading(isLoading) {
    btn.disabled = isLoading;
    spinner.classList.toggle("d-none", !isLoading);
  }

  form.addEventListener("submit", async (e) => {
    // clear any stale session
    try {
      localStorage.removeItem("farm_user");
    } catch {}
    e.preventDefault();
    errorBox.classList.add("d-none");
    errorBox.textContent = "";

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    setLoading(true);
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const res = await fetch(`${window.API_BASE}/Staffs/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: email, Password: password }),
      });
      if (!res.ok)
        throw new Error(`Wrong Email or Password (HTTP ${res.status}).`);
      const data = await res.json();
      if (!data || typeof data !== "object")
        throw new Error("Invalid response.");
      localStorage.setItem("farm_user", JSON.stringify(data));
      window.location.href = "dashboard.html";
    } catch (err) {
      errorBox.textContent = err.message || "There was error.";
      errorBox.classList.remove("d-none");
    } finally {
      setLoading(false);
    }
  });
})();
