import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  CalendarCheck2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Plus,
  Sparkles,
  TrendingDown,
  Trophy,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { DashboardData } from "@/types";
import { cn, formatDate, gradeTone } from "@/lib/utils";
import {
  Avatar,
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  PageSkeleton,
  ProgressBar,
  SectionHeading,
  StatCard,
  StatusBadge,
} from "@/components/ui";

const gradeColors: Record<string, string> = {
  "A+": "#43795D",
  A: "#5C9575",
  B: "#2F4D70",
  C: "#6486A8",
  D: "#E4A83D",
  E: "#D87757",
  F: "#C65C3D",
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-float">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
        {formatDate(String(label), "EEE, d MMM")}
      </p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{payload[0]?.value}% attendance</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<{ data: DashboardData }>("/dashboard").then((response) => response.data),
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) {
    return (
      <ErrorState
        title="The dashboard is out of reach"
        description="We couldn't load today's school snapshot."
        onRetry={() => void refetch()}
      />
    );
  }

  const today = data.attendanceToday;
  const marked = today.marked;
  const pieData = [
    { name: "Present", value: today.present, color: "#5C9575" },
    { name: "Late", value: today.late, color: "#E4A83D" },
    { name: "Absent", value: today.absent, color: "#C65C3D" },
    { name: "Excused", value: today.excused, color: "#6486A8" },
  ].filter((item) => item.value > 0);
  const maxEnrollment = Math.max(...data.classEnrollment.map((item) => item.students), 1);
  const maxGrade = Math.max(...data.gradeDistribution.map((item) => item.count), 1);
  const nextExam = data.upcomingExams[0];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="eyebrow mb-2 flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
          <h1 className="font-display text-[30px] font-semibold leading-tight tracking-[-0.025em] text-ink-950 sm:text-[38px]">
            {greeting()}, {user?.name.split(" ")[0]}.
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-ink-400">
            {today.rate >= 90
              ? "Attendance is strong today. Here is the rest of the picture."
              : "Here is how the school is moving today — and where a little attention will help."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink to="/attendance" variant="outline" leftIcon={<CalendarCheck2 className="h-4 w-4" />}>
            Take attendance
          </ButtonLink>
          <ButtonLink to="/students?new=1" variant="secondary" leftIcon={<Plus className="h-4 w-4" />}>
            Add student
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active students"
          value={data.totals.students}
          icon={Users}
          accent="ink"
          hint={`${data.totals.classes} classes · ${data.totals.subjects} subjects`}
        />
        <StatCard
          label="Teaching staff"
          value={data.totals.teachers}
          icon={GraduationCap}
          accent="sage"
          hint={`Caring for ${data.totals.students} students`}
        />
        <StatCard
          label="Attendance today"
          value={`${today.rate}%`}
          icon={CalendarCheck2}
          accent="marigold"
          hint={
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-sage-600">{today.present} present</span>
              <span>·</span>
              <span>{today.absent} absent</span>
              {today.unmarked > 0 ? (
                <>
                  <span>·</span>
                  <span className="font-medium text-marigold-600">{today.unmarked} unmarked</span>
                </>
              ) : null}
            </span>
          }
        />
        <StatCard
          label="Upcoming exams"
          value={data.upcomingExams.length}
          icon={ClipboardList}
          accent="clay"
          hint={
            nextExam
              ? `Next: ${nextExam.name} · ${formatDate(nextExam.startDate, "d MMM")}`
              : "No exams on the calendar"
          }
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card className="p-5 xl:col-span-8">
          <SectionHeading
            title="Attendance pulse"
            description="Daily attendance rate across the last 14 days"
            action={
              <div className="flex items-center gap-3 text-[11px] text-ink-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-marigold-400" /> Rate
                </span>
                <Badge variant={today.rate >= 90 ? "success" : "warning"}>
                  Today {today.rate}%
                </Badge>
              </div>
            }
          />
          <div className="mt-5 h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.attendanceTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E4A83D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E4A83D" stopOpacity={0.015} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E5E1D7" strokeDasharray="3 5" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => formatDate(String(value), "d MMM")}
                  tick={{ fill: "#97AFC9", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  dy={6}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fill: "#97AFC9", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#C5D3E3", strokeDasharray: "4 4" }} />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#D99A2B"
                  strokeWidth={2.3}
                  fill="url(#attendanceFill)"
                  activeDot={{ r: 4, fill: "#101F33", stroke: "#FDFCF9", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex flex-col p-5 xl:col-span-4">
          <SectionHeading title="Today at a glance" description={formatDate(today.date, "EEEE, d MMMM")} />
          {marked === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-marigold-50 text-marigold-600">
                <CalendarCheck2 className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-ink-800">No roll call yet</p>
              <p className="mt-1 max-w-[200px] text-[12px] leading-5 text-ink-400">
                Attendance has not been recorded for today.
              </p>
              <ButtonLink to="/attendance" size="sm" variant="outline" className="mt-4">
                Record now
              </ButtonLink>
            </div>
          ) : (
            <>
              <div className="relative mx-auto mt-2 h-[164px] w-full max-w-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      innerRadius={55}
                      outerRadius={74}
                      paddingAngle={2.5}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #E5E1D7",
                        fontSize: 12,
                        boxShadow: "0 12px 30px -16px rgba(16,31,51,.25)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-[30px] font-semibold leading-none tracking-tight text-ink-950">
                    {today.rate}%
                  </span>
                  <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">
                    attended
                  </span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg bg-paper/70 px-2.5 py-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-ink-500">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="text-[12px] font-semibold text-ink-800">{item.value}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/reports"
                className="mt-auto flex items-center justify-between pt-4 text-[12px] font-semibold text-ink-600 transition hover:text-ink-900"
              >
                Open attendance report
                <ChevronRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </Card>

        <Card className="p-5 xl:col-span-4">
          <SectionHeading title="Class enrolment" description="Active students per class" />
          <div className="mt-5 space-y-4">
            {data.classEnrollment.length === 0 ? (
              <p className="text-[13px] text-ink-400">No classes yet.</p>
            ) : (
              data.classEnrollment.map((item) => (
                <div key={item.id}>
                  <div className="mb-1.5 flex items-center justify-between text-[12px]">
                    <span className="font-medium text-ink-700">{item.name}</span>
                    <span className="font-semibold tabular-nums text-ink-900">{item.students}</span>
                  </div>
                  <ProgressBar value={(item.students / maxEnrollment) * 100} tone="ink" />
                </div>
              ))
            )}
          </div>
          <Link
            to="/classes"
            className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[12px] font-semibold text-ink-600 transition hover:text-ink-900"
          >
            Manage classes & subjects
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Card>

        <Card className="p-5 xl:col-span-4">
          <SectionHeading
            title="Upcoming exams"
            description="The next assessments on the calendar"
            action={
              <Link to="/exams" className="text-[11px] font-semibold text-ink-500 hover:text-ink-900">
                View all
              </Link>
            }
          />
          <div className="mt-4 space-y-2.5">
            {data.upcomingExams.length === 0 ? (
              <p className="py-4 text-[13px] text-ink-400">No exams scheduled.</p>
            ) : (
              data.upcomingExams.map((exam) => (
                <Link
                  key={exam.id}
                  to={`/exams/${exam.id}`}
                  className="group flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 transition hover:border-ink-200 hover:bg-paper/40"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-marigold-50 text-marigold-700">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-ink-800">{exam.name}</p>
                    <p className="truncate text-[10px] text-ink-400">
                      {exam.className} · {exam.term}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-ink-700">{formatDate(exam.startDate, "d MMM")}</p>
                    <p className="text-[9px] uppercase tracking-wide text-ink-300">
                      {exam.subjectCount} subjects
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5 xl:col-span-4">
          <SectionHeading
            title="Top performers"
            description="Average across published assessments"
            action={<Trophy className="h-4 w-4 text-marigold-500" />}
          />
          <div className="mt-4 space-y-2">
            {data.topStudents.length === 0 ? (
              <p className="py-4 text-[13px] text-ink-400">Publish an exam to see performance.</p>
            ) : (
              data.topStudents.map((student, index) => (
                <div key={`${student.name}-${index}`} className="flex items-center gap-3 rounded-xl px-1.5 py-1.5">
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                      index === 0
                        ? "bg-marigold-400 text-ink-950"
                        : index === 1
                          ? "bg-ink-100 text-ink-600"
                          : index === 2
                            ? "bg-clay-100 text-clay-700"
                            : "text-ink-300",
                    )}
                  >
                    {index + 1}
                  </span>
                  <Avatar firstName={student.name.split(" ")[0]} lastName={student.name.split(" ").slice(1).join(" ")} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-ink-800">{student.name}</p>
                    <p className="text-[10px] text-ink-400">{student.className}</p>
                  </div>
                  <span className="text-[12px] font-semibold tabular-nums text-sage-700">
                    {student.average.toFixed(1)}%
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5 xl:col-span-5">
          <SectionHeading
            title="Grade distribution"
            description="Published assessment averages"
            action={<Sparkles className="h-4 w-4 text-ink-300" />}
          />
          <div className="mt-5 space-y-3">
            {data.gradeDistribution.map((item) => (
              <div key={item.grade} className="flex items-center gap-3">
                <span className="w-6 text-[11px] font-bold text-ink-600">{item.grade}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(item.count / maxGrade) * 100}%`,
                      backgroundColor: gradeColors[item.grade] ?? "#6486A8",
                    }}
                  />
                </div>
                <span className="w-6 text-right text-[11px] font-semibold tabular-nums text-ink-600">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-paper/70 px-3 py-2.5 text-[11px] text-ink-400">
            <span>Total students assessed</span>
            <span className="font-semibold text-ink-800">
              {data.gradeDistribution.reduce((sum, item) => sum + item.count, 0)}
            </span>
          </div>
        </Card>

        <Card className="p-5 xl:col-span-7">
          <SectionHeading
            title="Students needing support"
            description="Attendance below 80% over the last 30 days"
            action={<TrendingDown className="h-4 w-4 text-clay-500" />}
          />
          <div className="mt-4">
            {data.lowAttendance.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Everyone is on track"
                description="No student is below the 80% attendance threshold."
                className="py-8"
              />
            ) : (
              <div className="divide-y divide-line/70">
                {data.lowAttendance.map((student, index) => (
                  <div key={`${student.name}-${index}`} className="flex items-center gap-3 py-2.5">
                    <Avatar name={student.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-ink-800">{student.name}</p>
                      <p className="text-[10px] text-ink-400">{student.className}</p>
                    </div>
                    <div className="w-24">
                      <ProgressBar value={student.rate} tone={student.rate < 65 ? "clay" : "marigold"} />
                    </div>
                    <Badge variant={student.rate < 65 ? "danger" : "warning"} className="min-w-[48px] justify-center">
                      {student.rate}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Link
            to="/reports"
            className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-ink-600 transition hover:text-ink-900"
          >
            Review attendance reports
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>
    </div>
  );
}
