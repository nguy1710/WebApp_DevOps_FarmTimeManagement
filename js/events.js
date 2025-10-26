// ============================================================================
// TIMEZONE HANDLING STRATEGY
// ============================================================================
// Backend (C# SQL Server) stores timestamps as DATETIME2(0) without timezone info.
// All timestamps are treated as LOCAL TIME (Adelaide time).
//
// IMPORTANT: Do NOT use .toISOString() as it converts to UTC!
//
// When SENDING to backend:
//   - Format: 'YYYY-MM-DD HH:MM:SS' (e.g., '2024-12-30 21:23:00')
//   - This is local Adelaide time, no timezone conversion
//
// When RECEIVING from backend:
//   - Backend returns: "2024-12-30T21:23:00" or "2024-12-30 21:23:00"
//   - Parse as local time (no 'Z' suffix, no timezone offset)
//   - Display as-is without conversion
//
// Example:
//   User selects: 9:23 PM on 2024-12-30
//   Send to API:  '2024-12-30 21:23:00'
//   Store in DB:  2024-12-30 21:23:00 (DATETIME2)
//   Return from API: "2024-12-30T21:23:00"
//   Display to user: 9:23 PM on 2024-12-30
// ============================================================================

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
  const loadingBox = document.getElementById("loadingBox");
  const loadError = document.getElementById("loadError");
  const tableBody = document.getElementById("tableBody");
  const searchInput = document.getElementById("searchInput");
  const btnRefresh = document.getElementById("btnRefresh");

  // Filter controls
  const filterEventType = document.getElementById("filterEventType");
  const selectedDate = document.getElementById("selectedDate");
  const btnPrevDay = document.getElementById("btnPrevDay");
  const btnNextDay = document.getElementById("btnNextDay");
  const btnToday = document.getElementById("btnToday");
  const btnClearFilters = document.getElementById("btnClearFilters");
  const btnCreateEvent = document.getElementById("btnCreateEvent");
  const btnDeleteSelected = document.getElementById("btnDeleteSelected");
  const selectAllCheckbox = document.getElementById("selectAllCheckbox");

  // Modal elements
  const createEventModal = document.getElementById("createEventModal");
  const createEventForm = document.getElementById("createEventForm");
  const eventStaffId = document.getElementById("eventStaffId");
  const eventDeviceId = document.getElementById("eventDeviceId");
  const eventDate = document.getElementById("eventDate");
  const eventTime = document.getElementById("eventTime");
  const eventType = document.getElementById("eventType");
  const eventReason = document.getElementById("eventReason");
  const createEventSpinner = document.getElementById("createEventSpinner");
  const bypassValidation = document.getElementById("bypassValidation");
  const eventId = document.getElementById("eventId");
  const modalTitle = document.getElementById("modalTitle");
  const submitButtonText = document.getElementById("submitButtonText");
  const currentTime = document.getElementById("currentTime");
  const currentDate = document.getElementById("currentDate");

  // Pagination
  const pagination = document.getElementById("pagination");

  // Guard page
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Load data
  let eventsData = [];
  let devicesData = [];
  let staffData = [];
  let currentPage = 1;
  const itemsPerPage = 20;

  // Load staff data
  async function fetchStaffs() {
    try {
      const res = await fetch(`${window.API_BASE}/Staffs/`, {
        method: "GET",
        headers: { ...authHeader() },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          staffData = data;
          console.log("Staff data loaded:", staffData.length, "staff members");
        }
      }
    } catch (err) {
      console.warn("Could not load staff data:", err.message);
    }
  }

  // Load devices for location display
  async function fetchDevices() {
    try {
      const res = await fetch(`${window.API_BASE}/Devices/`, {
        method: "GET",
        headers: { ...authHeader() },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          devicesData = data;
        }
      }
    } catch (err) {
      console.warn("Could not load devices:", err.message);
    }
  }

  // Populate staff dropdown in create event modal
  function populateStaffDropdown() {
    if (!eventStaffId) return;
    
    // Clear existing options except "Select Staff"
    eventStaffId.innerHTML = '<option value="">Select Staff</option>';
    
    // Add staff options with full names
    staffData.forEach(staff => {
      const option = document.createElement('option');
      option.value = staff.StaffId;
      option.textContent = `${staff.FirstName || ''} ${staff.LastName || ''}`.trim();
      eventStaffId.appendChild(option);
    });
  }

  // Populate device dropdown in create event modal
  function populateDeviceDropdown() {
    if (!eventDeviceId) return;
    
    // Clear existing options except "Select Device"
    eventDeviceId.innerHTML = '<option value="">Select Device</option>';
    
    // Add device options
    devicesData.forEach(device => {
      const option = document.createElement('option');
      option.value = device.DeviceId;
      option.textContent = `Device ${device.DeviceId}${device.DeviceName ? ` - ${device.DeviceName}` : ''}${device.Location ? ` (${device.Location})` : ''}`;
      eventDeviceId.appendChild(option);
    });
  }

  // Set current date and time as default
  function setCurrentDateTime() {
    const now = new Date();
    
    // Format for date input (YYYY-MM-DD)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Format for time input (HH:MM)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    if (eventDate) eventDate.value = dateString;
    if (eventTime) eventTime.value = timeString;
  }

  // Reset create event form
  function resetCreateEventForm() {
    if (createEventForm) {
      createEventForm.reset();
      setCurrentDateTime();
      // Remove validation classes
      createEventForm.classList.remove('was-validated');
      // Reset bypass validation switch and disable reason field
      toggleReasonField(false);
      // Reset to create mode
      if (eventId) eventId.value = '';
      if (modalTitle) modalTitle.textContent = 'Create Event';
      if (submitButtonText) submitButtonText.textContent = 'Create Event';
    }
  }

  // Toggle Reason field based on bypass validation switch
  function toggleReasonField(isEnabled) {
    if (eventReason) {
      if (isEnabled) {
        eventReason.disabled = false;
        eventReason.placeholder = "Enter reason for this event";
        eventReason.classList.remove('bg-light');
        eventReason.classList.add('bg-white');
      } else {
        eventReason.disabled = true;
        eventReason.value = '';
        eventReason.placeholder = "Enter reason for this event (unlock with By Pass Validation)";
        eventReason.classList.remove('bg-white');
        eventReason.classList.add('bg-light');
      }
    }
  }

  // Populate edit form with existing event data
  function populateEditForm(event) {
    if (!event) return;
    
    // Set form to edit mode
    if (eventId) eventId.value = event.EventId;
    if (modalTitle) modalTitle.textContent = 'Edit Event';
    if (submitButtonText) submitButtonText.textContent = 'Update Event';
    
    // Populate staff dropdown first
    populateStaffDropdown();
    
    // Set form values
    if (eventStaffId) {
      eventStaffId.value = event.StaffId;
    }
    
    if (eventDeviceId) {
      populateDeviceDropdown();
      eventDeviceId.value = event.DeviceId;
    }
    
    // Set date and time from timestamp (preserve local time, no timezone conversion)
    if (event.Timestamp) {
      // Parse timestamp as local time
      let timestampStr = event.Timestamp.toString().replace('T', ' ');
      const date = new Date(timestampStr);
      
      // Extract date and time components without timezone conversion
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      const dateString = `${year}-${month}-${day}`;
      const timeString = `${hours}:${minutes}`;
      
      if (eventDate) eventDate.value = dateString;
      if (eventTime) eventTime.value = timeString;
      
      console.log('Edit form populated with local time:', dateString, timeString);
    }
    
    if (eventType) {
      eventType.value = event.EventType;
    }
    
    // Handle reason field
    if (eventReason) {
      if (event.Reason) {
        eventReason.value = event.Reason;
        // Enable bypass validation if there's a reason
        if (bypassValidation) {
          bypassValidation.checked = true;
          toggleReasonField(true);
        }
      } else {
        // No reason, keep bypass validation off
        if (bypassValidation) {
          bypassValidation.checked = false;
          toggleReasonField(false);
        }
      }
    }
  }

  // Helper function to build SQL query for events
  // Returns all events (no date filtering in SQL, filtering happens in frontend)
  // 
  // Example Event data format (SQL):
  // INSERT INTO [Event] ([Timestamp], StaffId, DeviceId, EventType, Reason)
  // VALUES 
  // ('2024-12-30 08:00:00', 2, 1, 'Clock in', NULL),
  // ('2024-12-30 18:30:00', 2, 1, 'Clock out', NULL),
  // ('2024-12-30 13:00:00', 2, 1, 'Break', NULL)
  function buildEventsQuery() {
    const sqlQuery = `
      SELECT EventId, Timestamp, StaffId, DeviceId, EventType, Reason 
      FROM [Event] 
      ORDER BY Timestamp DESC
    `.trim();
    
    return sqlQuery;
  }
  
  // Log example SQL queries for reference
  console.log(`
====================================
Events SQL Query Examples:
====================================

1. Get all events:
SELECT EventId, Timestamp, StaffId, DeviceId, EventType, Reason FROM [Event]

2. Get events for specific date:
SELECT * FROM [Event] WHERE CAST(Timestamp AS DATE) = '2024-12-30'

3. Get events up to a date:
SELECT * FROM [Event] WHERE CAST(Timestamp AS DATE) <= '2024-12-30' ORDER BY Timestamp DESC

4. Get Clock In events only:
SELECT * FROM [Event] WHERE EventType = 'Clock in'

4b. Get Break events only:
SELECT * FROM [Event] WHERE EventType = 'Break'

5. Get events for specific staff:
SELECT * FROM [Event] WHERE StaffId = 2

Event Table Structure:
- EventId (int, PK, auto-increment)
- Timestamp (datetime2(0))
- StaffId (int, FK to Staff)
- DeviceId (int, nullable, FK to Device)
- EventType (nvarchar, 'Clock in', 'Clock out', or 'Break')
- Reason (nvarchar, nullable)
====================================
  `);

  // Load events using POST /api/Events/query with SQL query
  async function fetchEvents() {
    try {
      // Build SQL query to get all events (filtering by date happens in frontend)
      const sqlQuery = buildEventsQuery();

      console.log('SQL Query to be sent:', sqlQuery);

      // POST SQL query to /api/Events/query
      const res = await fetch(`${window.API_BASE}/Events/query`, {
        method: "POST",
        headers: { 
          ...authHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sqlQuery)
      });

      if (!res.ok) {
        const errorMessage = await getErrorMessage(res);
        throw new Error(errorMessage);
      }
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Response was not array.");
      
      console.log('Events loaded via SQL query:', data.length, 'events');
      
      // Data is already sorted DESC by Timestamp in SQL query
      eventsData = data;
      
      renderTable(getPaginatedData());
      renderPagination();
      applyFilters();
    } catch (err) {
      console.error('Error fetching events:', err);
      if (loadError) {
        loadError.textContent = err.message || "Cannot download data.";
        loadError.classList.remove("d-none");
      }
    } finally {
      if (loadingBox) loadingBox.classList.add("d-none");
    }
  }

  function getPaginatedData() {
    const filtered = getFilteredData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }

  function getFilteredData() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    const eventType = (filterEventType?.value || "").trim();
    const selectedDateValue = selectedDate?.value;

    return eventsData.filter((event) => {
      // Text search across relevant fields
      const textOk = !q || 
        [
          event.EventId?.toString(),
          event.StaffId?.toString(),
          getStaffFullName(event.StaffId),
          event.EventType,
          event.Reason,
          event.DeviceId?.toString(),
          getDeviceLocation(event.DeviceId)
        ].some((x) => includesText(x, q));

      // Event type filter
      const eventTypeOk = !eventType || event.EventType === eventType;

      // Single date filter
      let dateOk = true;
      if (selectedDateValue) {
        const eventDate = new Date(event.Timestamp);
        const selectedDateObj = new Date(selectedDateValue);
        
        // Set both dates to start of day for comparison
        eventDate.setHours(0, 0, 0, 0);
        selectedDateObj.setHours(0, 0, 0, 0);
        
        dateOk = eventDate.getTime() === selectedDateObj.getTime();
      }

      return textOk && eventTypeOk && dateOk;
    });
  }

  function renderTable(rows) {
    if (!tableBody) return;
    tableBody.innerHTML = rows
      .map(
        (event) => `
      <tr>
        <td>
          <input type="checkbox" class="form-check-input event-checkbox" data-event-id="${safe(event.EventId)}">
        </td>
        <td>${safe(event.EventId)}</td>
        <td>${formatDateTime(event.Timestamp)}</td>
        <td>${safe(getStaffFullName(event.StaffId))}</td>
        <td>${safe(getDeviceLocation(event.DeviceId))}</td>
        <td>
          <span class="badge ${getEventTypeBadgeClass(event.EventType)}">
            ${safe(event.EventType)}
          </span>
        </td>
        <td>${safe(event.Reason || 'N/A')}</td>
        <td>
          <span class="text-primary cursor-pointer btn-edit me-2" 
                style="cursor:pointer" 
                data-event='${JSON.stringify(event)}'>
            Edit
          </span>
          <span class="text-danger cursor-pointer btn-del" 
                style="cursor:pointer" 
                data-id="${safe(event.EventId)}" 
                data-staff="${safe(getStaffFullName(event.StaffId))}" 
                data-type="${safe(event.EventType)}">
            Delete
          </span>
        </td>
      </tr>
    `
      )
      .join("");
    
    // Update checkbox state after rendering
    updateDeleteButtonVisibility();
    setupCheckboxListeners();
  }

  // Setup checkbox listeners
  function setupCheckboxListeners() {
    // Individual checkboxes - use event delegation
    if (tableBody) {
      tableBody.addEventListener('change', function(e) {
        if (e.target.classList.contains('event-checkbox')) {
          updateSelectAllCheckbox();
          updateDeleteButtonVisibility();
        }
      });
    }
  }

  // Update select all checkbox state
  function updateSelectAllCheckbox() {
    if (!selectAllCheckbox) return;
    
    const checkboxes = document.querySelectorAll('.event-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.event-checkbox:checked');
    
    selectAllCheckbox.checked = checkboxes.length > 0 && checkedCheckboxes.length === checkboxes.length;
    selectAllCheckbox.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < checkboxes.length;
  }

  // Show/hide delete selected button
  function updateDeleteButtonVisibility() {
    if (!btnDeleteSelected) return;
    
    const checkedCheckboxes = document.querySelectorAll('.event-checkbox:checked');
    
    if (checkedCheckboxes.length > 0) {
      btnDeleteSelected.classList.remove('d-none');
    } else {
      btnDeleteSelected.classList.add('d-none');
    }
  }

  // Delete selected events
  async function deleteSelectedEvents() {
    const checkedCheckboxes = document.querySelectorAll('.event-checkbox:checked');
    
    if (checkedCheckboxes.length === 0) {
      alert('No events selected');
      return;
    }

    const eventIds = Array.from(checkedCheckboxes).map(cb => cb.getAttribute('data-event-id'));
    
    const confirmMessage = `Are you sure you want to delete ${eventIds.length} event(s)?`;
    const ok = confirm(confirmMessage);
    
    if (!ok) return;

    try {
      // Delete events one by one
      for (const eventId of eventIds) {
        const res = await fetch(
          `${window.API_BASE}/Events/${encodeURIComponent(eventId)}`,
          {
            method: "DELETE",
            headers: { ...authHeader() },
          }
        );

        if (!res.ok) {
          const errorMessage = await getErrorMessage(res);
          throw new Error(`Failed to delete event ${eventId}: ${errorMessage}`);
        }
      }
      
      alert(`Successfully deleted ${eventIds.length} event(s)`);
      
      // Refresh the data after successful deletion
      await initializeData();
    } catch (err) {
      alert(`Error deleting events: ${err.message || "Unknown error occurred"}`);
    }
  }

  function renderPagination() {
    if (!pagination) return;
    
    const filteredData = getFilteredData();
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    if (totalPages <= 1) {
      pagination.innerHTML = '';
      return;
    }

    let paginationHtml = '';
    
    // Previous button
    paginationHtml += `
      <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>
      </li>
    `;

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
      if (startPage > 2) {
        paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
      paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
    }

    // Next button
    paginationHtml += `
      <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
      </li>
    `;

    pagination.innerHTML = paginationHtml;

    // Add click event listeners
    pagination.addEventListener('click', (e) => {
      e.preventDefault();
      const pageLink = e.target.closest('a[data-page]');
      if (!pageLink) return;
      
      const newPage = parseInt(pageLink.getAttribute('data-page'));
      if (newPage && newPage !== currentPage && newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderTable(getPaginatedData());
        renderPagination();
      }
    });
  }

  function safe(val) {
    return (val ?? "") + "";
  }

  function formatDateTime(timestamp) {
    if (!timestamp) return 'N/A';
    
    // Parse timestamp as local time (no timezone conversion)
    // Backend returns: "2024-12-30T21:23:00" or "2024-12-30 21:23:00"
    // We want to display it as-is without timezone conversion
    
    let dateStr = timestamp.toString();
    
    // If timestamp contains 'Z' or timezone offset, it will be converted
    // Replace 'T' with space if present for consistent parsing
    dateStr = dateStr.replace('T', ' ');
    
    // Parse as local time by appending to string that doesn't trigger UTC parse
    // When no timezone info is present, JS Date treats it as local time
    const date = new Date(dateStr);
    
    // Format the datetime for display
    return date.toLocaleString('en-AU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  function getEventTypeBadgeClass(eventType) {
    switch(eventType?.toLowerCase()) {
      case 'clock in':
        return 'bg-success';
      case 'clock out':
        return 'bg-warning text-dark';
      case 'break':
        return 'bg-info text-dark';
      default:
        return 'bg-secondary';
    }
  }

  function getStaffFullName(staffId) {
    const staff = staffData.find(s => s.StaffId == staffId);
    if (!staff) {
      return `Staff ID: ${staffId}`;
    }
    const fullName = `${staff.FirstName || ''} ${staff.LastName || ''}`.trim();
    return fullName || `Staff ID: ${staffId}`;
  }

  function getDeviceLocation(deviceId) {
    if (!deviceId) return 'N/A';
    const device = devicesData.find(d => d.DeviceId == deviceId);
    if (!device) return `Device ID: ${deviceId}`;
    return device.Location || device.DeviceName || `Device ID: ${deviceId}`;
  }

  function includesText(haystack, needle) {
    return (haystack || "")
      .toString()
      .toLowerCase()
      .includes((needle || "").toLowerCase());
  }

  // Date navigation helper functions
  function setTodayDate() {
    if (selectedDate) {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      selectedDate.value = dateString;
    }
  }

  function goToPreviousDay() {
    if (selectedDate && selectedDate.value) {
      const currentDate = new Date(selectedDate.value);
      currentDate.setDate(currentDate.getDate() - 1);
      selectedDate.value = currentDate.toISOString().split('T')[0];
      applyFilters();
    }
  }

  function goToNextDay() {
    if (selectedDate && selectedDate.value) {
      const currentDate = new Date(selectedDate.value);
      currentDate.setDate(currentDate.getDate() + 1);
      selectedDate.value = currentDate.toISOString().split('T')[0];
      applyFilters();
    }
  }

  // Apply combined filters
  function applyFilters() {
    currentPage = 1; // Reset to first page when filtering
    renderTable(getPaginatedData());
    renderPagination();
  }

  // Wire events
  ["input", "change"].forEach((evt) => {
    if (searchInput) searchInput.addEventListener(evt, applyFilters);
    if (filterEventType) filterEventType.addEventListener(evt, applyFilters);
    if (selectedDate) selectedDate.addEventListener(evt, applyFilters);
  });

  // Date navigation button events
  if (btnPrevDay) {
    btnPrevDay.addEventListener("click", goToPreviousDay);
  }

  if (btnNextDay) {
    btnNextDay.addEventListener("click", goToNextDay);
  }

  if (btnToday) {
    btnToday.addEventListener("click", () => {
      setTodayDate();
      applyFilters();
    });
  }

  // Create Event button
  if (btnCreateEvent) {
    btnCreateEvent.addEventListener("click", () => {
      populateStaffDropdown();
      populateDeviceDropdown();
      resetCreateEventForm();
      const modal = new bootstrap.Modal(createEventModal);
      modal.show();
    });
  }

  // By Pass Validation toggle switch
  if (bypassValidation) {
    bypassValidation.addEventListener("change", (e) => {
      toggleReasonField(e.target.checked);
    });
  }

  // Create Event form submission
  if (createEventForm) {
    createEventForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      // Check form validity
      if (!createEventForm.checkValidity()) {
        createEventForm.classList.add('was-validated');
        return;
      }

      // Show loading spinner
      if (createEventSpinner) {
        createEventSpinner.classList.remove('d-none');
      }

      try {
        // Get form data according to backend C# Event model
        // Model: EventId, Timestamp, StaffId, DeviceId (nullable), EventType, Reason (nullable)
        
        // IMPORTANT: Send timestamp as local datetime string WITHOUT timezone conversion
        // Backend expects: '2024-12-30 21:23:00' (DATETIME2(0) format)
        // Do NOT use .toISOString() as it converts to UTC causing timezone issues
        const timestamp = `${eventDate.value} ${eventTime.value}:00`;
        
        console.log('Local timestamp to send:', timestamp);
        
        // Parse DeviceId - can be null according to C# model (int?)
        const deviceIdValue = eventDeviceId.value ? parseInt(eventDeviceId.value) : null;
        
        const formData = {
          EventId: 0, // Will be auto-generated by backend
          Timestamp: timestamp, // Format: 'YYYY-MM-DD HH:MM:SS'
          StaffId: parseInt(eventStaffId.value),
          DeviceId: deviceIdValue, // Can be null (int? in C#)
          EventType: eventType.value, // "Clock in", "Clock out", or "Break"
          Reason: eventReason.value.trim() || null // Can be null (string? in C#)
        };

        console.log('Form data to be submitted:', formData);
        
        // Determine if this is create or edit
        const isEdit = eventId && eventId.value;
        const url = isEdit ? `${window.API_BASE}/Events/${eventId.value}` : `${window.API_BASE}/Events/`;
        const method = isEdit ? "PUT" : "POST";
        
        console.log(`${isEdit ? 'Updating' : 'Creating'} event:`, { url, method });
        
        // Call API to create or update event
        // POST /api/Events/ - Create new event (Clock In or Clock Out)
        // PUT /api/Events/{id} - Update existing event
        const res = await fetch(url, {
          method: method,
          headers: { 
            ...authHeader(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        console.log('Response status:', res.status);
        console.log('Response headers:', res.headers);
        
        // Check if response is ok and has content
        if (!res.ok) {
          const errorText = await res.text();
          console.log('Error response text:', errorText);
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        // Get response text first to check if it's valid JSON
        const responseText = await res.text();
        console.log('Response text:', responseText);
        
        let response;
        try {
          response = JSON.parse(responseText);
          console.log('Parsed API Response:', response);
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          console.log('Raw response text:', responseText);
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
        }

        // Events API returns the created/updated event object
        const updatedEvent = response;
        const action = isEdit ? 'updated' : 'created';
        
        alert(`✅ Event ${action} successfully!\n\n` +
              `🆔 Event ID: ${updatedEvent.EventId || 'N/A'}\n` +
              `👤 Staff: ${eventStaffId.options[eventStaffId.selectedIndex].text}\n` +
              `📱 Device: ${eventDeviceId.options[eventDeviceId.selectedIndex].text}\n` +
              `⏰ Timestamp: ${formatDateTime(updatedEvent.Timestamp)}\n` +
              `📋 Event Type: ${updatedEvent.EventType}\n` +
              `💬 Reason: ${updatedEvent.Reason || 'None'}`);

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(createEventModal);
        modal.hide();
        resetCreateEventForm();

        // Refresh events data
        await initializeData();

      } catch (err) {
        alert('Error creating event: ' + (err.message || 'Unknown error occurred'));
      } finally {
        // Hide loading spinner
        if (createEventSpinner) {
          createEventSpinner.classList.add('d-none');
        }
      }
    });
  }

  if (btnClearFilters) {
    btnClearFilters.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (filterEventType) filterEventType.value = "";
      setTodayDate(); // Reset to today's date
      applyFilters();
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      if (loadingBox) loadingBox.classList.remove("d-none");
      if (loadError) loadError.classList.add("d-none");
      initializeData();
    });
  }

  // Delete selected events button
  if (btnDeleteSelected) {
    btnDeleteSelected.addEventListener("click", deleteSelectedEvents);
  }

  // Select all checkbox
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
      const checkboxes = document.querySelectorAll('.event-checkbox');
      checkboxes.forEach(checkbox => {
        checkbox.checked = this.checked;
      });
      updateDeleteButtonVisibility();
    });
  }

  // Delete event functionality (event delegation)
  if (tableBody) {
    tableBody.addEventListener("click", async (e) => {
      // Handle Edit button
      const editBtn = e.target.closest(".btn-edit");
      if (editBtn) {
        try {
          const eventData = JSON.parse(editBtn.getAttribute("data-event"));
          populateEditForm(eventData);
          const modal = new bootstrap.Modal(createEventModal);
          modal.show();
        } catch (err) {
          console.error("Error parsing event data:", err);
          alert("Error loading event data for editing");
        }
        return;
      }
      
      // Handle Delete button
      const btn = e.target.closest(".btn-del");
      if (!btn) return;
      
      const eventId = btn.getAttribute("data-id");
      const staffName = btn.getAttribute("data-staff") || "Unknown Staff";
      const eventType = btn.getAttribute("data-type") || "Unknown Type";
      
      if (!eventId) return;
      
      const confirmMessage = `Are you sure you want to delete this event?\n\nEvent ID: ${eventId}\nStaff: ${staffName}\nType: ${eventType}`;
      const ok = confirm(confirmMessage);
      
      if (!ok) return;
      
      try {
        const res = await fetch(
          `${window.API_BASE}/Events/${encodeURIComponent(eventId)}`,
          {
            method: "DELETE",
            headers: { ...authHeader() },
          }
        );

        if (!res.ok) {
          const errorMessage = await getErrorMessage(res);
          throw new Error(errorMessage);
        }
        
        alert(`Event deleted successfully!\n\nEvent ID: ${eventId}\nStaff: ${staffName}`);
        
        // Refresh the data after successful deletion
        await initializeData();
      } catch (err) {
        alert(`Error deleting event: ${err.message || "Unknown error occurred"}`);
      }
    });
  }

  // Realtime clock functions
  function updateClock() {
    if (!currentTime || !currentDate) return;
    
    const now = new Date();
    
    // Format time with AM/PM
    const timeString = now.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    // Format date
    const dateString = now.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    currentTime.textContent = timeString;
    currentDate.textContent = dateString;
  }

  // Initialize realtime clock
  function initializeClock() {
    updateClock(); // Update immediately
    setInterval(updateClock, 1000); // Update every second
  }

  // Initialize all data
  async function initializeData() {
    try {
      // Set today's date as default
      setTodayDate();
      
      // Load all data in parallel
      await Promise.all([
        fetchStaffs(),
        fetchDevices()
      ]);
      
      // Then load events after staff data is available
      await fetchEvents();
    } catch (err) {
      console.error("Error initializing data:", err);
      if (loadError) {
        loadError.textContent = "Error loading data: " + err.message;
        loadError.classList.remove("d-none");
      }
      if (loadingBox) loadingBox.classList.add("d-none");
    }
  }

  // Initialize
  initializeClock(); // Start realtime clock
  initializeData();
})();
