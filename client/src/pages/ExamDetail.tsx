import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  Lock,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import type { ExamDetail, ExamResults } from "@/types";
import {
  classLabel,
  cn,
  downloadCsv,
  formatDate,
  getErrorMessage,
  gradeForPercentage,
} from "@/lib/utils";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  GradeBadge,
  PageSkeleton,
  PrintHeader,
  ProgressBar,
  Select,
  StatusBadge,
  Tabs,
} from "@/components/ui";

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("marks");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [publishOpen, setPublishOpen] = useState(false);

  const examQuery = useQuery({
    queryKey: ["exam", id],
    queryFn: () => api.get<{ data: ExamDetail }>(`/exams/${id}`).then((response) => response.data),
    enabled: Boolean(id),
  });

  const exam = examQuery.data;

  const resultsQuery = useQuery({
    queryKey: ["exam-results", id],
    queryFn: () => api.get<{ data: ExamResults }>(`/exams/${id}/results`).then((response) => response.data),
    enabled: Boolean(id) && tab === "results",
  });

  const allowedSubjects = useMemo(
    () => (exam ? exam.subjects.filter((subject) => exam.mySubjectIds.includes(subject.subjectId)) : []),
    [exam],
  );

  useEffect(() => {
    if (!exam) return;
    setSelectedSubjectId((current) => {
      if (current && allowedSubjects.some((subject) => subject.subjectId === current)) return current;
      return allowedSubjects[0]?.subjectId ?? "";
    });
  }, [exam, allowedSubjects]);

  const selectedSubject = allowedSubjects.find((subject) => subject.subjectId === selectedSubjectId);

  useEffect(() => {
    if (!exam || !selectedSubjectId) return;
    const next: Record<string, string> = {};
    for (const student of exam.students) {
      const mark = exam.marks.find(
        (entry) => entry.studentId === student.id && entry.subjectId === selectedSubjectId,
      );
      next[student.id] = mark ? String(mark.marks) : "";
    }
    setMarks(next);
  }, [exam, selectedSubjectId]);

  const locked = exam?.status === "PUBLISHED" || !exam?.canEdit;

  const dirty = useMemo(() => {
    if (!exam || !selectedSubjectId) return false;
    return exam.students.some((student) => {
      const saved = exam.marks.find(
        (entry) => entry.studentId === student.id && entry.subjectId === selectedSubjectId,
      );
      return (marks[student.id] ?? "") !== (saved ? String(saved.marks) : "");
    });
  }, [exam, marks, selectedSubjectId]);

  const subjectEntries = exam?.students.map((student) => ({
    student,
    value: marks[student.id] ?? "",
  })) ?? [];
  const enteredCount = subjectEntries.filter((entry) => entry.value !== "").length;
  const validValues = subjectEntries
    .map((entry) => Number(entry.value))
    .filter((value, index) => subjectEntries[index].value !== "" && Number.isFinite(value));
  const subjectAverage = validValues.length
    ? Math.round((validValues.reduce((a, b) => a + b, 0) / validValues.length) * 10) / 10
    : 0;

  const hasInvalidMarks = subjectEntries.some((entry) => {
    if (entry.value === "") return false;
    const value = Number(entry.value);
    return !Number.isFinite(value) || value < 0 || !selectedSubject || value > selectedSubject.maxMarks;
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.post<{ message: string }>(`/exams/${id}/marks`, {
        subjectId: selectedSubjectId,
        marks: subjectEntries.map((entry) => ({
          studentId: entry.student.id,
          marks: entry.value === "" ? null : Number(entry.value),
        })),
      }),
    onSuccess: async (response) => {
      toast.success("Marks saved", response.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exam", id] }),
        queryClient.invalidateQueries({ queryKey: ["exam-results", id] }),
        queryClient.invalidateQueries({ queryKey: ["exams"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error) => toast.error("Marks could not be saved", getErrorMessage(error)),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      api.patch<{ message: string }>(`/exams/${id}`, {
        status: exam?.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
      }),
    onSuccess: async (response) => {
      toast.success("Exam status updated", response.message);
      setPublishOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exam", id] }),
        queryClient.invalidateQueries({ queryKey: ["exam-results", id] }),
        queryClient.invalidateQueries({ queryKey: ["exams"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error) => toast.error("Could not update exam", getErrorMessage(error)),
  });

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const changeTab = (next: string) => {
    if (next === tab) return;
    if (dirty && !window.confirm("You have unsaved marks. Discard them and continue?")) return;
    setTab(next);
  };

  const saveMarks = () => {
    if (hasInvalidMarks) {
      toast.error("Check the marks", "Each mark must be between 0 and the subject maximum.");
      return;
    }
    saveMutation.mutate();
  };

  const exportResults = () => {
    const results = resultsQuery.data;
    if (!results) return;
    const headers = [
      "Rank",
      "Admission No",
      "Student",
      ...results.exam.subjects.map((subject) => `${subject.name} (${subject.code})`),
      "Total",
      "Percentage",
      "Grade",
    ];
    const rows = results.rows.map((row) => [
      row.rank ?? "",
      row.student.admissionNo,
      `${row.student.firstName} ${row.student.lastName}`,
      ...results.exam.subjects.map((subject) => {
        const mark = row.subjects.find((item) => item.subjectId === subject.id);
        return mark?.marks ?? "";
      }),
      row.total,
      row.percentage,
      row.grade,
    ]);
    const safeName = results.exam.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    downloadCsv(`${safeName}-results.csv`, [headers, ...rows]);
    toast.success("Results exported", "The CSV file has been downloaded.");
  };

  if (examQuery.isLoading) return <PageSkeleton />;
  if (examQuery.isError || !exam) {
    return (
      <ErrorState
        title="Exam unavailable"
        description={getErrorMessage(examQuery.error)}
        onRetry={() => void examQuery.refetch()}
      />
    );
  }

  const expectedMarks = exam.students.length * exam.subjects.length;
  const completion = expectedMarks ? Math.round((exam.markCount / expectedMarks) * 100) : 0;
  const results = resultsQuery.data;

  return (
    <div>
      <PrintHeader
        title={`${exam.name} — Results`}
        subtitle={`${classLabel(exam.class)} · ${exam.term} · ${formatDate(exam.startDate)} – ${formatDate(exam.endDate)}`}
      />

      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/exams"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-400 transition hover:text-ink-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to examinations
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <Button
              variant={exam.status === "PUBLISHED" ? "outline" : "secondary"}
              size="sm"
              leftIcon={
                exam.status === "PUBLISHED" ? (
                  <RotateCcw className="h-3.5 w-3.5" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )
              }
              onClick={() => setPublishOpen(true)}
            >
              {exam.status === "PUBLISHED" ? "Unpublish results" : "Publish results"}
            </Button>
          ) : null}
          {tab === "results" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="h-3.5 w-3.5" />}
                onClick={exportResults}
                disabled={!results}
              >
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Printer className="h-3.5 w-3.5" />}
                onClick={() => window.print()}
                disabled={!results}
              >
                Print
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <Card className="relative mb-4 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-ink-900 via-ink-600 to-marigold-400" />
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow">Examination</p>
              <StatusBadge status={exam.status} />
              {exam.status === "PUBLISHED" ? (
                <Badge variant="neutral" dot={false}>
                  <Lock className="mr-0.5 h-2.5 w-2.5" /> Marks locked
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink-950">
              {exam.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-400">
              <span>{classLabel(exam.class)}</span>
              <span>·</span>
              <span>{exam.term}</span>
              <span>·</span>
              <span>
                {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="neutral">{exam.subjects.length} subjects</Badge>
              <Badge variant="neutral">{exam.students.length} students</Badge>
              <Badge variant="neutral">{exam.markCount} marks entered</Badge>
            </div>
          </div>

          <div className="w-full shrink-0 lg:w-64">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-ink-400">Marks completion</span>
              <span className="font-semibold text-ink-800">{completion}%</span>
            </div>
            <ProgressBar value={completion} tone={completion === 100 ? "sage" : "marigold"} />
            <p className="mt-2 text-[10px] text-ink-300">
              {exam.markCount} of {expectedMarks} possible entries
            </p>
          </div>
        </div>
      </Card>

      {exam.status === "PUBLISHED" ? (
        <div className="no-print mb-4 flex items-start gap-2.5 rounded-xl border border-sage-200 bg-sage-50 px-4 py-3 text-[12px] leading-5 text-sage-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Results are published and visible on student report cards. Marks are locked to protect
            the published record.{isAdmin ? " Unpublish to make corrections." : ""}
          </span>
        </div>
      ) : (
        <div className="no-print mb-4 flex items-start gap-2.5 rounded-xl border border-marigold-200 bg-marigold-50 px-4 py-3 text-[12px] leading-5 text-marigold-800">
          <FileText className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This exam is still a draft. Enter marks subject by subject, then publish when the
            assessment is complete.{isAdmin ? " Publishing locks marks." : " An administrator publishes results."}
          </span>
        </div>
      )}

      <div className="no-print mb-4">
        <Tabs
          items={[
            { id: "marks", label: "Marks entry" },
            { id: "results", label: "Results & analytics" },
          ]}
          value={tab}
          onChange={changeTab}
        />
      </div>

      {tab === "marks" ? (
        allowedSubjects.length === 0 ? (
          <Card>
            <EmptyState
              icon={BookOpen}
              title="No subjects assigned to you"
              description="Marks entry is limited to the subjects assigned to your teacher profile. You can still view the published results."
              action={
                <Button variant="outline" onClick={() => changeTab("results")}>
                  View results
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
              <div className="w-full sm:max-w-xs">
                <label className="field-label" htmlFor="marks-subject">
                  Subject
                </label>
                <Select
                  id="marks-subject"
                  value={selectedSubjectId}
                  onChange={(event) => {
                    if (dirty && !window.confirm("Discard unsaved marks for this subject?")) return;
                    setSelectedSubjectId(event.target.value);
                  }}
                >
                  {allowedSubjects.map((subject) => (
                    <option key={subject.id} value={subject.subjectId}>
                      {subject.name} · {subject.code}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">
                  <BookOpen className="mr-0.5 h-3 w-3" />
                  {selectedSubject?.teacherName ?? "No teacher"}
                </Badge>
                <Badge variant="info">Maximum {selectedSubject?.maxMarks ?? 100}</Badge>
                <Badge variant={enteredCount === exam.students.length ? "success" : "warning"}>
                  {enteredCount}/{exam.students.length} entered
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-10">#</th>
                    <th>Student</th>
                    <th className="hidden sm:table-cell">Admission no.</th>
                    <th>Marks</th>
                    <th>Percentage</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {exam.students.map((student, index) => {
                    const value = marks[student.id] ?? "";
                    const numeric = Number(value);
                    const valid = value !== "" && Number.isFinite(numeric) && numeric >= 0 && numeric <= (selectedSubject?.maxMarks ?? 100);
                    const pct = valid && selectedSubject ? Math.round((numeric / selectedSubject.maxMarks) * 100) : null;
                    const invalid = value !== "" && !valid;
                    return (
                      <tr key={student.id}>
                        <td className="text-[10px] tabular-nums text-ink-300">
                          {String(index + 1).padStart(2, "0")}
                        </td>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <Avatar firstName={student.firstName} lastName={student.lastName} size="sm" />
                            <div>
                              <p className="text-[12px] font-semibold text-ink-800">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="font-mono text-[9px] text-ink-400 sm:hidden">{student.admissionNo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell">
                          <span className="font-mono text-[10px] text-ink-400">{student.admissionNo}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={selectedSubject?.maxMarks ?? 100}
                              step="0.5"
                              value={value}
                              disabled={locked}
                              onChange={(event) =>
                                setMarks((current) => ({ ...current, [student.id]: event.target.value }))
                              }
                              aria-label={`Marks for ${student.firstName} ${student.lastName}`}
                              placeholder="—"
                              className={cn(
                                "h-9 w-20 rounded-lg border bg-white px-2 text-center text-[12px] font-semibold tabular-nums text-ink-900 transition focus:outline-none focus:ring-4 focus:ring-ink-900/5 disabled:bg-paper disabled:text-ink-400",
                                invalid
                                  ? "border-clay-300 focus:border-clay-400"
                                  : "border-line focus:border-ink-300",
                              )}
                            />
                            <span className="text-[10px] text-ink-300">/ {selectedSubject?.maxMarks ?? 100}</span>
                          </div>
                          {invalid ? (
                            <p className="mt-1 text-[10px] text-clay-600">Enter 0 – {selectedSubject?.maxMarks ?? 100}</p>
                          ) : null}
                        </td>
                        <td>
                          {pct === null ? (
                            <span className="text-[11px] text-ink-300">—</span>
                          ) : (
                            <Badge variant={pct >= 75 ? "success" : pct >= 40 ? "info" : "danger"}>{pct}%</Badge>
                          )}
                        </td>
                        <td>
                          {pct === null ? (
                            <span className="text-[11px] text-ink-300">—</span>
                          ) : (
                            <GradeBadge grade={gradeForPercentage(pct)} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/40 px-4 py-3.5 sm:px-5">
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-400">
                <span>
                  Subject average:{" "}
                  <span className="font-semibold text-ink-700">{subjectAverage}%</span>
                </span>
                {dirty ? <Badge variant="warning" dot>Unsaved changes</Badge> : null}
                {locked ? (
                  <Badge variant="neutral" dot={false}>
                    <Lock className="mr-0.5 h-2.5 w-2.5" /> Read-only
                  </Badge>
                ) : null}
              </div>
              <Button
                leftIcon={<Save className="h-4 w-4" />}
                onClick={saveMarks}
                disabled={!dirty || locked || hasInvalidMarks}
                loading={saveMutation.isPending}
              >
                Save marks
              </Button>
            </div>
          </Card>
        )
      ) : null}

      {tab === "results" ? (
        <div className="print-area space-y-4">
          {resultsQuery.isLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="cut-card h-24 p-4">
                    <div className="skeleton h-3 w-20" />
                    <div className="mt-3 skeleton h-7 w-16" />
                  </div>
                ))}
              </div>
              <div className="cut-card h-72 p-5">
                <div className="skeleton h-4 w-40" />
                <div className="mt-6 space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="skeleton h-6 w-full" />
                  ))}
                </div>
              </div>
            </div>
          ) : resultsQuery.isError || !results ? (
            <ErrorState
              title="Results couldn’t load"
              description={getErrorMessage(resultsQuery.error)}
              onRetry={() => void resultsQuery.refetch()}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="p-4">
                  <p className="eyebrow">Class average</p>
                  <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-ink-950">
                    {results.stats.classAverage}%
                  </p>
                  <p className="mt-1 text-[10px] text-ink-400">Across entered marks</p>
                </Card>
                <Card className="p-4">
                  <p className="eyebrow">Highest average</p>
                  <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-ink-950">
                    {results.stats.highest}%
                  </p>
                  <p className="mt-1 text-[10px] text-ink-400">Top of this class</p>
                </Card>
                <Card className="p-4">
                  <p className="eyebrow">Pass rate</p>
                  <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-sage-700">
                    {results.stats.passRate}%
                  </p>
                  <p className="mt-1 text-[10px] text-ink-400">Scoring 40% or above</p>
                </Card>
                <Card className="p-4">
                  <p className="eyebrow">Students assessed</p>
                  <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-ink-950">
                    {results.stats.enteredCount}
                    <span className="text-base text-ink-300"> / {results.stats.studentCount}</span>
                  </p>
                  <p className="mt-1 text-[10px] text-ink-400">{results.stats.maxTotal} total marks</p>
                </Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-12">
                <Card className="p-5 xl:col-span-7">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-ink-900">Subject averages</h2>
                      <p className="mt-0.5 text-[12px] text-ink-400">Performance across each paper</p>
                    </div>
                    <BookOpen className="h-4 w-4 text-ink-300" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {results.subjectAverages.map((subject) => (
                      <div key={subject.subjectId}>
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span className="font-medium text-ink-700">
                            {subject.name} <span className="text-ink-300">· {subject.code}</span>
                          </span>
                          <span className="font-semibold tabular-nums text-ink-800">
                            {subject.average}%{" "}
                            <span className="font-normal text-ink-300">({subject.entered} entered)</span>
                          </span>
                        </div>
                        <ProgressBar value={subject.average} tone={subject.average >= 70 ? "sage" : "marigold"} />
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-5 xl:col-span-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-ink-900">Grade distribution</h2>
                      <p className="mt-0.5 text-[12px] text-ink-400">How the class is spread</p>
                    </div>
                    <Users className="h-4 w-4 text-ink-300" />
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
                    {(["A+", "A", "B", "C", "D", "E", "F"] as const).map((grade) => (
                      <div key={grade} className="rounded-xl border border-line bg-paper/50 py-2.5 text-center">
                        <GradeBadge grade={grade} />
                        <p className="mt-1.5 text-sm font-semibold tabular-nums text-ink-900">
                          {results.stats.distribution[grade] ?? 0}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-paper/70 px-3 py-2.5 text-[11px] text-ink-400">
                    <span>Exam status</span>
                    <StatusBadge status={results.exam.status} />
                  </div>
                  <p className="mt-3 text-[10px] leading-5 text-ink-300">
                    Pass mark is 40%. Rankings are based on each student's entered subject average.
                  </p>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-4 sm:px-5">
                  <div>
                    <h2 className="text-base font-semibold text-ink-900">Class results</h2>
                    <p className="mt-0.5 text-[12px] text-ink-400">
                      {classLabel(results.exam.class)} · {results.exam.name}
                    </p>
                  </div>
                  <Badge variant={results.exam.status === "PUBLISHED" ? "success" : "warning"}>
                    {results.exam.status === "PUBLISHED" ? "Published results" : "Draft results"}
                  </Badge>
                </div>

                {results.stats.enteredCount === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No marks entered yet"
                    description="Start entering marks for each subject. Results and rankings will appear here automatically."
                    action={
                      <Button variant="outline" onClick={() => changeTab("marks")}>
                        Go to marks entry
                      </Button>
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Student</th>
                          {results.exam.subjects.map((subject) => (
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
                        {results.rows.map((row) => (
                          <tr key={row.student.id}>
                            <td>
                              <span
                                className={cn(
                                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                                  row.rank === 1
                                    ? "bg-marigold-400 text-ink-950"
                                    : row.rank && row.rank <= 3
                                      ? "bg-ink-100 text-ink-700"
                                      : "text-ink-400",
                                )}
                              >
                                {row.rank ?? "—"}
                              </span>
                            </td>
                            <td>
                              <p className="whitespace-nowrap text-[12px] font-semibold text-ink-800">
                                {row.student.firstName} {row.student.lastName}
                              </p>
                              <p className="font-mono text-[9px] text-ink-400">{row.student.admissionNo}</p>
                            </td>
                            {results.exam.subjects.map((subject) => {
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
      ) : null}

      <ConfirmDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onConfirm={() => publishMutation.mutate()}
        title={exam.status === "PUBLISHED" ? "Unpublish these results?" : "Publish these results?"}
        description={
          exam.status === "PUBLISHED"
            ? "The exam returns to draft, marks become editable again and results are hidden from report cards until republished."
            : `Results for ${exam.name} will be visible on student report cards and all marks will be locked. ${completion < 100 ? "Some marks are still missing — those subjects will show as incomplete." : ""}`
        }
        confirmLabel={exam.status === "PUBLISHED" ? "Unpublish results" : "Publish results"}
        loading={publishMutation.isPending}
        destructive={exam.status === "PUBLISHED"}
      />
    </div>
  );
}
