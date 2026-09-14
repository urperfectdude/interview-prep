"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, FileDropzone, Input, StepIndicator, Textarea } from "@/components/ui";
import { apiUrl } from "@/lib/api";

const STEPS = [{ label: "Welcome" }, { label: "Role & JD" }, { label: "Resume" }];

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdLink, setJdLink] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!resumeFile) {
      setError("Please upload your resume to continue.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      if (jdFile) formData.append("jdFile", jdFile);
      if (jdLink.trim()) formData.append("jdLink", jdLink.trim());
      if (roleDescription.trim()) formData.append("roleDescription", roleDescription.trim());

      const response = await fetch(apiUrl("/api/sessions"), {
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

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-3xl p-8 sm:p-10">
        <div className="mb-8">
          <StepIndicator steps={STEPS} currentIndex={step} />
        </div>

        {step === 0 && (
          <div className="grid items-center gap-8 sm:grid-cols-2">
            <div>
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-xl">
                🎙️
              </span>
              <h1 className="text-3xl font-semibold tracking-tight">
                Welcome to <span className="text-accent">InterviewPrep</span>
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                Your AI mock interview coach. Share a job description and your resume, then practice a
                realistic voice interview with tailored questions and honest feedback.
              </p>
              <Button className="mt-6" onClick={() => setStep(1)}>
                Let&apos;s get started →
              </Button>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">🔒 Private, secure, and built for you</p>
            </div>
            <div className="flex h-56 items-center justify-center rounded-2xl bg-accent-soft sm:h-full">
              <span className="text-6xl">💬</span>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Tell us about the role</h2>
            <p className="mt-2 text-sm text-muted">
              Everything here is optional — add whatever you have and we&apos;ll tailor your interview to it.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Job description file</label>
                <FileDropzone
                  label="Drop a JD file here, or click to browse"
                  hint="PDF, DOCX, or TXT"
                  accept=".pdf,.docx,.txt"
                  file={jdFile}
                  onFileChange={setJdFile}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Job description link</label>
                <Input
                  type="url"
                  placeholder="https://company.com/careers/role"
                  value={jdLink}
                  onChange={(e) => setJdLink(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Describe the role in your own words</label>
                <Textarea
                  rows={4}
                  placeholder="e.g. Senior product manager role focused on growth and B2B SaaS..."
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button onClick={() => setStep(2)}>Continue to resume →</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Upload your resume</h2>
            <p className="mt-2 text-sm text-muted">
              This is the one thing we need from you — it&apos;s how we personalize your questions.
            </p>

            <div className="mt-6">
              <FileDropzone
                label="Drop your resume here, or click to browse"
                hint="PDF or DOCX"
                accept=".pdf,.docx,.txt"
                file={resumeFile}
                onFileChange={setResumeFile}
              />
            </div>

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={isSubmitting}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Analyzing your background..." : "Start Interview Prep →"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
