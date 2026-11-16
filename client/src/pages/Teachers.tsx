import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  GraduationCap,
  Mail,
  Pencil,
  Phone,
  Plus,
  SearchX,
  UserMinus,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useTeachers } from "@/lib/hooks";
import { useDebouncedValue } from "@/lib/use-debounced";
import { useToast } from "@/lib/toast";
import type { Teacher } from "@/types";
import { formatDate, getErrorMessage } from "@/lib/utils";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  SearchInput,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { TeacherForm, type TeacherFormValues } from "@/components/forms/TeacherForm";

export default function TeachersPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const teachersQuery = useTeachers();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Teacher | null>(null);

  const teachers = teachersQuery.data ?? [];
  const filtered = debounced
    ? teachers.filter((teacher) =>
        [teacher.user.name, teacher.user.email, teacher.employeeNo]
          .join(" ")
          .toLowerCase()
          .includes(debounced.toLowerCase()),
      )
    : teachers;

  const activeCount = teachers.filter((teacher) => teacher.user.active).length;
  const classCount = teachers.reduce((sum, teacher) => sum + teacher.classCount, 0);
  const subjectCount = teachers.reduce((sum, teacher) => sum + teacher.subjectCount, 0);

  const saveTeacher = async (values: TeacherFormValues) => {
    const payload = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      qualification: values.qualification,
      active: values.active === "true",
      ...(values.password ? { password: values.password } : {}),
    };

    if (editing) {
      await api.patch(`/teachers/${editing.id}`, payload);
      toast.success("Teacher updated", "The staff profile has been saved.");
    } else {
      await api.post("/teachers", { ...payload, employeeNo: values.employeeNo, password: values.password });
      toast.success("Teacher account created", "Share the temporary password securely.");
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["teachers"] }),
      queryClient.invalidateQueries({ queryKey: ["classes"] }),
      queryClient.invalidateQueries({ queryKey: ["subjects"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
    setFormOpen(false);
    setEditing(null);
  };

  const deactivateMutation = useMutation({
    mutationFn: (teacher: Teacher) => api.delete<{ message: string }>(`/teachers/${teacher.id}`),
    onSuccess: async (response) => {
      toast.success("Teacher account deactivated", response.message);
      setDeactivateTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["teachers"] }),
        queryClient.invalidateQueries({ queryKey: ["classes"] }),
        queryClient.invalidateQueries({ queryKey: ["subjects"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error) => toast.error("Could not deactivate teacher", getErrorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Staff directory"
        title="Teachers"
        description="Manage teaching accounts, qualifications and class responsibilities."
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add teacher
          </Button>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Teaching staff" value={teachers.length} icon={GraduationCap} accent="ink" hint={`${activeCount} active accounts`} />
        <StatCard label="Class leadership" value={classCount} icon={Users} accent="marigold" hint="Class teacher assignments" />
        <StatCard label="Subject coverage" value={subjectCount} icon={BookOpen} accent="sage" hint="Subjects with a named teacher" />
      </div>

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search teachers by name, email or employee no.…"
            className="w-full sm:max-w-md"
          />
          <p className="text-[12px] text-ink-400 sm:ml-auto">
            <span className="font-semibold text-ink-700">{filtered.length}</span> of {teachers.length} teachers
          </p>
        </div>
      </Card>

      {teachersQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-5">
              <div className="flex items-center gap-3">
                <div className="skeleton h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-3 w-20" />
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : teachersQuery.isError ? (
        <ErrorState
          title="The staff directory couldn’t load"
          description={getErrorMessage(teachersQuery.error)}
          onRetry={() => void teachersQuery.refetch()}
        />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={search ? SearchX : GraduationCap}
            title={search ? "No teachers match your search" : "No teaching staff yet"}
            description={
              search
                ? "Try a different name, email or employee number."
                : "Create the first teacher account to start assigning classes and subjects."
            }
            action={
              search ? (
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              ) : (
                <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
                  Add teacher
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((teacher) => (
            <Card
              key={teacher.id}
              className={`group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float ${
                teacher.user.active ? "" : "opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={teacher.user.name} size="lg" />
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-semibold text-ink-900">{teacher.user.name}</h2>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-400">{teacher.employeeNo}</p>
                  </div>
                </div>
                <StatusBadge status={teacher.user.active ? "ACTIVE" : "INACTIVE"} />
              </div>

              <div className="mt-4 space-y-1.5 border-t border-line/70 pt-3.5">
                <p className="flex items-center gap-2 text-[12px] text-ink-500">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-ink-300" />
                  <span className="truncate">{teacher.user.email}</span>
                </p>
                <p className="flex items-center gap-2 text-[12px] text-ink-500">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-ink-300" />
                  {teacher.phone || "No phone on record"}
                </p>
                <p className="flex items-start gap-2 text-[12px] text-ink-500">
                  <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-300" />
                  {teacher.qualification || "Qualification not recorded"}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="info">{teacher.classCount} class{teacher.classCount === 1 ? "" : "es"}</Badge>
                <Badge variant="neutral">{teacher.subjectCount} subject{teacher.subjectCount === 1 ? "" : "s"}</Badge>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-3.5">
                <span className="text-[10px] text-ink-300">
                  Joined {formatDate(teacher.createdAt)}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setEditing(teacher);
                      setFormOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  {teacher.user.active ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-clay-600 hover:bg-clay-50 hover:text-clay-700"
                      leftIcon={<UserMinus className="h-3.5 w-3.5" />}
                      onClick={() => setDeactivateTarget(teacher)}
                    >
                      Deactivate
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit teacher" : "Create a teacher account"}
        description={
          editing
            ? "Update the staff profile or reset the account password."
            : "The teacher can sign in immediately with the temporary password you set."
        }
        size="lg"
      >
        <TeacherForm
          key={editing?.id ?? "new-teacher"}
          teacher={editing}
          onSubmit={saveTeacher}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => {
          if (deactivateTarget) deactivateMutation.mutate(deactivateTarget);
        }}
        title="Deactivate this teacher account?"
        description={
          deactivateTarget
            ? `${deactivateTarget.user.name} will lose access immediately. Their class leadership and subject assignments will be cleared, but historical records remain intact.`
            : ""
        }
        confirmLabel="Deactivate account"
        loading={deactivateMutation.isPending}
      />
    </div>
  );
}
