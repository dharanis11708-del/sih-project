# Smart Parking Management System (SPMS)
## DBMS Lab & Evaluation SQL Query Guide (PostgreSQL)

---

### Database Architecture Overview
- **Database Name**: `smart_parking_db`
- **Tables**:
  1. `areas` (Campus parking wings, capacity, and locations)
  2. `slots` (Individual slot allocations with foreign key to `areas`)
  3. `parked_vehicles` (Active vehicles currently parked on site)
  4. `parking_history` (Historical completed billing transactions with tariffs and timestamps)

---

### Top 10 Showcase SQL Queries for Faculty Evaluation

#### 1. Display All Active Parked Vehicles (Basic Selection & Ordering)
```sql
SELECT 
    ticket_id, 
    vehicle_no, 
    vehicle_type, 
    owner_name, 
    slot_number, 
    area_name, 
    entry_time, 
    rate_per_hour
FROM parked_vehicles
ORDER BY entry_time DESC;
```

#### 2. Multi-Table INNER JOIN (Vehicles with Parking Facility Master Details)
```sql
SELECT 
    pv.vehicle_no,
    pv.vehicle_type,
    pv.owner_name,
    pv.contact_number,
    s.slot_number,
    a.name AS parking_area,
    a.location AS campus_location,
    pv.entry_time
FROM parked_vehicles pv
JOIN slots s ON pv.slot_number = s.slot_number
JOIN areas a ON pv.area_id = a.id
ORDER BY a.name, s.slot_number;
```

#### 3. Revenue & Usage Summary by Vehicle Category (Aggregation & GROUP BY)
```sql
SELECT 
    vehicle_type,
    COUNT(*) AS total_trips,
    SUM(billed_hours) AS total_hours_billed,
    ROUND(AVG(duration_hours), 2) AS avg_duration_hours,
    SUM(total_fee) AS total_revenue_collected,
    ROUND(AVG(total_fee), 2) AS avg_ticket_fee
FROM parking_history
GROUP BY vehicle_type
ORDER BY total_revenue_collected DESC;
```

#### 4. Area-Wise Real-Time Occupancy Rate (Conditional Aggregation & Math)
```sql
SELECT 
    a.id AS area_code,
    a.name AS area_name,
    a.capacity AS total_capacity,
    COUNT(s.id) FILTER (WHERE s.is_occupied = TRUE) AS occupied_slots,
    COUNT(s.id) FILTER (WHERE s.is_occupied = FALSE) AS available_slots,
    ROUND((COUNT(s.id) FILTER (WHERE s.is_occupied = TRUE)::NUMERIC / a.capacity) * 100, 2) AS occupancy_percentage
FROM areas a
JOIN slots s ON a.id = s.area_id
GROUP BY a.id, a.name, a.capacity
ORDER BY occupancy_percentage DESC;
```

#### 5. Peak Parking Traffic Distribution (Hour Extraction & Sorting)
```sql
SELECT 
    EXTRACT(HOUR FROM entry_time) AS hour_of_day,
    TO_CHAR(entry_time, 'HH12:00 AM') AS time_window,
    COUNT(*) AS total_vehicle_entries,
    CASE 
        WHEN EXTRACT(HOUR FROM entry_time) IN (9, 10, 11) THEN 'MORNING PEAK'
        WHEN EXTRACT(HOUR FROM entry_time) IN (16, 17, 18) THEN 'EVENING PEAK'
        ELSE 'NORMAL TRAFFIC'
    END AS traffic_classification
FROM parking_history
GROUP BY EXTRACT(HOUR FROM entry_time), TO_CHAR(entry_time, 'HH12:00 AM')
ORDER BY hour_of_day;
```

#### 6. Nested Subquery (Transactions with Above-Average Billed Hours)
```sql
SELECT 
    ticket_id, 
    vehicle_no, 
    vehicle_type, 
    billed_hours, 
    total_fee, 
    entry_time, 
    exit_time
FROM parking_history
WHERE billed_hours > (SELECT AVG(billed_hours) FROM parking_history)
ORDER BY billed_hours DESC
LIMIT 10;
```

#### 7. Find All Unoccupied Slots per Area (LEFT JOIN / Filtering)
```sql
SELECT 
    s.slot_number, 
    s.slot_type, 
    a.name AS area_name, 
    a.location
FROM slots s
JOIN areas a ON s.area_id = a.id
WHERE s.is_occupied = FALSE
ORDER BY a.name, s.slot_number;
```

#### 8. Daily Revenue Trend for the Past 30 Days
```sql
SELECT 
    DATE(exit_time) AS transaction_date,
    COUNT(*) AS vehicles_served,
    SUM(total_fee) AS daily_revenue,
    ROUND(AVG(total_fee), 2) AS avg_fee_per_vehicle
FROM parking_history
GROUP BY DATE(exit_time)
ORDER BY transaction_date DESC
LIMIT 30;
```

#### 9. Window Function: Rank Highest Revenue Transactions per Vehicle Type
```sql
SELECT 
    vehicle_type,
    vehicle_no,
    billed_hours,
    total_fee,
    payment_method,
    DENSE_RANK() OVER (PARTITION BY vehicle_type ORDER BY total_fee DESC) AS revenue_rank
FROM parking_history
ORDER BY vehicle_type, revenue_rank
LIMIT 15;
```

#### 10. Payment Method Settlement Audit (Integrity Check)
```sql
SELECT 
    payment_method,
    COUNT(*) AS transaction_count,
    SUM(total_fee) AS settled_amount,
    ROUND((COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM parking_history)) * 100, 2) AS percentage_share
FROM parking_history
GROUP BY payment_method
ORDER BY settled_amount DESC;
```
