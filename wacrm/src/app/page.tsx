import Link from "next/link";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  CheckCheck,
  GitBranch,
  Inbox,
  Lock,
  Megaphone,
  MessageCircle,
  Phone,
  QrCode,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Workflow,
} from "lucide-react";
import { CountUp, Reveal, SpotlightCard } from "@/components/landing/landing-fx";
import Aurora from "@/components/Aurora";

// Distinctive type pairing — Bricolage Grotesque (characterful display) over
// Plus Jakarta Sans (clean geometric body), with JetBrains Mono for the
// kicker labels. Loaded scoped to this page so the dashboard keeps Inter.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700", "800"],
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-monofz",
  weight: ["400", "500"],
});

const features = [
  {
    icon: Inbox,
    title: "Inbox unificado",
    desc: "Toda a equipe atendendo o mesmo número, em tempo real, sem brigar pelo celular. Atribua, marque e responda sem perder o fio da conversa.",
    span: "lg:col-span-2",
  },
  {
    icon: Workflow,
    title: "Automações no-code",
    desc: "Respostas instantâneas, follow-ups e fluxos com arrastar-e-soltar.",
    span: "",
  },
  {
    icon: GitBranch,
    title: "Pipeline de vendas",
    desc: "Arraste o lead do primeiro oi até o fechado-ganho.",
    span: "",
  },
  {
    icon: Megaphone,
    title: "Broadcasts segmentados",
    desc: "Campanhas em massa para listas filtradas — com a cara de mensagem pessoal, não de spam.",
    span: "lg:col-span-2",
  },
];

const steps = [
  {
    icon: QrCode,
    n: "01",
    title: "Escaneie o QR Code",
    desc: "Conecte seu WhatsApp em segundos. Sem API oficial, sem burocracia, sem cartão.",
  },
  {
    icon: Users,
    n: "02",
    title: "Centralize tudo",
    desc: "Conversas, contatos e histórico no mesmo lugar — prontos para a equipe inteira.",
  },
  {
    icon: Rocket,
    n: "03",
    title: "Venda no automático",
    desc: "Pipeline, automações e disparos trabalhando 24/7 enquanto você foca no que importa.",
  },
];

const stats = [
  { to: 100, suffix: "%", label: "Self-hosted e seus dados" },
  { to: 2, suffix: "min", label: "Para conectar e operar" },
  { to: 24, suffix: "/7", label: "Automações sem pausa" },
  { to: 0, prefix: "R$ ", label: "Para começar hoje" },
];

const marqueeItems = [
  "Inbox em tempo real",
  "QR Code instantâneo",
  "Pipeline kanban",
  "Disparos em massa",
  "Automação no-code",
  "Multiatendentes",
  "Criptografia ponta a ponta",
  "100% self-hosted",
];

export default function LandingPage() {
  return (
    <div
      className={`fz-root font-jakarta relative min-h-screen overflow-x-hidden bg-[var(--fz-bg)] text-white antialiased ${display.variable} ${jakarta.variable} ${mono.variable}`}
    >
      {/* ===================== Ambient background ===================== */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* React Bits Aurora — WebGL flowing gradient anchored to the top */}
        <div className="absolute inset-x-0 top-0 h-[75vh] opacity-70">
          <Aurora
            colorStops={["#25d366", "#a3e635", "#2dd4bf"]}
            amplitude={1.1}
            blend={0.55}
            speed={0.7}
          />
        </div>
        {/* vignette + grid texture layered over the aurora */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(37,211,102,0.08),transparent_60%)]" />
        <div className="fz-grid absolute inset-0" />
        {/* soft secondary glows lower on the page */}
        <div
          className="fz-aurora-blob absolute top-[60%] -right-32 h-[440px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(163,230,53,0.14),transparent_70%)] blur-[110px]"
          style={{ animationDelay: "-12s" }}
        />
      </div>

      <div className="relative z-10">
        {/* ===================== Nav ===================== */}
        <header className="sticky top-0 z-50 border-b border-white/5 bg-[var(--fz-bg)]/70 backdrop-blur-xl">
          <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <img
                src="/factorzap-icon.svg"
                alt="FatorZap"
                className="h-8 w-8"
              />
              <span className="font-display text-lg font-bold tracking-tight">
                Fator<span className="text-[var(--fz-emerald)]">Zap</span>
              </span>
            </Link>

            <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
              <a href="#recursos" className="transition-colors hover:text-white">
                Recursos
              </a>
              <a href="#como" className="transition-colors hover:text-white">
                Como funciona
              </a>
              <a href="#resultados" className="transition-colors hover:text-white">
                Resultados
              </a>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
              >
                Entrar
              </Link>
              <Link
                href="/signup"
                className="group inline-flex items-center gap-1.5 rounded-lg bg-[var(--fz-green)] px-4 py-2 text-sm font-semibold text-[#04190d] shadow-[0_0_0_1px_rgba(37,211,102,0.4),0_8px_30px_-8px_rgba(37,211,102,0.6)] transition-all hover:shadow-[0_0_0_1px_rgba(37,211,102,0.6),0_10px_40px_-6px_rgba(37,211,102,0.8)]"
              >
                Comece grátis
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </nav>
        </header>

        {/* ===================== Hero ===================== */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-16 pb-12 sm:px-6 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pt-28">
          {/* copy */}
          <div>
            <div
              className="fz-load inline-flex items-center gap-2 rounded-full border border-[var(--fz-emerald)]/25 bg-[var(--fz-emerald)]/10 px-3 py-1.5 font-monofz text-[11px] tracking-wide text-[var(--fz-emerald)] uppercase"
              style={{ animationDelay: "0.05s" }}
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--fz-emerald)] opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-[var(--fz-emerald)]" />
              </span>
              CRM para WhatsApp
            </div>

            <h1
              className="fz-load font-display mt-6 text-[2.7rem] leading-[1.02] font-extrabold tracking-tight sm:text-6xl lg:text-[4.2rem]"
              style={{ animationDelay: "0.12s" }}
            >
              Seu WhatsApp virou
              <br />
              uma{" "}
              <span className="fz-gradient-text bg-[linear-gradient(110deg,var(--fz-green),var(--fz-lime),var(--fz-teal),var(--fz-green))]">
                máquina de vendas
              </span>
            </h1>

            <p
              className="fz-load mt-6 max-w-xl text-lg leading-relaxed text-slate-400"
              style={{ animationDelay: "0.2s" }}
            >
              Inbox compartilhado, pipeline de vendas, automações e disparos em
              massa — tudo conectado ao seu número, num painel só. Conecte pelo
              QR Code e comece a vender em 2 minutos.
            </p>

            <div
              className="fz-load mt-9 flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: "0.28s" }}
            >
              <Link
                href="/signup"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--fz-green)] px-7 text-base font-semibold text-[#04190d] shadow-[0_10px_40px_-8px_rgba(37,211,102,0.7)] transition-all hover:scale-[1.02] hover:shadow-[0_14px_50px_-6px_rgba(37,211,102,0.9)]"
              >
                Criar conta grátis
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-7 text-base font-semibold text-slate-200 backdrop-blur transition-all hover:border-white/25 hover:bg-white/[0.07]"
              >
                Já tenho conta
              </Link>
            </div>

            <div
              className="fz-load mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500"
              style={{ animationDelay: "0.36s" }}
            >
              {["Sem cartão de crédito", "Setup em 2 minutos", "Seus dados, seu servidor"].map(
                (item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check className="size-4 text-[var(--fz-emerald)]" />
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          {/* iconic animated chat mockup */}
          <div
            className="fz-load relative mx-auto w-full max-w-md lg:mx-0"
            style={{ animationDelay: "0.3s" }}
          >
            {/* spinning conic halo */}
            <div className="fz-conic absolute -inset-px rounded-[2rem] opacity-40 blur-[2px]" />

            <div className="animate-fz-float relative">
              {/* chat card */}
              <div className="relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-[#0a1416]/90 shadow-2xl shadow-black/60 backdrop-blur-xl">
                {/* chat header */}
                <div className="flex items-center gap-3 border-b border-white/8 bg-white/[0.03] px-5 py-3.5">
                  <div className="relative">
                    <div className="flex size-9 items-center justify-center rounded-full bg-[var(--fz-green)]/15 text-[var(--fz-emerald)]">
                      <Phone className="size-4" />
                    </div>
                    <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-[#0a1416] bg-[var(--fz-emerald)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">Mariana · Lead novo</p>
                    <p className="font-monofz text-[10px] tracking-wide text-[var(--fz-emerald)]">
                      online agora
                    </p>
                  </div>
                  <span className="rounded-md border border-[var(--fz-emerald)]/25 bg-[var(--fz-emerald)]/10 px-2 py-1 font-monofz text-[9px] tracking-wider text-[var(--fz-emerald)] uppercase">
                    Pipeline
                  </span>
                </div>

                {/* messages */}
                <div className="space-y-3 px-5 py-5">
                  <div
                    className="fz-load max-w-[78%] rounded-2xl rounded-tl-md bg-white/[0.06] px-3.5 py-2.5 text-sm text-slate-200"
                    style={{ animationDelay: "0.7s" }}
                  >
                    Oi! Vi o anúncio de vocês, ainda tem desconto? 👀
                  </div>
                  <div
                    className="fz-load ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-[var(--fz-green)] px-3.5 py-2.5 text-sm text-[#04190d]"
                    style={{ animationDelay: "1.1s" }}
                  >
                    Oi Mariana! Tem sim 🎉 Te mando agora a condição especial.
                    <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#04190d]/60">
                      14:32 <CheckCheck className="size-3" />
                    </span>
                  </div>
                  <div
                    className="fz-load flex items-center gap-2 rounded-xl border border-[var(--fz-emerald)]/20 bg-[var(--fz-emerald)]/8 px-3 py-2 text-xs text-[var(--fz-emerald)]"
                    style={{ animationDelay: "1.5s" }}
                  >
                    <Bot className="size-3.5 shrink-0" />
                    Automação moveu o contato para{" "}
                    <strong className="font-semibold">Negociação</strong>
                  </div>

                  {/* typing */}
                  <div
                    className="fz-load flex w-fit items-center gap-1.5 rounded-2xl rounded-tl-md bg-white/[0.06] px-4 py-3"
                    style={{ animationDelay: "1.9s" }}
                  >
                    <span className="fz-dot size-1.5 rounded-full bg-slate-400" />
                    <span
                      className="fz-dot size-1.5 rounded-full bg-slate-400"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="fz-dot size-1.5 rounded-full bg-slate-400"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>
              </div>

              {/* floating pipeline chip */}
              <div className="animate-fz-float absolute -right-4 -bottom-6 hidden rounded-2xl border border-white/10 bg-[#0a1416]/95 p-3 shadow-xl shadow-black/50 backdrop-blur-xl sm:block" style={{ animationDelay: "-2s" }}>
                <p className="font-monofz text-[9px] tracking-wider text-slate-500 uppercase">
                  Fechado hoje
                </p>
                <p className="font-display text-xl font-bold text-[var(--fz-emerald)]">
                  R$ 12.480
                </p>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                  <ArrowUpRight className="size-3 text-[var(--fz-emerald)]" />
                  +38% essa semana
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== Marquee ===================== */}
        <div className="relative overflow-hidden border-y border-white/5 bg-white/[0.015] py-4">
          <div className="fz-marquee-track flex w-max gap-3 whitespace-nowrap">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-1.5 text-sm text-slate-400"
              >
                <Sparkles className="size-3.5 text-[var(--fz-emerald)]" />
                {item}
              </span>
            ))}
          </div>
          {/* edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[var(--fz-bg)] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[var(--fz-bg)] to-transparent" />
        </div>

        {/* ===================== Features ===================== */}
        <section id="recursos" className="mx-auto max-w-6xl px-5 py-24 sm:px-6 sm:py-32">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-monofz text-xs tracking-[0.2em] text-[var(--fz-emerald)] uppercase">
              Tudo num lugar só
            </p>
            <h2 className="font-display mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              O CRM que fala a língua do{" "}
              <span className="text-[var(--fz-emerald)]">WhatsApp</span>
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Pare de pular entre planilha, celular e bloco de notas. O FatorZap
              junta atendimento, vendas e marketing num fluxo só.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 80} className={f.span}>
                <SpotlightCard className="group h-full rounded-3xl border border-white/8 bg-white/[0.02] p-7 transition-colors hover:border-[var(--fz-emerald)]/25">
                  <div className="relative">
                    <div className="mb-5 inline-flex rounded-2xl border border-[var(--fz-emerald)]/20 bg-[var(--fz-emerald)]/10 p-3 text-[var(--fz-emerald)]">
                      <f.icon className="size-6" />
                    </div>
                    <h3 className="font-display text-xl font-semibold">{f.title}</h3>
                    <p className="mt-2.5 leading-relaxed text-slate-400">{f.desc}</p>
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ===================== How it works ===================== */}
        <section id="como" className="relative mx-auto max-w-6xl px-5 py-24 sm:px-6 sm:py-32">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-monofz text-xs tracking-[0.2em] text-[var(--fz-emerald)] uppercase">
              Comece em minutos
            </p>
            <h2 className="font-display mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Do zero ao primeiro lead em{" "}
              <span className="text-[var(--fz-emerald)]">3 passos</span>
            </h2>
          </Reveal>

          <div className="relative mt-16 grid gap-8 sm:grid-cols-3">
            {/* connecting line */}
            <div className="pointer-events-none absolute top-9 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-[var(--fz-emerald)]/30 to-transparent sm:block" />
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 120} className="relative text-center">
                <div className="mx-auto mb-6 flex size-18 items-center justify-center rounded-2xl border border-[var(--fz-emerald)]/25 bg-[var(--fz-bg)] p-4 text-[var(--fz-emerald)] shadow-[0_0_40px_-10px_rgba(37,211,102,0.5)]">
                  <s.icon className="size-7" />
                </div>
                <span className="font-monofz text-xs tracking-[0.2em] text-slate-500">
                  PASSO {s.n}
                </span>
                <h3 className="font-display mt-2 text-xl font-semibold">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs leading-relaxed text-slate-400">
                  {s.desc}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ===================== Results / stats ===================== */}
        <section id="resultados" className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-gradient-to-b from-white/[0.04] to-transparent p-10 sm:p-14">
              <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(37,211,102,0.18),transparent_70%)] blur-[80px]" />
              <div className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="font-display text-4xl font-extrabold text-white sm:text-5xl">
                      <CountUp
                        to={s.to}
                        prefix={s.prefix ?? ""}
                        suffix={s.suffix ?? ""}
                      />
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* ===================== Testimonial ===================== */}
        <section className="mx-auto max-w-4xl px-5 py-24 sm:px-6 sm:py-32">
          <Reveal>
            <figure className="relative rounded-[2rem] border border-white/8 bg-white/[0.02] p-10 text-center sm:p-14">
              <div className="mb-6 flex items-center justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="size-5 fill-[var(--fz-lime)] text-[var(--fz-lime)]"
                  />
                ))}
              </div>
              <blockquote className="font-display text-2xl leading-snug font-medium text-white sm:text-3xl">
                “Trocamos 3 ferramentas pelo FatorZap. A equipe atende mais
                rápido, nada se perde e o pipeline finalmente reflete a
                realidade das vendas.”
              </blockquote>
              <figcaption className="mt-7 flex items-center justify-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-full bg-[var(--fz-emerald)]/15 font-display font-bold text-[var(--fz-emerald)]">
                  RC
                </div>
                <div className="text-left">
                  <p className="font-semibold">Rafael Costa</p>
                  <p className="text-sm text-slate-400">Head de Vendas · agência digital</p>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        </section>

        {/* ===================== Final CTA ===================== */}
        <section className="relative mx-auto max-w-6xl px-5 pb-28 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2.2rem] border border-[var(--fz-emerald)]/20 bg-[linear-gradient(135deg,rgba(37,211,102,0.12),rgba(45,212,191,0.06))] px-7 py-16 text-center sm:px-14 sm:py-20">
              <div className="fz-aurora-blob pointer-events-none absolute -top-24 left-1/2 h-72 w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(37,211,102,0.4),transparent_70%)] blur-[80px]" />
              <div className="relative">
                <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-sm text-slate-200">
                  <ShieldCheck className="size-4 text-[var(--fz-emerald)]" />
                  Self-hosted · seus dados nunca saem do seu servidor
                </div>
                <h2 className="font-display mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">
                  Pronto para vender mais pelo{" "}
                  <span className="fz-gradient-text bg-[linear-gradient(110deg,var(--fz-green),var(--fz-lime),var(--fz-teal),var(--fz-green))]">
                    WhatsApp
                  </span>
                  ?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300/90">
                  Crie sua conta grátis e conecte seu número agora. Leva menos
                  tempo do que ler esta página.
                </p>
                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/signup"
                    className="group inline-flex h-12 items-center gap-2 rounded-xl bg-[var(--fz-green)] px-8 text-base font-semibold text-[#04190d] shadow-[0_12px_44px_-8px_rgba(37,211,102,0.8)] transition-all hover:scale-[1.02]"
                  >
                    Comece grátis agora
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 px-8 text-base font-semibold text-white transition-colors hover:bg-white/5"
                  >
                    Entrar
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ===================== Footer ===================== */}
        <footer className="border-t border-white/8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/factorzap-icon.svg" alt="FatorZap" className="h-7 w-7" />
              <span className="font-display text-base font-bold tracking-tight">
                Fator<span className="text-[var(--fz-emerald)]">Zap</span>
              </span>
            </Link>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="size-3.5 text-[var(--fz-emerald)]" />
                Criptografia ponta a ponta
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="size-3.5 text-[var(--fz-emerald)]" />
                Feito para WhatsApp
              </span>
            </div>
            <p className="font-monofz text-xs text-slate-500">
              © {new Date().getFullYear()} FatorZap
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
