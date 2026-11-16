import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { ClassSummary, Teacher } from "@/types";

const schema = z.object({
  name: z.string().trim().min(1, "Class name is required").max(60),
  section: z.string().trim().min(1, "Section is required").max(10),
  academicYear: z.string().trim().regex(/^\d{4}\/\d{4}$/, "Use the format 2026/2027"),
  room: z.string().trim().max(40),
  classTeacherId: z.string(),
});

export type ClassFormValues = z.infer<typeof schema>;

function defaultAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 5 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

export function ClassForm({
  cls,
  teachers,
  onSubmit,
  onCancel,
}: {
  cls?: ClassSummary | null;
  teachers: Teacher[];
  onSubmit: (values: ClassFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const formId = useId();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClassFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: cls?.name ?? "",
      section: cls?.section ?? "",
      academicYear: cls?.academicYear ?? defaultAcademicYear(),
      room: cls?.room ?? "",
      classTeacherId: cls?.classTeacher?.id ?? "",
    },
  });

  const submit = async (values: ClassFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        for (const [field, messages] of Object.entries(error.details)) {
          if (messages?.[0]) setError(field as keyof ClassFormValues, { message: messages[0] });
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
        <Field label="Class name" htmlFor={`${formId}-name`} error={errors.name?.message} required>
          <Input id={`${formId}-name`} placeholder="Grade 9" invalid={Boolean(errors.name)} {...register("name")} />
        </Field>
        <Field label="Section" htmlFor={`${formId}-section`} error={errors.section?.message} required>
          <Input id={`${formId}-section`} placeholder="A" invalid={Boolean(errors.section)} {...register("section")} />
        </Field>
        <Field label="Academic year" htmlFor={`${formId}-year`} error={errors.academicYear?.message} required>
          <Input
            id={`${formId}-year`}
            placeholder="2026/2027"
            invalid={Boolean(errors.academicYear)}
            {...register("academicYear")}
          />
        </Field>
        <Field label="Room" htmlFor={`${formId}-room`} error={errors.room?.message}>
          <Input id={`${formId}-room`} placeholder="Block A · Room 201" {...register("room")} />
        </Field>
        <Field
          label="Class teacher"
          htmlFor={`${formId}-teacher`}
          error={errors.classTeacherId?.message}
          className="sm:col-span-2"
          hint="The class teacher is the primary point of contact for this group."
        >
          <Select id={`${formId}-teacher`} {...register("classTeacherId")}>
            <option value="">Not assigned</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.user.name} · {teacher.employeeNo}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {cls ? "Save changes" : "Create class"}
        </Button>
      </div>
    </form>
  );
}
