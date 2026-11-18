import { useState } from "react";
import { BadgeCheck, GraduationCap, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/utils";
import { Avatar, Badge, Button, Card, PageHeader, SectionHeading } from "@/components/ui";

const roleCopy: Record<string, { description: string }> = {
  SUPER_ADMIN: {
    description:
      "Full control of students, staff, classes, attendance, examinations, reports, and administrator access.",
  },
  ADMIN: {
    description: "Full access to students, staff, classes, attendance, exams, and reports.",
  },
  TEACHER: {
    description: "Access to your classes, attendance registers, marks entry, and reports.",
  },
  STUDENT: {
    description: "Access limited to your own profile, sign-in email, and security settings.",
  },
};

export default function SettingsPage() {
  const { user, logout, isAdmin } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const role = roleCopy[user.role] ?? { description: "" };
  const label = roleLabel(user.role);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Manage your account details, security, and session."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Avatar name={user.name} size="xl" />
              <div className="min-w-0">
                <h2 className="truncate font-display text-xl font-semibold text-ink-950">{user.name}</h2>
                <p className="mt-1 truncate text-sm text-ink-400">{user.email}</p>
                <Badge variant={isAdmin ? "accent" : "info"} className="mt-2.5">
                  {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
                  {label}
                </Badge>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-6 text-ink-500">{role.description}</p>
            <Link
              to="/profile"
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-600 transition hover:text-ink-900"
            >
              View profile
            </Link>
          </Card>

          <Card className="p-6">
            <SectionHeading title="Account details" description="Your sign-in identity at Scholaris." />
            <dl className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-paper text-ink-400">
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Full name</dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-ink-800">{user.name}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-paper text-ink-400">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Email address</dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-ink-800">{user.email}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-paper text-ink-400">
                  <BadgeCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Access level</dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink-800">{label}</dd>
                </div>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <SectionHeading
              title="Session"
              description="Sign out on shared or school devices when you’re finished."
            />
            <Button
              variant="outline"
              className="mt-4"
              onClick={onSignOut}
              loading={signingOut}
              leftIcon={<LogOut className="h-4 w-4" />}
            >
              Sign out
            </Button>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <SectionHeading
              title="Security"
              description="Password, sign-in email, sessions, and recent security activity."
            />
            <p className="mt-3 text-[12px] leading-5 text-ink-400">
              Your password is hashed with bcrypt. Changing it or your email revokes older sessions
              across every device.
            </p>
            <Link
              to="/security"
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 text-[13px] font-semibold text-white transition hover:bg-ink-900"
            >
              <ShieldCheck className="h-4 w-4" />
              Open security settings
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
