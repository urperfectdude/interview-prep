"use client";

import { useCallback, useEffect, useState } from "react";
import { INTERVIEWER_VOICES, type UserDTO } from "@interview-prep/shared";
import { Avatar, Button, Card, FileDropzone, Input, Select } from "@/components/ui";
import { apiFetch } from "@/lib/api";

const SENIORITY_LEVELS = ["Intern", "Entry level", "Mid level", "Senior", "Staff / Principal", "Manager", "Director or above"];

type Notice = { tone: "success" | "danger"; message: string } | null;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function NoticeText({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p className={`mt-3 text-sm ${notice.tone === "success" ? "text-success" : "text-danger"}`}>{notice.message}</p>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [seniority, setSeniority] = useState("");
  const [voice, setVoice] = useState("alloy");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeNotice, setResumeNotice] = useState<Notice>(null);
  const [preferencesNotice, setPreferencesNotice] = useState<Notice>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const applyUser = useCallback((next: UserDTO) => {
    setUser(next);
    setName(next.name ?? "");
    setTargetRole(next.targetRole ?? "");
    setSeniority(next.seniority ?? "");
    setVoice(next.interviewerVoice);
  }, []);

  useEffect(() => {
    apiFetch("/api/me")
      .then((res) => (res.ok ? (res.json() as Promise<UserDTO>) : null))
      .then((data) => {
        if (data) applyUser(data);
      })
      .catch((err) => console.warn("Failed to load settings:", err));
  }, [applyUser]);

  async function uploadResume() {
    if (!resumeFile) return;
    setIsUploading(true);
    setResumeNotice(null);
    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      const res = await apiFetch("/api/me/resume", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't save your resume.");
      setUser(body);
      setResumeFile(null);
      setResumeNotice({ tone: "success", message: "Resume saved. New interviews will use it by default." });
    } catch (err) {
      setResumeNotice({ tone: "danger", message: err instanceof Error ? err.message : "Couldn't save your resume." });
    } finally {
      setIsUploading(false);
    }
  }

  async function removeResume() {
    const res = await apiFetch("/api/me/resume", { method: "DELETE" });
    if (res.ok) {
      setUser(await res.json());
      setResumeNotice({ tone: "success", message: "Saved resume removed." });
    }
  }

  async function savePreferences() {
    setIsSaving(true);
    setPreferencesNotice(null);
    try {
      const res = await apiFetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, targetRole, seniority, interviewerVoice: voice }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't save your preferences.");
      applyUser(body);
      setPreferencesNotice({ tone: "success", message: "Preferences saved." });
    } catch (err) {
      setPreferencesNotice({
        tone: "danger",
        message: err instanceof Error ? err.message : "Couldn't save your preferences.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function signOut() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10 text-sm text-muted">Loading your settings...</div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-muted">Profile</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Avatar name={user.name} email={user.email} picture={user.picture} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{user.name ?? "No name set"}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
            <p className="mt-1 text-xs text-muted">
              {user.googleLinked ? "Signed in with Google" : "Email and password account"}
            </p>
          </div>
          <Button variant="secondary" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-muted">Saved resume</h2>
        <p className="mt-1 text-sm text-muted">
          New interviews use this automatically unless you upload a different resume in the wizard.
        </p>
        {user.resumeFileName && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm">
            <span className="truncate font-medium">{user.resumeFileName}</span>
            <button type="button" onClick={removeResume} className="flex-none text-xs text-danger underline">
              Remove
            </button>
          </div>
        )}
        <div className="mt-4">
          <FileDropzone
            label={user.resumeFileName ? "Drop a new resume to replace it" : "Drop your resume here, or click to browse"}
            hint="PDF, DOCX, or TXT"
            accept=".pdf,.docx,.txt"
            file={resumeFile}
            onFileChange={setResumeFile}
          />
        </div>
        <NoticeText notice={resumeNotice} />
        <Button className="mt-4" onClick={uploadResume} disabled={!resumeFile || isUploading}>
          {isUploading ? "Saving..." : "Save resume"}
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-muted">Interview preferences</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Display name
            </label>
            <Input id="name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="targetRole" className="mb-1.5 block text-sm font-medium">
              Target role
            </label>
            <Input
              id="targetRole"
              placeholder="e.g. Product Manager"
              value={targetRole}
              maxLength={120}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="seniority" className="mb-1.5 block text-sm font-medium">
              Seniority
            </label>
            <Select id="seniority" value={seniority} onChange={(e) => setSeniority(e.target.value)}>
              <option value="">Not set</option>
              {SENIORITY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="voice" className="mb-1.5 block text-sm font-medium">
              Interviewer voice
            </label>
            <Select id="voice" value={voice} onChange={(e) => setVoice(e.target.value)}>
              {INTERVIEWER_VOICES.map((option) => (
                <option key={option} value={option}>
                  {capitalize(option)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Target role and seniority are used when you leave the role description blank in the wizard.
        </p>
        <NoticeText notice={preferencesNotice} />
        <Button className="mt-4" onClick={savePreferences} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save preferences"}
        </Button>
      </Card>
    </div>
  );
}
