import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/utils";
import { Button, Field, Input, Spinner } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { FullScreenLoader } from "@/components/auth-gate";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

// Administrator credentials are never shipped to the browser. The demo helper is
// limited to the seeded teacher account and only appears in development (or when
// VITE_SHOW_DEMO_ACCOUNTS=true is explicitly set).
const demoAccounts =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === "true"
    ? [{ label: "Teacher", email: "priya.sharma@scholaris.edu", password: "Teacher@12345" }]
    : [];

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (isLoading) return <FullScreenLoader label="Checking your session…" />;
  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (values: LoginValues) => {
    try {
      const signedIn = await login(values.email, values.password);
      toast.success(`Welcome back, ${signedIn.name.split(" ")[0]}.`, "Your workspace is ready.");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setError("root", { message: getErrorMessage(error) });
    }
  };

  const fillDemo = (email: string, password: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", password, { shouldValidate: true });
  };

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[1.04fr_1fr]">
      {/* Story panel */}
      <section className="relative hidden overflow-hidden bg-ink-950 px-12 py-10 text-white lg:flex lg:flex-col xl:px-16">
        <div className="ink-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -left-32 top-16 h-[420px] w-[420px] rounded-full bg-marigold-400/[0.13] blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 right-0 h-[380px] w-[380px] rounded-full bg-sage-500/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-marigold-400 text-ink-950">
            <GraduationCap className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-display text-2xl font-semibold leading-none">Scholaris</span>
            <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.24em] text-ink-300">
              Student management
            </span>
          </span>
        </div>

        <div className="relative my-auto max-w-xl py-12">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-marigold-300">
            <Sparkles className="h-3.5 w-3.5" />
            Academic operations, composed
          </p>
          <h1 className="mt-5 font-display text-[44px] font-semibold leading-[1.08] tracking-[-0.03em] text-white xl:text-[54px]">
            Every student.
            <br />
            Every day.
            <br />
            <span className="text-marigold-300">In clear view.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-ink-200">
            A calm, deliberate workspace for the people who keep a school moving — from the first
            roll call to the final report card.
          </p>

          <div className="mt-9 space-y-3.5">
            {[
              "Attendance in a few focused minutes",
              "Marks, grades and rank calculated for you",
              "Reports you can share without a spreadsheet",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-[13px] text-ink-100">
                <span className="grid h-5 w-5 place-items-center rounded-full border border-marigold-400/40 bg-marigold-400/10 text-marigold-300">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {feature}
              </div>
            ))}
          </div>

          <div className="mt-11 max-w-md rounded-2xl border border-white/[0.09] bg-white/[0.045] p-4 shadow-inset backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-300">
                  A snapshot of the daily flow
                </p>
                <p className="mt-1 text-[13px] font-semibold text-white">Monday roll call · Grade 9 A</p>
              </div>
              <CalendarCheck2 className="h-4 w-4 text-marigold-300" />
            </div>
            <div className="space-y-2.5 pt-3">
              {[
                { name: "Aarav Sharma", status: "Present" },
                { name: "Ishita Patel", status: "Present" },
                { name: "Rohan Khan", status: "Late" },
              ].map((row) => (
                <div key={row.name} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2.5 text-ink-100">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[9px] font-semibold text-white">
                      {row.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </span>
                    {row.name}
                  </span>
                  <span
                    className={
                      row.status === "Present"
                        ? "rounded-full bg-sage-500/20 px-2 py-0.5 text-[9px] font-semibold text-sage-200"
                        : "rounded-full bg-marigold-400/15 px-2 py-0.5 text-[9px] font-semibold text-marigold-200"
                    }
                  >
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 border-t border-white/[0.08] pt-2.5 text-[10px] text-ink-300">
              One pass. Saved at 09:02. The rest of the day is yours.
            </p>
          </div>
        </div>

        <div className="relative flex items-center justify-between border-t border-white/[0.08] pt-5 text-[10px] text-ink-400">
          <span>Scholaris · Student Management System</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure, role-based access
          </span>
        </div>
      </section>

      {/* Form panel */}
      <section className="relative flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10 lg:min-h-0 lg:px-12 xl:px-20">
        <div className="pointer-events-none absolute inset-0 bg-radial-fade lg:hidden" aria-hidden="true" />
        <div className="absolute right-5 top-5 z-10 sm:right-8 sm:top-7">
          <ThemeToggle showLabel />
        </div>

        <div className="relative mx-auto w-full max-w-[420px]">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-950 text-marigold-400">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-xl font-semibold leading-none text-ink-950">Scholaris</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-400">
                Student management
              </p>
            </div>
          </div>

          <p className="eyebrow">Welcome back</p>
          <h2 className="mt-2 font-display text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ink-950">
            Sign in to your workspace
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-400">
            Use the account provided by your school administrator.
          </p>

          {errors.root ? (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-xl border border-clay-200 bg-clay-50 px-3.5 py-3 text-[13px] leading-5 text-clay-700"
            >
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              {errors.root.message}
            </div>
          ) : null}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
            <Field label="Email address" htmlFor="email" error={errors.email?.message} required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@school.edu"
                  className="h-11 pl-10"
                  invalid={Boolean(errors.email)}
                  {...register("email")}
                />
              </div>
            </Field>

            <Field label="Password" htmlFor="password" error={errors.password?.message} required>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="h-11 pr-11"
                  invalid={Boolean(errors.password)}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-300 transition hover:bg-paper hover:text-ink-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
              {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>

          {demoAccounts.length ? (
            <div className="mt-7 rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                  Demo access
                </p>
                <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-medium text-ink-400">
                  Seeded teacher
                </span>
              </div>
              <p className="mt-1.5 text-[12px] leading-5 text-ink-400">
                Fill in the demo teacher account, then sign in. Administrator credentials are
                configured privately on the server.
              </p>
              <div className="mt-3 grid gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.label}
                    type="button"
                    onClick={() => fillDemo(account.email, account.password)}
                    className="rounded-lg border border-line bg-white px-3 py-2.5 text-left transition hover:border-ink-200 hover:bg-paper/60"
                  >
                    <span className="block text-[12px] font-semibold text-ink-800">{account.label}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-ink-400">{account.email}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-ink-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Administrator access is provisioned securely on the server.
          </p>
        </div>
      </section>
    </div>
  );
}

export function LoginFallback() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner className="h-6 w-6 text-ink-400" />
    </div>
  );
}
