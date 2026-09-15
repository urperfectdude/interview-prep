"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, Check, Mic, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, Notice, Spinner } from "@/components/ui";

type PermissionState = "idle" | "requesting" | "granted" | "denied";

const DEVICES = [
  { icon: Mic, label: "Microphone" },
  { icon: Camera, label: "Camera" },
];

export default function PermissionsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<PermissionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function requestPermissions() {
    setState("requesting");
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setState("granted");
    } catch {
      setState("denied");
      setErrorMessage("We need microphone and camera access to run your mock interview.");
    }
  }

  function handleStart() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    router.push(`/session/${id}/interview`);
  }

  const isGranted = state === "granted";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg animate-enter p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Get ready for your interview</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We&apos;ll ask a few tailored questions by voice, like a real call. We also take the occasional
            still frame to give you a soft read on your environment and posture — never a live feed to
            anyone, never a pass/fail.
          </p>
        </div>

        <div className="mt-6 flex aspect-video items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {/* Always mounted so requestPermissions can attach the stream before the preview is shown. */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={isGranted ? "h-full w-full -scale-x-100 object-cover" : "hidden"}
          />
          {!isGranted && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Camera className="size-6" />
              <span className="text-sm">Camera preview will appear here</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {DEVICES.map(({ icon: Icon, label }) => (
            <Badge key={label} variant={isGranted ? "success" : "secondary"}>
              {isGranted ? <Check /> : <Icon />}
              {label}
            </Badge>
          ))}
        </div>

        {errorMessage && <Notice className="mt-4 justify-center">{errorMessage}</Notice>}

        <div className="mt-6 flex flex-col items-center gap-3">
          {!isGranted ? (
            <Button size="lg" onClick={requestPermissions} disabled={state === "requesting"}>
              {state === "requesting" ? <Spinner /> : <Camera />}
              {state === "requesting" ? "Requesting access…" : "Enable camera & microphone"}
            </Button>
          ) : (
            <Button size="lg" onClick={handleStart}>
              Start interview <ArrowRight />
            </Button>
          )}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Camera &amp; mic access required to continue
          </p>
        </div>
      </Card>
    </main>
  );
}
