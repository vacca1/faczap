"use client";

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Scroll-reveal wrapper. IntersectionObserver-driven so sections rise into
// view as the visitor scrolls. CSS does the actual transition (see globals).
// ---------------------------------------------------------------------------

interface RevealProps {
  children: React.ReactNode;
  /** Stagger in ms — chain siblings for a cascading reveal. */
  delay?: number;
  className?: string;
}

export function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`fz-reveal ${shown ? "fz-reveal-in" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Count-up number. Animates 0 → target with an ease-out cubic the first time
// it scrolls into view. Used in the results band.
// ---------------------------------------------------------------------------

interface CountUpProps {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}

export function CountUp({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1600,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(to * eased);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Spotlight card. A radial glow follows the cursor across the card surface —
// the React-Bits "spotlight" effect, recreated dependency-free.
// ---------------------------------------------------------------------------

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className = "" }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={`fz-spotlight ${className}`}
    >
      {children}
    </div>
  );
}
