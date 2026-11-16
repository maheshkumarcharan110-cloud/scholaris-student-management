import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck2,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Eraser,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useClasses } from "@/lib/hooks";
import { useToast } from "@/lib/toast";
import type { AttendanceRoster, AttendanceStatus } from "@/types";
import { classLabel, formatDate, getErrorMessage, todayKey } from "@/lib/utils";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  ProgressBar,
  Select,
  Skeleton,
  StatusBadge,
} from "@/components/ui";

const statusOptions: Array<{
  value: AttendanceStatus;
  label: string;
  shortLabel: string;
  icon: typeof Check;
  selected: string;
}> = [
  {
    value: "PRESENT",
    label: "Present",
    shortLabel: "Present",
    icon: Check,
    selected: "border-sage-600 bg-sage-600 text-white",
  },
  {
    value: "LATE",
    label: "Late",
    shortLabel: "Late",
    icon: Clock3,
    selected: "border-marigold-400 bg-marigold-400 text-ink-950",
  },
  {
    value: "ABSENT",
    label: "Absent",
    shortLabel: "Absent",
    icon: X,
    selected: "border-clay-600 bg-clay-600 text-white",
  },
  {
    value: "EXCUSED",
    label: "Excused",
    shortLabel: "Excused",
    icon: ShieldCheck,
    selected: "border-ink-600 bg-ink-600 text-white",
  },
];

export default function AttendancePage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const classesQuery = useClasses();
  const classes = classesQuery.data ?? [];

  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayKey());
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | null>>({});

  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id);
  }, [classId, classes]);

  const attendanceQuery = useQuery({
    queryKey: ["attendance", classId, date],
    queryFn: () =>
      api
        .get<{ data: AttendanceRoster }>(
          `/attendance?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`,
        )
        .then((response) => response.data),
    enabled: Boolean(classId),
    placeholderData: (previous) => previous,
  });

  const roster = attendanceQuery.data;

  useEffect(() => {
    if (!roster) return;
    const next: Record<string, AttendanceStatus | null> = {};
    for (const student of roster.students) next[student.id] = student.status;
    setStatuses(next);
  }, [roster]);

  const dirty = useMemo(() => {
    if (!roster) return false;
    return roster.students.some((student) => (statuses[student.id] ?? null) !== student.status);
  }, [roster, statuses]);

  const counts = useMemo(() => {
    const result = { present: 0, late: 0, absent: 0, excused: 0, marked: 0 };
    if (!roster) return result;
    for (const student of roster.students) {
      const status = statuses[student.id];
      if (!status) continue;
      result.marked += 1;
      if (status === "PRESENT") result.present += 1;
      else if (status === "LATE") result.late += 1;
      else if (status === "ABSENT") result.absent += 1;
      else result.excused += 1;
    }
    return result;
  }, [roster, statuses]);

  const rate = counts.marked ? Math.round(((counts.present + counts.late) / counts.marked) * 100) : 0;
  const unmarked = (roster?.students.length ?? 0) - counts.marked;

  const saveMutation = useMutation({
    mutationFn: () => {
      const records = (roster?.students ?? [])
        .filter((student) => statuses[student.id])
        .map((student) => ({
          studentId: student.id,
          status: statuses[student.id]!,
        }));
      return api.post<{ message: string }>("/attendance", { date, records });
    },
    onSuccess: async (response) => {
      toast.success("Attendance saved", response.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
      ]);
    },
    onError: (error) => toast.error("Attendance could not be saved", getErrorMessage(error)),
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

  const confirmDiscard = () =>
    !dirty || window.confirm("You have unsaved attendance changes. Discard them?");

  const changeClass = (value: string) => {
    if (!confirmDiscard()) return;
    setClassId(value);
  };

  const changeDate = (value: string) => {
    if (!confirmDiscard()) return;
    setDate(value);
  };

  const markAll = (status: AttendanceStatus | null) => {
    if (!roster) return;
    const next: Record<string, AttendanceStatus | null> = {};
    for (const student of roster.students) next[student.id] = status;
    setStatuses(next);
  };

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setStatuses((current) => ({
      ...current,
      [studentId]: current[studentId] === status ? null : status,
    }));
  };

  const canSave = Boolean(roster) && counts.marked > 0 && dirty && !saveMutation.isPending;

  return (
    <div>
      <PageHeader
        eyebrow="Daily operations"
        title="Attendance"
        description="Take the roll call, mark late arrivals and keep an accurate record of every school day."
        actions={
          <Button
            leftIcon={<Save className="h-4 w-4" />}
            disabled={!canSave}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Save attendance
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full md:max-w-xs">
            <label className="field-label" htmlFor="attendance-class">
              Class
            </label>
            <Select
              id="attendance-class"
              value={classId}
              onChange={(event) => changeClass(event.target.value)}
              disabled={classesQuery.isLoading || classes.length === 0}
            >
              {classes.length === 0 ? <option value="">No classes available</option> : null}
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.section} · {cls.studentCount} students
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full md:max-w-[200px]">
            <label className="field-label" htmlFor="attendance-date">
              Date
            </label>
            <input
              id="attendance-date"
              type="date"
              value={date}
              max={todayKey()}
              onChange={(event) => changeDate(event.target.value)}
              className="text-input"
            />
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 md:justify-end">
            {attendanceQuery.isFetching && !attendanceQuery.isLoading ? (
              <span className="text-[11px] text-ink-300">Refreshing…</span>
            ) : null}
            {dirty ? <Badge variant="warning" dot>Unsaved changes</Badge> : null}
            <Badge variant="info">
              <CalendarDays className="mr-0.5 h-3 w-3" />
              {formatDate(date, "EEE, d MMM yyyy")}
            </Badge>
          </div>
        </div>
      </Card>

      {classesQuery.isLoading ? (
        <div className="grid gap-4 xl:grid-cols-12">
          <Card className="p-5 xl:col-span-8">
            <Skeleton className="h-4 w-40" />
            <div className="mt-6 space-y-5">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="ml-auto h-8 w-56" />
                </div>
              ))}
            </div>
          </Card>
          <Skeleton className="h-72 rounded-2xl xl:col-span-4" />
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarCheck2}
            title="No classes to mark"
            description={
              isAdmin
                ? "Create a class and register students before taking attendance."
                : "No classes are available yet. Ask an administrator to set them up."
            }
            action={
              isAdmin ? (
                <Link
                  to="/classes"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white transition hover:bg-ink-800"
                >
                  Set up classes
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : null
            }
          />
        </Card>
      ) : attendanceQuery.isLoading ? (
        <div className="grid gap-4 xl:grid-cols-12">
          <Card className="p-5 xl:col-span-8">
            <Skeleton className="h-4 w-40" />
            <div className="mt-6 space-y-5">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="ml-auto h-8 w-56" />
                </div>
              ))}
            </div>
          </Card>
          <Skeleton className="h-72 rounded-2xl xl:col-span-4" />
        </div>
      ) : attendanceQuery.isError || !roster ? (
        <ErrorState
          title="Attendance couldn’t load"
          description={getErrorMessage(attendanceQuery.error)}
          onRetry={() => void attendanceQuery.refetch()}
        />
      ) : roster.students.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarCheck2}
            title="No active students in this class"
            description="Register students in this class before taking attendance."
            action={
              isAdmin ? (
                <Link
                  to="/students?new=1"
                  className="text-[12px] font-semibold text-ink-600 hover:text-ink-900"
                >
                  Add a student →
                </Link>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-12">
          <Card className="overflow-hidden xl:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
              <div>
                <h2 className="text-base font-semibold text-ink-900">Roll call</h2>
                <p className="mt-0.5 text-[12px] text-ink-400">
                  {roster.students.length} students · {counts.marked} marked
                  {unmarked > 0 ? ` · ${unmarked} unmarked` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
                  onClick={() => markAll("PRESENT")}
                >
                  Mark all present
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Eraser className="h-3.5 w-3.5" />}
                  onClick={() => markAll(null)}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="divide-y divide-line/70">
              {roster.students.map((student, index) => {
                const status = statuses[student.id] ?? null;
                return (
                  <div
                    key={student.id}
                    className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-paper/40 sm:flex-row sm:items-center sm:px-5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="w-5 text-right text-[10px] tabular-nums text-ink-300">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <Avatar firstName={student.firstName} lastName={student.lastName} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink-900">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="font-mono text-[10px] text-ink-400">{student.admissionNo}</p>
                      </div>
                      {status ? (
                        <span className="ml-1 hidden lg:inline-flex">
                          <StatusBadge status={status} dot={false} />
                        </span>
                      ) : (
                        <span className="ml-1 hidden text-[10px] text-ink-300 lg:inline-flex">Not marked</span>
                      )}
                    </div>

                    <div
                      className="grid grid-cols-4 gap-1 rounded-xl border border-line bg-white p-1 sm:w-[300px]"
                      role="group"
                      aria-label={`Attendance for ${student.firstName} ${student.lastName}`}
                    >
                      {statusOptions.map((option) => {
                        const Icon = option.icon;
                        const active = status === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setStatus(student.id, option.value)}
                            aria-pressed={active}
                            title={option.label}
                            className={`flex items-center justify-center gap-1 rounded-lg border px-1 py-1.5 text-[10px] font-semibold transition ${
                              active
                                ? option.selected
                                : "border-transparent text-ink-400 hover:bg-paper hover:text-ink-700"
                            }`}
                          >
                            <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                            <span className="hidden xl:inline">{option.shortLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/40 px-4 py-3 sm:px-5">
              <p className="text-[11px] text-ink-400">
                Tap a status again to leave a student unmarked, or save the marked entries as they are.
              </p>
              <Button
                size="sm"
                leftIcon={<Save className="h-3.5 w-3.5" />}
                disabled={!canSave}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                Save roll call
              </Button>
            </div>
          </Card>

          <div className="space-y-4 xl:col-span-4">
            <Card className="p-5 xl:sticky xl:top-20">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-ink-900">Today’s summary</h2>
                  <p className="mt-0.5 text-[12px] text-ink-400">{classLabel(roster.class)}</p>
                </div>
                <Badge variant={counts.marked === 0 ? "neutral" : rate >= 90 ? "success" : rate >= 75 ? "info" : "warning"}>
                  {counts.marked === 0 ? "Not marked" : `${rate}%`}
                </Badge>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {[
                  { label: "Present", value: counts.present, tone: "text-sage-700" },
                  { label: "Late", value: counts.late, tone: "text-marigold-700" },
                  { label: "Absent", value: counts.absent, tone: "text-clay-600" },
                  { label: "Excused", value: counts.excused, tone: "text-ink-600" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-line bg-paper/50 px-3 py-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">{item.label}</p>
                    <p className={`mt-0.5 text-xl font-semibold tabular-nums ${item.tone}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-ink-400">Marked</span>
                  <span className="font-semibold text-ink-700">
                    {counts.marked} / {roster.students.length}
                  </span>
                </div>
                <ProgressBar
                  value={(counts.marked / roster.students.length) * 100}
                  tone={unmarked > 0 ? "marigold" : "sage"}
                />
              </div>

              <Button
                className="mt-5 w-full"
                leftIcon={<Save className="h-4 w-4" />}
                disabled={!canSave}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                Save attendance
              </Button>
              {dirty ? (
                <p className="mt-2 text-center text-[10px] text-marigold-700">
                  {unmarked > 0
                    ? `${unmarked} unmarked student${unmarked === 1 ? "" : "s"} will keep their previous status.`
                    : "Review and save your changes."}
                </p>
              ) : (
                <p className="mt-2 text-center text-[10px] text-ink-300">
                  {counts.marked > 0 ? "All changes are saved." : "Mark at least one student to save."}
                </p>
              )}

              <div className="mt-5 border-t border-line pt-4">
                <Link
                  to="/reports"
                  className="flex items-center justify-between text-[12px] font-semibold text-ink-600 transition hover:text-ink-900"
                >
                  Open attendance reports
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <p className="mt-1 text-[10px] leading-5 text-ink-300">
                  Present and late both count toward the attendance rate.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
