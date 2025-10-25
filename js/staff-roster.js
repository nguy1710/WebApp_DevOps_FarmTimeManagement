// Staff Roster Page - Camera with QR Code Scanner
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
  
  // Roster display elements
  const rosterLoading = document.getElementById("rosterLoading");
  const rosterContainer = document.getElementById("rosterContainer");
  const rosterTableBody = document.getElementById("rosterTableBody");
  const rosterEmpty = document.getElementById("rosterEmpty");
  
  let html5QrCode = null;
  let isScanning = false;
  let currentStaffData = null;
  let devicesList = []; // Store devices list
  let rosterList = []; // Store roster list
  let staffList = []; // Store staff list for name/role lookup
  let isProcessingEvent = false; // Flag to prevent multiple event creation
  let isScannerInitialized = false; // Flag to prevent multiple scanner initialization

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
        
        // Fetch and display roster for this staff
        await fetchStaffRoster(staffData.StaffId);
        
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

  // Fetch roster for a specific staff member
  async function fetchStaffRoster(staffId) {
    try {
      const res = await fetch(`${window.API_BASE}/Roster/staff/${staffId}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch roster: ${res.statusText}`);
      }
      
      rosterList = await res.json();
      displayRoster();
      
    } catch (err) {
      console.error('Error fetching roster:', err);
      rosterList = [];
      displayRoster();
    }
  }

  // Display roster in the table
  function displayRoster() {
    if (!rosterTableBody || !rosterLoading || !rosterContainer || !rosterEmpty) return;
    
    // Hide loading
    rosterLoading.classList.add('d-none');
    
    if (rosterList.length === 0) {
      // Show empty state
      rosterContainer.classList.add('d-none');
      rosterEmpty.classList.remove('d-none');
      return;
    }
    
    // Show roster table
    rosterEmpty.classList.add('d-none');
    rosterContainer.classList.remove('d-none');
    
    // Clear existing rows
    rosterTableBody.innerHTML = '';
    
    // Render roster
    rosterList.forEach(schedule => {
      const row = document.createElement('tr');
      
      // Format dates and times
      const startDate = new Date(schedule.StartTime);
      const endDate = new Date(schedule.EndTime);
      
      const dateStr = startDate.toLocaleDateString('en-AU');
      const startTimeStr = startDate.toLocaleTimeString('en-AU');
      const endTimeStr = endDate.toLocaleTimeString('en-AU');
      
      row.innerHTML = `
        <td>${schedule.ScheduleId}</td>
        <td>${dateStr}</td>
        <td>${startTimeStr}</td>
        <td>${endTimeStr}</td>
        <td><span class="badge bg-info">${schedule.ScheduleHours} hrs</span></td>
      `;
      
      rosterTableBody.appendChild(row);
    });
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
      
      // Refresh roster display for current staff
      if (currentStaffData) {
        await fetchStaffRoster(currentStaffData.StaffId);
      }
      
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
    console.log('Initializing Staff Roster page...');
    
    // Initialize Bootstrap modal
    if (staffActionsModal && typeof bootstrap !== 'undefined') {
      modalInstance = new bootstrap.Modal(staffActionsModal);
    }
    
    // Fetch staff and devices from API
    await Promise.all([
      fetchStaff(),
      fetchDevices()
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
          // Bỏ chọn device
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

