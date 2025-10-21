function authHeader() {
  const u = JSON.parse(localStorage.getItem("farm_user") || "null");
  return u && u.token ? { Authorization: "Bearer " + u.token } : {};
}

async function getErrorMessage(response) {
  try {
    const errorData = await response.json();
    return (
      errorData.message ||
      errorData.error ||
      errorData.detail ||
      `HTTP ${response.status}`
    );
  } catch {
    return `HTTP ${response.status}`;
  }
}

(function () {
  const user = JSON.parse(localStorage.getItem("farm_user") || "null");
  const loadingBox = document.getElementById("loadingBox");
  const loadError = document.getElementById("loadError");
  const payslipContainer = document.getElementById("payslipContainer");
  const noPayslipData = document.getElementById("noPayslipData");
  const selectPayslipMessage = document.getElementById("selectPayslipMessage");
  const payslipSelect = document.getElementById("payslipSelect");
  const btnRefreshPayslips = document.getElementById("btnRefreshPayslips");
  const btnDownloadPayslip = document.getElementById("btnDownloadPayslip");
  const btnPrintPayslip = document.getElementById("btnPrintPayslip");

  // Payslip display elements
  const employeeName = document.getElementById("employeeName");
  const employeeId = document.getElementById("employeeId");
  const periodCovered = document.getElementById("periodCovered");
  const payDate = document.getElementById("payDate");
  const grossPay = document.getElementById("grossPay");
  const regularHours = document.getElementById("regularHours");
  const overtimeHours = document.getElementById("overtimeHours");
  const hourlyRate = document.getElementById("hourlyRate");
  const taxDeduction = document.getElementById("taxDeduction");
  const superDeduction = document.getElementById("superDeduction");
  const otherDeductions = document.getElementById("otherDeductions");
  const totalDeductions = document.getElementById("totalDeductions");
  const netPay = document.getElementById("netPay");
  const ytdGross = document.getElementById("ytdGross");
  const ytdTax = document.getElementById("ytdTax");
  const ytdNet = document.getElementById("ytdNet");

  // Guard page
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Get current user's staff ID
  const staffId = user.staff?.staffId || user.staffId;
  if (!staffId) {
    if (loadError) {
      loadError.textContent =
        "Unable to identify staff member. Please contact administrator.";
      loadError.classList.remove("d-none");
    }
    if (loadingBox) loadingBox.classList.add("d-none");
    return;
  }

  // Load available payslips
  let availablePayslips = [];
  async function fetchAvailablePayslips() {
    try {
      if (loadingBox) loadingBox.classList.remove("d-none");
      if (loadError) loadError.classList.add("d-none");

      // This would typically be a different endpoint to get list of payslips for a staff member
      // For now, we'll simulate with a generic endpoint or handle it in the main fetch
      const res = await fetch(
        `${window.API_BASE}/Payslips/staff/${encodeURIComponent(staffId)}`,
        {
          method: "GET",
          headers: { ...authHeader() },
        }
      );

      if (!res.ok) {
        const errorMessage = await getErrorMessage(res);
        throw new Error(errorMessage);
      }

      const data = await res.json();
      availablePayslips = Array.isArray(data) ? data : [];
      populatePayslipSelect(availablePayslips);
    } catch (err) {
      if (loadError) {
        loadError.textContent = err.message || "Cannot load payslips list.";
        loadError.classList.remove("d-none");
      }
    } finally {
      if (loadingBox) loadingBox.classList.add("d-none");
    }
  }

  function populatePayslipSelect(payslips) {
    if (!payslipSelect) return;

    payslipSelect.innerHTML =
      '<option value="">Select a payslip to view...</option>';

    if (!payslips || payslips.length === 0) {
      if (noPayslipData) noPayslipData.classList.remove("d-none");
      if (selectPayslipMessage) selectPayslipMessage.classList.add("d-none");
      if (payslipContainer) payslipContainer.classList.add("d-none");
      return;
    }

    if (noPayslipData) noPayslipData.classList.add("d-none");
    if (selectPayslipMessage) selectPayslipMessage.classList.remove("d-none");
    if (payslipContainer) payslipContainer.classList.add("d-none");

    payslips.forEach((payslip) => {
      const option = document.createElement("option");
      option.value = payslip.payslipId || payslip.id;
      option.textContent = `Payslip ${payslip.payslipId || payslip.id} - ${
        payslip.periodCovered || "Unknown Period"
      }`;
      payslipSelect.appendChild(option);
    });
  }

  // Load specific payslip details
  async function fetchPayslipDetails(payslipId) {
    try {
      if (loadingBox) loadingBox.classList.remove("d-none");
      if (loadError) loadError.classList.add("d-none");

      const res = await fetch(
        `${window.API_BASE}/Payslip/${encodeURIComponent(payslipId)}`,
        {
          method: "GET",
          headers: { ...authHeader() },
        }
      );

      if (!res.ok) {
        const errorMessage = await getErrorMessage(res);
        throw new Error(errorMessage);
      }

      const payslipData = await res.json();
      displayPayslip(payslipData);
    } catch (err) {
      if (loadError) {
        loadError.textContent = err.message || "Cannot load payslip details.";
        loadError.classList.remove("d-none");
      }
    } finally {
      if (loadingBox) loadingBox.classList.add("d-none");
    }
  }

  function displayPayslip(payslip) {
    if (!payslip) return;

    // Employee Information
    if (employeeName)
      employeeName.textContent =
        payslip.employeeName ||
        `${payslip.firstName || ""} ${payslip.lastName || ""}`.trim() ||
        "-";
    if (employeeId)
      employeeId.textContent = payslip.employeeId || payslip.staffId || "-";
    if (periodCovered)
      periodCovered.textContent =
        payslip.periodCovered || payslip.payPeriod || "-";
    if (payDate) payDate.textContent = payslip.payDate || payslip.date || "-";

    // Earnings
    if (grossPay)
      grossPay.textContent = formatCurrency(
        payslip.grossPay || payslip.gross || 0
      );
    if (regularHours)
      regularHours.textContent = payslip.regularHours || payslip.hours || 0;
    if (overtimeHours)
      overtimeHours.textContent =
        payslip.overtimeHours || payslip.overtime || 0;
    if (hourlyRate)
      hourlyRate.textContent = formatCurrency(
        payslip.hourlyRate || payslip.rate || 0
      );

    // Deductions
    const tax = payslip.taxDeduction || payslip.tax || 0;
    const superannuation =
      payslip.superDeduction || payslip.superannuation || 0;
    const other = payslip.otherDeductions || payslip.other || 0;
    const totalDeductionsAmount = tax + superannuation + other;

    if (taxDeduction) taxDeduction.textContent = formatCurrency(tax);
    if (superDeduction)
      superDeduction.textContent = formatCurrency(superannuation);
    if (otherDeductions) otherDeductions.textContent = formatCurrency(other);
    if (totalDeductions)
      totalDeductions.textContent = formatCurrency(totalDeductionsAmount);

    // Net Pay
    const net =
      (payslip.grossPay || payslip.gross || 0) - totalDeductionsAmount;
    if (netPay) netPay.textContent = formatCurrency(net);

    // YTD Information
    if (ytdGross)
      ytdGross.textContent = formatCurrency(
        payslip.ytdGross || payslip.yearToDateGross || 0
      );
    if (ytdTax)
      ytdTax.textContent = formatCurrency(
        payslip.ytdTax || payslip.yearToDateTax || 0
      );
    if (ytdNet)
      ytdNet.textContent = formatCurrency(
        payslip.ytdNet || payslip.yearToDateNet || 0
      );

    // Show the payslip container
    if (payslipContainer) payslipContainer.classList.remove("d-none");
    if (selectPayslipMessage) selectPayslipMessage.classList.add("d-none");
    if (noPayslipData) noPayslipData.classList.add("d-none");
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  }

  // Event handlers
  if (payslipSelect) {
    payslipSelect.addEventListener("change", (e) => {
      const payslipId = e.target.value;
      if (payslipId) {
        fetchPayslipDetails(payslipId);
      } else {
        if (payslipContainer) payslipContainer.classList.add("d-none");
        if (selectPayslipMessage)
          selectPayslipMessage.classList.remove("d-none");
      }
    });
  }

  if (btnRefreshPayslips) {
    btnRefreshPayslips.addEventListener("click", () => {
      fetchAvailablePayslips();
    });
  }

  if (btnDownloadPayslip) {
    btnDownloadPayslip.addEventListener("click", () => {
      const payslipId = payslipSelect?.value;
      if (payslipId) {
        // In a real implementation, this would download a PDF
        // For now, we'll show an alert
        alert(
          `Download functionality for payslip ${payslipId} would be implemented here.`
        );
      } else {
        alert("Please select a payslip first.");
      }
    });
  }

  if (btnPrintPayslip) {
    btnPrintPayslip.addEventListener("click", () => {
      window.print();
    });
  }

  // Initialize
  fetchAvailablePayslips();
})();
