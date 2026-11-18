import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Eye,
  EyeOff,
  GraduationCap,
  MailCheck,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";
import { Button, Field, Input, Select } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";
import { FullScreenLoader } from "@/components/auth-gate";

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(120, "Name is too long"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
    phone: z.string().trim().max(30, "Phone number is too long").optional(),
    requestedRole: z.enum(["TEACHER", "STUDENT"]),
    password: z
      .string()
      .min(10, "Use at least 10 characters")
      .max(72, "Password is too long")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

function passwordScore(password: string) {
  let score = 0;
  if (password.length >= 10) score += 1;
  if (password.length >= 14) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 5);
}

export default function RegisterPage() {
  const { user, isLoading } = useAuth();
  const [success, setSuccess] = useState<{ message: string; verificationUrl?: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", requestedRole: "TEACHER", password: "", confirmPassword: "" },
  });

  const password = watch("password");
  const score = passwordScore(password ?? "");

  if (isLoading) return <FullScreenLoader label="Preparing registration…" />;
  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (values: RegisterValues) => {
    setRootError(null);
    try {
      const response = await api.post<{ message: string; verificationUrl?: string }>("/auth/register", {
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        password: values.password,
        confirmPassword: values.confirmPassword,
        requestedRole: values.requestedRole,
      });
      setSuccess({ message: response.message, verificationUrl: response.verificationUrl });
    } catch (error) {
      const message = getErrorMessage(error);
      if (/email/i.test(message) && /exist|already/i.test(message)) {
        setError("email", { message });
      } else {
        setRootError(message);
      }
    }
  };

  if (success) {
    return (
      <AuthShell
        eyebrow="Registration received"
        title="Thank you — your request is with the administrator"
        description="No access has been granted yet. Here is what happens next."
      >
        <div className="rounded-2xl border border-sage-200 bg-sage-50 p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-sage-700">
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
            <p className="text-[13px] leading-6 text-sage-800">{success.message}</p>
          </div>
        </div>

        <ol className="mt-6 space-y-4">
          <li className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-[12px] font-semibold text-ink-700">
              1
            </span>
            <div>
              <p className="text-[13px] font-semibold text-ink-800">Administrator review</p>
              <p className="mt-0.5 text-[12px] leading-5 text-ink-400">
                Mahesh Kumar reviews your details and requested role.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-[12px] font-semibold text-ink-700">
              2
            </span>
            <div>
              <p className="text-[13px] font-semibold text-ink-800">Approval notification</p>
              <p className="mt-0.5 text-[12px] leading-5 text-ink-400">
                You will be notified by email once email delivery is configured.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-[12px] font-semibold text-ink-700">
              3
            </span>
            <div>
              <p className="text-[13px] font-semibold text-ink-800">Sign in</p>
              <p className="mt-0.5 text-[12px] leading-5 text-ink-400">
                Use the same email and password once your account is approved.
              </p>
            </div>
          </li>
        </ol>

        {success.verificationUrl ? (
          <div className="mt-6 rounded-xl border border-marigold-200 bg-marigold-50 p-4">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-marigold-800">
              <MailCheck className="h-4 w-4" />
              Development email preview
            </p>
            <p className="mt-1 text-[11px] leading-5 text-marigold-700">
              SMTP is not configured, so the verification link is shown here instead of being emailed.
            </p>
            <Link
              to={success.verificationUrl.replace(/^https?:\/\/[^/]+/, "")}
              className="mt-2 inline-flex break-all text-[11px] font-semibold text-marigold-800 underline decoration-marigold-300 underline-offset-2"
            >
              {success.verificationUrl}
            </Link>
          </div>
        ) : null}

        <div className="mt-7 flex flex-wrap gap-2">
          <Link
            to="/login"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 text-[13px] font-semibold text-white transition hover:bg-ink-900"
          >
            Go to sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/verify-email"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-[13px] font-semibold text-ink-700 transition hover:bg-paper"
          >
            Verify email
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Join Scholaris"
      title="Request your account"
      description="Tell us who you are. An administrator will review your request before access is granted."
      footer={
        <p className="flex items-center justify-center gap-1.5 text-[12px] text-ink-400">
          Already approved?
          <Link to="/login" className="font-semibold text-ink-700 underline decoration-ink-200 underline-offset-2 hover:text-ink-950">
            Sign in
          </Link>
        </p>
      }
    >
      {rootError ? (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-clay-200 bg-clay-50 px-3.5 py-3 text-[13px] leading-5 text-clay-700"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          {rootError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Full name" htmlFor="name" error={errors.name?.message} required>
          <div className="relative">
            <UserRoundPlus className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <Input
              id="name"
              autoComplete="name"
              placeholder="e.g. Ananya Iyer"
              className="h-11 pl-10"
              invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email address" htmlFor="email" error={errors.email?.message} required>
            <div className="relative">
              <MailCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
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

          <Field label="Phone (optional)" htmlFor="phone" error={errors.phone?.message}>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              className="h-11"
              invalid={Boolean(errors.phone)}
              {...register("phone")}
            />
          </Field>
        </div>

        <Field
          label="Account type"
          htmlFor="requestedRole"
          error={errors.requestedRole?.message}
          hint="Administrator roles are assigned only by the Super Administrator."
          required
        >
          <div className="relative">
            <GraduationCap className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <Select id="requestedRole" className="h-11 pl-10" {...register("requestedRole")}>
              <option value="TEACHER">Teacher — academic workspace</option>
              <option value="STUDENT">Student — my account only</option>
            </Select>
          </div>
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message} required>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a strong password"
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
          <div className="mt-2 flex items-center gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((step) => (
              <span
                key={step}
                className={
                  step <= score
                    ? score <= 2
                      ? "h-1 flex-1 rounded-full bg-clay-400"
                      : score === 3
                        ? "h-1 flex-1 rounded-full bg-marigold-400"
                        : "h-1 flex-1 rounded-full bg-sage-500"
                    : "h-1 flex-1 rounded-full bg-ink-100"
                }
              />
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-ink-400">
            At least 10 characters, including a letter and a number.
          </p>
        </Field>

        <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            className="h-11"
            invalid={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Submitting request…" : "Request account"}
          {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>

        <p className="flex items-start gap-2 rounded-xl border border-line bg-surface px-3.5 py-3 text-[11px] leading-5 text-ink-400">
          <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Registration does not grant access automatically. Your account stays pending until an
          administrator approves it.
        </p>
      </form>

      <Link
        to="/login"
        className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-500 transition hover:text-ink-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>
    </AuthShell>
  );
}
