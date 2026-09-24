import { Download } from "lucide-react";
import { Card, buttonVariants } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FeatureSlider } from "@/components/FeatureSlider";

// .github/workflows/desktop.yml uploads these fixed names to the latest release on every push to main.
const RELEASE_URL = "https://github.com/urperfectdude/interview-prep/releases/latest/download";
const DOWNLOADS = [
  { platform: "macOS", file: "InterviewPrep-macOS.dmg" },
  { platform: "Windows", file: "InterviewPrep-Windows-setup.exe" },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-16">
        <section className="text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Practice the interview you&apos;ll actually have.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-balance text-muted-foreground">
            A Mac and Windows app that runs a spoken mock interview from your resume and the job
            description, then shows you what to fix before the real one.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {DOWNLOADS.map(({ platform, file }) => (
              <a key={platform} href={`${RELEASE_URL}/${file}`} className={buttonVariants({ size: "sm" })}>
                <Download /> {platform}
              </a>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <a
              href="https://github.com/urperfectdude/interview-prep/releases"
              className="underline-offset-4 hover:underline"
            >
              All releases
            </a>
          </p>
        </section>

        <section aria-label="Features" className="mt-12">
          <FeatureSlider />
        </section>

        <Card className="mt-14 p-6 text-left sm:p-8">
          <h2 className="font-semibold">First launch</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The installers are not signed with Apple or Microsoft publisher certificates, so the OS
            will warn that the developer is unknown. That is expected. On first open, the app asks
            for your OpenAI API key if you have not added one. It stays on this device.
          </p>

          <h3 className="mt-6 text-sm font-medium">macOS</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Open the .dmg and drag InterviewPrep to Applications.</li>
            <li>Right-click the app and choose Open (a double-click is blocked the first time).</li>
            <li>Confirm Open. If you already double-clicked: System Settings → Privacy &amp; Security → Open Anyway.</li>
          </ol>

          <h3 className="mt-6 text-sm font-medium">Windows</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Run the installer. SmartScreen may say “Windows protected your PC” because there is no publisher.</li>
            <li>Click More info, then Run anyway.</li>
          </ol>
        </Card>
      </main>
    </div>
  );
}
