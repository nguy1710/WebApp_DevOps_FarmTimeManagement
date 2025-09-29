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
      if (!res.ok) {
        let errorMessage = `Login failed (HTTP ${res.status})`;
        
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage;
        } catch (parseError) {
          // If JSON parsing fails, try to get response as text
          try {
            const textResponse = await res.text();
            if (textResponse && textResponse.trim()) {
              errorMessage = textResponse;
            }
          } catch (textError) {
            // Keep the default error message if both JSON and text parsing fail
          }
        }
        
        throw new Error(errorMessage);
      }
      const data = await res.json();
      if (!data || typeof data !== "object")
        throw new Error("Invalid response.");
      localStorage.setItem("farm_user", JSON.stringify(data));
      console.log('Login successful, data saved:', data);
      console.log('Redirecting to dashboard...');
      window.location.href = "dashboard.html";
    } catch (err) {
      errorBox.textContent = err.message || "There was error.";
      errorBox.classList.remove("d-none");
    } finally {
      setLoading(false);
    }
  });
})();
