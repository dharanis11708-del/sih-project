/**
 * Smart Parking Management System - Application Controller
 * Handles UI interactions, page navigation, forms, tables, and modal workflows.
 */

const App = {
  currentPage: 'dashboard',
  selectedAreaSlotTab: 'ALL',
  parkedSearchQuery: '',
  parkedTypeFilter: 'ALL',
  parkedAreaFilter: 'ALL',
  parkedSortBy: 'newest',

  init() {
    this.initTheme();
    this.bindEvents();
    this.populateAreaDropdowns();
    this.navigateTo('dashboard');
    this.startClock();
  },

  // --------------------------------------------------------------------------
  // Theme Toggle (Light / Dark Mode)
  // --------------------------------------------------------------------------
  initTheme() {
    const savedTheme = localStorage.getItem('spms_theme') || 'light';
    this.setTheme(savedTheme);
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('spms_theme', theme);

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.innerHTML = theme === 'dark' 
        ? '<i class="fa-solid fa-sun"></i>' 
        : '<i class="fa-solid fa-moon"></i>';
      toggleBtn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }

    if (window.ParkingCharts) {
      ParkingCharts.refreshAll();
    }
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    this.setTheme(current === 'dark' ? 'light' : 'dark');
  },

  // --------------------------------------------------------------------------
  // Real-Time Topbar Clock
  // --------------------------------------------------------------------------
  startClock() {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const clockEl = document.getElementById('topbar-clock');
      if (clockEl) {
        clockEl.innerText = `${dateStr} | ${timeStr}`;
      }

      // Also update entry page live timestamp
      const entryTimeEl = document.getElementById('entry-live-time');
      if (entryTimeEl) {
        entryTimeEl.value = `${dateStr} ${timeStr}`;
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  },

  // --------------------------------------------------------------------------
  // Event Bindings
  // --------------------------------------------------------------------------
  bindEvents() {
    // Sidebar nav links
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.getAttribute('data-page');
        if (page) {
          this.navigateTo(page);
          this.closeMobileSidebar();
        }
      });
    });

    // Mobile sidebar toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => this.toggleMobileSidebar());
    }
    if (backdrop) {
      backdrop.addEventListener('click', () => this.closeMobileSidebar());
    }

    // Theme button
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Vehicle Entry Form
    const entryForm = document.getElementById('vehicle-entry-form');
    if (entryForm) {
      entryForm.addEventListener('submit', (e) => this.handleVehicleEntry(e));
    }

    // Vehicle Type change (update rate preview)
    const vTypeSelect = document.getElementById('entry-vehicle-type');
    if (vTypeSelect) {
      vTypeSelect.addEventListener('change', () => this.updateEntryRatePreview());
    }

    // Area change in Entry form (update slot preview)
    const entryAreaSelect = document.getElementById('entry-area-select');
    if (entryAreaSelect) {
      entryAreaSelect.addEventListener('change', () => this.updateEntrySlotPreview());
    }

    // Vehicle Exit Lookup
    const exitInput = document.getElementById('exit-vehicle-input');
    if (exitInput) {
      exitInput.addEventListener('input', () => this.handleExitLookup(exitInput.value));
    }

    const exitForm = document.getElementById('vehicle-exit-form');
    if (exitForm) {
      exitForm.addEventListener('submit', (e) => this.handleVehicleExit(e));
    }

    // Parked Vehicles search & filters
    const searchInput = document.getElementById('parked-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.parkedSearchQuery = e.target.value;
        this.renderParkedTable();
      });
    }

    const typeFilter = document.getElementById('parked-type-filter');
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        this.parkedTypeFilter = e.target.value;
        this.renderParkedTable();
      });
    }

    const areaFilter = document.getElementById('parked-area-filter');
    if (areaFilter) {
      areaFilter.addEventListener('change', (e) => {
        this.parkedAreaFilter = e.target.value;
        this.renderParkedTable();
      });
    }

    const sortFilter = document.getElementById('parked-sort-filter');
    if (sortFilter) {
      sortFilter.addEventListener('change', (e) => {
        this.parkedSortBy = e.target.value;
        this.renderParkedTable();
      });
    }

    // Add Area Form
    const addAreaForm = document.getElementById('add-area-form');
    if (addAreaForm) {
      addAreaForm.addEventListener('submit', (e) => this.handleAddArea(e));
    }
  },

  // --------------------------------------------------------------------------
  // Navigation Router (8 Pages)
  // --------------------------------------------------------------------------
  navigateTo(pageId) {
    this.currentPage = pageId;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.getAttribute('data-page') === pageId);
    });

    // Update page title
    const titles = {
      dashboard: { title: 'Dashboard & Live Monitor', desc: 'Real-time parking overview, capacity tracking & metrics' },
      entry: { title: 'New Vehicle Entry', desc: 'Check-in vehicle, auto-allocate slot & issue entry slip' },
      exit: { title: 'Vehicle Exit & Fee Settlement', desc: 'Process vehicle check-out, duration calculation & receipt' },
      parked: { title: 'Currently Parked Vehicles', desc: 'Live directory of all vehicles currently parked on campus' },
      slots: { title: 'Parking Slots Layout', desc: 'Visual interactive grid map of slots per area with live status' },
      areas: { title: 'Parking Areas Management', desc: 'Configure parking zones, locations, capacities and slot allocations' },
      reports: { title: 'Audit & Analytical Reports', desc: 'Historical parking logs, fee collection records & CSV data exports' },
      analytics: { title: 'Parking Usage Analytics', desc: 'Deep analytics on peak occupancy, vehicle categories & revenue trends' },
    };

    const info = titles[pageId] || { title: 'Smart Parking System', desc: '' };
    const titleEl = document.getElementById('current-page-title');
    const descEl = document.getElementById('current-page-desc');
    if (titleEl) titleEl.innerText = info.title;
    if (descEl) descEl.innerText = info.desc;

    // Show selected section, hide others
    document.querySelectorAll('.page-section').forEach((sec) => {
      sec.classList.remove('active');
    });

    const activeSec = document.getElementById(`section-${pageId}`);
    if (activeSec) {
      activeSec.classList.add('active');
    }

    // Page-specific initialization routines
    switch (pageId) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'entry':
        this.initEntryPage();
        break;
      case 'exit':
        this.initExitPage();
        break;
      case 'parked':
        this.renderParkedTable();
        break;
      case 'slots':
        this.renderSlotsPage();
        break;
      case 'areas':
        this.renderAreasPage();
        break;
      case 'reports':
        this.renderReportsPage();
        break;
      case 'analytics':
        this.renderAnalyticsPage();
        break;
    }
  },

  toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('active');
  },

  closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  },

  // --------------------------------------------------------------------------
  // Page 1: Dashboard
  // --------------------------------------------------------------------------
  renderDashboard() {
    const stats = ParkingAPI.getSummaryStats();

    // Update Metric Cards
    const elTotal = document.getElementById('metric-total-slots');
    const elOccupied = document.getElementById('metric-occupied-slots');
    const elAvailable = document.getElementById('metric-available-slots');
    const elRevenue = document.getElementById('metric-today-revenue');
    const elOccRate = document.getElementById('metric-occupancy-rate');

    if (elTotal) elTotal.innerText = stats.totalSlots;
    if (elOccupied) elOccupied.innerText = stats.occupiedSlots;
    if (elAvailable) elAvailable.innerText = stats.availableSlots;
    if (elRevenue) elRevenue.innerText = `₹${stats.todayRevenue.toLocaleString('en-IN')}`;
    if (elOccRate) elOccRate.innerText = `${stats.occupancyRate}%`;

    // Render Recent Entries Table
    const recentTableBody = document.getElementById('dashboard-recent-table');
    if (recentTableBody) {
      const parked = ParkingAPI.getParkedVehicles().slice(0, 7);
      if (parked.length === 0) {
        recentTableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 24px; color: var(--text-muted);">No parked vehicles currently.</td></tr>`;
      } else {
        recentTableBody.innerHTML = parked
          .map((v) => {
            const entryTime = new Date(v.entryTime);
            const timeAgo = this.formatTimeAgo(entryTime);
            return `
              <tr>
                <td><strong>${v.vehicleNo}</strong></td>
                <td><span class="badge badge-${v.vehicleType.toLowerCase()}">${v.vehicleType}</span></td>
                <td><span class="badge badge-occupied">${v.slotNumber}</span></td>
                <td>${v.areaName.split('(')[0]}</td>
                <td>${timeAgo}</td>
                <td style="text-align: right;">
                  <button class="btn btn-danger btn-sm" onclick="App.quickExit('${v.vehicleNo}')">
                    <i class="fa-solid fa-right-from-bracket"></i> Exit
                  </button>
                </td>
              </tr>
            `;
          })
          .join('');
      }
    }

    // Render Area Chart
    if (window.ParkingCharts) {
      ParkingCharts.renderDashboardAreaChart();
    }
  },

  // --------------------------------------------------------------------------
  // Page 2: Vehicle Entry
  // --------------------------------------------------------------------------
  initEntryPage() {
    this.populateAreaDropdowns();
    this.updateEntryRatePreview();
    this.updateEntrySlotPreview();
  },

  populateAreaDropdowns() {
    const areas = ParkingAPI.getAreas();
    const selects = ['entry-area-select', 'parked-area-filter'];

    selects.forEach((selectId) => {
      const sel = document.getElementById(selectId);
      if (!sel) return;

      const currentValue = sel.value;
      let html = selectId === 'parked-area-filter' ? `<option value="ALL">All Parking Areas</option>` : `<option value="AUTO">✨ Automatic Best Allocation</option>`;
      
      areas.forEach((area) => {
        html += `<option value="${area.id}">${area.name}</option>`;
      });
      sel.innerHTML = html;

      if (currentValue) sel.value = currentValue;
    });
  },

  updateEntryRatePreview() {
    const type = document.getElementById('entry-vehicle-type')?.value || 'Car';
    const rate = ParkingAPI.RATES[type] || 20;
    const badge = document.getElementById('entry-rate-preview');
    if (badge) {
      badge.innerHTML = `<i class="fa-solid fa-indian-rupee-sign"></i> ₹${rate} / Hour (Min 1 hr)`;
    }
  },

  updateEntrySlotPreview() {
    const areaId = document.getElementById('entry-area-select')?.value;
    const slots = ParkingAPI.getSlots();
    let candidates = slots.filter((s) => !s.isOccupied);
    if (areaId && areaId !== 'AUTO') {
      candidates = candidates.filter((s) => s.areaId === areaId);
    }

    const previewEl = document.getElementById('entry-slot-preview-box');
    if (previewEl) {
      if (candidates.length > 0) {
        const nextSlot = candidates[0];
        previewEl.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">Suggested Slot:</span>
              <div style="font-size: 1.25rem; font-weight: 800; color: var(--status-available);">${nextSlot.slotNumber}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${nextSlot.areaName}</div>
            </div>
            <span class="badge badge-available"><i class="fa-solid fa-check"></i> Slot Ready</span>
          </div>
        `;
      } else {
        previewEl.innerHTML = `
          <div style="color: var(--status-occupied); font-weight: 700; font-size: 0.85rem;">
            <i class="fa-solid fa-triangle-exclamation"></i> No slots available in selected area!
          </div>
        `;
      }
    }
  },

  handleVehicleEntry(e) {
    e.preventDefault();

    const vehicleNo = document.getElementById('entry-vehicle-no').value;
    const vehicleType = document.getElementById('entry-vehicle-type').value;
    const ownerName = document.getElementById('entry-owner-name').value;
    const contactNumber = document.getElementById('entry-contact-no').value;
    const areaId = document.getElementById('entry-area-select').value;

    const result = ParkingAPI.parkVehicle({
      vehicleNo,
      vehicleType,
      ownerName,
      contactNumber,
      areaId,
    });

    if (!result.success) {
      this.showToast(result.message, 'error');
      return;
    }

    this.showToast(result.message, 'success');

    // Show printable entry pass modal
    this.showEntrySlipModal(result.ticket);

    // Reset form
    document.getElementById('vehicle-entry-form').reset();
    this.updateEntryRatePreview();
    this.updateEntrySlotPreview();
  },

  showEntrySlipModal(ticket) {
    const modal = document.getElementById('entry-slip-modal');
    if (!modal) return;

    document.getElementById('slip-ticket-id').innerText = ticket.ticketId;
    document.getElementById('slip-vehicle-no').innerText = ticket.vehicleNo;
    document.getElementById('slip-vehicle-type').innerText = ticket.vehicleType;
    document.getElementById('slip-owner-name').innerText = ticket.ownerName;
    document.getElementById('slip-contact').innerText = ticket.contactNumber;
    document.getElementById('slip-slot-no').innerText = ticket.slotNumber;
    document.getElementById('slip-area-name').innerText = ticket.areaName;
    document.getElementById('slip-entry-time').innerText = new Date(ticket.entryTime).toLocaleString('en-IN');
    document.getElementById('slip-rate').innerText = `₹${ticket.ratePerHour}/hr`;

    modal.classList.add('active');
  },

  // --------------------------------------------------------------------------
  // Page 3: Vehicle Exit & Settlement
  // --------------------------------------------------------------------------
  initExitPage(prefilledVehicleNo = '') {
    const input = document.getElementById('exit-vehicle-input');
    if (input) {
      input.value = prefilledVehicleNo;
      this.handleExitLookup(prefilledVehicleNo);
    }
  },

  handleExitLookup(vehicleNo) {
    const card = document.getElementById('exit-calc-card');
    const notFound = document.getElementById('exit-not-found-msg');
    const btnSubmit = document.getElementById('btn-process-exit');

    if (!vehicleNo || vehicleNo.trim().length < 4) {
      if (card) card.style.display = 'none';
      if (notFound) notFound.style.display = 'none';
      if (btnSubmit) btnSubmit.disabled = true;
      return;
    }

    const calc = ParkingAPI.calculateExitFee(vehicleNo);
    if (!calc.success) {
      if (card) card.style.display = 'none';
      if (notFound) {
        notFound.innerText = calc.message;
        notFound.style.display = 'block';
      }
      if (btnSubmit) btnSubmit.disabled = true;
      return;
    }

    if (notFound) notFound.style.display = 'none';
    if (btnSubmit) btnSubmit.disabled = false;

    if (card) {
      card.style.display = 'block';
      document.getElementById('exit-calc-vehicle-no').innerText = calc.vehicle.vehicleNo;
      document.getElementById('exit-calc-type').innerText = calc.vehicle.vehicleType;
      document.getElementById('exit-calc-slot').innerText = calc.vehicle.slotNumber;
      document.getElementById('exit-calc-owner').innerText = calc.vehicle.ownerName;
      document.getElementById('exit-calc-entry').innerText = new Date(calc.entryTime).toLocaleString('en-IN');
      document.getElementById('exit-calc-exit').innerText = new Date(calc.exitTime).toLocaleString('en-IN');
      document.getElementById('exit-calc-duration').innerText = `${calc.durationFormatted} (${calc.billedHours} hr billed)`;
      document.getElementById('exit-calc-rate').innerText = `₹${calc.ratePerHour}/hr`;
      document.getElementById('exit-calc-total').innerText = `₹${calc.totalFee}`;
    }
  },

  handleVehicleExit(e) {
    e.preventDefault();
    const vehicleNo = document.getElementById('exit-vehicle-input').value;
    const paymentMethod = document.getElementById('exit-payment-method').value;

    const result = ParkingAPI.processExit({ vehicleNo, paymentMethod });
    if (!result.success) {
      this.showToast(result.message, 'error');
      return;
    }

    this.showToast(result.message, 'success');
    this.showReceiptModal(result.receipt);

    // Reset exit inputs
    document.getElementById('exit-vehicle-input').value = '';
    this.handleExitLookup('');
  },

  showReceiptModal(receipt) {
    const modal = document.getElementById('receipt-modal');
    if (!modal) return;

    document.getElementById('rec-ticket-id').innerText = receipt.ticketId;
    document.getElementById('rec-vehicle-no').innerText = receipt.vehicleNo;
    document.getElementById('rec-vehicle-type').innerText = receipt.vehicleType;
    document.getElementById('rec-owner').innerText = receipt.ownerName;
    document.getElementById('rec-slot').innerText = receipt.slotNumber;
    document.getElementById('rec-area').innerText = receipt.areaName;
    document.getElementById('rec-entry').innerText = new Date(receipt.entryTime).toLocaleString('en-IN');
    document.getElementById('rec-exit').innerText = new Date(receipt.exitTime).toLocaleString('en-IN');
    document.getElementById('rec-duration').innerText = `${receipt.durationFormatted} (${receipt.billedHours}h billed)`;
    document.getElementById('rec-rate').innerText = `₹${receipt.ratePerHour}/hr`;
    document.getElementById('rec-payment').innerText = receipt.paymentMethod;
    document.getElementById('rec-total').innerText = `₹${receipt.totalFee}`;

    modal.classList.add('active');
  },

  quickExit(vehicleNo) {
    this.navigateTo('exit');
    this.initExitPage(vehicleNo);
  },

  // --------------------------------------------------------------------------
  // Page 4: Currently Parked Vehicles
  // --------------------------------------------------------------------------
  renderParkedTable() {
    const tbody = document.getElementById('parked-vehicles-tbody');
    if (!tbody) return;

    let parked = ParkingAPI.getParkedVehicles();

    // 1. Filter by Search Query
    if (this.parkedSearchQuery) {
      const q = this.parkedSearchQuery.toLowerCase();
      parked = parked.filter(
        (v) =>
          v.vehicleNo.toLowerCase().includes(q) ||
          v.ownerName.toLowerCase().includes(q) ||
          v.slotNumber.toLowerCase().includes(q) ||
          v.contactNumber.includes(q)
      );
    }

    // 2. Filter by Vehicle Type
    if (this.parkedTypeFilter !== 'ALL') {
      parked = parked.filter((v) => v.vehicleType === this.parkedTypeFilter);
    }

    // 3. Filter by Area
    if (this.parkedAreaFilter !== 'ALL') {
      parked = parked.filter((v) => v.areaId === this.parkedAreaFilter);
    }

    // 4. Sort
    parked.sort((a, b) => {
      if (this.parkedSortBy === 'newest') return new Date(b.entryTime) - new Date(a.entryTime);
      if (this.parkedSortBy === 'oldest') return new Date(a.entryTime) - new Date(b.entryTime);
      if (this.parkedSortBy === 'slot') return a.slotNumber.localeCompare(b.slotNumber);
      return 0;
    });

    const countEl = document.getElementById('parked-count-badge');
    if (countEl) countEl.innerText = `${parked.length} Parked`;

    if (parked.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 28px; color: var(--text-muted);">No parked vehicles match the selected criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = parked
      .map((v) => {
        const entryTime = new Date(v.entryTime);
        const timeAgo = this.formatTimeAgo(entryTime);
        const fullTime = entryTime.toLocaleString('en-IN');

        return `
          <tr>
            <td><strong style="color: var(--brand-primary);">${v.vehicleNo}</strong></td>
            <td><span class="badge badge-${v.vehicleType.toLowerCase()}">${v.vehicleType}</span></td>
            <td>${v.ownerName}<br><span style="font-size: 0.72rem; color: var(--text-muted);">${v.contactNumber}</span></td>
            <td><span class="badge badge-occupied">${v.slotNumber}</span></td>
            <td>${v.areaName.split('(')[0]}</td>
            <td>${fullTime}</td>
            <td><span style="font-weight: 600; color: var(--text-secondary);">${timeAgo}</span></td>
            <td style="text-align: right;">
              <button class="btn btn-danger btn-sm" onclick="App.quickExit('${v.vehicleNo}')">
                <i class="fa-solid fa-right-from-bracket"></i> Check Out
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  },

  // --------------------------------------------------------------------------
  // Page 5: Parking Slots Visualization
  // --------------------------------------------------------------------------
  renderSlotsPage() {
    this.renderSlotAreaTabs();
    this.renderSlotGrid();
  },

  renderSlotAreaTabs() {
    const container = document.getElementById('slots-area-tabs');
    if (!container) return;

    const areas = ParkingAPI.getAreas();
    let html = `<button class="area-tab-btn ${this.selectedAreaSlotTab === 'ALL' ? 'active' : ''}" onclick="App.selectSlotArea('ALL')">All Areas (${ParkingAPI.getSlots().length})</button>`;

    areas.forEach((area) => {
      const areaSlots = ParkingAPI.getSlots(area.id);
      const occupied = areaSlots.filter((s) => s.isOccupied).length;
      html += `
        <button class="area-tab-btn ${this.selectedAreaSlotTab === area.id ? 'active' : ''}" onclick="App.selectSlotArea('${area.id}')">
          ${area.name.split('(')[0]} (${occupied}/${areaSlots.length})
        </button>
      `;
    });

    container.innerHTML = html;
  },

  selectSlotArea(areaId) {
    this.selectedAreaSlotTab = areaId;
    this.renderSlotAreaTabs();
    this.renderSlotGrid();
  },

  renderSlotGrid() {
    const grid = document.getElementById('slots-display-grid');
    if (!grid) return;

    const slots = ParkingAPI.getSlots(this.selectedAreaSlotTab);
    const parked = ParkingAPI.getParkedVehicles();

    grid.innerHTML = slots
      .map((slot) => {
        const vehicle = slot.isOccupied ? parked.find((p) => p.slotNumber === slot.slotNumber) : null;
        const iconClass = slot.isOccupied ? 'fa-solid fa-car-side' : 'fa-solid fa-square-parking';
        const statusClass = slot.isOccupied ? 'occupied' : 'available';

        let tooltipHtml = '';
        if (slot.isOccupied && vehicle) {
          const duration = this.formatTimeAgo(new Date(vehicle.entryTime));
          tooltipHtml = `
            <div class="slot-tooltip">
              <strong style="color: #ef4444;"><i class="fa-solid fa-ban"></i> OCCUPIED</strong><br>
              <strong>Vehicle:</strong> ${vehicle.vehicleNo} (${vehicle.vehicleType})<br>
              <strong>Owner:</strong> ${vehicle.ownerName}<br>
              <strong>Contact:</strong> ${vehicle.contactNumber}<br>
              <strong>Parked:</strong> ${duration}<br>
              <span style="color: #38bdf8; font-size: 0.7rem; margin-top: 4px; display: inline-block;">Click to Exit Vehicle</span>
            </div>
          `;
        } else {
          tooltipHtml = `
            <div class="slot-tooltip">
              <strong style="color: #10b981;"><i class="fa-solid fa-circle-check"></i> AVAILABLE</strong><br>
              <strong>Designated:</strong> ${slot.slotType}<br>
              <strong>Area:</strong> ${slot.areaName}<br>
              <span style="color: #38bdf8; font-size: 0.7rem; margin-top: 4px; display: inline-block;">Click to Park Here</span>
            </div>
          `;
        }

        const clickAction = slot.isOccupied && vehicle 
          ? `App.quickExit('${vehicle.vehicleNo}')` 
          : `App.quickParkInSlot('${slot.areaId}', '${slot.slotNumber}')`;

        return `
          <div class="slot-card ${statusClass}" onclick="${clickAction}">
            ${tooltipHtml}
            <i class="${iconClass} slot-icon"></i>
            <span class="slot-number">${slot.slotNumber}</span>
            <span class="slot-badge-type">${slot.slotType}</span>
          </div>
        `;
      })
      .join('');
  },

  quickParkInSlot(areaId, slotNumber) {
    this.navigateTo('entry');
    const areaSelect = document.getElementById('entry-area-select');
    if (areaSelect) {
      areaSelect.value = areaId;
      this.updateEntrySlotPreview();
    }
    this.showToast(`Selected ${slotNumber}. Enter vehicle details to allocate.`, 'info');
  },

  // --------------------------------------------------------------------------
  // Page 6: Parking Areas Management
  // --------------------------------------------------------------------------
  renderAreasPage() {
    const container = document.getElementById('areas-card-grid');
    if (!container) return;

    const areas = ParkingAPI.getAreas();
    const slots = ParkingAPI.getSlots();

    container.innerHTML = areas
      .map((area) => {
        const areaSlots = slots.filter((s) => s.areaId === area.id);
        const occupied = areaSlots.filter((s) => s.isOccupied).length;
        const available = areaSlots.length - occupied;
        const percentage = areaSlots.length ? Math.round((occupied / areaSlots.length) * 100) : 0;

        let barColor = '#10b981';
        if (percentage >= 80) barColor = '#ef4444';
        else if (percentage >= 50) barColor = '#f59e0b';

        return `
          <div class="card" style="margin-bottom: 0;">
            <div class="card-header" style="margin-bottom: 12px; padding-bottom: 10px;">
              <div>
                <span class="badge badge-car" style="margin-bottom: 4px;">${area.id}</span>
                <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary);">${area.name}</h3>
                <p style="font-size: 0.75rem; color: var(--text-muted);">${area.location}</p>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 8px;">
              <span>Occupancy: <strong>${occupied} / ${areaSlots.length}</strong></span>
              <span style="font-weight: 700; color: ${barColor};">${percentage}%</span>
            </div>

            <!-- Progress bar -->
            <div style="width: 100%; height: 8px; background-color: var(--border-color); border-radius: var(--radius-full); overflow: hidden; margin-bottom: 16px;">
              <div style="width: ${percentage}%; height: 100%; background-color: ${barColor}; transition: width 0.3s ease;"></div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8rem; margin-bottom: 16px;">
              <div style="background-color: var(--status-available-bg); padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--status-available-border);">
                <div style="font-size: 0.7rem; color: var(--status-available); font-weight: 700;">AVAILABLE</div>
                <div style="font-size: 1.2rem; font-weight: 800; color: var(--status-available);">${available}</div>
              </div>
              <div style="background-color: var(--status-occupied-bg); padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--status-occupied-border);">
                <div style="font-size: 0.7rem; color: var(--status-occupied); font-weight: 700;">OCCUPIED</div>
                <div style="font-size: 1.2rem; font-weight: 800; color: var(--status-occupied);">${occupied}</div>
              </div>
            </div>

            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="App.navigateTo('slots'); App.selectSlotArea('${area.id}');">
                <i class="fa-solid fa-grid-2"></i> View Slots
              </button>
            </div>
          </div>
        `;
      })
      .join('');
  },

  handleAddArea(e) {
    e.preventDefault();
    const id = document.getElementById('new-area-id').value;
    const name = document.getElementById('new-area-name').value;
    const location = document.getElementById('new-area-location').value;
    const capacity = document.getElementById('new-area-capacity').value;

    const result = ParkingAPI.addArea({ id, name, location, capacity });
    if (!result.success) {
      this.showToast(result.message, 'error');
      return;
    }

    this.showToast(result.message, 'success');
    this.closeModal('add-area-modal');
    document.getElementById('add-area-form').reset();
    this.populateAreaDropdowns();
    this.renderAreasPage();
  },

  // --------------------------------------------------------------------------
  // Page 7: Reports
  // --------------------------------------------------------------------------
  renderReportsPage() {
    const history = ParkingAPI.getHistory();
    const tbody = document.getElementById('reports-history-tbody');
    if (!tbody) return;

    if (history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 24px; color: var(--text-muted);">No history records available.</td></tr>`;
      return;
    }

    // Render first 50 entries
    tbody.innerHTML = history
      .slice(0, 50)
      .map((h) => {
        const exitDate = new Date(h.exitTime).toLocaleString('en-IN');
        return `
          <tr>
            <td><span style="font-family: monospace; font-size: 0.75rem; color: var(--text-muted);">${h.ticketId}</span></td>
            <td><strong>${h.vehicleNo}</strong></td>
            <td><span class="badge badge-${h.vehicleType.toLowerCase()}">${h.vehicleType}</span></td>
            <td>${h.slotNumber}</td>
            <td>${exitDate}</td>
            <td>${h.billedHours} hr</td>
            <td><strong style="color: var(--status-available);">₹${h.totalFee}</strong></td>
            <td><span class="badge badge-car">${h.paymentMethod}</span></td>
          </tr>
        `;
      })
      .join('');

    // Summary calculations
    const totalCollected = history.reduce((acc, curr) => acc + (curr.totalFee || 0), 0);
    const elTotalRev = document.getElementById('report-total-revenue');
    const elTotalVehicles = document.getElementById('report-total-vehicles');
    if (elTotalRev) elTotalRev.innerText = `₹${totalCollected.toLocaleString('en-IN')}`;
    if (elTotalVehicles) elTotalVehicles.innerText = history.length;
  },

  // --------------------------------------------------------------------------
  // Page 8: Analytics
  // --------------------------------------------------------------------------
  renderAnalyticsPage() {
    if (window.ParkingCharts) {
      ParkingCharts.renderVehicleCategoryChart();
      ParkingCharts.renderPeakHoursChart();
      ParkingCharts.renderDailyRevenueChart();
      ParkingCharts.renderHeatmap();
    }
  },

  // --------------------------------------------------------------------------
  // CSV Exports
  // --------------------------------------------------------------------------
  exportReport(type) {
    ParkingAPI.exportCSV(type);
    this.showToast('CSV export downloaded successfully!', 'success');
  },

  // --------------------------------------------------------------------------
  // Helper: Modals & Toasts
  // --------------------------------------------------------------------------
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  printReceipt() {
    window.print();
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const iconClass = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-info-circle';
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  },

  formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    const remMins = diffMins % 60;
    return `${diffHours}h ${remMins}m`;
  },
};

// Run on window load
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});

