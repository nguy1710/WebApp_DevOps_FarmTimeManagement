(function () {
  const loadError = document.getElementById("loadError");
  const successMessage = document.getElementById("successMessage");
  const loadingBox = document.getElementById("loadingBox");
  const loadingBoxSpecial = document.getElementById("loadingBoxSpecial");
  const resultBox = document.getElementById("resultBox");
  const resultBoxSpecial = document.getElementById("resultBoxSpecial");

  const createPayslipForm = document.getElementById("createPayslipForm");
  const createPayslipSpecialForm = document.getElementById("createPayslipSpecialForm");
  const staffIdInput = document.getElementById("staffId");
  const specialStaffIdInput = document.getElementById("specialStaffId");
  const weekStartDateInput = document.getElementById("weekStartDate");
  const specialPayRateInput = document.getElementById("specialPayRate");
  const specialDateStartInput = document.getElementById("specialDateStart");
  const specialDateEndInput = document.getElementById("specialDateEnd");

  const totalHours = document.getElementById("totalHours");
  const weekStart = document.getElementById("weekStart");
  const grossPay = document.getElementById("grossPay");
  const weeklyPAYG = document.getElementById("weeklyPAYG");
  const netPay = document.getElementById("netPay");
  const annualIncome = document.getElementById("annualIncome");
  const annualTax = document.getElementById("annualTax");
  const superEl = document.getElementById("super");

  // Special payslip result elements
  const specialTotalHours = document.getElementById("specialTotalHours");
  const specialDateRange = document.getElementById("specialDateRange");
  const specialGrossPay = document.getElementById("specialGrossPay");
  const specialWeeklyPAYG = document.getElementById("specialWeeklyPAYG");
  const specialNetPay = document.getElementById("specialNetPay");
  const specialAnnualIncome = document.getElementById("specialAnnualIncome");
  const specialAnnualTax = document.getElementById("specialAnnualTax");
  const specialSuper = document.getElementById("specialSuper");

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
    return Number.isFinite(x) ? x.toFixed(2) : "-";
  }

  function formatDate(dateString) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  }

  function setResult(data) {
    if (!resultBox) return;
    resultBox.classList.remove("d-none");
    totalHours.textContent = data.totalHoursWorked ?? "-";
    weekStart.textContent = data.weekStartDate
      ? new Date(data.weekStartDate).toISOString().slice(0, 10)
      : "-";
    grossPay.textContent = formatMoney(data.grossWeeklyPay);
    weeklyPAYG.textContent = formatMoney(data.weeklyPAYG);
    netPay.textContent = formatMoney(data.netPay);
    annualIncome.textContent = formatMoney(data.annualIncome);
    annualTax.textContent = formatMoney(data.annualTax);
    superEl.textContent = formatMoney(data.employerSuperannuation);
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
      resultBox && resultBox.classList.add("d-none");

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
        setResult(data);
        showSuccess("Payslip created successfully!");
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
      resultBoxSpecial && resultBoxSpecial.classList.add("d-none");

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
        setResultSpecial(data);
        showSuccess("Special payslip created successfully!");
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

  function setResultSpecial(data) {
    if (!resultBoxSpecial) return;
    resultBoxSpecial.classList.remove("d-none");
    specialTotalHours.textContent = data.totalHoursWorked ?? "-";
    specialDateRange.textContent = `${formatDate(data.dateStart)} - ${formatDate(data.dateEnd)}`;
    specialGrossPay.textContent = formatMoney(data.grossWeeklyPay);
    specialWeeklyPAYG.textContent = formatMoney(data.weeklyPAYG);
    specialNetPay.textContent = formatMoney(data.netPay);
    specialAnnualIncome.textContent = formatMoney(data.annualIncome);
    specialAnnualTax.textContent = formatMoney(data.annualTax);
    specialSuper.textContent = formatMoney(data.employerSuperannuation);
  }

  document.addEventListener('DOMContentLoaded', () => {
    populateStaffDropdown();
    setCurrentDate();
    setStaffFromQuery();
  });

  populateStaffDropdown();
  setCurrentDate();
  setStaffFromQuery();
})();

