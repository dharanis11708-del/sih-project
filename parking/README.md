# Smart Parking Management and Parking Usage Analysis System

> **A Comprehensive College Capstone Project**  
> Built with HTML5, CSS3, Vanilla JavaScript, and Chart.js. Runs 100% locally in any browser with `localStorage` persistence — **No external server or backend installation needed!**

---

## 📌 Project Overview

The **Smart Parking Management and Parking Usage Analysis System** is an end-to-end web application engineered for college campuses, commercial tech parks, and municipal multi-level parking facilities. It streamlines:
1. **Automated Slot Allocation** for incoming vehicles (Cars, Bikes, Trucks).
2. **Real-time Occupancy Tracking** with a color-coded interactive grid map (Green = Available, Red = Occupied).
3. **Automated Fee Settlement & Printable Thermal-Style Receipts** upon check-out.
4. **Historical Auditing & CSV Data Exports** for accounting and facility management.
5. **Deep Parking Usage Analytics & Peak-Hour Heatmaps** for infrastructure utilization analysis.

---

## 🚀 How to Run the Website

You don't need Node.js, Python, or any database installed!

1. Open your File Explorer and navigate to:
   ```
   D:\smart-parking\frontend\
   ```
2. Double-click **`index.html`** (or right-click $\rightarrow$ **Open with Google Chrome / Microsoft Edge**).
3. That's it! The full system will load immediately in your browser with pre-loaded mock data (3 areas, 90 slots, active vehicles, and 200+ past transaction records).

---

## 📂 Project Folder Structure

```
/frontend
│
├── index.html            # Main Single-Page Application (SPA) container
├── README.md             # Project documentation & presentation guide
│
├── css/
│   └── style.css         # Responsive Dark Blue & White theme, light/dark mode variables, print styles
│
├── js/
│   ├── app.js            # Main UI controller, event handlers, forms, modals & toasts
│   └── charts.js         # Chart.js visualizer (Bar, Doughnut, Line & Heatmap matrix)
│
└── data/
    └── api.js            # Encapsulated mock database & business logic layer (localStorage)
```

> **Modular Architecture:** All data persistence, fee calculations, and validation rules are contained inside `data/api.js`. If you later want to connect a real Python/FastAPI, Node/Express, or Go backend, you only need to swap the methods in `data/api.js` with `fetch()` calls without touching the UI!

---

## ⚡ Key Features & Pages

| Page | Description |
| :--- | :--- |
| **1. Dashboard** | Real-time KPI metric cards (Total Slots, Occupied, Available, Today's Revenue, Occupancy Rate), area-wise capacity breakdown bar chart, and recent entries table with quick check-out actions. |
| **2. Vehicle Entry** | Form with vehicle number validation, category selection (Car/Bike/Truck), owner details, 10-digit mobile validation, auto-slot allocation preview, and instant printable entry pass. |
| **3. Vehicle Exit** | Live vehicle lookup by registration number, automated duration calculation (hours & minutes), minimum 1-hour tariff calculation, payment method selection, and printable official receipt. |
| **4. Parked Vehicles** | Real-time directory of all currently parked vehicles with multi-field search (registration, owner, slot), filters by category/area, sorting (newest/oldest/slot), and 1-click check-out. |
| **5. Parking Slots** | Color-coded visual matrix per area (🟢 Green = Available, 🔴 Red = Occupied). Hover tooltips show vehicle details or slot status. Clicking a slot initiates entry or exit directly. |
| **6. Parking Areas** | Overview of facility areas (Ground Floor Lot, Basement 1, Rooftop/Open Lot) with live capacity bars. Includes an **"Add New Area"** modal that dynamically auto-generates slots! |
| **7. Reports & CSV** | Fee collection audit logs, searchable historical records table, and 1-click CSV download buttons for audit spreadsheets. |
| **8. Usage Analytics** | 4 deep analytics visualizations: Vehicle Category Doughnut, Peak Parking Hours (highlighting 9-11 AM & 4-6 PM rush hours), 30-Day Daily Revenue Trend, and Day-of-Week vs Operating Hours Heatmap. |

---

## 💰 Tariff Schedule & Validation Rules

* **Motorcycle / Scooter:** ₹10 / hour
* **Car / Sedan / SUV:** ₹20 / hour
* **Truck / Commercial Bus:** ₹40 / hour
* **Minimum Billing:** 1 hour minimum charge; durations exceeding 1 hour are rounded up to the nearest billable hour.
* **Duplicate Prevention:** The system validates and rejects any entry attempt for a vehicle registration number that is already marked as parked.
* **Full Capacity Alert:** Prevents check-in and notifies the operator when all slots in an area are occupied.
* **Exit Safeguard:** Prevents check-out operations for vehicle numbers not currently parked.
* **Contact Validation:** Enforces valid 10-digit mobile numbers (`^[6-9]\d{9}$`).

---

## 🧪 Demonstration & Viva Test Scenarios

When demonstrating to your professor or viva examiner, try these actions:

1. **Test Vehicle Entry:**
   - Go to **Vehicle Entry** $\rightarrow$ Enter vehicle `KA-03-ZZ-9999`, select `Car`, enter owner `Prof. Sharma`, phone `9876543210`.
   - Notice the live suggested slot preview (e.g., `A-01`).
   - Click **Allocate Slot** $\rightarrow$ The printable entry slip pops up and the slot turns Red!
2. **Test Duplicate Validation:**
   - Try to enter the exact same vehicle `KA-03-ZZ-9999` again.
   - An error toast will appear: *"Vehicle KA-03-ZZ-9999 is ALREADY parked in the facility!"*
3. **Test Vehicle Exit & Fee Calculation:**
   - Go to **Vehicle Exit** $\rightarrow$ Type `KA-03-ZZ-9999`.
   - The system instantly calculates the elapsed time, billed hours (minimum 1 hr), and displays ₹20.
   - Click **Collect Fee & Print Receipt** $\rightarrow$ The receipt modal opens with a barcode and print option, and the slot turns Green again!
4. **Test Interactive Grid:**
   - Go to **Parking Slots** $\rightarrow$ Switch between `Area A`, `Area B`, `Area C`, or `All Areas`.
   - Hover over any Red slot to view the owner's name, vehicle type, and duration.
5. **Test Dark / Light Mode:**
   - Click the Moon/Sun icon in the top right. Watch the dashboard, cards, and Chart.js charts seamlessly adapt their color palettes.
6. **Test Analytics & Peak Hours:**
   - Go to **Usage Analytics** $\rightarrow$ Observe the red peak bars at 9:00-11:00 AM and 16:00-18:00 PM, and inspect the color-intensity heatmap across Monday to Sunday.
7. **Test CSV Export:**
   - Go to **Reports & CSV** $\rightarrow$ Click **Download CSV**. A spreadsheet with all 200+ historical records will download to your computer.

---

## 🛠️ Technologies Used

* **Frontend:** HTML5, CSS3 (Custom Variables, Flexbox, Grid), Vanilla JavaScript (ES6+).
* **Charts & Visualizations:** [Chart.js](https://www.chartjs.org/) v4.4.1 (CDN).
* **Icons:** [FontAwesome 6](https://fontawesome.com/) (CDN).
* **Storage:** HTML5 `localStorage` API for zero-setup offline persistence.
* **Backend:** Python REST API (`http.server` & `FastAPI`) + SQLite (`parking.db`).

---

## 🖥️ Running the Backend Server (Optional Full-Stack Mode)

The frontend runs 100% locally on its own without any backend. However, if you want to demonstrate full-stack capabilities to your evaluators:

### Option A: Standard Python Server (Zero Dependencies)
Run the built-in server that uses Python's standard library (no `pip install` required):
```powershell
cd D:\smart-parking\backend
python server.py
```
* **Live API Endpoint:** `http://localhost:8000`
* **Pre-seeded Database:** `D:\smart-parking\backend\parking.db` (SQLite)

### Option B: FastAPI with Interactive Swagger UI
If you have `fastapi` and `uvicorn` installed:
```powershell
cd D:\smart-parking\backend
pip install -r requirements.txt
uvicorn main:app --reload
```
* **Interactive Swagger Documentation:** Open `http://localhost:8000/docs` to test all API routes directly in your browser!

### API Endpoints Included:
* `GET  /api/stats` - Total, Occupied, Available slots & Today's revenue
* `GET  /api/areas` - List parking areas
* `POST /api/areas` - Add new parking area & generate slots
* `GET  /api/slots` - Matrix of slots by area
* `GET  /api/parked` - List currently parked vehicles
* `POST /api/entry` - Check-in vehicle with validation
* `GET  /api/exit-calc?vehicleNo=...` - Calculate parking fee & duration
* `POST /api/exit` - Check-out vehicle, collect fee & release slot
* `GET  /api/history` - Historical parking logs
* `GET  /api/analytics` - Aggregated chart metrics

