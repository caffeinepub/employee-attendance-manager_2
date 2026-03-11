import type { UserData } from "@/backend.d";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActor } from "@/hooks/useActor";
import { useLogin } from "@/hooks/useQueries";
import { Clock, Loader2, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

interface Props {
  onLogin: (user: UserData) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { actor, isFetching: isActorLoading } = useActor();
  const loginMutation = useLogin();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!actor) {
      setError("Still connecting to server, please try again in a moment.");
      return;
    }

    try {
      const user = await loginMutation.mutateAsync({ username, password });
      onLogin(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("User not found") || msg.includes("Wrong password")) {
        setError("Invalid username or password.");
      } else if (msg.includes("Not connected")) {
        setError("Still connecting to server, please try again.");
      } else {
        setError("Invalid username or password.");
      }
    }
  }

  const isConnecting = isActorLoading && !actor;

  return (
    <div
      data-ocid="login.page"
      className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden"
    >
      {/* Background geometric decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-border/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-border/20" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 mb-4 shadow-glow">
            <Clock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground font-display tracking-tight">
            AttendTrack
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Employee Attendance Management System
          </p>
        </div>

        <Card className="bg-card border-border shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                {isConnecting ? "Connecting to server..." : "Secure Sign In"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  data-ocid="login.input"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={isConnecting}
                  className="bg-muted/50 border-border focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  data-ocid="login.password.input"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={isConnecting}
                  className="bg-muted/50 border-border focus:border-primary"
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-destructive text-sm font-medium"
                  data-ocid="login.error_state"
                >
                  {error}
                </motion.p>
              )}

              <Button
                data-ocid="login.submit_button"
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                disabled={loginMutation.isPending || isConnecting}
              >
                {loginMutation.isPending || isConnecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isConnecting
                  ? "Connecting..."
                  : loginMutation.isPending
                    ? "Signing in..."
                    : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}
