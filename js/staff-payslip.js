(function () {
  const loadError = document.getElementById("loadError");
  const loadingBox = document.getElementById("loadingBox");
  const payslipsTableBody = document.getElementById("payslipsTableBody");
  const pagination = document.getElementById("pagination");
  const btnRefresh = document.getElementById("btnRefresh");
  const filterDateFrom = document.getElementById("filterDateFrom");
  const filterDateTo = document.getElementById("filterDateTo");

  // Summary elements
  const totalPayslips = document.getElementById("totalPayslips");
  const totalGross = document.getElementById("totalGross");
  const totalNet = document.getElementById("totalNet");
  const totalHours = document.getElementById("totalHours");

  let allPayslips = [];
  let filteredPayslips = [];
  let currentPage = 1;
  const itemsPerPage = 10;
  let staffSession = null;

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

  function formatMoney(n) {
    const x = Number(n);
    return Number.isFinite(x) ? `$${x.toFixed(2)}` : "$0.00";
  }

  function setDefaultDates() {
    const today = new Date();
    
    // Set To Date to tomorrow (today + 1 day)
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() + 1);
    if (filterDateTo) {
      filterDateTo.value = toDate.toISOString().split('T')[0];
    }
    
    // Set From Date to last Monday
    const fromDate = new Date(today);
    const dayOfWeek = fromDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days to Monday
    fromDate.setDate(fromDate.getDate() - daysToSubtract - 7); // Go back to last Monday
    if (filterDateFrom) {
      filterDateFrom.value = fromDate.toISOString().split('T')[0];
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  }

  async function loadPayslips() {
    if (!staffSession) {
      showError("Staff session not found. Please login again.");
      return;
    }

    try {
      setLoading(true);
      hideError();

      const response = await fetch(`${window.API_BASE}/payslip`);
      if (!response.ok) {
        const errMsg = await getErrorMessage(response);
        throw new Error(errMsg);
      }

      const allPayslipsData = await response.json();
      
      // Filter payslips for current staff only
      allPayslips = allPayslipsData.filter(payslip => payslip.staffId === staffSession.staffId);
      
      applyFilters();
      updateSummary();
    } catch (err) {
      showError(err.message || "Failed to load payslips");
      allPayslips = [];
      filteredPayslips = [];
      renderPayslips();
      updateSummary();
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    console.log('Applying filters...');
    console.log('From Date:', filterDateFrom.value);
    console.log('To Date:', filterDateTo.value);
    console.log('Total payslips before filter:', allPayslips.length);
    
    filteredPayslips = allPayslips.filter(payslip => {
      // Filter by created date range
      if (filterDateFrom.value) {
        const payslipDate = new Date(payslip.dateCreated);
        const fromDate = new Date(filterDateFrom.value);
        fromDate.setHours(0, 0, 0, 0); // Start of day
        payslipDate.setHours(0, 0, 0, 0); // Start of day
        if (payslipDate < fromDate) {
          return false;
        }
      }

      if (filterDateTo.value) {
        const payslipDate = new Date(payslip.dateCreated);
        const toDate = new Date(filterDateTo.value);
        toDate.setHours(23, 59, 59, 999); // End of day
        payslipDate.setHours(0, 0, 0, 0); // Start of day
        if (payslipDate > toDate) {
          return false;
        }
      }

      return true;
    });

    console.log('Filtered payslips:', filteredPayslips.length);

    // Sort by created date (newest first)
    filteredPayslips.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));

    currentPage = 1;
    renderPayslips();
  }

  function updateSummary() {
    // Calculate totals
    const totalPayslipCount = allPayslips.length;
    const totalGrossAmount = allPayslips.reduce((sum, payslip) => sum + (Number(payslip.grossWeeklyPay) || 0), 0);
    const totalNetAmount = allPayslips.reduce((sum, payslip) => sum + (Number(payslip.netPay) || 0), 0);
    const totalHoursCount = allPayslips.reduce((sum, payslip) => sum + (Number(payslip.totalHoursWorked) || 0), 0);

    // Update summary elements
    if (totalPayslips) totalPayslips.textContent = totalPayslipCount;
    if (totalGross) totalGross.textContent = formatMoney(totalGrossAmount);
    if (totalNet) totalNet.textContent = formatMoney(totalNetAmount);
    if (totalHours) totalHours.textContent = totalHoursCount.toFixed(1);
  }

  function renderPayslips() {
    if (!payslipsTableBody) return;

    if (filteredPayslips.length === 0) {
      payslipsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">
            No payslips found
          </td>
        </tr>
      `;
      renderPagination();
      return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pagePayslips = filteredPayslips.slice(startIndex, endIndex);

    payslipsTableBody.innerHTML = pagePayslips.map(payslip => `
      <tr style="cursor: pointer;" onclick="showPayslipDetail(${payslip.payslipId})">
        <td>${payslip.payslipId}</td>
        <td>${formatDate(payslip.dateCreated)}</td>
        <td>${formatDate(payslip.weekStartDate)}</td>
        <td>
          <span class="badge bg-info">${payslip.totalHoursWorked || 0} hrs</span>
        </td>
        <td class="text-success fw-bold">${formatMoney(payslip.grossWeeklyPay)}</td>
        <td class="text-primary fw-bold">${formatMoney(payslip.netPay)}</td>
      </tr>
    `).join('');

    renderPagination();
  }

  function renderPagination() {
    if (!pagination) return;

    const totalPages = Math.ceil(filteredPayslips.length / itemsPerPage);
    
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

  function showPayslipDetail(payslipId) {
    const payslip = allPayslips.find(p => p.payslipId === payslipId);
    if (!payslip) return;

    // Update modal content
    document.getElementById('modalPayslipId').textContent = payslip.payslipId;
    document.getElementById('modalWeekStartDate').textContent = formatDate(payslip.weekStartDate);
    document.getElementById('modalDateCreated').textContent = formatDate(payslip.dateCreated);
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

  function changePage(page) {
    const totalPages = Math.ceil(filteredPayslips.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
      renderPayslips();
    }
  }

  // Event listeners
  if (btnRefresh) {
    btnRefresh.addEventListener('click', loadPayslips);
  }

  if (filterDateFrom) {
    filterDateFrom.addEventListener('change', applyFilters);
  }

  if (filterDateTo) {
    filterDateTo.addEventListener('change', applyFilters);
  }

  // Global functions for onclick handlers
  window.changePage = changePage;
  window.showPayslipDetail = showPayslipDetail;
  window.hidePayslipModal = hidePayslipModal;

  // Initialize
  document.addEventListener('DOMContentLoaded', async () => {
    staffSession = getStaffSession();
    if (!staffSession) {
      window.location.href = 'staff-login.html';
      return;
    }
    
    // Set default dates
    setDefaultDates();
    
    await loadPayslips();
  });

  // Also call immediately in case DOMContentLoaded already fired
  staffSession = getStaffSession();
  if (staffSession) {
    setDefaultDates();
    loadPayslips();
  } else {
    window.location.href = 'staff-login.html';
  }
})();
