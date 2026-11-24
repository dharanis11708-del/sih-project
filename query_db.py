"""
Smart Parking Management System (SPMS) - Database Query CLI Tool
Run queries against the project database directly from your PowerShell terminal.
"""

import sqlite3
import re
import sys
import os

DB_FILE = os.path.join(os.path.dirname(__file__), "smart_parking.db")
SQL_FILE = os.path.join(os.path.dirname(__file__), "smart_parking_postgres.sql")

def init_db():
    """Initializes SQLite database from smart_parking_postgres.sql if needed."""
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='parked_vehicles'")
    if cur.fetchone()[0] == 0:
        if os.path.exists(SQL_FILE):
            with open(SQL_FILE, "r", encoding="utf-8") as f:
                raw_sql = f.read()
            # Clean PostgreSQL syntax for SQLite
            statements = []
            current = []
            for line in raw_sql.splitlines():
                stripped = line.strip()
                if stripped.startswith("--") or not stripped:
                    continue
                current.append(line)
                if stripped.endswith(";"):
                    stmt = "\n".join(current).strip()
                    current = []
                    # Transform PG syntax
                    stmt = re.sub(r"\bDROP TABLE IF EXISTS (\w+) CASCADE;", r"DROP TABLE IF EXISTS \1;", stmt, flags=re.IGNORECASE)
                    stmt = re.sub(r"NUMERIC\(\d+,\s*\d+\)", "REAL", stmt)
                    stmt = re.sub(r"\bTRUE\b", "1", stmt, flags=re.IGNORECASE)
                    stmt = re.sub(r"\bFALSE\b", "0", stmt, flags=re.IGNORECASE)
                    statements.append(stmt)
            for stmt in statements:
                try:
                    cur.execute(stmt)
                except Exception as e:
                    pass
            conn.commit()
    return conn

def print_table(headers, rows, title=None):
    """Prints a clean ASCII table."""
    if title:
        print("\n" + "=" * 80)
        print(f"  {title}")
        print("=" * 80)
    
    if not rows:
        print("  (0 rows returned)")
        return

    # Calculate column widths
    str_rows = [[str(item if item is not None else "") for item in row] for row in rows]
    widths = [len(h) for h in headers]
    for row in str_rows:
        for i, val in enumerate(row):
            widths[i] = max(widths[i], len(val))

    # Format divider and header
    sep = "+-" + "-+-".join("-" * w for w in widths) + "-+"
    header_str = "| " + " | ".join(h.ljust(widths[i]) for i, h in enumerate(headers)) + " |"

    print(sep)
    print(header_str)
    print(sep)
    for row in str_rows:
        row_str = "| " + " | ".join(val.ljust(widths[i]) for i, val in enumerate(row)) + " |"
        print(row_str)
    print(sep)
    print(f"Total Rows: {len(rows)}\n")

def run_query(sql, title=None):
    conn = init_db()
    cur = conn.cursor()
    cur.execute(sql)
    headers = [desc[0] for desc in cur.description]
    rows = cur.fetchall()
    print_table(headers, rows, title)
    conn.close()

if __name__ == "__main__":
    init_db()
    args = sys.argv[1:]
    
    if not args or "--help" in args or "-h" in args:
        print("""
================================================================================
   SMART PARKING SYSTEM (SPMS) - TERMINAL DATABASE CHECKER
================================================================================
Usage:
  python query_db.py --parked      : Check all active parked vehicles on site
  python query_db.py --slots       : Check parking slots occupancy status
  python query_db.py --areas       : Check all parking facilities/areas
  python query_db.py --history     : Check completed billing transactions
  python query_db.py --revenue     : Show revenue breakdown by vehicle type
  python query_db.py --free        : Check all currently available/free slots
  python query_db.py --all         : Run full system audit report
  python query_db.py --sql "QUERY" : Run any custom SQL query

Examples:
  python query_db.py --parked
  python query_db.py --sql "SELECT vehicle_type, COUNT(*) FROM parked_vehicles GROUP BY vehicle_type"
================================================================================
        """)
        sys.exit(0)

    arg = args[0]
    if arg == "--parked":
        run_query("""
            SELECT ticket_id, vehicle_no, vehicle_type, owner_name, contact_number, slot_number, area_name, entry_time, rate_per_hour
            FROM parked_vehicles 
            ORDER BY entry_time DESC
        """, "ACTIVE PARKED VEHICLES (CURRENT OCCUPANCY)")

    elif arg == "--slots":
        run_query("""
            SELECT slot_number, area_id, slot_type, 
                   CASE WHEN is_occupied = 1 THEN 'OCCUPIED' ELSE 'FREE' END as status,
                   IFNULL(current_vehicle_no, '-') as current_vehicle
            FROM slots
            ORDER BY area_id, slot_number
            LIMIT 30
        """, "SLOT ALLOCATION STATUS (FIRST 30 SLOTS)")

    elif arg == "--areas":
        run_query("""
            SELECT id as area_id, name, location, capacity, created_at
            FROM areas
        """, "CAMPUS PARKING FACILITIES (AREAS)")

    elif arg == "--history":
        run_query("""
            SELECT ticket_id, vehicle_no, vehicle_type, owner_name, slot_number, 
                   duration_hours, billed_hours, rate_per_hour, total_fee, payment_method, status
            FROM parking_history
            ORDER BY exit_time DESC
            LIMIT 15
        """, "COMPLETED PARKING TRANSACTIONS & BILLING HISTORY (LATEST 15)")

    elif arg == "--revenue":
        run_query("""
            SELECT vehicle_type,
                   COUNT(*) as total_vehicles,
                   SUM(billed_hours) as total_billed_hours,
                   ROUND(AVG(duration_hours), 2) as avg_duration_hours,
                   SUM(total_fee) as total_revenue_rs,
                   ROUND(AVG(total_fee), 2) as avg_fee_rs
            FROM parking_history
            GROUP BY vehicle_type
            ORDER BY total_revenue_rs DESC
        """, "REVENUE & TRIPS BREAKDOWN BY VEHICLE TYPE")

    elif arg == "--free":
        run_query("""
            SELECT s.slot_number, s.area_id, a.name as area_name, s.slot_type
            FROM slots s
            JOIN areas a ON s.area_id = a.id
            WHERE s.is_occupied = 0
            ORDER BY s.area_id, s.slot_number
            LIMIT 25
        """, "AVAILABLE / FREE SLOTS (READY FOR PARKING)")

    elif arg == "--all":
        run_query("SELECT id, name, location, capacity FROM areas", "1. PARKING AREAS")
        run_query("""
            SELECT a.name as area,
                   COUNT(s.id) as total_slots,
                   SUM(CASE WHEN s.is_occupied = 1 THEN 1 ELSE 0 END) as occupied,
                   SUM(CASE WHEN s.is_occupied = 0 THEN 1 ELSE 0 END) as free,
                   ROUND((CAST(SUM(CASE WHEN s.is_occupied = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(s.id)) * 100, 1) || '%' as occupancy_pct
            FROM areas a
            JOIN slots s ON a.id = s.area_id
            GROUP BY a.id, a.name
        """, "2. AREA-WISE LIVE OCCUPANCY SUMMARY")
        run_query("""
            SELECT ticket_id, vehicle_no, vehicle_type, owner_name, slot_number, entry_time 
            FROM parked_vehicles 
            ORDER BY entry_time DESC
        """, "3. CURRENTLY PARKED VEHICLES")
        run_query("""
            SELECT vehicle_type, COUNT(*) as trips, SUM(total_fee) as revenue_rs
            FROM parking_history
            GROUP BY vehicle_type
        """, "4. TOTAL REVENUE PER VEHICLE TYPE")

    elif arg == "--sql":
        if len(args) < 2:
            print("Error: Please provide SQL query enclosed in quotes.")
            print('Example: python query_db.py --sql "SELECT * FROM areas"')
            sys.exit(1)
        custom_sql = args[1]
        run_query(custom_sql, f"CUSTOM QUERY: {custom_sql}")
    else:
        print(f"Unknown option '{arg}'. Run 'python query_db.py --help' for usage.")
