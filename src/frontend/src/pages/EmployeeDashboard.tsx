import type { UserData } from "@/backend.d";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useCheckIn,
  useCheckOut,
  useGetStoreLocation,
} from "@/hooks/useQueries";
import { haversineDistance } from "@/lib/haversine";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
  user: UserData;
  onLogout: () => void;
  onCheckIn: (name: string) => void;
}

const CHECK_IN_RADIUS_M = 200;
const AUTO_RESET_HOURS = 10;

export default function EmployeeDashboard({
  user,
  onLogout,
  onCheckIn,
}: Props) {
  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [checkedIn, setCheckedIn] = useState(false);
  const [workStartMs, setWorkStartMs] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoResetRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: storeLocation } = useGetStoreLocation();
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  // Fetch GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        setLocationError("");
      },
      () => setLocationError("Could not get your location"),
    );
  }, []);

  // Timer tick
  useEffect(() => {
    if (checkedIn && workStartMs !== null) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - workStartMs);
      }, 1000);

      // Auto-reset after 10 hours
      autoResetRef.current = setInterval(() => {
        const diff = Date.now() - workStartMs;
        if (diff >= AUTO_RESET_HOURS * 3600000) {
          handleAutoReset();
        }
      }, 60000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoResetRef.current) clearInterval(autoResetRef.current);
    };
  }, [checkedIn, workStartMs]);

  const handleAutoReset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoResetRef.current) clearInterval(autoResetRef.current);
    setCheckedIn(false);
    setWorkStartMs(null);
    setElapsed(0);
    toast.info("Shift auto-reset after 10 hours");
  }, []);

  function formatElapsed(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [
      String(h).padStart(2, "0"),
      String(m).padStart(2, "0"),
      String(s).padStart(2, "0"),
    ].join(":");
  }

  async function handleCheckIn() {
    if (!storeLocation) {
      toast.error("Admin must set store location first");
      return;
    }
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const dist = haversineDistance(
          pos.coords.latitude,
          pos.coords.longitude,
          storeLocation.latitude,
          storeLocation.longitude,
        );
        if (dist > CHECK_IN_RADIUS_M) {
          toast.error(
            `You are ${Math.round(dist)}m from the store. Must be within ${CHECK_IN_RADIUS_M}m.`,
          );
          return;
        }
        const now = new Date();
        try {
          await checkInMutation.mutateAsync({
            employeeId: user.employeeId || "",
            employeeName: user.name || user.username,
            date: now.toLocaleDateString(),
            checkInTime: now.toLocaleTimeString(),
          });
          const startMs = now.getTime();
          setWorkStartMs(startMs);
          setCheckedIn(true);
          setElapsed(0);
          onCheckIn(user.name || user.username);
          setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          toast.success("Checked in successfully!");
        } catch {
          toast.error("Check-in failed. Please try again.");
        }
      },
      () => toast.error("Could not get your location"),
    );
  }

  async function handleCheckOut() {
    if (!workStartMs) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoResetRef.current) clearInterval(autoResetRef.current);

    const now = new Date();
    const diffMs = now.getTime() - workStartMs;
    const hoursWorked = BigInt(Math.max(0, Math.floor(diffMs / 3600000)));

    try {
      await checkOutMutation.mutateAsync({
        employeeId: user.employeeId || "",
        checkOutTime: now.toLocaleTimeString(),
        hoursWorked,
      });
      setCheckedIn(false);
      setWorkStartMs(null);
      setElapsed(diffMs);
      toast.success(`Checked out. Total: ${formatElapsed(diffMs)}`);
    } catch {
      toast.error("Check-out failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-sidebar border-b border-sidebar-border sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display font-bold text-foreground tracking-tight">
              AttendTrack
            </span>
          </div>
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
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-display font-bold text-foreground">
            Welcome back,{" "}
            <span className="text-primary">{user.name || user.username}</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Employee ID: {user.employeeId} &middot;{" "}
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </motion.div>

        {/* Status + Timer Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card
            data-ocid="employee.timer.panel"
            className={`bg-card border-border overflow-hidden transition-all duration-500 ${
              checkedIn ? "shadow-glow" : ""
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Work Session</CardTitle>
                <Badge
                  className={`text-xs ${
                    checkedIn
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                  variant="outline"
                >
                  {checkedIn ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
                      Active
                    </span>
                  ) : (
                    "Inactive"
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="text-5xl font-display font-bold timer-font text-foreground mb-2">
                  {formatElapsed(elapsed)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {checkedIn ? "Time elapsed this shift" : "Ready to start"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <Button
                  data-ocid="employee.checkin_button"
                  onClick={handleCheckIn}
                  disabled={
                    checkedIn || checkInMutation.isPending || !storeLocation
                  }
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  {checkInMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4 mr-1.5" />
                  )}
                  Check In
                </Button>
                <Button
                  data-ocid="employee.checkout_button"
                  onClick={handleCheckOut}
                  disabled={!checkedIn || checkOutMutation.isPending}
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  {checkOutMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4 mr-1.5" />
                  )}
                  Check Out
                </Button>
              </div>

              {!storeLocation && (
                <p
                  className="text-xs text-destructive/80 text-center mt-3"
                  data-ocid="employee.checkin.error_state"
                >
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Store location not set. Contact admin.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* GPS Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {locationError ? (
                <div
                  className="flex items-center gap-2 text-destructive text-sm"
                  data-ocid="employee.location.error_state"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {locationError}
                </div>
              ) : location ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Your Location
                    </span>
                    <span className="font-mono text-xs text-primary">
                      {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                    </span>
                  </div>
                  {storeLocation && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Store Location
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {storeLocation.latitude.toFixed(4)},{" "}
                        {storeLocation.longitude.toFixed(4)}
                      </span>
                    </div>
                  )}
                  {storeLocation && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Distance
                      </span>
                      <div>
                        {(() => {
                          const dist = Math.round(
                            haversineDistance(
                              location.lat,
                              location.lon,
                              storeLocation.latitude,
                              storeLocation.longitude,
                            ),
                          );
                          return (
                            <span
                              className={`font-mono text-xs ${
                                dist <= CHECK_IN_RADIUS_M
                                  ? "text-primary"
                                  : "text-destructive"
                              }`}
                            >
                              {dist}m{" "}
                              {dist <= CHECK_IN_RADIUS_M ? (
                                <CheckCircle2 className="w-3 h-3 inline" />
                              ) : (
                                <AlertCircle className="w-3 h-3 inline" />
                              )}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching location...
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setLocation({
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude,
                      });
                      setLocationError("");
                    },
                    () => setLocationError("Could not get your location"),
                  );
                }}
              >
                <MapPin className="w-3.5 h-3.5 mr-1.5" />
                Refresh Location
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground mt-8">
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
