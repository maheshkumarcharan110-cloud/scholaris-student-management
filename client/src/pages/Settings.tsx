import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BadgeCheck,
  GraduationCap,
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  SectionHeading,
} from "@/components/ui";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters")
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

const roleCopy: Record<string, { label: string; description: string }> = {
  ADMIN: {
    label: "Administrator",
    description: "Full access to students, staff, classes, attendance, exams, and reports.",
  },
  TEACHER: {
    label: "Teacher",
    description: "Access to your classes, attendance registers, marks entry, and reports.",
  },
};

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [signingOut, setSigningOut] = useState(false);

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

  if (!user) return null;

  const role = roleCopy[user.role] ?? { label: user.role, description: "" };

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

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Manage your account details, security, and session."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Avatar name={user.name} size="xl" />
              <div className="min-w-0">
                <h2 className="truncate font-display text-xl font-semibold text-ink-950">{user.name}</h2>
                <p className="mt-1 truncate text-sm text-ink-400">{user.email}</p>
                <Badge variant={user.role === "ADMIN" ? "accent" : "info"} className="mt-2.5">
                  {user.role === "ADMIN" ? <ShieldCheck className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
                  {role.label}
                </Badge>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-6 text-ink-500">{role.description}</p>
          </Card>

          <Card className="p-6">
            <SectionHeading title="Account details" description="Your sign-in identity at Scholaris." />
            <dl className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-paper text-ink-400">
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Full name</dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-ink-800">{user.name}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-paper text-ink-400">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Email address</dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-ink-800">{user.email}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-paper text-ink-400">
                  <BadgeCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Access level</dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink-800">{role.label}</dd>
                </div>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <SectionHeading
              title="Session"
              description="Sign out on shared or school devices when you’re finished."
            />
            <Button variant="outline" className="mt-4" onClick={onSignOut} loading={signingOut} leftIcon={<LogOut className="h-4 w-4" />}>
              Sign out
            </Button>
          </Card>
        </div>

        <Card className="p-6">
          <SectionHeading
            title="Change password"
            description="Use at least 8 characters with a letter and a number."
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
              hint="At least 8 characters, including a letter and a number."
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
            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
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
      </div>
    </div>
  );
}
