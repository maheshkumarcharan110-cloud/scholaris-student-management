import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  BookOpen,
  CalendarCheck2,
  Check,
  ClipboardList,
  GraduationCap,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/utils";
import { Avatar, Badge, Button, Card, PageHeader, SectionHeading } from "@/components/ui";
import { ChangePasswordCard } from "@/components/account/change-password-card";

const adminPermissions = [
  { icon: Users, label: "Student records", detail: "Register, update, and archive students." },
  { icon: GraduationCap, label: "Staff management", detail: "Create and manage teacher accounts." },
  { icon: BookOpen, label: "Classes & subjects", detail: "Build the academic structure for the school." },
  { icon: CalendarCheck2, label: "Attendance oversight", detail: "Review and record attendance across classes." },
  { icon: ClipboardList, label: "Examinations", detail: "Create exams, publish results, and lock marks." },
  { icon: Sparkles, label: "School-wide reporting", detail: "Access every report and performance view." },
];

const teacherPermissions = [
  { icon: CalendarCheck2, label: "Attendance registers", detail: "Record daily attendance for your classes." },
  { icon: ClipboardList, label: "Marks entry", detail: "Enter marks for subjects assigned to you." },
  { icon: BookOpen, label: "Class workspace", detail: "View classes, subjects, and student records." },
  { icon: Sparkles, label: "Reports", detail: "Review attendance and performance reports." },
];

export default function ProfilePage() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const label = roleLabel(user.role);
  const permissions = isAdmin ? adminPermissions : teacherPermissions;

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Account"
        title={isAdmin ? "Administrator profile" : "My profile"}
        description="Your identity, access level, and the permissions attached to this account."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-24 bg-ink-950" aria-hidden="true">
              <div className="ink-grid absolute inset-0 opacity-60" />
              <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-marigold-400/15 blur-2xl" />
            </div>
            <div className="relative px-6 pb-6 pt-12">
              <div className="flex flex-wrap items-end gap-4">
                <Avatar
                  name={user.name}
                  size="xl"
                  className="border-4 border-surface bg-marigold-400 text-ink-950 shadow-lg"
                />
                <div className="min-w-0 flex-1 pb-1">
                  <h2 className="truncate font-display text-2xl font-semibold text-ink-950">{user.name}</h2>
                  <p className="mt-0.5 truncate text-sm text-ink-400">{user.email}</p>
                  <Badge variant="accent" className="mt-2.5">
                    <ShieldCheck className="h-3 w-3" />
                    {label}
                  </Badge>
                </div>
              </div>

              <p className="mt-5 text-[13px] leading-6 text-ink-500">
                {isAdmin
                  ? "This account holds full administrative authority over the Scholaris workspace, including staff access and published results."
                  : "This account can work with class attendance, marks for assigned subjects, and school reports."}
              </p>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-paper/60 px-3.5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                    Account status
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-sage-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-sage-500" />
                    Active
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-paper/60 px-3.5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                    Access level
                  </p>
                  <p className="mt-1 truncate text-[13px] font-semibold text-ink-800">{label}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeading
              title="Permissions"
              description={
                isAdmin
                  ? "Administrator functions are enforced by the API, not just hidden in the interface."
                  : "Your teacher workspace is limited to the functions below."
              }
            />
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {permissions.map((permission) => (
                <li key={permission.label} className="flex items-start gap-3 rounded-xl border border-line bg-paper/40 p-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-marigold-50 text-marigold-700">
                    <permission.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-800">
                      <Check className="h-3 w-3 text-sage-600" />
                      {permission.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-ink-400">{permission.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <SectionHeading title="Account details" description="The identity used to sign in to Scholaris." />
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
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Role</dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink-800">{label}</dd>
                </div>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <p className="text-[12px] leading-5 text-ink-400">
                Sign out when you finish on a shared device.
              </p>
              <Button
                variant="outline"
                onClick={onSignOut}
                loading={signingOut}
                leftIcon={<LogOut className="h-4 w-4" />}
              >
                Sign out
              </Button>
            </div>
          </Card>

          <ChangePasswordCard />
        </div>
      </div>
    </div>
  );
}
