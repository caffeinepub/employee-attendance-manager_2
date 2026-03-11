import type { UserData } from "@/backend.d";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddEmployee,
  useAddManualAttendance,
  useGetAllAttendance,
  useGetAllBackgroundChecks,
  useGetAllEmployees,
  useGetStoreLocation,
  useSetBackgroundCheck,
  useSetStoreLocation,
} from "@/hooks/useQueries";
import {
  Bell,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

interface Notification {
  id: number;
  message: string;
  time: string;
}

interface Props {
  user: UserData;
  onLogout: () => void;
  notifications: Notification[];
}

const BG_STATUSES = ["Pending", "In Progress", "Cleared", "Failed"] as const;

function statusBadgeClass(status: string) {
  switch (status) {
    case "Cleared":
      return "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400";
    case "Failed":
      return "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400";
    case "In Progress":
      return "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400";
    default:
      return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400";
  }
}

export default function AdminDashboard({
  user,
  onLogout,
  notifications,
}: Props) {
  const { data: attendance = [], refetch: refetchAttendance } =
    useGetAllAttendance();
  const { data: employees = [], refetch: refetchEmployees } =
    useGetAllEmployees();
  const { data: storeLocation } = useGetStoreLocation();
  const { data: bgChecks = [], isLoading: bgChecksLoading } =
    useGetAllBackgroundChecks();

  const setStoreMutation = useSetStoreLocation();
  const addEmployeeMutation = useAddEmployee();
  const addManualMutation = useAddManualAttendance();
  const setBgCheckMutation = useSetBackgroundCheck();

  // Salary state
  const [salaryData, setSalaryData] = useState<
    Array<{ id: string; name: string; hours: number; total: number }>
  >([]);
  const [salaryGenerated, setSalaryGenerated] = useState(false);

  // Add employee form
  const [empForm, setEmpForm] = useState({
    username: "",
    password: "",
    name: "",
    salary: "",
  });

  // Manual attendance form
  const [manualForm, setManualForm] = useState({
    employeeId: "",
    date: new Date().toISOString().split("T")[0],
    checkIn: "",
    checkOut: "",
  });

  // Background check inline edit state: employeeId -> {status, notes}
  const [editingBgCheck, setEditingBgCheck] = useState<string | null>(null);
  const [bgEditForm, setBgEditForm] = useState({
    status: "Pending",
    notes: "",
  });

  function handleSetStoreLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await setStoreMutation.mutateAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          toast.success(
            `Store location set: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          );
        } catch {
          toast.error("Failed to set store location");
        }
      },
      () => toast.error("Could not get your location"),
    );
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addEmployeeMutation.mutateAsync({
        username: empForm.username,
        password: empForm.password,
        name: empForm.name,
        dailySalary: BigInt(empForm.salary || "0"),
      });
      setEmpForm({ username: "", password: "", name: "", salary: "" });
      toast.success("Employee added successfully");
    } catch {
      toast.error("Failed to add employee");
    }
  }

  async function handleManualAttendance(e: React.FormEvent) {
    e.preventDefault();
    const emp = employees.find((e) => e.employeeId === manualForm.employeeId);
    if (!emp) {
      toast.error("Employee not found");
      return;
    }
    try {
      let hoursWorked: bigint | null = null;
      if (manualForm.checkIn && manualForm.checkOut) {
        const [inH, inM] = manualForm.checkIn.split(":").map(Number);
        const [outH, outM] = manualForm.checkOut.split(":").map(Number);
        const diffMins = outH * 60 + outM - (inH * 60 + inM);
        hoursWorked = BigInt(Math.max(0, Math.floor(diffMins / 60)));
      }
      await addManualMutation.mutateAsync({
        employeeId: manualForm.employeeId,
        employeeName: emp.name || emp.username,
        date: manualForm.date,
        checkInTime: manualForm.checkIn,
        checkOutTime: manualForm.checkOut || null,
        hoursWorked,
      });
      setManualForm({
        employeeId: "",
        date: new Date().toISOString().split("T")[0],
        checkIn: "",
        checkOut: "",
      });
      toast.success("Manual attendance added");
    } catch {
      toast.error("Failed to add manual attendance");
    }
  }

  function generateSalary() {
    const empList = employees.filter((e) => e.role === "employee");
    const result = empList.map((emp) => {
      let totalHours = 0;
      for (const [, records] of attendance) {
        for (const r of records) {
          if (r.employeeId === emp.employeeId && r.hoursWorked != null) {
            totalHours += Number(r.hoursWorked);
          }
        }
      }
      const daily = Number(emp.dailySalary || 0);
      const hourly = daily / 8;
      return {
        id: emp.employeeId || "",
        name: emp.name || emp.username,
        hours: totalHours,
        total: Math.round(totalHours * hourly),
      };
    });
    setSalaryData(result);
    setSalaryGenerated(true);
  }

  function exportCSV() {
    let csv = "ID,Employee Name,Date,Check-In,Check-Out,Hours\n";
    for (const [, records] of attendance) {
      for (const r of records) {
        csv += `${r.employeeId},${r.employeeName},${r.date},${r.checkInTime},${r.checkOutTime || ""},${r.hoursWorked != null ? String(r.hoursWorked) : ""}\n`;
      }
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "attendance.csv";
    link.click();
  }

  function openBgEdit(employeeId: string) {
    const existing = bgChecks.find((c) => c.employeeId === employeeId);
    setBgEditForm({
      status: existing?.status || "Pending",
      notes: existing?.notes || "",
    });
    setEditingBgCheck(employeeId);
  }

  async function handleSaveBgCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBgCheck) return;
    try {
      await setBgCheckMutation.mutateAsync({
        employeeId: editingBgCheck,
        status: bgEditForm.status,
        notes: bgEditForm.notes,
        updatedDate: new Date().toISOString().split("T")[0],
      });
      toast.success("Background check updated");
      setEditingBgCheck(null);
    } catch {
      toast.error("Failed to update background check");
    }
  }

  // Flatten attendance records
  const allRecords = attendance.flatMap(([, recs]) => recs);

  const employeeList = employees.filter((e) => e.role === "employee");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="bg-sidebar border-b border-sidebar-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="font-display font-bold text-foreground tracking-tight">
                AttendTrack
              </span>
              <span className="ml-2 text-xs text-muted-foreground">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.name || user.username}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-display font-bold text-foreground">
            Admin Dashboard
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage attendance, employees, and payroll
          </p>
        </div>

        <Tabs defaultValue="attendance">
          <TabsList className="bg-muted/50 mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger data-ocid="admin.attendance.tab" value="attendance">
              <Clock className="w-4 h-4 mr-1.5" />
              Attendance
            </TabsTrigger>
            <TabsTrigger data-ocid="admin.employees.tab" value="employees">
              <Users className="w-4 h-4 mr-1.5" />
              Employees
            </TabsTrigger>
            <TabsTrigger data-ocid="admin.salary.tab" value="salary">
              <DollarSign className="w-4 h-4 mr-1.5" />
              Salary
            </TabsTrigger>
            <TabsTrigger data-ocid="admin.bgcheck.tab" value="bgcheck">
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              Background Check
            </TabsTrigger>
            <TabsTrigger
              data-ocid="admin.notifications.tab"
              value="notifications"
            >
              <Bell className="w-4 h-4 mr-1.5" />
              Notifications
              {notifications.length > 0 && (
                <Badge className="ml-1.5 bg-primary text-primary-foreground text-[10px] h-4 px-1">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ATTENDANCE TAB */}
          <TabsContent value="attendance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Store Location */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Store Location
                  </CardTitle>
                  <CardDescription>
                    Set GPS coordinates for check-in radius (200m)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {storeLocation ? (
                    <div className="text-sm bg-muted/50 rounded-md px-3 py-2 font-mono text-primary">
                      {storeLocation.latitude.toFixed(4)},{" "}
                      {storeLocation.longitude.toFixed(4)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No store location set
                    </p>
                  )}
                  <Button
                    data-ocid="admin.set_location_button"
                    onClick={handleSetStoreLocation}
                    disabled={setStoreMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="border-primary/40 text-primary hover:bg-primary/10"
                  >
                    {setStoreMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4 mr-1.5" />
                    )}
                    Set Current Location
                  </Button>
                </CardContent>
              </Card>

              {/* Manual Attendance */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="w-4 h-4 text-primary" />
                    Manual Attendance
                  </CardTitle>
                  <CardDescription>
                    Add attendance record manually
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleManualAttendance} className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Employee
                      </Label>
                      <Select
                        value={manualForm.employeeId}
                        onValueChange={(v) =>
                          setManualForm((p) => ({ ...p, employeeId: v }))
                        }
                      >
                        <SelectTrigger
                          data-ocid="admin.manual_attendance.select"
                          className="bg-muted/50"
                        >
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employeeList.map((e) => (
                            <SelectItem
                              key={e.employeeId || e.username}
                              value={e.employeeId || ""}
                            >
                              {e.name || e.username} ({e.employeeId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Date
                        </Label>
                        <Input
                          type="date"
                          value={manualForm.date}
                          onChange={(e) =>
                            setManualForm((p) => ({
                              ...p,
                              date: e.target.value,
                            }))
                          }
                          className="bg-muted/50 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Check In
                        </Label>
                        <Input
                          type="time"
                          value={manualForm.checkIn}
                          onChange={(e) =>
                            setManualForm((p) => ({
                              ...p,
                              checkIn: e.target.value,
                            }))
                          }
                          className="bg-muted/50 text-xs"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Check Out
                        </Label>
                        <Input
                          type="time"
                          value={manualForm.checkOut}
                          onChange={(e) =>
                            setManualForm((p) => ({
                              ...p,
                              checkOut: e.target.value,
                            }))
                          }
                          className="bg-muted/50 text-xs"
                        />
                      </div>
                    </div>
                    <Button
                      data-ocid="admin.manual_attendance.submit_button"
                      type="submit"
                      size="sm"
                      className="w-full bg-primary text-primary-foreground"
                      disabled={addManualMutation.isPending}
                    >
                      {addManualMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : null}
                      Add Record
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Attendance Table */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Attendance Records
                    <Badge variant="outline" className="ml-2 text-xs">
                      {allRecords.length}
                    </Badge>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refetchAttendance()}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      data-ocid="admin.export_csv.button"
                      variant="outline"
                      size="sm"
                      onClick={exportCSV}
                      className="border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div
                  data-ocid="admin.attendance.table"
                  className="overflow-x-auto"
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground text-xs">
                          Employee ID
                        </TableHead>
                        <TableHead className="text-muted-foreground text-xs">
                          Name
                        </TableHead>
                        <TableHead className="text-muted-foreground text-xs">
                          Date
                        </TableHead>
                        <TableHead className="text-muted-foreground text-xs">
                          Check In
                        </TableHead>
                        <TableHead className="text-muted-foreground text-xs">
                          Check Out
                        </TableHead>
                        <TableHead className="text-muted-foreground text-xs">
                          Hours
                        </TableHead>
                        <TableHead className="text-muted-foreground text-xs">
                          Type
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRecords.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-8 text-muted-foreground"
                            data-ocid="admin.attendance.empty_state"
                          >
                            No attendance records yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        allRecords.map((r, i) => (
                          <TableRow
                            key={`${r.employeeId}-${r.date}-${r.checkInTime}`}
                            className="border-border"
                            data-ocid={`admin.attendance.row.${i + 1}`}
                          >
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {r.employeeId}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {r.employeeName}
                            </TableCell>
                            <TableCell className="text-sm">{r.date}</TableCell>
                            <TableCell className="text-sm text-primary">
                              {r.checkInTime}
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.checkOutTime || (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.hoursWorked != null
                                ? `${r.hoursWorked}h`
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={r.isManual ? "outline" : "secondary"}
                                className="text-[10px]"
                              >
                                {r.isManual ? "Manual" : "Auto"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* EMPLOYEES TAB */}
          <TabsContent value="employees" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add Employee Form */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="w-4 h-4 text-primary" />
                    Add New Employee
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddEmployee} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Display Name</Label>
                      <Input
                        placeholder="Full name"
                        value={empForm.name}
                        onChange={(e) =>
                          setEmpForm((p) => ({ ...p, name: e.target.value }))
                        }
                        className="bg-muted/50"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Username</Label>
                      <Input
                        placeholder="Login username"
                        value={empForm.username}
                        onChange={(e) =>
                          setEmpForm((p) => ({
                            ...p,
                            username: e.target.value,
                          }))
                        }
                        className="bg-muted/50"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Password</Label>
                      <Input
                        type="password"
                        placeholder="Initial password"
                        value={empForm.password}
                        onChange={(e) =>
                          setEmpForm((p) => ({
                            ...p,
                            password: e.target.value,
                          }))
                        }
                        className="bg-muted/50"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Daily Salary (₹)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 800"
                        value={empForm.salary}
                        onChange={(e) =>
                          setEmpForm((p) => ({
                            ...p,
                            salary: e.target.value,
                          }))
                        }
                        className="bg-muted/50"
                        min="0"
                        required
                      />
                    </div>
                    <Button
                      data-ocid="admin.add_employee.submit_button"
                      type="submit"
                      className="w-full bg-primary text-primary-foreground"
                      disabled={addEmployeeMutation.isPending}
                    >
                      {addEmployeeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : null}
                      Add Employee
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Employee List */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Employees
                      <Badge variant="outline" className="ml-2 text-xs">
                        {employeeList.length}
                      </Badge>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refetchEmployees()}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground text-xs">
                            ID
                          </TableHead>
                          <TableHead className="text-muted-foreground text-xs">
                            Name
                          </TableHead>
                          <TableHead className="text-muted-foreground text-xs">
                            Username
                          </TableHead>
                          <TableHead className="text-muted-foreground text-xs">
                            Daily Salary
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeeList.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center py-6 text-muted-foreground text-sm"
                              data-ocid="admin.employees.empty_state"
                            >
                              No employees yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          employeeList.map((e, i) => (
                            <TableRow
                              key={e.employeeId || e.username}
                              className="border-border"
                              data-ocid={`admin.employees.row.${i + 1}`}
                            >
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {e.employeeId}
                              </TableCell>
                              <TableCell className="font-medium text-sm">
                                {e.name || e.username}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {e.username}
                              </TableCell>
                              <TableCell className="text-sm text-primary font-medium">
                                ₹
                                {e.dailySalary != null
                                  ? String(e.dailySalary)
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* SALARY TAB */}
          <TabsContent value="salary" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Salary Report</CardTitle>
                    <CardDescription>
                      Total pay based on hours worked
                    </CardDescription>
                  </div>
                  <Button
                    data-ocid="admin.generate_salary.button"
                    onClick={generateSalary}
                    className="bg-primary text-primary-foreground"
                  >
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    Generate Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground text-xs">
                          Employee ID
                        </TableHead>
                        <TableHead className="text-muted-foreground text-xs">
                          Name
                        </TableHead>
                        <TableHead className="text-muted-foreground text-xs">
                          Total Hours
                        </TableHead>
                        <TableHead className="text-muted-foreground text-xs">
                          Total Pay
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!salaryGenerated ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-8 text-muted-foreground text-sm"
                          >
                            Click "Generate Report" to calculate salary
                          </TableCell>
                        </TableRow>
                      ) : salaryData.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-8 text-muted-foreground text-sm"
                          >
                            No employees found
                          </TableCell>
                        </TableRow>
                      ) : (
                        salaryData.map((s, i) => (
                          <TableRow
                            key={s.id}
                            className="border-border"
                            data-ocid={`admin.salary.row.${i + 1}`}
                          >
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {s.id}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {s.name}
                            </TableCell>
                            <TableCell className="text-sm">
                              {s.hours}h
                            </TableCell>
                            <TableCell className="text-sm font-bold text-primary">
                              ₹{s.total.toLocaleString("en-IN")}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BACKGROUND CHECK TAB */}
          <TabsContent value="bgcheck" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Background Checks
                  <Badge variant="outline" className="ml-1 text-xs">
                    {employeeList.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Track and manage employee background verification status
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {bgChecksLoading ? (
                  <div
                    className="flex items-center justify-center py-12 text-muted-foreground gap-2"
                    data-ocid="admin.bgcheck.loading_state"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading background checks…</span>
                  </div>
                ) : employeeList.length === 0 ? (
                  <div
                    className="text-center py-12 text-muted-foreground"
                    data-ocid="admin.bgcheck.empty_state"
                  >
                    <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No employees to review</p>
                    <p className="text-xs mt-1">
                      Add employees first from the Employees tab
                    </p>
                  </div>
                ) : (
                  <div
                    data-ocid="admin.bgcheck.table"
                    className="overflow-x-auto"
                  >
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground text-xs">
                            Employee ID
                          </TableHead>
                          <TableHead className="text-muted-foreground text-xs">
                            Name
                          </TableHead>
                          <TableHead className="text-muted-foreground text-xs">
                            Status
                          </TableHead>
                          <TableHead className="text-muted-foreground text-xs">
                            Last Updated
                          </TableHead>
                          <TableHead className="text-muted-foreground text-xs">
                            Notes
                          </TableHead>
                          <TableHead className="text-muted-foreground text-xs">
                            Action
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeeList.map((emp, i) => {
                          const check = bgChecks.find(
                            (c) => c.employeeId === emp.employeeId,
                          );
                          const status = check?.status || "Pending";
                          const isEditing = editingBgCheck === emp.employeeId;
                          return (
                            <>
                              <TableRow
                                key={emp.employeeId || emp.username}
                                className="border-border"
                                data-ocid={`admin.bgcheck.row.${i + 1}`}
                              >
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  {emp.employeeId}
                                </TableCell>
                                <TableCell className="font-medium text-sm">
                                  {emp.name || emp.username}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`text-[11px] font-medium border ${statusBadgeClass(status)}`}
                                  >
                                    {status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {check?.updatedDate || <span>—</span>}
                                </TableCell>
                                <TableCell className="text-sm max-w-[180px] truncate text-muted-foreground">
                                  {check?.notes || <span>—</span>}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs border-primary/40 text-primary hover:bg-primary/10"
                                    data-ocid={`admin.bgcheck.update.button.${i + 1}`}
                                    onClick={() =>
                                      isEditing
                                        ? setEditingBgCheck(null)
                                        : openBgEdit(emp.employeeId || "")
                                    }
                                  >
                                    {isEditing ? "Cancel" : "Update"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                              {isEditing && (
                                <TableRow
                                  key={`${emp.employeeId}-edit`}
                                  className="border-border bg-muted/20"
                                >
                                  <TableCell colSpan={6} className="py-4 px-4">
                                    <motion.form
                                      initial={{ opacity: 0, y: -8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      onSubmit={handleSaveBgCheck}
                                      className="flex flex-col sm:flex-row gap-3 items-start sm:items-end"
                                    >
                                      <div className="space-y-1 min-w-[160px]">
                                        <Label className="text-xs text-muted-foreground">
                                          Status
                                        </Label>
                                        <Select
                                          value={bgEditForm.status}
                                          onValueChange={(v) =>
                                            setBgEditForm((p) => ({
                                              ...p,
                                              status: v,
                                            }))
                                          }
                                        >
                                          <SelectTrigger
                                            data-ocid="admin.bgcheck.status.select"
                                            className="bg-background text-sm h-8"
                                          >
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {BG_STATUSES.map((s) => (
                                              <SelectItem key={s} value={s}>
                                                {s}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-1 flex-1">
                                        <Label className="text-xs text-muted-foreground">
                                          Notes
                                        </Label>
                                        <Textarea
                                          data-ocid="admin.bgcheck.notes.input"
                                          value={bgEditForm.notes}
                                          onChange={(e) =>
                                            setBgEditForm((p) => ({
                                              ...p,
                                              notes: e.target.value,
                                            }))
                                          }
                                          placeholder="Add notes about the background check…"
                                          rows={2}
                                          className="bg-background text-sm resize-none"
                                        />
                                      </div>
                                      <Button
                                        data-ocid="admin.bgcheck.save.submit_button"
                                        type="submit"
                                        size="sm"
                                        className="bg-primary text-primary-foreground shrink-0"
                                        disabled={setBgCheckMutation.isPending}
                                      >
                                        {setBgCheckMutation.isPending ? (
                                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        ) : null}
                                        Save
                                      </Button>
                                    </motion.form>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOTIFICATIONS TAB */}
          <TabsContent value="notifications">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Check-In Notifications
                </CardTitle>
                <CardDescription>
                  Live feed of employee check-ins
                </CardDescription>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div
                    className="text-center py-12 text-muted-foreground"
                    data-ocid="admin.notifications.empty_state"
                  >
                    <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No notifications yet</p>
                    <p className="text-xs mt-1">
                      Notifications appear when employees check in
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {notifications.map((n, i) => (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-start gap-3 bg-muted/40 rounded-lg px-4 py-3"
                          data-ocid={`admin.notifications.item.${i + 1}`}
                        >
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {n.time}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()}. Built with ♥ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
