"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, KeyRound } from "lucide-react";
import { INTERVIEWER_VOICES, type UserDTO } from "@interview-prep/shared";
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
  Select,
  Spinner,
} from "@/components/ui";
import { apiFetch, getOpenAIKey, setOpenAIKey } from "@/lib/api";

const SENIORITY_LEVELS = ["Intern", "Entry level", "Mid level", "Senior", "Staff / Principal", "Manager", "Director or above"];

type NoticeState = { tone: "success" | "error"; message: string } | null;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [name, setName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [seniority, setSeniority] = useState("");
  const [voice, setVoice] = useState("alloy");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeNotice, setResumeNotice] = useState<NoticeState>(null);
  const [preferencesNotice, setPreferencesNotice] = useState<NoticeState>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [openaiKey, setOpenaiKeyInput] = useState("");
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [keyNotice, setKeyNotice] = useState<NoticeState>(null);

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
        setHasOpenaiKey(Boolean(getOpenAIKey()));
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
      setResumeNotice({ tone: "error", message: err instanceof Error ? err.message : "Couldn't save your resume." });
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

  function saveOpenaiKey(key: string) {
    setOpenAIKey(key);
    setHasOpenaiKey(Boolean(key));
    setOpenaiKeyInput("");
    setKeyNotice({ tone: "success", message: key ? "API key saved on this device." : "API key removed from this device." });
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
        tone: "error",
        message: err instanceof Error ? err.message : "Couldn't save your preferences.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!user) {
    return (
      <main className="flex flex-1 items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
        <Spinner /> Loading your settings…
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl animate-enter space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your API key, resume, and interview defaults.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OpenAI API key</CardTitle>
          <CardDescription>
            Interviews and feedback run on your own OpenAI account. Your key is stored only on this device and sent
            with each request; we never save it.{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Get a key
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasOpenaiKey && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 py-1.5 pl-3 pr-1.5">
              <KeyRound className="size-4 flex-none text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">Key saved on this device</span>
              <Button variant="ghost" size="sm" onClick={() => saveOpenaiKey("")}>
                Remove
              </Button>
            </div>
          )}
          <div>
            <Label htmlFor="openaiKey">{hasOpenaiKey ? "Replace key" : "API key"}</Label>
            <Input
              id="openaiKey"
              type="password"
              autoComplete="off"
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKeyInput(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-wrap justify-between">
          <div className="min-w-0">{keyNotice && <Notice tone={keyNotice.tone}>{keyNotice.message}</Notice>}</div>
          <Button onClick={() => saveOpenaiKey(openaiKey.trim())} disabled={!openaiKey.trim()}>
            Save key
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved resume</CardTitle>
          <CardDescription>
            New interviews use this automatically. Uploading a different resume in the wizard replaces it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.resumeFileName && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 py-1.5 pl-3 pr-1.5">
              <FileText className="size-4 flex-none text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{user.resumeFileName}</span>
              <Button variant="ghost" size="sm" onClick={removeResume}>
                Remove
              </Button>
            </div>
          )}
          <FileDropzone
            label={user.resumeFileName ? "Drop a new resume to replace it" : "Drop your resume here, or click to browse"}
            hint="PDF, DOCX, or TXT"
            accept=".pdf,.docx,.txt"
            file={resumeFile}
            onFileChange={setResumeFile}
          />
        </CardContent>
        <CardFooter className="flex-wrap justify-between">
          <div className="min-w-0">
            {resumeNotice && <Notice tone={resumeNotice.tone}>{resumeNotice.message}</Notice>}
          </div>
          <Button onClick={uploadResume} disabled={!resumeFile || isUploading}>
            {isUploading && <Spinner />}
            {isUploading ? "Saving…" : "Save resume"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interview preferences</CardTitle>
          <CardDescription>
            Target role and seniority are used when you leave the role description blank in the wizard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="targetRole">Target role</Label>
            <Input
              id="targetRole"
              placeholder="e.g. Product Manager"
              value={targetRole}
              maxLength={120}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="seniority">Seniority</Label>
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
            <Label htmlFor="voice">Interviewer voice</Label>
            <Select id="voice" value={voice} onChange={(e) => setVoice(e.target.value)}>
              {INTERVIEWER_VOICES.map((option) => (
                <option key={option} value={option}>
                  {capitalize(option)}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex-wrap justify-between">
          <div className="min-w-0">
            {preferencesNotice && <Notice tone={preferencesNotice.tone}>{preferencesNotice.message}</Notice>}
          </div>
          <Button onClick={savePreferences} disabled={isSaving}>
            {isSaving && <Spinner />}
            {isSaving ? "Saving…" : "Save preferences"}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
