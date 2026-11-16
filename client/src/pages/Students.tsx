import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import {
  Archive,
  Eye,
  FilterX,
  Pencil,
  Plus,
  UserRound,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useClasses } from "@/lib/hooks";
import { useDebouncedValue } from "@/lib/use-debounced";
import { useToast } from "@/lib/toast";
import type { Paginated, StudentListItem } from "@/types";
import { attendanceTone, classLabel, getErrorMessage, initials } from "@/lib/utils";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  TableSkeleton,
} from "@/components/ui";
import { StudentForm, type StudentFormValues } from "@/components/forms/StudentForm";

export default function StudentsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [classId, setClassId] = useState(searchParams.get("classId") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "ACTIVE");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? 1) || 1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentListItem | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<StudentListItem | null>(null);

  const urlQuery = searchParams.get("q") ?? "";
  useEffect(() => {
    setSearch(urlQuery);
    setPage(1);
  }, [urlQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, classId, status]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      if (isAdmin) {
        setEditing(null);
        setFormOpen(true);
      }
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, isAdmin, setSearchParams]);

  const classesQuery = useClasses();

  const params = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (classId) params.set("classId", classId);
  if (status && status !== "ALL") params.set("status", status);

  const studentsQuery = useQuery({
    queryKey: ["students", debouncedSearch, classId, status, page],
    queryFn: () =>
      api.get<Paginated<StudentListItem>>(`/students?${params.toString()}`),
    placeholderData: keepPreviousData,
  });

  const saveStudent = async (values: StudentFormValues) => {
    if (editing) {
      await api.patch(`/students/${editing.id}`, values);
      toast.success("Student updated", "The student record has been saved.");
    } else {
      await api.post("/students", values);
      toast.success("Student registered", "The new student has been added to the class.");
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["students"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["classes"] }),
    ]);
    setFormOpen(false);
    setEditing(null);
  };

  const archiveMutation = useMutation({
    mutationFn: (student: StudentListItem) =>
      api.delete<{ message: string }>(`/students/${student.id}`),
    onSuccess: async (response) => {
      toast.success("Student archived", response.message);
      setArchiveTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["classes"] }),
      ]);
    },
    onError: (error) => toast.error("Could not archive student", getErrorMessage(error)),
  });

  const hasFilters = Boolean(search || classId || (status && status !== "ACTIVE"));
  const students = studentsQuery.data?.data ?? [];
  const meta = studentsQuery.data?.meta;

  const clearFilters = () => {
    setSearch("");
    setClassId("");
    setStatus("ACTIVE");
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Student records"
        title="Students"
        description={
          isAdmin
            ? "Register students, keep their details current and follow their progress."
            : "Browse student records, class placements and attendance health."
        }
        actions={
          isAdmin ? (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add student
            </Button>
          ) : null
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, admission no. or guardian…"
            className="w-full lg:max-w-sm"
          />
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Select
              aria-label="Filter by class"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="w-full sm:w-auto"
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
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full sm:w-auto"
            >
              <option value="ACTIVE">Active students</option>
              <option value="INACTIVE">Archived</option>
              <option value="GRADUATED">Graduated</option>
              <option value="ALL">All statuses</option>
            </Select>
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters} leftIcon={<FilterX className="h-3.5 w-3.5" />}>
                Clear
              </Button>
            ) : null}
          </div>
          {meta ? (
            <p className="text-[12px] text-ink-400 lg:ml-auto">
              <span className="font-semibold text-ink-700">{meta.total}</span> student
              {meta.total === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
      </Card>

      {studentsQuery.isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : studentsQuery.isError ? (
        <ErrorState
          title="Student records couldn’t load"
          description={getErrorMessage(studentsQuery.error)}
          onRetry={() => void studentsQuery.refetch()}
        />
      ) : students.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={hasFilters ? "No students match these filters" : "No students yet"}
            description={
              hasFilters
                ? "Try a different class, status or search term."
                : "Register your first student to start building the school roll."
            }
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : isAdmin ? (
                <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
                  Add student
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th className="hidden sm:table-cell">Admission no.</th>
                  <th>Class</th>
                  <th className="hidden xl:table-cell">Guardian</th>
                  <th className="hidden md:table-cell">Status</th>
                  <th>Attendance</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar firstName={student.firstName} lastName={student.lastName} size="md" />
                        <div className="min-w-0">
                          <Link
                            to={`/students/${student.id}`}
                            className="block truncate text-[13px] font-semibold text-ink-900 hover:text-ink-600 hover:underline"
                          >
                            {student.firstName} {student.lastName}
                          </Link>
                          <p className="text-[11px] text-ink-400">{student.gender} · {classLabel(student.class)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className="font-mono text-[11px] text-ink-500">{student.admissionNo}</span>
                    </td>
                    <td>
                      <span className="text-[12px] font-medium text-ink-700">{classLabel(student.class)}</span>
                    </td>
                    <td className="hidden xl:table-cell">
                      <p className="text-[12px] text-ink-700">{student.guardianName}</p>
                      <p className="text-[10px] text-ink-400">{student.guardianPhone}</p>
                    </td>
                    <td className="hidden md:table-cell">
                      <StatusBadge status={student.status} />
                    </td>
                    <td>
                      {student.attendanceRate === null ? (
                        <span className="text-[11px] text-ink-300">No records</span>
                      ) : (
                        <Badge variant={attendanceTone(student.attendanceRate)}>
                          {student.attendanceRate}%
                        </Badge>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-0.5">
                        <Link
                          to={`/students/${student.id}`}
                          className="rounded-lg p-2 text-ink-400 transition hover:bg-paper hover:text-ink-800"
                          aria-label={`View ${student.firstName} ${student.lastName}`}
                          title="View profile"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {isAdmin ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(student);
                                setFormOpen(true);
                              }}
                              className="rounded-lg p-2 text-ink-400 transition hover:bg-paper hover:text-ink-800"
                              aria-label={`Edit ${student.firstName} ${student.lastName}`}
                              title="Edit student"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setArchiveTarget(student)}
                              className="rounded-lg p-2 text-ink-400 transition hover:bg-clay-50 hover:text-clay-600"
                              aria-label={`Archive ${student.firstName} ${student.lastName}`}
                              title="Archive student"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta ? (
            <div className="border-t border-line">
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                pageSize={meta.pageSize}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit student" : "Register a student"}
        description={
          editing
            ? "Update the student's record. Changes are saved immediately."
            : "Add a student to the school roll and assign them to a class."
        }
        size="lg"
      >
        <StudentForm
          key={editing?.id ?? "new"}
          classes={classesQuery.data ?? []}
          student={editing}
          onSubmit={saveStudent}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (archiveTarget) archiveMutation.mutate(archiveTarget);
        }}
        title="Archive this student?"
        description={
          archiveTarget
            ? `${archiveTarget.firstName} ${archiveTarget.lastName} will be removed from active rolls, but their attendance and marks will be preserved. You can restore them later by editing their status.`
            : ""
        }
        confirmLabel="Archive student"
        loading={archiveMutation.isPending}
      />
    </div>
  );
}
