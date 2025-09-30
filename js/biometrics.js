function authHeader() {
  const u = JSON.parse(localStorage.getItem("farm_user") || "null");
  return u && u.token ? { Authorization: "Bearer " + u.token } : {};
}

async function getErrorMessage(response) {
  try {
    const errorData = await response.json();
    return errorData.message || errorData.error || errorData.detail || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

(function () {
  const user = JSON.parse(localStorage.getItem("farm_user") || "null");
  const userWelcome = document.getElementById("userWelcome");
  const btnLogout = document.getElementById("btnLogout");
  const loadingBox = document.getElementById("loadingBox");
  const loadError = document.getElementById("loadError");
  const tableBody = document.getElementById("tableBody");
  const searchInput = document.getElementById("searchInput");

  // Filter controls
  const filterRole = document.getElementById("filterRole");
  const btnClearFilters = document.getElementById("btnClearFilters");

  // Create biometric modal controls
  const btnSaveBiometric = document.getElementById("btnSaveBiometric");
  const createBiometricForm = document.getElementById("createBiometricForm");
  const createStaffId = document.getElementById("createStaffId");
  const createStaffName = document.getElementById("createStaffName");
  const biometricType = document.getElementById("biometricType");
  const biometricData = document.getElementById("biometricData");

  // Edit biometric modal controls
  const btnUpdateBiometric = document.getElementById("btnUpdateBiometric");
  const btnDeleteBiometric = document.getElementById("btnDeleteBiometric");
  const editBiometricForm = document.getElementById("editBiometricForm");
  const editBiometricId = document.getElementById("editBiometricId");
  const editStaffId = document.getElementById("editStaffId");
  const editStaffName = document.getElementById("editStaffName");
  const editBiometricType = document.getElementById("editBiometricType");
  const editBiometricData = document.getElementById("editBiometricData");

  // Guard page
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Load data
  let staffData = [];
  let biometricRecords = [];

  async function fetchStaffs() {
    try {
      const res = await fetch(`${window.API_BASE}/Staffs/`, {
        method: "GET",
        headers: { ...authHeader() },
      });

      if (!res.ok) {
        const errorMessage = await getErrorMessage(res);
        throw new Error(errorMessage);
      }
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Staff response was not array.");
      staffData = data;
    } catch (err) {
      throw new Error(`Failed to load staff: ${err.message}`);
    }
  }

  async function fetchBiometrics() {
    try {
      const res = await fetch(`${window.API_BASE}/Biometrics`, {
        method: "GET",
        headers: { ...authHeader() },
      });

      if (!res.ok) {
        const errorMessage = await getErrorMessage(res);
        throw new Error(errorMessage);
      }
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Biometric response was not array.");
      biometricRecords = data;
    } catch (err) {
      throw new Error(`Failed to load biometrics: ${err.message}`);
    }
  }

  async function loadData() {
    try {
      await Promise.all([fetchStaffs(), fetchBiometrics()]);
      renderTable();
      applyFilters();
    } catch (err) {
      if (loadError) {
        loadError.textContent = err.message || "Cannot download data.";
        loadError.classList.remove("d-none");
      }
    } finally {
      if (loadingBox) loadingBox.classList.add("d-none");
    }
  }

  function renderTable(rows = null) {
    if (!tableBody) return;
    
    const dataToRender = rows || staffData;
    
    tableBody.innerHTML = dataToRender
      .map((staff) => {
        const biometric = biometricRecords.find(b => b.StaffId === staff.StaffId);
        const hasBiometric = !!biometric;

        return `
        <tr>
          <td>${safe(staff.StaffId)}</td>
        <td>${safe(staff.FirstName)}</td>
        <td>${safe(staff.LastName)}</td>
        <td>${safe(staff.Role)}</td>
        <td>
          ${hasBiometric 
            ? `<button class="btn btn-primary btn-sm btn-edit" 
                       data-biometric-id="${safe(biometric.BiometricId)}"
                       data-staff-id="${safe(staff.StaffId)}" 
                       data-staff-name="${safe(staff.FirstName)} ${safe(staff.LastName)}"
                       data-type="${safe(biometric.Type)}"
                       data-data="${safe(biometric.Data)}">
                Edit
              </button>`
            : `<button class="btn btn-success btn-sm btn-create" 
                       data-staff-id="${safe(staff.StaffId)}" 
                       data-staff-name="${safe(staff.FirstName)} ${safe(staff.LastName)}">
                Create
              </button>`
            }
          </td>
        </tr>
      `;
      })
      .join("");
  }

  function safe(val) {
    return (val ?? "") + "";
  }

  // Helpers for filters
  function includesText(haystack, needle) {
    return (haystack || "")
      .toString()
      .toLowerCase()
      .includes((needle || "").toLowerCase());
  }

  // Apply combined filters
  function applyFilters() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    const role = (filterRole?.value || "").trim();

    const filtered = staffData.filter((staff) => {
      // text search across common fields
      const textOk =
        !q ||
        [
          staff.StaffId,
          staff.FirstName,
          staff.LastName,
          staff.Role,
        ].some((x) => includesText(x, q));

      // role filter
      const roleOk = !role || staff.Role === role;

      return textOk && roleOk;
    });

    renderTable(filtered);
  }

  // Wire events
  ["input", "change"].forEach((evt) => {
    if (searchInput) searchInput.addEventListener(evt, applyFilters);
    if (filterRole) filterRole.addEventListener(evt, applyFilters);
  });

  if (btnClearFilters) {
    btnClearFilters.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (filterRole) filterRole.value = "";
      applyFilters();
    });
  }

  // Create and Edit (event delegation)
  if (tableBody) {
    tableBody.addEventListener("click", async (e) => {
      // Handle Create button
      const createBtn = e.target.closest(".btn-create");
      if (createBtn) {
        const staffId = createBtn.getAttribute("data-staff-id");
        const staffName = createBtn.getAttribute("data-staff-name");
        
        if (staffId) {
          // Populate create form
          createStaffId.value = staffId;
          createStaffName.value = staffName;
          
          // Show create modal
          const createModal = new bootstrap.Modal(document.getElementById('createBiometricModal'));
          createModal.show();
        }
        return;
      }

      // Handle Edit button
      const editBtn = e.target.closest(".btn-edit");
      if (editBtn) {
        const biometricId = editBtn.getAttribute("data-biometric-id");
        const staffId = editBtn.getAttribute("data-staff-id");
        const staffName = editBtn.getAttribute("data-staff-name");
        const type = editBtn.getAttribute("data-type");
        const data = editBtn.getAttribute("data-data");
        
        if (biometricId) {
          // Populate edit form
          editBiometricId.value = biometricId;
          editStaffId.value = staffId;
          editStaffName.value = staffName;
          editBiometricType.value = type;
          editBiometricData.value = data;
          
          // Show edit modal
          const editModal = new bootstrap.Modal(document.getElementById('editBiometricModal'));
          editModal.show();
        }
        return;
      }
    });
  }

  // Create biometric functionality
  async function createBiometric() {
    if (!createBiometricForm.checkValidity()) {
      createBiometricForm.reportValidity();
      return;
    }

    const newBiometric = {
      StaffId: parseInt(createStaffId.value),
      Type: biometricType.value,
      Data: biometricData.value.trim()
    };

    try {
      btnSaveBiometric.disabled = true;
      btnSaveBiometric.textContent = "Creating...";

      const res = await fetch(`${window.API_BASE}/Biometrics`, {
      method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader()
        },
        body: JSON.stringify(newBiometric)
    });

    if (!res.ok) {
      const errorMessage = await getErrorMessage(res);
      throw new Error(errorMessage);
    }

      const createdBiometric = await res.json();
      alert(`Biometric data created successfully! ID: ${createdBiometric.BiometricId}`);
      
      // Close modal and reset form
      const modal = bootstrap.Modal.getInstance(document.getElementById('createBiometricModal'));
      modal.hide();
      createBiometricForm.reset();
      
      // Refresh data
      await loadData();
    } catch (err) {
      alert(err.message || "Cannot create biometric data.");
    } finally {
      btnSaveBiometric.disabled = false;
      btnSaveBiometric.textContent = "Create Biometric";
    }
  }

  // Update biometric functionality
  async function updateBiometric() {
    if (!editBiometricForm.checkValidity()) {
      editBiometricForm.reportValidity();
      return;
    }

    const biometricId = editBiometricId.value;
    const updatedBiometric = {
      StaffId: parseInt(editStaffId.value),
      Type: editBiometricType.value,
      Data: editBiometricData.value.trim()
    };

    try {
      btnUpdateBiometric.disabled = true;
      btnUpdateBiometric.textContent = "Updating...";

      const res = await fetch(`${window.API_BASE}/Biometrics/${encodeURIComponent(biometricId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeader()
        },
        body: JSON.stringify(updatedBiometric)
      });

      if (!res.ok) {
        const errorMessage = await getErrorMessage(res);
        throw new Error(errorMessage);
      }

      const updatedBiometricData = await res.json();
      alert(`Biometric data updated successfully! ID: ${updatedBiometricData.BiometricId}`);
      
      // Close modal and reset form
      const modal = bootstrap.Modal.getInstance(document.getElementById('editBiometricModal'));
      modal.hide();
      editBiometricForm.reset();
      
      // Refresh data
      await loadData();
    } catch (err) {
      alert(err.message || "Cannot update biometric data.");
    } finally {
      btnUpdateBiometric.disabled = false;
      btnUpdateBiometric.textContent = "Update Biometric";
    }
  }

  // Delete biometric functionality
  async function deleteBiometric() {
    const biometricId = editBiometricId.value;
    const staffName = editStaffName.value;
    
    if (!biometricId) return;
    
    const ok = confirm(`Are you sure you want to delete biometric data for ${staffName}?`);
    if (!ok) return;

    try {
      btnDeleteBiometric.disabled = true;
      btnDeleteBiometric.textContent = "Deleting...";

      const res = await fetch(`${window.API_BASE}/Biometrics/${encodeURIComponent(biometricId)}`, {
        method: "DELETE",
        headers: { ...authHeader() },
      });

      if (!res.ok) {
        const errorMessage = await getErrorMessage(res);
        throw new Error(errorMessage);
      }

      alert(`Biometric data deleted successfully for ${staffName}!`);
      
      // Close modal and reset form
      const modal = bootstrap.Modal.getInstance(document.getElementById('editBiometricModal'));
      modal.hide();
      editBiometricForm.reset();
      
      // Refresh data
      await loadData();
    } catch (err) {
      alert(err.message || "Cannot delete biometric data.");
    } finally {
      btnDeleteBiometric.disabled = false;
      btnDeleteBiometric.textContent = "Delete Biometric";
    }
  }

  // Wire events
  if (btnSaveBiometric) {
    btnSaveBiometric.addEventListener("click", createBiometric);
  }

  if (btnUpdateBiometric) {
    btnUpdateBiometric.addEventListener("click", updateBiometric);
  }

  if (btnDeleteBiometric) {
    btnDeleteBiometric.addEventListener("click", deleteBiometric);
  }

  // Reset forms when modals are hidden
  const createBiometricModal = document.getElementById('createBiometricModal');
  if (createBiometricModal) {
    createBiometricModal.addEventListener('hidden.bs.modal', function () {
      createBiometricForm.reset();
    });
  }

  const editBiometricModal = document.getElementById('editBiometricModal');
  if (editBiometricModal) {
    editBiometricModal.addEventListener('hidden.bs.modal', function () {
      editBiometricForm.reset();
    });
  }

  loadData();
})();
