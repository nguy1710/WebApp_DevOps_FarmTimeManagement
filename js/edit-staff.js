
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
    const form = document.getElementById('editStaffForm');
    const btn = document.getElementById('btnSubmitEdit');
    const spinner = document.getElementById('editSpinner');
    const errorBox = document.getElementById('editError');

    // Require login
    const user = JSON.parse(localStorage.getItem('farm_user') || 'null');
    if (!user) { window.location.href = 'login.html'; return; }

    const params = new URLSearchParams(location.search);
    const idParam = params.get('id');
    if (!idParam) { alert('Missing staff id'); window.location.href='dashboard.html'; return; }

    function setLoading(b){ if(btn) btn.disabled=b; if(spinner) spinner.classList.toggle('d-none',!b); }
    function setVal(id,val){ const el=document.getElementById(id); if (el) el.value = (val ?? ""); }
    function val(id){ return (document.getElementById(id)?.value || '').trim(); }
    function num(id){ const n=parseFloat(val(id)); return isNaN(n)?null:n; }

    function setSelectValue(id, value) {
      const el = document.getElementById(id);
      if (!el) return;
      const v = value ?? "";
      if (![...el.options].some(o => o.value === v)) {
        const opt = document.createElement('option');
        opt.value = v; opt.textContent = v || '--';
        el.appendChild(opt);
      }
      el.value = v;
    }

    function pascalToCamel(p){ return {
      firstName:p.FirstName, lastName:p.LastName, email:p.Email, phone:p.Phone,
      address:p.Address, contractType:p.ContractType, role:p.Role,
      standardHoursPerWeek:p.StandardHoursPerWeek, standardPayRate:p.StandardPayRate, overtimePayRate:p.OvertimePayRate
    };}

    // ---- GET /Staffs/{id} and fill form ----
    (async function init(){
      try {
        setLoading(true);
        const res = await fetch(`${window.API_BASE}/Staffs/${encodeURIComponent(idParam)}`, { method:'GET' });
        if (!res.ok) {
          const errorMessage = await getErrorMessage(res);
          throw new Error(errorMessage);
        }
        let s = await res.json();

        // API có thể trả [ { ... } ]
        if (Array.isArray(s)) s = s[0] || {};

        const StaffId = s.StaffId ?? s.staffId ?? s.id ?? idParam;
        const FirstName = s.FirstName ?? s.firstName ?? '';
        const LastName  = s.LastName  ?? s.lastName  ?? '';
        const Email     = s.Email     ?? s.email     ?? '';
        const Phone     = s.Phone     ?? s.phone     ?? '';
        const Address   = s.Address   ?? s.address   ?? '';
        const ContractType = s.ContractType ?? s.contractType ?? '';
        const Role = s.Role ?? s.role ?? '';
        const StandardHoursPerWeek = s.StandardHoursPerWeek ?? s.standardHoursPerWeek ?? '';
        const StandardPayRate      = s.StandardPayRate      ?? s.standardPayRate      ?? '';
        const OvertimePayRate      = s.OvertimePayRate      ?? s.overtimePayRate      ?? '';

        setVal('StaffId', StaffId);
        setVal('FirstName', FirstName);
        setVal('LastName', LastName);
        setVal('Email', Email);
        setVal('Phone', Phone);
        setVal('Address', Address);
        setVal('ContractType', ContractType);
        setSelectValue('Role', Role);
        setVal('StandardHoursPerWeek', StandardHoursPerWeek);
        setVal('StandardPayRate', StandardPayRate);
        setVal('OvertimePayRate', OvertimePayRate);
      } catch (err) {
        console.error(err);
        alert(err.message || 'Cannot load Staff.');
        window.location.href='dashboard.html';
      } finally {
        setLoading(false);
      }
    })();

    // ---- PUT /Staffs/{id} on submit ----
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      errorBox.classList.add('d-none'); errorBox.textContent='';
      
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
      
      if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

      const pas = {
        FirstName: val('FirstName'),
        LastName: val('LastName'),
        Email: val('Email') || null,
        Phone: val('Phone') || null,
        Address: val('Address') || null,
        ContractType: val('ContractType') || null,
        Role: val('Role'),
        StandardHoursPerWeek: num('StandardHoursPerWeek'),
        StandardPayRate: num('StandardPayRate'),
        OvertimePayRate: num('OvertimePayRate')
      };
      const payload = Object.assign({}, pas, pascalToCamel(pas));

      try {
        setLoading(true);
        const idForPut = val('StaffId') || idParam;


       const res = await fetch(`${window.API_BASE}/Staffs/${encodeURIComponent(idForPut)}`, {
          method:'PUT',
          headers:{ 'Content-Type':'application/json', ...authHeader() },
          body: JSON.stringify(payload)
        });


        if (!res.ok) {
          const errorMessage = await getErrorMessage(res);
          throw new Error(errorMessage);
        }
        await res.json();
        window.location.href='dashboard.html';
      } catch (err) {
        errorBox.textContent = err.message || 'Cannot update staff.';
        errorBox.classList.remove('d-none');
      } finally { setLoading(false); }
    });

    // ---- Password Change Functionality ----
    const passwordForm = document.getElementById('changePasswordForm');
    const passwordBtn = document.getElementById('btnChangePassword');
    const passwordSpinner = document.getElementById('passwordSpinner');
    const passwordErrorBox = document.getElementById('passwordError');
    const passwordSuccessBox = document.getElementById('passwordSuccess');
    const cancelPasswordBtn = document.getElementById('btnCancelPassword');

    function setPasswordLoading(b) {
      if (passwordBtn) passwordBtn.disabled = b;
      if (passwordSpinner) passwordSpinner.classList.toggle('d-none', !b);
    }

    function clearPasswordFields() {
      document.getElementById('NewPassword').value = '';
      document.getElementById('ReenterPassword').value = '';
      passwordErrorBox.classList.add('d-none');
      passwordSuccessBox.classList.add('d-none');
    }

    // Cancel button functionality
    cancelPasswordBtn.addEventListener('click', clearPasswordFields);

    // Password change form submission
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      passwordErrorBox.classList.add('d-none');
      passwordErrorBox.textContent = '';
      passwordSuccessBox.classList.add('d-none');
      passwordSuccessBox.textContent = '';

      const newPassword = document.getElementById('NewPassword').value.trim();
      const reenterPassword = document.getElementById('ReenterPassword').value.trim();

      // Validate passwords
      if (!newPassword) {
        document.getElementById('NewPassword').classList.add('is-invalid');
        passwordForm.classList.add('was-validated');
        return;
      } else {
        document.getElementById('NewPassword').classList.remove('is-invalid');
      }

      if (!reenterPassword) {
        document.getElementById('ReenterPassword').classList.add('is-invalid');
        passwordForm.classList.add('was-validated');
        return;
      } else {
        document.getElementById('ReenterPassword').classList.remove('is-invalid');
      }

      // Check if passwords match
      if (newPassword !== reenterPassword) {
        passwordErrorBox.textContent = 'Passwords do not match.';
        passwordErrorBox.classList.remove('d-none');
        return;
      }

      if (!passwordForm.checkValidity()) {
        passwordForm.classList.add('was-validated');
        return;
      }

      try {
        setPasswordLoading(true);
        const idForPasswordChange = val('StaffId') || idParam;

        const response = await fetch(`${window.API_BASE}/Staffs/${encodeURIComponent(idForPasswordChange)}/changepassword`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader()
          },
          body: JSON.stringify({
            password: newPassword
          })
        });

        if (!response.ok) {
          const errorMessage = await getErrorMessage(response);
          throw new Error(errorMessage);
        }

        // Success - redirect to dashboard like staff update
        window.location.href = 'dashboard.html';

      } catch (err) {
        passwordErrorBox.textContent = err.message || 'Cannot change password.';
        passwordErrorBox.classList.remove('d-none');
      } finally {
        setPasswordLoading(false);
      }
    });
  })();