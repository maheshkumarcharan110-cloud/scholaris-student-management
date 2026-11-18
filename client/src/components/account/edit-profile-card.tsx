import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/utils";
import { Button, Card, Field, Input, SectionHeading } from "@/components/ui";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120, "Name is too long"),
  phone: z.string().trim().max(30, "Phone number is too long").optional(),
});

type Values = z.infer<typeof schema>;

export function EditProfileCard({ className }: { className?: string }) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });

  useEffect(() => {
    reset({ name: user?.name ?? "", phone: user?.phone ?? "" });
  }, [reset, user?.name, user?.phone]);

  const onSubmit = async (values: Values) => {
    try {
      await api.patch("/auth/profile", { name: values.name, phone: values.phone || null });
      await refreshUser();
      toast.success("Profile updated", "Your account details are up to date.");
      reset(values);
    } catch (error) {
      toast.error("Couldn’t update profile", getErrorMessage(error));
    }
  };

  return (
    <Card className={className}>
      <SectionHeading
        title="Edit profile"
        description="Update the name and phone number attached to your account."
      />
      <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Full name" htmlFor="profile-name" error={errors.name?.message} required>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <Input
              id="profile-name"
              autoComplete="name"
              className="h-11 pl-10"
              invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </div>
        </Field>
        <Field label="Phone (optional)" htmlFor="profile-phone" error={errors.phone?.message}>
          <Input
            id="profile-phone"
            type="tel"
            autoComplete="tel"
            className="h-11"
            invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
        </Field>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-[11px] text-ink-400">Your sign-in email is managed separately in Security.</p>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty} leftIcon={<Save className="h-4 w-4" />}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}
