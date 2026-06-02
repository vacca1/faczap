import Link from "next/link";
import {
  Inbox,
  Zap,
  BarChart3,
  Megaphone,
  QrCode,
  Users,
  Rocket,
  MessageCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  MessagesSquare,
} from "lucide-react";

const features = [
  {
    icon: Inbox,
    title: "Inbox Unificado",
    description:
      "Todas as conversas do WhatsApp em uma interface profissional. Organize, priorize e nunca perca uma mensagem.",
  },
  {
    icon: Zap,
    title: "Automações Inteligentes",
    description:
      "Respostas automáticas, follow-ups e fluxos personalizados que trabalham 24/7 por você.",
  },
  {
    icon: BarChart3,
    title: "Pipeline de Vendas",
    description:
      "Acompanhe cada lead do primeiro contato até o fechamento com visão completa do funil.",
  },
  {
    icon: Megaphone,
    title: "Broadcasts",
    description:
      "Envie mensagens em massa segmentadas para sua base. Campanhas direcionadas com poucos cliques.",
  },
];

const steps = [
  {
    icon: QrCode,
    step: "1",
    title: "Conecte seu WhatsApp",
    description: "Escaneie o QR Code e pronto. Sem APIs complexas, sem configuração técnica.",
  },
  {
    icon: Users,
    step: "2",
    title: "Importe seus contatos",
    description: "Traga sua base de clientes existente ou comece do zero. Simples assim.",
  },
  {
    icon: Rocket,
    step: "3",
    title: "Comece a vender",
    description: "Pipeline, automações e broadcasts prontos para usar. Resultados desde o dia 1.",
  },
];

const stats = [
  {
    icon: MessageCircle,
    value: "2M+",
    label: "Mensagens entregues",
  },
  {
    icon: MessagesSquare,
    value: "50K+",
    label: "Conversas gerenciadas",
  },
  {
    icon: Clock,
    value: "< 2min",
    label: "Tempo médio de resposta",
  },
  {
    icon: TrendingUp,
    value: "3x",
    label: "Mais conversões",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[oklch(0.10_0.01_260)] text-white">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[oklch(0.10_0.01_260)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="size-4 text-white" />
            </div>
            FatorZap
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80"
            >
              Comece grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-primary/15 blur-[120px]" />
          <div className="absolute top-40 left-1/4 h-[300px] w-[400px] rounded-full bg-primary/10 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-20 text-center sm:pt-32 sm:pb-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <Zap className="size-3.5" />
            CRM para WhatsApp
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Transforme seu WhatsApp em uma{" "}
            <span className="bg-gradient-to-r from-primary via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              máquina de vendas
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            CRM completo para WhatsApp: inbox unificado, pipelines de vendas, automações e
            broadcasts. Tudo em um só lugar.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
            >
              Comece grátis
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 text-base font-semibold text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Já tenho conta
            </Link>
          </div>

          {/* Feature pills */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
            {["Sem cartão de crédito", "Setup em 2 minutos", "Suporte humanizado"].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative border-t border-white/5 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Tudo que você precisa para{" "}
              <span className="text-primary">vender mais</span>
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Ferramentas profissionais para transformar conversas em conversões.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-all hover:border-primary/20 hover:bg-white/[0.04]"
              >
                {/* Subtle glow on hover */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="relative">
                  <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                    <feature.icon className="size-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative border-t border-white/5 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Comece em <span className="text-primary">3 passos simples</span>
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Do zero ao primeiro pipeline de vendas em menos de 5 minutos.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="relative text-center">
                <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                  <s.icon className="size-7 text-primary" />
                </div>
                <div className="mb-2 text-sm font-semibold tracking-wider text-primary/60 uppercase">
                  Passo {s.step}
                </div>
                <h3 className="text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-slate-400">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof / Numbers ── */}
      <section className="relative border-t border-white/5 py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Feito para equipes que{" "}
              <span className="text-primary">vendem pelo WhatsApp</span>
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Números que mostram o impacto do FatorZap no dia a dia das equipes comerciais.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center"
              >
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <stat.icon className="size-5 text-primary" />
                </div>
                <div className="text-3xl font-bold tracking-tight text-white">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative border-t border-white/5 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Pronto para{" "}
            <span className="bg-gradient-to-r from-primary via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              começar?
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            Crie sua conta gratuita e veja como o FatorZap pode transformar suas vendas pelo
            WhatsApp.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
            >
              Criar conta gratuita
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2 text-lg font-bold">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
                <Zap className="size-3.5 text-white" />
              </div>
              FatorZap
            </div>
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} FatorZap. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
