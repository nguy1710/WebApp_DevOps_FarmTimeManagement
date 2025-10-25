// Staff Schedule Page - Display schedule for logged-in staff only
(function () {
  const loadingBox = document.getElementById("loadingBox");
  const loadError = document.getElementById("loadError");
  const scheduleBody = document.getElementById("scheduleBody");
  const weekDisplay = document.getElementById("weekDisplay");
  const btnPrevWeek = document.getElementById("btnPrevWeek");
  const btnThisWeek = document.getElementById("btnThisWeek");
  const btnNextWeek = document.getElementById("btnNextWeek");

  let currentWeekStart = null;
  let staffSession = null;
  let allSchedules = [];

  // Get staff session from localStorage
  function getStaffSession() {
    const session = localStorage.getItem('staff_session');
    if (!session) return null;
    
    try {
      return JSON.parse(session);
    } catch (e) {
      console.error("Error parsing staff session:", e);
      return null;
    }
  }

  // Show error message
  function showError(message) {
    if (loadError) {
      loadError.textContent = message;
      loadError.classList.remove('d-none');
    }
    if (loadingBox) {
      loadingBox.classList.add('d-none');
    }
  }

  // Hide error message
  function hideError() {
    if (loadError) {
      loadError.classList.add('d-none');
    }
  }

  // Set loading state
  function setLoading(isLoading) {
    if (loadingBox) {
      loadingBox.classList.toggle('d-none', !isLoading);
    }
    if (!isLoading) {
      hideError();
    }
  }

  // Get error message from response
  async function getErrorMessage(response) {
    try {
      const errorData = await response.json();
      return errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    } catch (e) {
      return `HTTP ${response.status}: ${response.statusText}`;
    }
  }

  // Format time for display
  function formatTime(timeString) {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  // Format date for display
  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  }

  // Get Monday of the week for given date
  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  // Get week start (Monday) for current week
  function getCurrentWeekStart() {
    return getMonday(new Date());
  }

  // Format week display
  function formatWeekDisplay(weekStart) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const startStr = weekStart.toLocaleDateString('en-AU', {
      month: 'short',
      day: 'numeric'
    });
    const endStr = weekEnd.toLocaleDateString('en-AU', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    return `${startStr} - ${endStr}`;
  }

  // Load schedules for current staff
  async function loadSchedules() {
    if (!staffSession) {
      showError("Staff session not found. Please login again.");
      return;
    }

    try {
      setLoading(true);
      hideError();

      const response = await fetch(`${window.API_BASE}/Roster/staff/${staffSession.staffId}`);
      if (!response.ok) {
        const errMsg = await getErrorMessage(response);
        throw new Error(errMsg);
      }

      allSchedules = await response.json();
      renderSchedule();
      
    } catch (err) {
      showError(err.message || "Failed to load schedule");
      allSchedules = [];
      renderSchedule();
    } finally {
      setLoading(false);
    }
  }

  // Filter schedules for current week
  function getSchedulesForCurrentWeek() {
    if (!currentWeekStart || allSchedules.length === 0) return [];
    
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999); // End of Sunday
    
    const weekStart = new Date(currentWeekStart);
    weekStart.setHours(0, 0, 0, 0); // Start of Monday
    
    return allSchedules.filter(schedule => {
      const scheduleDate = new Date(schedule.StartTime);
      return scheduleDate >= weekStart && scheduleDate <= weekEnd;
    });
  }

  // Render schedule table
  function renderSchedule() {
    if (!scheduleBody) return;

    // Clear existing content
    scheduleBody.innerHTML = '';

    // Get schedules for current week
    const weekSchedules = getSchedulesForCurrentWeek();

    if (weekSchedules.length === 0) {
      scheduleBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted py-4">
            No schedule found for this week
          </td>
        </tr>
      `;
      return;
    }

    // Get staff name
    const staffName = `${staffSession.firstName} ${staffSession.lastName}`;

    // Create week days array
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Create row for current staff
    const row = document.createElement('tr');
    
    // Staff name cell
    const staffCell = document.createElement('td');
    staffCell.innerHTML = `
      <div class="fw-bold">${staffName}</div>
      <small class="text-muted">ID: ${staffSession.staffId}</small>
    `;
    row.appendChild(staffCell);

    // Create cells for each day of the week
    weekDays.forEach((day, index) => {
      const dayCell = document.createElement('td');
      
      // Find all schedules for this specific day
      const daySchedules = weekSchedules.filter(schedule => {
        const scheduleDate = new Date(schedule.StartTime);
        const dayOfWeek = scheduleDate.getDay();
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday=0 to Sunday=6
        return adjustedDay === index;
      });

      if (daySchedules.length > 0) {
        // Sort schedules by start time
        daySchedules.sort((a, b) => new Date(a.StartTime) - new Date(b.StartTime));
        
        let schedulesHtml = '';
        let totalHours = 0;
        
        daySchedules.forEach((schedule, scheduleIndex) => {
          const startTime = formatTime(schedule.StartTime);
          const endTime = formatTime(schedule.EndTime);
          const hours = schedule.ScheduleHours || 0;
          totalHours += hours;
          
          schedulesHtml += `
            <div class="mb-1 ${scheduleIndex > 0 ? 'border-top pt-1' : ''}">
              <div class="fw-bold text-primary small">${startTime} - ${endTime}</div>
              <small class="text-muted">${hours} hrs</small>
            </div>
          `;
        });
        
        dayCell.innerHTML = `
          <div class="text-center">
            ${schedulesHtml}
            ${daySchedules.length > 1 ? `<div class="mt-1 fw-bold text-success">Total: ${totalHours} hrs</div>` : ''}
          </div>
        `;
        dayCell.className = 'table-success';
      } else {
        dayCell.innerHTML = '<div class="text-center text-muted">-</div>';
        dayCell.className = 'table-light';
      }
      
      row.appendChild(dayCell);
    });

    scheduleBody.appendChild(row);
  }

  // Update week display
  function updateWeekDisplay() {
    if (weekDisplay) {
      weekDisplay.textContent = formatWeekDisplay(currentWeekStart);
    }
  }

  // Go to previous week
  function goToPreviousWeek() {
    currentWeekStart = new Date(currentWeekStart);
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    updateWeekDisplay();
    renderSchedule();
  }

  // Go to current week
  function goToCurrentWeek() {
    currentWeekStart = getCurrentWeekStart();
    updateWeekDisplay();
    renderSchedule();
  }

  // Go to next week
  function goToNextWeek() {
    currentWeekStart = new Date(currentWeekStart);
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    updateWeekDisplay();
    renderSchedule();
  }

  // Event listeners
  if (btnPrevWeek) {
    btnPrevWeek.addEventListener('click', goToPreviousWeek);
  }

  if (btnThisWeek) {
    btnThisWeek.addEventListener('click', goToCurrentWeek);
  }

  if (btnNextWeek) {
    btnNextWeek.addEventListener('click', goToNextWeek);
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', async () => {
    staffSession = getStaffSession();
    if (!staffSession) {
      window.location.href = 'staff-login.html';
      return;
    }
    
    // Set current week
    currentWeekStart = getCurrentWeekStart();
    updateWeekDisplay();
    
    await loadSchedules();
  });

  // Also call immediately in case DOMContentLoaded already fired
  staffSession = getStaffSession();
  if (staffSession) {
    currentWeekStart = getCurrentWeekStart();
    updateWeekDisplay();
    loadSchedules();
  } else {
    window.location.href = 'staff-login.html';
  }

})();
