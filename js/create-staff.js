
function authHeader() {
  const u = JSON.parse(localStorage.getItem('farm_user') || 'null');
  return u && u.token ? { 'Authorization': 'Bearer ' + u.token } : {};
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

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

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
      StandardHoursPerWeek: numOrNull(document.getElementById('StandardHoursPerWeek').value),
      StandardPayRate: numOrNull(document.getElementById('StandardPayRate').value),
      OvertimePayRate: numOrNull(document.getElementById('OvertimePayRate').value)
    };

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
      standardHoursPerWeek: payloadPascal.StandardHoursPerWeek,
      standardPayRate: payloadPascal.StandardPayRate,
      overtimePayRate: payloadPascal.OvertimePayRate
    };

    const payload = Object.assign({}, payloadPascal, payloadCamel);

    try {
      setLoading(true);


      const res = await fetch(`${window.API_BASE}/Staffs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(payload)
      });


      if (!res.ok) throw new Error(`Failed to create staff (HTTP ${res.status}).`);
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