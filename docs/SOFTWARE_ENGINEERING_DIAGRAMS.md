# SOFTWARE ENGINEERING DIAGRAM BLUEPRINT & MODELS
## Course: 25ITT33 — SOFTWARE ENGINEERING (L: 3, T: 0, P: 0, C: 3)
### Project: Smart Parking Management & Usage Analysis System (SPMS)

This document contains the **pure diagrammatic specification** for the entire Software Engineering lifecycle (Unit 1 to Unit 5). Every phase is represented using standard engineering visual models (Architectural, UML, Behavioral, Structural, Testing CFG, and Estimation Flow diagrams) without source code.

---

## TABLE OF DIAGRAM MODELS

| Unit | Diagram Title | Model Type | Purpose |
| :--- | :--- | :--- | :--- |
| **Unit 1** | 1. Agile Scrum Process & Sprint Lifecycle | Process Model | Visualizes iterative sprint cycles and roles |
| **Unit 1** | 2. 4P's Management Framework | Structural Model | People, Product, Process, and Project mapping |
| **Unit 2** | 3. System Use Case Diagram | UML Behavioral | Actor goals, interactions, and system boundary |
| **Unit 2** | 4. Vehicle Check-in & Check-out Activity Flow | Activity / Workflow | End-to-end operational decision flow |
| **Unit 3** | 5. 3-Tier Layered Architecture Diagram | System Architecture | Separation of Presentation, Logic, and Data |
| **Unit 3** | 6. Component-Level Diagram | UML Structural | Inter-subsystem interfaces and boundaries |
| **Unit 3** | 7. Object-Oriented Class Diagram | UML Structural | Entity attributes, methods, and relationships |
| **Unit 3** | 8. Sequence Diagram: Vehicle Entry & Allocation | UML Interaction | Message exchange sequence during parking |
| **Unit 3** | 9. Sequence Diagram: Vehicle Exit & Settlement | UML Interaction | Message exchange during billing & release |
| **Unit 3** | 10. Parking Slot State Transition Diagram | State Machine | Slot states from Free to Occupied to Released |
| **Unit 3** | 11. Entity-Relationship (ER) Diagram | Data Model | Relational schema entities, keys, and cardinality |
| **Unit 3** | 12. System Deployment Diagram | Physical Architecture | Nodes, web servers, containers, and database |
| **Unit 4** | 13. Software Engineering V-Model | V&V Model | Verification vs. Validation level mapping |
| **Unit 4** | 14. Control Flow Graph (CFG) & Basis Paths | White Box Testing | Branching logic & Cyclomatic Complexity ($V(G)=5$) |
| **Unit 4** | 15. Equivalence Partitioning & BVA Range Model | Black Box Testing | Valid, invalid, and boundary test partitions |
| **Unit 5** | 16. Work Breakdown Structure (WBS) | Project Management | Hierarchical project task decomposition |
| **Unit 5** | 17. Project Sprint Schedule & Timeline | Schedule Model | Sprint milestones from inception to release |
| **Unit 5** | 18. COCOMO Cost & Effort Estimation Flow | Algorithmic Model | Mathematical pipeline for effort, time, and cost |

---

# UNIT 1: SOFTWARE PROCESS MODELS

### Diagram 1.1: Agile Scrum Sprint Lifecycle Model
```mermaid
flowchart LR
    subgraph Inputs["1. Product Inception"]
        A["Stakeholder Requirements"] --> B["Product Backlog"]
    end

    subgraph SprintCycle["2. Iterative Sprint Engine (2 Weeks)"]
        B --> C["Sprint Planning"]
        C --> D["Sprint Backlog"]
        D --> E["Daily Scrum (Standup)"]
        E --> F["Implementation & Testing"]
        F --> G["Sprint Review & Demo"]
        G --> H["Sprint Retrospective"]
        H -.->|"Feed improvements"| C
    end

    subgraph Outputs["3. Deliverables"]
        G --> I["Potentially Shippable Increment"]
        I --> J["Version 2.0 Live Release"]
    end
```

### Diagram 1.2: The 4 P's Management Model
```mermaid
flowchart TD
    FourP["4 P's of Software Project Management"]

    subgraph People["1. PEOPLE (Stakeholders)"]
        P1["Product Owner: Feature Goals"]
        P2["Scrum Master: Process Facilitator"]
        P3["Frontend / UI Developers"]
        P4["Backend & Database Engineers"]
        P5["QA Test Engineers"]
    end

    subgraph Product["2. PRODUCT (SPMS)"]
        PR1["Live Occupancy Dashboard"]
        PR2["Visual Slot Matrix Grid"]
        PR3["Automated Tariff & Billing Engine"]
        PR4["Usage & Revenue Analytics"]
    end

    subgraph Process["3. PROCESS (Agile)"]
        PC1["Sprint Cadence: 2 Weeks"]
        PC2["Test-Driven Refinement"]
        PC3["Continuous Review & CI/CD"]
    end

    subgraph Project["4. PROJECT (Constraints)"]
        PJ1["Schedule: 6-Week Delivery"]
        PJ2["Scope: Campus Parking Lots"]
        PJ3["Budget: Academic & COCOMO Target"]
    end

    FourP --> People
    FourP --> Product
    FourP --> Process
    FourP --> Project
```

---

# UNIT 2: SOFTWARE REQUIREMENTS MODELS

### Diagram 2.1: System Use Case Diagram
```mermaid
flowchart LR
    subgraph Actors["System Actors"]
        Attendant["Parking Attendant"]
        Admin["System Administrator"]
        Driver["Campus Driver / Commuter"]
    end

    subgraph SPMS_Boundary["Smart Parking Management System Boundary"]
        UC1["UC-1: Check-in Vehicle & Issue Ticket"]
        UC2["UC-2: Check-out Vehicle & Calculate Fee"]
        UC3["UC-3: View Real-Time Slot Grid"]
        UC4["UC-4: Configure Parking Areas & Capacities"]
        UC5["UC-5: Define Tariff Rates per Vehicle Type"]
        UC6["UC-6: Generate Daily Revenue Reports"]
        UC7["UC-7: Export Audit History to CSV"]
        UC8["UC-8: System Reset & Offline Fallback"]
    end

    Attendant --> UC1
    Attendant --> UC2
    Attendant --> UC3

    Driver --> UC3

    Admin --> UC3
    Admin --> UC4
    Admin --> UC5
    Admin --> UC6
    Admin --> UC7
    Admin --> UC8
```

### Diagram 2.2: Activity Flow Diagram (Check-In & Check-Out Workflows)
```mermaid
flowchart TD
    StartCheckin(["Vehicle Arrives at Gate"]) --> ReadPlate["Attendant Inspects Vehicle No & Category"]
    ReadPlate --> CheckSlot{"Is Slot Available?"}
    
    CheckSlot -- No --> Reject["Display 'Parking Lot Full' Banner"]
    Reject --> End1(["Vehicle Diverted"])
    
    CheckSlot -- Yes --> CheckDupl{"Is Vehicle Already Parked?"}
    CheckDupl -- Yes --> AlertDupl["Alert: Duplicate License Plate Error"]
    AlertDupl --> End1

    CheckDupl -- No --> AssignSlot["Allocate Specific Slot (e.g., A-05)"]
    AssignSlot --> StampEntry["Record Entry Timestamp & Generate Ticket ID"]
    StampEntry --> MarkOcc["Set Slot State = OCCUPIED (Red)"]
    MarkOcc --> PrintTkt["Print / Issue Parking Pass"]
    PrintTkt --> Parked(["Vehicle Parked on Site"])

    Parked --> ExitRequest(["Vehicle Arrives at Exit Gate"])
    ExitRequest --> FetchTkt["Scan Ticket ID / Enter Vehicle No"]
    FetchTkt --> CalcTime["Compute Total Duration = Exit Time - Entry Time"]
    CalcTime --> GraceCheck{"Duration <= 15 Mins?"}

    GraceCheck -- Yes --> FreeRate["Total Fee = ₹0.00 (Grace Period)"]
    GraceCheck -- No --> RateRound["Round Up to Nearest Hour"]
    RateRound --> ApplyTariff["Apply Category Rate: Bike ₹10, Car ₹20, Truck ₹40"]
    ApplyTariff --> CollectFee["Prompt Payment (Cash / UPI)"]
    FreeRate --> CollectFee

    CollectFee --> LogHistory["Archive Record to parking_history"]
    LogHistory --> ReleaseSlot["Set Slot State = AVAILABLE (Green)"]
    ReleaseSlot --> OpenGate["Raise Exit Barrier Gate"]
    OpenGate --> EndExit(["Vehicle Departs Campus"])
```

---

# UNIT 3: SOFTWARE DESIGN MODELS

### Diagram 3.1: 3-Tier Multi-Layer Architectural Model
```mermaid
flowchart TD
    subgraph Tier1["Tier 1: Presentation Layer (Client Browser)"]
        SPA["Single Page Application (SPA)"]
        DashboardUI["Live Occupancy KPI Cards"]
        GridUI["Interactive Slot Grid (Green/Red Tiles)"]
        AnalyticsUI["Chart.js Analytics Visualizer"]
        LocalCache[("Browser LocalStorage Cache")]
        SPA --> DashboardUI
        SPA --> GridUI
        SPA --> AnalyticsUI
        SPA <--> LocalCache
    end

    subgraph Tier2["Tier 2: Business Logic & Application Layer (REST Engine)"]
        Gateway["API Router & Dispatcher"]
        AuthModule["Access Control & Role Validator"]
        AllocationEngine["Slot Optimization & State Manager"]
        BillingEngine["Tariff Calculator & Time Auditor"]
        ReportEngine["CSV & Analytics Aggregator"]
        
        Gateway --> AuthModule
        Gateway --> AllocationEngine
        Gateway --> BillingEngine
        Gateway --> ReportEngine
    end

    subgraph Tier3["Tier 3: Enterprise Data Tier (Relational Storage)"]
        PG[(PostgreSQL Enterprise Database)]
        T1["areas (Facilities)"]
        T2["slots (Physical Spaces)"]
        T3["parked_vehicles (Active)"]
        T4["parking_history (Archives)"]
        PG --- T1
        PG --- T2
        PG --- T3
        PG --- T4
    end

    LocalCache <==>|"HTTP / JSON REST API"| Gateway
    AllocationEngine <==>|"SQL Read / Update"| PG
    BillingEngine <==>|"SQL Insert / Delete"| PG
```

### Diagram 3.2: Component-Level Design Diagram
```mermaid
flowchart TD
    subgraph PresentationComponents["UI Component Hierarchy"]
        NavBar["NavBar & Header"]
        SideBar["Navigation Sidebar"]
        KpiCard["StatCard (KPI Metrics)"]
        SlotGrid["SlotGrid Component"]
        EntryModal["VehicleEntryModal"]
        ExitModal["VehicleExitModal"]
        Charts["Analytics Charts (Bar / Line)"]
    end

    subgraph CoreServices["Client Business Services"]
        StateStore["App State Store (Zustand / Reactive)"]
        APIAdapter["API Client Adapter (api.ts)"]
    end

    subgraph BackendServices["Backend Micro-Modules"]
        ParkRouter["/api/v1/park Router"]
        BillRouter["/api/v1/billing Router"]
        AreaRouter["/api/v1/areas Router"]
        DBAdapter["Database Connection Pool"]
    end

    SideBar --> StateStore
    SlotGrid --> EntryModal
    SlotGrid --> ExitModal
    EntryModal --> StateStore
    ExitModal --> StateStore
    KpiCard --> StateStore
    Charts --> StateStore

    StateStore --> APIAdapter
    APIAdapter --> ParkRouter
    APIAdapter --> BillRouter
    APIAdapter --> AreaRouter

    ParkRouter --> DBAdapter
    BillRouter --> DBAdapter
    AreaRouter --> DBAdapter
```

### Diagram 3.3: Class Diagram (Object-Oriented Design)
```mermaid
classDiagram
    class Area {
        +String id
        +String name
        +String location
        +int capacity
        +DateTime createdAt
        +getAvailableSlots() int
        +getOccupiedSlots() int
    }

    class Slot {
        +String id
        +String slotNumber
        +String areaId
        +String slotType
        +boolean isOccupied
        +String currentVehicleNo
        +allocateVehicle(vehicleNo) boolean
        +releaseSlot() void
    }

    class ParkedVehicle {
        +String ticketId
        +String vehicleNo
        +String vehicleType
        +String ownerName
        +String contactNumber
        +String areaId
        +String slotNumber
        +DateTime entryTime
        +double ratePerHour
        +calculateCurrentFee(currentTime) double
    }

    class ParkingHistory {
        +String ticketId
        +String vehicleNo
        +String vehicleType
        +String ownerName
        +String contactNumber
        +String areaId
        +String slotNumber
        +DateTime entryTime
        +DateTime exitTime
        +double durationHours
        +int billedHours
        +double ratePerHour
        +double totalFee
        +String paymentMethod
        +String status
    }

    class TariffPolicy {
        +double carRatePerHour
        +double bikeRatePerHour
        +double truckRatePerHour
        +computeFee(vehicleType, entryTime, exitTime) double
    }

    Area "1" *-- "many" Slot : contains
    Area "1" o-- "many" ParkedVehicle : accommodates
    Area "1" o-- "many" ParkingHistory : records
    ParkedVehicle ..> TariffPolicy : references
    ParkingHistory ..> TariffPolicy : computes via
```

### Diagram 3.4: Sequence Diagram 1 — Vehicle Entry & Slot Allocation
```mermaid
sequenceDiagram
    autonumber
    actor Attendant as Parking Attendant
    participant UI as Web Frontend UI
    participant Service as Parking Service
    participant DB as PostgreSQL Database

    Attendant ->> UI: Selects Free Green Slot & Enters Vehicle No
    UI ->> Service: POST /api/v1/park (License, Type, Slot_ID, Area_ID)
    Service ->> DB: Query SELECT FROM parked_vehicles WHERE vehicle_no = License
    
    alt Vehicle Already Parked (Conflict)
        DB -->> Service: Duplicate Record Found
        Service -->> UI: 409 Conflict Error: "Vehicle already on site"
        UI -->> Attendant: Show Red Alert Modal
    else Vehicle Not Parked (Success)
        Service ->> DB: INSERT INTO parked_vehicles
        Service ->> DB: UPDATE slots SET is_occupied = TRUE WHERE id = Slot_ID
        DB -->> Service: Transaction Committed
        Service -->> UI: 201 Created (Ticket ID, Timestamp)
        UI -->> Attendant: Slot turns RED; Ticket Pass Printed
    end
```

### Diagram 3.5: Sequence Diagram 2 — Vehicle Exit & Billing Settlement
```mermaid
sequenceDiagram
    autonumber
    actor Attendant as Parking Attendant
    participant UI as Web Frontend UI
    participant Billing as Tariff Billing Engine
    participant DB as PostgreSQL Database

    Attendant ->> UI: Clicks Occupied Red Slot / Scans Ticket ID
    UI ->> Billing: calculateFee(entryTime, currentTime, vehicleType)
    Billing -->> UI: Returns Duration (e.g. 2.4 hrs), Billed (3 hrs), Total (₹60.00)
    UI -->> Attendant: Shows Billing Summary & Payment Dialog
    Attendant ->> UI: Selects Payment Mode (UPI / Cash) & Clicks "Confirm Exit"
    UI ->> DB: INSERT INTO parking_history (Ticket, Times, Fee, Method, Status)
    UI ->> DB: DELETE FROM parked_vehicles WHERE ticket_id = Ticket
    UI ->> DB: UPDATE slots SET is_occupied = FALSE, current_vehicle_no = NULL
    DB -->> UI: Transaction Committed Successfully
    UI -->> Attendant: Slot turns GREEN; Receipt Issued; Metrics Refreshed
```

### Diagram 3.6: Parking Slot State Transition Diagram
```mermaid
stateDiagram-v2
    [*] --> Available : System Initialization

    Available --> Reserved : Pre-booking / Gate Allocation
    Reserved --> Occupied : Vehicle Enters & Sensor/Attendant Confirms
    Available --> Occupied : Direct Walk-in / Drive-in Check-in

    Occupied --> PaymentPending : Exit Requested at Checkout
    PaymentPending --> Occupied : Payment Cancelled / Aborted
    PaymentPending --> Available : Payment Settled & Vehicle Departs

    Available --> UnderMaintenance : Slot Defect / Physical Inspection
    UnderMaintenance --> Available : Maintenance Completed & Re-opened

    Occupied --> [*] : Emergency Evacuation / Force Purge
```

### Diagram 3.7: Relational Entity-Relationship (ER) Diagram
```mermaid
erDiagram
    AREAS ||--|{ SLOTS : "contains (1:N)"
    AREAS ||--o{ PARKED_VEHICLES : "accommodates (1:N)"
    AREAS ||--o{ PARKING_HISTORY : "archives (1:N)"

    AREAS {
        varchar id PK "Primary Key (e.g. AREA-A)"
        varchar name "Facility Name"
        varchar location "Campus Wing / Landmark"
        int capacity "Total Slot Capacity (>0)"
        timestamp created_at "Created Timestamp"
    }

    SLOTS {
        varchar id PK "Primary Key (e.g. SLOT-A-01)"
        varchar slot_number UK "Unique Display No (A-01)"
        varchar area_id FK "References AREAS.id"
        varchar slot_type "Car | Bike | Truck"
        boolean is_occupied "Occupancy Flag (0 or 1)"
        varchar current_vehicle_no "Active Plate License No"
    }

    PARKED_VEHICLES {
        varchar ticket_id PK "Unique Ticket ID (TKT-1001)"
        varchar vehicle_no UK "Unique License Registration"
        varchar vehicle_type "Car | Bike | Truck"
        varchar owner_name "Driver / Owner Name"
        varchar contact_number "Phone Number"
        varchar area_id FK "References AREAS.id"
        varchar area_name "Denormalized Area Name"
        varchar slot_number "Slot Code"
        timestamp entry_time "Check-in Timestamp"
        numeric rate_per_hour "Tariff Rate per Hour"
    }

    PARKING_HISTORY {
        varchar ticket_id PK "Archived Ticket ID"
        varchar vehicle_no "License Plate"
        varchar vehicle_type "Car | Bike | Truck"
        varchar owner_name "Driver Name"
        varchar contact_number "Contact No"
        varchar area_id FK "References AREAS.id"
        varchar area_name "Area Name"
        varchar slot_number "Slot Code"
        timestamp entry_time "Entry Timestamp"
        timestamp exit_time "Exit Timestamp"
        numeric duration_hours "Exact Elapsed Time"
        int billed_hours "Ceiling Billed Hours"
        numeric rate_per_hour "Rate Applied"
        numeric total_fee "Total Charged Amount"
        varchar payment_method "Cash | UPI | Card"
        varchar status "COMPLETED"
    }
```

### Diagram 3.8: Physical Deployment Diagram
```mermaid
flowchart TD
    subgraph ClientDevice["Client Node (Security Booth Workstation / Mobile Tablet)"]
        Browser["Chrome / Edge / Firefox Browser"]
        ClientApp["React + Chart.js SPA Frontend"]
        Browser --- ClientApp
    end

    subgraph WebServerNode["Web Server Node (Nginx / Cloud Host)"]
        Nginx["Nginx Reverse Proxy & Static File Server"]
        Port80["Port 80 / 443 (HTTPS)"]
        Nginx --- Port80
    end

    subgraph AppServerNode["Application Server Node (Docker Container)"]
        FastAPI["Python 3.11 FastAPI / Uvicorn REST Service"]
        Port8000["Port 8000 (Internal Microservice)"]
        FastAPI --- Port8000
    end

    subgraph DBServerNode["Database Server Node"]
        PostgresService["PostgreSQL Database Daemon"]
        Port5432["Port 5432 (Internal Secure Network)"]
        PostgresService --- Port5432
    end

    ClientDevice ==>|"HTTPS Requests"| WebServerNode
    WebServerNode ==>|"Proxy Pass / API Dispatch"| AppServerNode
    AppServerNode ==>|"TCP / SQL Connection Pool"| DBServerNode
```

---

# UNIT 4: SOFTWARE TESTING MODELS

### Diagram 4.1: Software Engineering V-Model (V&V Mapping)
```mermaid
flowchart TD
    subgraph Verification["Verification (Constructive Engineering)"]
        V1["Requirements Analysis"]
        V2["System Architectural Design"]
        V3["Detailed Component Design"]
        V4["Code Construction (14.2 KLOC)"]
        V1 --> V2 --> V3 --> V4
    end

    subgraph Validation["Validation (Testing & Quality Assurance)"]
        T4["Unit Testing (Algorithmic Logic)"]
        T3["Integration Testing (UI to API Sync)"]
        T2["System Testing (End-to-End Workflows)"]
        T1["Acceptance Testing (Campus Operational Sign-off)"]
        T4 --> T3 --> T2 --> T1
    end

    V4 <==>|"Unit Tests"| T4
    V3 <==>|"Component Integration Tests"| T3
    V2 <==>|"System & Load Tests"| T2
    V1 <==>|"User Acceptance Tests"| T1
```

### Diagram 4.2: White Box Control Flow Graph (Basis Path Model)
```mermaid
flowchart TD
    N1["Node 1: Read Entry & Exit Time; Duration = Exit - Entry"]
    N2{"Node 2: Is Duration <= 15 Mins (Grace Period)?"}
    N3["Node 3: Total Fee = 0; Billed Hours = 0 (Free Exit)"]
    N4["Node 4: Billed Hours = ceil(Duration)"]
    N5{"Node 5: Vehicle Type Evaluator"}
    N6["Node 6: Rate = ₹10/hr (Bike)"]
    N7["Node 7: Rate = ₹20/hr (Car)"]
    N8["Node 8: Rate = ₹40/hr (Truck)"]
    N9["Node 9: Raise Invalid Type Exception"]
    N10["Node 10: Total Fee = Billed Hours * Rate; Return"]

    N1 --> N2
    N2 -- "True" --> N3
    N2 -- "False" --> N4
    N4 --> N5
    N5 -- "Bike" --> N6
    N5 -- "Car" --> N7
    N5 -- "Truck" --> N8
    N5 -- "Other" --> N9
    N6 --> N10
    N7 --> N10
    N8 --> N10
    N3 --> N10

    subgraph ComplexityMetrics["Cyclomatic Complexity Analysis"]
        CC1["Formula: V(G) = Predicate Nodes (P) + 1"]
        CC2["Predicates P = 4 (Nodes 2, 5-Bike, 5-Car, 5-Truck)"]
        CC3["V(G) = 4 + 1 = 5 Independent Basis Paths"]
    end
```

### Diagram 4.3: Black Box Equivalence Partitioning & Boundary Value Model
```mermaid
flowchart LR
    subgraph Partitions["Equivalence Partitions for Parking Duration"]
        P1["Partition 1 (Invalid)<br/>Duration <= 0 mins<br/>(Clock Skew / Error)"]
        P2["Partition 2 (Grace Period)<br/>0 < Duration <= 15 mins<br/>(Fee = ₹0.00)"]
        P3["Partition 3 (Standard Billing)<br/>15 mins < Duration <= 24 hrs<br/>(Rate * Billed Hours)"]
        P4["Partition 4 (Extended / Overstay)<br/>Duration > 24 hrs<br/>(Daily Cap & Alert)"]
    end

    subgraph BVA["Boundary Value Analysis (BVA) Test Points"]
        B1["14 Mins -> ₹0.00"]
        B2["15 Mins -> ₹0.00 (Boundary)"]
        B3["16 Mins -> 1 Hr Billed (Boundary)"]
        B4["59 Mins -> 1 Hr Billed"]
        B5["60 Mins -> 1 Hr Billed (Boundary)"]
        B6["61 Mins -> 2 Hrs Billed (Boundary)"]
    end

    P2 -.-> B1
    P2 -.-> B2
    P3 -.-> B3
    P3 -.-> B4
    P3 -.-> B5
    P3 -.-> B6
```

---

# UNIT 5: SOFTWARE PROJECT MANAGEMENT MODELS

### Diagram 5.1: Work Breakdown Structure (WBS)
```mermaid
flowchart TD
    WBS["1.0 Smart Parking Management System (SPMS)"]

    WBS --> W1["1.1 Project Inception & SRS"]
    WBS --> W2["1.2 System & Database Design"]
    WBS --> W3["1.3 Frontend UI Development"]
    WBS --> W4["1.4 Backend Engine & APIs"]
    WBS --> W5["1.5 Testing & Quality Assurance"]
    WBS --> W6["1.6 Deployment & Documentation"]

    W1 --> W11["1.1.1 Stakeholder Interviews"]
    W1 --> W12["1.1.2 SRS Document Compilation"]

    W2 --> W21["1.2.1 3-Tier Architecture Specs"]
    W2 --> W22["1.2.2 PostgreSQL DDL & ER Modeling"]

    W3 --> W31["1.3.1 Visual Slot Grid & Modals"]
    W3 --> W32["1.3.2 Chart.js Analytics Dashboards"]

    W4 --> W41["1.4.1 Slot State Allocator"]
    W4 --> W42["1.4.2 Tariff Calculation Engine"]

    W5 --> W51["1.5.1 White Box Path Coverage"]
    W5 --> W52["1.5.2 Black Box Equivalence Testing"]

    W6 --> W61["1.6.1 Docker Container Setup"]
    W6 --> W62["1.6.2 GitHub Pages & SIH Final Audit"]
```

### Diagram 5.2: Project Sprint Schedule & Timeline
```mermaid
flowchart LR
    subgraph Sprint1["Sprint 1 (Days 1 - 10)"]
        T1["Requirements Elicitation"] --> T2["SRS Definition"]
        T2 --> T3["Relational ER Schema Design"]
    end

    subgraph Sprint2["Sprint 2 (Days 11 - 22)"]
        T4["Interactive Slot Grid UI"] --> T5["Entry & Exit Modals"]
        T5 --> T6["Client State Store & LocalStorage"]
    end

    subgraph Sprint3["Sprint 3 (Days 23 - 34)"]
        T7["Tariff Calculation Engine"] --> T8["Chart.js Analytics Dashboards"]
        T8 --> T9["CSV Audit Export Utility"]
    end

    subgraph Sprint4["Sprint 4 (Days 35 - 45)"]
        T10["PostgreSQL DB Integration"] --> T11["White & Black Box Test Suites"]
        T11 --> T12["Production Deployment & Evaluation"]
    end

    T3 --> T4
    T6 --> T7
    T9 --> T10
```

### Diagram 5.3: COCOMO Estimation Process & Metrics Model
```mermaid
flowchart LR
    subgraph CodebaseMetrics["1. Code Size Measurement"]
        LOC["Logical SLOC Count = 14,201 Lines"] --> KLOC["KLOC = 14.2"]
    end

    subgraph EffortCalc["2. Effort Calculation (Organic Mode)"]
        KLOC --> Eq1["Effort E = a_b * (KLOC)^b_b"]
        Eq1 --> Constants1["a_b = 2.4, b_b = 1.05"]
        Constants1 --> ResEffort["E = 2.4 * (14.2)^1.05 = 38.91 Person-Months"]
    end

    subgraph TimeCalc["3. Development Duration"]
        ResEffort --> Eq2["Duration D = c_b * (E)^d_b"]
        Eq2 --> Constants2["c_b = 2.5, d_b = 0.38"]
        Constants2 --> ResTime["D = 2.5 * (38.91)^0.38 = 10.05 Months"]
    end

    subgraph StaffAndCost["4. Staffing & Financials"]
        ResEffort & ResTime --> Staff["Team Size P = E / D = 3.87 (~4 Developers)"]
        ResEffort --> Cost["Total Cost = E * ₹45,000 = ₹1,750,950 INR"]
    end
```

---
**Model Specification Status:** Verified and ready for visual presentation and viva defense under Course 25ITT33.
