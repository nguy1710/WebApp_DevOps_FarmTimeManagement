// Staff Clock Page - Camera with QR Code Scanner
// This page allows staff to scan QR codes using camera

(function () {
  const video = document.getElementById("videoElement");
  const statusIndicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");
  const statusDisplay = document.getElementById("statusDisplay");
  const statusMessage = document.getElementById("statusMessage");
  const staffActionsModal = document.getElementById("staffActionsModal");
  const staffInfo = document.getElementById("staffInfo");
  const deviceSelect = document.getElementById("deviceSelect");
  const cameraSection = document.getElementById("cameraSection");
  let modalInstance = null;
  const btnClockIn = document.getElementById("btnClockIn");
  const btnClockOut = document.getElementById("btnClockOut");
  const btnBreak = document.getElementById("btnBreak");
  
  // Events display elements
  const eventsLoading = document.getElementById("eventsLoading");
  const eventsContainer = document.getElementById("eventsContainer");
  const eventsTableBody = document.getElementById("eventsTableBody");
  const eventsEmpty = document.getElementById("eventsEmpty");
  const btnPrevDay = document.getElementById("btnPrevDay");
  const btnToday = document.getElementById("btnToday");
  const btnNextDay = document.getElementById("btnNextDay");
  const currentDateDisplay = document.getElementById("currentDateDisplay");
  
  let html5QrCode = null;
  let isScanning = false;
  let currentStaffData = null;
  let devicesList = []; // Store devices list
  let eventsList = []; // Store events list
  let staffList = []; // Store staff list for name/role lookup
  let isProcessingEvent = false; // Flag to prevent multiple event creation
  let isScannerInitialized = false; // Flag to prevent multiple scanner initialization
  let currentDate = new Date(); // Current selected date

  // Update status display
  function updateStatus(type, message) {
    if (!statusText || !statusIndicator) return;
    
    statusText.textContent = message;
    
    // Update indicator color
    statusIndicator.className = "bi bi-circle-fill me-1";
    switch(type) {
      case 'success':
        statusIndicator.classList.add("text-success");
        break;
      case 'error':
        statusIndicator.classList.add("text-danger");
        break;
      case 'warning':
        statusIndicator.classList.add("text-warning");
        break;
      default:
        statusIndicator.classList.add("text-info");
    }
  }

  // Show status message
  function showStatusMessage(type, message) {
    if (!statusDisplay || !statusMessage) return;
    
    statusMessage.textContent = message;
    statusDisplay.className = "status-display";
    
    switch(type) {
      case 'success':
        statusDisplay.classList.add("status-success");
        break;
      case 'error':
        statusDisplay.classList.add("status-error");
        break;
      default:
        statusDisplay.classList.add("status-info");
    }
    
    statusDisplay.classList.remove("d-none");
    
    // Keep displayed for 10 seconds (longer for visibility)
    setTimeout(() => {
      statusDisplay.classList.add("d-none");
    }, 10000);
  }

  // Process scanned QR code
  async function processScannedCode(decodedText) {
    if (isScanning) return; // Prevent multiple scans
    isScanning = true;
    
    console.log('QR Code scanned:', decodedText);
    
    // Call API to get staff information
    try {
      const res = await fetch(`${window.API_BASE}/Biometrics/scanfromcard/${decodedText}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API call failed: ${errorText}`);
      }
      
      const staffData = await res.json();
      console.log('Staff data from API:', staffData);
      
      if (staffData && staffData.StaffId) {
        // Success - store staff data and show action panel
        currentStaffData = staffData;
        const staffName = `${staffData.FirstName} ${staffData.LastName}`;
        
        // Show staff info
        staffInfo.textContent = `${staffName} (ID: ${staffData.StaffId}) - ${staffData.Role}`;
        
        // Fetch and display events for this staff
        await fetchStaffEvents(staffData.StaffId);
        
        // Show action modal
        if (modalInstance) {
          modalInstance.show();
        }
        
        showStatusMessage('success', `Welcome ${staffName}!`);
      } else {
        // No staff found
        if (modalInstance) {
          modalInstance.hide();
        }
        showStatusMessage('error', 'Staff not found. Please try again.');
      }
      
    } catch (err) {
      console.error('Error processing scanned code:', err);
      if (modalInstance) {
        modalInstance.hide();
      }
      showStatusMessage('error', `Error: ${err.message}`);
    }
    
    // Reset scanning after 3 seconds
    setTimeout(() => {
      isScanning = false;
    }, 3000);
  }

  // Fetch staff from API
  async function fetchStaff() {
    try {
      const res = await fetch(`${window.API_BASE}/Staffs/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch staff: ${res.statusText}`);
      }
      
      staffList = await res.json();
      console.log('Staff loaded:', staffList.length, 'staff members');
      
    } catch (err) {
      console.error('Error fetching staff:', err);
      staffList = [];
    }
  }

  // Fetch devices from API
  async function fetchDevices() {
    try {
      const res = await fetch(`${window.API_BASE}/Devices/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch devices: ${res.statusText}`);
      }
      
      devicesList = await res.json();
      console.log('Devices loaded:', devicesList);
      
      // Populate dropdown
      if (deviceSelect) {
        deviceSelect.innerHTML = '<option value="">-- Select Device Location --</option>';
        
        if (devicesList && devicesList.length > 0) {
          devicesList.forEach(device => {
            const option = document.createElement('option');
            option.value = device.DeviceId;
            option.textContent = `${device.Location} (${device.Type} - ${device.Status})`;
            deviceSelect.appendChild(option);
          });
        } else {
          deviceSelect.innerHTML = '<option value="">No devices available</option>';
        }
      }
      
      console.log('Devices loaded successfully');
    } catch (err) {
      console.error('Error fetching devices:', err);
      if (deviceSelect) {
        deviceSelect.innerHTML = '<option value="">Error loading devices</option>';
      }
    }
  }

  // Fetch recent events (all events, latest first)
  async function fetchRecentEvents() {
    try {
      // Build SQL query to get latest events
      const sqlQuery = `
        SELECT EventId, Timestamp, StaffId, DeviceId, EventType, Reason 
        FROM [Event] 
        ORDER BY Timestamp DESC
      `.trim();
      
      console.log('Fetching recent events...');
      
      const res = await fetch(`${window.API_BASE}/Events/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sqlQuery)
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch events: ${res.statusText}`);
      }
      
      eventsList = await res.json();
      console.log('Recent events loaded:', eventsList.length, 'events');
      
      // Display events
      displayEvents();
      
    } catch (err) {
      console.error('Error fetching recent events:', err);
      eventsList = [];
      displayEvents();
    }
  }

  // Fetch events for a specific staff member
  async function fetchStaffEvents(staffId) {
    try {
      // Build SQL query to get events for this staff
      const sqlQuery = `
        SELECT EventId, Timestamp, StaffId, DeviceId, EventType, Reason 
        FROM [Event] 
        WHERE StaffId = ${staffId}
        ORDER BY Timestamp DESC
      `.trim();
      
      console.log('Fetching events for staff:', staffId);
      
      const res = await fetch(`${window.API_BASE}/Events/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sqlQuery)
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch events: ${res.statusText}`);
      }
      
      eventsList = await res.json();
      console.log('Events loaded:', eventsList.length, 'events');
      
      // Display events
      displayEvents();
      
    } catch (err) {
      console.error('Error fetching events:', err);
      eventsList = [];
      displayEvents();
    }
  }

  // Update current date display
  function updateCurrentDateDisplay() {
    if (!currentDateDisplay) return;
    
    const today = new Date();
    const isToday = currentDate.toDateString() === today.toDateString();
    
    if (isToday) {
      currentDateDisplay.textContent = `Today (${currentDate.toLocaleDateString()})`;
      currentDateDisplay.className = 'fw-bold text-warning';
    } else {
      currentDateDisplay.textContent = currentDate.toLocaleDateString();
      currentDateDisplay.className = 'fw-bold';
    }
  }

  // Filter events for current date
  function getEventsForCurrentDate() {
    if (!currentDate || eventsList.length === 0) return [];
    
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return eventsList.filter(event => {
      const eventDate = new Date(event.Timestamp);
      return eventDate >= startOfDay && eventDate <= endOfDay;
    });
  }

  // Display events in the table
  function displayEvents() {
    if (!eventsTableBody || !eventsLoading || !eventsContainer || !eventsEmpty) return;
    
    // Hide loading
    eventsLoading.classList.add('d-none');
    
    // Get events for current date
    const dayEvents = getEventsForCurrentDate();
    
    if (dayEvents.length === 0) {
      // Show empty state
      eventsContainer.classList.add('d-none');
      eventsEmpty.classList.remove('d-none');
      return;
    }
    
    // Show events table
    eventsEmpty.classList.add('d-none');
    eventsContainer.classList.remove('d-none');
    
    // Clear existing rows
    eventsTableBody.innerHTML = '';
    
    // Sort events by timestamp (newest first)
    const sortedEvents = dayEvents.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    
    sortedEvents.forEach(event => {
      const row = document.createElement('tr');
      
      // Format timestamp
      const timestamp = formatEventTime(event.Timestamp);
      
      // Get staff name and role
      const staffName = getStaffNameFromId(event.StaffId);
      const staffRole = getStaffRoleFromId(event.StaffId);
      
      // Get device location
      const deviceLocation = getDeviceLocationFromId(event.DeviceId);
      
      // Get event type badge color
      const badgeClass = getEventTypeBadgeClass(event.EventType);
      
      row.innerHTML = `
        <td>${timestamp}</td>
        <td>${staffName}</td>
        <td>${staffRole}</td>
        <td><span class="badge ${badgeClass}">${event.EventType}</span></td>
        <td>${deviceLocation}</td>
      `;
      
      eventsTableBody.appendChild(row);
    });
  }

  // Go to previous day
  function goToPreviousDay() {
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() - 1);
    updateCurrentDateDisplay();
    displayEvents();
  }

  // Go to today
  function goToToday() {
    currentDate = new Date();
    updateCurrentDateDisplay();
    displayEvents();
  }

  // Go to next day
  function goToNextDay() {
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
    updateCurrentDateDisplay();
    displayEvents();
  }

  // Format event timestamp
  function formatEventTime(timestamp) {
    if (!timestamp) return 'N/A';
    
    try {
      const dateStr = timestamp.toString().replace('T', ' ');
      const date = new Date(dateStr);
      
      return date.toLocaleString('en-AU', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (err) {
      return timestamp;
    }
  }

  // Get device location from ID
  function getDeviceLocationFromId(deviceId) {
    if (!deviceId) return 'N/A';
    
    const device = devicesList.find(d => d.DeviceId == deviceId);
    return device ? device.Location : `Device ${deviceId}`;
  }

  // Get staff name from ID
  function getStaffNameFromId(staffId) {
    if (!staffId) return 'N/A';
    
    const staff = staffList.find(s => s.StaffId == staffId);
    if (!staff) return `Staff ID: ${staffId}`;
    
    const firstName = staff.FirstName || '';
    const lastName = staff.LastName || '';
    return `${firstName} ${lastName}`.trim() || `Staff ID: ${staffId}`;
  }

  // Get staff role from ID
  function getStaffRoleFromId(staffId) {
    if (!staffId) return 'N/A';
    
    const staff = staffList.find(s => s.StaffId == staffId);
    return staff ? (staff.Role || 'N/A') : 'N/A';
  }

  // Get event type badge class
  function getEventTypeBadgeClass(eventType) {
    const type = (eventType || '').toLowerCase();
    if (type.includes('clock in')) return 'bg-success';
    if (type.includes('clock out')) return 'bg-warning text-dark';
    if (type.includes('break')) return 'bg-info';
    return 'bg-secondary';
  }

  // Create event (Clock In/Out/Break)
  async function createEvent(eventType) {
    // Prevent multiple clicks
    if (isProcessingEvent) {
      console.log('Event is already being processed');
      return;
    }
    
    if (!currentStaffData) {
      showStatusMessage('error', 'No staff data available');
      return;
    }
    
    // Validate device selection
    if (!deviceSelect || !deviceSelect.value) {
      showStatusMessage('error', 'Please select a device location first');
      return;
    }
    
    // Set processing flag
    isProcessingEvent = true;
    
    // Close modal immediately to prevent multiple clicks
    if (modalInstance) {
      modalInstance.hide();
    }
    
    // Get selected DeviceId
    const selectedDeviceId = parseInt(deviceSelect.value);
    
    try {
      // Get current date and time
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      
      // Create event data
      const eventData = {
        EventId: 0,
        Timestamp: timestamp,
        StaffId: currentStaffData.StaffId,
        DeviceId: selectedDeviceId, // Required - already validated above
        EventType: eventType,
        Reason: null
      };
      
      console.log('Creating event:', eventData);
      
      // Call API to create event
      const res = await fetch(`${window.API_BASE}/Events/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to create event: ${errorText}`);
      }
      
      const result = await res.json();
      console.log('Event created successfully:', result);
      
      showStatusMessage('success', `${eventType} recorded successfully!`);
      
      // Refresh events display - show all recent events
      await fetchRecentEvents();
      
      // Reset staff data after successful event creation
      currentStaffData = null;
      
    } catch (err) {
      console.error('Error creating event:', err);
      showStatusMessage('error', `Error: ${err.message}`);
    } finally {
      // Reset processing flag
      isProcessingEvent = false;
    }
  }

  // Initialize QR code scanner
  async function initQRScanner() {
    try {
      updateStatus('info', 'Initializing scanner...');
      
      // Wait for library to load
      if (typeof Html5Qrcode === 'undefined') {
        throw new Error('QR Code library not loaded');
      }
      
      // Create HTML5 QR Code instance
      html5QrCode = new Html5Qrcode("videoElement");
      
      // Start scanning with barcode support
      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        { 
          fps: 10,
          qrbox: { width: 200, height: 200 },
          // Enable barcode formats
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.AZTEC,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.MAXICODE,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.RSS_14,
            Html5QrcodeSupportedFormats.RSS_EXPANDED
          ]
        },
        // Success callback
        function(decodedText, decodedResult) {
          console.log('Code detected:', decodedText);
          console.log('Format:', decodedResult.result.format);
          processScannedCode(decodedText);
        },
        // Error callback - ignore
        function(errorMessage) {
          // Ignore scan errors
        }
      );
      
      updateStatus('success', 'Ready to scan');
      console.log('QR Scanner initialized successfully');
      
    } catch (err) {
      console.error('Error initializing QR scanner:', err);
      updateStatus('error', 'Scanner failed');
      showStatusMessage('error', 'Failed to initialize scanner: ' + err.message);
    }
  }

  // Stop scanner
  async function stopScanner() {
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
        console.log('QR Scanner stopped');
        updateStatus('info', 'Scanner stopped');
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  }

  // Initialize page
  async function init() {
    console.log('Initializing Staff Clock page...');
    
    // Initialize Bootstrap modal
    if (staffActionsModal && typeof bootstrap !== 'undefined') {
      modalInstance = new bootstrap.Modal(staffActionsModal);
    }
    
    // Set current date to today
    currentDate = new Date();
    updateCurrentDateDisplay();
    
    // Fetch staff, devices, and recent events from API
    await Promise.all([
      fetchStaff(),
      fetchDevices(),
      fetchRecentEvents()
    ]);
    
    // Add event listener for device selection
    if (deviceSelect) {
      deviceSelect.addEventListener('change', async function() {
        const selectedDeviceId = this.value;
        
        if (selectedDeviceId && selectedDeviceId !== '') {
          // Show camera section
          if (cameraSection) {
            cameraSection.style.display = 'block';
          }
          
          // Initialize QR scanner if not already initialized
          if (!isScannerInitialized) {
            await initQRScanner();
            isScannerInitialized = true;
          }
        } else {
          // Hide camera section when no device selected
          if (cameraSection) {
            cameraSection.style.display = 'none';
          }
          
          // Stop scanner if running
          if (html5QrCode) {
            await stopScanner();
            html5QrCode = null;
          }
          
          // Reset scanner initialization flag
          isScannerInitialized = false;
        }
      });
    }
    
    // Add event listeners for action buttons
    if (btnClockIn) {
      btnClockIn.addEventListener('click', () => createEvent('Clock in'));
    }
    
    if (btnClockOut) {
      btnClockOut.addEventListener('click', () => createEvent('Clock out'));
    }
    
    if (btnBreak) {
      btnBreak.addEventListener('click', () => createEvent('Break'));
    }

    // Add event listeners for date navigation
    if (btnPrevDay) {
      btnPrevDay.addEventListener('click', goToPreviousDay);
    }
    
    if (btnToday) {
      btnToday.addEventListener('click', goToToday);
    }
    
    if (btnNextDay) {
      btnNextDay.addEventListener('click', goToNextDay);
    }
    
    // Handle page unload
    window.addEventListener('beforeunload', async () => {
      await stopScanner();
    });
  }

  // Start initialization after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
