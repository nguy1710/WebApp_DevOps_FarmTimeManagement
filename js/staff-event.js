(function () {
  const loadError = document.getElementById("loadError");
  const loadingBox = document.getElementById("loadingBox");
  const eventsTableBody = document.getElementById("eventsTableBody");
  const pagination = document.getElementById("pagination");
  const btnRefresh = document.getElementById("btnRefresh");
  const filterEventType = document.getElementById("filterEventType");
  const btnPrevDay = document.getElementById("btnPrevDay");
  const btnToday = document.getElementById("btnToday");
  const btnNextDay = document.getElementById("btnNextDay");
  const currentDateDisplay = document.getElementById("currentDateDisplay");

  let allEvents = [];
  let filteredEvents = [];
  let deviceList = [];
  let currentPage = 1;
  const itemsPerPage = 10;
  let staffSession = null;
  let currentDate = new Date();

  function getStaffSession() {
    try {
      const session = localStorage.getItem('staff_session');
      return session ? JSON.parse(session) : null;
    } catch (error) {
      console.error('Error parsing staff session:', error);
      return null;
    }
  }

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

  function setLoading(isLoading) {
    if (!loadingBox) return;
    if (isLoading) loadingBox.classList.remove("d-none");
    else loadingBox.classList.add("d-none");
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

  function formatDate(dateString) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  }

  function getDeviceName(deviceId) {
    const device = deviceList.find(d => d.DeviceId === deviceId);
    return device ? device.Location : `Device ${deviceId}`;
  }

  async function loadEvents() {
    if (!staffSession) {
      showError("Staff session not found. Please login again.");
      return;
    }

    try {
      setLoading(true);
      hideError();

      // Use staff-specific endpoint
      const response = await fetch(`${window.API_BASE}/Events/staff/${staffSession.staffId}`);
      if (!response.ok) {
        const errMsg = await getErrorMessage(response);
        throw new Error(errMsg);
      }

      allEvents = await response.json();
      
      // Apply filters to show events for current date
      applyFilters();
    } catch (err) {
      showError(err.message || "Failed to load events");
      allEvents = [];
      applyFilters();
    } finally {
      setLoading(false);
    }
  }

  async function loadDevices() {
    try {
      const response = await fetch(`${window.API_BASE}/Devices`);
      if (!response.ok) {
        console.error('Failed to load devices list');
        return;
      }

      deviceList = await response.json();
    } catch (error) {
      console.error('Error loading devices list:', error);
    }
  }

  function renderEventsDirectly() {
    if (!eventsTableBody) return;

    if (allEvents.length === 0) {
      eventsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted">
            No events found
          </td>
        </tr>
      `;
      return;
    }

    // Sort by timestamp (newest first)
    const sortedEvents = [...allEvents].sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

    eventsTableBody.innerHTML = sortedEvents.map(event => `
      <tr>
        <td>${event.EventId}</td>
        <td>${formatDate(event.Timestamp)}</td>
        <td>
          <span class="badge ${
            event.EventType === 'Clock in' ? 'bg-success' :
            event.EventType === 'Clock out' ? 'bg-danger' :
            event.EventType === 'Break' ? 'bg-warning' : 'bg-secondary'
          }">
            ${event.EventType}
          </span>
        </td>
        <td>${getDeviceName(event.DeviceId)}</td>
        <td>${event.Reason || '-'}</td>
      </tr>
    `).join('');
  }

  function applyFilters() {
    filteredEvents = allEvents.filter(event => {
      // Filter by event type
      if (filterEventType.value && event.EventType !== filterEventType.value) {
        return false;
      }

      // Filter by current date (exact day match)
      const eventDate = new Date(event.Timestamp);
      const filterDate = new Date(currentDate);
      
      // Set both dates to start of day for comparison
      eventDate.setHours(0, 0, 0, 0);
      filterDate.setHours(0, 0, 0, 0);
      
      // Only show events from the selected date
      if (eventDate.getTime() !== filterDate.getTime()) {
        return false;
      }

      return true;
    });

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

    currentPage = 1;
    renderEvents();
  }

  function renderEvents() {
    if (!eventsTableBody) return;

    if (filteredEvents.length === 0) {
      eventsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted">
            No events found
          </td>
        </tr>
      `;
      renderPagination();
      return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageEvents = filteredEvents.slice(startIndex, endIndex);

    eventsTableBody.innerHTML = pageEvents.map(event => `
      <tr>
        <td>${event.EventId}</td>
        <td>${formatDate(event.Timestamp)}</td>
        <td>
          <span class="badge ${
            event.EventType === 'Clock in' ? 'bg-success' :
            event.EventType === 'Clock out' ? 'bg-danger' :
            event.EventType === 'Break' ? 'bg-warning' : 'bg-secondary'
          }">
            ${event.EventType}
          </span>
        </td>
        <td>${getDeviceName(event.DeviceId)}</td>
        <td>${event.Reason || '-'}</td>
      </tr>
    `).join('');

    renderPagination();
  }

  function renderPagination() {
    if (!pagination) return;

    const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
    
    if (totalPages <= 1) {
      pagination.innerHTML = '';
      return;
    }

    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
      <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>
      </li>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      paginationHTML += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
        </li>
      `;
    }

    // Next button
    paginationHTML += `
      <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>
      </li>
    `;

    pagination.innerHTML = paginationHTML;
  }

  function changePage(page) {
    const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
      renderEvents();
    }
  }

  function updateCurrentDateDisplay() {
    if (!currentDateDisplay) return;
    
    const today = new Date();
    const isToday = currentDate.toDateString() === today.toDateString();
    
    if (isToday) {
      currentDateDisplay.textContent = `Today (${currentDate.toLocaleDateString()})`;
      currentDateDisplay.className = 'fw-bold text-primary';
    } else {
      currentDateDisplay.textContent = currentDate.toLocaleDateString();
      currentDateDisplay.className = 'fw-bold';
    }
  }

  function updateCurrentDate(date) {
    currentDate = new Date(date);
    updateCurrentDateDisplay();
    applyFilters();
  }

  function goToPreviousDay() {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    updateCurrentDate(prevDate);
  }

  function goToToday() {
    updateCurrentDate(new Date());
  }

  function goToNextDay() {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    updateCurrentDate(nextDate);
  }

  // Event listeners
  if (btnRefresh) {
    btnRefresh.addEventListener('click', loadEvents);
  }

  if (filterEventType) {
    filterEventType.addEventListener('change', applyFilters);
  }

  if (btnPrevDay) {
    btnPrevDay.addEventListener('click', goToPreviousDay);
  }

  if (btnToday) {
    btnToday.addEventListener('click', goToToday);
  }

  if (btnNextDay) {
    btnNextDay.addEventListener('click', goToNextDay);
  }

  // Global functions for onclick handlers
  window.changePage = changePage;

  // Initialize
  document.addEventListener('DOMContentLoaded', async () => {
    staffSession = getStaffSession();
    if (!staffSession) {
      window.location.href = 'staff-login.html';
      return;
    }
    
    // Set current date to today
    currentDate = new Date();
    updateCurrentDateDisplay();
    
    await loadDevices();
    await loadEvents();
  });

  // Also call immediately in case DOMContentLoaded already fired
  staffSession = getStaffSession();
  if (staffSession) {
    loadDevices().then(() => loadEvents());
  } else {
    window.location.href = 'staff-login.html';
  }
})();
