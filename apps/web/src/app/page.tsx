import Link from "next/link";
import { ArrowRight, ChartColumn, FileText, Mic, ShieldCheck } from "lucide-react";
import { Badge, Card, buttonVariants } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const FEATURES = [
  { icon: FileText, title: "Tailored to the role", text: "Questions built from the job description and your resume." },
  { icon: Mic, title: "A real voice conversation", text: "Answer out loud while the interviewer follows up on what you say." },
  { icon: ChartColumn, title: "Feedback you can act on", text: "Scores, highlighted moments, and suggested rewrites of your answers." },
];

export default function LandingPage() {
  return (
    <div className="relative flex flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[32rem]"
        style={{
          background: "radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, var(--primary) 14%, transparent), transparent)",
        }}
      />

      <header className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Sign in
          </Link>
          <Link href="/new" className={buttonVariants({ size: "sm" })}>
            Get started
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4">
        <section className="mx-auto max-w-3xl animate-enter pb-16 pt-20 text-center sm:pt-28">
          <Badge variant="outline" className="bg-card">
            <span className="size-1.5 rounded-full bg-primary" /> AI mock interviews, by voice
          </Badge>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Practice the interview <span className="text-primary">before</span> the interview.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground">
            Share a job description and your resume, then rehearse a realistic voice interview with tailored
            questions and honest feedback.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/new" className={buttonVariants({ size: "lg" })}>
              Start practicing <ArrowRight />
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Sign in
            </Link>
          </div>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Private, secure, and built for you
          </p>
        </section>

        {/* A still of the live interview screen, drawn with the same components. */}
        <Card aria-hidden className="mx-auto max-w-2xl animate-enter p-6 [animation-delay:120ms] sm:p-8">
          <div className="flex items-center justify-between">
            <Badge>
              <span className="size-1.5 animate-pulse rounded-full bg-destructive" /> Live
            </Badge>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">04:12</span>
          </div>
          <p className="mt-5 text-balance text-lg font-medium leading-snug sm:text-xl">
            &ldquo;Tell me about a time you had to make a call with incomplete data. What did you do next?&rdquo;
          </p>
          <div className="mt-6 flex items-center gap-3 rounded-lg bg-muted/60 px-4 py-3">
            <span className="flex h-4 items-center gap-0.5">
              {[0, 150, 300, 450, 600].map((delay) => (
                <span
                  key={delay}
                  className="h-full w-0.5 animate-bars rounded-full bg-primary"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
            <span className="text-sm text-muted-foreground">Interviewer is speaking</span>
          </div>
        </Card>

        <section className="mx-auto grid max-w-5xl gap-10 py-24 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative border-t">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 text-sm text-muted-foreground">
          <Logo />
          <span className="hidden sm:inline">Mock interviews that sound like the real thing.</span>
        </div>
      </footer>
    </div>
  );
}
