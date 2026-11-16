import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import type { ClassSummary, StudentListItem, StudentStatus } from "@/types";

const schema = z.object({
  admissionNo: z.string().trim().min(2, "Admission number is required").max(24),
  firstName: z.string().trim().min(2, "First name is required").max(60),
  lastName: z.string().trim().min(2, "Last name is required").max(60),
  gender: z.enum(["Male", "Female", "Other"]),
  dateOfBirth: z.string().optional(),
  email: z.union([z.string().trim().email("Enter a valid email address"), z.literal("")]).optional(),
  phone: z.string().trim().max(30).optional(),
  guardianName: z.string().trim().min(2, "Guardian name is required").max(120),
  guardianPhone: z.string().trim().min(5, "Guardian phone is required").max(30),
  address: z.string().trim().max(300).optional(),
  classId: z.string().min(1, "Select a class"),
  status: z.enum(["ACTIVE", "INACTIVE", "GRADUATED"]),
});

export type StudentFormValues = z.infer<typeof schema>;

export function StudentForm({
  classes,
  student,
  defaultClassId,
  onSubmit,
  onCancel,
}: {
  classes: ClassSummary[];
  student?: StudentListItem | null;
  defaultClassId?: string;
  onSubmit: (values: StudentFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const formId = useId();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      admissionNo: student?.admissionNo ?? "",
      firstName: student?.firstName ?? "",
      lastName: student?.lastName ?? "",
      gender: (student?.gender as StudentFormValues["gender"]) ?? "Female",
      dateOfBirth: student?.dateOfBirth ? student.dateOfBirth.slice(0, 10) : "",
      email: student?.email ?? "",
      phone: student?.phone ?? "",
      guardianName: student?.guardianName ?? "",
      guardianPhone: student?.guardianPhone ?? "",
      address: student?.address ?? "",
      classId: student?.class.id ?? defaultClassId ?? "",
      status: (student?.status as StudentStatus) ?? "ACTIVE",
    },
  });

  const submit = async (values: StudentFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        for (const [field, messages] of Object.entries(error.details)) {
          if (messages?.[0]) {
            setError(field as keyof StudentFormValues, { message: messages[0] });
          }
        }
      }
      setError("root", { message: getErrorMessage(error) });
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} className="space-y-6" noValidate>
      {errors.root ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-clay-200 bg-clay-50 px-3.5 py-3 text-[13px] text-clay-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {errors.root.message}
        </div>
      ) : null}

      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
          Student details
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Admission number" htmlFor={`${formId}-admission`} error={errors.admissionNo?.message} required>
            <Input
              id={`${formId}-admission`}
              placeholder="ADM-2026-051"
              invalid={Boolean(errors.admissionNo)}
              {...register("admissionNo")}
            />
          </Field>
          <Field label="Enrolment status" htmlFor={`${formId}-status`} error={errors.status?.message}>
            <Select id={`${formId}-status`} {...register("status")}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Archived</option>
              <option value="GRADUATED">Graduated</option>
            </Select>
          </Field>
          <Field label="First name" htmlFor={`${formId}-first`} error={errors.firstName?.message} required>
            <Input
              id={`${formId}-first`}
              placeholder="Aarav"
              invalid={Boolean(errors.firstName)}
              {...register("firstName")}
            />
          </Field>
          <Field label="Last name" htmlFor={`${formId}-last`} error={errors.lastName?.message} required>
            <Input
              id={`${formId}-last`}
              placeholder="Sharma"
              invalid={Boolean(errors.lastName)}
              {...register("lastName")}
            />
          </Field>
          <Field label="Gender" htmlFor={`${formId}-gender`} error={errors.gender?.message}>
            <Select id={`${formId}-gender`} {...register("gender")}>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
          <Field label="Date of birth" htmlFor={`${formId}-dob`} error={errors.dateOfBirth?.message}>
            <Input id={`${formId}-dob`} type="date" max={new Date().toISOString().slice(0, 10)} {...register("dateOfBirth")} />
          </Field>
          <Field label="Class" htmlFor={`${formId}-class`} error={errors.classId?.message} required>
            <Select id={`${formId}-class`} invalid={Boolean(errors.classId)} {...register("classId")}>
              <option value="">Select a class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.section} · {cls.academicYear}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <section className="border-t border-line pt-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
          Guardian & contact
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Guardian name" htmlFor={`${formId}-guardian`} error={errors.guardianName?.message} required>
            <Input
              id={`${formId}-guardian`}
              placeholder="Rakesh Sharma"
              invalid={Boolean(errors.guardianName)}
              {...register("guardianName")}
            />
          </Field>
          <Field label="Guardian phone" htmlFor={`${formId}-guardian-phone`} error={errors.guardianPhone?.message} required>
            <Input
              id={`${formId}-guardian-phone`}
              type="tel"
              placeholder="+91 98765 43210"
              invalid={Boolean(errors.guardianPhone)}
              {...register("guardianPhone")}
            />
          </Field>
          <Field label="Student email" htmlFor={`${formId}-email`} error={errors.email?.message}>
            <Input
              id={`${formId}-email`}
              type="email"
              placeholder="student@school.edu"
              invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </Field>
          <Field label="Student phone" htmlFor={`${formId}-phone`} error={errors.phone?.message}>
            <Input id={`${formId}-phone`} type="tel" placeholder="+91 98765 43210" {...register("phone")} />
          </Field>
          <Field label="Home address" htmlFor={`${formId}-address`} error={errors.address?.message} className="sm:col-span-2">
            <Textarea id={`${formId}-address`} placeholder="Street, area, city" {...register("address")} />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {student ? "Save changes" : "Register student"}
        </Button>
      </div>
    </form>
  );
}
