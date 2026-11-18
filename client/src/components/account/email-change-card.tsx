import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck, MailWarning, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/utils";
import { Button, Card, Field, Input, SectionHeading } from "@/components/ui";

const schema = z.object({
  newEmail: z.string().trim().min(1, "Enter the new email address").email("Enter a valid email address"),
  currentPassword: z.string().min(1, "Enter your current password"),
});

type Values = z.infer<typeof schema>;

export function EmailChangeCard({ className }: { className?: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [result, setResult] = useState<{ message: string; verificationUrl?: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { newEmail: "", currentPassword: "" },
  });

  const onSubmit = async (values: Values) => {
    setResult(null);
    try {
      const response = await api.post<{ message: string; verificationUrl?: string }>("/auth/email-change", values);
      reset();
      setResult(response);
      toast.success("Confirmation sent", "Your email changes after the new address is verified.");
    } catch (error) {
      const message = getErrorMessage(error);
      if (/current password/i.test(message)) setError("currentPassword", { message });
      else if (/email/i.test(message)) setError("newEmail", { message });
      else toast.error("Couldn’t start email change", message);
    }
  };

  return (
    <Card className={className}>
      <SectionHeading
        title="Sign-in email"
        description="Changing your email requires your current password and confirmation from the new inbox."
      />

      <div className="mt-4 space-y-2 rounded-xl border border-line bg-paper/40 px-4 py-3 text-[12px]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-ink-400">Current email</span>
          <span className="truncate font-medium text-ink-800">{user?.email}</span>
        </div>
        {user?.pendingEmail ? (
          <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
            <span className="flex items-center gap-1 text-marigold-700">
              <MailWarning className="h-3.5 w-3.5" />
              Pending verification
            </span>
            <span className="truncate font-medium text-marigold-800">{user.pendingEmail}</span>
          </div>
        ) : null}
      </div>

      {result ? (
        <div className="mt-4 rounded-xl border border-sage-200 bg-sage-50 p-4 text-[12px] leading-5 text-sage-800">
          <p className="flex items-start gap-2">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
            {result.message}
          </p>
          {result.verificationUrl ? (
            <Link
              to={result.verificationUrl.replace(/^https?:\/\/[^/]+/, "")}
              className="mt-2 inline-flex break-all font-semibold text-sage-800 underline decoration-sage-300 underline-offset-2"
            >
              Development preview: confirm email change
            </Link>
          ) : null}
        </div>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="New email address" htmlFor="new-email" error={errors.newEmail?.message} required>
          <Input
            id="new-email"
            type="email"
            autoComplete="email"
            placeholder="new.address@school.edu"
            className="h-11"
            invalid={Boolean(errors.newEmail)}
            {...register("newEmail")}
          />
        </Field>
        <Field
          label="Current password"
          htmlFor="email-change-password"
          error={errors.currentPassword?.message}
          hint="Required to confirm this is really you."
          required
        >
          <Input
            id="email-change-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your current password"
            className="h-11"
            invalid={Boolean(errors.currentPassword)}
            {...register("currentPassword")}
          />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="flex items-center gap-1.5 text-[11px] text-ink-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            The old email stays active until the new one is verified.
          </p>
          <Button type="submit" loading={isSubmitting} leftIcon={<MailCheck className="h-4 w-4" />}>
            Send confirmation
          </Button>
        </div>
      </form>
    </Card>
  );
}
