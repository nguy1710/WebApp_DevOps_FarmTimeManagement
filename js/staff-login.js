(function () {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');
  const manualLoginForm = document.getElementById('manualLoginForm');
  const scanResultInput = document.getElementById('scanResultInput');

  let stream = null;
  let scanning = false;

  function showError(message) {
    if (!errorMessage) return;
    errorMessage.textContent = message || "Error";
    errorMessage.classList.remove("d-none");
    if (successMessage) successMessage.classList.add("d-none");
  }

  function showSuccess(message) {
    if (!successMessage) return;
    successMessage.textContent = message || "Success";
    successMessage.classList.remove("d-none");
    if (errorMessage) errorMessage.classList.add("d-none");
  }

  function hideMessages() {
    if (errorMessage) errorMessage.classList.add("d-none");
    if (successMessage) successMessage.classList.add("d-none");
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

  async function startCamera() {
    try {
      hideMessages();
      
      // Request camera access
      stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      video.srcObject = stream;

      // Start scanning when video is ready
      video.addEventListener('loadedmetadata', () => {
        video.play();
        startScanning();
      });

    } catch (error) {
      console.error('Error accessing camera:', error);
      showError('Unable to access camera. Please check permissions or try manual login.');
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    
    scanning = false;
  }

  function startScanning() {
    scanning = true;
    scanQRCode();
  }

  function scanQRCode() {
    if (!scanning) return;

    const context = canvas.getContext('2d');
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // Set canvas dimensions to match video
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, videoWidth, videoHeight);

    // Get image data from canvas
    const imageData = context.getImageData(0, 0, videoWidth, videoHeight);

    // Try to decode QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      console.log('QR Code detected:', code.data);
      handleQRCodeDetected(code.data);
    } else {
      // Continue scanning
      requestAnimationFrame(scanQRCode);
    }
  }

  async function handleQRCodeDetected(qrData) {
    try {
      // Stop scanning
      scanning = false;
      stopCamera();

      console.log('QR Code detected:', qrData);

      // Use QR data as scan result directly
      await loginStaff(qrData);

    } catch (error) {
      console.error('Error processing QR code:', error);
      showError('Invalid QR code. Please try again or use manual login.');
    }
  }

  async function loginStaff(scanResult) {
    console.log('Attempting to login with scan result:', scanResult);
    
    if (!scanResult || scanResult.trim() === '') {
      showError('Invalid scan result. Please try again.');
      return;
    }

    try {
      showSuccess('Logging in...');

      // Use biometrics scan API to get staff information
      console.log('Fetching staff info from:', `${window.API_BASE}/Biometrics/scanfromcard/${scanResult}`);
      const response = await fetch(`${window.API_BASE}/Biometrics/scanfromcard/${scanResult}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Staff not found. Please check your scan result.');
        }
        const errMsg = await getErrorMessage(response);
        throw new Error(errMsg);
      }

      const staff = await response.json();
      console.log('Found staff:', staff);

      if (!staff || staff === null) {
        throw new Error('Staff not found. Please check your Staff ID.');
      }

      // Store staff information in localStorage
      const staffSession = {
        staffId: staff.StaffId,
        firstName: staff.FirstName,
        lastName: staff.LastName,
        email: staff.Email,
        phone: staff.Phone,
        address: staff.Address,
        contractType: staff.ContractType,
        role: staff.Role,
        standardPayRate: staff.StandardPayRate,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem('staff_session', JSON.stringify(staffSession));

      showSuccess(`Welcome ${staff.FirstName} ${staff.LastName}! Redirecting...`);

      // Redirect to staff-event page after a short delay
      setTimeout(() => {
        window.location.href = 'staff-event.html';
      }, 1500);

    } catch (error) {
      showError(error.message || 'Login failed. Please try again.');
    }
  }

  // Event listeners
  if (manualLoginForm) {
    manualLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideMessages();
      
      const scanResult = scanResultInput.value.trim();
      await loginStaff(scanResult);
    });
  }

  // Check if already logged in
  function checkExistingSession() {
    const existingSession = localStorage.getItem('staff_session');
    if (existingSession) {
      try {
        const session = JSON.parse(existingSession);
        const loginTime = new Date(session.loginTime);
        const now = new Date();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
        
        // If session is less than 8 hours old, redirect to staff-event
        if (hoursDiff < 8) {
          showSuccess(`Welcome back ${session.firstName}! Redirecting...`);
          setTimeout(() => {
            window.location.href = 'staff-event.html';
          }, 1000);
        } else {
          // Clear expired session
          localStorage.removeItem('staff_session');
        }
      } catch (error) {
        // Clear invalid session
        localStorage.removeItem('staff_session');
      }
    }
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    checkExistingSession();
    // Auto-start camera when page loads
    startCamera();
  });

  // Also check immediately in case DOMContentLoaded already fired
  checkExistingSession();
  // Auto-start camera immediately
  startCamera();

})();
