import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { telegramService, TelegramLinkResponse, TelegramLinkStatus } from '@/services/telegramService';
import { useAuth } from '@/contexts/AuthContext';

interface LoadStatusOptions {
  showFullLoader?: boolean;
}

const formatDateTime = (value?: string | null): string => {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  } catch {
    return value;
  }
};

export const TelegramSection: React.FC = () => {
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<TelegramLinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [linkInfo, setLinkInfo] = useState<TelegramLinkResponse | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (linkInfo) {
      timer = setInterval(() => setNow(Date.now()), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [linkInfo]);

  const loadStatus = useCallback(async ({ showFullLoader = false }: LoadStatusOptions = {}) => {
    if (showFullLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const data = await telegramService.getStatus();
      setStatus(data);
      if (data.connected) {
        setLinkInfo(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось получить статус Telegram';
      setStatus(null);
      setError(message);
    } finally {
      if (showFullLoader) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadStatus({ showFullLoader: true });
  }, [loadStatus]);

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleCreateLink = async () => {
    setLinkLoading(true);
    resetMessages();
    try {
      const response = await telegramService.createLink();
      setLinkInfo(response);
      setSuccess('Ссылка создана. Откройте Telegram и нажмите «Запустить» для привязки.');
      await loadStatus();
      await refreshUser(true).catch(() => undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось создать ссылку';
      setError(message);
    } finally {
      setLinkLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!status) return;
    setToggleLoading(true);
    resetMessages();
    try {
      const updated = await telegramService.setNotifications(!status.notificationsEnabled);
      setStatus(updated);
      setSuccess(updated.notificationsEnabled ? 'Уведомления включены.' : 'Уведомления отключены.');
      await refreshUser(true).catch(() => undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось изменить настройки уведомлений';
      setError(message);
    } finally {
      setToggleLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!status?.connected) return;
    setUnlinkLoading(true);
    resetMessages();
    try {
      await telegramService.unlink();
      setSuccess('Telegram отвязан.');
      setLinkInfo(null);
      await loadStatus();
      await refreshUser(true).catch(() => undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось отвязать Telegram';
      setError(message);
    } finally {
      setUnlinkLoading(false);
    }
  };

  const handleRefresh = () => {
    resetMessages();
    loadStatus();
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess(`${label} скопирована в буфер обмена.`);
    } catch {
      setError('Не удалось скопировать. Скопируйте вручную.');
    }
  };

  const expiresDescription = useMemo(() => {
    if (!linkInfo) return null;
    try {
      const expiresDate = new Date(linkInfo.expiresAt);
      if (Number.isNaN(expiresDate.getTime())) {
        return `Истекает: ${linkInfo.expiresAt}`;
      }
      const diffMs = expiresDate.getTime() - now;
      if (diffMs <= 0) {
        return 'Срок действия ссылки истёк — создайте новую.';
      }
      const totalSeconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `Истекает ${expiresDate.toLocaleTimeString()} (через ${minutes} мин ${seconds.toString().padStart(2, '0')} с)`;
    } catch {
      return null;
    }
  }, [linkInfo, now]);

  const botUsername = useMemo(() => {
    const fromStatus = status?.botUsername;
    if (fromStatus && fromStatus.trim().length > 0) return fromStatus.startsWith('@') ? fromStatus : `@${fromStatus}`;
    const fromLink = linkInfo?.botUsername;
    if (fromLink && fromLink.trim().length > 0) return fromLink.startsWith('@') ? fromLink : `@${fromLink}`;
    return null;
  }, [status, linkInfo]);

  const connected = status?.connected ?? false;
  const notificationsEnabled = connected && (status?.notificationsEnabled ?? false);

  return (
    <section className="bg-card/40 border border-border/40 rounded-lg p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Telegram уведомления</h2>
          <p className="text-sm text-muted-foreground">
            Получайте предупреждения о новых главах прямо в Telegram.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="px-3 py-2 rounded border border-border/40 bg-background/40 hover:bg-background/60 disabled:opacity-40 text-sm"
        >
          Обновить статус
        </button>
      </div>

      {loading ? (
        <div className="mt-6 text-sm text-muted-foreground">Загрузка статуса…</div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 rounded-lg bg-background/40 border border-border/20">
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Состояние</div>
              <div className={`mt-1 text-sm font-medium ${connected ? 'text-green-400' : 'text-red-400'}`}>
                {connected ? 'Привязан' : 'Не привязан'}
              </div>
              {connected && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Привязан: {formatDateTime(status?.linkedAt)}
                </div>
              )}
            </div>
            <div className="p-4 rounded-lg bg-background/40 border border-border/20">
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Уведомления</div>
              <div className={`mt-1 text-sm font-medium ${notificationsEnabled ? 'text-green-400' : 'text-yellow-400'}`}>
                {notificationsEnabled ? 'Включены' : connected ? 'Отключены' : 'Недоступны'}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {connected ? 'Управляйте, чтобы получать новые главы.' : 'Сначала привяжите Telegram.'}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-background/40 border border-border/20">
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Бот</div>
              <div className="mt-1 text-sm font-medium text-white">
                {botUsername || 'Имя бота уточняется'}
              </div>
              {botUsername && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Откройте {botUsername} в Telegram и отправьте старт.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <button
              onClick={handleCreateLink}
              disabled={linkLoading}
              className="px-4 py-2 rounded bg-primary hover:bg-primary/80 disabled:opacity-40 text-sm font-medium"
            >
              {connected ? 'Создать новую ссылку' : 'Привязать Telegram'}
            </button>
            <button
              onClick={handleToggleNotifications}
              disabled={!connected || toggleLoading}
              className="px-4 py-2 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-40 text-sm font-medium"
            >
              {notificationsEnabled ? 'Отключить уведомления' : 'Включить уведомления'}
            </button>
            <button
              onClick={handleUnlink}
              disabled={!connected || unlinkLoading}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 disabled:opacity-40 text-sm font-medium"
            >
              Отключить Telegram
            </button>
          </div>

          {linkInfo && (
            <div className="rounded-lg border border-dashed border-primary/60 bg-primary/5 p-4 space-y-3">
              <div className="text-sm font-semibold text-primary">Ссылка для привязки</div>
              <div className="text-xs text-muted-foreground">
                Откройте ссылку ниже в Telegram. Если не получается через браузер, скопируйте и вставьте её вручную в поиск Telegram.
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <code className="flex-1 text-xs break-all bg-background/60 border border-border/20 rounded px-3 py-2">
                  {linkInfo.deepLinkUrl}
                </code>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(linkInfo.deepLinkUrl, 'Ссылка')}
                    className="px-3 py-2 rounded border border-primary/40 text-primary hover:bg-primary/20 text-xs"
                  >
                    Скопировать ссылку
                  </button>
                  <button
                    onClick={() => window.open(linkInfo.deepLinkUrl, '_blank', 'noopener')}
                    className="px-3 py-2 rounded bg-primary hover:bg-primary/80 text-white text-xs"
                  >
                    Открыть в Telegram
                  </button>
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <code className="flex-1 text-xs break-all bg-background/60 border border-border/20 rounded px-3 py-2">
                  {linkInfo.token}
                </code>
                <button
                  onClick={() => handleCopy(linkInfo.token, 'Токен')}
                  className="px-3 py-2 rounded border border-primary/40 text-primary hover:bg-primary/20 text-xs"
                >
                  Скопировать токен
                </button>
              </div>
              {expiresDescription && (
                <div className="text-xs text-muted-foreground">{expiresDescription}</div>
              )}
            </div>
          )}
        </div>
      )}

      {(error || success) && (
        <div className="mt-6 space-y-2">
          {error && <div className="text-sm text-red-400">{error}</div>}
          {success && <div className="text-sm text-green-400">{success}</div>}
        </div>
      )}
    </section>
  );
};

export default TelegramSection;
