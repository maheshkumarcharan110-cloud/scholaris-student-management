import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Mail, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { Button, Field, Input } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";

const schema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
});

type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [result, setResult] = useState<{ message: string; resetUrl?: string } | null>(null);
  const [rootError, setRootError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = async (values: Values) => {
    setRootError(null);
    try {
      const response = await api.post<{ message: string; resetUrl?: string }>("/auth/forgot-password", values);
      setResult(response);
    } catch (error) {
      setRootError(getErrorMessage(error));
    }
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      title={result ? "Check your inbox" : "Forgot your password?"}
      description={
        result
          ? "For everyone's safety, we show the same confirmation whether or not an account exists."
          : "Enter the email address on your Scholaris account and we will send a secure, single-use reset link."
      }
      footer={
        <p className="flex items-center justify-center gap-1.5 text-[12px] text-ink-400">
          Remembered it?
          <Link to="/login" className="font-semibold text-ink-700 underline decoration-ink-200 underline-offset-2 hover:text-ink-950">
            Sign in
          </Link>
        </p>
      }
    >
      {rootError ? (
        <div role="alert" className="mb-5 rounded-xl border border-clay-200 bg-clay-50 px-3.5 py-3 text-[13px] text-clay-700">
          {rootError}
        </div>
      ) : null}

      {result ? (
        <>
          <div className="rounded-2xl border border-sage-200 bg-sage-50 p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-sage-700">
                <Check className="h-5 w-5" strokeWidth={3} />
              </span>
              <p className="text-[13px] leading-6 text-sage-800">{result.message}</p>
            </div>
          </div>
          {result.resetUrl ? (
            <div className="mt-4 rounded-xl border border-marigold-200 bg-marigold-50 p-4">
              <p className="text-[12px] font-semibold text-marigold-800">Development email preview</p>
              <p className="mt-1 text-[11px] leading-5 text-marigold-700">
                SMTP is not configured, so the reset link is shown here.
              </p>
              <Link
                to={result.resetUrl.replace(/^https?:\/\/[^/]+/, "")}
                className="mt-2 inline-flex break-all text-[11px] font-semibold text-marigold-800 underline decoration-marigold-300 underline-offset-2"
              >
                {result.resetUrl}
              </Link>
            </div>
          ) : null}
          <Link
            to="/login"
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 text-[13px] font-semibold text-white transition hover:bg-ink-900"
          >
            Back to sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            Send reset link
            {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
          <p className="flex items-start gap-2 rounded-xl border border-line bg-surface px-3.5 py-3 text-[11px] leading-5 text-ink-400">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Reset links expire after 60 minutes. Resetting your password signs out every other device.
          </p>
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
