"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";

type PermissionState = "idle" | "requesting" | "granted" | "denied";

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

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl p-8 text-center sm:p-10">
        <h1 className="text-2xl font-semibold tracking-tight">Get ready for your interview</h1>
        <p className="mt-2 text-sm text-muted">
          We&apos;ll ask a few tailored questions by voice, like a real call. We also take the occasional
          still frame to give you a soft read on your environment and posture — never a live feed to
          anyone, never a pass/fail.
        </p>

        <div className="mx-auto mt-6 flex aspect-video max-w-md items-center justify-center overflow-hidden rounded-xl bg-foreground/90">
          {state === "granted" ? (
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm text-white/60">Camera preview will appear here</span>
          )}
        </div>

        {errorMessage && <p className="mt-4 text-sm text-danger">{errorMessage}</p>}

        <div className="mt-6 flex flex-col items-center gap-3">
          {state !== "granted" ? (
            <Button onClick={requestPermissions} disabled={state === "requesting"}>
              {state === "requesting" ? "Requesting access..." : "Enable camera & microphone"}
            </Button>
          ) : (
            <Button onClick={handleStart}>Start Interview</Button>
          )}
          <p className="text-xs text-muted">Camera &amp; mic access required to continue</p>
        </div>
      </Card>
    </div>
  );
}
