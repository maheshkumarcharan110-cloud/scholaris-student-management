import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Printer,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useClasses } from "@/lib/hooks";
import { useToast } from "@/lib/toast";
import type { StudentDetail, StudentListItem } from "@/types";
import {
  attendanceTone,
  classLabel,
  formatDate,
  formatDateKey,
  getErrorMessage,
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
  Modal,
  PageSkeleton,
  PrintHeader,
  ProgressBar,
  StatusBadge,
  Tabs,
} from "@/components/ui";
import { StudentForm, type StudentFormValues } from "@/components/forms/StudentForm";

const attendanceLabels = [
  { key: "present", label: "Present", tone: "bg-sage-500" },
  { key: "late", label: "Late", tone: "bg-marigold-400" },
  { key: "absent", label: "Absent", tone: "bg-clay-500" },
  { key: "excused", label: "Excused", tone: "bg-ink-400" },
] as const;

function DetailItem({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-paper text-ink-400">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">{label}</p>
        <div className="mt-0.5 break-words text-[13px] text-ink-700">{children}</div>
      </div>
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [printRequested, setPrintRequested] = useState(false);

  const studentQuery = useQuery({
    queryKey: ["student", id],
    queryFn: () => api.get<{ data: StudentDetail }>(`/students/${id}`).then((response) => response.data),
    enabled: Boolean(id),
  });

  const classesQuery = useClasses();

  const student = studentQuery.data;

  const editableStudent = useMemo<StudentListItem | null>(() => {
    if (!student) return null;
    return {
      id: student.id,
      admissionNo: student.admissionNo,
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      email: student.email,
      phone: student.phone,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      address: student.address,
      status: student.status,
      enrolledAt: student.enrolledAt,
      class: { id: student.class.id, name: student.class.name, section: student.class.section },
      classId: student.class.id,
      attendanceRate: student.attendance.rate,
      attendanceMarked: student.attendance.total,
    };
  }, [student]);

  const saveStudent = async (values: StudentFormValues) => {
    if (!id) return;
    await api.patch(`/students/${id}`, values);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["student", id] }),
      queryClient.invalidateQueries({ queryKey: ["students"] }),
      queryClient.invalidateQueries({ queryKey: ["classes"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
    setEditOpen(false);
    toast.success("Student updated", "The student record has been saved.");
  };

  const archiveMutation = useMutation({
    mutationFn: () => api.delete<{ message: string }>(`/students/${id}`),
    onSuccess: async (response) => {
      setArchiveOpen(false);
      toast.success("Student archived", response.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["student", id] }),
        queryClient.invalidateQueries({ queryKey: ["students"] }),
      ]);
    },
    onError: (error) => toast.error("Could not archive student", getErrorMessage(error)),
  });

  useEffect(() => {
    if (!printRequested) return;
    if (tab !== "results") {
      setTab("results");
      return;
    }
    const timer = window.setTimeout(() => {
      window.print();
      setPrintRequested(false);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [printRequested, tab]);

  if (studentQuery.isLoading) return <PageSkeleton />;
  if (studentQuery.isError || !student) {
    return (
      <ErrorState
        title="Student profile unavailable"
        description={getErrorMessage(studentQuery.error)}
        onRetry={() => void studentQuery.refetch()}
      />
    );
  }

  const attendance = student.attendance;
  const publishedResults = student.results.filter((result) => result.status === "PUBLISHED");
  const latestResult = publishedResults[0];

  return (
    <div>
      <PrintHeader
        title={`${student.firstName} ${student.lastName} — Student report`}
        subtitle={`${classLabel(student.class)} · Admission ${student.admissionNo}`}
      />

      <div className="no-print mb-4">
        <Link
          to="/students"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-400 transition hover:text-ink-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to students
        </Link>
      </div>

      <Card className="relative mb-4 overflow-hidden">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-marigold-100/50 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar firstName={student.firstName} lastName={student.lastName} size="xl" className="ring-4 ring-white" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink-950">
                  {student.firstName} {student.lastName}
                </h1>
                <StatusBadge status={student.status} />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-400">
                <span className="font-mono">{student.admissionNo}</span>
                <span>·</span>
                <span>{classLabel(student.class)}</span>
                <span>·</span>
                <span>{student.class.academicYear}</span>
                <span>·</span>
                <span>{student.gender}</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={attendanceTone(attendance.rate)} dot>
                  {attendance.rate}% attendance
                </Badge>
                {latestResult ? (
                  <Badge variant={attendanceTone(null)}>
                    Latest grade <GradeBadge grade={latestResult.grade} />
                  </Badge>
                ) : null}
                {student.class.classTeacherName ? (
                  <span className="text-[11px] text-ink-400">
                    Class teacher · <span className="font-medium text-ink-600">{student.class.classTeacherName}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={() => setPrintRequested(true)}
            >
              Print report
            </Button>
            {isAdmin ? (
              <Button
                variant="primary"
                leftIcon={<Pencil className="h-4 w-4" />}
                onClick={() => setEditOpen(true)}
              >
                Edit student
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="no-print mb-4">
        <Tabs
          items={[
            { id: "overview", label: "Overview" },
            { id: "attendance", label: "Attendance", count: attendance.total },
            { id: "results", label: "Results", count: student.results.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 xl:grid-cols-12">
          <Card className="p-5 xl:col-span-7">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink-900">Student profile</h2>
                <p className="mt-0.5 text-[12px] text-ink-400">Personal and academic details</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-paper text-ink-400">
                <UserRound className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
              <div className="divide-y divide-line/70">
                <DetailItem icon={CalendarDays} label="Date of birth">
                  {formatDate(student.dateOfBirth)}
                </DetailItem>
                <DetailItem icon={Mail} label="Student email">
                  {student.email || "Not provided"}
                </DetailItem>
                <DetailItem icon={Phone} label="Student phone">
                  {student.phone || "Not provided"}
                </DetailItem>
                <DetailItem icon={MapPin} label="Home address">
                  {student.address || "Not provided"}
                </DetailItem>
              </div>
              <div className="divide-y divide-line/70">
                <DetailItem icon={GraduationCap} label="Class">
                  {classLabel(student.class)} · {student.class.academicYear}
                </DetailItem>
                <DetailItem icon={ShieldCheck} label="Enrolled on">
                  {formatDate(student.enrolledAt)}
                </DetailItem>
                <DetailItem icon={UserRound} label="Guardian">
                  {student.guardianName}
                  <span className="block text-[11px] text-ink-400">{student.guardianPhone}</span>
                </DetailItem>
                <DetailItem icon={Sparkles} label="Class teacher">
                  {student.class.classTeacherName || "Not assigned"}
                </DetailItem>
              </div>
            </div>
          </Card>

          <div className="space-y-4 xl:col-span-5">
            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-ink-900">Attendance health</h2>
                  <p className="mt-0.5 text-[12px] text-ink-400">All recorded school days</p>
                </div>
                <Badge variant={attendanceTone(attendance.rate)}>{attendance.rate}%</Badge>
              </div>
              <div className="mt-5 flex items-center gap-5">
                <div
                  className="ring-progress grid h-24 w-24 shrink-0 place-items-center rounded-full"
                  style={{ "--progress": `${attendance.rate}%` } as React.CSSProperties}
                >
                  <div className="grid h-[74px] w-[74px] place-items-center rounded-full bg-surface">
                    <div className="text-center">
                      <span className="block font-display text-xl font-semibold leading-none text-ink-950">
                        {attendance.rate}%
                      </span>
                      <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.12em] text-ink-300">
                        present
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid flex-1 grid-cols-2 gap-2">
                  {attendanceLabels.map((item) => (
                    <div key={item.key} className="rounded-lg bg-paper/70 px-2.5 py-2">
                      <p className="flex items-center gap-1.5 text-[10px] text-ink-400">
                        <span className={`h-1.5 w-1.5 rounded-full ${item.tone}`} />
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink-900">
                        {attendance[item.key]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-ink-400">
                {attendance.total} attendance records. Present and late both count as attended.
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-ink-900">Latest assessment</h2>
                  <p className="mt-0.5 text-[12px] text-ink-400">
                    {latestResult ? `${latestResult.name} · ${latestResult.term}` : "No published results"}
                  </p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-paper text-ink-400">
                  <FileText className="h-4 w-4" />
                </span>
              </div>
              {latestResult ? (
                <>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="font-display text-3xl font-semibold tabular-nums text-ink-950">
                        {latestResult.percentage}%
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-400">
                        {latestResult.total} of {latestResult.maxTotal} marks
                      </p>
                    </div>
                    <GradeBadge grade={latestResult.grade} />
                  </div>
                  <ProgressBar value={latestResult.percentage} tone="marigold" className="mt-3" />
                  <button
                    type="button"
                    onClick={() => setTab("results")}
                    className="mt-4 text-[12px] font-semibold text-ink-600 hover:text-ink-900"
                  >
                    View all results →
                  </button>
                </>
              ) : (
                <p className="mt-4 text-[12px] leading-5 text-ink-400">
                  Results will appear here once an exam has been published.
                </p>
              )}
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "attendance" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {attendanceLabels.map((item) => (
              <Card key={item.key} className="p-4">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${item.tone}`} />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                    {item.label}
                  </p>
                </div>
                <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-ink-950">
                  {attendance[item.key]}
                </p>
              </Card>
            ))}
          </div>
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink-900">Attendance history</h2>
                <p className="mt-0.5 text-[12px] text-ink-400">Most recent records, newest first</p>
              </div>
              <Badge variant={attendanceTone(attendance.rate)}>{attendance.rate}% attendance</Badge>
            </div>
            {attendance.records.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No attendance recorded"
                description="Attendance will appear after the first roll call for this student."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.records.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <span className="text-[12px] font-medium text-ink-800">
                            {formatDate(record.date, "EEE, d MMM yyyy")}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="text-[12px] text-ink-400">{record.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "results" ? (
        <div className="print-area space-y-4">
          {student.results.length === 0 ? (
            <Card>
              <EmptyState
                icon={FileText}
                title="No results yet"
                description="Marks appear here as soon as teachers enter them for an exam."
              />
            </Card>
          ) : (
            student.results.map((result) => (
              <Card key={result.id} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper/40 px-5 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-semibold text-ink-900">{result.name}</h2>
                      <StatusBadge status={result.status} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-400">
                      {result.term} · {formatDate(result.startDate)} – {formatDate(result.endDate)} ·{" "}
                      {classLabel(result.class)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-300">Overall</p>
                      <p className="text-lg font-semibold tabular-nums text-ink-900">
                        {result.percentage}%
                      </p>
                    </div>
                    <GradeBadge grade={result.grade} />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Marks</th>
                        <th className="hidden sm:table-cell">Maximum</th>
                        <th>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.subjects.map((subject) => {
                        const pct =
                          subject.marks === null ? null : Math.round((subject.marks / subject.maxMarks) * 100);
                        return (
                          <tr key={subject.id}>
                            <td>
                              <p className="text-[12px] font-medium text-ink-800">{subject.name}</p>
                              <p className="text-[10px] text-ink-400">{subject.code}</p>
                            </td>
                            <td>
                              <span className="text-[12px] font-semibold tabular-nums text-ink-900">
                                {subject.marks ?? "—"}
                              </span>
                            </td>
                            <td className="hidden sm:table-cell text-[12px] text-ink-500">
                              {subject.maxMarks}
                            </td>
                            <td>
                              {pct === null ? (
                                <span className="text-[11px] text-ink-300">Not entered</span>
                              ) : (
                                <GradeBadge
                                  grade={
                                    pct >= 90
                                      ? "A+"
                                      : pct >= 80
                                        ? "A"
                                        : pct >= 70
                                          ? "B"
                                          : pct >= 60
                                            ? "C"
                                            : pct >= 50
                                              ? "D"
                                              : pct >= 40
                                                ? "E"
                                                : "F"
                                  }
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-paper/50">
                        <td className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                          Total
                        </td>
                        <td className="px-4 py-3 text-[13px] font-semibold tabular-nums text-ink-900">
                          {result.total}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-[12px] text-ink-500">
                          {result.maxTotal}
                        </td>
                        <td className="px-4 py-3 text-[12px] font-semibold text-ink-700">
                          {result.percentage}% · {result.grade}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {result.status === "DRAFT" ? (
                  <p className="border-t border-marigold-100 bg-marigold-50/60 px-5 py-2.5 text-[11px] text-marigold-700">
                    These marks are still in draft and have not been published to the report card.
                  </p>
                ) : null}
              </Card>
            ))
          )}
          <p className="print-only pt-2 text-center text-[10px] text-ink-400">
            Scholaris Academy · Generated {formatDateKey(new Date().toISOString())}
          </p>
        </div>
      ) : null}

      {isAdmin && editableStudent ? (
        <Modal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit student"
          description="Update this student's details and class placement."
          size="lg"
        >
          <StudentForm
            classes={classesQuery.data ?? []}
            student={editableStudent}
            onSubmit={saveStudent}
            onCancel={() => setEditOpen(false)}
          />
        </Modal>
      ) : null}

      {isAdmin && student.status === "ACTIVE" ? (
        <div className="no-print mt-8 border-t border-line pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-ink-800">Archive this student</p>
              <p className="mt-0.5 text-[11px] text-ink-400">
                Removes the student from active rolls while keeping all historical records.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-clay-200 text-clay-600 hover:border-clay-300 hover:bg-clay-50"
              onClick={() => setArchiveOpen(true)}
            >
              Archive student
            </Button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={() => archiveMutation.mutate()}
        title="Archive this student?"
        description={`${student.firstName} ${student.lastName} will be removed from active rolls and hidden from daily registers. Attendance and exam history are kept and the record can be restored by an administrator.`}
        confirmLabel="Archive student"
        loading={archiveMutation.isPending}
      />
    </div>
  );
}
