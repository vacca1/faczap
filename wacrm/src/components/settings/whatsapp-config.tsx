'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Smartphone,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Phase = 'loading' | 'disconnected' | 'connecting' | 'connected';

interface SessionState {
  configured: boolean;
  connected: boolean;
  status?: string;
  phone?: string | null;
  pushName?: string | null;
}

export function WhatsAppConfig() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [pushName, setPushName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const applyState = useCallback((s: SessionState) => {
    if (s.connected) {
      setPhase('connected');
      setPhone(s.phone ?? null);
      setPushName(s.pushName ?? null);
      setQrCode(null);
      return true;
    }
    return false;
  }, []);

  const refreshStatus = useCallback(async (): Promise<SessionState | null> => {
    try {
      const res = await fetch('/api/whatsapp/session');
      if (!res.ok) return null;
      return (await res.json()) as SessionState;
    } catch {
      return null;
    }
  }, []);

  // Initial load.
  useEffect(() => {
    (async () => {
      const s = await refreshStatus();
      if (s && applyState(s)) return;
      setPhase('disconnected');
    })();
    return () => stopPolling();
  }, [refreshStatus, applyState, stopPolling]);

  // Poll QR + status while connecting.
  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      // status first — flips to connected as soon as the phone scans
      const s = await refreshStatus();
      if (s && applyState(s)) {
        stopPolling();
        toast.success('WhatsApp conectado!');
        return;
      }
      // refresh QR
      try {
        const res = await fetch('/api/whatsapp/session/qr');
        const data = await res.json();
        if (data.connected) {
          stopPolling();
          const st = await refreshStatus();
          if (st) applyState(st);
          else setPhase('connected');
          toast.success('WhatsApp conectado!');
        } else if (data.qrCode) {
          setQrCode(data.qrCode);
        }
      } catch {
        /* keep polling */
      }
    }, 2500);
  }, [refreshStatus, applyState, stopPolling]);

  async function handleConnect() {
    setBusy(true);
    setQrCode(null);
    setPhase('connecting');
    try {
      const res = await fetch('/api/whatsapp/session', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Falha ao iniciar conexão');
        setPhase('disconnected');
        return;
      }
      // fetch first QR immediately, then poll
      try {
        const qrRes = await fetch('/api/whatsapp/session/qr');
        const qr = await qrRes.json();
        if (qr.connected) {
          setPhase('connected');
          const st = await refreshStatus();
          if (st) applyState(st);
          return;
        }
        if (qr.qrCode) setQrCode(qr.qrCode);
      } catch {
        /* polling will retry */
      }
      startPolling();
    } catch {
      toast.error('Erro ao conectar com o servidor.');
      setPhase('disconnected');
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    stopPolling();
    try {
      await fetch('/api/whatsapp/session', { method: 'DELETE' });
      setPhase('disconnected');
      setPhone(null);
      setPushName(null);
      setQrCode(null);
      toast.success('WhatsApp desconectado');
    } catch {
      toast.error('Erro ao desconectar');
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {phase === 'connected' ? (
        <Alert className="border-green-500/20 bg-green-500/10">
          <CheckCircle2 className="h-5 w-5 text-green-400" />
          <AlertTitle className="font-semibold text-green-400">Conectado</AlertTitle>
          <AlertDescription className="text-green-300/80">
            {pushName && <span className="font-medium">{pushName}</span>}
            {phone && <span> — {phone}</span>}
            {!pushName && !phone && 'Sessão WhatsApp ativa'}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-red-500/20 bg-red-500/10">
          <XCircle className="h-5 w-5 text-red-400" />
          <AlertTitle className="font-semibold text-red-400">Desconectado</AlertTitle>
          <AlertDescription className="text-red-300/80">
            Clique em conectar e escaneie o QR Code com o seu WhatsApp.
          </AlertDescription>
        </Alert>
      )}

      {/* Connected: session card */}
      {phase === 'connected' ? (
        <Card className="border-slate-700 bg-slate-800/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Smartphone className="h-5 w-5 text-green-400" />
              Sessão Ativa
            </CardTitle>
            <CardDescription className="text-slate-400">
              Seu WhatsApp está conectado ao FatorZap.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {pushName && (
                <div>
                  <span className="text-slate-400">Nome:</span>
                  <span className="ml-2 font-medium text-white">{pushName}</span>
                </div>
              )}
              {phone && (
                <div>
                  <span className="text-slate-400">Telefone:</span>
                  <span className="ml-2 font-medium text-white">{phone}</span>
                </div>
              )}
            </div>
            <div className="border-t border-slate-700 pt-3">
              <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Desconectar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Disconnected / connecting: connect card */
        <Card className="border-slate-700 bg-slate-800/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <QrCode className="h-5 w-5 text-primary" />
              Conectar WhatsApp
            </CardTitle>
            <CardDescription className="text-slate-400">
              Conecte seu número em segundos — sem configuração técnica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!qrCode && (
              <Button
                onClick={handleConnect}
                disabled={busy || phase === 'connecting'}
                className="bg-green-600 hover:bg-green-700"
              >
                {phase === 'connecting' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando QR Code…
                  </>
                ) : (
                  <>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>
            )}

            {qrCode && (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-2xl border border-slate-600 bg-white p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="QR Code WhatsApp" className="h-64 w-64" />
                </div>
                <ol className="max-w-sm space-y-1 text-center text-sm text-slate-400">
                  <li>1. Abra o WhatsApp no seu celular</li>
                  <li>2. Toque em <span className="text-slate-200">Configurações → Aparelhos conectados</span></li>
                  <li>3. Toque em <span className="text-slate-200">Conectar um aparelho</span> e escaneie</li>
                </ol>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Aguardando leitura… o QR atualiza sozinho.
                </div>
                <Button variant="outline" size="sm" onClick={handleConnect} disabled={busy}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Gerar novo QR
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
