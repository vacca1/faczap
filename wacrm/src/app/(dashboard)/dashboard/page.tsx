"use client"

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'
import {
  MessageSquare,
  UserPlus,
  DollarSign,
  Send,
  CheckCircle2,
  Circle,
  Zap,
  ArrowRight,
} from 'lucide-react'

import {
  loadActivity,
  loadConversationsSeries,
  loadMetrics,
  loadPipelineDonut,
  loadResponseTime,
} from '@/lib/dashboard/queries'
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  MetricsBundle,
  PipelineDonutData,
  ResponseTimeSummary,
} from '@/lib/dashboard/types'

import { MetricCard } from '@/components/dashboard/metric-card'
import { SkeletonCard } from '@/components/dashboard/skeleton'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ConversationsChart } from '@/components/dashboard/conversations-chart'
import { PipelineDonut } from '@/components/dashboard/pipeline-donut'
import { ResponseTimeChart } from '@/components/dashboard/response-time-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'

type RangeDays = 7 | 30 | 90

interface SetupStep {
  key: string
  label: string
  description: string
  done: boolean
  href: string
}

function OnboardingBanner({ steps, userName }: { steps: SetupStep[]; userName: string }) {
  const completed = steps.filter(s => s.done).length
  const total = steps.length
  const progress = Math.round((completed / total) * 100)
  const allDone = completed === total

  if (allDone) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-slate-900 to-slate-900 p-6">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
      <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-primary/5 blur-xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              {userName ? `Olá, ${userName.split(' ')[0]}!` : 'Bem-vindo ao FatorZap!'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Configure seu CRM de WhatsApp em poucos passos e comece a vender mais.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-2xl font-bold text-primary">{progress}%</span>
            <p className="text-xs text-slate-500">configurado</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 rounded-full bg-slate-800">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-primary to-green-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <Link
              key={step.key}
              href={step.href}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                step.done
                  ? 'border-green-500/20 bg-green-500/5'
                  : 'border-slate-700 bg-slate-800/40 hover:border-primary/40 hover:bg-slate-800/80'
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              )}
              <div className="min-w-0">
                <p className={`text-xs font-medium ${step.done ? 'text-green-400' : 'text-white'}`}>
                  {step.label}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500 leading-tight">
                  {step.description}
                </p>
              </div>
              {!step.done && <ArrowRight className="ml-auto mt-0.5 h-3 w-3 shrink-0 text-slate-600" />}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [metrics, setMetrics] = useState<MetricsBundle | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([])

  const [range, setRange] = useState<RangeDays>(30)
  // Keep a cache per range so switching tabs doesn't re-fetch what we
  // already have. Ranges the user hasn't opened yet stay null and
  // trigger a fetch on first view.
  const [series, setSeries] = useState<Record<RangeDays, ConversationsSeriesPoint[] | null>>({
    7: null,
    30: null,
    90: null,
  })
  const [seriesLoading, setSeriesLoading] = useState(true)

  const [pipeline, setPipeline] = useState<PipelineDonutData | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(true)

  const [responseTime, setResponseTime] = useState<ResponseTimeSummary | null>(null)
  const [responseTimeLoading, setResponseTimeLoading] = useState(true)

  const [activity, setActivity] = useState<ActivityItem[] | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)

  // Check setup progress
  useEffect(() => {
    const db = createClient()
    ;(async () => {
      const accountId = profile?.account_id
      if (!accountId) return

      // Check WhatsApp connection
      const { data: waConfig } = await db
        .from('whatsapp_config')
        .select('status')
        .eq('account_id', accountId)
        .maybeSingle()
      const waConnected = waConfig?.status === 'connected'

      // Check if there are contacts
      const { count: contactCount } = await db
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId)

      // Check if there's a pipeline with deals
      const { count: dealCount } = await db
        .from('deals')
        .select('id', { count: 'exact', head: true })

      // Check if there are automations
      const { count: autoCount } = await db
        .from('automations')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId)

      setSetupSteps([
        {
          key: 'whatsapp',
          label: 'Conectar WhatsApp',
          description: 'Vincule seu número para enviar e receber mensagens',
          done: waConnected,
          href: '/settings?tab=whatsapp',
        },
        {
          key: 'contacts',
          label: 'Importar Contatos',
          description: 'Adicione seus clientes e leads ao CRM',
          done: (contactCount ?? 0) > 0,
          href: '/contacts',
        },
        {
          key: 'pipeline',
          label: 'Criar Negócios',
          description: 'Organize suas vendas no Kanban de pipeline',
          done: (dealCount ?? 0) > 0,
          href: '/pipelines',
        },
        {
          key: 'automation',
          label: 'Criar Automação',
          description: 'Automatize respostas e tarefas repetitivas',
          done: (autoCount ?? 0) > 0,
          href: '/automations',
        },
      ])
    })()
  }, [profile?.account_id])

  const loadAll = useCallback(() => {
    const db = createClient()

    // Kick everything off in parallel. Each block has its own
    // setState + finally so a slow query doesn't hold up faster
    // sections — each widget shows its own skeleton independently.
    void loadMetrics(db)
      .then((m) => setMetrics(m))
      .catch((err) => console.error('[dashboard] metrics failed:', err))
      .finally(() => setMetricsLoading(false))

    void loadConversationsSeries(db, 30)
      .then((s) => setSeries((prev) => ({ ...prev, 30: s })))
      .catch((err) => console.error('[dashboard] series failed:', err))
      .finally(() => setSeriesLoading(false))

    void loadPipelineDonut(db)
      .then((p) => setPipeline(p))
      .catch((err) => console.error('[dashboard] pipeline failed:', err))
      .finally(() => setPipelineLoading(false))

    void loadResponseTime(db)
      .then((r) => setResponseTime(r))
      .catch((err) => console.error('[dashboard] response time failed:', err))
      .finally(() => setResponseTimeLoading(false))

    // Fetch up to 50 so the biggest page-size option in the feed
    // (50 rows) is already in memory — switching sizes then becomes
    // a pure client-side slice with no extra round trip.
    void loadActivity(db, 50)
      .then((a) => setActivity(a))
      .catch((err) => console.error('[dashboard] activity failed:', err))
      .finally(() => setActivityLoading(false))
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Range switch handler — kept in an event callback (not an effect)
  // so the setState calls stay out of the react-hooks/set-state-in-effect
  // rule's way. The cached bucket check means switching back to a
  // previously-viewed range is instant and doesn't re-fetch.
  const handleRangeChange = useCallback(
    (r: RangeDays) => {
      setRange(r)
      if (series[r] !== null) return
      setSeriesLoading(true)
      const db = createClient()
      loadConversationsSeries(db, r)
        .then((s) => setSeries((prev) => ({ ...prev, [r]: s })))
        .catch((err) => console.error('[dashboard] series failed:', err))
        .finally(() => setSeriesLoading(false))
    },
    [series],
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">
          Gerencie conversas, contatos e vendas pelo WhatsApp
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Visão geral do seu CRM — acompanhe métricas, negócios e atividades em tempo real.
        </p>
      </div>

      {/* Onboarding */}
      {setupSteps.length > 0 && (
        <OnboardingBanner
          steps={setupSteps}
          userName={profile?.full_name ?? ''}
        />
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricsLoading || !metrics ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              title="Conversas Ativas"
              value={metrics.activeConversations.current.toLocaleString()}
              icon={MessageSquare}
              delta={{
                sign: metrics.activeConversations.previous,
                label: deltaLabel(metrics.activeConversations.previous, 'novas hoje vs ontem'),
              }}
            />
            <MetricCard
              title="Novos Contatos Hoje"
              value={metrics.newContactsToday.current.toLocaleString()}
              icon={UserPlus}
              delta={{
                sign:
                  metrics.newContactsToday.current - metrics.newContactsToday.previous,
                label: deltaLabel(
                  metrics.newContactsToday.current - metrics.newContactsToday.previous,
                  'vs ontem',
                ),
              }}
            />
            <MetricCard
              title="Valor dos Negócios Abertos"
              value={formatCurrency(metrics.openDealsValue)}
              icon={DollarSign}
              subtitle={`${metrics.openDealsCount} negócio${metrics.openDealsCount === 1 ? '' : 's'} aberto${metrics.openDealsCount === 1 ? '' : 's'}`}
            />
            <MetricCard
              title="Mensagens Enviadas Hoje"
              value={metrics.messagesSentToday.current.toLocaleString()}
              icon={Send}
              delta={{
                sign:
                  metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                label: deltaLabel(
                  metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                  'vs ontem',
                ),
              }}
            />
          </>
        )}
      </div>

      {/* Quick actions */}
      <QuickActions />

      {/* Charts row */}
      {/* items-stretch (the grid default) stretches the two columns to
          match the tallest sibling; adding h-full on each wrapper and
          on the inner panels makes both cards actually fill that
          stretched height so their rounded borders line up. Without
          this, the pipeline card rendered at its natural (shorter)
          height while the line chart drove the row height. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="h-full lg:col-span-3">
          <ConversationsChart
            series={series}
            loading={seriesLoading}
            range={range}
            onRangeChange={handleRangeChange}
          />
        </div>
        <div className="h-full lg:col-span-2">
          <PipelineDonut data={pipeline} loading={pipelineLoading} />
        </div>
      </div>

      {/* Response time */}
      <ResponseTimeChart data={responseTime} loading={responseTimeLoading} />

      {/* Activity feed */}
      <ActivityFeed items={activity} loading={activityLoading} />
    </div>
  )
}

// ------------------------------------------------------------

function formatCurrency(v: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

function deltaLabel(delta: number, suffix: string): string {
  if (delta === 0) return `Sem variação ${suffix}`
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toLocaleString()} ${suffix}`
}
