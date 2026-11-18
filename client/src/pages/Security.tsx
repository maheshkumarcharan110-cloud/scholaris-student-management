import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound, Laptop, LogOut, ShieldCheck, UserRoundCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { formatDate, getErrorMessage } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  SectionHeading,
} from "@/components/ui";
import { ChangePasswordCard } from "@/components/account/change-password-card";
import { EmailChangeCard } from "@/components/account/email-change-card";

interface ActivityResponse {
  logins: Array<{
    id: string;
    success: boolean;
    reason: string | null;
    ip: string | null;
    userAgent: string | null;
    createdAt: string;
  }>;
  audits: Array<{
    id: string;
    action: string;
    detail: string | null;
    ip: string | null;
    createdAt: string;
  }>;
}

const actionLabels: Record<string, string> = {
  EMAIL_VERIFIED: "Email verified",
  EMAIL_CHANGE_REQUESTED: "Email change requested",
  EMAIL_CHANGED: "Email changed",
  PASSWORD_CHANGED: "Password changed",
  PASSWORD_RESET_COMPLETED: "Password reset completed",
  PROFILE_UPDATED: "Profile updated",
  SESSIONS_REVOKED: "All sessions revoked",
  ACCOUNT_APPROVED: "Account approved",
  ACCOUNT_REACTIVATED: "Account reactivated",
  ROLE_CHANGED: "Role changed",
};

export default function SecurityPage() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const activity = useQuery({
    queryKey: ["auth", "activity"],
    queryFn: () => api.get<ActivityResponse>("/auth/activity"),
  });

  const revoke = useMutation({
    mutationFn: () => api.post("/auth/logout-all"),
    onSuccess: async () => {
      setConfirmRevoke(false);
      toast.success("All sessions signed out", "Sign in again with your current credentials.");
      await logout();
      navigate("/login", { replace: true });
    },
    onError: (error) => toast.error("Couldn’t revoke sessions", getErrorMessage(error)),
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Account security"
        title="Security settings"
        description="Manage your password, sign-in email, active sessions, and review recent account activity."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-6">
          <ChangePasswordCard />

          <EmailChangeCard />

          <Card className="p-6">
            <SectionHeading
              title="Sessions"
              description="Revoke every issued session, including this one, if you suspect misuse."
            />
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-paper/40 px-4 py-3.5">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-ink-500">
                  <Laptop className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-ink-800">Current browser session</p>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    {user?.lastLoginAt ? `Last sign-in ${formatDate(user.lastLoginAt, "d MMM yyyy, HH:mm")}` : "Signed in with a secure httpOnly cookie"}
                  </p>
                </div>
              </div>
              <Badge variant="success" dot>
                Active
              </Badge>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setConfirmRevoke(true)}
              leftIcon={<LogOut className="h-4 w-4" />}
            >
              Sign out all sessions
            </Button>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <SectionHeading title="Account state" description="Server-enforced access controls." />
            <dl className="mt-5 space-y-3.5 text-[12px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-ink-400">
                  <UserRoundCheck className="h-3.5 w-3.5" />
                  Approval status
                </dt>
                <dd>
                  <Badge variant="success" dot>
                    Approved
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <dt className="flex items-center gap-2 text-ink-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Email verified
                </dt>
                <dd>
                  <Badge variant={user?.emailVerified ? "success" : "warning"} dot>
                    {user?.emailVerified ? "Verified" : "Not verified"}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <dt className="flex items-center gap-2 text-ink-400">
                  <KeyRound className="h-3.5 w-3.5" />
                  Password
                </dt>
                <dd className="font-medium text-ink-700">Hashed with bcrypt</dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-line pt-4 text-[11px] leading-5 text-ink-400">
              Passwords are never stored or displayed in plain text. Password, email, role, and status
              changes automatically invalidate older sessions.
            </p>
          </Card>

          <Card className="p-6">
            <SectionHeading
              title="Recent security activity"
              description="Your last sign-in attempts and account changes."
            />
            {activity.isLoading ? (
              <div className="mt-4 space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-10 animate-pulse rounded-lg bg-paper" />
                ))}
              </div>
            ) : activity.isError ? (
              <EmptyState icon={ShieldCheck} title="Couldn’t load activity" description={getErrorMessage(activity.error)} />
            ) : (
              <>
                {activity.data?.logins.length ? (
                  <ul className="mt-4 space-y-2">
                    {activity.data.logins.slice(0, 5).map((event) => (
                      <li key={event.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                        <span className={event.success ? "text-[11px] font-semibold text-sage-700" : "text-[11px] font-semibold text-clay-600"}>
                          {event.success ? "Successful sign-in" : event.reason?.replace(/_/g, " ").toLowerCase() ?? "Blocked"}
                        </span>
                        <span className="text-[10px] text-ink-400">{formatDate(event.createdAt, "d MMM, HH:mm")}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-[12px] text-ink-400">No sign-in history recorded yet.</p>
                )}

                {activity.data?.audits.length ? (
                  <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                    {activity.data.audits.slice(0, 5).map((entry) => (
                      <li key={entry.id} className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="text-ink-600">{actionLabels[entry.action] ?? entry.action}</span>
                        <span className="text-ink-400">{formatDate(entry.createdAt, "d MMM")}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        onConfirm={() => revoke.mutate()}
        title="Sign out every session?"
        description="Every device using this account will be signed out, including this browser. You will need to sign in again."
        confirmLabel="Sign out all sessions"
        loading={revoke.isPending}
      />
    </div>
  );
}
