import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { addDays, format } from "date-fns";
import { AlertCircle, BookOpen, Check, Loader2 } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { ClassSummary, Subject } from "@/types";

const schema = z
  .object({
    name: z.string().trim().min(2, "Exam name is required").max(120),
    term: z.string().trim().min(1, "Term is required").max(60),
    classId: z.string().min(1, "Select a class"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .superRefine((values, ctx) => {
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "The end date must be after the start date",
      });
    }
  });

export type ExamFormValues = z.infer<typeof schema>;

export function ExamForm({
  classes,
  defaultClassId,
  onSubmit,
  onCancel,
}: {
  classes: ClassSummary[];
  defaultClassId?: string;
  onSubmit: (values: ExamFormValues & { subjectIds: string[] }) => Promise<void>;
  onCancel: () => void;
}) {
  const formId = useId();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectError, setSubjectError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ExamFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      term: "Term 1",
      classId: defaultClassId ?? "",
      startDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      endDate: format(addDays(new Date(), 12), "yyyy-MM-dd"),
    },
  });

  const classId = watch("classId");

  const subjectsQuery = useQuery({
    queryKey: ["subjects", classId, "exam-form"],
    queryFn: () =>
      api
        .get<{ data: Subject[] }>(`/subjects?classId=${encodeURIComponent(classId)}`)
        .then((response) => response.data),
    enabled: Boolean(classId),
  });

  const availableSubjects = subjectsQuery.data ?? [];
  const subjectKey = availableSubjects.map((subject) => subject.id).join(",");

  useEffect(() => {
    setSelectedSubjects(availableSubjects.map((subject) => subject.id));
    setSubjectError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectKey]);

  const toggleSubject = (subjectId: string) => {
    setSubjectError("");
    setSelectedSubjects((current) =>
      current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId],
    );
  };

  const submit = async (values: ExamFormValues) => {
    if (!selectedSubjects.length) {
      setSubjectError("Select at least one subject for this exam.");
      return;
    }
    try {
      await onSubmit({ ...values, subjectIds: selectedSubjects });
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        for (const [field, messages] of Object.entries(error.details)) {
          if (messages?.[0] && field in values) {
            setError(field as keyof ExamFormValues, { message: messages[0] });
          }
        }
      }
      setError("root", { message: getErrorMessage(error) });
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
      {errors.root ? (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-clay-200 bg-clay-50 px-3.5 py-3 text-[13px] text-clay-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {errors.root.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Exam name" htmlFor={`${formId}-name`} error={errors.name?.message} className="sm:col-span-2" required>
          <Input
            id={`${formId}-name`}
            placeholder="Mid-Term Assessment"
            invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </Field>
        <Field label="Term" htmlFor={`${formId}-term`} error={errors.term?.message} required>
          <Input id={`${formId}-term`} placeholder="Term 1" invalid={Boolean(errors.term)} {...register("term")} />
        </Field>
        <Field label="Class" htmlFor={`${formId}-class`} error={errors.classId?.message} required>
          <Select id={`${formId}-class`} invalid={Boolean(errors.classId)} {...register("classId")}>
            <option value="">Select a class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} {cls.section}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Start date" htmlFor={`${formId}-start`} error={errors.startDate?.message} required>
          <Input id={`${formId}-start`} type="date" invalid={Boolean(errors.startDate)} {...register("startDate")} />
        </Field>
        <Field label="End date" htmlFor={`${formId}-end`} error={errors.endDate?.message} required>
          <Input id={`${formId}-end`} type="date" invalid={Boolean(errors.endDate)} {...register("endDate")} />
        </Field>
      </div>

      <div className="border-t border-line pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[13px] font-semibold text-ink-800">Subjects included</p>
            <p className="mt-0.5 text-[11px] text-ink-400">
              Each subject is assessed out of 100 marks.
            </p>
          </div>
          {availableSubjects.length ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedSubjects(availableSubjects.map((subject) => subject.id))}
                className="rounded-md px-2 py-1 text-[11px] font-semibold text-ink-500 hover:bg-paper hover:text-ink-800"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setSelectedSubjects([])}
                className="rounded-md px-2 py-1 text-[11px] font-semibold text-ink-500 hover:bg-paper hover:text-ink-800"
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>

        {!classId ? (
          <p className="mt-3 rounded-xl border border-dashed border-line bg-paper/50 px-4 py-5 text-center text-[12px] text-ink-400">
            Choose a class to see its subjects.
          </p>
        ) : subjectsQuery.isLoading ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-paper/50 px-4 py-5 text-[12px] text-ink-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading subjects…
          </div>
        ) : subjectsQuery.isError ? (
          <p className="mt-3 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-[12px] text-clay-700">
            {getErrorMessage(subjectsQuery.error)}
          </p>
        ) : availableSubjects.length === 0 ? (
          <p className="mt-3 rounded-xl border border-marigold-200 bg-marigold-50 px-4 py-3 text-[12px] leading-5 text-marigold-800">
            This class has no subjects yet. Add subjects under Classes &amp; subjects before creating an exam.
          </p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {availableSubjects.map((subject) => {
              const selected = selectedSubjects.includes(subject.id);
              return (
                <label
                  key={subject.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    selected
                      ? "border-marigold-300 bg-marigold-50/60"
                      : "border-line bg-white hover:border-ink-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSubject(subject.id)}
                    className="h-4 w-4 rounded border-line text-marigold-500 focus:ring-marigold-300"
                  />
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-paper text-ink-400">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-ink-800">{subject.name}</span>
                    <span className="block text-[10px] text-ink-400">
                      {subject.code} · {subject.teacher?.name ?? "No teacher"}
                    </span>
                  </span>
                  {selected ? <Check className="h-4 w-4 text-marigold-600" /> : null}
                </label>
              );
            })}
          </div>
        )}
        {subjectError ? (
          <p className="mt-2 text-[12px] font-medium text-clay-600" role="alert">
            {subjectError}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={availableSubjects.length === 0}>
          Create exam
        </Button>
      </div>
    </form>
  );
}
