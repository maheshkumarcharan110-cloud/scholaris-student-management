import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/utils";
import { Button, Card, Field, Input, SectionHeading } from "@/components/ui";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(10, "Use at least 10 characters")
      .max(72, "Password is too long")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "Choose a password different from your current one",
    path: ["newPassword"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export function ChangePasswordCard({ className }: { className?: string }) {
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: PasswordValues) => {
    try {
      await api.patch("/auth/password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset();
      toast.success("Password updated", "Use your new password the next time you sign in.");
    } catch (error) {
      const message = getErrorMessage(error);
      if (/current password/i.test(message)) {
        setError("currentPassword", { message });
      } else if (/password/i.test(message)) {
        setError("newPassword", { message });
      } else {
        toast.error("Couldn’t update password", message);
      }
    }
  };

  return (
    <Card className={className}>
      <SectionHeading
        title="Change password"
        description="Use at least 10 characters with a letter and a number."
      />
      <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword?.message} required>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your current password"
            invalid={Boolean(errors.currentPassword)}
            {...register("currentPassword")}
          />
        </Field>
        <Field
          label="New password"
          htmlFor="newPassword"
          error={errors.newPassword?.message}
          hint="At least 10 characters, including a letter and a number."
          required
        >
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Create a new password"
            invalid={Boolean(errors.newPassword)}
            {...register("newPassword")}
          />
        </Field>
        <Field
          label="Confirm new password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
          required
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter the new password"
            invalid={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="flex items-center gap-1.5 text-[12px] text-ink-400">
            <KeyRound className="h-3.5 w-3.5" />
            Passwords are hashed and never stored in plain text.
          </p>
          <Button type="submit" loading={isSubmitting} leftIcon={<ShieldCheck className="h-4 w-4" />}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}
