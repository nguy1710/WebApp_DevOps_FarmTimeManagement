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
  const filterType = document.getElementById("filterType");
  const filterStatus = document.getElementById("filterStatus");
  const btnClearFilters = document.getElementById("btnClearFilters");

  // Create device modal controls
  const btnSaveDevice = document.getElementById("btnSaveDevice");
  const createDeviceForm = document.getElementById("createDeviceForm");
  const deviceLocation = document.getElementById("deviceLocation");
  const deviceType = document.getElementById("deviceType");
  const deviceStatus = document.getElementById("deviceStatus");

  // Edit device modal controls
  const btnUpdateDevice = document.getElementById("btnUpdateDevice");
  const editDeviceForm = document.getElementById("editDeviceForm");
  const editDeviceId = document.getElementById("editDeviceId");
  const editDeviceLocation = document.getElementById("editDeviceLocation");
  const editDeviceType = document.getElementById("editDeviceType");
  const editDeviceStatus = document.getElementById("editDeviceStatus");

  // Guard page
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Load list
  let deviceData = [];
  async function fetchDevices() {
    try {
      const res = await fetch(`${window.API_BASE}/Devices`, {
        method: "GET",
        headers: { ...authHeader() },
      });

      if (!res.ok) {
        const errorMessage = await getErrorMessage(res);
        throw new Error(errorMessage);
      }
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Response was not array.");
      deviceData = data;
      renderTable(deviceData);
      // apply current filters (if user typed before data loaded)
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

  function renderTable(rows) {
    if (!tableBody) return;
    tableBody.innerHTML = rows
      .map(
        (r) => `
      <tr>
        <td>${safe(r.DeviceId)}</td>
        <td>${safe(r.Location)}</td>
        <td>${safe(r.Type)}</td>
        <td>
          <span class="badge ${getStatusBadgeClass(r.Status)}">${safe(r.Status)}</span>
        </td>
        <td>
          <span class="text-primary cursor-pointer btn-edit me-2" 
                style="cursor:pointer" 
                data-id="${safe(r.DeviceId)}" 
                data-location="${safe(r.Location)}"
                data-type="${safe(r.Type)}"
                data-status="${safe(r.Status)}">
            Edit
          </span>
          <span class="text-danger cursor-pointer btn-del" 
                style="cursor:pointer" 
                data-id="${safe(r.DeviceId)}" 
                data-type="${safe(r.Type)}">
            Delete
          </span>
        </td>
      </tr>
    `
      )
      .join("");
  }

  function safe(val) {
    return (val ?? "") + "";
  }

  function getStatusBadgeClass(status) {
    switch (status?.toLowerCase()) {
      case 'online':
        return 'bg-success';
      case 'offline':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
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
    const type = (filterType?.value || "").trim();
    const status = (filterStatus?.value || "").trim();

    const filtered = deviceData.filter((d) => {
      // text search across common fields
      const textOk =
        !q ||
        [
          d.DeviceId,
          d.Location,
          d.Type,
          d.Status,
        ].some((x) => includesText(x, q));

      // select filters
      const typeOk = !type || d.Type === type;
      const statusOk = !status || d.Status === status;

      return textOk && typeOk && statusOk;
    });

    renderTable(filtered);
  }

  // Wire events
  ["input", "change"].forEach((evt) => {
    if (searchInput) searchInput.addEventListener(evt, applyFilters);
    if (filterType) filterType.addEventListener(evt, applyFilters);
    if (filterStatus) filterStatus.addEventListener(evt, applyFilters);
  });

  if (btnClearFilters) {
    btnClearFilters.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (filterType) filterType.value = "";
      if (filterStatus) filterStatus.value = "";
      applyFilters();
    });
  }

  // Edit and Delete (event delegation)
  if (tableBody) {
    tableBody.addEventListener("click", async (e) => {
      // Handle Edit button
      const editBtn = e.target.closest(".btn-edit");
      if (editBtn) {
        const id = editBtn.getAttribute("data-id");
        const location = editBtn.getAttribute("data-location");
        const type = editBtn.getAttribute("data-type");
        const status = editBtn.getAttribute("data-status");
        
        if (id) {
          // Populate edit form with current data
          editDeviceId.value = id;
          editDeviceLocation.value = location;
          editDeviceType.value = type;
          editDeviceStatus.value = status;
          
          // Show edit modal
          const editModal = new bootstrap.Modal(document.getElementById('editDeviceModal'));
          editModal.show();
        }
        return;
      }

      // Handle Delete button
      const delBtn = e.target.closest(".btn-del");
      if (delBtn) {
        const id = delBtn.getAttribute("data-id");
        const type = delBtn.getAttribute("data-type") || `#${id}`;
        if (!id) return;
        const ok = confirm(`Are you sure want to delete this device ${type} (ID: ${id})?`);
        if (!ok) return;
        try {
          const res = await fetch(
            `${window.API_BASE}/Devices/${encodeURIComponent(id)}`,
            {
              method: "DELETE",
              headers: { ...authHeader() },
            }
          );

          if (!res.ok) {
            const errorMessage = await getErrorMessage(res);
            throw new Error(errorMessage);
          }
          const json = await res.json(); // server returns deleted device JSON
          alert(
            `Deleted: ${json.Type || ""} (ID: ${json.DeviceId})`
          );
          await fetchDevices(); // refresh list
        } catch (err) {
          alert(err.message || "Cannot delete device.");
        }
      }
    });
  }

  // Create device functionality
  async function createDevice() {
    if (!createDeviceForm.checkValidity()) {
      createDeviceForm.reportValidity();
      return;
    }

    const newDevice = {
      Location: deviceLocation.value.trim(),
      Type: deviceType.value,
      Status: deviceStatus.value
    };

    try {
      btnSaveDevice.disabled = true;
      btnSaveDevice.textContent = "Creating...";

      const res = await fetch(`${window.API_BASE}/Devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader()
        },
        body: JSON.stringify(newDevice)
      });

      if (!res.ok) {
        const errorMessage = await getErrorMessage(res);
        throw new Error(errorMessage);
      }

      const createdDevice = await res.json();
      alert(`Device created successfully! ID: ${createdDevice.DeviceId}`);
      
      // Close modal and reset form
      const modal = bootstrap.Modal.getInstance(document.getElementById('createDeviceModal'));
      modal.hide();
      createDeviceForm.reset();
      
      // Refresh device list
      await fetchDevices();
    } catch (err) {
      alert(err.message || "Cannot create device.");
    } finally {
      btnSaveDevice.disabled = false;
      btnSaveDevice.textContent = "Create Device";
    }
  }

  // Wire create device event
  if (btnSaveDevice) {
    btnSaveDevice.addEventListener("click", createDevice);
  }

  // Update device functionality
  async function updateDevice() {
    if (!editDeviceForm.checkValidity()) {
      editDeviceForm.reportValidity();
      return;
    }

    const deviceId = editDeviceId.value;
    const updatedDevice = {
      Location: editDeviceLocation.value.trim(),
      Type: editDeviceType.value,
      Status: editDeviceStatus.value
    };

    try {
      btnUpdateDevice.disabled = true;
      btnUpdateDevice.textContent = "Updating...";

      const res = await fetch(`${window.API_BASE}/Devices/${encodeURIComponent(deviceId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeader()
        },
        body: JSON.stringify(updatedDevice)
      });

      if (!res.ok) {
        const errorMessage = await getErrorMessage(res);
        throw new Error(errorMessage);
      }

      const updatedDeviceData = await res.json();
      alert(`Device updated successfully! ID: ${updatedDeviceData.DeviceId}`);
      
      // Close modal and reset form
      const modal = bootstrap.Modal.getInstance(document.getElementById('editDeviceModal'));
      modal.hide();
      editDeviceForm.reset();
      
      // Refresh device list
      await fetchDevices();
    } catch (err) {
      alert(err.message || "Cannot update device.");
    } finally {
      btnUpdateDevice.disabled = false;
      btnUpdateDevice.textContent = "Update Device";
    }
  }

  // Wire update device event
  if (btnUpdateDevice) {
    btnUpdateDevice.addEventListener("click", updateDevice);
  }

  // Reset form when modal is hidden
  const createDeviceModal = document.getElementById('createDeviceModal');
  if (createDeviceModal) {
    createDeviceModal.addEventListener('hidden.bs.modal', function () {
      createDeviceForm.reset();
    });
  }

  const editDeviceModal = document.getElementById('editDeviceModal');
  if (editDeviceModal) {
    editDeviceModal.addEventListener('hidden.bs.modal', function () {
      editDeviceForm.reset();
    });
  }

  fetchDevices();
})();
