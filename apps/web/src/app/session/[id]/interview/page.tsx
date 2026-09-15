"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, PhoneOff } from "lucide-react";
import { Badge, Button, Card, Spinner } from "@/components/ui";
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
    function tick(delayMs: number) {
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
        if (!endingRef.current) tick(randomJitterMs(20, 45));
      }, delayMs);
    }
    // First frame right after connecting (short delay skips camera warm-up frames) so every session gets a thumbnail.
    tick(2000);
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

  // Reset on (re)mount: Strict Mode's simulated unmount runs cleanup, which would otherwise disable capture for good.
  useEffect(() => {
    endingRef.current = false;
    return cleanup;
  }, [cleanup]);

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

  const statusLabel =
    state === "connected"
      ? isAssistantSpeaking
        ? "Interviewer is speaking"
        : "Your turn to speak"
      : state === "ending"
        ? "Wrapping up and preparing your feedback…"
        : state === "connecting"
          ? "Setting up mic, camera, and voice connection"
          : null;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl animate-enter">
        <div className="flex justify-center">
          <Badge variant={state === "error" ? "destructive" : "default"}>
            <span
              className={`size-1.5 rounded-full ${state === "connected" ? "animate-pulse bg-destructive" : "bg-current"}`}
            />
            {state === "connected" ? "Live" : "Mock interview"}
          </Badge>
        </div>

        <p
          aria-live="polite"
          className={`mx-auto mt-5 min-h-16 max-w-2xl text-balance text-center text-xl font-medium leading-snug sm:text-2xl ${
            state === "error" ? "text-destructive" : ""
          }`}
        >
          {state === "connecting" && "Connecting to your interviewer..."}
          {state === "error" && (errorMessage ?? "Something went wrong.")}
          {(state === "connected" || state === "ending") &&
            (latestAssistantLine?.text ?? "Listening for your interviewer...")}
        </p>

        <Card className="relative mt-8 overflow-hidden">
          <div className="aspect-video bg-muted">
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
          </div>
          {statusLabel && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium shadow-soft backdrop-blur">
              {state !== "connected" ? (
                <Spinner className="size-3.5" />
              ) : isAssistantSpeaking ? (
                <span aria-hidden className="flex h-3 items-center gap-0.5">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="h-full w-0.5 animate-bars rounded-full bg-primary"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </span>
              ) : (
                <Mic className="size-3.5 text-success" />
              )}
              {statusLabel}
            </div>
          )}
        </Card>
        <audio ref={remoteAudioRef} autoPlay />

        {transcript.length > 0 && (
          <div className="mt-6 max-h-48 snap-y snap-proximity space-y-3 overflow-y-auto rounded-xl border bg-card p-4 text-sm">
            {transcript.map((line) => (
              <div key={line.id} className="snap-start">
                <p className={`text-xs font-medium ${line.role === "assistant" ? "text-primary" : "text-muted-foreground"}`}>
                  {line.role === "assistant" ? "Interviewer" : "You"}
                </p>
                <p className="mt-0.5 leading-relaxed">{line.text}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={handleEndInterview}
            disabled={state === "connecting" || state === "ending"}
          >
            {state === "ending" ? <Spinner /> : <PhoneOff />}
            End interview
          </Button>
        </div>
      </div>
    </main>
  );
}
