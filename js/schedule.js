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

  function formatTimeTo12Hour(time24) {
    if (!time24) return "";
    const time = time24.substring(0, 5); // Get HH:MM part
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    
    if (hour === 0) {
      hour = 12; // 00:xx becomes 12:xx AM
    } else if (hour > 12) {
      hour = hour - 12; // 13:xx becomes 1:xx PM
    }
    
    return `${hour}:${minutes} ${ampm}`;
  }

  async function loadStaff() {
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
      allStaff = Array.isArray(data) ? data : [];
      populateStaffSelect();
      applyStaffFilter();
    } catch (err) {
      console.error("Error loading staff:", err);
    }
  }

  function populateStaffSelect() {
    const select = document.getElementById("shiftStaffId");
    select.innerHTML = '<option value="">Select Staff</option>';
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
        `${window.API_BASE}/Roster`,
        {
          method: "GET",
          headers: { ...authHeader() },
        }
      );
      if (!res.ok) {
        const errorMessage = await getErrorMessage(res);
        throw new Error(errorMessage);
      }
      const data = await res.json();
      const schedules = Array.isArray(data) ? data : [];

      // Filter schedules for current week and map to shift format for compatibility
      allShifts = schedules
        .filter(schedule => {
          const scheduleDate = new Date(schedule.StartTime);
          return scheduleDate >= currentWeekStart && scheduleDate <= weekEnd;
        })
        .map(schedule => ({
          ShiftId: schedule.ScheduleId,
          StaffId: schedule.StaffId,
          ShiftDate: schedule.StartTime.split('T')[0],
          StartTime: schedule.StartTime.split('T')[1].substring(0, 8),
          EndTime: schedule.EndTime.split('T')[1].substring(0, 8),
          Notes: ""
        }));

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
            <div class="fw-bold">${formatTimeTo12Hour(shift.StartTime)} - ${formatTimeTo12Hour(shift.EndTime)}</div>
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
      ? `${window.API_BASE}/Roster/${shiftData.ShiftId}`
      : `${window.API_BASE}/Roster/assign`;

    // Convert shift data to roster format
    const rosterData = {
      StaffId: parseInt(shiftData.StaffId),
      StartTime: `${shiftData.ShiftDate}T${shiftData.StartTime}`,
      EndTime: `${shiftData.ShiftDate}T${shiftData.EndTime}`,
      Notes: ""
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(rosterData),
    });

    if (!res.ok) {
      const errorMessage = await getErrorMessage(res);
      throw new Error(errorMessage);
    }
    return await res.json();
  }

  async function deleteShift(shiftId) {
    const res = await fetch(`${window.API_BASE}/Roster/${shiftId}`, {
      method: "DELETE",
      headers: { ...authHeader() },
    });
    if (!res.ok) {
      const errorMessage = await getErrorMessage(res);
      throw new Error(errorMessage);
    }
  }

  function openShiftModal(shiftData = null) {
    const form = shiftForm;
    form.classList.remove("was-validated");
    overlapWarning.classList.add("d-none");

    const staffSelect = document.getElementById("shiftStaffId");
    const staffSelectGroup = staffSelect.closest('.mb-3'); // Get the form group container

    if (shiftData) {
      const isEditMode = shiftData.ShiftId; // Check if editing existing shift
      const isStaffLocked = shiftData.StaffId && !isEditMode; // Lock staff when adding to specific person

      if (isEditMode) {
        shiftModalTitle.textContent = "Edit Shift";
      } else {
        shiftModalTitle.textContent = "Add Shift";
      }

      document.getElementById("shiftId").value = shiftData.ShiftId || "";
      document.getElementById("shiftDate").value = shiftData.ShiftDate || "";
      document.getElementById("shiftStartTime").value = shiftData.StartTime || "";
      document.getElementById("shiftEndTime").value = shiftData.EndTime || "";

      if (isStaffLocked || isEditMode) {
        // Lock staff selection for both edit mode and when adding to specific person
        // Hide the dropdown and show staff name as read-only text
        staffSelect.style.display = 'none';
        staffSelect.value = String(shiftData.StaffId);

        // Create or update read-only staff display
        let staffDisplay = staffSelectGroup.querySelector('.staff-display-readonly');
        if (!staffDisplay) {
          staffDisplay = document.createElement('div');
          staffDisplay.className = 'staff-display-readonly form-control-plaintext fw-bold';
          staffSelectGroup.appendChild(staffDisplay);
        }

        // Find and display staff name
        const staff = allStaff.find(s => s.StaffId == shiftData.StaffId);
        staffDisplay.textContent = staff ? `${staff.FirstName} ${staff.LastName}` : 'Unknown Staff';
        staffDisplay.style.display = 'block';
      } else {
        // Show dropdown for general add shift (not locked to specific person)
        staffSelect.style.display = 'block';
        staffSelect.value = String(shiftData.StaffId || "");

        // Hide read-only display if it exists
        const staffDisplay = staffSelectGroup.querySelector('.staff-display-readonly');
        if (staffDisplay) {
          staffDisplay.style.display = 'none';
        }
      }
    } else {
      shiftModalTitle.textContent = "Add Shift";
      form.reset();
      document.getElementById("shiftId").value = "";

      // Show dropdown for general add shift
      staffSelect.style.display = 'block';

      // Hide read-only display if it exists
      const staffDisplay = staffSelectGroup.querySelector('.staff-display-readonly');
      if (staffDisplay) {
        staffDisplay.style.display = 'none';
      }
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
        Notes: null,
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
