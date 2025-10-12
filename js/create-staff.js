
function authHeader() {
  const u = JSON.parse(localStorage.getItem('farm_user') || 'null');
  return u && u.token ? { 'Authorization': 'Bearer ' + u.token } : {};
}

async function getErrorMessage(response) {
  try {
    const errorData = await response.json();
    return errorData.message || errorData.error || errorData.detail || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function isValidPhoneNumber(phone) {
  if (!phone || phone.trim() === '') return true; // Allow empty phone numbers
  return /^[\+]?[0-9]{8,15}$/.test(phone.trim());
}

(function () {
  // Optional: protect page (require login like dashboard)
  const user = JSON.parse(localStorage.getItem('farm_user') || 'null');
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const form = document.getElementById('createStaffForm');
  const btn = document.getElementById('btnSubmitCreate');
  const spinner = document.getElementById('createSpinner');
  const errorBox = document.getElementById('createError');

  function setLoading(b) {
    btn.disabled = b;
    spinner.classList.toggle('d-none', !b);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('d-none');
    errorBox.textContent = '';

    // Validate phone number
    const phoneInput = document.getElementById('Phone');
    const phoneValue = phoneInput.value.trim();
    
    if (phoneValue && !isValidPhoneNumber(phoneValue)) {
      phoneInput.classList.add('is-invalid');
      form.classList.add('was-validated');
      return;
    } else {
      phoneInput.classList.remove('is-invalid');
    }

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    // =================================================================
    // Bug Fix: Remove references to deleted fields
    // Developer: Tim
    // Date: 2025-10-12
    // Description: Removed StandardHoursPerWeek and OvertimePayRate field references
    // Issue: Fields were removed from HTML form
    // Bug Reference: Sprint 3 Frontend UI Fixes
    // =================================================================
    // Gather values
    const payloadPascal = {
      FirstName: document.getElementById('FirstName').value.trim(),
      LastName: document.getElementById('LastName').value.trim(),
      Email: document.getElementById('Email').value.trim() || null,
      Phone: document.getElementById('Phone').value.trim() || null,
      Password: document.getElementById('Password').value || null,
      Address: document.getElementById('Address').value.trim() || null,
      ContractType: document.getElementById('ContractType').value.trim() || null,
      Role: document.getElementById('Role').value,
      StandardPayRate: numOrNull(document.getElementById('StandardPayRate').value)
    };

    // Bug Fix: Remove references to deleted fields in camelCase payload
    // Also include camelCase keys for compatibility with typical .NET JSON policies
    const payloadCamel = {
      firstName: payloadPascal.FirstName,
      lastName: payloadPascal.LastName,
      email: payloadPascal.Email,
      phone: payloadPascal.Phone,
      password: payloadPascal.Password,
      address: payloadPascal.Address,
      contractType: payloadPascal.ContractType,
      role: payloadPascal.Role,
      standardPayRate: payloadPascal.StandardPayRate
    };

    const payload = Object.assign({}, payloadPascal, payloadCamel);

    try {
      setLoading(true);


      const res = await fetch(`${window.API_BASE}/Staffs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(payload)
      });


      if (!res.ok) {
        const errorMessage = await getErrorMessage(res);
        throw new Error(errorMessage);
      }
      const created = await res.json();
      // Thành công: quay lại Dashboard (dashboard sẽ tự fetch lại danh sách)
      window.location.href = 'dashboard.html';
    } catch (err) {
      errorBox.textContent = err.message || 'Cannot create staff.';
      errorBox.classList.remove('d-none');
    } finally {
      setLoading(false);
    }
  });

  function numOrNull(v) {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
})();