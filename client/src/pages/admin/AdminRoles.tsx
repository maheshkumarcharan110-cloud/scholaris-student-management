import { useQuery } from "@tanstack/react-query";
import { Check, GraduationCap, ShieldCheck, UserRound, Users } from "lucide-react";
import { api } from "@/lib/api";
import { roleLabel } from "@/lib/utils";
import { Badge, Card, PageHeader, SectionHeading, StatCard } from "@/components/ui";

interface RoleInfo {
  key: string;
  name: string;
  description: string;
  permissions: string[];
}

const roleIcons: Record<string, typeof ShieldCheck> = {
  SUPER_ADMIN: ShieldCheck,
  ADMIN: Users,
  TEACHER: GraduationCap,
  STUDENT: UserRound,
};

export default function AdminRolesPage() {
  const { data } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => api.get<{ roles: RoleInfo[] }>("/admin/roles"),
  });

  const { data: overview } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () =>
      api.get<{
        totalUsers: number;
        roles: Record<string, number>;
      }>("/admin/overview"),
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Administration"
        title="Roles & permissions"
        description="Scholaris enforces every permission on the server. Interface visibility is only a convenience."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"] as const).map((role) => {
          const Icon = roleIcons[role];
          return (
            <StatCard
              key={role}
              label={roleLabel(role)}
              value={overview?.roles[role] ?? 0}
              hint={overview ? `${Math.round(((overview.roles[role] ?? 0) / Math.max(1, overview.totalUsers)) * 100)}% of all accounts` : "Loading…"}
              icon={Icon}
              accent={role === "SUPER_ADMIN" ? "marigold" : role === "ADMIN" ? "ink" : role === "TEACHER" ? "sage" : "clay"}
            />
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {(data?.roles ?? []).map((role) => {
          const Icon = roleIcons[role.key] ?? ShieldCheck;
          return (
            <Card key={role.key} className="p-6">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-marigold-200 bg-marigold-50 text-marigold-700">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-ink-900">{role.name}</h2>
                    <Badge variant={role.key === "SUPER_ADMIN" ? "accent" : "neutral"}>{role.key}</Badge>
                  </div>
                  <p className="mt-1 text-[13px] leading-6 text-ink-400">{role.description}</p>
                </div>
              </div>

              <ul className="mt-5 space-y-2">
                {role.permissions.map((permission) => (
                  <li key={permission} className="flex items-start gap-2 text-[12px] leading-5 text-ink-600">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage-600" strokeWidth={2.5} />
                    {permission}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 p-6">
        <SectionHeading
          title="How the hierarchy is enforced"
          description="Backend middleware, not frontend state, decides what a request can do."
        />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Session validation",
              body: "Every protected request re-loads the account, checks APPROVED status, and rejects tokens issued before a password, email, role, or status change.",
            },
            {
              title: "Administrator limits",
              body: "ADMIN accounts manage teachers and students. Only a SUPER_ADMIN can create or modify another administrator, and the last approved SUPER_ADMIN cannot be removed.",
            },
            {
              title: "Student isolation",
              body: "Students can only reach their own profile and security settings. Staff APIs require a staff role before any record is returned.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-line bg-paper/40 p-4">
              <p className="text-[12px] font-semibold text-ink-800">{item.title}</p>
              <p className="mt-1 text-[11px] leading-5 text-ink-400">{item.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
