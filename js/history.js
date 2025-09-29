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

(function () {
  // Bảo vệ trang như các trang nội bộ khác
  const user = JSON.parse(localStorage.getItem('farm_user') || 'null');
  if (!user) { window.location.href = 'login.html'; return; }

  const tbody = document.getElementById('historyBody');
  const loading = document.getElementById('historyLoading');
  const errorBox = document.getElementById('historyError');
  const searchInput = document.getElementById('historySearch');

  let rows = [];

  function safe(v){ return (v ?? '') + ''; }

 function fmtTime(iso) {
  try {
    const d = new Date(iso + "Z"); // parse thành UTC chuẩn
    return new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Adelaide',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d);
  } catch {
    return iso;
  }
}


  function render(data) {
    tbody.innerHTML = data.map(h => {
      const id = h.HistoryId ?? h.historyId ?? '';
      return `
        <tr>
          <td>${safe(id)}</td>
          <td>${fmtTime(h.Timestamp ?? h.timestamp)}</td>
          <td>${safe(h.Actor ?? h.actor)}</td>
          <td>${safe(h.Ip ?? h.ip)}</td>
          <td>${safe(h.Action ?? h.action)}</td>
          <td>${safe(h.Result ?? h.result)}</td>
          <td>${safe(h.Details ?? h.details)}</td>
<td>
  <span class="text-danger cursor-pointer btn-del-history" 
        style="cursor:pointer" 
        data-id="${safe(id)}">
    Delete
  </span>
</td>

        </tr>
      `;
    }).join('');
  }

  async function load() {
    errorBox.classList.add('d-none'); errorBox.textContent = '';
    try {


 const res = await fetch(`${window.API_BASE}/Histories`, { 
   method: 'GET', headers: { ...authHeader() } 
 });


      if (!res.ok) {
        const errorMessage = await getErrorMessage(res);
        throw new Error(errorMessage);
      }
      let data = await res.json();
      if (!Array.isArray(data)) data = data ? [data] : [];
      // Mới nhất lên trước nếu có Timestamp
      data.sort((a,b) =>
        new Date(b.Timestamp || b.timestamp || 0) - new Date(a.Timestamp || a.timestamp || 0)
      );
      rows = data;
      render(rows);
    } catch (err) {
      errorBox.textContent = err.message || 'Failed to load history data from server.';
      errorBox.classList.remove('d-none');
    } finally {
      loading.classList.add('d-none');
    }
  }

  // Tìm kiếm client-side
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) { render(rows); return; }
      const filtered = rows.filter(h =>
        [
          h.HistoryId, h.Timestamp, h.Actor, h.Ip, h.Action, h.Result, h.Details,
          h.historyId, h.timestamp, h.actor, h.ip, h.action, h.result, h.details
        ].some(x => (x ?? '').toString().toLowerCase().includes(q))
      );
      render(filtered);
    });
  }

  // Xóa: event delegation trên tbody
  if (tbody) {
    tbody.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-del-history');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (!id) return;

      const ok = confirm(`Do you want to delete this history record #${id}?`);
      if (!ok) return;

      try {


 const res = await fetch(`${window.API_BASE}/Histories/${encodeURIComponent(id)}`, {
  method: 'DELETE', headers: { ...authHeader() }
 });


        if (!res.ok) {
          const errorMessage = await getErrorMessage(res);
          throw new Error(errorMessage);
        }
        // Nếu backend trả JSON object của bản ghi đã xóa, bạn có thể đọc để alert chi tiết:
        // const deleted = await res.json();
        // alert(\`Đã xóa: #\${deleted.HistoryId || deleted.historyId}\`);
        // Đơn giản: chỉ thông báo chung và load lại
        alert('Deleted history record.');
        await load(); // load lại danh sách
      } catch (err) {
        alert(err.message || 'Cannot delete history record.');
      }
    });
  }

  load();
})();
