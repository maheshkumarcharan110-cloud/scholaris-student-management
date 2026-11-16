import { ArrowLeft, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "@/components/ui";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-[60vh] place-items-center animate-fade-in">
      <Card className="w-full max-w-md p-10 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-marigold-200 bg-marigold-50 text-marigold-700">
          <Compass className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="eyebrow mt-5">Page not found</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink-950">This page has moved on</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-400">
          The address may be mistyped, or the page may have been removed. Let’s get you back to familiar ground.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => navigate(-1)} variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Go back
          </Button>
          <Button onClick={() => navigate("/")}>Go to dashboard</Button>
        </div>
      </Card>
    </div>
  );
}
