function authHeader() {
  const u = JSON.parse(localStorage.getItem("farm_user") || "null");
  return u && u.token ? { Authorization: "Bearer " + u.token } : {};
}

(function () {
  const user = JSON.parse(localStorage.getItem("farm_user") || "null");
  const userWelcome = document.getElementById("userWelcome");
  const btnLogout = document.getElementById("btnLogout");
  const loadingBox = document.getElementById("loadingBox");
  const loadError = document.getElementById("loadError");
  const tableBody = document.getElementById("tableBody");
  const searchInput = document.getElementById("searchInput");

  // New filter controls
  const filterRole = document.getElementById("filterRole");
  const filterContract = document.getElementById("filterContract");
  const minStdHours = document.getElementById("minStdHours");
  const maxStdHours = document.getElementById("maxStdHours");
  const minStdPay = document.getElementById("minStdPay");
  const maxStdPay = document.getElementById("maxStdPay");
  const minOvertime = document.getElementById("minOvertime");
  const maxOvertime = document.getElementById("maxOvertime");
  const btnClearFilters = document.getElementById("btnClearFilters");

  // Guard page
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Load list
  let staffData = [];
  async function fetchStaffs() {
    try {
      const res = await fetch(`${window.API_BASE}/Staffs/`, {
        method: "GET",
        headers: { ...authHeader() },
      });

      if (!res.ok) throw new Error(`Loading failed (HTTP ${res.status}).`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Response was not array.");
      staffData = data;
      renderTable(staffData);
      // apply current filters (if user typed before data loaded)
      applyFilters();
    } catch (err) {
      if (loadError) {
        loadError.textContent = err.message || "Cannot download data.";
        loadError.classList.remove("d-none");
      }
    } finally {
      if (loadingBox) loadingBox.classList.add("d-none");
    }
  }

  function renderTable(rows) {
    if (!tableBody) return;
    tableBody.innerHTML = rows
      .map(
        (r) => `
      <tr>
        <td>${safe(r.StaffId)}</td>
        <td>${safe(r.FirstName)}</td>
        <td>${safe(r.LastName)}</td> 
        <td>${safe(r.Email)}</td>
        <td>${safe(r.Phone)}</td>
        <td>${safe(r.Address)}</td>
        <td>${safe(r.ContractType)}</td>
        <td>${safe(r.Role)}</td>
        <td>${safe(r.StandardHoursPerWeek)}</td>
        <td>${safe(r.StandardPayRate)}</td>
        <td>${safe(r.OvertimePayRate)}</td>
        <td>
          <a href="edit-staff.html?id=${encodeURIComponent(r.StaffId)}" 
             class="text-primary text-decoration-none me-2">Edit</a>
          <span class="text-danger cursor-pointer btn-del" 
                style="cursor:pointer" 
                data-id="${safe(r.StaffId)}" 
                data-name="${safe(r.FirstName)} ${safe(r.LastName)}">
            Delete
          </span>
        </td>
      </tr>
    `
      )
      .join("");
  }

  function safe(val) {
    return (val ?? "") + "";
  }

  // Helpers for filters
  function toNum(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  function includesText(haystack, needle) {
    return (haystack || "")
      .toString()
      .toLowerCase()
      .includes((needle || "").toLowerCase());
  }

  // Apply combined filters
  function applyFilters() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    const role = (filterRole?.value || "").trim();
    const contract = (filterContract?.value || "").trim();

    const minH = toNum(minStdHours?.value);
    const maxH = toNum(maxStdHours?.value);
    const minP = toNum(minStdPay?.value);
    const maxP = toNum(maxStdPay?.value);
    const minO = toNum(minOvertime?.value);
    const maxO = toNum(maxOvertime?.value);

    const filtered = staffData.filter((s) => {
      // text search across common fields
      const textOk =
        !q ||
        [
          s.FirstName,
          s.LastName,
          s.Email,
          s.Phone,
          s.Address,
          s.ContractType,
          s.Role,
        ].some((x) => includesText(x, q));

      // select filters
      const roleOk = !role || s.Role === role;
      const contractOk = !contract || s.ContractType === contract;

      // numeric ranges (null/undefined treated as missing; must meet bounds if provided)
      const h = parseFloat(s.StandardHoursPerWeek ?? "");
      const p = parseFloat(s.StandardPayRate ?? "");
      const o = parseFloat(s.OvertimePayRate ?? "");

      const hoursOk =
        (minH == null || (Number.isFinite(h) && h >= minH)) &&
        (maxH == null || (Number.isFinite(h) && h <= maxH));

      const payOk =
        (minP == null || (Number.isFinite(p) && p >= minP)) &&
        (maxP == null || (Number.isFinite(p) && p <= maxP));

      const overtimeOk =
        (minO == null || (Number.isFinite(o) && o >= minO)) &&
        (maxO == null || (Number.isFinite(o) && o <= maxO));

      return textOk && roleOk && contractOk && hoursOk && payOk && overtimeOk;
    });

    renderTable(filtered);
  }

  // Wire events
  ["input", "change"].forEach((evt) => {
    if (searchInput) searchInput.addEventListener(evt, applyFilters);
    if (filterRole) filterRole.addEventListener(evt, applyFilters);
    if (filterContract) filterContract.addEventListener(evt, applyFilters);
    if (minStdHours) minStdHours.addEventListener(evt, applyFilters);
    if (maxStdHours) maxStdHours.addEventListener(evt, applyFilters);
    if (minStdPay) minStdPay.addEventListener(evt, applyFilters);
    if (maxStdPay) maxStdPay.addEventListener(evt, applyFilters);
    if (minOvertime) minOvertime.addEventListener(evt, applyFilters);
    if (maxOvertime) maxOvertime.addEventListener(evt, applyFilters);
  });

  if (btnClearFilters) {
    btnClearFilters.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (filterRole) filterRole.value = "";
      if (filterContract) filterContract.value = "";
      if (minStdHours) minStdHours.value = "";
      if (maxStdHours) maxStdHours.value = "";
      if (minStdPay) minStdPay.value = "";
      if (maxStdPay) maxStdPay.value = "";
      if (minOvertime) minOvertime.value = "";
      if (maxOvertime) maxOvertime.value = "";
      applyFilters();
    });
  }

  // Delete (event delegation)
  if (tableBody) {
    tableBody.addEventListener("click", async (e) => {
      const btn = e.target.closest(".btn-del");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const name = btn.getAttribute("data-name") || `#${id}`;
      if (!id) return;
      const ok = confirm(`Are you sure want to delete this staff ${name}?`);
      if (!ok) return;
      try {
        const res = await fetch(
          `${window.API_BASE}/Staffs/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
            headers: { ...authHeader() },
          }
        );

        if (!res.ok) throw new Error(`Failed to delete (HTTP ${res.status}).`);
        const json = await res.json(); // server returns deleted staff JSON
        alert(
          `Deleted: ${json.FirstName || ""} ${json.LastName || ""} (ID: ${
            json.StaffId
          })`
        );
        await fetchStaffs(); // refresh list
      } catch (err) {
        alert(err.message || "Cannot delete staff.");
      }
    });
  }

  fetchStaffs();
})();
