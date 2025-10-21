function authHeader() {
  const u = JSON.parse(localStorage.getItem("farm_user") || "null");
  return u && u.token ? { Authorization: "Bearer " + u.token } : {};
}

async function getErrorMessage(response) {
  try {
    const errorData = await response.json();
    return (
      errorData.message ||
      errorData.error ||
      errorData.detail ||
      `HTTP ${response.status}`
    );
  } catch {
    return `HTTP ${response.status}`;
  }
}

(function () {
  const user = JSON.parse(localStorage.getItem("farm_user") || "null");
  const loadingBox = document.getElementById("loadingBox");
  const loadError = document.getElementById("loadError");
  const rosterContainer = document.getElementById("rosterContainer");
  const noRosterData = document.getElementById("noRosterData");
  const rosterTableBody = document.getElementById("rosterTableBody");
  const currentWeekDisplay = document.getElementById("currentWeekDisplay");
  const btnPrevWeek = document.getElementById("btnPrevWeek");
  const btnNextWeek = document.getElementById("btnNextWeek");
  const btnCurrentWeek = document.getElementById("btnCurrentWeek");
  const btnRefreshRoster = document.getElementById("btnRefreshRoster");
  const btnPrintRoster = document.getElementById("btnPrintRoster");

  // Summary elements
  const totalHours = document.getElementById("totalHours");
  const scheduledDays = document.getElementById("scheduledDays");
  const breakHours = document.getElementById("breakHours");

  // Guard page
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Get current user's staff ID
  const staffId = user.staff?.staffId || user.staffId;
  if (!staffId) {
    if (loadError) {
      loadError.textContent =
        "Unable to identify staff member. Please contact administrator.";
      loadError.classList.remove("d-none");
    }
    if (loadingBox) loadingBox.classList.add("d-none");
    return;
  }

  // Current week management
  let currentWeekStart = getWeekStart(new Date());

  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  function formatDateDisplay(date) {
    return date.toLocaleDateString("en-AU", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function updateWeekDisplay() {
    if (currentWeekDisplay) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      currentWeekDisplay.textContent = `${formatDateDisplay(
        currentWeekStart
      )} - ${formatDateDisplay(weekEnd)}`;
    }
  }

  // Load roster data
  let rosterData = [];
  async function fetchRoster() {
    try {
      if (loadingBox) loadingBox.classList.remove("d-none");
      if (loadError) loadError.classList.add("d-none");
      if (rosterContainer) rosterContainer.classList.add("d-none");
      if (noRosterData) noRosterData.classList.add("d-none");

      const weekStartDate = formatDate(currentWeekStart);
      const res = await fetch(
        `${window.API_BASE}/roster/staff/${encodeURIComponent(
          staffId
        )}?weekStartDate=${weekStartDate}`,
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
      rosterData = Array.isArray(data) ? data : [];
      renderRoster(rosterData);
      updateSummary(rosterData);
    } catch (err) {
      if (loadError) {
        loadError.textContent = err.message || "Cannot load roster data.";
        loadError.classList.remove("d-none");
      }
    } finally {
      if (loadingBox) loadingBox.classList.add("d-none");
    }
  }

  function renderRoster(roster) {
    if (!rosterTableBody) return;

    if (!roster || roster.length === 0) {
      if (rosterContainer) rosterContainer.classList.add("d-none");
      if (noRosterData) noRosterData.classList.remove("d-none");
      return;
    }

    if (rosterContainer) rosterContainer.classList.remove("d-none");
    if (noRosterData) noRosterData.classList.add("d-none");

    // Generate week days
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      weekDays.push(date);
    }

    rosterTableBody.innerHTML = weekDays
      .map((day) => {
        const dayStr = formatDate(day);
        const dayRoster = roster.find((r) => r.date === dayStr);

        if (dayRoster) {
          const startTime = dayRoster.startTime || "N/A";
          const endTime = dayRoster.endTime || "N/A";
          const breakDuration = dayRoster.breakDuration || "0";
          const totalHours = dayRoster.totalHours || "0";
          const status = dayRoster.status || "Scheduled";

          return `
          <tr>
            <td class="text-center fw-bold">${day.toLocaleDateString("en-AU", {
              weekday: "long",
            })}</td>
            <td class="text-center">${day.toLocaleDateString("en-AU")}</td>
            <td class="text-center">${startTime}</td>
            <td class="text-center">${endTime}</td>
            <td class="text-center">${breakDuration}h</td>
            <td class="text-center fw-bold">${totalHours}h</td>
            <td class="text-center">
              <span class="badge ${getStatusBadgeClass(
                status
              )}">${status}</span>
            </td>
          </tr>
        `;
        } else {
          return `
          <tr>
            <td class="text-center fw-bold">${day.toLocaleDateString("en-AU", {
              weekday: "long",
            })}</td>
            <td class="text-center">${day.toLocaleDateString("en-AU")}</td>
            <td class="text-center text-muted">-</td>
            <td class="text-center text-muted">-</td>
            <td class="text-center text-muted">-</td>
            <td class="text-center text-muted">-</td>
            <td class="text-center">
              <span class="badge bg-secondary">Not Scheduled</span>
            </td>
          </tr>
        `;
        }
      })
      .join("");
  }

  function getStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-primary";
      case "completed":
        return "bg-success";
      case "cancelled":
        return "bg-danger";
      case "pending":
        return "bg-warning";
      default:
        return "bg-secondary";
    }
  }

  function updateSummary(roster) {
    if (!roster || roster.length === 0) {
      if (totalHours) totalHours.textContent = "0";
      if (scheduledDays) scheduledDays.textContent = "0";
      if (breakHours) breakHours.textContent = "0";
      return;
    }

    const total = roster.reduce(
      (sum, r) => sum + (parseFloat(r.totalHours) || 0),
      0
    );
    const scheduled = roster.filter(
      (r) => r.status && r.status.toLowerCase() !== "not scheduled"
    ).length;
    const breaks = roster.reduce(
      (sum, r) => sum + (parseFloat(r.breakDuration) || 0),
      0
    );

    if (totalHours) totalHours.textContent = total.toFixed(1);
    if (scheduledDays) scheduledDays.textContent = scheduled;
    if (breakHours) breakHours.textContent = breaks.toFixed(1);
  }

  // Event handlers
  if (btnPrevWeek) {
    btnPrevWeek.addEventListener("click", () => {
      currentWeekStart.setDate(currentWeekStart.getDate() - 7);
      updateWeekDisplay();
      fetchRoster();
    });
  }

  if (btnNextWeek) {
    btnNextWeek.addEventListener("click", () => {
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      updateWeekDisplay();
      fetchRoster();
    });
  }

  if (btnCurrentWeek) {
    btnCurrentWeek.addEventListener("click", () => {
      currentWeekStart = getWeekStart(new Date());
      updateWeekDisplay();
      fetchRoster();
    });
  }

  if (btnRefreshRoster) {
    btnRefreshRoster.addEventListener("click", () => {
      fetchRoster();
    });
  }

  if (btnPrintRoster) {
    btnPrintRoster.addEventListener("click", () => {
      window.print();
    });
  }

  // Initialize
  updateWeekDisplay();
  fetchRoster();

  // Auto-refresh every 5 minutes
  setInterval(fetchRoster, 5 * 60 * 1000);
})();
