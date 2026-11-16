import { useId, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { Teacher } from "@/types";

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72)
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export type TeacherFormValues = {
  name: string;
  email: string;
  password: string;
  employeeNo: string;
  phone: string;
  qualification: string;
  active: "true" | "false";
};

export function TeacherForm({
  teacher,
  onSubmit,
  onCancel,
}: {
  teacher?: Teacher | null;
  onSubmit: (values: TeacherFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const formId = useId();
  const schema = useMemo(
    () =>
      z
        .object({
          name: z.string().trim().min(2, "Name is required").max(120),
          email: z.string().trim().email("Enter a valid email address"),
          password: teacher
            ? z.union([z.literal(""), passwordRule])
            : passwordRule,
          employeeNo: z.string().trim().min(2, "Employee number is required").max(24),
          phone: z.string().trim().max(30),
          qualification: z.string().trim().max(120),
          active: z.enum(["true", "false"]),
        })
        .superRefine((values, ctx) => {
          if (!teacher && !values.password) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["password"],
              message: "A temporary password is required",
            });
          }
        }),
    [teacher],
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: teacher?.user.name ?? "",
      email: teacher?.user.email ?? "",
      password: "",
      employeeNo: teacher?.employeeNo ?? "",
      phone: teacher?.phone ?? "",
      qualification: teacher?.qualification ?? "",
      active: teacher?.user.active === false ? "false" : "true",
    },
  });

  const submit = async (values: TeacherFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        for (const [field, messages] of Object.entries(error.details)) {
          if (messages?.[0]) setError(field as keyof TeacherFormValues, { message: messages[0] });
        }
      }
      setError("root", { message: getErrorMessage(error) });
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
      {errors.root ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-clay-200 bg-clay-50 px-3.5 py-3 text-[13px] text-clay-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {errors.root.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor={`${formId}-name`} error={errors.name?.message} required>
          <Input id={`${formId}-name`} placeholder="Priya Sharma" invalid={Boolean(errors.name)} {...register("name")} />
        </Field>
        <Field label="Employee number" htmlFor={`${formId}-employee`} error={errors.employeeNo?.message} required>
          <Input
            id={`${formId}-employee`}
            placeholder="EMP-006"
            disabled={Boolean(teacher)}
            invalid={Boolean(errors.employeeNo)}
            {...register("employeeNo")}
          />
        </Field>
        <Field label="Email address" htmlFor={`${formId}-email`} error={errors.email?.message} required>
          <Input
            id={`${formId}-email`}
            type="email"
            placeholder="teacher@scholaris.edu"
            invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </Field>
        <Field label="Phone" htmlFor={`${formId}-phone`} error={errors.phone?.message}>
          <Input id={`${formId}-phone`} type="tel" placeholder="+91 98200 11006" {...register("phone")} />
        </Field>
        <Field
          label={teacher ? "Reset password" : "Temporary password"}
          htmlFor={`${formId}-password`}
          error={errors.password?.message}
          hint={teacher ? "Leave blank to keep the current password." : "At least 8 characters, with a letter and number."}
          required={!teacher}
        >
          <Input
            id={`${formId}-password`}
            type="password"
            autoComplete="new-password"
            placeholder={teacher ? "••••••••" : "Create a secure password"}
            invalid={Boolean(errors.password)}
            {...register("password")}
          />
        </Field>
        <Field label="Qualification" htmlFor={`${formId}-qualification`} error={errors.qualification?.message}>
          <Input
            id={`${formId}-qualification`}
            placeholder="M.Sc. Mathematics, B.Ed."
            {...register("qualification")}
          />
        </Field>
        {teacher ? (
          <Field label="Account status" htmlFor={`${formId}-active`} error={errors.active?.message}>
            <Select id={`${formId}-active`} {...register("active")}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </Field>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {teacher ? "Save changes" : "Create teacher account"}
        </Button>
      </div>
    </form>
  );
}
