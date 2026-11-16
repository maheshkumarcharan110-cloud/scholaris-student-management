import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { ClassSummary, Subject, Teacher } from "@/types";

const schema = z.object({
  name: z.string().trim().min(2, "Subject name is required").max(80),
  code: z
    .string()
    .trim()
    .min(2, "Subject code is required")
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers or hyphens only"),
  classId: z.string().min(1, "Select a class"),
  teacherId: z.string(),
});

export type SubjectFormValues = z.infer<typeof schema>;

export function SubjectForm({
  subject,
  classes,
  teachers,
  defaultClassId,
  onSubmit,
  onCancel,
}: {
  subject?: Subject | null;
  classes: ClassSummary[];
  teachers: Teacher[];
  defaultClassId?: string;
  onSubmit: (values: SubjectFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const formId = useId();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: subject?.name ?? "",
      code: subject?.code ?? "",
      classId: subject?.class.id ?? defaultClassId ?? "",
      teacherId: subject?.teacher?.id ?? "",
    },
  });

  const submit = async (values: SubjectFormValues) => {
    try {
      await onSubmit({ ...values, code: values.code.toUpperCase() });
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        for (const [field, messages] of Object.entries(error.details)) {
          if (messages?.[0]) setError(field as keyof SubjectFormValues, { message: messages[0] });
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
        <Field label="Subject name" htmlFor={`${formId}-name`} error={errors.name?.message} required>
          <Input
            id={`${formId}-name`}
            placeholder="Mathematics"
            invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </Field>
        <Field
          label="Subject code"
          htmlFor={`${formId}-code`}
          error={errors.code?.message}
          hint="Unique within the class, e.g. MATH-9A."
          required
        >
          <Input
            id={`${formId}-code`}
            placeholder="MATH-9A"
            className="uppercase"
            invalid={Boolean(errors.code)}
            {...register("code")}
          />
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
        <Field label="Assigned teacher" htmlFor={`${formId}-teacher`} error={errors.teacherId?.message}>
          <Select id={`${formId}-teacher`} {...register("teacherId")}>
            <option value="">Not assigned</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.user.name}
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
          {subject ? "Save changes" : "Add subject"}
        </Button>
      </div>
    </form>
  );
}
