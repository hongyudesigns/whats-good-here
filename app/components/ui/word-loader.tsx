"use client";

import React, { useMemo, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/app/lib/utils";

type WordLoaderProps = {
  words: string[];
  className?: string;
};

export function WordLoader({ words, className }: WordLoaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wordRefs = useRef<HTMLSpanElement[]>([]);

  const safeWords = useMemo(
    () => (words.length > 0 ? words : ["loading..."]),
    [words],
  );

  useGSAP(
    () => {
      if (!wordRefs.current.length) return;
      const items = wordRefs.current;
      gsap.set(items, { opacity: 0, y: 10 });

      const timeline = gsap.timeline({ repeat: -1 });
      items.forEach((el, i) => {
        timeline
          .to(el, { opacity: 1, y: 0, duration: 0.12, ease: "power2.out" })
          .to(el, { opacity: 0, y: -8, duration: 0.12, ease: "power2.in" }, "+=0.16");
        if (i !== items.length - 1) {
          timeline.to({}, { duration: 0.02 });
        }
      });
      if (timeline.duration() > 0) {
        // Normalize full word loop to ~10s (2x slower than previous).
        timeline.timeScale(timeline.duration() / 10);
      }
    },
    { scope: containerRef, dependencies: [safeWords.join("|")] },
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-[42px] min-w-[180px] text-center text-[21px] leading-none font-medium tracking-wide text-[#FFFFFF]",
        className,
      )}
      aria-live="polite"
    >
      {safeWords.map((word, idx) => (
        <span
          key={`${word}-${idx}`}
          ref={(el) => {
            if (el) wordRefs.current[idx] = el;
          }}
          className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
        >
          {word}
        </span>
      ))}
    </div>
  );
}
