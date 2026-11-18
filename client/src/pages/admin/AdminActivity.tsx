import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogIn, ScrollText, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, getErrorMessage } from "@/lib/utils";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  Select,
  TableSkeleton,
  Tabs,
} from "@/components/ui";

interface AuditEntry {
  id: string;
  action: string;
  detail: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
  targetUser: { id: string; name: string; email: string } | null;
}

interface LoginEntry {
  id: string;
  email: string;
  success: boolean;
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

interface AuditResponse {
  data: AuditEntry[];
  actions: string[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

interface LoginResponse {
  data: LoginEntry[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

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

function actionTone(action: string) {
  if (action.includes("APPROVED") || action.includes("REACTIVATED") || action.includes("VERIFIED")) return "success" as const;
  if (action.includes("REJECTED") || action.includes("SUSPENDED")) return "danger" as const;
  if (action.includes("REGISTERED") || action.includes("CHANGED") || action.includes("RESET")) return "warning" as const;
  return "neutral" as const;
}

export default function AdminActivityPage() {
  const [tab, setTab] = useState<"audit" | "logins">("audit");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const pageSize = 25;

  const audit = useQuery({
    queryKey: ["admin", "activity", page, action],
    enabled: tab === "audit",
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (action) params.set("action", action);
      return api.get<AuditResponse>(`/admin/activity?${params.toString()}`);
    },
  });

  const logins = useQuery({
    queryKey: ["admin", "login-events", page],
    enabled: tab === "logins",
    queryFn: () =>
      api.get<LoginResponse>(`/admin/login-events?page=${page}&pageSize=${pageSize}`),
  });

  const switchTab = (next: string) => {
    setTab(next as "audit" | "logins");
    setPage(1);
  };

  const meta = tab === "audit" ? audit.data?.meta : logins.data?.meta;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Administration"
        title="Activity logs"
        description="A durable trail of account decisions and authentication attempts."
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 pt-3">
          <Tabs
            items={[
              { id: "audit", label: "Account activity" },
              { id: "logins", label: "Login history" },
            ]}
            value={tab}
            onChange={switchTab}
            variant="underline"
            className="border-b-0"
          />
          {tab === "audit" && audit.data?.actions.length ? (
            <Select
              className="mb-2 h-9 w-56 text-[12px]"
              value={action}
              aria-label="Filter by action"
              onChange={(event) => {
                setAction(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All actions</option>
              {audit.data.actions.map((item) => (
                <option key={item} value={item}>
                  {actionLabels[item] ?? item}
                </option>
              ))}
            </Select>
          ) : null}
        </div>

        {tab === "audit" ? (
          audit.isLoading ? (
            <TableSkeleton rows={8} cols={4} />
          ) : audit.isError ? (
            <EmptyState icon={ScrollText} title="Couldn’t load activity" description={getErrorMessage(audit.error)} />
          ) : !audit.data || audit.data.data.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No activity recorded"
              description="Administrator decisions and account changes will appear here."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left">
                  <thead>
                    <tr className="border-b border-line bg-paper/40 text-[10px] uppercase tracking-[0.12em] text-ink-400">
                      <th className="px-5 py-3 font-semibold">Action</th>
                      <th className="px-3 py-3 font-semibold">Actor</th>
                      <th className="px-3 py-3 font-semibold">Target</th>
                      <th className="px-3 py-3 font-semibold">When</th>
                      <th className="px-5 py-3 font-semibold">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {audit.data.data.map((entry) => (
                      <tr key={entry.id} className="transition hover:bg-paper/30">
                        <td className="px-5 py-3">
                          <Badge variant={actionTone(entry.action)} dot>
                            {actionLabels[entry.action] ?? entry.action}
                          </Badge>
                          {entry.detail ? (
                            <p className="mt-1 max-w-lg text-[11px] leading-5 text-ink-400">{entry.detail}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-[12px] font-medium text-ink-700">{entry.actor?.name ?? "System"}</p>
                          <p className="text-[10px] text-ink-400">{entry.actor?.email ?? "—"}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-[12px] text-ink-600">{entry.targetUser?.name ?? "—"}</p>
                          <p className="text-[10px] text-ink-400">{entry.targetUser?.email ?? ""}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[11px] text-ink-500">
                          {formatDate(entry.createdAt, "d MMM yyyy, HH:mm")}
                        </td>
                        <td className="px-5 py-3 text-[11px] text-ink-400">{entry.ip ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {audit.data.meta ? (
                <Pagination
                  page={audit.data.meta.page}
                  totalPages={audit.data.meta.totalPages}
                  total={audit.data.meta.total}
                  pageSize={audit.data.meta.pageSize}
                  onPageChange={setPage}
                />
              ) : null}
            </>
          )
        ) : logins.isLoading ? (
          <TableSkeleton rows={8} cols={4} />
        ) : logins.isError ? (
          <EmptyState icon={LogIn} title="Couldn’t load login history" description={getErrorMessage(logins.error)} />
        ) : !logins.data || logins.data.data.length === 0 ? (
          <EmptyState icon={LogIn} title="No sign-in attempts" description="Successful and blocked sign-in attempts will appear here." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-line bg-paper/40 text-[10px] uppercase tracking-[0.12em] text-ink-400">
                    <th className="px-5 py-3 font-semibold">Account</th>
                    <th className="px-3 py-3 font-semibold">Result</th>
                    <th className="px-3 py-3 font-semibold">When</th>
                    <th className="px-5 py-3 font-semibold">Origin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {logins.data.data.map((event) => (
                    <tr key={event.id} className="transition hover:bg-paper/30">
                      <td className="px-5 py-3">
                        <p className="text-[12px] font-medium text-ink-800">{event.user?.name ?? "Unknown account"}</p>
                        <p className="text-[10px] text-ink-400">{event.email}</p>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={event.success ? "success" : "danger"} dot>
                          {event.success ? "Successful" : "Blocked"}
                        </Badge>
                        {!event.success && event.reason ? (
                          <p className="mt-1 text-[10px] text-ink-400">{event.reason.replace(/_/g, " ").toLowerCase()}</p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[11px] text-ink-500">
                        {formatDate(event.createdAt, "d MMM yyyy, HH:mm")}
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[11px] text-ink-600">{event.ip ?? "unknown IP"}</p>
                        {event.userAgent ? (
                          <p className="max-w-[260px] truncate text-[10px] text-ink-400">{event.userAgent}</p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logins.data.meta ? (
              <Pagination
                page={logins.data.meta.page}
                totalPages={logins.data.meta.totalPages}
                total={logins.data.meta.total}
                pageSize={logins.data.meta.pageSize}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </Card>

      <p className="mt-4 flex items-center gap-2 text-[11px] text-ink-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        Audit entries are append-only through the application and record the acting administrator.
        {meta ? ` ${meta.total} events recorded.` : ""}
      </p>
    </div>
  );
}
