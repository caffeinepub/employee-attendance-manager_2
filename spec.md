# Employee Attendance Manager

## Current State
Admin dashboard has an employee list showing ID, name, username, and daily salary with no edit or delete options. Employee check-in validates the GPS geofence (200m) and shows a toast error when out-of-range, but the error is not prominently displayed inline on the dashboard. Backend has no deleteEmployee or updateEmployee functions.

## Requested Changes (Diff)

### Add
- Backend: `deleteEmployee(username: Text)` — removes employee from usersMap and attendanceMap
- Backend: `updateEmployee(username: Text, name: Text, employeeId: Text, dailySalary: Nat)` — updates employee fields
- Admin Dashboard: Edit button per employee row opens an inline/modal form to edit name, employeeId, and daily salary
- Admin Dashboard: Delete button per employee row with confirmation before deleting
- Employee Dashboard: Prominent inline error card/alert shown when check-in is attempted from outside the allowed geofence radius

### Modify
- Employee list table in admin: add Actions column with Edit and Delete buttons
- Check-in flow in EmployeeDashboard: store location-error message in state and display it as a visible alert beneath the check-in button

### Remove
- Nothing removed

## Implementation Plan
1. Add `deleteEmployee` and `updateEmployee` to backend/main.mo
2. Regenerate/update backend.d.ts bindings (via generated types)
3. In AdminDashboard: add edit modal/dialog state, edit form (name, employeeId, dailySalary), delete confirmation dialog, mutation hooks for both operations, and Actions column in employee table
4. In EmployeeDashboard: add locationCheckError state, set it when distance > geofenceRadius during check-in attempt, display as a red alert card below check-in section
