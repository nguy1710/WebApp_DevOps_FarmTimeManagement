(function () {
  const loadError = document.getElementById("loadError");
  const loadingBox = document.getElementById("loadingBox");
  const payslipsTableBody = document.getElementById("payslipsTableBody");
  const pagination = document.getElementById("pagination");
  const btnRefresh = document.getElementById("btnRefresh");
  const filterStaff = document.getElementById("filterStaff");
  const filterDateFrom = document.getElementById("filterDateFrom");
  const filterDateTo = document.getElementById("filterDateTo");
  const confirmDeleteBtn = document.getElementById("confirmDelete");

  let allPayslips = [];
  let filteredPayslips = [];
  let staffList = [];
  let currentPage = 1;
  const itemsPerPage = 10;
  let deletePayslipId = null;

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
    return Number.isFinite(x) ? `$${x.toFixed(2)}` : "-";
  }

  function formatDate(dateString) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  }

  async function loadPayslips() {
    try {
      setLoading(true);
      hideError();

      const response = await fetch(`${window.API_BASE}/payslip`);
      if (!response.ok) {
        const errMsg = await getErrorMessage(response);
        throw new Error(errMsg);
      }

      allPayslips = await response.json();
      applyFilters();
    } catch (err) {
      showError(err.message || "Failed to load payslips");
      allPayslips = [];
      filteredPayslips = [];
      renderPayslips();
    } finally {
      setLoading(false);
    }
  }

  async function loadStaff() {
    try {
      const response = await fetch(`${window.API_BASE}/Staffs`);
      if (!response.ok) {
        console.error('Failed to load staff list');
        return;
      }

      staffList = await response.json();
      
      // Clear existing options except the first one
      filterStaff.innerHTML = '<option value="">All Staff</option>';

      // Add staff options
      staffList.forEach(staff => {
        const option = document.createElement('option');
        option.value = staff.StaffId;
        option.textContent = `${staff.StaffId} - ${staff.FirstName} ${staff.LastName}`;
        filterStaff.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading staff list:', error);
    }
  }

  function getStaffName(staffId) {
    const staff = staffList.find(s => s.StaffId === staffId);
    return staff ? `${staff.FirstName} ${staff.LastName}` : 'Unknown';
  }

  function applyFilters() {
    filteredPayslips = allPayslips.filter(payslip => {
      // Filter by staff
      if (filterStaff.value && payslip.staffId !== parseInt(filterStaff.value)) {
        return false;
      }

      // Filter by date range
      if (filterDateFrom.value) {
        const payslipDate = new Date(payslip.weekStartDate);
        const fromDate = new Date(filterDateFrom.value);
        if (payslipDate < fromDate) {
          return false;
        }
      }

      if (filterDateTo.value) {
        const payslipDate = new Date(payslip.weekStartDate);
        const toDate = new Date(filterDateTo.value);
        if (payslipDate > toDate) {
          return false;
        }
      }

      return true;
    });

    currentPage = 1;
    renderPayslips();
  }

  function renderPayslips() {
    if (!payslipsTableBody) return;

    if (filteredPayslips.length === 0) {
      payslipsTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted">
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
        <td>${payslip.staffId} - ${getStaffName(payslip.staffId)}</td>
        <td>${formatDate(payslip.weekStartDate)}</td>
        <td>${payslip.totalHoursWorked || '-'}</td>
        <td>${formatMoney(payslip.grossWeeklyPay)}</td>
        <td>${formatMoney(payslip.netPay)}</td>
        <td>${formatDate(payslip.dateCreated)}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deletePayslip(${payslip.payslipId})">
            Delete
          </button>
        </td>
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

  function changePage(page) {
    const totalPages = Math.ceil(filteredPayslips.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
      renderPayslips();
    }
  }

  function deletePayslip(payslipId) {
    deletePayslipId = payslipId;
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
  }

  async function confirmDelete() {
    if (!deletePayslipId) return;

    try {
      setLoading(true);
      hideError();

      const response = await fetch(`${window.API_BASE}/payslip/${deletePayslipId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errMsg = await getErrorMessage(response);
        throw new Error(errMsg);
      }

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      modal.hide();

      // Reload payslips
      await loadPayslips();
    } catch (err) {
      showError(err.message || "Failed to delete payslip");
    } finally {
      setLoading(false);
      deletePayslipId = null;
    }
  }

  // Event listeners
  if (btnRefresh) {
    btnRefresh.addEventListener('click', loadPayslips);
  }

  if (filterStaff) {
    filterStaff.addEventListener('change', applyFilters);
  }

  if (filterDateFrom) {
    filterDateFrom.addEventListener('change', applyFilters);
  }

  if (filterDateTo) {
    filterDateTo.addEventListener('change', applyFilters);
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', confirmDelete);
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

  // Global functions for onclick handlers
  window.deletePayslip = deletePayslip;
  window.changePage = changePage;
  window.showPayslipDetail = showPayslipDetail;
  window.hidePayslipModal = hidePayslipModal;

  // Initialize
  document.addEventListener('DOMContentLoaded', async () => {
    await loadStaff();
    await loadPayslips();
  });

  // Also call immediately in case DOMContentLoaded already fired
  loadStaff().then(() => loadPayslips());
})();
