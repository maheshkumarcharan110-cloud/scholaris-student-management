import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { Button, Field, Input } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";

const schema = z
  .object({
    password: z
      .string()
      .min(10, "Use at least 10 characters")
      .max(72, "Password is too long")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [done, setDone] = useState<string | null>(null);
  const [rootError, setRootError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: Values) => {
    setRootError(null);
    if (!token) {
      setRootError("This reset link is missing its secure token. Request a new link from the sign-in page.");
      return;
    }
    try {
      const response = await api.post<{ message: string }>("/auth/reset-password", {
        token,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      setDone(response.message);
    } catch (error) {
      setRootError(getErrorMessage(error));
    }
  };

  return (
    <AuthShell
      eyebrow="Choose a new password"
      title={done ? "Password updated" : "Set a new password"}
      description={
        done
          ? "Your old password and all other sessions have been invalidated."
          : "Pick a strong password you have not used elsewhere. You will use it the next time you sign in."
      }
      footer={
        <p className="flex items-center justify-center gap-1.5 text-[12px] text-ink-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Passwords are hashed with bcrypt and never displayed.
        </p>
      }
    >
      {rootError ? (
        <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-clay-200 bg-clay-50 px-3.5 py-3 text-[13px] leading-5 text-clay-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {rootError}
        </div>
      ) : null}

      {!token ? (
        <div className="rounded-2xl border border-marigold-200 bg-marigold-50 p-5 text-[13px] leading-6 text-marigold-800">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            This page needs a reset link
          </p>
          <p className="mt-1.5">
            Open the link from your password reset email, or request a fresh one from the sign-in page.
          </p>
          <Link
            to="/forgot-password"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold underline decoration-marigold-300 underline-offset-2"
          >
            Request a reset link
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : done ? (
        <>
          <div className="rounded-2xl border border-sage-200 bg-sage-50 p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-sage-700">
                <Check className="h-5 w-5" strokeWidth={3} />
              </span>
              <p className="text-[13px] leading-6 text-sage-800">{done}</p>
            </div>
          </div>
          <Link
            to="/login"
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 text-[13px] font-semibold text-white transition hover:bg-ink-900"
          >
            Sign in with your new password
            <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="New password" htmlFor="password" error={errors.password?.message} required>
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
          </Field>
          <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter the new password"
              className="h-11"
              invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword")}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            Update password
            {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
        </form>
      )}

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
