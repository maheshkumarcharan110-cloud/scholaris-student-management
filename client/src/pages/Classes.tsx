import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Building2,
  ClipboardList,
  GraduationCap,
  Layers3,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useClasses, useSubjects, useTeachers } from "@/lib/hooks";
import { useToast } from "@/lib/toast";
import type { ClassSummary, Subject } from "@/types";
import { classLabel, getErrorMessage } from "@/lib/utils";
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
  Select,
  StatCard,
  TableSkeleton,
  Tabs,
} from "@/components/ui";
import { ClassForm, type ClassFormValues } from "@/components/forms/ClassForm";
import { SubjectForm, type SubjectFormValues } from "@/components/forms/SubjectForm";

export default function ClassesPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("classes");
  const [classFormOpen, setClassFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSummary | null>(null);
  const [subjectFormOpen, setSubjectFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectClassFilter, setSubjectClassFilter] = useState("");
  const [deleteClassTarget, setDeleteClassTarget] = useState<ClassSummary | null>(null);
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState<Subject | null>(null);

  const classesQuery = useClasses();
  const teachersQuery = useTeachers(isAdmin);
  const subjectsQuery = useSubjects();

  const classes = classesQuery.data ?? [];
  const teachers = teachersQuery.data ?? [];
  const allSubjects = subjectsQuery.data ?? [];
  const subjects = subjectClassFilter
    ? allSubjects.filter((subject) => subject.class.id === subjectClassFilter)
    : allSubjects;

  const totalStudents = classes.reduce((sum, cls) => sum + cls.studentCount, 0);
  const assignedSubjects = allSubjects.filter((subject) => subject.teacher).length;
  const marksRecorded = allSubjects.reduce((sum, subject) => sum + (subject.markCount ?? 0), 0);

  const saveClass = async (values: ClassFormValues) => {
    const payload = { ...values, classTeacherId: values.classTeacherId || null };
    if (editingClass) {
      await api.patch(`/classes/${editingClass.id}`, payload);
      toast.success("Class updated", "The class details have been saved.");
    } else {
      await api.post("/classes", payload);
      toast.success("Class created", "You can now add subjects and students.");
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["classes"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
    setClassFormOpen(false);
    setEditingClass(null);
  };

  const saveSubject = async (values: SubjectFormValues) => {
    const payload = { ...values, teacherId: values.teacherId || null };
    if (editingSubject) {
      await api.patch(`/subjects/${editingSubject.id}`, payload);
      toast.success("Subject updated", "The subject details have been saved.");
    } else {
      await api.post("/subjects", payload);
      toast.success("Subject added", "The subject is ready for timetabling and exams.");
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["subjects"] }),
      queryClient.invalidateQueries({ queryKey: ["classes"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
    setSubjectFormOpen(false);
    setEditingSubject(null);
  };

  const deleteClassMutation = useMutation({
    mutationFn: (cls: ClassSummary) => api.delete<{ message: string }>(`/classes/${cls.id}`),
    onSuccess: async (response) => {
      toast.success("Class deleted", response.message);
      setDeleteClassTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["classes"] }),
        queryClient.invalidateQueries({ queryKey: ["subjects"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error) => toast.error("Could not delete class", getErrorMessage(error)),
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (subject: Subject) => api.delete<{ message: string }>(`/subjects/${subject.id}`),
    onSuccess: async (response) => {
      toast.success("Subject deleted", response.message);
      setDeleteSubjectTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["subjects"] }),
        queryClient.invalidateQueries({ queryKey: ["classes"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error) => toast.error("Could not delete subject", getErrorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Academic structure"
        title="Classes & subjects"
        description="Shape the academic year — class groups, class teachers and the subjects taught within them."
        actions={
          isAdmin ? (
            tab === "classes" ? (
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditingClass(null);
                  setClassFormOpen(true);
                }}
              >
                New class
              </Button>
            ) : (
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditingSubject(null);
                  setSubjectFormOpen(true);
                }}
              >
                Add subject
              </Button>
            )
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          items={[
            { id: "classes", label: "Classes", count: classes.length },
            { id: "subjects", label: "Subjects", count: allSubjects.length },
          ]}
          value={tab}
          onChange={setTab}
          className="flex-1"
        />
      </div>

      {tab === "classes" ? (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="Class groups" value={classes.length} icon={Layers3} accent="ink" hint="Across the academic year" />
            <StatCard label="Active students" value={totalStudents} icon={Users} accent="sage" hint="Placed in a class" />
            <StatCard label="Subjects offered" value={allSubjects.length} icon={BookOpen} accent="marigold" hint={`${assignedSubjects} with a teacher`} />
          </div>

          {classesQuery.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="cut-card h-[260px] p-5">
                  <div className="skeleton h-5 w-32" />
                  <div className="mt-3 skeleton h-3 w-24" />
                  <div className="mt-8 space-y-3">
                    <div className="skeleton h-9 w-full" />
                    <div className="skeleton h-9 w-full" />
                    <div className="skeleton h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : classesQuery.isError ? (
            <ErrorState
              title="Classes couldn’t load"
              description={getErrorMessage(classesQuery.error)}
              onRetry={() => void classesQuery.refetch()}
            />
          ) : classes.length === 0 ? (
            <Card>
              <EmptyState
                icon={Layers3}
                title="No classes yet"
                description="Create a class group to begin enrolling students and planning subjects."
                action={
                  isAdmin ? (
                    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setClassFormOpen(true)}>
                      Create first class
                    </Button>
                  ) : null
                }
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {classes.map((cls) => (
                <Card key={cls.id} className="group overflow-hidden transition-shadow hover:shadow-float">
                  <div className="h-1.5 bg-gradient-to-r from-ink-900 via-ink-600 to-marigold-400" />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-2xl font-semibold leading-none tracking-[-0.02em] text-ink-950">
                          {cls.name} <span className="text-ink-400">{cls.section}</span>
                        </h2>
                        <p className="mt-1.5 text-[11px] text-ink-400">
                          {cls.academicYear} · {cls.room || "Room not set"}
                        </p>
                      </div>
                      <Badge variant="info">{cls.totalStudents} total</Badge>
                    </div>

                    <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-paper/70 px-3 py-2.5">
                      {cls.classTeacher ? (
                        <>
                          <Avatar name={cls.classTeacher.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold text-ink-800">{cls.classTeacher.name}</p>
                            <p className="text-[9px] uppercase tracking-[0.1em] text-ink-300">Class teacher</p>
                          </div>
                        </>
                      ) : (
                        <p className="text-[11px] text-ink-400">No class teacher assigned</p>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-white">
                      <div className="px-3 py-2.5 text-center">
                        <p className="text-[15px] font-semibold tabular-nums text-ink-900">{cls.studentCount}</p>
                        <p className="text-[9px] uppercase tracking-wide text-ink-300">Students</p>
                      </div>
                      <div className="px-3 py-2.5 text-center">
                        <p className="text-[15px] font-semibold tabular-nums text-ink-900">{cls.subjectCount}</p>
                        <p className="text-[9px] uppercase tracking-wide text-ink-300">Subjects</p>
                      </div>
                      <div className="px-3 py-2.5 text-center">
                        <p className="text-[15px] font-semibold tabular-nums text-ink-900">{cls.examCount}</p>
                        <p className="text-[9px] uppercase tracking-wide text-ink-300">Exams</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {cls.subjects.slice(0, 3).map((subject) => (
                        <span
                          key={subject.id}
                          className="rounded-md border border-line bg-paper/60 px-1.5 py-0.5 text-[9px] font-medium text-ink-500"
                        >
                          {subject.name}
                        </span>
                      ))}
                      {cls.subjects.length > 3 ? (
                        <span className="px-1.5 py-0.5 text-[9px] font-medium text-ink-300">
                          +{cls.subjects.length - 3} more
                        </span>
                      ) : null}
                      {cls.subjects.length === 0 ? (
                        <span className="text-[10px] text-ink-300">No subjects yet</span>
                      ) : null}
                    </div>

                    {isAdmin ? (
                      <div className="mt-4 flex items-center justify-end gap-1 border-t border-line/70 pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Pencil className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setEditingClass(cls);
                            setClassFormOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-clay-600 hover:bg-clay-50 hover:text-clay-700"
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => setDeleteClassTarget(cls)}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="Subjects offered" value={allSubjects.length} icon={BookOpen} accent="ink" hint="Across every class" />
            <StatCard label="Teacher assigned" value={assignedSubjects} icon={GraduationCap} accent="sage" hint={`${allSubjects.length - assignedSubjects} awaiting assignment`} />
            <StatCard label="Marks recorded" value={marksRecorded} icon={ClipboardList} accent="marigold" hint="Entries across all exams" />
          </div>

          <Card className="mb-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                aria-label="Filter subjects by class"
                value={subjectClassFilter}
                onChange={(event) => setSubjectClassFilter(event.target.value)}
                className="w-full sm:w-64"
              >
                <option value="">All classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.section}
                  </option>
                ))}
              </Select>
              <p className="text-[12px] text-ink-400 sm:ml-auto">
                Showing <span className="font-semibold text-ink-700">{subjects.length}</span> subjects
              </p>
            </div>
          </Card>

          {subjectsQuery.isLoading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : subjectsQuery.isError ? (
            <ErrorState
              title="Subjects couldn’t load"
              description={getErrorMessage(subjectsQuery.error)}
              onRetry={() => void subjectsQuery.refetch()}
            />
          ) : subjects.length === 0 ? (
            <Card>
              <EmptyState
                icon={BookOpen}
                title="No subjects found"
                description={
                  subjectClassFilter
                    ? "This class has no subjects yet. Add one to start planning exams."
                    : "Add subjects to your classes so attendance and exams can be organised."
                }
                action={
                  isAdmin ? (
                    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setSubjectFormOpen(true)}>
                      Add subject
                    </Button>
                  ) : null
                }
              />
            </Card>
          ) : (
            <div className="table-shell">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Class</th>
                      <th>Teacher</th>
                      <th>Marks</th>
                      <th>Exams</th>
                      {isAdmin ? <th className="text-right">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject) => (
                      <tr key={subject.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-50 text-ink-500">
                              <BookOpen className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-[13px] font-semibold text-ink-900">{subject.name}</p>
                              <p className="font-mono text-[10px] text-ink-400">{subject.code}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge variant="neutral">{classLabel(subject.class)}</Badge>
                        </td>
                        <td>
                          {subject.teacher ? (
                            <div className="flex items-center gap-2">
                              <Avatar name={subject.teacher.name} size="sm" />
                              <span className="text-[12px] text-ink-700">{subject.teacher.name}</span>
                            </div>
                          ) : (
                            <Badge variant="warning">Unassigned</Badge>
                          )}
                        </td>
                        <td className="text-[12px] tabular-nums text-ink-500">{subject.markCount ?? 0}</td>
                        <td className="text-[12px] tabular-nums text-ink-500">{subject.examCount ?? 0}</td>
                        {isAdmin ? (
                          <td>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                className="rounded-lg p-2 text-ink-400 transition hover:bg-paper hover:text-ink-800"
                                onClick={() => {
                                  setEditingSubject(subject);
                                  setSubjectFormOpen(true);
                                }}
                                aria-label={`Edit ${subject.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded-lg p-2 text-ink-400 transition hover:bg-clay-50 hover:text-clay-600"
                                onClick={() => setDeleteSubjectTarget(subject)}
                                aria-label={`Delete ${subject.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-300">
            <Building2 className="h-3.5 w-3.5" />
            Subjects belong to a single class. Teacher assignments drive marks-entry permissions.
          </p>
        </>
      )}

      <Modal
        open={classFormOpen}
        onClose={() => {
          setClassFormOpen(false);
          setEditingClass(null);
        }}
        title={editingClass ? "Edit class" : "Create a class"}
        description={
          editingClass
            ? "Update the class group, room or class teacher."
            : "Set up a class group for this academic year."
        }
      >
        <ClassForm
          key={editingClass?.id ?? "new-class"}
          cls={editingClass}
          teachers={teachers}
          onSubmit={saveClass}
          onCancel={() => {
            setClassFormOpen(false);
            setEditingClass(null);
          }}
        />
      </Modal>

      <Modal
        open={subjectFormOpen}
        onClose={() => {
          setSubjectFormOpen(false);
          setEditingSubject(null);
        }}
        title={editingSubject ? "Edit subject" : "Add a subject"}
        description="Assign the subject to a class and, optionally, a teacher."
      >
        <SubjectForm
          key={editingSubject?.id ?? "new-subject"}
          subject={editingSubject}
          classes={classes}
          teachers={teachers}
          defaultClassId={subjectClassFilter || classes[0]?.id}
          onSubmit={saveSubject}
          onCancel={() => {
            setSubjectFormOpen(false);
            setEditingSubject(null);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteClassTarget)}
        onClose={() => setDeleteClassTarget(null)}
        onConfirm={() => {
          if (deleteClassTarget) deleteClassMutation.mutate(deleteClassTarget);
        }}
        title="Delete this class?"
        description={
          deleteClassTarget
            ? `${deleteClassTarget.name} ${deleteClassTarget.section} can only be deleted when it has no students. Its subjects and exams will also be removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete class"
        loading={deleteClassMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleteSubjectTarget)}
        onClose={() => setDeleteSubjectTarget(null)}
        onConfirm={() => {
          if (deleteSubjectTarget) deleteSubjectMutation.mutate(deleteSubjectTarget);
        }}
        title="Delete this subject?"
        description={
          deleteSubjectTarget
            ? `${deleteSubjectTarget.name} will be removed. Subjects used by exams or marks cannot be deleted until those records are removed.`
            : ""
        }
        confirmLabel="Delete subject"
        loading={deleteSubjectMutation.isPending}
      />
    </div>
  );
}
