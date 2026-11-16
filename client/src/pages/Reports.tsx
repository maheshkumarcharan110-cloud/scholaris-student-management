import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BarChart3,
  CalendarCheck2,
  CalendarRange,
  Download,
  FileBarChart2,
  Printer,
  TrendingUp,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useClasses, useExams } from "@/lib/hooks";
import { useToast } from "@/lib/toast";
import type { AttendanceReport, ExamResults } from "@/types";
import {
  classLabel,
  daysAgoKey,
  downloadCsv,
  formatDate,
  getErrorMessage,
  todayKey,
} from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  GradeBadge,
  PageHeader,
  PrintHeader,
  ProgressBar,
  Select,
  Skeleton,
  StatCard,
  Tabs,
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

export default function ReportsPage() {
  const toast = useToast();
  const [tab, setTab] = useState("attendance");
  const [classId, setClassId] = useState("");
  const [from, setFrom] = useState(daysAgoKey(30));
  const [to, setTo] = useState(todayKey());
  const [examId, setExamId] = useState("");

  const classesQuery = useClasses();
  const examsQuery = useExams();
  const classes = classesQuery.data ?? [];
  const exams = examsQuery.data ?? [];

  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id);
  }, [classId, classes]);

  useEffect(() => {
    if (!examId && exams.length) {
      const published = exams.find((exam) => exam.status === "PUBLISHED");
      setExamId(published?.id ?? exams[0].id);
    }
  }, [examId, exams]);

  const rangeValid = Boolean(from && to && from <= to);

  const attendanceQuery = useQuery({
    queryKey: ["reports", "attendance", classId, from, to],
    queryFn: () =>
      api
        .get<{ data: AttendanceReport }>(
          `/reports/attendance?classId=${encodeURIComponent(classId)}&from=${from}&to=${to}`,
        )
        .then((response) => response.data),
    enabled: Boolean(classId) && rangeValid && tab === "attendance",
  });

  const performanceQuery = useQuery({
    queryKey: ["reports", "performance", examId],
    queryFn: () =>
      api
        .get<{ data: ExamResults }>(`/reports/performance?examId=${encodeURIComponent(examId)}`)
        .then((response) => response.data),
    enabled: Boolean(examId) && tab === "performance",
  });

  const attendance = attendanceQuery.data;
  const performance = performanceQuery.data;
  const activeData = tab === "attendance" ? attendance : performance;

  const exportReport = () => {
    if (tab === "attendance") {
      if (!attendance) return;
      downloadCsv(`attendance-${attendance.class.name}-${attendance.class.section}-${from}.csv`, [
        ["Admission No", "Student", "Present", "Late", "Absent", "Excused", "Marked Days", "Attendance %"],
        ...attendance.rows.map((row) => [
          row.student.admissionNo,
          `${row.student.firstName} ${row.student.lastName}`,
          row.present,
          row.late,
          row.absent,
          row.excused,
          row.total,
          row.rate,
        ]),
      ]);
      toast.success("Attendance report exported", "The CSV file has been downloaded.");
      return;
    }

    if (!performance) return;
    downloadCsv(`performance-${performance.exam.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`, [
      [
        "Rank",
        "Admission No",
        "Student",
        ...performance.exam.subjects.map((subject) => `${subject.name} (${subject.code})`),
        "Total",
        "Percentage",
        "Grade",
      ],
      ...performance.rows.map((row) => [
        row.rank ?? "",
        row.student.admissionNo,
        `${row.student.firstName} ${row.student.lastName}`,
        ...performance.exam.subjects.map((subject) => {
          const mark = row.subjects.find((item) => item.subjectId === subject.id);
          return mark?.marks ?? "";
        }),
        row.total,
        row.percentage,
        row.grade,
      ]),
    ]);
    toast.success("Performance report exported", "The CSV file has been downloaded.");
  };

  return (
    <div>
      <PrintHeader
        title={tab === "attendance" ? "Attendance report" : "Performance report"}
        subtitle={
          tab === "attendance"
            ? attendance
              ? `${classLabel(attendance.class)} · ${formatDate(from)} – ${formatDate(to)}`
              : undefined
            : performance
              ? `${performance.exam.name} · ${classLabel(performance.exam.class)} · ${performance.exam.term}`
              : undefined
        }
      />

      <PageHeader
        eyebrow="Insights"
        title="Reports"
        description="Turn attendance and assessment data into reports you can act on and share."
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={exportReport}
              disabled={!activeData}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={() => window.print()}
              disabled={!activeData}
            >
              Print
            </Button>
          </div>
        }
      />

      <div className="no-print mb-4">
        <Tabs
          items={[
            { id: "attendance", label: "Attendance" },
            { id: "performance", label: "Performance" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "attendance" ? (
        <div className="space-y-4">
          <Card className="no-print p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="w-full lg:max-w-xs">
                <label className="field-label" htmlFor="report-class">
                  Class
                </label>
                <Select
                  id="report-class"
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                  disabled={classesQuery.isLoading || classes.length === 0}
                >
                  {classes.length === 0 ? <option value="">No classes available</option> : null}
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.section}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-full sm:max-w-[180px]">
                <label className="field-label" htmlFor="report-from">
                  From
                </label>
                <input
                  id="report-from"
                  type="date"
                  value={from}
                  max={to}
                  onChange={(event) => setFrom(event.target.value)}
                  className="text-input"
                />
              </div>
              <div className="w-full sm:max-w-[180px]">
                <label className="field-label" htmlFor="report-to">
                  To
                </label>
                <input
                  id="report-to"
                  type="date"
                  value={to}
                  min={from}
                  max={todayKey()}
                  onChange={(event) => setTo(event.target.value)}
                  className="text-input"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                <Badge variant="info">
                  <CalendarRange className="mr-0.5 h-3 w-3" />
                  1 month window
                </Badge>
              </div>
            </div>
            {!rangeValid ? (
              <p className="mt-3 text-[12px] font-medium text-clay-600">
                The start date must be on or before the end date.
              </p>
            ) : null}
          </Card>

          {classes.length === 0 && !classesQuery.isLoading ? (
            <Card>
              <EmptyState
                icon={CalendarCheck2}
                title="No classes available"
                description="Add a class and enroll students before generating attendance reports."
              />
            </Card>
          ) : attendanceQuery.isLoading || classesQuery.isLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-80 rounded-2xl" />
            </div>
          ) : attendanceQuery.isError || !attendance ? (
            <ErrorState
              title="Attendance report couldn’t load"
              description={getErrorMessage(attendanceQuery.error)}
              onRetry={() => void attendanceQuery.refetch()}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Attendance rate"
                  value={`${attendance.totals.rate}%`}
                  icon={CalendarCheck2}
                  accent="sage"
                  hint={`${attendance.totals.marked} marked entries`}
                />
                <StatCard
                  label="Present entries"
                  value={attendance.totals.present}
                  icon={Users}
                  accent="ink"
                  hint={`${attendance.totals.late} late arrivals included as attended`}
                />
                <StatCard
                  label="Absences"
                  value={attendance.totals.absent}
                  icon={TrendingUp}
                  accent="clay"
                  hint={`${attendance.totals.excused} excused absences`}
                />
                <StatCard
                  label="Students in class"
                  value={attendance.totals.students}
                  icon={BarChart3}
                  accent="marigold"
                  hint={`${formatDate(attendance.from, "d MMM")} – ${formatDate(attendance.to, "d MMM yyyy")}`}
                />
              </div>

              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-ink-900">Daily attendance pattern</h2>
                    <p className="mt-0.5 text-[12px] text-ink-400">
                      Present, late and absent entries across the selected window
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-ink-400">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-sage-500" /> Present
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-marigold-400" /> Late
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-clay-500" /> Absent
                    </span>
                  </div>
                </div>
                <div className="mt-5 h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendance.daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
                        tick={{ fill: "#97AFC9", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(16,31,51,0.03)" }}
                        labelFormatter={(label) => formatDate(String(label), "EEE, d MMM")}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #E5E1D7",
                          fontSize: 12,
                          boxShadow: "0 12px 30px -16px rgba(16,31,51,.25)",
                        }}
                      />
                      <Bar dataKey="present" stackId="attendance" fill="#5C9575" radius={[0, 0, 0, 0]} maxBarSize={26} />
                      <Bar dataKey="late" stackId="attendance" fill="#E4A83D" maxBarSize={26} />
                      <Bar dataKey="absent" stackId="attendance" fill="#C65C3D" radius={[3, 3, 0, 0]} maxBarSize={26} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-ink-900">Student attendance</h2>
                    <p className="mt-0.5 text-[12px] text-ink-400">
                      {classLabel(attendance.class)} · {formatDate(attendance.from)} – {formatDate(attendance.to)}
                    </p>
                  </div>
                  <Badge variant={attendance.totals.rate >= 90 ? "success" : "warning"}>
                    Class rate {attendance.totals.rate}%
                  </Badge>
                </div>
                {attendance.rows.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No students in this class"
                    description="Enroll students to start generating attendance reports."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th className="text-center">Present</th>
                          <th className="text-center">Late</th>
                          <th className="text-center">Absent</th>
                          <th className="text-center">Excused</th>
                          <th>Attendance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.rows.map((row) => (
                          <tr key={row.student.id}>
                            <td>
                              <p className="whitespace-nowrap text-[12px] font-semibold text-ink-800">
                                {row.student.firstName} {row.student.lastName}
                              </p>
                              <p className="font-mono text-[9px] text-ink-400">{row.student.admissionNo}</p>
                            </td>
                            <td className="text-center text-[12px] tabular-nums text-sage-700">{row.present}</td>
                            <td className="text-center text-[12px] tabular-nums text-marigold-700">{row.late}</td>
                            <td className="text-center text-[12px] tabular-nums text-clay-600">{row.absent}</td>
                            <td className="text-center text-[12px] tabular-nums text-ink-500">{row.excused}</td>
                            <td>
                              <div className="flex items-center gap-2">
                                <ProgressBar
                                  value={row.rate}
                                  tone={row.rate >= 90 ? "sage" : row.rate >= 75 ? "marigold" : "clay"}
                                  className="w-24"
                                />
                                <span className="w-10 text-right text-[11px] font-semibold tabular-nums text-ink-700">
                                  {row.total ? `${row.rate}%` : "—"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="no-print p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="w-full lg:max-w-lg">
                <label className="field-label" htmlFor="performance-exam">
                  Exam
                </label>
                <Select
                  id="performance-exam"
                  value={examId}
                  onChange={(event) => setExamId(event.target.value)}
                  disabled={examsQuery.isLoading || exams.length === 0}
                >
                  {exams.length === 0 ? <option value="">No exams available</option> : null}
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name} · {classLabel(exam.class)} · {exam.term} ({exam.status})
                    </option>
                  ))}
                </Select>
              </div>
              {performance ? (
                <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                  <Badge variant={performance.exam.status === "PUBLISHED" ? "success" : "warning"}>
                    {performance.exam.status === "PUBLISHED" ? "Published" : "Draft"}
                  </Badge>
                  <Link
                    to={`/exams/${performance.exam.id}`}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-600 hover:text-ink-900"
                  >
                    Open exam <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : null}
            </div>
          </Card>

          {exams.length === 0 && !examsQuery.isLoading ? (
            <Card>
              <EmptyState
                icon={FileBarChart2}
                title="No exams to report on"
                description="Create an examination and enter marks to unlock performance analytics."
                action={
                  <Link to="/exams" className="text-[12px] font-semibold text-ink-600 hover:text-ink-900">
                    Go to examinations →
                  </Link>
                }
              />
            </Card>
          ) : performanceQuery.isLoading || examsQuery.isLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-80 rounded-2xl" />
            </div>
          ) : performanceQuery.isError || !performance ? (
            <ErrorState
              title="Performance report couldn’t load"
              description={getErrorMessage(performanceQuery.error)}
              onRetry={() => void performanceQuery.refetch()}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Class average"
                  value={`${performance.stats.classAverage}%`}
                  icon={BarChart3}
                  accent="ink"
                  hint={`${performance.stats.enteredCount} of ${performance.stats.studentCount} students assessed`}
                />
                <StatCard
                  label="Highest average"
                  value={`${performance.stats.highest}%`}
                  icon={TrendingUp}
                  accent="marigold"
                  hint={performance.rows.find((row) => row.rank === 1)
                    ? `${performance.rows.find((row) => row.rank === 1)!.student.firstName} ${performance.rows.find((row) => row.rank === 1)!.student.lastName}`
                    : "No ranked student yet"}
                />
                <StatCard
                  label="Pass rate"
                  value={`${performance.stats.passRate}%`}
                  icon={CalendarCheck2}
                  accent="sage"
                  hint="Students scoring 40% or above"
                />
                <StatCard
                  label="Total marks"
                  value={performance.stats.maxTotal}
                  icon={FileBarChart2}
                  accent="clay"
                  hint={`${performance.exam.subjects.length} subjects in this exam`}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-12">
                <Card className="p-5 xl:col-span-7">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-ink-900">Subject averages</h2>
                      <p className="mt-0.5 text-[12px] text-ink-400">Average score per paper</p>
                    </div>
                    <BarChart3 className="h-4 w-4 text-ink-300" />
                  </div>
                  {performance.subjectAverages.length === 0 ? (
                    <p className="mt-6 text-[12px] text-ink-400">No subjects in this exam.</p>
                  ) : (
                    <div className="mt-3 h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={performance.subjectAverages}
                          layout="vertical"
                          margin={{ top: 8, right: 24, left: 4, bottom: 0 }}
                        >
                          <CartesianGrid stroke="#E5E1D7" strokeDasharray="3 5" horizontal={false} />
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            tick={{ fill: "#97AFC9", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <YAxis
                            type="category"
                            dataKey="code"
                            width={54}
                            tick={{ fill: "#43658A", fontSize: 10, fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(16,31,51,0.03)" }}
                            formatter={(value) => [`${value}%`, "Average"]}
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #E5E1D7",
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="average" fill="#2F4D70" radius={[0, 4, 4, 0]} maxBarSize={22} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>

                <Card className="p-5 xl:col-span-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-ink-900">Grade spread</h2>
                      <p className="mt-0.5 text-[12px] text-ink-400">Distribution across the class</p>
                    </div>
                    <Users className="h-4 w-4 text-ink-300" />
                  </div>
                  <div className="mt-5 space-y-3">
                    {Object.entries(performance.stats.distribution).map(([grade, count]) => {
                      const total = Object.values(performance.stats.distribution).reduce((a, b) => a + b, 0);
                      return (
                        <div key={grade} className="flex items-center gap-3">
                          <span className="w-6 text-[11px] font-bold text-ink-600">{grade}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${total ? (count / total) * 100 : 0}%`,
                                backgroundColor: gradeColors[grade] ?? "#6486A8",
                              }}
                            />
                          </div>
                          <span className="w-6 text-right text-[11px] font-semibold tabular-nums text-ink-600">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 rounded-xl bg-paper/70 px-3 py-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-ink-400">Class average</span>
                      <span className="font-semibold text-ink-800">{performance.stats.classAverage}%</span>
                    </div>
                    <ProgressBar value={performance.stats.classAverage} tone="marigold" className="mt-2" />
                  </div>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-ink-900">Ranked results</h2>
                    <p className="mt-0.5 text-[12px] text-ink-400">
                      {performance.exam.name} · {classLabel(performance.exam.class)} · {performance.exam.term}
                    </p>
                  </div>
                  <Badge variant={performance.exam.status === "PUBLISHED" ? "success" : "warning"}>
                    {performance.exam.status === "PUBLISHED" ? "Published" : "Draft — provisional"}
                  </Badge>
                </div>
                {performance.stats.enteredCount === 0 ? (
                  <EmptyState
                    icon={FileBarChart2}
                    title="No marks entered"
                    description="Enter marks for this exam to see ranked results and grade distribution."
                    action={
                      <Link
                        to={`/exams/${performance.exam.id}`}
                        className="text-[12px] font-semibold text-ink-600 hover:text-ink-900"
                      >
                        Open exam →
                      </Link>
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Student</th>
                          {performance.exam.subjects.map((subject) => (
                            <th key={subject.id} className="text-center">
                              {subject.code}
                            </th>
                          ))}
                          <th className="text-right">Total</th>
                          <th className="text-right">%</th>
                          <th>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performance.rows.map((row) => (
                          <tr key={row.student.id}>
                            <td className="text-[12px] font-semibold tabular-nums text-ink-600">
                              {row.rank ?? "—"}
                            </td>
                            <td>
                              <p className="whitespace-nowrap text-[12px] font-semibold text-ink-800">
                                {row.student.firstName} {row.student.lastName}
                              </p>
                              <p className="font-mono text-[9px] text-ink-400">{row.student.admissionNo}</p>
                            </td>
                            {performance.exam.subjects.map((subject) => {
                              const mark = row.subjects.find((item) => item.subjectId === subject.id);
                              return (
                                <td key={subject.id} className="text-center text-[12px] tabular-nums text-ink-700">
                                  {mark?.marks ?? <span className="text-ink-200">—</span>}
                                </td>
                              );
                            })}
                            <td className="text-right text-[12px] font-semibold tabular-nums text-ink-900">
                              {row.total}
                            </td>
                            <td className="text-right text-[12px] font-semibold tabular-nums text-ink-900">
                              {row.percentage}%
                            </td>
                            <td>
                              <GradeBadge grade={row.grade} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
