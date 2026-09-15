"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileCheck } from "lucide-react";
import type { UserDTO } from "@interview-prep/shared";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  FileDropzone,
  Input,
  Label,
  Notice,
  Spinner,
  StepIndicator,
  Textarea,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";

const STEPS = [
  { label: "Welcome", description: "What you'll need" },
  { label: "Role & JD", description: "Optional context" },
  { label: "Resume", description: "Personalizes questions" },
];

const CHECKLIST = [
  "Your resume as a PDF, DOCX, or TXT",
  "A job posting link or file, or a few lines about the role (optional)",
  "A quiet spot with a working microphone and camera",
];

export default function NewInterviewPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdLink, setJdLink] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedResumeName, setSavedResumeName] = useState<string | null>(null);
  const [replacingResume, setReplacingResume] = useState(false);

  useEffect(() => {
    apiFetch("/api/me")
      .then((res) => (res.ok ? (res.json() as Promise<UserDTO>) : null))
      .then((user) => setSavedResumeName(user?.resumeFileName ?? null))
      .catch((err) => console.warn("Failed to load profile:", err));
  }, []);

  async function handleSubmit() {
    if (!resumeFile && !savedResumeName) {
      setError("Please upload your resume to continue.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      if (resumeFile) formData.append("resume", resumeFile);
      if (jdFile) formData.append("jdFile", jdFile);
      if (jdLink.trim()) formData.append("jdLink", jdLink.trim());
      if (roleDescription.trim()) formData.append("roleDescription", roleDescription.trim());

      const response = await apiFetch("/api/sessions", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong creating your session.");
      }

      const { sessionId } = (await response.json()) as { sessionId: string };
      router.push(`/session/${sessionId}/permissions`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  const checklist = savedResumeName ? [`Your saved resume, ${savedResumeName}`, ...CHECKLIST.slice(1)] : CHECKLIST;

  const header = [
    {
      title: "Set up your mock interview",
      description: "A few details first, then a live voice interview tailored to you.",
    },
    {
      title: "Tell us about the role",
      description: "Everything here is optional — add whatever you have and we'll tailor your interview to it.",
    },
    {
      title: savedResumeName ? "Your resume" : "Add your resume",
      description: savedResumeName
        ? "We'll use your saved resume. Replace it if you have a newer one."
        : "This is the one thing we need from you — it's how we personalize your questions.",
    },
  ][step];

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 md:grid-cols-[13rem_minmax(0,1fr)] md:py-16">
      <aside className="hidden md:block">
        <p className="mb-6 text-xs font-medium uppercase tracking-wider text-muted-foreground">New interview</p>
        <StepIndicator steps={STEPS} currentIndex={step} />
      </aside>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div aria-hidden className="mb-4 flex gap-1.5 md:hidden">
            {STEPS.map((s, index) => (
              <span
                key={s.label}
                className={`h-1 flex-1 rounded-full transition-colors ${index <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </p>
          <CardTitle className="text-xl">{header.title}</CardTitle>
          <CardDescription>{header.description}</CardDescription>
        </CardHeader>

        <CardContent key={step} className="animate-enter">
          {step === 0 && (
            <>
              <p className="mb-3 text-sm font-medium">What you&apos;ll need</p>
              <ul className="divide-y rounded-lg border">
                {checklist.map((item) => (
                  <li key={item} className="flex items-start gap-3 px-4 py-3 text-sm">
                    <span className="mt-0.5 flex size-4 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="size-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="jdLink">Job posting link</Label>
                <Input
                  id="jdLink"
                  type="url"
                  placeholder="https://company.com/careers/role"
                  value={jdLink}
                  onChange={(e) => setJdLink(e.target.value)}
                />
              </div>
              <div>
                <Label>Job description file</Label>
                <FileDropzone
                  label="Drop a JD file here, or click to browse"
                  hint="PDF, DOCX, or TXT"
                  accept=".pdf,.docx,.txt"
                  file={jdFile}
                  onFileChange={setJdFile}
                />
              </div>
              <div>
                <Label htmlFor="roleDescription">Describe the role in your own words</Label>
                <Textarea
                  id="roleDescription"
                  rows={4}
                  placeholder="e.g. Senior product manager role focused on growth and B2B SaaS..."
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {savedResumeName && !replacingResume ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/40 py-1.5 pl-3 pr-1.5">
                  <FileCheck className="size-4 flex-none text-success" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{savedResumeName}</span>
                  <Button variant="ghost" size="sm" onClick={() => setReplacingResume(true)}>
                    Replace
                  </Button>
                </div>
              ) : (
                <FileDropzone
                  label="Drop your resume here, or click to browse"
                  hint={savedResumeName ? "PDF, DOCX, or TXT — replaces your saved resume" : "PDF, DOCX, or TXT"}
                  accept=".pdf,.docx,.txt"
                  file={resumeFile}
                  onFileChange={setResumeFile}
                />
              )}
              {replacingResume && !resumeFile && (
                <Button variant="ghost" size="sm" onClick={() => setReplacingResume(false)}>
                  Keep saved resume
                </Button>
              )}
              {error && <Notice>{error}</Notice>}
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={isSubmitting}>
              <ArrowLeft /> Back
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>
              Continue <ArrowRight />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner /> Analyzing your background…
                </>
              ) : (
                <>
                  Start interview <ArrowRight />
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
