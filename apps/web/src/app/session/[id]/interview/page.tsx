"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { captureFrameBlob, randomJitterMs } from "@/lib/frameCapture";

type ConnectionState = "connecting" | "connected" | "ending" | "ended" | "error";

interface TranscriptLine {
  id: string;
  role: "assistant" | "user";
  text: string;
}

interface RealtimeTokenResponse {
  clientSecret: string;
  model: string;
  openingQuestion: string;
}

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endingRef = useRef(false);

  const [state, setState] = useState<ConnectionState>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);

  const postTranscript = useCallback(
    (role: "assistant" | "user", text: string) => {
      if (!text.trim()) return;
      setTranscript((prev) => [...prev, { id: `${role}-${Date.now()}-${Math.random()}`, role, text }]);
      apiFetch(`/api/sessions/${id}/transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, text }),
      }).catch((err) => console.warn("Failed to persist transcript entry:", err));
    },
    [id]
  );

  const scheduleNextFrameCapture = useCallback(() => {
    frameTimerRef.current = setTimeout(async () => {
      const video = videoRef.current;
      if (video && !endingRef.current) {
        const blob = await captureFrameBlob(video);
        if (blob) {
          const formData = new FormData();
          formData.append("frame", blob, "frame.jpg");
          apiFetch(`/api/sessions/${id}/frame`, { method: "POST", body: formData }).catch((err) =>
            console.warn("Failed to upload frame capture:", err)
          );
        }
      }
      if (!endingRef.current) scheduleNextFrameCapture();
    }, randomJitterMs(20, 45));
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        const tokenResponse = await apiFetch(`/api/sessions/${id}/realtime-token`, { method: "POST" });
        if (!tokenResponse.ok) throw new Error("Failed to start the interview session.");
        const { clientSecret } = (await tokenResponse.json()) as RealtimeTokenResponse;

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        pc.ontrack = (event) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
        };

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) pc.addTrack(audioTrack, stream);

        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;

        dc.addEventListener("open", () => {
          setState("connected");
          scheduleNextFrameCapture();
          dc.send(JSON.stringify({ type: "response.create" }));
        });

        dc.addEventListener("message", (event) => {
          try {
            const payload = JSON.parse(event.data as string) as { type: string; transcript?: string };
            if (payload.type === "response.created") {
              setIsAssistantSpeaking(true);
            } else if (payload.type === "response.output_audio_transcript.done" && payload.transcript) {
              setIsAssistantSpeaking(false);
              postTranscript("assistant", payload.transcript);
            } else if (
              payload.type === "conversation.item.input_audio_transcription.completed" &&
              payload.transcript
            ) {
              postTranscript("user", payload.transcript);
            } else if (payload.type === "response.done") {
              setIsAssistantSpeaking(false);
            }
          } catch (err) {
            console.warn("Failed to parse realtime event:", err);
          }
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpResponse = await fetch(`https://api.openai.com/v1/realtime/calls`, {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            "Content-Type": "application/sdp",
          },
        });

        if (!sdpResponse.ok) throw new Error("Failed to connect to the realtime voice service.");

        const answerSdp = await sdpResponse.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setState("error");
          setErrorMessage(err instanceof Error ? err.message : "Something went wrong starting the interview.");
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const cleanup = useCallback(() => {
    endingRef.current = true;
    if (frameTimerRef.current) clearTimeout(frameTimerRef.current);
    dcRef.current?.close();
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => cleanup, [cleanup]);

  async function handleEndInterview() {
    setState("ending");
    cleanup();
    try {
      await apiFetch(`/api/sessions/${id}/complete`, { method: "POST" });
    } catch (err) {
      console.warn("Failed to finalize session:", err);
    }
    router.push(`/session/${id}/results`);
  }

  const latestAssistantLine = [...transcript].reverse().find((line) => line.role === "assistant");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-2xl p-8 text-center sm:p-10">
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Mock Interview
        </span>

        <p className="mx-auto min-h-16 max-w-lg text-lg font-semibold leading-7">
          {state === "connecting" && "Connecting to your interviewer..."}
          {state === "error" && (errorMessage ?? "Something went wrong.")}
          {(state === "connected" || state === "ending") &&
            (latestAssistantLine?.text ?? "Listening for your interviewer...")}
        </p>

        <div className="mx-auto mt-6 aspect-video max-w-lg overflow-hidden rounded-xl bg-foreground/90">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        </div>
        <audio ref={remoteAudioRef} autoPlay />

        {transcript.length > 0 && (
          <div className="mx-auto mt-6 max-h-40 max-w-lg snap-y snap-proximity space-y-2 overflow-y-auto rounded-xl border border-border bg-background p-3 text-left text-sm">
            {transcript.map((line) => (
              <p key={line.id} className="snap-start">
                <span className={`font-semibold ${line.role === "assistant" ? "text-accent" : "text-foreground"}`}>
                  {line.role === "assistant" ? "Interviewer: " : "You: "}
                </span>
                {line.text}
              </p>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-2">
          <Button
            onClick={handleEndInterview}
            variant="secondary"
            disabled={state === "connecting" || state === "ending"}
          >
            End Interview
          </Button>
          <p className="text-xs text-muted">
            {state === "connected" && (isAssistantSpeaking ? "Interviewer is speaking..." : "Your turn to speak")}
            {state === "ending" && "Wrapping up and preparing your feedback..."}
            {state === "connecting" && "Setting up mic, camera, and voice connection"}
          </p>
        </div>
      </Card>
    </div>
  );
}
