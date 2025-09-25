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
  const scheduleBody = document.getElementById("scheduleBody");
  const weekDisplay = document.getElementById("weekDisplay");
  const staffFilter = document.getElementById("staffFilter");
  const btnPrevWeek = document.getElementById("btnPrevWeek");
  const btnThisWeek = document.getElementById("btnThisWeek");
  const btnNextWeek = document.getElementById("btnNextWeek");
  const btnAddShift = document.getElementById("btnAddShift");

  const shiftModal = new bootstrap.Modal(document.getElementById("shiftModal"));
  const shiftForm = document.getElementById("shiftForm");
  const shiftModalTitle = document.getElementById("shiftModalTitle");
  const shiftSpinner = document.getElementById("shiftSpinner");
  const overlapWarning = document.getElementById("overlapWarning");

  if (userWelcome)
    userWelcome.textContent = user?.FirstName
      ? `Hello, ${user.FirstName}!`
      : user?.Email || "Logged in";
  if (btnLogout)
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("farm_user");
      window.location.href = "login.html";
    });

  let currentWeekStart = getWeekStart(new Date());
  let allStaff = [];
  let allShifts = [];
  let filteredStaff = [];

  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  function formatDisplayDate(date) {
    return date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function updateWeekDisplay() {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekDisplay.textContent = `Week of ${formatDisplayDate(
      currentWeekStart
    )} - ${formatDisplayDate(weekEnd)}`;
  }

  function safe(val) {
    return (val ?? "") + "";
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
      populateStaffSelect();
      applyStaffFilter();
    } catch (err) {
      console.error("Error loading staff:", err);
    }
  }

  function populateStaffSelect(isEditMode = false) {
    const select = document.getElementById("shiftStaffId");
    // Only show "Select Staff" option in Add mode, not Edit mode
    select.innerHTML = isEditMode ? '' : '<option value="">Select Staff</option>';
    allStaff.forEach((staff) => {
      const option = document.createElement("option");
      // =================================================================
      // Bug Fix: Staff Dropdown Selection Issue
      // Developer: Tim
      // Date: 2025-09-25
      // Description: Convert StaffId to string for proper dropdown selection
      // Issue: Dropdown fails to preselect staff when editing shifts
      // Bug Reference: Bug #2
      // =================================================================
      option.value = String(staff.StaffId);
      option.textContent = `${staff.FirstName} ${staff.LastName}`;
      select.appendChild(option);
    });
  }

  function applyStaffFilter() {
    const filter = (staffFilter?.value || "").toLowerCase().trim();
    filteredStaff = allStaff.filter((staff) => {
      if (!filter) return true;
      const fullName = `${staff.FirstName} ${staff.LastName}`.toLowerCase();
      return fullName.includes(filter);
    });
    renderSchedule();
  }

  async function loadShifts() {
    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const res = await fetch(
        `${window.API_BASE}/Shifts?startDate=${formatDate(
          currentWeekStart
        )}&endDate=${formatDate(weekEnd)}`,
        {
          method: "GET",
          headers: { ...authHeader() },
        }
      );
      if (!res.ok)
        throw new Error(`Failed to load shifts (HTTP ${res.status})`);
      const data = await res.json();
      allShifts = Array.isArray(data) ? data : [];
      renderSchedule();
    } catch (err) {
      if (loadError) {
        loadError.textContent = err.message || "Cannot load shifts";
        loadError.classList.remove("d-none");
      }
    } finally {
      if (loadingBox) loadingBox.classList.add("d-none");
    }
  }

  function getShiftsForStaffAndDate(staffId, date) {
    const dateStr = formatDate(date);
    return allShifts.filter(
      (shift) => shift.StaffId === staffId && shift.ShiftDate === dateStr
    );
  }

  function renderSchedule() {
    if (!scheduleBody) return;

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }

    scheduleBody.innerHTML = filteredStaff
      .map((staff) => {
        const cells = days
          .map((day) => {
            const shifts = getShiftsForStaffAndDate(staff.StaffId, day);
            const shiftsHtml = shifts
              .map(
                (shift) => `
          <div class="shift-block border rounded p-1 mb-1 bg-light" 
               style="font-size: 0.85em; cursor: pointer;"
               data-shift-id="${shift.ShiftId}">
            <div class="fw-bold">${shift.StartTime.substring(
              0,
              5
            )} - ${shift.EndTime.substring(0, 5)}</div>
            ${
              shift.Notes
                ? `<div class="text-muted small">${safe(shift.Notes)}</div>`
                : ""
            }
            <div class="d-flex justify-content-end gap-1 mt-1">
              <span class="text-primary edit-shift" data-shift-id="${
                shift.ShiftId
              }" style="cursor:pointer; font-size:0.8em">Edit</span>
              <span class="text-danger delete-shift" data-shift-id="${
                shift.ShiftId
              }" style="cursor:pointer; font-size:0.8em">Del</span>
            </div>
          </div>
        `
              )
              .join("");

            return `<td class="day-cell" data-staff-id="${
              staff.StaffId
            }" data-date="${formatDate(
              day
            )}" style="min-width:120px; vertical-align:top;">
          ${shiftsHtml}
          <div class="add-shift-btn text-center text-muted" style="cursor:pointer; padding:5px; border:1px dashed #ccc; border-radius:3px; font-size:0.8em;" 
               data-staff-id="${staff.StaffId}" data-date="${formatDate(
              day
            )}">+ Add</div>
        </td>`;
          })
          .join("");

        return `
        <tr>
          <td class="fw-bold bg-light">${safe(staff.FirstName)} ${safe(
          staff.LastName
        )}</td>
          ${cells}
        </tr>
      `;
      })
      .join("");
  }

  async function checkOverlap(
    staffId,
    date,
    startTime,
    endTime,
    excludeShiftId = null
  ) {
    const shifts = getShiftsForStaffAndDate(staffId, new Date(date));
    const filteredShifts = excludeShiftId
      ? shifts.filter((s) => s.ShiftId !== excludeShiftId)
      : shifts;

    return filteredShifts.some((shift) => {
      return startTime < shift.EndTime && endTime > shift.StartTime;
    });
  }

  async function saveShift(shiftData) {
    const method = shiftData.ShiftId ? "PUT" : "POST";
    const url = shiftData.ShiftId
      ? `${window.API_BASE}/Shifts/${shiftData.ShiftId}`
      : `${window.API_BASE}/Shifts`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(shiftData),
    });

    if (!res.ok) throw new Error(`Failed to save shift (HTTP ${res.status})`);
    return await res.json();
  }

  async function deleteShift(shiftId) {
    const res = await fetch(`${window.API_BASE}/Shifts/${shiftId}`, {
      method: "DELETE",
      headers: { ...authHeader() },
    });
    if (!res.ok) throw new Error(`Failed to delete shift (HTTP ${res.status})`);
  }

  function openShiftModal(shiftData = null) {
    const form = shiftForm;
    form.classList.remove("was-validated");
    overlapWarning.classList.add("d-none");

    if (shiftData) {
      // Edit mode - repopulate without "Select Staff" option
      populateStaffSelect(true);
      shiftModalTitle.textContent = "Edit Shift";
      document.getElementById("shiftId").value = shiftData.ShiftId || "";
      // =================================================================
      // Bug Fix: Staff Preselection Type Consistency
      // Developer: Tim
      // Date: 2025-09-25
      // Description: Ensure consistent string type for staff preselection
      // Issue: Type mismatch prevents proper staff selection in edit mode
      // Bug Reference: Bug #2
      // =================================================================
      document.getElementById("shiftStaffId").value = String(shiftData.StaffId || "");
      document.getElementById("shiftDate").value = shiftData.ShiftDate || "";
      document.getElementById("shiftStartTime").value =
        shiftData.StartTime || "";
      document.getElementById("shiftEndTime").value = shiftData.EndTime || "";
      document.getElementById("shiftNotes").value = shiftData.Notes || "";
    } else {
      // Add mode - include "Select Staff" option
      populateStaffSelect(false);
      shiftModalTitle.textContent = "Add Shift";
      form.reset();
      document.getElementById("shiftId").value = "";
    }

    shiftModal.show();
  }

  if (btnPrevWeek) {
    btnPrevWeek.addEventListener("click", () => {
      currentWeekStart.setDate(currentWeekStart.getDate() - 7);
      updateWeekDisplay();
      loadShifts();
    });
  }

  if (btnNextWeek) {
    btnNextWeek.addEventListener("click", () => {
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      updateWeekDisplay();
      loadShifts();
    });
  }

  if (btnThisWeek) {
    btnThisWeek.addEventListener("click", () => {
      currentWeekStart = getWeekStart(new Date());
      updateWeekDisplay();
      loadShifts();
    });
  }

  if (btnAddShift) {
    btnAddShift.addEventListener("click", () => openShiftModal());
  }

  if (staffFilter) {
    staffFilter.addEventListener("input", applyStaffFilter);
  }

  if (scheduleBody) {
    scheduleBody.addEventListener("click", async (e) => {
      if (e.target.classList.contains("add-shift-btn")) {
        const staffId = e.target.getAttribute("data-staff-id");
        const date = e.target.getAttribute("data-date");
        openShiftModal({ StaffId: staffId, ShiftDate: date });
      } else if (e.target.classList.contains("edit-shift")) {
        const shiftId = e.target.getAttribute("data-shift-id");
        const shift = allShifts.find((s) => s.ShiftId == shiftId);
        if (shift) openShiftModal(shift);
      } else if (e.target.classList.contains("delete-shift")) {
        const shiftId = e.target.getAttribute("data-shift-id");
        if (confirm("Are you sure you want to delete this shift?")) {
          try {
            await deleteShift(shiftId);
            await loadShifts();
          } catch (err) {
            alert(err.message || "Failed to delete shift");
          }
        }
      }
    });
  }

  if (shiftForm) {
    shiftForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!shiftForm.checkValidity()) {
        shiftForm.classList.add("was-validated");
        return;
      }

      const shiftData = {
        ShiftId: document.getElementById("shiftId").value || null,
        StaffId: document.getElementById("shiftStaffId").value,
        ShiftDate: document.getElementById("shiftDate").value,
        StartTime: document.getElementById("shiftStartTime").value + ":00",
        EndTime: document.getElementById("shiftEndTime").value + ":00",
        Notes: document.getElementById("shiftNotes").value || null,
      };

      const hasOverlap = await checkOverlap(
        shiftData.StaffId,
        shiftData.ShiftDate,
        shiftData.StartTime,
        shiftData.EndTime,
        shiftData.ShiftId
      );

      if (hasOverlap) {
        overlapWarning.classList.remove("d-none");
        return;
      }

      try {
        shiftSpinner.classList.remove("d-none");
        await saveShift(shiftData);
        shiftModal.hide();
        await loadShifts();
      } catch (err) {
        alert(err.message || "Failed to save shift");
      } finally {
        shiftSpinner.classList.add("d-none");
      }
    });
  }

  // =================================================================
  // Bug Fix: Safe Event Listener Attachment
  // Developer: Tim
  // Date: 2025-09-25
  // Description: Add null check for safer event listener attachment
  // Issue: Potential null reference error if DOM element not found
  // Bug Reference: Bug #2
  // =================================================================
  const shiftStaffSelect = document.getElementById("shiftStaffId");
  if (shiftStaffSelect) {
    shiftStaffSelect.addEventListener("change", async () => {
      overlapWarning.classList.add("d-none");
    });
  }

  ["shiftDate", "shiftStartTime", "shiftEndTime"].forEach((id) => {
    document.getElementById(id).addEventListener("change", async () => {
      overlapWarning.classList.add("d-none");
    });
  });

  async function init() {
    updateWeekDisplay();
    await loadStaff();
    await loadShifts();
  }

  init();
})();
