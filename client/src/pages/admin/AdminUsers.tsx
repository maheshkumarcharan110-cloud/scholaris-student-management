import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  History,
  MailCheck,
  MailWarning,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UserRoundCheck,
  Users,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import {
  accountStatusLabel,
  accountStatusTone,
  formatDate,
  getErrorMessage,
  roleLabel,
} from "@/lib/utils";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  TableSkeleton,
  Tabs,
  Textarea,
} from "@/components/ui";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  requestedRole: string | null;
  status: string;
  active: boolean;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  pendingEmail: string | null;
  lastLoginAt: string | null;
  approvedAt: string | null;
  approvedBy: { id: string; name: string; email: string } | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string;
  teacher: { id: string; employeeNo: string } | null;
}

interface ListResponse {
  data: AdminUser[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

interface DetailResponse {
  user: AdminUser;
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
    actor: { id: string; name: string; email: string } | null;
  }>;
}

const statusTabs = [
  { id: "ALL", label: "All users" },
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "SUSPENDED", label: "Suspended" },
];

const roleFilters = [
  { value: "ALL", label: "All roles" },
  { value: "SUPER_ADMIN", label: "Super Administrator" },
  { value: "ADMIN", label: "Administrator" },
  { value: "TEACHER", label: "Teacher" },
  { value: "STUDENT", label: "Student" },
];

const actionLabels: Record<string, string> = {
  ACCOUNT_REGISTERED: "Registration submitted",
  EMAIL_VERIFIED: "Email verified",
  EMAIL_CHANGE_REQUESTED: "Email change requested",
  EMAIL_CHANGED: "Email changed",
  PASSWORD_RESET_REQUESTED: "Password reset requested",
  PASSWORD_RESET_COMPLETED: "Password reset completed",
  PASSWORD_CHANGED: "Password changed",
  PROFILE_UPDATED: "Profile updated",
  SESSIONS_REVOKED: "Sessions revoked",
  ACCOUNT_APPROVED: "Account approved",
  ACCOUNT_REJECTED: "Account rejected",
  ACCOUNT_SUSPENDED: "Account suspended",
  ACCOUNT_REACTIVATED: "Account reactivated",
  ROLE_CHANGED: "Role changed",
  VERIFICATION_EMAIL_RESENT: "Verification email resent",
};

export default function AdminUsersPage() {
  const { user: actor } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();

  const status = params.get("status") ?? "ALL";
  const role = params.get("role") ?? "ALL";
  const page = Number(params.get("page") ?? "1") || 1;
  const searchParam = params.get("search") ?? "";

  const [search, setSearch] = useState(searchParam);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<AdminUser | null>(null);
  const [approveRole, setApproveRole] = useState("TEACHER");
  const [rejectTarget, setRejectTarget] = useState<AdminUser | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");
  const [roleChange, setRoleChange] = useState("");

  useEffect(() => {
    setSearch(searchParam);
  }, [searchParam]);

  const updateParams = (next: Record<string, string | null>) => {
    const copy = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "ALL") copy.delete(key);
      else copy.set(key, value);
    }
    if (!("page" in next)) copy.delete("page");
    setParams(copy, { replace: true });
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (search !== searchParam) updateParams({ search: search || null });
    }, 350);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const queryString = useMemo(() => {
    const copy = new URLSearchParams();
    copy.set("page", String(page));
    copy.set("pageSize", "20");
    if (status !== "ALL") copy.set("status", status);
    if (role !== "ALL") copy.set("role", role);
    if (searchParam) copy.set("search", searchParam);
    return copy.toString();
  }, [page, role, searchParam, status]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "users", queryString],
    queryFn: () => api.get<ListResponse>(`/admin/users?${queryString}`),
  });

  const { data: overview } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () =>
      api.get<{ pending: number; approved: number; rejected: number; suspended: number; totalUsers: number }>(
        "/admin/overview",
      ),
  });

  const detail = useQuery({
    queryKey: ["admin", "user", detailId],
    enabled: Boolean(detailId),
    queryFn: () => api.get<DetailResponse>(`/admin/users/${detailId}`),
  });

  const refresh = (message: string, description: string) => {
    toast.success(message, description);
    queryClient.invalidateQueries({ queryKey: ["admin"] });
  };

  const approve = useMutation({
    mutationFn: ({ id, role: nextRole }: { id: string; role?: string }) =>
      api.post(`/admin/users/${id}/approve`, nextRole ? { role: nextRole } : {}),
    onSuccess: () => {
      refresh("Registration approved", "The account can now sign in.");
      setApproveTarget(null);
    },
    onError: (err) => toast.error("Couldn’t approve account", getErrorMessage(err)),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/admin/users/${id}/reject`, reason ? { reason } : {}),
    onSuccess: () => {
      refresh("Registration rejected", "Access remains blocked.");
      setRejectTarget(null);
      setReason("");
    },
    onError: (err) => toast.error("Couldn’t reject account", getErrorMessage(err)),
  });

  const suspend = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/admin/users/${id}/suspend`, reason ? { reason } : {}),
    onSuccess: () => {
      refresh("Account suspended", "Existing sessions have been revoked.");
      setSuspendTarget(null);
      setReason("");
    },
    onError: (err) => toast.error("Couldn’t suspend account", getErrorMessage(err)),
  });

  const reactivate = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/reactivate`, {}),
    onSuccess: () => refresh("Account reactivated", "The account can sign in again."),
    onError: (err) => toast.error("Couldn’t reactivate account", getErrorMessage(err)),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      refresh("Role updated", "The user’s permissions changed immediately.");
      setRoleChange("");
    },
    onError: (err) => toast.error("Couldn’t change role", getErrorMessage(err)),
  });

  const isSuperAdmin = actor?.role === "SUPER_ADMIN";

  const manageable = (target: AdminUser) => {
    if (target.id === actor?.id) return false;
    if (isSuperAdmin) return true;
    return target.role === "TEACHER" || target.role === "STUDENT";
  };

  const canAssign = (nextRole: string) => isSuperAdmin || nextRole === "TEACHER" || nextRole === "STUDENT";

  const assignableRoles = [
    { value: "TEACHER", label: "Teacher" },
    { value: "STUDENT", label: "Student" },
    ...(isSuperAdmin
      ? [
          { value: "ADMIN", label: "Administrator" },
          { value: "SUPER_ADMIN", label: "Super Administrator" },
        ]
      : []),
  ];

  const openApprove = (target: AdminUser) => {
    const requested = target.requestedRole ?? target.role;
    setApproveRole(canAssign(requested) ? requested : "TEACHER");
    setApproveTarget(target);
  };

  const tabItems = statusTabs.map((tab) => {
    const count =
      tab.id === "ALL"
        ? overview?.totalUsers
        : tab.id === "PENDING"
          ? overview?.pending
          : tab.id === "APPROVED"
            ? overview?.approved
            : tab.id === "REJECTED"
              ? overview?.rejected
              : overview?.suspended;
    return { ...tab, count };
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Administration"
        title="Users & registrations"
        description="Every account, approval state, and role in one place. Actions are enforced on the server."
        actions={
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin"] })}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 pt-3 sm:px-5">
          <Tabs items={tabItems} value={status} onChange={(id) => updateParams({ status: id })} />
        </div>

        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              if (value) updateParams({ search: value });
            }}
            placeholder="Search by name, email, or phone…"
            className="sm:max-w-sm"
          />
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400" htmlFor="role-filter">
              Role
            </label>
            <Select
              id="role-filter"
              className="h-9 w-44 text-[12px]"
              value={role}
              onChange={(event) => updateParams({ role: event.target.value })}
            >
              {roleFilters.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : isError ? (
          <EmptyState icon={ShieldAlert} title="Couldn’t load users" description={getErrorMessage(error)} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={Users}
            title={status === "PENDING" ? "No pending registrations" : "No accounts match these filters"}
            description={
              status === "PENDING"
                ? "When someone registers, their request will appear here for approval."
                : "Try a different status, role, or search term."
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-line bg-paper/40 text-[10px] uppercase tracking-[0.12em] text-ink-400">
                    <th className="px-5 py-3 font-semibold">Account</th>
                    <th className="px-3 py-3 font-semibold">Role</th>
                    <th className="px-3 py-3 font-semibold">Registered</th>
                    <th className="px-3 py-3 font-semibold">Email</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.data.map((user) => {
                    const canManage = manageable(user);
                    return (
                      <tr key={user.id} className="align-middle transition hover:bg-paper/30">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={user.name} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold text-ink-900">
                                {user.name}
                                {user.id === actor?.id ? (
                                  <span className="ml-1.5 rounded bg-marigold-100 px-1.5 py-0.5 text-[9px] font-semibold text-marigold-800">
                                    You
                                  </span>
                                ) : null}
                              </p>
                              <p className="truncate text-[11px] text-ink-400">{user.email}</p>
                              {user.pendingEmail ? (
                                <p className="mt-0.5 truncate text-[10px] text-marigold-700">
                                  Pending email: {user.pendingEmail}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <p className="text-[12px] font-medium text-ink-700">{roleLabel(user.role)}</p>
                          {user.requestedRole && user.requestedRole !== user.role ? (
                            <p className="text-[10px] text-ink-400">requested {roleLabel(user.requestedRole)}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3.5 text-[12px] text-ink-500">{formatDate(user.createdAt)}</td>
                        <td className="px-3 py-3.5">
                          <Badge variant={user.emailVerified ? "success" : "neutral"} dot>
                            {user.emailVerified ? "Verified" : "Unverified"}
                          </Badge>
                        </td>
                        <td className="px-3 py-3.5">
                          <Badge variant={accountStatusTone(user.status)} dot>
                            {accountStatusLabel(user.status)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {canManage && (user.status === "PENDING" || user.status === "REJECTED") ? (
                              <Button size="sm" onClick={() => openApprove(user)} leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                                Approve
                              </Button>
                            ) : null}
                            {canManage && user.status !== "APPROVED" && user.status !== "PENDING" && user.status !== "REJECTED" ? (
                              <Button
                                size="sm"
                                onClick={() => reactivate.mutate(user.id)}
                                loading={reactivate.isPending && reactivate.variables === user.id}
                                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                              >
                                Reactivate
                              </Button>
                            ) : null}
                            <Button size="sm" variant="outline" onClick={() => setDetailId(user.id)} leftIcon={<UserCog className="h-3.5 w-3.5" />}>
                              Manage
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              pageSize={data.meta.pageSize}
              onPageChange={(next) => updateParams({ page: String(next) })}
            />
          </>
        )}
      </Card>

      {/* Manage account */}
      <Modal
        open={Boolean(detailId)}
        onClose={() => {
          setDetailId(null);
          setRoleChange("");
        }}
        title={detail.data?.user.name ?? "Account details"}
        description="Approve, reject, suspend, reactivate, or reassign this account."
        size="lg"
        footer={
          detail.data ? (
            <>
              <Button variant="outline" onClick={() => setDetailId(null)}>
                Close
              </Button>
              {manageable(detail.data.user) ? (
                <>
                  {detail.data.user.status === "APPROVED" ? (
                    <Button
                      variant="danger"
                      onClick={() => {
                        setReason("");
                        setSuspendTarget(detail.data!.user);
                      }}
                      leftIcon={<ShieldAlert className="h-4 w-4" />}
                    >
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      onClick={() => openApprove(detail.data!.user)}
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    >
                      Approve
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReason("");
                      setRejectTarget(detail.data!.user);
                    }}
                    leftIcon={<XCircle className="h-4 w-4" />}
                  >
                    Reject
                  </Button>
                </>
              ) : null}
            </>
          ) : null
        }
      >
        {detail.isLoading || !detail.data ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-xl bg-paper" />
            <div className="h-20 animate-pulse rounded-xl bg-paper" />
            <div className="h-32 animate-pulse rounded-xl bg-paper" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper/40 p-4">
              <Avatar name={detail.data.user.name} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">{detail.data.user.name}</p>
                <p className="truncate text-[12px] text-ink-400">{detail.data.user.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge variant="accent">{roleLabel(detail.data.user.role)}</Badge>
                  <Badge variant={accountStatusTone(detail.data.user.status)} dot>
                    {accountStatusLabel(detail.data.user.status)}
                  </Badge>
                  <Badge variant={detail.data.user.emailVerified ? "success" : "neutral"}>
                    {detail.data.user.emailVerified ? (
                      <>
                        <MailCheck className="h-3 w-3" /> Email verified
                      </>
                    ) : (
                      <>
                        <MailWarning className="h-3 w-3" /> Email unverified
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            <dl className="grid gap-3 text-[12px] sm:grid-cols-2">
              <div className="rounded-lg border border-line px-3 py-2.5">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">Registered</dt>
                <dd className="mt-0.5 text-ink-800">{formatDate(detail.data.user.createdAt, "d MMM yyyy, HH:mm")}</dd>
              </div>
              <div className="rounded-lg border border-line px-3 py-2.5">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">Last sign-in</dt>
                <dd className="mt-0.5 text-ink-800">{formatDate(detail.data.user.lastLoginAt, "d MMM yyyy, HH:mm")}</dd>
              </div>
              <div className="rounded-lg border border-line px-3 py-2.5">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">Requested role</dt>
                <dd className="mt-0.5 text-ink-800">{roleLabel(detail.data.user.requestedRole ?? detail.data.user.role)}</dd>
              </div>
              <div className="rounded-lg border border-line px-3 py-2.5">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">Phone</dt>
                <dd className="mt-0.5 text-ink-800">{detail.data.user.phone ?? "—"}</dd>
              </div>
              {detail.data.user.approvedAt ? (
                <div className="rounded-lg border border-line px-3 py-2.5 sm:col-span-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">Approval</dt>
                  <dd className="mt-0.5 text-ink-800">
                    {formatDate(detail.data.user.approvedAt, "d MMM yyyy, HH:mm")}
                    {detail.data.user.approvedBy ? ` · by ${detail.data.user.approvedBy.name}` : ""}
                  </dd>
                </div>
              ) : null}
              {detail.data.user.rejectionReason || detail.data.user.suspensionReason ? (
                <div className="rounded-lg border border-clay-200 bg-clay-50 px-3 py-2.5 sm:col-span-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-clay-600">
                    {detail.data.user.suspensionReason ? "Suspension note" : "Rejection note"}
                  </dt>
                  <dd className="mt-0.5 text-clay-700">
                    {detail.data.user.suspensionReason ?? detail.data.user.rejectionReason}
                  </dd>
                </div>
              ) : null}
            </dl>

            {manageable(detail.data.user) ? (
              <div className="rounded-xl border border-line p-4">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-800">
                  <ShieldCheck className="h-4 w-4 text-marigold-600" />
                  Role & permissions
                </p>
                <p className="mt-1 text-[11px] leading-5 text-ink-400">
                  Role changes are applied immediately and revoke the user’s existing sessions.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Select
                    className="h-9 w-52 text-[12px]"
                    value={roleChange || detail.data.user.role}
                    onChange={(event) => setRoleChange(event.target.value)}
                  >
                    {assignableRoles.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      (roleChange || detail.data.user.role) === detail.data.user.role ||
                      !canAssign(roleChange || detail.data.user.role)
                    }
                    loading={changeRole.isPending}
                    onClick={() =>
                      changeRole.mutate({
                        id: detail.data!.user.id,
                        role: roleChange || detail.data!.user.role,
                      })
                    }
                  >
                    Update role
                  </Button>
                </div>
              </div>
            ) : null}

            <div>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-800">
                <Clock3 className="h-4 w-4 text-ink-400" />
                Sign-in history
              </p>
              {detail.data.logins.length === 0 ? (
                <p className="mt-2 text-[12px] text-ink-400">No sign-in attempts recorded.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
                  {detail.data.logins.slice(0, 8).map((event) => (
                    <li key={event.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[11px]">
                      <span className={event.success ? "font-medium text-sage-700" : "font-medium text-clay-600"}>
                        {event.success ? "Successful" : event.reason ?? "Blocked"}
                      </span>
                      <span className="text-ink-400">
                        {formatDate(event.createdAt, "d MMM, HH:mm")} · {event.ip ?? "unknown IP"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-800">
                <History className="h-4 w-4 text-ink-400" />
                Account activity
              </p>
              {detail.data.audits.length === 0 ? (
                <p className="mt-2 text-[12px] text-ink-400">No activity recorded yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {detail.data.audits.slice(0, 10).map((entry) => (
                    <li key={entry.id} className="rounded-lg border border-line px-3 py-2">
                      <p className="text-[11px] font-semibold text-ink-800">
                        {actionLabels[entry.action] ?? entry.action}
                      </p>
                      <p className="text-[10px] text-ink-400">
                        {formatDate(entry.createdAt, "d MMM yyyy, HH:mm")}
                        {entry.actor ? ` · by ${entry.actor.name}` : ""}
                      </p>
                      {entry.detail ? <p className="mt-0.5 text-[10px] text-ink-500">{entry.detail}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Approve */}
      <Modal
        open={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        title="Approve registration"
        description={
          approveTarget
            ? `Grant ${approveTarget.name} access to Scholaris.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button
              loading={approve.isPending}
              onClick={() => approveTarget && approve.mutate({ id: approveTarget.id, role: approveRole })}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Approve account
            </Button>
          </>
        }
      >
        <Field
          label="Role to assign"
          htmlFor="approve-role"
          hint={
            isSuperAdmin
              ? "Administrator roles are reserved for trusted staff."
              : "Administrators can approve teachers and students only."
          }
        >
          <Select id="approve-role" value={approveRole} onChange={(event) => setApproveRole(event.target.value)}>
            {assignableRoles.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-ink-400">
          <UserRoundCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Approval is recorded with your identity and the current date. If SMTP is configured, the
          applicant is notified by email.
        </p>
      </Modal>

      {/* Reject */}
      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Reject registration"
        description={rejectTarget ? `${rejectTarget.name} will not be able to sign in.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={reject.isPending}
              onClick={() => rejectTarget && reject.mutate({ id: rejectTarget.id, reason })}
              leftIcon={<XCircle className="h-4 w-4" />}
            >
              Reject account
            </Button>
          </>
        }
      >
        <Field label="Reason (optional)" htmlFor="reject-reason" hint="Visible to administrators in the activity log.">
          <Textarea
            id="reject-reason"
            value={reason}
            maxLength={300}
            placeholder="e.g. Unable to verify school affiliation"
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
      </Modal>

      {/* Suspend */}
      <Modal
        open={Boolean(suspendTarget)}
        onClose={() => setSuspendTarget(null)}
        title="Suspend account"
        description={suspendTarget ? `${suspendTarget.name} will be signed out immediately.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setSuspendTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={suspend.isPending}
              onClick={() => suspendTarget && suspend.mutate({ id: suspendTarget.id, reason })}
              leftIcon={<ShieldAlert className="h-4 w-4" />}
            >
              Suspend account
            </Button>
          </>
        }
      >
        <Field label="Reason (optional)" htmlFor="suspend-reason" hint="Stored with the suspension record.">
          <Textarea
            id="suspend-reason"
            value={reason}
            maxLength={300}
            placeholder="e.g. Temporary leave or policy review"
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}
