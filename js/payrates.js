(function () {
  const loadError = document.getElementById("loadError");
  const loadingBox = document.getElementById("loadingBox");
  const defaultsCard = document.getElementById("defaultsCard");
  const defaultsJson = document.getElementById("defaultsJson");

  const btnLoadDefaults = document.getElementById("btnLoadDefaults");
  const btnInitAll = document.getElementById("btnInitAll");
  const btnUpdateStaff = document.getElementById("btnUpdateStaff");
  const btnBulkUpdate = document.getElementById("btnBulkUpdate");

  // =================================================================
  // Bug Fix: Remove overtime rate references and add staff name support
  // Developer: Tim
  // Date: 2025-10-12
  // Description: Removed otRate and bulkOtRate references, added staffName
  // Issue: Overtime Rate fields were removed from HTML
  // Bug Reference: Sprint 3 Frontend UI Fixes
  // =================================================================
  const staffId = document.getElementById("staffId");
  const staffName = document.getElementById("staffName");
  const stdRate = document.getElementById("stdRate");

  const bulkRole = document.getElementById("bulkRole");
  const bulkContract = document.getElementById("bulkContract");
  const bulkStdRate = document.getElementById("bulkStdRate");

  function showError(message) {
    if (!loadError) return;
    loadError.textContent = message || "Error";
    loadError.classList.remove("d-none");
  }

  function hideError() {
    if (!loadError) return;
    loadError.classList.add("d-none");
    loadError.textContent = "";
  }

  async function getErrorMessage(response) {
    try {
      const data = await response.json();
      return (
        data.message || data.error || data.detail || `HTTP ${response.status}`
      );
    } catch {
      return `HTTP ${response.status}`;
    }
  }

  function setLoading(isLoading) {
    if (!loadingBox) return;
    if (isLoading) loadingBox.classList.remove("d-none");
    else loadingBox.classList.add("d-none");
  }

  function authHeader() {
    try {
      const u = JSON.parse(localStorage.getItem("farm_user") || "null");
      return u && u.token ? { Authorization: "Bearer " + u.token } : {};
    } catch {
      return {};
    }
  }

  if (btnLoadDefaults) {
    btnLoadDefaults.addEventListener("click", async () => {
      hideError();
      setLoading(true);
      try {
        const res = await fetch(`${window.API_BASE}/payrates/defaults`);
        if (!res.ok) {
          const err = await getErrorMessage(res);
          throw new Error(err);
        }
        const data = await res.json();
        defaultsCard && defaultsCard.classList.remove("d-none");
        if (defaultsJson) {
          defaultsJson.textContent = JSON.stringify(data, null, 2);
        }
      } catch (err) {
        showError(err.message || "Failed to load defaults");
      } finally {
        setLoading(false);
      }
    });
  }

  if (btnInitAll) {
    btnInitAll.addEventListener("click", async () => {
      const ok = confirm(
        "This will update ALL staff members with default rates. Continue?"
      );
      if (!ok) return;
      hideError();
      setLoading(true);
      try {
        const res = await fetch(
          `${window.API_BASE}/payrates/initialize-defaults`,
          {
            method: "POST",
            headers: { ...authHeader() },
          }
        );
        if (!res.ok) {
          const err = await getErrorMessage(res);
          throw new Error(err);
        }
        const data = await res.json();
        alert(data.message || "Initialized");
      } catch (err) {
        showError(err.message || "Failed to initialize defaults");
      } finally {
        setLoading(false);
      }
    });
  }

  // Bug Fix: Add staff name lookup functionality
  if (staffId) {
    staffId.addEventListener("blur", async () => {
      const id = Number(staffId.value || "");
      if (Number.isFinite(id) && id > 0) {
        try {
          const res = await fetch(`${window.API_BASE}/Staffs/${id}`);
          if (res.ok) {
            const staff = await res.json();
            if (staffName) {
              staffName.value = `${staff.FirstName || ''} ${staff.LastName || ''}`.trim();
            }
          }
        } catch (err) {
          // Silently fail - staff name will remain empty
        }
      } else if (staffName) {
        staffName.value = "";
      }
    });
  }

  if (btnUpdateStaff) {
    btnUpdateStaff.addEventListener("click", async () => {
      hideError();
      setLoading(true);
      try {
        const id = Number(staffId?.value || "");
        const sr = Number(stdRate?.value || "");
        if (!Number.isFinite(id) || id <= 0)
          throw new Error("Invalid staff ID");
        if (!Number.isFinite(sr) || sr < 0)
          throw new Error("Enter valid standard rate");

        const res = await fetch(
          `${window.API_BASE}/payrates/staff/${encodeURIComponent(
            id
          )}/payrates`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeader() },
            body: JSON.stringify({ standardPayRate: sr }),
          }
        );
        if (!res.ok) {
          const err = await getErrorMessage(res);
          throw new Error(err);
        }
        const data = await res.json();
        alert(data.message || "Updated");
      } catch (err) {
        showError(err.message || "Failed to update staff rate");
      } finally {
        setLoading(false);
      }
    });
  }

  // Bug Fix: Remove overtime rate from bulk update
  if (btnBulkUpdate) {
    btnBulkUpdate.addEventListener("click", async () => {
      hideError();
      setLoading(true);
      try {
        const role = (bulkRole?.value || "").trim();
        const contract = (bulkContract?.value || "").trim();
        const sr = Number(bulkStdRate?.value || "");
        if (!role || !contract)
          throw new Error("Select role and contract type");
        if (!Number.isFinite(sr) || sr < 0)
          throw new Error("Enter valid standard rate");

        const res = await fetch(
          `${window.API_BASE}/payrates/bulk/${encodeURIComponent(
            role
          )}/${encodeURIComponent(contract)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeader() },
            body: JSON.stringify({ standardPayRate: sr }),
          }
        );
        if (!res.ok) {
          const err = await getErrorMessage(res);
          throw new Error(err);
        }
        const data = await res.json();
        alert(data.message || "Bulk updated");
      } catch (err) {
        showError(err.message || "Failed to bulk update");
      } finally {
        setLoading(false);
      }
    });
  }
})();
