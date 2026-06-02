"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Rocket,
  Settings,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TourStep {
  /** Unique key for transitions. */
  id: string;
  /** Title shown in the tooltip. */
  title: string;
  /** Body description. */
  description: string;
  /**
   * Value of the `data-tour` attribute on the element to highlight.
   * When `null` the step is shown as a centred modal (no spotlight).
   */
  target: string | null;
  /** Optional CTA label that replaces "Concluir" on the last step. */
  cta?: { label: string; href: string };
}

const STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo ao FatorZap!",
    description:
      "Seu CRM completo para WhatsApp. Vamos fazer um tour rápido pelas principais funcionalidades.",
    target: null,
  },
  {
    id: "inbox",
    title: "Caixa de Entrada",
    description:
      "Aqui você gerencia todas as conversas do WhatsApp em tempo real.",
    target: "inbox",
  },
  {
    id: "contacts",
    title: "Contatos",
    description: "Sua base de contatos organizada com tags e dados.",
    target: "contacts",
  },
  {
    id: "pipelines",
    title: "Pipeline",
    description:
      "Acompanhe seus deals do primeiro contato até o fechamento.",
    target: "pipelines",
  },
  {
    id: "automations",
    title: "Automações",
    description:
      "Crie regras automáticas para respostas e follow-ups.",
    target: "automations",
  },
  {
    id: "broadcasts",
    title: "Transmissões",
    description: "Envie mensagens em massa segmentadas.",
    target: "broadcasts",
  },
  {
    id: "settings",
    title: "Configurações do WhatsApp",
    description:
      "Conecte seu WhatsApp escaneando o QR Code em Configurações.",
    target: "settings",
  },
  {
    id: "done",
    title: "Tudo pronto!",
    description:
      "Comece conectando seu WhatsApp nas Configurações. Bom uso!",
    target: null,
    cta: { label: "Ir para Configurações", href: "/settings?tab=whatsapp" },
  },
];

const STORAGE_KEY = "fatorzap_tour_completed";

// ---------------------------------------------------------------------------
// Tooltip positioning helpers
// ---------------------------------------------------------------------------

type Placement = "right" | "center";

interface TooltipPos {
  top: number;
  left: number;
  placement: Placement;
}

function getTooltipPos(
  targetRect: DOMRect | null,
  tooltipW: number,
  tooltipH: number,
): TooltipPos {
  if (!targetRect) {
    // Centred modal fallback.
    return {
      top: Math.max(0, (window.innerHeight - tooltipH) / 2),
      left: Math.max(0, (window.innerWidth - tooltipW) / 2),
      placement: "center",
    };
  }

  const gap = 16;

  // Default: to the right of the target, vertically centred.
  let top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
  let left = targetRect.right + gap;

  // Clamp vertically.
  top = Math.max(12, Math.min(top, window.innerHeight - tooltipH - 12));

  // If tooltip overflows right, flip to overlay to the right of sidebar.
  if (left + tooltipW > window.innerWidth - 12) {
    left = targetRect.right + gap;
    if (left + tooltipW > window.innerWidth - 12) {
      left = window.innerWidth - tooltipW - 12;
    }
  }

  return { top, left, placement: "right" };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingTour() {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>(
    {},
  );
  const [visible, setVisible] = useState(false); // for enter animation
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Only run on client after mount.
  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // SSR or storage blocked — skip tour.
      return;
    }
    // Small delay so the sidebar has rendered and layout is stable.
    const timer = setTimeout(() => {
      setActive(true);
      // Trigger enter animation on next frame.
      requestAnimationFrame(() => setVisible(true));
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // ----- Position tooltip whenever step changes -----
  const positionTooltip = useCallback(() => {
    const current = STEPS[step];
    if (!current) return;

    let targetRect: DOMRect | null = null;

    if (current.target) {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (el) {
        targetRect = el.getBoundingClientRect();
      }
    }

    // Spotlight
    if (targetRect) {
      const pad = 4;
      setSpotlightStyle({
        top: targetRect.top - pad,
        left: targetRect.left - pad,
        width: targetRect.width + pad * 2,
        height: targetRect.height + pad * 2,
        borderRadius: 10,
        opacity: 1,
      });
    } else {
      setSpotlightStyle({ opacity: 0 });
    }

    // Tooltip
    const tooltipEl = tooltipRef.current;
    const tooltipW = tooltipEl?.offsetWidth ?? 360;
    const tooltipH = tooltipEl?.offsetHeight ?? 200;
    const pos = getTooltipPos(targetRect, tooltipW, tooltipH);
    setTooltipStyle({
      top: pos.top,
      left: pos.left,
    });
  }, [step]);

  useEffect(() => {
    if (!active) return;
    // Position immediately + after a micro-task (tooltip may resize).
    positionTooltip();
    const raf = requestAnimationFrame(positionTooltip);
    return () => cancelAnimationFrame(raf);
  }, [active, step, positionTooltip]);

  // Reposition on resize.
  useEffect(() => {
    if (!active) return;
    const handler = () => positionTooltip();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [active, positionTooltip]);

  // ----- Actions -----

  const finish = useCallback(
    (navigateTo?: string) => {
      setVisible(false);
      setTimeout(() => {
        setActive(false);
        try {
          localStorage.setItem(STORAGE_KEY, "1");
        } catch {
          /* ignore */
        }
        if (navigateTo) router.push(navigateTo);
      }, 300);
    },
    [router],
  );

  const next = useCallback(() => {
    if (step >= STEPS.length - 1) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  }, [step, finish]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const skip = useCallback(() => finish(), [finish]);

  // Keyboard navigation.
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, next, prev, skip]);

  if (!mounted || !active) return null;

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const isCentred = !current.target;

  const overlay = (
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-modal="true"
      role="dialog"
      aria-label="Tour de boas-vindas"
    >
      {/* Dark backdrop with cutout */}
      <div className="absolute inset-0">
        {/* Full-page dark overlay */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]" />

        {/* Spotlight cutout — a box-shadow trick to cut through the overlay */}
        <div
          className="absolute transition-all duration-300 ease-out"
          style={{
            ...spotlightStyle,
            boxShadow: "0 0 0 9999px rgba(2,6,23,0.80)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Click-away to skip */}
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-default"
        onClick={skip}
        aria-label="Pular tour"
        tabIndex={-1}
      />

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className={`absolute z-10 w-[340px] max-w-[calc(100vw-24px)] rounded-xl border border-slate-700/60 bg-slate-900 p-5 shadow-2xl shadow-black/40 transition-all duration-300 ease-out ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-2 opacity-0"
        }`}
        style={tooltipStyle}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={skip}
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
          aria-label="Fechar tour"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon for centred steps */}
        {isCentred && (
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            {isLast ? (
              <Rocket className="h-5 w-5 text-primary" />
            ) : (
              <MessageSquare className="h-5 w-5 text-primary" />
            )}
          </div>
        )}

        {/* Content */}
        <h3 className="mb-1.5 pr-6 text-base font-semibold text-white">
          {current.title}
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          {current.description}
        </p>

        {/* Progress dots */}
        <div className="mb-4 flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === step
                  ? "w-4 bg-primary"
                  : i < step
                    ? "w-1.5 bg-primary/40"
                    : "w-1.5 bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={skip}
            className="text-xs text-slate-500 transition-colors hover:text-slate-300"
          >
            Pular tour
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button variant="ghost" size="sm" onClick={prev}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Anterior
              </Button>
            )}
            {current.cta ? (
              <Button
                size="sm"
                onClick={() => finish(current.cta!.href)}
              >
                <Settings className="h-3.5 w-3.5" />
                {current.cta.label}
              </Button>
            ) : isLast ? (
              <Button size="sm" onClick={() => finish()}>
                Concluir
              </Button>
            ) : (
              <Button size="sm" onClick={next}>
                Próximo
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
