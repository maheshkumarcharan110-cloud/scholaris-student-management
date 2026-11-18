import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  LogIn,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
  UserRoundPlus,
  Users,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { accountStatusLabel, accountStatusTone, formatDate, getErrorMessage, roleLabel } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  SectionHeading,
  StatCard,
  TableSkeleton,
} from "@/components/ui";

interface RecentRegistration {
  id: string;
  name: string;
  email: string;
  role: string;
  requestedRole: string | null;
  status: string;
  createdAt: string;
}

interface Overview {
  totalUsers: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  roles: Record<string, number>;
  recentRegistrations: RecentRegistration[];
  recentLogins: Array<{
    id: string;
    email: string;
    success: boolean;
    reason: string | null;
    ip: string | null;
    createdAt: string;
    user: { id: string; name: string } | null;
  }>;
}

export default function AdminOverviewPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => api.get<Overview>("/admin/overview"),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/approve`, {}),
    onSuccess: () => {
      toast.success("Registration approved", "The applicant can now sign in.");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error) => toast.error("Couldn’t approve registration", getErrorMessage(error)),
  });

  const reject = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/reject`, {}),
    onSuccess: () => {
      toast.success("Registration rejected", "The account cannot sign in.");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error) => toast.error("Couldn’t reject registration", getErrorMessage(error)),
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Administration"
        title="Account overview"
        description="Registration demand, approval queue health, and the most recent sign-in activity."
        actions={
          <>
            <Link
              to="/admin/users?status=PENDING"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-[12px] font-semibold text-ink-700 transition hover:bg-paper"
            >
              <Clock3 className="h-4 w-4" />
              Review queue
            </Link>
            <Link
              to="/admin/users"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink-950 px-3.5 text-[12px] font-semibold text-white transition hover:bg-ink-900"
            >
              <Users className="h-4 w-4" />
              All users
            </Link>
          </>
        }
      />

      {isLoading || !data ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[132px] animate-pulse rounded-2xl border border-line bg-surface" />
            ))}
          </div>
          <Card>
            <TableSkeleton rows={5} cols={4} />
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Pending approvals"
              value={data.pending}
              hint={
                data.pending > 0 ? (
                  <Link to="/admin/users?status=PENDING" className="font-semibold text-marigold-700 hover:underline">
                    Waiting for your review →
                  </Link>
                ) : (
                  "No registrations waiting."
                )
              }
              icon={Clock3}
              accent="marigold"
            />
            <StatCard label="Approved accounts" value={data.approved} hint="Can sign in with assigned permissions." icon={UserRoundCheck} accent="sage" />
            <StatCard label="Suspended" value={data.suspended} hint="Access blocked, history preserved." icon={ShieldAlert} accent="clay" />
            <StatCard label="Total accounts" value={data.totalUsers} hint="Parents, staff, and students." icon={Users} accent="ink" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                <SectionHeading
                  title="Pending registrations"
                  description="Approve to grant access, or reject to keep the account closed."
                />
                <Link
                  to="/admin/users?status=PENDING"
                  className="text-[12px] font-semibold text-ink-600 transition hover:text-ink-950"
                >
                  Open queue →
                </Link>
              </div>

              {data.recentRegistrations.filter((user) => user.status === "PENDING").length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title="The approval queue is clear"
                  description="New public registrations appear here and in the pending users list."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {data.recentRegistrations
                    .filter((user) => user.status === "PENDING")
                    .map((user) => (
                      <li key={user.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[13px] font-semibold text-ink-900">{user.name}</p>
                            <Badge variant={accountStatusTone(user.status)} dot>
                              {accountStatusLabel(user.status)}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-ink-400">{user.email}</p>
                          <p className="mt-1 text-[11px] text-ink-400">
                            Requested {roleLabel(user.requestedRole ?? user.role)} · registered {formatDate(user.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => approve.mutate(user.id)}
                            loading={approve.isPending && approve.variables === user.id}
                            leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reject.mutate(user.id)}
                            loading={reject.isPending && reject.variables === user.id}
                            leftIcon={<XCircle className="h-3.5 w-3.5" />}
                          >
                            Reject
                          </Button>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </Card>

            <div className="space-y-6">
              <Card className="p-5">
                <SectionHeading title="Accounts by role" description="Current access distribution." />
                <div className="mt-4 space-y-3">
                  {(["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"] as const).map((role) => {
                    const count = data.roles[role] ?? 0;
                    const percent = data.totalUsers ? Math.round((count / data.totalUsers) * 100) : 0;
                    return (
                      <div key={role}>
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="font-medium text-ink-700">{roleLabel(role)}</span>
                          <span className="tabular-nums text-ink-400">{count}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                          <div className="h-full rounded-full bg-marigold-400" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 text-[12px]">
                  <div>
                    <p className="text-ink-400">Rejected</p>
                    <p className="mt-0.5 font-semibold text-ink-800 tabular-nums">{data.rejected}</p>
                  </div>
                  <div>
                    <p className="text-ink-400">Approved</p>
                    <p className="mt-0.5 font-semibold text-ink-800 tabular-nums">{data.approved}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <SectionHeading
                  title="Recent sign-in activity"
                  description="Successful and blocked attempts."
                  action={
                    <Link to="/admin/activity" className="text-[12px] font-semibold text-ink-500 hover:text-ink-900">
                      All logs
                    </Link>
                  }
                />
                {data.recentLogins.length === 0 ? (
                  <p className="mt-4 text-[12px] text-ink-400">No sign-in attempts recorded yet.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {data.recentLogins.slice(0, 6).map((event) => (
                      <li key={event.id} className="flex items-start gap-2.5">
                        <span
                          className={
                            event.success
                              ? "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sage-50 text-sage-700"
                              : "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-clay-50 text-clay-600"
                          }
                        >
                          <LogIn className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium text-ink-800">
                            {event.user?.name ?? event.email}
                          </p>
                          <p className="text-[10px] text-ink-400">
                            {event.success ? "Signed in" : `Blocked · ${event.reason ?? "failed"}`} · {formatDate(event.createdAt, "d MMM, HH:mm")}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          <Card className="p-5">
            <SectionHeading
              title="Latest registrations"
              description="Every account that has joined the approval workflow."
              action={
                <Link to="/admin/users" className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-600 hover:text-ink-950">
                  Manage users <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[12px]">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase tracking-[0.12em] text-ink-400">
                    <th className="pb-2 font-semibold">Applicant</th>
                    <th className="pb-2 font-semibold">Requested role</th>
                    <th className="pb-2 font-semibold">Registered</th>
                    <th className="pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.recentRegistrations.map((user) => (
                    <tr key={user.id}>
                      <td className="py-2.5">
                        <p className="font-medium text-ink-800">{user.name}</p>
                        <p className="text-[11px] text-ink-400">{user.email}</p>
                      </td>
                      <td className="py-2.5 text-ink-600">{roleLabel(user.requestedRole ?? user.role)}</td>
                      <td className="py-2.5 text-ink-500">{formatDate(user.createdAt)}</td>
                      <td className="py-2.5">
                        <Badge variant={accountStatusTone(user.status)} dot>
                          {accountStatusLabel(user.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="flex items-center gap-2 text-[11px] text-ink-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Approvals, role changes, and suspensions are enforced by the API and recorded in the audit log.
          </p>
        </div>
      )}
    </div>
  );
}
