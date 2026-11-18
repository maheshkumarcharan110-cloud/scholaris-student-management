import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const highlights = [
  "Registration reviewed by a real administrator",
  "Role-based access for staff and students",
  "Secure sessions, hashed passwords, audit trails",
];

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[1.02fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink-950 px-12 py-10 text-white lg:flex lg:flex-col xl:px-16">
        <div className="ink-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -left-32 top-16 h-[420px] w-[420px] rounded-full bg-marigold-400/[0.13] blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 right-0 h-[380px] w-[380px] rounded-full bg-sage-500/10 blur-3xl"
          aria-hidden="true"
        />

        <Link to="/login" className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-marigold-400 text-ink-950">
            <GraduationCap className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-display text-2xl font-semibold leading-none">Scholaris</span>
            <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.24em] text-ink-300">
              Student management
            </span>
          </span>
        </Link>

        <div className="relative my-auto max-w-xl py-12">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-marigold-300">
            <Sparkles className="h-3.5 w-3.5" />
            Access with confidence
          </p>
          <h1 className="mt-5 font-display text-[42px] font-semibold leading-[1.08] tracking-[-0.03em] text-white xl:text-[52px]">
            A school workspace
            <br />
            that knows
            <br />
            <span className="text-marigold-300">who belongs.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-ink-200">
            Every Scholaris account is requested, reviewed, and approved by the school
            administrator before it can reach student records.
          </p>

          <div className="mt-9 space-y-3.5">
            {highlights.map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-[13px] text-ink-100">
                <span className="grid h-5 w-5 place-items-center rounded-full border border-marigold-400/40 bg-marigold-400/10 text-marigold-300">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between border-t border-white/[0.08] pt-5 text-[10px] text-ink-400">
          <span>Scholaris · Student Management System</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Administrator controlled
          </span>
        </div>
      </section>

      <section className="relative flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10 lg:min-h-0 lg:px-12 xl:px-20">
        <div className="pointer-events-none absolute inset-0 bg-radial-fade lg:hidden" aria-hidden="true" />
        <div className="absolute right-5 top-5 z-10 sm:right-8 sm:top-7">
          <ThemeToggle showLabel />
        </div>

        <div className="relative mx-auto w-full max-w-[440px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-950 text-marigold-400">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-xl font-semibold leading-none text-ink-950">Scholaris</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-400">
                Student management
              </p>
            </div>
          </div>

          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-2 font-display text-[31px] font-semibold leading-tight tracking-[-0.02em] text-ink-950">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-400">{description}</p>

          <div className="mt-7">{children}</div>
          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </section>
    </div>
  );
}
