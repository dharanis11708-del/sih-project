/**
 * Smart Parking Management System - Data API Layer
 * All persistence operations handled via localStorage.
 * Ready to be swapped with a REST / GraphQL backend later.
 */

const STORAGE_KEYS = {
  AREAS: 'spms_areas_v1',
  SLOTS: 'spms_slots_v1',
  PARKED: 'spms_parked_v1',
  HISTORY: 'spms_history_v1',
  SETTINGS: 'spms_settings_v1',
};

// Rates as per college project specification:
// Bike: ₹10/hr, Car: ₹20/hr, Truck: ₹40/hr (Minimum charge 1 hour)
const RATES = {
  Bike: 10,
  Car: 20,
  Truck: 40,
};

const ParkingAPI = {
  RATES,
  BACKEND_URL: 'http://localhost:8000',
  isBackendConnected: false,

  // Initialize data if not already present in localStorage and check backend status
  async init() {
    if (!localStorage.getItem(STORAGE_KEYS.AREAS)) {
      this.seedInitialData();
    }
    await this.checkBackendStatus();
  },

  async checkBackendStatus() {
    try {
      const res = await fetch(`${this.BACKEND_URL}/api/health`, { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        this.isBackendConnected = true;
        this.updateBackendBadge(true);
        console.log('[API] Connected to Python Backend Server at http://localhost:8000');
        // Sync local storage with backend DB
        await this.syncFromBackend();
      } else {
        this.isBackendConnected = false;
        this.updateBackendBadge(false);
      }
    } catch (e) {
      this.isBackendConnected = false;
      this.updateBackendBadge(false);
    }
  },

  updateBackendBadge(isOnline) {
    const badge = document.getElementById('backend-status-badge');
    if (badge) {
      if (isOnline) {
        badge.innerHTML = '<i class="fa-solid fa-database text-emerald-500"></i> Backend API: Connected (SQLite)';
        badge.style.color = '#10b981';
        badge.style.backgroundColor = 'rgba(16, 185, 129, 0.12)';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      } else {
        badge.innerHTML = '<i class="fa-solid fa-hard-drive text-amber-500"></i> Mode: LocalStorage (Offline)';
        badge.style.color = '#f59e0b';
        badge.style.backgroundColor = 'rgba(245, 158, 11, 0.12)';
        badge.style.borderColor = 'rgba(245, 158, 11, 0.3)';
      }
    }
  },

  async syncFromBackend() {
    try {
      const [areasRes, slotsRes, parkedRes, histRes] = await Promise.all([
        fetch(`${this.BACKEND_URL}/api/areas`),
        fetch(`${this.BACKEND_URL}/api/slots`),
        fetch(`${this.BACKEND_URL}/api/parked`),
        fetch(`${this.BACKEND_URL}/api/history`)
      ]);

      if (areasRes.ok) {
        const areas = await areasRes.json();
        localStorage.setItem(STORAGE_KEYS.AREAS, JSON.stringify(areas));
      }
      if (slotsRes.ok) {
        const slots = await slotsRes.json();
        localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots.map(s => ({
          id: s.id,
          slotNumber: s.slot_number,
          areaId: s.area_id,
          areaName: s.area_name,
          slotType: s.slot_type,
          isOccupied: s.is_occupied === 1,
          currentVehicleNo: s.current_vehicle_no
        }))));
      }
      if (parkedRes.ok) {
        const parked = await parkedRes.json();
        localStorage.setItem(STORAGE_KEYS.PARKED, JSON.stringify(parked.map(p => ({
          ticketId: p.ticket_id,
          vehicleNo: p.vehicle_no,
          vehicleType: p.vehicle_type,
          ownerName: p.owner_name,
          contactNumber: p.contact_number,
          areaId: p.area_id,
          areaName: p.area_name,
          slotNumber: p.slot_number,
          entryTime: p.entry_time,
          ratePerHour: p.rate_per_hour
        }))));
      }
      if (histRes.ok) {
        const history = await histRes.json();
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history.map(h => ({
          ticketId: h.ticket_id,
          vehicleNo: h.vehicle_no,
          vehicleType: h.vehicle_type,
          ownerName: h.owner_name,
          contactNumber: h.contact_number,
          areaId: h.area_id,
          areaName: h.area_name,
          slotNumber: h.slot_number,
          entryTime: h.entry_time,
          exitTime: h.exit_time,
          durationHours: h.duration_hours,
          billedHours: h.billed_hours,
          ratePerHour: h.rate_per_hour,
          totalFee: h.total_fee,
          paymentMethod: h.payment_method,
          status: h.status
        }))));
      }
    } catch (e) {
      console.warn('[API] Could not sync with backend, using localStorage.', e);
    }
  },


  seedInitialData() {
    // 1. Three Parking Areas, 30 slots each (Total 90 slots)
    const areas = [
      {
        id: 'AREA-A',
        name: 'Ground Floor Lot (North Wing)',
        location: 'Near Main Gate & Academic Block A',
        capacity: 30,
        vehicleTypes: ['Car', 'Bike', 'Truck'],
        createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'AREA-B',
        name: 'Basement 1 (Central Plaza)',
        location: 'Underground Level 1 - Engineering Block',
        capacity: 30,
        vehicleTypes: ['Car', 'Bike'],
        createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'AREA-C',
        name: 'Open Lot & Rooftop (South Wing)',
        location: 'Sports Complex & Canteen Area',
        capacity: 30,
        vehicleTypes: ['Car', 'Bike', 'Truck'],
        createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
      },
    ];

    // 2. Generate 30 slots for each of the 3 areas
    const slots = [];
    areas.forEach((area) => {
      const prefix = area.id.replace('AREA-', '');
      for (let i = 1; i <= area.capacity; i++) {
        const slotNumber = `${prefix}-${String(i).padStart(2, '0')}`;
        // Designate some slots for specific types
        let slotType = 'Car';
        if (i <= 8) slotType = 'Bike';
        else if (i >= 27) slotType = 'Truck';

        slots.push({
          id: `SLOT-${slotNumber}`,
          slotNumber: slotNumber,
          areaId: area.id,
          areaName: area.name,
          slotType: slotType,
          isOccupied: false,
          currentVehicleNo: null,
        });
      }
    });

    // 3. Seed currently parked vehicles (approx 36 vehicles across areas)
    const parkedVehicles = [];
    const initialParkedSeed = [
      { vNo: 'DL-01-AB-1234', type: 'Car', owner: 'Rahul Sharma', phone: '9876543210', areaId: 'AREA-A', hoursAgo: 2.5 },
      { vNo: 'MH-12-CD-5678', type: 'Car', owner: 'Priya Patel', phone: '9812345678', areaId: 'AREA-A', hoursAgo: 1.2 },
      { vNo: 'KA-05-EF-9012', type: 'Bike', owner: 'Amit Verma', phone: '9823456789', areaId: 'AREA-A', hoursAgo: 3.8 },
      { vNo: 'TN-09-GH-3456', type: 'Bike', owner: 'Suresh Kumar', phone: '9834567890', areaId: 'AREA-A', hoursAgo: 0.8 },
      { vNo: 'UP-32-JK-7890', type: 'Truck', owner: 'Harpreet Singh', phone: '9845678901', areaId: 'AREA-A', hoursAgo: 4.2 },
      { vNo: 'HR-26-LM-2345', type: 'Car', owner: 'Vikas Rao', phone: '9856789012', areaId: 'AREA-A', hoursAgo: 1.9 },
      { vNo: 'DL-04-NP-6789', type: 'Car', owner: 'Ananya Roy', phone: '9867890123', areaId: 'AREA-A', hoursAgo: 5.1 },
      { vNo: 'GJ-01-QR-0123', type: 'Bike', owner: 'Mehul Joshi', phone: '9878901234', areaId: 'AREA-A', hoursAgo: 2.0 },
      { vNo: 'RJ-14-ST-4567', type: 'Car', owner: 'Pooja Agarwal', phone: '9889012345', areaId: 'AREA-A', hoursAgo: 0.5 },
      { vNo: 'KA-01-UV-8901', type: 'Car', owner: 'Kiran Reddy', phone: '9890123456', areaId: 'AREA-A', hoursAgo: 3.1 },
      
      { vNo: 'MH-02-WX-2345', type: 'Car', owner: 'Sneha Deshmukh', phone: '9712345678', areaId: 'AREA-B', hoursAgo: 1.5 },
      { vNo: 'DL-08-YZ-6789', type: 'Car', owner: 'Mohit Gupta', phone: '9723456789', areaId: 'AREA-B', hoursAgo: 4.0 },
      { vNo: 'KA-03-AA-0123', type: 'Bike', owner: 'Deepak Nayak', phone: '9734567890', areaId: 'AREA-B', hoursAgo: 0.9 },
      { vNo: 'TN-07-BB-4567', type: 'Bike', owner: 'Karthik S', phone: '9745678901', areaId: 'AREA-B', hoursAgo: 2.7 },
      { vNo: 'TS-09-CC-8901', type: 'Car', owner: 'Divya Teja', phone: '9756789012', areaId: 'AREA-B', hoursAgo: 3.4 },
      { vNo: 'UP-16-DD-2345', type: 'Car', owner: 'Gaurav Mishra', phone: '9767890123', areaId: 'AREA-B', hoursAgo: 0.4 },
      { vNo: 'WB-02-EE-6789', type: 'Car', owner: 'Sourav Bannerjee', phone: '9778901234', areaId: 'AREA-B', hoursAgo: 6.2 },
      { vNo: 'KL-07-FF-0123', type: 'Bike', owner: 'Fahad Faizal', phone: '9789012345', areaId: 'AREA-B', hoursAgo: 1.1 },
      { vNo: 'MP-04-GG-4567', type: 'Car', owner: 'Neha Tiwari', phone: '9790123456', areaId: 'AREA-B', hoursAgo: 2.3 },

      { vNo: 'CH-01-HH-8901', type: 'Car', owner: 'Simran Kaur', phone: '9612345678', areaId: 'AREA-C', hoursAgo: 1.8 },
      { vNo: 'AP-09-JJ-2345', type: 'Car', owner: 'Ramesh Naidu', phone: '9623456789', areaId: 'AREA-C', hoursAgo: 3.9 },
      { vNo: 'DL-12-KK-6789', type: 'Truck', owner: 'Balwinder Singh', phone: '9634567890', areaId: 'AREA-C', hoursAgo: 5.5 },
      { vNo: 'HR-03-LL-0123', type: 'Bike', owner: 'Sunil Malik', phone: '9645678901', areaId: 'AREA-C', hoursAgo: 2.2 },
      { vNo: 'MH-14-MM-4567', type: 'Car', owner: 'Tanvi Shinde', phone: '9656789012', areaId: 'AREA-C', hoursAgo: 0.7 },
      { vNo: 'KA-51-NN-8901', type: 'Bike', owner: 'Girish Gowda', phone: '9667890123', areaId: 'AREA-C', hoursAgo: 4.4 },
      { vNo: 'TN-22-PP-2345', type: 'Truck', owner: 'Muruganandam', phone: '9678901234', areaId: 'AREA-C', hoursAgo: 2.1 },
    ];

    const now = Date.now();
    initialParkedSeed.forEach((seed, idx) => {
      // Find an available slot in the specified area
      const availableSlot = slots.find(
        (s) => s.areaId === seed.areaId && !s.isOccupied
      );
      if (availableSlot) {
        availableSlot.isOccupied = true;
        availableSlot.currentVehicleNo = seed.vNo;

        const entryTime = new Date(now - seed.hoursAgo * 3600 * 1000).toISOString();
        parkedVehicles.push({
          ticketId: `TKT-${1000 + idx}`,
          vehicleNo: seed.vNo,
          vehicleType: seed.type,
          ownerName: seed.owner,
          contactNumber: seed.phone,
          areaId: seed.areaId,
          areaName: areas.find((a) => a.id === seed.areaId).name,
          slotId: availableSlot.id,
          slotNumber: availableSlot.slotNumber,
          entryTime: entryTime,
          ratePerHour: RATES[seed.type],
        });
      }
    });

    // 4. Generate 220+ historical completed parking records over the past 60 days
    // Realistic distribution: peak hours at 9-11 AM and 4-6 PM
    const history = this.generateRealisticHistory(areas);

    localStorage.setItem(STORAGE_KEYS.AREAS, JSON.stringify(areas));
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
    localStorage.setItem(STORAGE_KEYS.PARKED, JSON.stringify(parkedVehicles));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    localStorage.setItem(
      STORAGE_KEYS.SETTINGS,
      JSON.stringify({
        appName: 'SmartPark AICTE',
        currency: '₹',
        rates: RATES,
        theme: 'light',
      })
    );
  },

  // Generate 220 realistic past parking records over 60 days
  generateRealisticHistory(areas) {
    const history = [];
    const now = new Date();
    const vehicleTypes = ['Car', 'Car', 'Car', 'Bike', 'Bike', 'Truck']; // weighted toward cars
    const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Rohan', 'Kunal', 'Ishaan', 'Ananya', 'Diya', 'Pooja', 'Sneha', 'Riya', 'Kavita', 'Manish', 'Naveen', 'Arjun', 'Sanjay', 'Vikram', 'Tanmay'];
    const lastNames = ['Sharma', 'Verma', 'Gupta', 'Patel', 'Singh', 'Kumar', 'Reddy', 'Iyer', 'Nair', 'Deshmukh', 'Chopra', 'Yadav', 'Joshi', 'Bhatia'];
    const stateCodes = ['DL', 'MH', 'KA', 'TN', 'HR', 'UP', 'GJ', 'WB', 'TS', 'RJ'];

    let ticketCounter = 2000;

    // Distribute records over 60 days
    for (let dayOffset = 59; dayOffset >= 0; dayOffset--) {
      // Pick date
      const recordDate = new Date(now.getTime() - dayOffset * 24 * 3600 * 1000);
      const dayOfWeek = recordDate.getDay(); // 0 is Sunday, 6 is Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Number of entries for this day (3 to 6 per day, less on weekend)
      const entriesToday = isWeekend ? Math.floor(Math.random() * 2) + 2 : Math.floor(Math.random() * 3) + 3;

      for (let e = 0; e < entriesToday; e++) {
        // Bias hour towards peak hours (9-11 AM or 16-18 PM)
        let hour;
        const dice = Math.random();
        if (dice < 0.45) {
          // Morning peak: 9 to 11
          hour = 9 + Math.floor(Math.random() * 3);
        } else if (dice < 0.8) {
          // Evening peak: 16 to 18 (4 to 6 PM)
          hour = 16 + Math.floor(Math.random() * 3);
        } else {
          // Other operating hours: 8 to 21
          hour = 8 + Math.floor(Math.random() * 13);
        }

        const minute = Math.floor(Math.random() * 60);
        const entryTime = new Date(recordDate);
        entryTime.setHours(hour, minute, 0, 0);

        // Parking duration: 1 to 6 hours
        const durationHours = (1 + Math.random() * 4.5);
        const durationMs = durationHours * 3600 * 1000;
        const exitTime = new Date(entryTime.getTime() + durationMs);

        // Duration rounded up for minimum 1 hour billing
        const billedHours = Math.max(1, Math.ceil(durationHours));

        const vType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
        const rate = RATES[vType];
        const fee = billedHours * rate;

        const area = areas[Math.floor(Math.random() * areas.length)];
        const prefix = area.id.replace('AREA-', '');
        const slotNum = `${prefix}-${String(Math.floor(Math.random() * 30) + 1).padStart(2, '0')}`;

        const stateCode = stateCodes[Math.floor(Math.random() * stateCodes.length)];
        const rto = String(Math.floor(Math.random() * 90) + 10);
        const series = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
        const num = String(Math.floor(Math.random() * 9000) + 1000);
        const vehicleNo = `${stateCode}-${rto}-${series}-${num}`;

        const owner = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const phone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

        history.push({
          ticketId: `TKT-${ticketCounter++}`,
          vehicleNo: vehicleNo,
          vehicleType: vType,
          ownerName: owner,
          contactNumber: phone,
          areaId: area.id,
          areaName: area.name,
          slotNumber: slotNum,
          entryTime: entryTime.toISOString(),
          exitTime: exitTime.toISOString(),
          durationHours: parseFloat(durationHours.toFixed(2)),
          billedHours: billedHours,
          ratePerHour: rate,
          totalFee: fee,
          paymentMethod: Math.random() > 0.35 ? 'UPI / Online' : 'Cash',
          status: 'COMPLETED',
        });
      }
    }

    return history;
  },

  // -------------------------------------------------------------
  // Data Retrieval Helpers
  // -------------------------------------------------------------
  getAreas() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.AREAS) || '[]');
  },

  getSlots(areaId = null) {
    const slots = JSON.parse(localStorage.getItem(STORAGE_KEYS.SLOTS) || '[]');
    if (areaId && areaId !== 'ALL') {
      return slots.filter((s) => s.areaId === areaId);
    }
    return slots;
  },

  getParkedVehicles() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PARKED) || '[]');
  },

  getHistory() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
  },

  // -------------------------------------------------------------
  // Summary Stats for Dashboard Cards
  // -------------------------------------------------------------
  getSummaryStats() {
    const slots = this.getSlots();
    const parked = this.getParkedVehicles();
    const history = this.getHistory();

    const totalSlots = slots.length;
    const occupiedSlots = slots.filter((s) => s.isOccupied).length;
    const availableSlots = totalSlots - occupiedSlots;

    // Today's revenue: fees from exits completed today + estimated fees from currently parked
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCompleted = history.filter(
      (h) => h.exitTime && h.exitTime.slice(0, 10) === todayStr
    );
    const todayCompletedRevenue = todayCompleted.reduce(
      (acc, curr) => acc + (curr.totalFee || 0),
      0
    );

    return {
      totalSlots,
      occupiedSlots,
      availableSlots,
      occupancyRate: totalSlots ? Math.round((occupiedSlots / totalSlots) * 100) : 0,
      todayRevenue: todayCompletedRevenue,
      todayExitsCount: todayCompleted.length,
      currentParkedCount: parked.length,
    };
  },

  // -------------------------------------------------------------
  // Vehicle Entry (Auto Slot Allocation & Validation)
  // -------------------------------------------------------------
  parkVehicle({ vehicleNo, vehicleType, ownerName, contactNumber, areaId }) {
    // 1. Sanitize & Normalize inputs
    const vNo = vehicleNo.trim().toUpperCase();
    const owner = ownerName.trim();
    const contact = contactNumber.trim();
    const type = vehicleType;

    // 2. Validate Vehicle Number
    if (!vNo || vNo.length < 5) {
      return { success: false, message: 'Invalid vehicle number format.' };
    }

    // 3. Validate Contact Number (10 digits)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(contact)) {
      return { success: false, message: 'Contact number must be a valid 10-digit mobile number.' };
    }

    // 4. Check if vehicle is ALREADY parked
    const parked = this.getParkedVehicles();
    const isAlreadyParked = parked.some((p) => p.vehicleNo === vNo);
    if (isAlreadyParked) {
      return {
        success: false,
        message: `Vehicle ${vNo} is ALREADY parked in the facility!`,
      };
    }

    // 5. Find an available slot
    const slots = this.getSlots();
    let candidateSlots = slots.filter((s) => !s.isOccupied);

    if (areaId && areaId !== 'AUTO') {
      candidateSlots = candidateSlots.filter((s) => s.areaId === areaId);
    }

    // Preference matching for vehicle type if available
    let allocatedSlot = candidateSlots.find((s) => s.slotType === type);
    if (!allocatedSlot && candidateSlots.length > 0) {
      // Fallback to any slot in that area
      allocatedSlot = candidateSlots[0];
    }

    if (!allocatedSlot) {
      return {
        success: false,
        message: areaId && areaId !== 'AUTO'
          ? 'No parking slots available in selected area. Please choose another area.'
          : 'All parking slots across all areas are currently FULL!',
      };
    }

    // 6. Allocate slot & save
    allocatedSlot.isOccupied = true;
    allocatedSlot.currentVehicleNo = vNo;

    const areas = this.getAreas();
    const areaObj = areas.find((a) => a.id === allocatedSlot.areaId);

    const ticketId = `TKT-${Date.now().toString().slice(-5)}`;
    const newEntry = {
      ticketId,
      vehicleNo: vNo,
      vehicleType: type,
      ownerName: owner,
      contactNumber: contact,
      areaId: allocatedSlot.areaId,
      areaName: areaObj ? areaObj.name : allocatedSlot.areaId,
      slotId: allocatedSlot.id,
      slotNumber: allocatedSlot.slotNumber,
      entryTime: new Date().toISOString(),
      ratePerHour: RATES[type] || 20,
    };

    parked.unshift(newEntry);

    // Persist changes
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
    localStorage.setItem(STORAGE_KEYS.PARKED, JSON.stringify(parked));

    // Async sync to Backend if connected
    if (this.isBackendConnected) {
      fetch(`${this.BACKEND_URL}/api/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleNo: vNo, vehicleType: type, ownerName: owner, contactNumber: contact, areaId })
      }).catch(err => console.warn('[API] Backend entry sync warning:', err));
    }

    return {
      success: true,
      message: `Vehicle ${vNo} successfully parked in Slot ${allocatedSlot.slotNumber}!`,
      ticket: newEntry,
    };
  },

  // -------------------------------------------------------------
  // Vehicle Exit (Fee Calculation, Receipt & Slot Release)
  // -------------------------------------------------------------
  getParkedVehicle(vehicleNo) {
    if (!vehicleNo) return null;
    const vNo = vehicleNo.trim().toUpperCase();
    const parked = this.getParkedVehicles();
    return parked.find((p) => p.vehicleNo === vNo) || null;
  },

  calculateExitFee(vehicleNo) {
    const vehicle = this.getParkedVehicle(vehicleNo);
    if (!vehicle) {
      return { success: false, message: `Vehicle ${vehicleNo} is not parked in this facility.` };
    }

    const entryTime = new Date(vehicle.entryTime);
    const exitTime = new Date();
    const durationMs = exitTime.getTime() - entryTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // Rule: Minimum charge 1 hour, then rounded up to next full hour
    const billedHours = Math.max(1, Math.ceil(durationHours));
    const rate = vehicle.ratePerHour || RATES[vehicle.vehicleType] || 20;
    const totalFee = billedHours * rate;

    // Format duration string (e.g., 2 hrs 15 mins)
    const totalMinutes = Math.floor(durationMs / (1000 * 60));
    const hoursPart = Math.floor(totalMinutes / 60);
    const minutesPart = totalMinutes % 60;
    const durationFormatted = `${hoursPart} hr ${minutesPart} min`;

    return {
      success: true,
      vehicle,
      entryTime: entryTime.toISOString(),
      exitTime: exitTime.toISOString(),
      durationHours: parseFloat(durationHours.toFixed(2)),
      durationFormatted,
      billedHours,
      ratePerHour: rate,
      totalFee,
    };
  },

  processExit({ vehicleNo, paymentMethod = 'Cash' }) {
    const calc = this.calculateExitFee(vehicleNo);
    if (!calc.success) {
      return calc;
    }

    const { vehicle, exitTime, durationHours, billedHours, ratePerHour, totalFee, durationFormatted } = calc;

    // 1. Release Slot in Slots storage
    const slots = this.getSlots();
    const slot = slots.find((s) => s.slotNumber === vehicle.slotNumber);
    if (slot) {
      slot.isOccupied = false;
      slot.currentVehicleNo = null;
    }

    // 2. Remove from Parked storage
    const parked = this.getParkedVehicles();
    const updatedParked = parked.filter((p) => p.vehicleNo !== vehicle.vehicleNo);

    // 3. Append to History storage
    const history = this.getHistory();
    const completedRecord = {
      ticketId: vehicle.ticketId,
      vehicleNo: vehicle.vehicleNo,
      vehicleType: vehicle.vehicleType,
      ownerName: vehicle.ownerName,
      contactNumber: vehicle.contactNumber,
      areaId: vehicle.areaId,
      areaName: vehicle.areaName,
      slotNumber: vehicle.slotNumber,
      entryTime: vehicle.entryTime,
      exitTime: exitTime,
      durationHours: durationHours,
      durationFormatted: durationFormatted,
      billedHours: billedHours,
      ratePerHour: ratePerHour,
      totalFee: totalFee,
      paymentMethod: paymentMethod,
      status: 'COMPLETED',
    };
    history.unshift(completedRecord);

    // Persist
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));
    localStorage.setItem(STORAGE_KEYS.PARKED, JSON.stringify(updatedParked));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));

    // Async sync to Backend if connected
    if (this.isBackendConnected) {
      fetch(`${this.BACKEND_URL}/api/exit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleNo, paymentMethod })
      }).catch(err => console.warn('[API] Backend exit sync warning:', err));
    }

    return {
      success: true,
      message: `Vehicle ${vehicle.vehicleNo} exit processed. Total Fee: ₹${totalFee}. Slot ${vehicle.slotNumber} is now available!`,
      receipt: completedRecord,
    };
  },

  // -------------------------------------------------------------
  // Add Parking Area
  // -------------------------------------------------------------
  addArea({ id, name, location, capacity = 30, vehicleTypes = ['Car', 'Bike'] }) {
    const areas = this.getAreas();
    const areaId = id.trim().toUpperCase();

    if (!areaId || !name.trim()) {
      return { success: false, message: 'Area ID and Name are required.' };
    }

    if (areas.some((a) => a.id === areaId)) {
      return { success: false, message: `Area ID ${areaId} already exists.` };
    }

    const newArea = {
      id: areaId,
      name: name.trim(),
      location: location.trim() || 'Campus Lot',
      capacity: parseInt(capacity) || 30,
      vehicleTypes: vehicleTypes,
      createdAt: new Date().toISOString(),
    };

    areas.push(newArea);

    // Generate slots for new area
    const slots = this.getSlots();
    const prefix = areaId.replace('AREA-', '');
    for (let i = 1; i <= newArea.capacity; i++) {
      slots.push({
        id: `SLOT-${prefix}-${String(i).padStart(2, '0')}`,
        slotNumber: `${prefix}-${String(i).padStart(2, '0')}`,
        areaId: newArea.id,
        areaName: newArea.name,
        slotType: i <= 8 ? 'Bike' : (i >= 26 ? 'Truck' : 'Car'),
        isOccupied: false,
        currentVehicleNo: null,
      });
    }

    localStorage.setItem(STORAGE_KEYS.AREAS, JSON.stringify(areas));
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(slots));

    // Async sync to Backend if connected
    if (this.isBackendConnected) {
      fetch(`${this.BACKEND_URL}/api/areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: areaId, name: name.trim(), location: location.trim(), capacity: newArea.capacity })
      }).catch(err => console.warn('[API] Backend area sync warning:', err));
    }

    return {
      success: true,
      message: `Area ${newArea.name} with ${newArea.capacity} slots created successfully!`,
      area: newArea,
    };
  },

  // -------------------------------------------------------------
  // Analytics Aggregators for Chart.js
  // -------------------------------------------------------------
  getAnalyticsData() {
    const areas = this.getAreas();
    const slots = this.getSlots();
    const history = this.getHistory();
    const parked = this.getParkedVehicles();

    // 1. Area Occupancy Bar Data
    const areaLabels = [];
    const areaOccupiedCounts = [];
    const areaAvailableCounts = [];
    const areaTotalCounts = [];

    areas.forEach((area) => {
      areaLabels.push(area.name);
      const areaSlots = slots.filter((s) => s.areaId === area.id);
      const occupied = areaSlots.filter((s) => s.isOccupied).length;
      areaOccupiedCounts.push(occupied);
      areaAvailableCounts.push(areaSlots.length - occupied);
      areaTotalCounts.push(areaSlots.length);
    });

    // 2. Vehicle Categories Breakdown (Pie/Doughnut)
    // Combine currently parked + completed history
    const vehicleCounts = { Car: 0, Bike: 0, Truck: 0 };
    parked.forEach((p) => {
      if (vehicleCounts[p.vehicleType] !== undefined) vehicleCounts[p.vehicleType]++;
    });
    history.forEach((h) => {
      if (vehicleCounts[h.vehicleType] !== undefined) vehicleCounts[h.vehicleType]++;
    });

    // 3. Peak Parking Hours (Bar: 00 to 23 hours)
    const hourDistribution = new Array(24).fill(0);
    history.forEach((h) => {
      if (h.entryTime) {
        const hour = new Date(h.entryTime).getHours();
        hourDistribution[hour]++;
      }
    });

    // 4. Daily Revenue over Past 30 Days (Line)
    const dailyRevenueMap = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyRevenueMap[key] = 0;
    }

    history.forEach((h) => {
      if (h.exitTime) {
        const key = h.exitTime.slice(0, 10);
        if (dailyRevenueMap[key] !== undefined) {
          dailyRevenueMap[key] += h.totalFee || 0;
        }
      }
    });

    const revenueLabels = Object.keys(dailyRevenueMap).map((k) => {
      const parts = k.split('-');
      return `${parts[2]}/${parts[1]}`;
    });
    const revenueValues = Object.values(dailyRevenueMap);

    // 5. Hour vs Weekday Heatmap Matrix (7 days x 14 daytime hours: 7 AM to 8 PM)
    // Days: 0 (Sun) to 6 (Sat)
    const heatmap = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const startHour = 7;
    const endHour = 20;

    for (let day = 0; day < 7; day++) {
      const row = [];
      for (let h = startHour; h <= endHour; h++) {
        row.push(0);
      }
      heatmap.push({ dayName: days[day], dayIndex: day, hours: row });
    }

    history.forEach((item) => {
      if (item.entryTime) {
        const d = new Date(item.entryTime);
        const day = d.getDay();
        const hr = d.getHours();
        if (hr >= startHour && hr <= endHour) {
          heatmap[day].hours[hr - startHour]++;
        }
      }
    });

    return {
      areaOccupancy: {
        labels: areaLabels,
        occupied: areaOccupiedCounts,
        available: areaAvailableCounts,
        totals: areaTotalCounts,
      },
      vehicleCategories: {
        labels: ['Car (₹20/hr)', 'Bike (₹10/hr)', 'Truck (₹40/hr)'],
        data: [vehicleCounts.Car, vehicleCounts.Bike, vehicleCounts.Truck],
      },
      peakHours: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        data: hourDistribution,
      },
      dailyRevenue: {
        labels: revenueLabels,
        data: revenueValues,
      },
      heatmap: {
        days,
        hoursRange: Array.from({ length: endHour - startHour + 1 }, (_, i) => `${startHour + i}:00`),
        matrix: heatmap,
      },
    };
  },

  // -------------------------------------------------------------
  // CSV Export Generator
  // -------------------------------------------------------------
  exportCSV(type = 'history') {
    let csv = '';
    let filename = '';

    if (type === 'fee_collection' || type === 'history') {
      const data = this.getHistory();
      filename = `SmartPark_Parking_History_${new Date().toISOString().slice(0, 10)}.csv`;
      csv = 'Ticket ID,Vehicle No,Vehicle Type,Owner Name,Contact,Area,Slot,Entry Time,Exit Time,Billed Hours,Rate/Hr (INR),Total Fee (INR),Payment Method,Status\n';
      data.forEach((r) => {
        csv += `"${r.ticketId}","${r.vehicleNo}","${r.vehicleType}","${r.ownerName}","${r.contactNumber}","${r.areaName}","${r.slotNumber}","${r.entryTime}","${r.exitTime}",${r.billedHours},${r.ratePerHour},${r.totalFee},"${r.paymentMethod}","${r.status}"\n`;
      });
    } else if (type === 'occupancy') {
      const slots = this.getSlots();
      filename = `SmartPark_Area_Occupancy_${new Date().toISOString().slice(0, 10)}.csv`;
      csv = 'Slot ID,Slot Number,Area Name,Designated Type,Status,Current Vehicle No\n';
      slots.forEach((s) => {
        csv += `"${s.id}","${s.slotNumber}","${s.areaName}","${s.slotType}","${s.isOccupied ? 'OCCUPIED' : 'AVAILABLE'}","${s.currentVehicleNo || 'NONE'}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Reset to initial mock dataset if desired
  resetData() {
    localStorage.removeItem(STORAGE_KEYS.AREAS);
    localStorage.removeItem(STORAGE_KEYS.SLOTS);
    localStorage.removeItem(STORAGE_KEYS.PARKED);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    this.init();
  },
};

// Auto-initialize on load
ParkingAPI.init();

