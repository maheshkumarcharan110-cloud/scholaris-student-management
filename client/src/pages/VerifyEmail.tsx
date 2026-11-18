import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Loader2,
  MailCheck,
  MailWarning,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";
import { Button, Field, Input } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";

type Mode = "verify" | "change";

export function VerifyEmailPage({ mode = "verify" }: { mode?: Mode }) {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { refreshUser } = useAuth();

  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(token ? "loading" : "idle");
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendResult, setResendResult] = useState<{ message: string; verificationUrl?: string } | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    const endpoint = mode === "change" ? "/auth/verify-email-change" : "/auth/verify-email";
    api
      .post<{ message: string }>(endpoint, { token })
      .then(async (response) => {
        setState("success");
        setMessage(response.message);
        await refreshUser();
      })
      .catch((error) => {
        setState("error");
        setMessage(getErrorMessage(error));
      });
  }, [mode, refreshUser, token]);

  const onResend = async (event: React.FormEvent) => {
    event.preventDefault();
    setResending(true);
    setResendResult(null);
    try {
      const response = await api.post<{ message: string; verificationUrl?: string }>(
        "/auth/resend-verification",
        { email },
      );
      setResendResult(response);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setResending(false);
    }
  };

  const isChange = mode === "change";

  return (
    <AuthShell
      eyebrow={isChange ? "Email change" : "Email verification"}
      title={
        state === "success"
          ? isChange
            ? "Your sign-in email has been updated"
            : "Email address verified"
          : state === "error"
            ? "We could not verify that link"
            : isChange
              ? "Confirm your new email address"
              : "Verify your email address"
      }
      description={
        isChange
          ? "For your security, a new sign-in email only becomes active after it is confirmed from the new inbox."
          : "Verifying your email keeps your account recoverable and helps the administrator review your registration."
      }
      footer={
        <p className="flex items-center justify-center gap-1.5 text-[12px] text-ink-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Verification links are single-use and time-limited.
        </p>
      }
    >
      {state === "loading" ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-4 text-sm text-ink-600">
          <Loader2 className="h-4 w-4 animate-spin text-marigold-600" />
          Checking your verification link…
        </div>
      ) : null}

      {state === "success" ? (
        <>
          <div className="rounded-2xl border border-sage-200 bg-sage-50 p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-sage-700">
                <Check className="h-5 w-5" strokeWidth={3} />
              </span>
              <p className="text-[13px] leading-6 text-sage-800">{message}</p>
            </div>
          </div>
          <Link
            to="/login"
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 text-[13px] font-semibold text-white transition hover:bg-ink-900"
          >
            Continue to sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      ) : null}

      {state === "error" ? (
        <>
          <div className="rounded-2xl border border-clay-200 bg-clay-50 p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-clay-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <p className="text-[13px] leading-6 text-clay-700">{message}</p>
            </div>
          </div>
          {!isChange ? (
            <form onSubmit={onResend} className="mt-6 space-y-4">
              <Field label="Email address" htmlFor="resend-email" hint="We will send a fresh verification link.">
                <div className="relative">
                  <MailWarning className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                  <Input
                    id="resend-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@school.edu"
                    className="h-11 pl-10"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </Field>
              <Button type="submit" className="w-full" loading={resending}>
                Send a new verification link
              </Button>
            </form>
          ) : null}
          {resendResult ? (
            <div className="mt-4 rounded-xl border border-line bg-surface p-4 text-[12px] leading-5 text-ink-600">
              <p>{resendResult.message}</p>
              {resendResult.verificationUrl ? (
                <Link
                  to={resendResult.verificationUrl.replace(/^https?:\/\/[^/]+/, "")}
                  className="mt-2 inline-flex break-all font-semibold text-marigold-700 underline decoration-marigold-300 underline-offset-2"
                >
                  {resendResult.verificationUrl}
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {state === "idle" ? (
        <>
          {isChange ? (
            <div className="rounded-2xl border border-marigold-200 bg-marigold-50 p-5 text-[13px] leading-6 text-marigold-800">
              <p className="flex items-center gap-2 font-semibold">
                <MailCheck className="h-4 w-4" />
                Open the link from your new inbox
              </p>
              <p className="mt-1.5">
                The confirmation email contains a secure link that activates your new sign-in email.
                If it has expired, request the change again from Security settings.
              </p>
            </div>
          ) : (
            <form onSubmit={onResend} className="space-y-4">
              <Field label="Email address" htmlFor="resend-email" hint="We will send a fresh verification link if one is needed.">
                <div className="relative">
                  <MailCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                  <Input
                    id="resend-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@school.edu"
                    className="h-11 pl-10"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </Field>
              <Button type="submit" className="w-full" loading={resending}>
                Send verification link
              </Button>
            </form>
          )}
        </>
      ) : null}

      <Link
        to="/login"
        className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-500 transition hover:text-ink-900"
      >
        Back to sign in
      </Link>
    </AuthShell>
  );
}

export default function VerifyEmailRoute() {
  return <VerifyEmailPage />;
}
