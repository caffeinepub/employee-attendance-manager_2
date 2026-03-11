# Employee Attendance Manager

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- Login page with username/password for admin and employee roles
- Admin panel:
  - Set store GPS location (used as geofence center)
  - Add new employees (username, password, daily salary)
  - Manual attendance entry (select employee, set check-in/check-out times)
  - View all attendance records in a table
  - Real-time check-in notifications feed
  - Salary report: calculate pay based on hours worked and daily salary rate
  - Export attendance records as CSV
- Employee panel:
  - Welcome greeting with employee name
  - Display current GPS coordinates
  - Check In button: verifies employee is within 200m of store location, records time
  - Live work timer (HH:MM:SS) counting up from check-in
  - Check Out button: records checkout time, computes hours worked
  - Auto-reset after 10 hours
- Persistent backend storage for users, attendance records, and store location

### Modify
N/A

### Remove
N/A

## Implementation Plan
1. Motoko backend: store employees, attendance records, store location (lat/lon)
2. Backend APIs: login, addEmployee, getEmployees, checkIn, checkOut, getAttendance, setStoreLocation, getStoreLocation, manualAttendance
3. Frontend: login page, admin dashboard (tabs: attendance, employees, salary, notifications), employee dashboard with GPS check-in/timer
4. GPS distance calculation in frontend using Haversine formula
5. CSV export from attendance data
