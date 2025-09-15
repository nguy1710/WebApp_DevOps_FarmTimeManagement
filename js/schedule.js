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
  let allRosters = [];
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

  function populateStaffSelect() {
    const select = document.getElementById("shiftStaffId");
    select.innerHTML = '<option value="">Select Staff</option>';
    allStaff.forEach((staff) => {
      const option = document.createElement("option");
      option.value = staff.StaffId;
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

  async function loadRosters() {
    try {
      const res = await fetch(`${window.API_BASE}/Roster`, {
        method: "GET",
        headers: { ...authHeader() },
      });
      if (!res.ok)
        throw new Error(`Failed to load rosters (HTTP ${res.status})`);
      let data = await res.json();

      // Handle double JSON serialization from backend
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      // Transform backend WorkSchedule format to frontend roster format
      const rosters = Array.isArray(data) ? data.map(schedule => ({
        RosterId: schedule.ScheduleId,
        StaffId: schedule.StaffId,
        Date: schedule.StartTime ? schedule.StartTime.split('T')[0] : '',
        StartTime: schedule.StartTime ? schedule.StartTime.split('T')[1]?.substring(0, 5) : '',
        EndTime: schedule.EndTime ? schedule.EndTime.split('T')[1]?.substring(0, 5) : '',
        Hours: schedule.ScheduleHours,
        Notes: schedule.Notes || ''
      })) : [];

      allRosters = rosters;
      renderSchedule();
    } catch (err) {
      if (loadError) {
        loadError.textContent = err.message || "Cannot load rosters";
        loadError.classList.remove("d-none");
      }
    } finally {
      if (loadingBox) loadingBox.classList.add("d-none");
    }
  }

  function getRostersForStaffAndDate(staffId, date) {
    const dateStr = formatDate(date);
    return allRosters.filter(
      (roster) => roster.StaffId === staffId && roster.Date === dateStr
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
            const rosters = getRostersForStaffAndDate(staff.StaffId, day);
            const rostersHtml = rosters
              .map(
                (roster) => `
          <div class="roster-block border rounded p-1 mb-1 bg-light"
               style="font-size: 0.85em; cursor: pointer;"
               data-roster-id="${roster.RosterId || roster.Id}">
            <div class="fw-bold">${roster.StartTime ? roster.StartTime.substring(
              0,
              5
            ) : ''} - ${roster.EndTime ? roster.EndTime.substring(0, 5) : ''}</div>
            ${
              roster.Notes
                ? `<div class="text-muted small">${safe(roster.Notes)}</div>`
                : ""
            }
            <div class="d-flex justify-content-end gap-1 mt-1">
              <span class="text-primary edit-roster" data-roster-id="${
                roster.RosterId || roster.Id
              }" style="cursor:pointer; font-size:0.8em">Edit</span>
              <span class="text-success assign-roster" data-roster-id="${
                roster.RosterId || roster.Id
              }" data-staff-id="${roster.StaffId}" style="cursor:pointer; font-size:0.8em">Assign</span>
              <span class="text-danger delete-roster" data-roster-id="${
                roster.RosterId || roster.Id
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
          ${rostersHtml}
          <div class="add-roster-btn text-center text-muted" style="cursor:pointer; padding:5px; border:1px dashed #ccc; border-radius:3px; font-size:0.8em;"
               data-staff-id="${staff.StaffId}" data-date="${formatDate(
              day
            )}">+ Add</div>
          <div class="bulk-assign-btn text-center text-info" style="cursor:pointer; padding:3px; font-size:0.7em;"
               data-staff-id="${staff.StaffId}" data-date="${formatDate(
              day
            )}">Bulk Assign</div>
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
    excludeRosterId = null
  ) {
    try {
      // Convert time inputs to DateTime format for backend
      const startDateTime = startTime.includes('T') ? startTime : date + "T" + startTime;
      const endDateTime = endTime.includes('T') ? endTime : date + "T" + endTime;

      const overlapData = {
        StaffId: parseInt(staffId),
        StartTime: startDateTime,
        EndTime: endDateTime
      };

      // Add ExcludeScheduleId if provided (backend expects ScheduleId, not RosterId)
      if (excludeRosterId) {
        overlapData.ExcludeScheduleId = parseInt(excludeRosterId);
      }

      const res = await fetch(`${window.API_BASE}/Roster/validate-overlap`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(overlapData),
      });

      if (!res.ok) {
        console.warn('Overlap validation API failed, using fallback');
        // Fallback to client-side check
        const rosters = getRostersForStaffAndDate(staffId, new Date(date));
        const filteredRosters = excludeRosterId
          ? rosters.filter((r) => (r.RosterId || r.Id) != excludeRosterId)
          : rosters;
        return filteredRosters.some((roster) => {
          const rosterStart = roster.StartTime.includes('T') ? roster.StartTime.split('T')[1] : roster.StartTime;
          const rosterEnd = roster.EndTime.includes('T') ? roster.EndTime.split('T')[1] : roster.EndTime;
          const checkStart = startTime.includes('T') ? startTime.split('T')[1] : startTime;
          const checkEnd = endTime.includes('T') ? endTime.split('T')[1] : endTime;
          return checkStart < rosterEnd && checkEnd > rosterStart;
        });
      }

      const result = await res.json();
      return result.hasOverlap || false;
    } catch (err) {
      console.warn('Overlap check failed, using fallback:', err);
      // Fallback to client-side check
      const rosters = getRostersForStaffAndDate(staffId, new Date(date));
      const filteredRosters = excludeRosterId
        ? rosters.filter((r) => (r.RosterId || r.Id) != excludeRosterId)
        : rosters;
      return filteredRosters.some((roster) => {
        const rosterStart = roster.StartTime.includes('T') ? roster.StartTime.split('T')[1] : roster.StartTime;
        const rosterEnd = roster.EndTime.includes('T') ? roster.EndTime.split('T')[1] : roster.EndTime;
        const checkStart = startTime.includes('T') ? startTime.split('T')[1] : startTime;
        const checkEnd = endTime.includes('T') ? endTime.split('T')[1] : endTime;
        return checkStart < rosterEnd && checkEnd > rosterStart;
      });
    }
  }

  async function saveRoster(rosterData) {
    const isUpdate = rosterData.RosterId || rosterData.Id;

    if (isUpdate) {
      // Use PUT for updates
      const url = `${window.API_BASE}/Roster/${rosterData.RosterId || rosterData.Id}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(rosterData),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Admin permission required to update schedules');
        }
        if (res.status === 409) {
          throw new Error('Updated shift overlaps with existing schedule');
        }
        throw new Error(`Failed to update roster (HTTP ${res.status})`);
      }

      let result = await res.json();
      if (typeof result === 'string') {
        result = JSON.parse(result);
      }
      return result;
    } else {
      // Use assign endpoint for new roster creation
      return await assignRoster(rosterData);
    }
  }

  async function deleteRoster(rosterId) {
    const res = await fetch(`${window.API_BASE}/Roster/${rosterId}`, {
      method: "DELETE",
      headers: { ...authHeader() },
    });
    if (!res.ok) throw new Error(`Failed to delete roster (HTTP ${res.status})`);
  }

  // Roster Assignment functionality
  async function assignRoster(assignmentData) {
    // Transform data to match backend API format
    const backendData = {
      StaffId: assignmentData.StaffId,
      StartTime: assignmentData.StartTime,
      EndTime: assignmentData.EndTime
    };

    const res = await fetch(`${window.API_BASE}/Roster/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(backendData),
    });

    if (!res.ok) {
      const errorText = await res.text();
      if (res.status === 401) {
        throw new Error('Admin permission required to assign shifts');
      }
      if (res.status === 409) {
        throw new Error('Shift overlaps with existing schedule');
      }
      throw new Error(`Failed to assign roster (HTTP ${res.status}): ${errorText}`);
    }

    let result = await res.json();
    // Handle double JSON serialization from backend
    if (typeof result === 'string') {
      result = JSON.parse(result);
    }
    return result;
  }

  // Get roster for specific staff member
  async function getRosterForStaff(staffId) {
    try {
      const res = await fetch(`${window.API_BASE}/Roster/staff/${staffId}`, {
        method: "GET",
        headers: { ...authHeader() },
      });
      if (!res.ok) throw new Error(`Failed to get staff roster (HTTP ${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn('Staff roster endpoint failed:', err);
      // Fallback to filtering all rosters
      return allRosters.filter(r => r.StaffId === parseInt(staffId));
    }
  }

  // Calculate hours for roster period
  async function calculateRosterHours(calculationData) {
    try {
      const res = await fetch(`${window.API_BASE}/Roster/calculate-hours`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(calculationData),
      });
      if (!res.ok) {
        console.warn('Hours calculation API failed');
        return null;
      }
      return await res.json();
    } catch (err) {
      console.warn('Calculate hours failed:', err);
      return null;
    }
  }

  function openRosterModal(rosterData = null) {
    const form = shiftForm;
    form.classList.remove("was-validated");
    overlapWarning.classList.add("d-none");

    if (rosterData) {
      shiftModalTitle.textContent = "Edit Roster";
      document.getElementById("shiftId").value = rosterData.RosterId || rosterData.Id || "";
      document.getElementById("shiftStaffId").value = rosterData.StaffId || "";
      document.getElementById("shiftDate").value = rosterData.Date || rosterData.ShiftDate || "";
      document.getElementById("shiftStartTime").value =
        rosterData.StartTime ? rosterData.StartTime.substring(0, 5) : "";
      document.getElementById("shiftEndTime").value =
        rosterData.EndTime ? rosterData.EndTime.substring(0, 5) : "";
      document.getElementById("shiftNotes").value = rosterData.Notes || "";
    } else {
      shiftModalTitle.textContent = "Add Roster";
      form.reset();
      document.getElementById("shiftId").value = "";
    }

    shiftModal.show();
  }

  if (btnPrevWeek) {
    btnPrevWeek.addEventListener("click", () => {
      currentWeekStart.setDate(currentWeekStart.getDate() - 7);
      updateWeekDisplay();
      loadRosters();
    });
  }

  if (btnNextWeek) {
    btnNextWeek.addEventListener("click", () => {
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      updateWeekDisplay();
      loadRosters();
    });
  }

  if (btnThisWeek) {
    btnThisWeek.addEventListener("click", () => {
      currentWeekStart = getWeekStart(new Date());
      updateWeekDisplay();
      loadRosters();
    });
  }

  if (btnAddShift) {
    btnAddShift.addEventListener("click", () => openRosterModal());
  }

  if (staffFilter) {
    staffFilter.addEventListener("input", applyStaffFilter);
  }

  if (scheduleBody) {
    scheduleBody.addEventListener("click", async (e) => {
      if (e.target.classList.contains("add-roster-btn")) {
        const staffId = e.target.getAttribute("data-staff-id");
        const date = e.target.getAttribute("data-date");
        openRosterModal({ StaffId: staffId, Date: date });
      } else if (e.target.classList.contains("edit-roster")) {
        const rosterId = e.target.getAttribute("data-roster-id");
        const roster = allRosters.find((r) => (r.RosterId || r.Id) == rosterId);
        if (roster) openRosterModal(roster);
      } else if (e.target.classList.contains("assign-roster")) {
        const rosterId = e.target.getAttribute("data-roster-id");
        const staffId = e.target.getAttribute("data-staff-id");
        await handleRosterAssignment(rosterId, staffId);
      } else if (e.target.classList.contains("bulk-assign-btn")) {
        const staffId = e.target.getAttribute("data-staff-id");
        const date = e.target.getAttribute("data-date");
        await handleBulkAssignment(staffId, date);
      } else if (e.target.classList.contains("delete-roster")) {
        const rosterId = e.target.getAttribute("data-roster-id");
        if (confirm("Are you sure you want to delete this roster?")) {
          try {
            await deleteRoster(rosterId);
            await loadRosters();
          } catch (err) {
            alert(err.message || "Failed to delete roster");
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

      const rosterData = {
        RosterId: document.getElementById("shiftId").value || null,
        Id: document.getElementById("shiftId").value || null,
        StaffId: parseInt(document.getElementById("shiftStaffId").value),
        Date: document.getElementById("shiftDate").value,
        StartTime: document.getElementById("shiftDate").value + "T" + document.getElementById("shiftStartTime").value + ":00",
        EndTime: document.getElementById("shiftDate").value + "T" + document.getElementById("shiftEndTime").value + ":00",
        Notes: document.getElementById("shiftNotes").value || null,
      };

      const hasOverlap = await checkOverlap(
        rosterData.StaffId,
        document.getElementById("shiftDate").value,
        rosterData.StartTime,
        rosterData.EndTime,
        rosterData.RosterId || rosterData.Id
      );

      if (hasOverlap) {
        overlapWarning.classList.remove("d-none");
        return;
      }

      try {
        shiftSpinner.classList.remove("d-none");
        await saveRoster(rosterData);
        shiftModal.hide();
        await loadRosters();
      } catch (err) {
        alert(err.message || "Failed to save roster");
      } finally {
        shiftSpinner.classList.add("d-none");
      }
    });
  }

  document
    .getElementById("shiftStaffId")
    .addEventListener("change", async () => {
      overlapWarning.classList.add("d-none");
    });

  ["shiftDate", "shiftStartTime", "shiftEndTime"].forEach((id) => {
    document.getElementById(id).addEventListener("change", async () => {
      overlapWarning.classList.add("d-none");
    });
  });

  // Handle individual roster assignment
  async function handleRosterAssignment(rosterId, staffId) {
    const roster = allRosters.find(r => (r.RosterId || r.Id) == rosterId);
    if (!roster) {
      alert('Roster not found');
      return;
    }

    // Convert roster to assignment format
    const assignmentData = {
      StaffId: parseInt(staffId),
      StartTime: roster.Date + "T" + roster.StartTime + ":00",
      EndTime: roster.Date + "T" + roster.EndTime + ":00"
    };

    try {
      await assignRoster(assignmentData);
      alert('Roster assigned successfully!');
      await loadRosters();
    } catch (err) {
      alert(err.message || 'Failed to assign roster');
    }
  }

  // Handle bulk assignment for multiple rosters
  async function handleBulkAssignment(staffId, date) {
    const staffName = allStaff.find(s => s.StaffId == staffId);
    if (!staffName) {
      alert('Staff not found');
      return;
    }

    const startDate = date;
    const endDate = prompt(`Bulk assign rosters for ${staffName.FirstName} ${staffName.LastName}\nFrom: ${startDate}\nTo (YYYY-MM-DD):`, date);

    if (!endDate) return;

    const startTimeInput = prompt('Default start time (HH:MM):', '09:00');
    const endTimeInput = prompt('Default end time (HH:MM):', '17:00');
    const notes = prompt('Notes (optional):', '') || null;

    if (!startTimeInput || !endTimeInput) {
      alert('Start and end times are required');
      return;
    }

    const template = {
      StaffId: parseInt(staffId),
      Notes: notes
    };

    try {
      // Create multiple roster entries
      const currentDate = new Date(startDate);
      const lastDate = new Date(endDate);
      const assignments = [];

      while (currentDate <= lastDate) {
        // Skip weekends if desired (optional)
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sunday(0) and Saturday(6)
          const dateStr = formatDate(currentDate);
          assignments.push({
            StaffId: template.StaffId,
            StartTime: dateStr + "T" + startTimeInput + ":00",
            EndTime: dateStr + "T" + endTimeInput + ":00",
            Notes: template.Notes
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Save each assignment using assignRoster for new creations
      for (const assignment of assignments) {
        await assignRoster(assignment);
      }

      alert(`Successfully created ${assignments.length} roster assignments!`);
      await loadRosters();
    } catch (err) {
      alert(err.message || 'Failed to create bulk assignments');
    }
  }

  async function init() {
    updateWeekDisplay();
    await loadStaff();
    await loadRosters();
  }

  init();
})();
