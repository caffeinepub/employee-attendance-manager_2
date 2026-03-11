import type { UserData } from "@/backend.d";
import { Role } from "@/backend.d";
import { Toaster } from "@/components/ui/sonner";
import AdminDashboard from "@/pages/AdminDashboard";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import LoginPage from "@/pages/LoginPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

interface Notification {
  id: number;
  message: string;
  time: string;
}

let notifCounter = 0;

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  function handleLogin(user: UserData) {
    setCurrentUser(user);
  }

  function handleLogout() {
    setCurrentUser(null);
  }

  function handleCheckIn(name: string) {
    notifCounter += 1;
    setNotifications((prev) => [
      {
        id: notifCounter,
        message: `${name} checked in`,
        time: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster richColors position="top-right" />
      {!currentUser && <LoginPage onLogin={handleLogin} />}
      {currentUser && currentUser.role === Role.admin && (
        <AdminDashboard
          user={currentUser}
          onLogout={handleLogout}
          notifications={notifications}
        />
      )}
      {currentUser && currentUser.role === Role.employee && (
        <EmployeeDashboard
          user={currentUser}
          onLogout={handleLogout}
          onCheckIn={handleCheckIn}
        />
      )}
    </QueryClientProvider>
  );
}
