/* ====================================
   NGAWI RUSDI GARAGE - Application JS
   Sistem Manajemen Bengkel Motor
   ==================================== */

// ==================== STATE ====================
let currentPage = 'dashboard';
let currentFilter = 'semua';
let selectedOrderId = null;
let allServices = [];
let selectedServices = new Set();

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  loadServices();
  loadDashboard();
  updateClock();
  setInterval(updateClock, 1000);
});

function updateClock() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = now.toLocaleDateString('id-ID', options);
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  document.getElementById('headerTime').textContent = `${dateStr} | ${timeStr}`;
}

// ==================== NAVIGATION ====================
function navigateTo(page) {
  currentPage = page;
  
  // Update sidebar
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  
  // Update pages
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(`page-${page}`).classList.add('active');
  
  // Update title
  const titles = {
    dashboard: 'Dashboard',
    registrasi: 'Registrasi Kendaraan',
    antrian: 'Daftar Antrian',
    layanan: 'Layanan Kami',
    riwayat: 'Riwayat & Laporan'
  };
  document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';
  
  // Load page data
  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'antrian': loadWorkOrders(); break;
    case 'layanan': renderServicesPage(); break;
    case 'riwayat': loadHistory(); break;
  }
  
  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ==================== API HELPERS ====================
async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPost(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Terjadi kesalahan');
  }
  return res.json();
}

async function apiPatch(url, data) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Terjadi kesalahan');
  }
  return res.json();
}

async function apiDelete(url) {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ==================== FORMAT HELPERS ====================
function formatCurrency(amount) {
  return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getStatusBadge(status) {
  const statusMap = {
    antrian: { label: '⏳ Antrian', class: 'badge-antrian' },
    dikerjakan: { label: '🔧 Dikerjakan', class: 'badge-dikerjakan' },
    menunggu_part: { label: '📦 Menunggu Part', class: 'badge-menunggu_part' },
    selesai: { label: '✅ Selesai', class: 'badge-selesai' },
    diambil: { label: '🏠 Diambil', class: 'badge-diambil' }
  };
  const s = statusMap[status] || { label: status, class: '' };
  return `<span class="badge ${s.class}">${s.label}</span>`;
}

function getPaymentBadge(isPaid) {
  return isPaid
    ? '<span class="badge badge-paid">✅ Lunas</span>'
    : '<span class="badge badge-unpaid">❌ Belum Bayar</span>';
}

function getStatusLabel(status) {
  const map = {
    antrian: 'Antrian',
    dikerjakan: 'Sedang Dikerjakan',
    menunggu_part: 'Menunggu Part',
    selesai: 'Selesai',
    diambil: 'Sudah Diambil'
  };
  return map[status] || status;
}

// ==================== SERVICES ====================
async function loadServices() {
  try {
    allServices = await apiGet('/api/services');
    renderServiceSelect();
  } catch (err) {
    showToast('Gagal memuat data layanan', 'error');
  }
}

function renderServiceSelect() {
  const grid = document.getElementById('serviceSelectGrid');
  if (!grid) return;
  
  grid.innerHTML = allServices.map(service => `
    <label class="service-checkbox ${selectedServices.has(service.id) ? 'selected' : ''}" 
           onclick="toggleService(${service.id}, this)">
      <input type="checkbox" value="${service.id}" ${selectedServices.has(service.id) ? 'checked' : ''}>
      <span class="check-mark">✓</span>
      <div class="service-info">
        <h4>${service.icon} ${service.name}</h4>
        <p>${service.description}</p>
        <div class="service-meta">
          <span class="service-price">${formatCurrency(service.price)}</span>
          <span class="service-duration">⏱ ${service.duration_estimate}</span>
        </div>
      </div>
    </label>
  `).join('');
}

function toggleService(id, element) {
  if (selectedServices.has(id)) {
    selectedServices.delete(id);
    element.classList.remove('selected');
  } else {
    selectedServices.add(id);
    element.classList.add('selected');
  }
  updateEstimatedCost();
}

function updateEstimatedCost() {
  let total = 0;
  for (const id of selectedServices) {
    const svc = allServices.find(s => s.id === id);
    if (svc) total += svc.price;
  }
  document.getElementById('estimatedCost').textContent = formatCurrency(total);
}

function renderServicesPage() {
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = allServices.map(service => `
    <div class="service-card racing-stripe">
      <div class="card-icon">${service.icon}</div>
      <h3>${service.name}</h3>
      <p>${service.description}</p>
      <div class="card-footer">
        <div class="price">${formatCurrency(service.price)} <small>mulai dari</small></div>
        <div class="duration">⏱ ${service.duration_estimate}</div>
      </div>
    </div>
  `).join('');
}

// ==================== REGISTRATION ====================
async function submitRegistration(event) {
  event.preventDefault();
  
  if (selectedServices.size === 0) {
    showToast('Pilih minimal satu layanan!', 'warning');
    return;
  }
  
  const data = {
    customer_name: document.getElementById('customerName').value.trim(),
    customer_phone: document.getElementById('customerPhone').value.trim(),
    motorcycle_brand: document.getElementById('motorcycleBrand').value,
    motorcycle_type: document.getElementById('motorcycleType').value.trim(),
    plate_number: document.getElementById('plateNumber').value.trim().toUpperCase(),
    year: document.getElementById('motorcycleYear').value.trim(),
    color: document.getElementById('motorcycleColor').value.trim(),
    service_ids: Array.from(selectedServices),
    complaint: document.getElementById('complaint').value.trim(),
    mechanic_name: document.getElementById('mechanicName').value.trim()
  };
  
  try {
    await apiPost('/api/work-orders', data);
    showToast('🏁 Kendaraan berhasil didaftarkan!', 'success');
    resetForm();
    navigateTo('antrian');
  } catch (err) {
    showToast(err.message || 'Gagal mendaftarkan kendaraan', 'error');
  }
}

function resetForm() {
  document.getElementById('registrationForm').reset();
  selectedServices.clear();
  renderServiceSelect();
  updateEstimatedCost();
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
  try {
    const stats = await apiGet('/api/stats');
    
    document.getElementById('statActive').textContent = stats.activeOrders;
    document.getElementById('statAntrian').textContent = stats.statusCounts.antrian;
    document.getElementById('statCompleted').textContent = stats.completedToday;
    document.getElementById('statRevenue').textContent = formatCurrency(stats.todayRevenue);
    
    document.getElementById('countAntrian').textContent = stats.statusCounts.antrian;
    document.getElementById('countDikerjakan').textContent = stats.statusCounts.dikerjakan;
    document.getElementById('countPart').textContent = stats.statusCounts.menunggu_part;
    document.getElementById('countSelesai').textContent = stats.statusCounts.selesai;
    document.getElementById('countDiambil').textContent = stats.statusCounts.diambil;
    
    // Update nav badge
    document.getElementById('activeCount').textContent = stats.activeOrders;
    
    // Load recent active orders
    const orders = await apiGet('/api/work-orders?status=dikerjakan');
    const antrianOrders = await apiGet('/api/work-orders?status=antrian');
    const recentOrders = [...orders, ...antrianOrders].slice(0, 5);
    
    renderDashboardOrders(recentOrders);
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

function renderDashboardOrders(orders) {
  const container = document.getElementById('dashboardRecentOrders');
  
  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏍️</div>
        <h3>Belum Ada Kendaraan Aktif</h3>
        <p>Semua kendaraan sudah selesai dikerjakan. Mantap! 🏁</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Pelanggan</th>
          <th>Kendaraan</th>
          <th>Layanan</th>
          <th>Status</th>
          <th>Tanggal Masuk</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(order => `
          <tr>
            <td>
              <div class="customer-cell">
                <span class="name">${escapeHtml(order.customer_name)}</span>
                <span class="phone">${escapeHtml(order.customer_phone || '-')}</span>
              </div>
            </td>
            <td>
              <div class="vehicle-cell">
                <span class="type">${escapeHtml(order.motorcycle_brand)} ${escapeHtml(order.motorcycle_type)}</span>
                <span class="plate">${escapeHtml(order.plate_number || '-')}</span>
              </div>
            </td>
            <td style="font-size: 13px;">${(order.services || []).map(s => s.name).join(', ') || '-'}</td>
            <td>${getStatusBadge(order.status)}</td>
            <td style="font-size: 13px;">${formatDateShort(order.created_at)}</td>
            <td>
              <div class="table-actions">
                <button class="btn-icon" title="Update Status" onclick="openStatusModal('${order.id}')">🔄</button>
                <button class="btn-icon" title="Detail" onclick="openDetailModal('${order.id}')">👁️</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ==================== WORK ORDERS (ANTRIAN) ====================
async function loadWorkOrders() {
  try {
    const search = document.getElementById('searchInput')?.value || '';
    const url = `/api/work-orders?status=${currentFilter}&search=${encodeURIComponent(search)}`;
    const orders = await apiGet(url);
    renderWorkOrders(orders);
  } catch (err) {
    showToast('Gagal memuat data', 'error');
  }
}

function filterByStatus(status) {
  currentFilter = status;
  
  // Update filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.toLowerCase().includes(status === 'semua' ? 'semua' : getStatusLabel(status).toLowerCase().split(' ')[0])) {
      btn.classList.add('active');
    }
  });
  // Simpler: just set the correct one active
  const buttons = document.querySelectorAll('#filterButtons .filter-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  const statusIndex = { semua: 0, antrian: 1, dikerjakan: 2, menunggu_part: 3, selesai: 4, diambil: 5 };
  if (buttons[statusIndex[status]]) buttons[statusIndex[status]].classList.add('active');
  
  loadWorkOrders();
}

function renderWorkOrders(orders) {
  const container = document.getElementById('workOrdersTable');
  
  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>Tidak Ada Data</h3>
        <p>Tidak ada work order yang sesuai filter.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Pelanggan</th>
          <th>Kendaraan</th>
          <th>Layanan</th>
          <th>Status</th>
          <th>Pembayaran</th>
          <th>Total</th>
          <th>Tanggal</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(order => {
          const totalCost = (order.total_cost || 0) + (order.additional_cost || 0);
          return `
            <tr>
              <td>
                <div class="customer-cell">
                  <span class="name">${escapeHtml(order.customer_name)}</span>
                  <span class="phone">${escapeHtml(order.customer_phone || '-')}</span>
                </div>
              </td>
              <td>
                <div class="vehicle-cell">
                  <span class="type">${escapeHtml(order.motorcycle_brand)} ${escapeHtml(order.motorcycle_type)}</span>
                  <span class="plate">${escapeHtml(order.plate_number || '-')}</span>
                </div>
              </td>
              <td style="font-size: 12px; max-width: 180px;">${(order.services || []).map(s => s.icon + ' ' + s.name).join('<br>') || '-'}</td>
              <td>${getStatusBadge(order.status)}</td>
              <td>${getPaymentBadge(order.is_paid)}</td>
              <td style="font-weight: 700; color: var(--gold);">${formatCurrency(totalCost)}</td>
              <td style="font-size: 12px;">${formatDateShort(order.created_at)}</td>
              <td>
                <div class="table-actions">
                  <button class="btn-icon" title="Detail" onclick="openDetailModal('${order.id}')">👁️</button>
                  <button class="btn-icon" title="Update Status" onclick="openStatusModal('${order.id}')">🔄</button>
                  <button class="btn-icon" title="Biaya Tambahan" onclick="openCostModal('${order.id}')">💰</button>
                  ${!order.is_paid && (order.status === 'selesai' || order.status === 'diambil') 
                    ? `<button class="btn-icon" title="Bayar" onclick="openPaymentModal('${order.id}')" style="color: var(--success);">💳</button>` 
                    : ''}
                  ${order.is_paid 
                    ? `<button class="btn-icon" title="Lihat Struk" onclick="viewReceipt('${order.id}')" style="color: var(--gold);">🧾</button>` 
                    : ''}
                  ${order.status === 'diambil' || order.status === 'selesai'
                    ? `<button class="btn-icon" title="Hapus" onclick="openDeleteModal('${order.id}')" style="color: var(--danger);">🗑️</button>`
                    : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// ==================== HISTORY ====================
async function loadHistory() {
  try {
    const stats = await apiGet('/api/stats');
    document.getElementById('reportTotal').textContent = stats.totalOrders;
    document.getElementById('reportRevenue').textContent = formatCurrency(stats.totalRevenue);
    document.getElementById('reportPending').textContent = stats.pendingPayment;
    
    // Load completed & picked up orders
    const selesai = await apiGet('/api/work-orders?status=selesai');
    const diambil = await apiGet('/api/work-orders?status=diambil');
    const historyOrders = [...diambil, ...selesai];
    
    renderHistory(historyOrders);
  } catch (err) {
    console.error('History error:', err);
  }
}

function renderHistory(orders) {
  const container = document.getElementById('historyTable');
  
  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📜</div>
        <h3>Belum Ada Riwayat</h3>
        <p>Riwayat kendaraan yang sudah selesai akan muncul di sini.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Pelanggan</th>
          <th>Kendaraan</th>
          <th>Layanan</th>
          <th>Status</th>
          <th>Pembayaran</th>
          <th>Total</th>
          <th>Selesai</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(order => {
          const totalCost = (order.total_cost || 0) + (order.additional_cost || 0);
          return `
            <tr>
              <td>
                <div class="customer-cell">
                  <span class="name">${escapeHtml(order.customer_name)}</span>
                </div>
              </td>
              <td>
                <div class="vehicle-cell">
                  <span class="type">${escapeHtml(order.motorcycle_brand)} ${escapeHtml(order.motorcycle_type)}</span>
                  <span class="plate">${escapeHtml(order.plate_number || '-')}</span>
                </div>
              </td>
              <td style="font-size: 12px;">${(order.services || []).map(s => s.name).join(', ') || '-'}</td>
              <td>${getStatusBadge(order.status)}</td>
              <td>${getPaymentBadge(order.is_paid)}</td>
              <td style="font-weight: 700; color: var(--gold);">${formatCurrency(totalCost)}</td>
              <td style="font-size: 12px;">${formatDateShort(order.completed_at)}</td>
              <td>
                <div class="table-actions">
                  ${order.is_paid 
                    ? `<button class="btn-icon" title="Lihat Struk" onclick="viewReceipt('${order.id}')" style="color: var(--gold);">🧾</button>` 
                    : `<button class="btn-icon" title="Bayar" onclick="openPaymentModal('${order.id}')" style="color: var(--success);">💳</button>`}
                  <button class="btn-icon" title="Hapus" onclick="openDeleteModal('${order.id}')" style="color: var(--danger);">🗑️</button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// ==================== MODALS ====================
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.getElementById(id).classList.remove('printing');
}

// Status Modal
async function openStatusModal(orderId) {
  selectedOrderId = orderId;
  try {
    const order = await apiGet(`/api/work-orders/${orderId}`);
    
    document.getElementById('statusDetailGrid').innerHTML = `
      <div class="detail-item">
        <div class="detail-label">Pelanggan</div>
        <div class="detail-value">${escapeHtml(order.customer_name)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Kendaraan</div>
        <div class="detail-value">${escapeHtml(order.motorcycle_brand)} ${escapeHtml(order.motorcycle_type)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Plat Nomor</div>
        <div class="detail-value">${escapeHtml(order.plate_number || '-')}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Status Saat Ini</div>
        <div class="detail-value">${getStatusBadge(order.status)}</div>
      </div>
    `;
    
    document.getElementById('newStatus').value = order.status;
    document.getElementById('statusMechanic').value = order.mechanic_name || '';
    document.getElementById('statusNotes').value = order.notes || '';
    
    openModal('modalStatus');
  } catch (err) {
    showToast('Gagal memuat data order', 'error');
  }
}

async function updateStatus() {
  if (!selectedOrderId) return;
  
  const data = {
    status: document.getElementById('newStatus').value,
    mechanic_name: document.getElementById('statusMechanic').value,
    notes: document.getElementById('statusNotes').value
  };
  
  try {
    await apiPatch(`/api/work-orders/${selectedOrderId}/status`, data);
    showToast('✅ Status berhasil diperbarui!', 'success');
    closeModal('modalStatus');
    refreshCurrentPage();
  } catch (err) {
    showToast(err.message || 'Gagal mengupdate status', 'error');
  }
}

// Detail Modal
async function openDetailModal(orderId) {
  try {
    const order = await apiGet(`/api/work-orders/${orderId}`);
    const totalCost = (order.total_cost || 0) + (order.additional_cost || 0);
    
    document.getElementById('detailContent').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Pelanggan</div>
          <div class="detail-value">${escapeHtml(order.customer_name)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Telepon</div>
          <div class="detail-value">${escapeHtml(order.customer_phone || '-')}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Merk Motor</div>
          <div class="detail-value">${escapeHtml(order.motorcycle_brand)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Tipe Motor</div>
          <div class="detail-value">${escapeHtml(order.motorcycle_type)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">No. Plat</div>
          <div class="detail-value" style="font-family: 'Courier New', monospace; color: var(--gold);">${escapeHtml(order.plate_number || '-')}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Tahun</div>
          <div class="detail-value">${escapeHtml(order.year || '-')}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Warna</div>
          <div class="detail-value">${escapeHtml(order.color || '-')}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Tanggal Masuk</div>
          <div class="detail-value">${formatDate(order.created_at)}</div>
        </div>
      </div>

      <div class="checkered-divider"></div>

      <h4 style="margin-bottom: 12px; color: var(--text-secondary);">🔧 Layanan Dipilih</h4>
      <div style="margin-bottom: 16px;">
        ${(order.services || []).map(s => `
          <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: var(--bg-input); border-radius: 6px; margin-bottom: 6px;">
            <span>${s.icon} ${s.name}</span>
            <span style="color: var(--gold); font-weight: 700;">${formatCurrency(s.price)}</span>
          </div>
        `).join('')}
      </div>
      
      ${order.complaint ? `
        <div style="margin-bottom: 16px;">
          <h4 style="margin-bottom: 8px; color: var(--text-secondary);">📝 Keluhan</h4>
          <p style="background: var(--bg-input); padding: 12px; border-radius: 8px; font-size: 14px; line-height: 1.5;">${escapeHtml(order.complaint)}</p>
        </div>
      ` : ''}

      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Status</div>
          <div class="detail-value">${getStatusBadge(order.status)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Mekanik</div>
          <div class="detail-value">${escapeHtml(order.mechanic_name || 'Belum ditugaskan')}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Biaya Layanan</div>
          <div class="detail-value" style="color: var(--gold);">${formatCurrency(order.total_cost)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Biaya Tambahan</div>
          <div class="detail-value" style="color: var(--gold);">${formatCurrency(order.additional_cost)}</div>
        </div>
      </div>

      ${order.additional_notes ? `
        <div style="margin-top: 8px; margin-bottom: 16px;">
          <h4 style="margin-bottom: 6px; color: var(--text-secondary); font-size: 12px;">Keterangan Biaya Tambahan:</h4>
          <p style="background: var(--bg-input); padding: 10px; border-radius: 6px; font-size: 13px;">${escapeHtml(order.additional_notes)}</p>
        </div>
      ` : ''}

      ${order.notes ? `
        <div style="margin-top: 8px;">
          <h4 style="margin-bottom: 6px; color: var(--text-secondary); font-size: 12px;">Catatan Pengerjaan:</h4>
          <p style="background: var(--bg-input); padding: 10px; border-radius: 6px; font-size: 13px;">${escapeHtml(order.notes)}</p>
        </div>
      ` : ''}

      <div class="checkered-divider"></div>

      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-input); border-radius: 8px;">
        <div>
          <span style="color: var(--text-muted); font-size: 13px;">Total Biaya:</span>
          <span style="font-size: 20px; font-weight: 800; color: var(--gold); margin-left: 8px;">${formatCurrency(totalCost)}</span>
        </div>
        <div>${getPaymentBadge(order.is_paid)}</div>
      </div>
    `;
    
    openModal('modalDetail');
  } catch (err) {
    showToast('Gagal memuat detail order', 'error');
  }
}

// Cost Modal
async function openCostModal(orderId) {
  selectedOrderId = orderId;
  try {
    const order = await apiGet(`/api/work-orders/${orderId}`);
    document.getElementById('additionalCost').value = order.additional_cost || 0;
    document.getElementById('additionalNotes').value = order.additional_notes || '';
    openModal('modalCost');
  } catch (err) {
    showToast('Gagal memuat data', 'error');
  }
}

async function saveAdditionalCost() {
  if (!selectedOrderId) return;
  
  const data = {
    additional_cost: parseInt(document.getElementById('additionalCost').value) || 0,
    additional_notes: document.getElementById('additionalNotes').value
  };
  
  try {
    await apiPatch(`/api/work-orders/${selectedOrderId}/costs`, data);
    showToast('✅ Biaya tambahan berhasil disimpan!', 'success');
    closeModal('modalCost');
    refreshCurrentPage();
  } catch (err) {
    showToast('Gagal menyimpan biaya', 'error');
  }
}

// Payment Modal
async function openPaymentModal(orderId) {
  selectedOrderId = orderId;
  try {
    const order = await apiGet(`/api/work-orders/${orderId}`);
    const totalCost = (order.total_cost || 0) + (order.additional_cost || 0);
    
    document.getElementById('paymentDetails').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Pelanggan</div>
          <div class="detail-value">${escapeHtml(order.customer_name)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Kendaraan</div>
          <div class="detail-value">${escapeHtml(order.motorcycle_brand)} ${escapeHtml(order.motorcycle_type)}</div>
        </div>
      </div>
      <div style="margin-top: 16px; padding: 16px; background: var(--bg-input); border-radius: 8px; text-align: center;">
        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">Total Pembayaran</div>
        <div style="font-size: 28px; font-weight: 800; color: var(--gold);">${formatCurrency(totalCost)}</div>
      </div>
    `;
    
    document.getElementById('paymentMethod').value = 'cash';
    openModal('modalPayment');
  } catch (err) {
    showToast('Gagal memuat data pembayaran', 'error');
  }
}

async function processPayment() {
  if (!selectedOrderId) return;
  
  const data = {
    payment_method: document.getElementById('paymentMethod').value
  };
  
  try {
    const result = await apiPost(`/api/work-orders/${selectedOrderId}/pay`, data);
    showToast('✅ Pembayaran berhasil diproses!', 'success');
    closeModal('modalPayment');
    
    // Show receipt
    renderReceipt(result);
    openModal('modalReceipt');
    
    refreshCurrentPage();
  } catch (err) {
    showToast(err.message || 'Gagal memproses pembayaran', 'error');
  }
}

// Receipt
async function viewReceipt(orderId) {
  try {
    const result = await apiGet(`/api/work-orders/${orderId}/receipt`);
    renderReceipt(result);
    openModal('modalReceipt');
  } catch (err) {
    showToast('Struk tidak ditemukan', 'error');
  }
}

function renderReceipt(data) {
  const { receipt, order } = data;
  const totalCost = (order.total_cost || 0) + (order.additional_cost || 0);
  const paymentMethodLabels = {
    cash: 'Cash / Tunai',
    transfer: 'Transfer Bank',
    qris: 'QRIS',
    dana: 'Dana',
    gopay: 'GoPay',
    ovo: 'OVO'
  };
  
  document.getElementById('receiptContent').innerHTML = `
    <div class="receipt-container">
      <div class="receipt-header">
        <div class="receipt-logo">🏍️</div>
        <h2>Ngawi Rusdi Garage</h2>
        <div class="receipt-tagline">SPEED • POWER • TRUST</div>
        <div style="font-size: 11px; color: #888; margin-top: 4px;">Jl. Raya Ngawi No. 123, Ngawi, Jawa Timur</div>
        <div style="font-size: 11px; color: #888;">Telp: (0351) 123-4567</div>
        <hr class="receipt-divider" style="margin-top: 12px;">
        <div class="receipt-number">No: ${receipt.receipt_number}</div>
        <div class="receipt-date">${formatDate(receipt.created_at)}</div>
      </div>

      <div class="receipt-body">
        <div class="receipt-row label"><span>Pelanggan</span></div>
        <div class="receipt-row value"><span>${escapeHtml(order.customer_name)}</span></div>
        ${order.customer_phone ? `<div class="receipt-row" style="font-size: 12px; color: #888;"><span>Telp: ${escapeHtml(order.customer_phone)}</span></div>` : ''}
        
        <hr class="receipt-divider">
        
        <div class="receipt-row label"><span>Kendaraan</span></div>
        <div class="receipt-row value"><span>${escapeHtml(order.motorcycle_brand)} ${escapeHtml(order.motorcycle_type)}</span></div>
        ${order.plate_number ? `<div class="receipt-row" style="font-size: 12px; color: #888;"><span>Plat: ${escapeHtml(order.plate_number)}</span></div>` : ''}
        
        <hr class="receipt-divider">
        
        <div class="receipt-row label"><span>Layanan</span><span>Harga</span></div>
        <div class="receipt-services">
          ${(order.services || []).map(s => `
            <div class="receipt-service-item">
              <span class="service-name">${s.icon} ${s.name}</span>
              <span class="service-price">${formatCurrency(s.price)}</span>
            </div>
          `).join('')}
        </div>

        <div class="receipt-total">
          <div class="total-row">
            <span>Subtotal Layanan</span>
            <span>${formatCurrency(order.total_cost)}</span>
          </div>
          ${order.additional_cost > 0 ? `
            <div class="total-row">
              <span>Biaya Tambahan</span>
              <span>${formatCurrency(order.additional_cost)}</span>
            </div>
            ${order.additional_notes ? `<div style="font-size: 10px; color: #888; padding-left: 8px;">* ${escapeHtml(order.additional_notes)}</div>` : ''}
          ` : ''}
          <div class="total-row grand-total">
            <span>TOTAL</span>
            <span>${formatCurrency(totalCost)}</span>
          </div>
        </div>

        <hr class="receipt-divider">
        
        <div class="receipt-row label"><span>Metode Pembayaran</span></div>
        <div class="receipt-row value"><span>${paymentMethodLabels[receipt.payment_method] || receipt.payment_method}</span></div>
      </div>

      <div class="receipt-footer">
        <p>Garansi service berlaku 7 hari setelah pengambilan</p>
        <p>Barang yang tidak diambil dalam 30 hari bukan tanggung jawab kami</p>
        <div class="thank-you">★ Terima Kasih ★</div>
        <p style="margin-top: 8px; font-size: 10px;">Ngawi Rusdi Garage - Where Speed Meets Trust</p>
      </div>
    </div>
  `;
}

function printReceipt() {
  const modalEl = document.getElementById('modalReceipt');
  modalEl.classList.add('printing');
  window.print();
  setTimeout(() => modalEl.classList.remove('printing'), 500);
}

// Delete Modal
async function openDeleteModal(orderId) {
  selectedOrderId = orderId;
  try {
    const order = await apiGet(`/api/work-orders/${orderId}`);
    document.getElementById('deleteDetailGrid').innerHTML = `
      <div class="detail-item">
        <div class="detail-label">Pelanggan</div>
        <div class="detail-value">${escapeHtml(order.customer_name)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Kendaraan</div>
        <div class="detail-value">${escapeHtml(order.motorcycle_brand)} ${escapeHtml(order.motorcycle_type)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Plat</div>
        <div class="detail-value">${escapeHtml(order.plate_number || '-')}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Status</div>
        <div class="detail-value">${getStatusBadge(order.status)}</div>
      </div>
    `;
    openModal('modalDelete');
  } catch (err) {
    showToast('Gagal memuat data', 'error');
  }
}

async function confirmDelete() {
  if (!selectedOrderId) return;
  
  try {
    await apiDelete(`/api/work-orders/${selectedOrderId}`);
    showToast('🗑️ Work order berhasil dihapus', 'success');
    closeModal('modalDelete');
    refreshCurrentPage();
  } catch (err) {
    showToast('Gagal menghapus data', 'error');
  }
}

// ==================== REFRESH ====================
function refreshCurrentPage() {
  switch (currentPage) {
    case 'dashboard': loadDashboard(); break;
    case 'antrian': loadWorkOrders(); break;
    case 'riwayat': loadHistory(); break;
  }
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==================== UTILITIES ====================
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ==================== DEMO DATA SEEDER ====================
async function seedSampleMotorcycles() {
  const samples = [
    {
      customer_name: "Rizky Ramadhan",
      customer_phone: "08139876543",
      motorcycle_brand: "Yamaha",
      motorcycle_type: "Aerox 155 Connected",
      plate_number: "AE 7788 NK",
      year: "2024",
      color: "Cyber City Cyan",
      service_ids: [1, 7], // Service Ringan + Service CVT
      complaint: "Ganti oli sekalian gredek saat rpm bawah",
      mechanic_name: "Mas Rusdi"
    },
    {
      customer_name: "Dimas Anggara",
      customer_phone: "08571234990",
      motorcycle_brand: "Kawasaki",
      motorcycle_type: "Ninja ZX-25R",
      plate_number: "AE 2500 RR",
      year: "2023",
      color: "KRT Lime Green",
      service_ids: [2, 4], // Tune Up Besar + Service Injeksi
      complaint: "Persiapan balap sirkuit, kalibrasi ECU dan servis injektor",
      mechanic_name: "Pak Eko"
    },
    {
      customer_name: "Siti Rahmawati",
      customer_phone: "08215544332",
      motorcycle_brand: "Honda",
      motorcycle_type: "Vario 160 ABS",
      plate_number: "AE 6160 VR",
      year: "2023",
      color: "Matte Black",
      service_ids: [8, 3], // Ganti Kampas Rem + Ganti Ban
      complaint: "Rem belakang bunyi decit dan ban depan mulai gundul",
      mechanic_name: "Mas Rusdi"
    }
  ];

  try {
    for (const sample of samples) {
      await apiPost('/api/work-orders', sample);
    }
    showToast('🚀 3 data sample berhasil ditambahkan!', 'success');
    refreshCurrentPage();
  } catch (err) {
    showToast('Gagal menambahkan sample data: ' + err.message, 'error');
  }
}
