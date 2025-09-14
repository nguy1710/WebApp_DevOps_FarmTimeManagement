function authHeader() {
  const u = JSON.parse(localStorage.getItem("farm_user") || "null");
  return u && u.token ? { Authorization: "Bearer " + u.token } : {};
}

(function () {
  const user = JSON.parse(localStorage.getItem("farm_user") || "null");
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userWelcome = document.getElementById("userWelcome");
  const btnLogout = document.getElementById("btnLogout");
  const loadingBox = document.getElementById("loadingBox");
  const loadError = document.getElementById("loadError");
  const biometricBody = document.getElementById("biometricBody");
  const searchInput = document.getElementById("searchInput");

  const biometricModal = new bootstrap.Modal(
    document.getElementById("biometricModal")
  );
  const historyModal = new bootstrap.Modal(
    document.getElementById("historyModal")
  );
  const biometricForm = document.getElementById("biometricForm");
  const biometricModalTitle = document.getElementById("biometricModalTitle");
  const biometricSpinner = document.getElementById("biometricSpinner");

  if (userWelcome)
    userWelcome.textContent = user?.FirstName
      ? `Hello, ${user.FirstName}!`
      : user?.Email || "Logged in";
  if (btnLogout)
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("farm_user");
      window.location.href = "login.html";
    });

  let allStaff = [];
  let biometricData = [];
  let currentBiometricScan = null;

  function safe(val) {
    return (val ?? "") + "";
  }

  function formatDateTime(dateStr) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-AU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr || "N/A";
    }
  }

  async function loadStaff() {
    try {
      const res = await fetch(`${window.API_BASE}/Staffs/`, {
        method: "GET",
        headers: { ...authHeader() },
      });
      if (!res.ok) throw new Error(`Failed to load staff (HTTP ${res.status})`);
      const data = await res.json();
      allStaff = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Error loading staff:", err);
    }
  }

  async function loadBiometrics() {
    try {
      const res = await fetch(`${window.API_BASE}/biometrics`, {
        method: "GET",
        headers: { ...authHeader() },
      });
      if (!res.ok)
        throw new Error(`Failed to load biometrics (HTTP ${res.status})`);
      const data = await res.json();
      biometricData = Array.isArray(data) ? data : [];
      renderBiometrics();
    } catch (err) {
      if (loadError) {
        loadError.textContent = err.message || "Cannot load biometric data";
        loadError.classList.remove("d-none");
      }
    } finally {
      if (loadingBox) loadingBox.classList.add("d-none");
    }
  }

  function getBiometricStatus(staffId) {
    const biometric = biometricData.find((b) => b.StaffId === staffId);
    if (!biometric) return { status: "Not Registered", class: "text-danger" };

    return biometric.IsActive
      ? { status: "Active", class: "text-success" }
      : { status: "Inactive", class: "text-warning" };
  }

  function renderBiometrics() {
    if (!biometricBody) return;

    const searchTerm = (searchInput?.value || "").toLowerCase().trim();

    const filteredStaff = allStaff.filter((staff) => {
      if (!searchTerm) return true;
      const fullName = `${staff.FirstName} ${staff.LastName}`.toLowerCase();
      return (
        fullName.includes(searchTerm) ||
        (staff.Email || "").toLowerCase().includes(searchTerm) ||
        (staff.StaffId || "").toString().toLowerCase().includes(searchTerm)
      );
    });

    biometricBody.innerHTML = filteredStaff
      .map((staff) => {
        const biometric = biometricData.find(
          (b) => b.StaffId === staff.StaffId
        );
        const status = getBiometricStatus(staff.StaffId);

        return `
        <tr>
          <td>${safe(staff.StaffId)}</td>
          <td>${safe(staff.FirstName)} ${safe(staff.LastName)}</td>
          <td>${safe(staff.Email)}</td>
          <td><span class="${status.class}">${status.status}</span></td>
          <td>${biometric ? formatDateTime(biometric.LastUpdated) : "N/A"}</td>
          <td>${biometric ? biometric.Version || "1" : "N/A"}</td>
          <td>
            <button class="btn btn-sm btn-primary me-1 btn-register" 
                    data-staff-id="${staff.StaffId}"
                    data-staff-name="${safe(staff.FirstName)} ${safe(
          staff.LastName
        )}"
                    data-has-biometric="${biometric ? "true" : "false"}">
              ${biometric ? "Re-register" : "Register"}
            </button>
            ${
              biometric
                ? `<button class="btn btn-sm btn-outline-info btn-history" 
                                   data-staff-id="${staff.StaffId}">History</button>`
                : ""
            }
          </td>
        </tr>
      `;
      })
      .join("");
  }

  function simulateBiometricScan() {
    return new Promise((resolve) => {
      const scanAnimation = document.getElementById("scanAnimation");
      const scanControls = document.getElementById("scanControls");
      const scanResult = document.getElementById("scanResult");
      const btnSaveBiometric = document.getElementById("btnSaveBiometric");

      scanControls.classList.add("d-none");
      scanAnimation.classList.remove("d-none");
      scanResult.classList.add("d-none");

      setTimeout(() => {
        scanAnimation.classList.add("d-none");

        const quality = Math.floor(Math.random() * 10) + 90;
        const templateSize = (Math.random() * 2 + 1.5).toFixed(1);
        const scanTime = (Math.random() * 0.8 + 0.8).toFixed(1);

        document.getElementById("qualityScore").textContent = quality + "%";
        document.getElementById("templateSize").textContent =
          templateSize + " KB";
        document.getElementById("scanTime").textContent = scanTime + "s";

        scanResult.classList.remove("d-none");
        btnSaveBiometric.disabled = false;

        currentBiometricScan = {
          template: generateMockTemplate(),
          quality: quality,
          scanTime: scanTime,
          templateSize: templateSize,
        };

        resolve(currentBiometricScan);
      }, 2500);
    });
  }

  function generateMockTemplate() {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 256; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function resetBiometricModal() {
    const scanAnimation = document.getElementById("scanAnimation");
    const scanControls = document.getElementById("scanControls");
    const scanResult = document.getElementById("scanResult");
    const btnSaveBiometric = document.getElementById("btnSaveBiometric");
    const reregistrationReason = document.getElementById(
      "reregistrationReason"
    );
    const customReasonDiv = document.getElementById("customReasonDiv");

    scanAnimation.classList.add("d-none");
    scanControls.classList.remove("d-none");
    scanResult.classList.add("d-none");
    reregistrationReason.classList.add("d-none");
    customReasonDiv.classList.add("d-none");
    btnSaveBiometric.disabled = true;
    currentBiometricScan = null;

    biometricForm.classList.remove("was-validated");
    biometricForm.reset();
  }

  function openBiometricModal(staffId, staffName, hasExisting = false) {
    resetBiometricModal();

    document.getElementById("biometricStaffId").value = staffId;
    document.getElementById("staffNameDisplay").value = staffName;
    document.getElementById("isReregistration").value = hasExisting
      ? "true"
      : "false";

    biometricModalTitle.textContent = hasExisting
      ? "Re-register Biometric"
      : "Register Biometric";

    if (hasExisting) {
      document
        .getElementById("reregistrationReason")
        .classList.remove("d-none");
      document.getElementById("reasonSelect").required = true;
    } else {
      document.getElementById("reasonSelect").required = false;
    }

    biometricModal.show();
  }

  async function saveBiometric(biometricData) {
    const res = await fetch(`${window.API_BASE}/biometrics/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(biometricData),
    });

    if (!res.ok)
      throw new Error(`Failed to save biometric (HTTP ${res.status})`);
    return await res.json();
  }

  async function loadBiometricHistory(staffId) {
    const historyLoading = document.getElementById("historyLoading");
    const historyContent = document.getElementById("historyContent");
    const historyTableBody = document.getElementById("historyTableBody");

    historyLoading.classList.remove("d-none");
    historyContent.classList.add("d-none");

    try {
      const res = await fetch(
        `${window.API_BASE}/biometrics/history/${staffId}`,
        {
          method: "GET",
          headers: { ...authHeader() },
        }
      );

      if (!res.ok)
        throw new Error(`Failed to load history (HTTP ${res.status})`);
      const data = await res.json();
      const history = Array.isArray(data) ? data : [];

      historyTableBody.innerHTML = history
        .map(
          (record) => `
        <tr>
          <td>${safe(record.Version)}</td>
          <td>${formatDateTime(record.CreatedAt)}</td>
          <td>${safe(record.Action)}</td>
          <td>${safe(record.Reason || "N/A")}</td>
          <td>${safe(record.Quality)}%</td>
        </tr>
      `
        )
        .join("");

      historyLoading.classList.add("d-none");
      historyContent.classList.remove("d-none");
    } catch (err) {
      historyLoading.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", renderBiometrics);
  }

  if (biometricBody) {
    biometricBody.addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-register")) {
        const staffId = e.target.getAttribute("data-staff-id");
        const staffName = e.target.getAttribute("data-staff-name");
        const hasExisting =
          e.target.getAttribute("data-has-biometric") === "true";
        openBiometricModal(staffId, staffName, hasExisting);
      } else if (e.target.classList.contains("btn-history")) {
        const staffId = e.target.getAttribute("data-staff-id");
        loadBiometricHistory(staffId);
        historyModal.show();
      }
    });
  }

  document.getElementById("btnStartScan").addEventListener("click", () => {
    simulateBiometricScan();
  });

  document.getElementById("reasonSelect").addEventListener("change", (e) => {
    const customReasonDiv = document.getElementById("customReasonDiv");
    const customReason = document.getElementById("customReason");

    if (e.target.value === "other") {
      customReasonDiv.classList.remove("d-none");
      customReason.required = true;
    } else {
      customReasonDiv.classList.add("d-none");
      customReason.required = false;
      customReason.value = "";
    }
  });

  if (biometricForm) {
    biometricForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!biometricForm.checkValidity() || !currentBiometricScan) {
        biometricForm.classList.add("was-validated");
        return;
      }

      const isReregistration =
        document.getElementById("isReregistration").value === "true";
      const reasonSelect = document.getElementById("reasonSelect");
      const customReason = document.getElementById("customReason");

      let reason = null;
      if (isReregistration) {
        reason =
          reasonSelect.value === "other"
            ? customReason.value
            : reasonSelect.value;
        if (!reason) {
          biometricForm.classList.add("was-validated");
          return;
        }
      }

      const biometricData = {
        StaffId: document.getElementById("biometricStaffId").value,
        BiometricTemplate: currentBiometricScan.template,
        Quality: currentBiometricScan.quality,
        IsReregistration: isReregistration,
        Reason: reason,
        DeviceInfo: {
          deviceType: "MockBiometricDevice",
          version: "1.0.0",
          scanTime: currentBiometricScan.scanTime,
          templateSize: currentBiometricScan.templateSize,
        },
      };

      try {
        biometricSpinner.classList.remove("d-none");
        await saveBiometric(biometricData);
        biometricModal.hide();
        await loadBiometrics();
        alert("Biometric registration completed successfully!");
      } catch (err) {
        alert(err.message || "Failed to save biometric data");
      } finally {
        biometricSpinner.classList.add("d-none");
      }
    });
  }

  async function init() {
    await loadStaff();
    await loadBiometrics();
  }

  init();
})();
