'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  RefreshCw,
  QrCode,
  Smartphone,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { WhatsAppConfig as WhatsAppConfigType } from '@/types';

type ConnectionStatus = 'connected' | 'disconnected' | 'loading' | 'unknown';

export function WhatsAppConfig() {
  const supabase = createClient();
  const { user, accountId, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfigType | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');

  // Form fields
  const [sessionId, setSessionId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [openwaBaseUrl, setOpenwaBaseUrl] = useState('http://localhost:2785/api');

  // Session info
  const [sessionPhone, setSessionPhone] = useState<string | null>(null);
  const [sessionPushName, setSessionPushName] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/whatsapp/webhook`
      : '';

  const fetchConfig = useCallback(async (acctId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('account_id', acctId)
        .maybeSingle();

      if (error) console.error('Erro ao carregar config:', error);

      if (data) {
        setConfig(data);
        setSessionId(data.session_id || '');
        setApiKey(data.api_key || '');
        setOpenwaBaseUrl(data.openwa_base_url || 'http://localhost:2785/api');
        setSessionPhone(data.phone || null);
        setSessionPushName(data.push_name || null);

        // Check session status
        await checkSessionStatus(
          data.openwa_base_url || 'http://localhost:2785/api',
          data.api_key || '',
          data.session_id || '',
        );
      } else {
        setConfig(null);
        setConnectionStatus('disconnected');
      }
    } catch (err) {
      console.error('fetchConfig error:', err);
      toast.error('Erro ao carregar configuração do WhatsApp');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  async function checkSessionStatus(baseUrl: string, key: string, sid: string) {
    if (!sid || !key) {
      setConnectionStatus('disconnected');
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(`${baseUrl}/sessions/${sid}`, {
        headers: { 'X-Api-Key': key },
      });
      if (!res.ok) {
        setConnectionStatus('disconnected');
        return;
      }
      const data = await res.json();
      if (data.status === 'connected' || data.status === 'ready') {
        setConnectionStatus('connected');
        setSessionPhone(data.phone || null);
        setSessionPushName(data.pushName || null);
      } else {
        setConnectionStatus('disconnected');
      }
    } catch {
      setConnectionStatus('disconnected');
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || !accountId) {
      setLoading(false);
      return;
    }
    fetchConfig(accountId);
  }, [authLoading, profileLoading, user, accountId, fetchConfig]);

  async function handleSave() {
    if (!sessionId.trim()) {
      toast.error('Session ID é obrigatório');
      return;
    }
    if (!apiKey.trim()) {
      toast.error('API Key é obrigatória');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        session_id: sessionId.trim(),
        api_key: apiKey.trim(),
        openwa_base_url: openwaBaseUrl.trim() || 'http://localhost:2785/api',
        account_id: accountId,
        user_id: user!.id,
        status: 'disconnected' as const,
      };

      if (config) {
        const { error } = await supabase
          .from('whatsapp_config')
          .update(payload)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('whatsapp_config')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Configuração salva!');
      if (accountId) await fetchConfig(accountId);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    await checkSessionStatus(openwaBaseUrl, apiKey, sessionId);
    if (connectionStatus === 'connected') {
      // Update status in DB
      if (config) {
        await supabase
          .from('whatsapp_config')
          .update({
            status: 'connected',
            connected_at: new Date().toISOString(),
            phone: sessionPhone,
            push_name: sessionPushName,
          })
          .eq('id', config.id);
      }
      toast.success('WhatsApp conectado!');
    } else {
      toast.error('Sessão não conectada. Escaneie o QR code para conectar.');
    }
  }

  async function handleLoadQR() {
    if (!sessionId || !apiKey) {
      toast.error('Salve a configuração primeiro');
      return;
    }
    setLoadingQr(true);
    setQrCode(null);
    try {
      const res = await fetch(`${openwaBaseUrl}/sessions/${sessionId}/qr`, {
        headers: { 'X-Api-Key': apiKey },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || 'Erro ao obter QR code');
        return;
      }
      const data = await res.json();
      if (data.qrCode) {
        setQrCode(data.qrCode);
      } else if (data.status === 'connected') {
        toast.success('Sessão já está conectada!');
        setConnectionStatus('connected');
      } else {
        toast.error('QR code não disponível. Verifique se a sessão foi iniciada.');
      }
    } catch (err) {
      toast.error('Erro ao conectar com o servidor. Verifique se está rodando.');
    } finally {
      setLoadingQr(false);
    }
  }

  async function handleDisconnect() {
    if (!config) return;
    try {
      // Stop session
      await fetch(`${openwaBaseUrl}/sessions/${sessionId}/stop`, {
        method: 'POST',
        headers: { 'X-Api-Key': apiKey },
      });

      await supabase
        .from('whatsapp_config')
        .update({ status: 'disconnected', phone: null, push_name: null })
        .eq('id', config.id);

      setConnectionStatus('disconnected');
      setSessionPhone(null);
      setSessionPushName(null);
      setQrCode(null);
      toast.success('Sessão desconectada');
    } catch {
      toast.error('Erro ao desconectar');
    }
  }

  if (loading || authLoading || profileLoading) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando configuração…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {connectionStatus === 'connected' ? (
        <Alert className="border-green-500/20 bg-green-500/10">
          <CheckCircle2 className="h-5 w-5 text-green-400" />
          <AlertTitle className="text-green-400 font-semibold">Conectado</AlertTitle>
          <AlertDescription className="text-green-300/80">
            {sessionPushName && <span className="font-medium">{sessionPushName}</span>}
            {sessionPhone && <span> — {sessionPhone}</span>}
            {!sessionPushName && !sessionPhone && 'Sessão WhatsApp ativa'}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-red-500/20 bg-red-500/10">
          <XCircle className="h-5 w-5 text-red-400" />
          <AlertTitle className="text-red-400 font-semibold">Desconectado</AlertTitle>
          <AlertDescription className="text-red-300/80">
            Configure as credenciais abaixo para conectar seu WhatsApp.
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Settings */}
      <Card className="border-slate-700 bg-slate-800/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Zap className="h-5 w-5 text-green-400" />
            Conexão WhatsApp
          </CardTitle>
          <CardDescription className="text-slate-400">
            Configure a conexão com o seu WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openwa-base-url" className="text-slate-300">URL Base da API</Label>
            <Input
              id="openwa-base-url"
              value={openwaBaseUrl}
              onChange={(e) => setOpenwaBaseUrl(e.target.value)}
              placeholder="http://localhost:2785/api"
              className="border-slate-700 bg-slate-900/60 text-white placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-500">URL da API (padrão: http://localhost:2785/api)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-id" className="text-slate-300">Session ID</Label>
            <Input
              id="session-id"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="UUID da sessão"
              className="border-slate-700 bg-slate-900/60 text-white placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-500">
              Encontre no painel de controle da API ou crie uma nova sessão.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key" className="text-slate-300">API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Chave de API da sessão"
              className="border-slate-700 bg-slate-900/60 text-white placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-500">
              Chave encontrada no arquivo <code className="text-slate-400">.api-key</code> do servidor
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                'Salvar Configuração'
              )}
            </Button>

            {config && (
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={checking}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                {checking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando…
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Testar Conexão
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Code / Connect */}
      {config && connectionStatus !== 'connected' && (
        <Card className="border-slate-700 bg-slate-800/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <QrCode className="h-5 w-5 text-primary" />
              Conectar WhatsApp
            </CardTitle>
            <CardDescription className="text-slate-400">
              Escaneie o QR code com o seu WhatsApp para vincular a sessão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleLoadQR}
              disabled={loadingQr}
              className="bg-green-600 hover:bg-green-700"
            >
              {loadingQr ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando QR…
                </>
              ) : (
                <>
                  <Smartphone className="mr-2 h-4 w-4" />
                  Exibir QR Code
                </>
              )}
            </Button>

            {qrCode && (
              <div className="flex flex-col items-center gap-4 rounded-lg border border-slate-600 bg-white p-6">
                <img src={qrCode} alt="QR Code WhatsApp" className="h-64 w-64" />
                <p className="text-sm text-slate-700 text-center max-w-sm">
                  Abra o WhatsApp → Configurações → Aparelhos conectados → Conectar um aparelho
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Connected Session Info */}
      {config && connectionStatus === 'connected' && (
        <Card className="border-slate-700 bg-slate-800/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Smartphone className="h-5 w-5 text-green-400" />
              Sessão Ativa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {sessionPushName && (
                <div>
                  <span className="text-slate-400">Nome:</span>
                  <span className="ml-2 text-white font-medium">{sessionPushName}</span>
                </div>
              )}
              {sessionPhone && (
                <div>
                  <span className="text-slate-400">Telefone:</span>
                  <span className="ml-2 text-white font-medium">{sessionPhone}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-700">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
              >
                Desconectar Sessão
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook Info */}
      <Card className="border-slate-700 bg-slate-800/60">
        <CardHeader>
          <CardTitle className="text-white text-sm">Configuração do Webhook</CardTitle>
          <CardDescription className="text-slate-400">
            Configure este URL no servidor para receber mensagens no FatorZap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-600 bg-slate-900/60 px-4 py-3">
            <code className="text-sm text-green-400 break-all">{webhookUrl}</code>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Vá em Configurações da Sessão → Webhook URL e cole este endereço.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
