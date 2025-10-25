(function () {
  const loadError = document.getElementById("loadError");
  const loadingBox = document.getElementById("loadingBox");
  const resultBox = document.getElementById("resultBox");

  // =================================================================
  // Bug Fix: Add staff dropdown population functionality
  // Developer: Tim
  // Date: 2025-10-12
  // Description: Added function to populate staff dropdown with existing staff
  // Issue: Staff ID needs to be a dropdown instead of text input
  // Bug Reference: Sprint 3 Frontend UI Fixes
  // =================================================================
  // =================================================================
  // Feature Update: Allow any date selection for payroll calculation
  // Developer: Tim
  // Date: 2025-10-12
  // Description: Changed from requiring Monday date to accepting any date in the week.
  //              System will calculate payroll for the entire week containing the selected date.
  // Issue: Users should be able to select any day, not just Monday
  // =================================================================
  const payrollForm = document.getElementById("payrollForm");
  const staffIdInput = document.getElementById("staffId");
  const mondayDateInput = document.getElementById("mondayDate");
  const specialRateInput = document.getElementById("isSpecialPayRate");

  const staffName = document.getElementById("staffName");
  const totalHours = document.getElementById("totalHours");
  const weekStart = document.getElementById("weekStart");
  const grossPay = document.getElementById("grossPay");
  const weeklyPAYG = document.getElementById("weeklyPAYG");
  const netPay = document.getElementById("netPay");
  const annualIncome = document.getElementById("annualIncome");
  const annualTax = document.getElementById("annualTax");
  const superEl = document.getElementById("super");

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

  const btnCreatePayslip = document.getElementById('btnCreatePayslip');

  function setResult(data) {
    if (!resultBox) return;
    resultBox.classList.remove("d-none");
    staffName.textContent = `${data.staffName || "Staff"} (ID: ${
      data.staffId
    })`;
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
    
    // Show Create Payslip button when result is displayed
    if (btnCreatePayslip) {
      btnCreatePayslip.style.display = 'block';
    }
  }

  function setLoading(isLoading) {
    if (!loadingBox) return;
    if (isLoading) loadingBox.classList.remove("d-none");
    else loadingBox.classList.add("d-none");
  }

  // Bug Fix: Add function to populate staff dropdown
  async function populateStaffDropdown() {
    if (!staffIdInput) return;

    try {
      const response = await fetch(`${window.API_BASE}/Staffs`);
      if (!response.ok) {
        console.error('Failed to load staff list');
        return;
      }

      const staffList = await response.json();

      // Clear existing options except the first one
      staffIdInput.innerHTML = '<option value="">-- Select Staff --</option>';

      // Add staff options
      staffList.forEach(staff => {
        const option = document.createElement('option');
        option.value = staff.StaffId;
        option.textContent = `${staff.StaffId} - ${staff.FirstName} ${staff.LastName}`;
        staffIdInput.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading staff list:', error);
    }
  }

  if (payrollForm) {
    payrollForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError();
      setLoading(true);
      resultBox && resultBox.classList.add("d-none");

      const staffId = Number(staffIdInput?.value || "");
      const mondayDate = mondayDateInput?.value || "";
      const isSpecial = !!specialRateInput?.checked;

      if (!Number.isFinite(staffId) || staffId <= 0) {
        setLoading(false);
        showError("Staff ID must be greater than 0");
        return;
      }

      if (!mondayDate) {
        setLoading(false);
        showError("Date is required");
        return;
      }

      try {
        const url = new URL(`${window.location.origin}/api/payroll/calculate`);
        url.searchParams.append("staffId", String(staffId));
        url.searchParams.append("mondayDate", mondayDate);
        if (isSpecial) url.searchParams.append("isSpecialPayRate", "true");

        // Proxy through same origin if backend is behind same host; otherwise, use API_BASE
        const endpoint =
          url.pathname.startsWith("/api/") && window.API_BASE
            ? `${window.API_BASE.replace(
                /\/$/,
                ""
              )}/payroll/calculate?${url.searchParams.toString()}`
            : url.toString();

        const res = await fetch(endpoint, { method: "GET" });
        if (!res.ok) {
          const errMsg = await getErrorMessage(res);
          throw new Error(errMsg);
        }
        const data = await res.json();
        setResult(data);
      } catch (err) {
        showError(err.message || "Failed to calculate payroll");
      } finally {
        setLoading(false);
      }
    });
  }

  // Set current date as default value for date input
  function setCurrentDate() {
    if (!mondayDateInput) return;
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    mondayDateInput.value = dateString;
  }

  // Bug Fix: Load staff dropdown on page load
  // Initialize staff dropdown when page loads
  document.addEventListener('DOMContentLoaded', () => {
    populateStaffDropdown();
    setCurrentDate();
  });

  // Also call it immediately in case DOMContentLoaded already fired
  populateStaffDropdown();
  setCurrentDate();

  // Handle Create Payslip button click
  if (btnCreatePayslip) {
    btnCreatePayslip.addEventListener('click', () => {
      const staffId = staffIdInput?.value;
      const weekStartDate = mondayDateInput?.value;
      
      if (staffId && weekStartDate) {
        // Redirect to create-payslip page with query parameters
        window.location.href = `create-payslip.html?staffId=${staffId}&weekStartDate=${weekStartDate}`;
      } else {
        alert('Please calculate payroll first before creating a payslip.');
      }
    });
  }
})();
