(function () {
  const loadError = document.getElementById("loadError");
  const successMessage = document.getElementById("successMessage");
  const loadingBox = document.getElementById("loadingBox");
  const loadingBoxSpecial = document.getElementById("loadingBoxSpecial");

  const createPayslipForm = document.getElementById("createPayslipForm");
  const createPayslipSpecialForm = document.getElementById("createPayslipSpecialForm");
  const staffIdInput = document.getElementById("staffId");
  const specialStaffIdInput = document.getElementById("specialStaffId");
  const weekStartDateInput = document.getElementById("weekStartDate");
  const specialPayRateInput = document.getElementById("specialPayRate");
  const specialDateStartInput = document.getElementById("specialDateStart");
  const specialDateEndInput = document.getElementById("specialDateEnd");

  function showError(message) {
    if (!loadError) return;
    loadError.textContent = message || "Error";
    loadError.classList.remove("d-none");
    if (successMessage) successMessage.classList.add("d-none");
  }

  function showSuccess(message) {
    if (!successMessage) return;
    successMessage.textContent = message || "Success";
    successMessage.classList.remove("d-none");
    if (loadError) loadError.classList.add("d-none");
  }

  function hideMessages() {
    if (loadError) loadError.classList.add("d-none");
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

  function formatMoney(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "-";
    return `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDate(dateString) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  }

  function hidePayslipModal() {
    const modal = document.getElementById('payslipDetailModal');
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    
    // Remove backdrop
    const backdrop = document.getElementById('modalBackdrop');
    if (backdrop) {
      backdrop.remove();
    }
  }

  function showPayslipModal(payslip, isSpecial = false) {
    // Update success message based on type
    const successMessage = document.getElementById('modalSuccessMessage');
    if (successMessage) {
      const messageText = successMessage.querySelector('strong');
      if (messageText) {
        messageText.textContent = isSpecial 
          ? 'Special Payslip created successfully!' 
          : 'Payslip created successfully!';
      }
      successMessage.classList.remove('d-none');
    }

    // Update modal content
    document.getElementById('modalPayslipId').textContent = payslip.payslipId || '-';
    document.getElementById('modalWeekStartDate').textContent = payslip.weekStartDate 
      ? formatDate(payslip.weekStartDate) 
      : (payslip.dateStart ? `${formatDate(payslip.dateStart)} - ${formatDate(payslip.dateEnd)}` : '-');
    document.getElementById('modalDateCreated').textContent = formatDate(payslip.dateCreated || new Date().toISOString());
    document.getElementById('modalTotalHours').textContent = `${payslip.totalHoursWorked || 0} hours`;
    document.getElementById('modalStandardPayRate').textContent = formatMoney(payslip.standardPayRate);
    document.getElementById('modalGrossWeeklyPay').textContent = formatMoney(payslip.grossWeeklyPay);
    document.getElementById('modalAnnualIncome').textContent = formatMoney(payslip.annualIncome);
    document.getElementById('modalAnnualTax').textContent = formatMoney(payslip.annualTax);
    document.getElementById('modalWeeklyPAYG').textContent = formatMoney(payslip.weeklyPAYG);
    document.getElementById('modalNetPay').textContent = formatMoney(payslip.netPay);
    document.getElementById('modalEmployerSuperannuation').textContent = formatMoney(payslip.employerSuperannuation);

    // Show modal using vanilla JavaScript
    const modal = document.getElementById('payslipDetailModal');
    modal.style.display = 'block';
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.id = 'modalBackdrop';
    document.body.appendChild(backdrop);
  }

  function setLoading(isLoading) {
    if (!loadingBox) return;
    if (isLoading) loadingBox.classList.remove("d-none");
    else loadingBox.classList.add("d-none");
  }

  function setLoadingSpecial(isLoading) {
    if (!loadingBoxSpecial) return;
    if (isLoading) loadingBoxSpecial.classList.remove("d-none");
    else loadingBoxSpecial.classList.add("d-none");
  }

  async function populateStaffDropdown() {
    try {
      const response = await fetch(`${window.API_BASE}/Staffs`);
      if (!response.ok) {
        console.error('Failed to load staff list');
        return;
      }

      const staffList = await response.json();

      // Populate regular staff dropdown
      if (staffIdInput) {
        staffIdInput.innerHTML = '<option value="">-- Select Staff --</option>';
        staffList.forEach(staff => {
          const option = document.createElement('option');
          option.value = staff.StaffId;
          option.textContent = `${staff.StaffId} - ${staff.FirstName} ${staff.LastName}`;
          staffIdInput.appendChild(option);
        });
      }

      // Populate special staff dropdown
      if (specialStaffIdInput) {
        specialStaffIdInput.innerHTML = '<option value="">-- Select Staff --</option>';
        staffList.forEach(staff => {
          const option = document.createElement('option');
          option.value = staff.StaffId;
          option.textContent = `${staff.StaffId} - ${staff.FirstName} ${staff.LastName}`;
          specialStaffIdInput.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading staff list:', error);
    }
  }

  if (createPayslipForm) {
    createPayslipForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideMessages();
      setLoading(true);

      const staffId = Number(staffIdInput?.value || "");
      const weekStartDate = weekStartDateInput?.value || "";

      if (!Number.isFinite(staffId) || staffId <= 0) {
        setLoading(false);
        showError("Please select a staff member");
        return;
      }

      if (!weekStartDate) {
        setLoading(false);
        showError("Date is required");
        return;
      }

      try {
        const requestBody = {
          StaffId: staffId,
          WeekStartDate: weekStartDate
        };

        const response = await fetch(`${window.API_BASE}/payslip/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errMsg = await getErrorMessage(response);
          throw new Error(errMsg);
        }

        const data = await response.json();
        showSuccess("Payslip created successfully!");
        
        // Show modal with payslip details
        showPayslipModal(data);
      } catch (err) {
        showError(err.message || "Failed to create payslip");
      } finally {
        setLoading(false);
      }
    });
  }

  // Handle special payslip form submission
  if (createPayslipSpecialForm) {
    createPayslipSpecialForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideMessages();
      setLoadingSpecial(true);

      const staffId = Number(specialStaffIdInput?.value || "");
      const payRate = Number(specialPayRateInput?.value || "");
      const dateStart = specialDateStartInput?.value || "";
      const dateEnd = specialDateEndInput?.value || "";

      if (!Number.isFinite(staffId) || staffId <= 0) {
        setLoadingSpecial(false);
        showError("Please select a staff member");
        return;
      }

      if (!Number.isFinite(payRate) || payRate <= 0) {
        setLoadingSpecial(false);
        showError("Pay rate must be greater than 0");
        return;
      }

      if (!dateStart) {
        setLoadingSpecial(false);
        showError("Start date is required");
        return;
      }

      if (!dateEnd) {
        setLoadingSpecial(false);
        showError("End date is required");
        return;
      }

      if (new Date(dateEnd) < new Date(dateStart)) {
        setLoadingSpecial(false);
        showError("End date must be after start date");
        return;
      }

      try {
        const requestBody = {
          StaffId: staffId,
          StandardPayRate: payRate,
          DateStart: dateStart,
          DateEnd: dateEnd
        };

        const response = await fetch(`${window.API_BASE}/payslip/create-payslip-special`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errMsg = await getErrorMessage(response);
          throw new Error(errMsg);
        }

                 const data = await response.json();
         showSuccess("Special payslip created successfully!");
         
         // Show modal with payslip details
         showPayslipModal(data, true);
      } catch (err) {
        showError(err.message || "Failed to create special payslip");
      } finally {
        setLoadingSpecial(false);
      }
    });
  }

  function setCurrentDate() {
    // Set regular payslip date
    if (weekStartDateInput) {
      const urlParams = new URLSearchParams(window.location.search);
      const weekStartDateParam = urlParams.get('weekStartDate');
      
      if (weekStartDateParam) {
        weekStartDateInput.value = weekStartDateParam;
      } else {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        weekStartDateInput.value = dateString;
      }
    }

    // Set special payslip dates
    if (specialDateStartInput && specialDateEndInput) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      specialDateStartInput.value = dateString;
      specialDateEndInput.value = dateString;
    }
  }

  function setStaffFromQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    const staffIdParam = urlParams.get('staffId');
    
    if (staffIdParam && staffIdInput) {
      // Wait for staff dropdown to populate, then set the value
      setTimeout(() => {
        staffIdInput.value = staffIdParam;
      }, 500);
    }
  }

  // Global functions for onclick handlers
  window.hidePayslipModal = hidePayslipModal;

  document.addEventListener('DOMContentLoaded', () => {
    populateStaffDropdown();
    setCurrentDate();
    setStaffFromQuery();
  });

  populateStaffDropdown();
  setCurrentDate();
  setStaffFromQuery();
})();

