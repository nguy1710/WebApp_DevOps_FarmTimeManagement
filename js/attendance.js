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
  const currentTime = document.getElementById("currentTime");
  const currentDate = document.getElementById("currentDate");
  const btnSimulateScan = document.getElementById("btnSimulateScan");
  const scanPrompt = document.getElementById("scanPrompt");
  const scanProcessing = document.getElementById("scanProcessing");
  const scanResult = document.getElementById("scanResult");
  const successResult = document.getElementById("successResult");
  const errorResult = document.getElementById("errorResult");
  const btnNewScan = document.getElementById("btnNewScan");
  const attendanceLoading = document.getElementById("attendanceLoading");
  const attendanceTable = document.getElementById("attendanceTable");
  const attendanceBody = document.getElementById("attendanceBody");
  const viewFilter = document.getElementById("viewFilter");

  const exceptionModal = new bootstrap.Modal(
    document.getElementById("exceptionModal")
  );
  const exceptionForm = document.getElementById("exceptionForm");
  const exceptionSpinner = document.getElementById("exceptionSpinner");

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
  let attendanceRecords = [];
  let lastClockAction = null;

  function safe(val) {
    return (val ?? "") + "";
  }

  function updateClock() {
    const now = new Date();
    currentTime.textContent = now.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    currentDate.textContent = now.toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatDateTime(dateStr) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("en-AU", {
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

  function formatTime(timeStr) {
    try {
      if (!timeStr) return "N/A";
      const date = new Date(timeStr);
      return date.toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return timeStr || "N/A";
    }
  }

  function calculateHours(clockIn, clockOut) {
    if (!clockIn || !clockOut) return "N/A";
    try {
      const inTime = new Date(clockIn);
      const outTime = new Date(clockOut);
      const diffMs = outTime - inTime;
      const hours = diffMs / (1000 * 60 * 60);
      return hours.toFixed(2) + "h";
    } catch {
      return "N/A";
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

  function getStaffName(staffId) {
    const staff = allStaff.find((s) => s.StaffId === staffId);
    return staff ? `${staff.FirstName} ${staff.LastName}` : `Staff #${staffId}`;
  }

  async function simulateBiometricRecognition() {
    return new Promise((resolve) => {
      scanPrompt.classList.add("d-none");
      scanProcessing.classList.remove("d-none");
      scanResult.classList.add("d-none");

      setTimeout(() => {
        scanProcessing.classList.add("d-none");

        const success = Math.random() > 0.1;

        if (success && allStaff.length > 0) {
          const randomStaff =
            allStaff[Math.floor(Math.random() * allStaff.length)];
          resolve({
            success: true,
            staffId: randomStaff.StaffId,
            staffName: `${randomStaff.FirstName} ${randomStaff.LastName}`,
            confidence: Math.floor(Math.random() * 10) + 90,
          });
        } else {
          resolve({
            success: false,
            error:
              Math.random() > 0.5
                ? "Biometric not recognized"
                : "Poor scan quality, please try again",
          });
        }
      }, 2000);
    });
  }

  async function processClockAction(staffId) {
    try {
      const res = await fetch(`${window.API_BASE}/attendance/clock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ StaffId: staffId }),
      });

      if (!res.ok) throw new Error(`Clock action failed (HTTP ${res.status})`);
      return await res.json();
    } catch (err) {
      throw new Error(err.message || "Failed to process clock action");
    }
  }

  async function loadAttendanceRecords() {
    try {
      attendanceLoading.classList.remove("d-none");
      attendanceTable.classList.add("d-none");

      const filter = viewFilter.value;
      let startDate, endDate;
      const now = new Date();

      switch (filter) {
        case "today":
          startDate = endDate = now.toISOString().split("T")[0];
          break;
        case "week":
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay() + 1);
          startDate = weekStart.toISOString().split("T")[0];
          endDate = now.toISOString().split("T")[0];
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split("T")[0];
          endDate = now.toISOString().split("T")[0];
          break;
      }

      const res = await fetch(
        `${window.API_BASE}/attendance?startDate=${startDate}&endDate=${endDate}`,
        {
          method: "GET",
          headers: { ...authHeader() },
        }
      );

      if (!res.ok)
        throw new Error(`Failed to load attendance (HTTP ${res.status})`);
      const data = await res.json();
      attendanceRecords = Array.isArray(data) ? data : [];
      renderAttendanceTable();
    } catch (err) {
      console.error("Error loading attendance:", err);
      attendanceBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${err.message}</td></tr>`;
    } finally {
      attendanceLoading.classList.add("d-none");
      attendanceTable.classList.remove("d-none");
    }
  }

  function renderAttendanceTable() {
    if (!attendanceBody) return;

    attendanceBody.innerHTML = attendanceRecords
      .map((record) => {
        const staffName = getStaffName(record.StaffId);
        const status = getAttendanceStatus(record);
        const hasException = record.ExceptionType || record.ExceptionNotes;

        return `
        <tr ${hasException ? 'class="table-warning"' : ""}>
          <td>${staffName}</td>
          <td>${record.Date}</td>
          <td>${formatTime(record.ClockInTime)}</td>
          <td>${formatTime(record.ClockOutTime)}</td>
          <td>${calculateHours(record.ClockInTime, record.ClockOutTime)}</td>
          <td>
            <span class="badge ${status.class}">${status.text}</span>
            ${
              hasException
                ? '<br><small class="text-warning">Exception: ' +
                  (record.ExceptionType || "Other") +
                  "</small>"
                : ""
            }
          </td>
          <td>
            <button class="btn btn-sm btn-outline-warning btn-exception" 
                    data-attendance-id="${record.AttendanceId}">
              Mark Exception
            </button>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  function getAttendanceStatus(record) {
    if (record.ExceptionType || record.ExceptionNotes) {
      return { text: "Exception", class: "bg-warning" };
    }
    if (!record.ClockOutTime) {
      return { text: "In Progress", class: "bg-info" };
    }
    if (record.ClockInTime && record.ClockOutTime) {
      return { text: "Complete", class: "bg-success" };
    }
    return { text: "Incomplete", class: "bg-secondary" };
  }

  async function loadTodayStats() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(
        `${window.API_BASE}/attendance/stats?date=${today}`,
        {
          method: "GET",
          headers: { ...authHeader() },
        }
      );

      if (res.ok) {
        const stats = await res.json();
        document.getElementById("todayClockIns").textContent =
          stats.clockIns || 0;
        document.getElementById("todayClockOuts").textContent =
          stats.clockOuts || 0;
      }
    } catch (err) {
      console.error("Error loading today stats:", err);
    }
  }

  async function loadRecentActivity() {
    try {
      const res = await fetch(`${window.API_BASE}/attendance/recent?limit=5`, {
        method: "GET",
        headers: { ...authHeader() },
      });

      if (res.ok) {
        const activities = await res.json();
        const recentActivity = document.getElementById("recentActivity");

        if (activities && activities.length > 0) {
          recentActivity.innerHTML = activities
            .map(
              (activity) => `
            <div class="d-flex justify-content-between align-items-center mb-2 small">
              <div>
                <strong>${getStaffName(activity.StaffId)}</strong><br>
                <span class="text-muted">${activity.Action}</span>
              </div>
              <div class="text-end text-muted">
                ${formatTime(activity.Timestamp)}
              </div>
            </div>
          `
            )
            .join("");
        } else {
          recentActivity.innerHTML =
            '<div class="text-center text-muted"><small>No recent activity</small></div>';
        }
      }
    } catch (err) {
      console.error("Error loading recent activity:", err);
    }
  }

  function resetScanInterface() {
    scanPrompt.classList.remove("d-none");
    scanProcessing.classList.add("d-none");
    scanResult.classList.add("d-none");
    successResult.classList.add("d-none");
    errorResult.classList.add("d-none");
  }

  async function markException(attendanceId, exceptionType, notes) {
    const res = await fetch(
      `${window.API_BASE}/attendance/${attendanceId}/exception`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          ExceptionType: exceptionType,
          ExceptionNotes: notes,
        }),
      }
    );

    if (!res.ok)
      throw new Error(`Failed to mark exception (HTTP ${res.status})`);
    return await res.json();
  }

  if (btnSimulateScan) {
    btnSimulateScan.addEventListener("click", async () => {
      try {
        const recognition = await simulateBiometricRecognition();

        if (recognition.success) {
          try {
            const clockResult = await processClockAction(recognition.staffId);

            successResult.classList.remove("d-none");
            document.getElementById("resultDetails").innerHTML = `
              <strong>${recognition.staffName}</strong><br>
              Action: <span class="badge ${
                clockResult.Action === "CLOCK_IN" ? "bg-success" : "bg-info"
              }">${clockResult.Action}</span><br>
              Time: ${formatDateTime(clockResult.Timestamp)}<br>
              ${
                clockResult.IsLate
                  ? '<span class="text-warning">⚠️ Late arrival detected</span><br>'
                  : ""
              }
              ${
                clockResult.Message
                  ? `<small class="text-muted">${clockResult.Message}</small>`
                  : ""
              }
            `;

            lastClockAction = clockResult;
            await loadAttendanceRecords();
            await loadTodayStats();
            await loadRecentActivity();
          } catch (err) {
            errorResult.classList.remove("d-none");
            document.getElementById("errorDetails").innerHTML = `
              <strong>${recognition.staffName}</strong><br>
              Error: ${err.message}
            `;
          }
        } else {
          errorResult.classList.remove("d-none");
          document.getElementById("errorDetails").innerHTML = recognition.error;
        }

        scanResult.classList.remove("d-none");
      } catch (err) {
        console.error("Scan error:", err);
      }
    });
  }

  if (btnNewScan) {
    btnNewScan.addEventListener("click", resetScanInterface);
  }

  if (viewFilter) {
    viewFilter.addEventListener("change", loadAttendanceRecords);
  }

  if (attendanceBody) {
    attendanceBody.addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-exception")) {
        const attendanceId = e.target.getAttribute("data-attendance-id");
        document.getElementById("exceptionAttendanceId").value = attendanceId;
        exceptionModal.show();
      }
    });
  }

  if (exceptionForm) {
    exceptionForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!exceptionForm.checkValidity()) {
        exceptionForm.classList.add("was-validated");
        return;
      }

      const attendanceId = document.getElementById(
        "exceptionAttendanceId"
      ).value;
      const exceptionType = document.getElementById("exceptionType").value;
      const notes = document.getElementById("exceptionNotes").value;

      try {
        exceptionSpinner.classList.remove("d-none");
        await markException(attendanceId, exceptionType, notes);
        exceptionModal.hide();
        await loadAttendanceRecords();
        alert("Exception marked successfully!");
      } catch (err) {
        alert(err.message || "Failed to mark exception");
      } finally {
        exceptionSpinner.classList.add("d-none");
      }
    });
  }

  document.getElementById("btnExportReport").addEventListener("click", () => {
    const filter = viewFilter.value;
    const csvContent = generateCSVReport(attendanceRecords, filter);
    downloadCSV(
      csvContent,
      `attendance-report-${filter}-${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
  });

  function generateCSVReport(records, period) {
    const headers = [
      "Staff Name",
      "Date",
      "Clock In",
      "Clock Out",
      "Hours Worked",
      "Status",
      "Exception Type",
      "Exception Notes",
    ];
    const rows = records.map((record) => [
      getStaffName(record.StaffId),
      record.Date,
      formatTime(record.ClockInTime),
      formatTime(record.ClockOutTime),
      calculateHours(record.ClockInTime, record.ClockOutTime),
      getAttendanceStatus(record).text,
      record.ExceptionType || "",
      record.ExceptionNotes || "",
    ]);

    return [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");
  }

  function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function init() {
    updateClock();
    setInterval(updateClock, 1000);

    await loadStaff();
    await loadAttendanceRecords();
    await loadTodayStats();
    await loadRecentActivity();
  }

  init();
})();
