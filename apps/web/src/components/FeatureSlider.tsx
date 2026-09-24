"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";

const FEATURES = [
  {
    title: "Questions from your materials",
    text: "Paste a job description and upload your resume. The interviewer is built from those, not a generic question bank.",
  },
  {
    title: "Spoken interview, with follow-ups",
    text: "Talk out loud. The interviewer asks, listens, and pushes on what you actually said.",
  },
  {
    title: "Feedback you can reuse",
    text: "Transcript, scores, highlighted strong and weak moments, and rewritten answers to practice next time.",
  },
  {
    title: "Your key, on your machine",
    text: "No account. You add an OpenAI API key in Settings. It stays on the device and is never stored on the server.",
  },
];

const N = FEATURES.length;
const LOOP = [...FEATURES, ...FEATURES, ...FEATURES];

export function FeatureSlider() {
  const [i, setI] = useState(N);
  const [motion, setMotion] = useState(true);
  const lock = useRef(false);
  const [hover, setHover] = useState(false);

  function go(dir: -1 | 1) {
    if (lock.current) return;
    lock.current = true;
    setMotion(true);
    setI((v) => v + dir);
  }

  function settled() {
    setI((v) => {
      if (v < N || v >= N * 2) {
        setMotion(false);
        return (v % N) + N;
      }
      return v;
    });
    lock.current = false;
  }

  useEffect(() => {
    if (hover) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => go(1), 2000);
    return () => window.clearInterval(id);
  }, [hover]);

  return (
    <div className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Previous feature"
        className="absolute left-0 top-1/2 z-10 -translate-y-1/2"
        onClick={() => go(-1)}
      >
        <ChevronLeft />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Next feature"
        className="absolute right-0 top-1/2 z-10 -translate-y-1/2"
        onClick={() => go(1)}
      >
        <ChevronRight />
      </Button>
      <div className="overflow-hidden px-10 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div
          className="flex"
          style={{
            transform: `translateX(calc(25% - ${i} * 50%))`,
            transition: motion ? "transform 400ms ease-in-out" : "none",
          }}
          onTransitionEnd={(e) => {
            if (e.propertyName === "transform") settled();
          }}
        >
          {LOOP.map(({ title, text }, idx) => (
            <div
              key={idx}
              className={`w-1/2 shrink-0 px-3 text-center transition-opacity duration-[400ms] ease-in-out ${
                idx === i ? "opacity-100" : "opacity-40"
              }`}
            >
              <h2 className="font-medium">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
