import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileEdit,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useClasses, useExams } from "@/lib/hooks";
import { useToast } from "@/lib/toast";
import type { ExamSummary } from "@/types";
import { classLabel, formatDate, getErrorMessage } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  ProgressBar,
  Select,
  Skeleton,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { ExamForm, type ExamFormValues } from "@/components/forms/ExamForm";

export default function ExamsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<ExamSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExamSummary | null>(null);

  const classesQuery = useClasses();
  const examsQuery = useExams(classId || undefined);

  const exams = examsQuery.data ?? [];
  const filtered = exams.filter((exam) => statusFilter === "ALL" || exam.status === statusFilter);
  const published = exams.filter((exam) => exam.status === "PUBLISHED").length;
  const drafts = exams.filter((exam) => exam.status === "DRAFT").length;
  const averageProgress = exams.length
    ? Math.round(exams.reduce((sum, exam) => sum + exam.progress, 0) / exams.length)
    : 0;

  const createExam = async (values: ExamFormValues & { subjectIds: string[] }) => {
    const response = await api.post<{ data: ExamSummary }>("/exams", {
      name: values.name,
      term: values.term,
      classId: values.classId,
      startDate: values.startDate,
      endDate: values.endDate,
      subjects: values.subjectIds.map((subjectId) => ({ subjectId, maxMarks: 100 })),
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["exams"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
    toast.success("Exam created", "Add marks when the assessment is complete.");
    setFormOpen(false);
    navigate(`/exams/${response.data.id}`);
  };

  const publishMutation = useMutation({
    mutationFn: (exam: ExamSummary) =>
      api.patch<{ message: string }>(`/exams/${exam.id}`, {
        status: exam.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
      }),
    onSuccess: async (response) => {
      toast.success("Exam status updated", response.message);
      setPublishTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exams"] }),
        queryClient.invalidateQueries({ queryKey: ["exam"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error) => toast.error("Could not update exam", getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (exam: ExamSummary) => api.delete<{ message: string }>(`/exams/${exam.id}`),
    onSuccess: async (response) => {
      toast.success("Exam deleted", response.message);
      setDeleteTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exams"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error) => toast.error("Could not delete exam", getErrorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Assessment"
        title="Examinations"
        description="Plan assessments, enter marks by subject and publish results when they are ready."
        actions={
          isAdmin ? (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
              New exam
            </Button>
          ) : null
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Exams on record" value={exams.length} icon={ClipboardList} accent="ink" hint="Across all selected classes" />
        <StatCard label="Published" value={published} icon={CheckCircle2} accent="sage" hint="Results visible on report cards" />
        <StatCard label="Drafts" value={drafts} icon={FileEdit} accent="marigold" hint="Marks still being entered" />
        <StatCard label="Marks completion" value={`${averageProgress}%`} icon={CalendarDays} accent="clay" hint="Average across all exams" />
      </div>

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            aria-label="Filter by class"
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
            className="w-full sm:w-64"
          >
            <option value="">All classes</option>
            {(classesQuery.data ?? []).map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} {cls.section}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full sm:w-48"
          >
            <option value="ALL">All statuses</option>
            <option value="DRAFT">Drafts</option>
            <option value="PUBLISHED">Published</option>
          </Select>
          <p className="text-[12px] text-ink-400 sm:ml-auto">
            <span className="font-semibold text-ink-700">{filtered.length}</span> exam
            {filtered.length === 1 ? "" : "s"}
          </p>
        </div>
      </Card>

      {examsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="flex items-center gap-4 p-4">
              <Skeleton className="h-14 w-14 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32 sm:w-56" />
                <Skeleton className="h-3 w-80 max-w-full" />
              </div>
              <Skeleton className="h-8 w-16 shrink-0 sm:w-24" />
            </Card>
          ))}
        </div>
      ) : examsQuery.isError ? (
        <ErrorState
          title="Examinations couldn’t load"
          description={getErrorMessage(examsQuery.error)}
          onRetry={() => void examsQuery.refetch()}
        />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title={exams.length ? "No exams match these filters" : "No examinations yet"}
            description={
              exams.length
                ? "Try another class or status, or clear the filters."
                : "Create an exam to start entering marks and building report cards."
            }
            action={
              exams.length ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setClassId("");
                    setStatusFilter("ALL");
                  }}
                >
                  Clear filters
                </Button>
              ) : isAdmin ? (
                <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
                  Create first exam
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((exam) => {
            const expected = exam.studentCount * exam.subjectCount;
            return (
              <Card key={exam.id} className="group p-4 transition-shadow hover:shadow-float sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-white text-center">
                      <div className="bg-ink-900 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-marigold-300">
                        {formatDate(exam.startDate, "MMM")}
                      </div>
                      <div className="py-1.5 font-display text-xl font-semibold leading-none text-ink-950">
                        {formatDate(exam.startDate, "d")}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/exams/${exam.id}`}
                          className="truncate text-[15px] font-semibold text-ink-900 hover:text-ink-600 hover:underline"
                        >
                          {exam.name}
                        </Link>
                        <StatusBadge status={exam.status} />
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-400">
                        <span>{classLabel(exam.class)}</span>
                        <span>·</span>
                        <span>{exam.term}</span>
                        <span>·</span>
                        <span>
                          {formatDate(exam.startDate, "d MMM")} – {formatDate(exam.endDate, "d MMM yyyy")}
                        </span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant="neutral">{exam.subjectCount} subjects</Badge>
                        <Badge variant="neutral">{exam.studentCount} students</Badge>
                        <Badge variant={exam.progress === 100 ? "success" : "warning"}>
                          {exam.markCount}/{expected || "—"} marks
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-44">
                    <div className="mb-1.5 flex items-center justify-between text-[10px]">
                      <span className="text-ink-400">Marks entered</span>
                      <span className="font-semibold text-ink-700">{exam.progress}%</span>
                    </div>
                    <ProgressBar value={exam.progress} tone={exam.progress === 100 ? "sage" : "marigold"} />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                    <Link
                      to={`/exams/${exam.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12px] font-semibold text-ink-700 transition hover:border-ink-200 hover:bg-paper/50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Open
                    </Link>
                    {isAdmin ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={
                            exam.status === "PUBLISHED" ? (
                              <RotateCcw className="h-3.5 w-3.5" />
                            ) : (
                              <Lock className="h-3.5 w-3.5" />
                            )
                          }
                          onClick={() => setPublishTarget(exam)}
                        >
                          {exam.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        </Button>
                        {exam.status === "DRAFT" ? (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(exam)}
                            className="rounded-lg p-2 text-ink-400 transition hover:bg-clay-50 hover:text-clay-600"
                            aria-label={`Delete ${exam.name}`}
                            title="Delete exam"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    <Link
                      to={`/exams/${exam.id}`}
                      className="rounded-lg p-2 text-ink-300 transition hover:bg-paper hover:text-ink-800"
                      aria-label={`View ${exam.name}`}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Create an exam"
        description="Choose a class, set the assessment window and include its subjects."
        size="lg"
      >
        <ExamForm
          classes={classesQuery.data ?? []}
          defaultClassId={classId || undefined}
          onSubmit={createExam}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(publishTarget)}
        onClose={() => setPublishTarget(null)}
        onConfirm={() => {
          if (publishTarget) publishMutation.mutate(publishTarget);
        }}
        title={publishTarget?.status === "PUBLISHED" ? "Unpublish these results?" : "Publish these results?"}
        description={
          publishTarget
            ? publishTarget.status === "PUBLISHED"
              ? "Unpublishing moves the exam back to draft. Marks can be edited again and results disappear from report cards until republished."
              : `Results for ${publishTarget.name} will appear on student report cards and marks will be locked. You can unpublish later if corrections are needed.`
            : ""
        }
        confirmLabel={publishTarget?.status === "PUBLISHED" ? "Unpublish results" : "Publish results"}
        loading={publishMutation.isPending}
        destructive={publishTarget?.status === "PUBLISHED"}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
        title="Delete this exam?"
        description={
          deleteTarget
            ? `${deleteTarget.name} and any marks already entered will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete exam"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
