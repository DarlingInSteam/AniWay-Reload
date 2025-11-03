import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, ChevronDown, MoreVertical, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getDisplayChapterNumber } from '@/lib/chapterUtils';
import { apiClient } from '@/lib/api';

import { useNotifications } from './NotificationContext';
import { deleteAll } from './api';
import type { NotificationPayload } from './notificationUtils';
import {
  parsePayload,
  formatTitle,
  formatDescription,
  formatDate,
  getIcon,
  getNavigationTarget,
} from './notificationUtils';
import { authService } from '../services/authService';

interface NotificationItem {
  id: number;
  type: string;
  status: string;
  payload: string | null;
  createdAtEpoch: number;
}

export const NotificationsPage: React.FC = () => {
  const { items: realtimeItems, markRead, markAll, clearAll } = useNotifications();
  const navigate = useNavigate();
  const [pages, setPages] = useState<NotificationItem[][]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [end, setEnd] = useState(false);
  const [viewFilter, setViewFilter] = useState<'all' | 'unread'>('unread');
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey>('all');
  const [sortOrder, setSortOrder] = useState<'new' | 'old'>('new');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Merge real-time items (dedupe by id) at top
  const flat = [...realtimeItems];
  const merged = React.useMemo(() => {
    const seen = new Set<number>();
    const combined: NotificationItem[] = [];
    flat.forEach(n => { if (!seen.has(n.id)) { seen.add(n.id); combined.push(n); } });
    pages.flat().forEach(n => { if (!seen.has(n.id)) { seen.add(n.id); combined.push(n); } });
    return combined.sort((a,b) => b.id - a.id);
  }, [flat, pages]);

  const unreadCount = React.useMemo(() => merged.filter(n => n.status === 'UNREAD').length, [merged]);

  const countsByCategory = React.useMemo(() => {
    const result: Record<CategoryKey, { total: number; unread: number }> = {
      all: { total: merged.length, unread: unreadCount },
      updates: { total: 0, unread: 0 },
      social: { total: 0, unread: 0 },
      important: { total: 0, unread: 0 },
    };
    merged.forEach(item => {
      const key = resolveCategory(item.type);
      if (key !== 'all') {
        result[key].total += 1;
        if (item.status === 'UNREAD') {
          result[key].unread += 1;
        }
      }
    });
    return result;
  }, [merged, unreadCount]);

  const displayed = React.useMemo(() => {
    const filtered = merged.filter(item => {
      if (viewFilter === 'unread' && item.status !== 'UNREAD') return false;
      if (categoryFilter !== 'all') {
        return resolveCategory(item.type) === categoryFilter;
      }
      return true;
    });
    return filtered.sort((a, b) => (sortOrder === 'new' ? b.createdAtEpoch - a.createdAtEpoch : a.createdAtEpoch - b.createdAtEpoch));
  }, [merged, viewFilter, categoryFilter, sortOrder]);

  const loadPage = useCallback(async () => {
    if (loading || end) return;
    setLoading(true);
    try {
      const token = authService.getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      // X-User-Id no longer strictly required when JWT present, keep fallback if gateway bypassed locally
      if ((window as any).currentUserId) headers['X-User-Id'] = String((window as any).currentUserId);
      const res = await fetch(`/api/notifications/page?page=${page}&size=30`, { headers });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const list: NotificationItem[] = data.items || [];
      if (list.length === 0) {
        setEnd(true);
      } else {
        setPages(p => [...p, list]);
        setPage(p => p + 1);
      }
    } catch (e) {
      console.error('Load notifications page failed', e);
    } finally {
      setLoading(false);
    }
  }, [loading, end, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) loadPage(); });
    }, { rootMargin: '400px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadPage]);

  useEffect(() => {
    if (!loading && pages.length === 0 && !end) {
      loadPage();
    }
  }, [loading, pages.length, end, loadPage]);

  useEffect(() => {
    if (viewFilter === 'unread' && unreadCount === 0 && merged.length > 0) {
      setViewFilter('all');
    }
  }, [viewFilter, unreadCount, merged.length]);

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <section className="rounded-[28px] border border-white/10 bg-manga-black/75 p-6">
        <header className="flex flex-col gap-4 text-white md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold">Уведомления</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Button
              type="button"
              size="sm"
              onClick={() => setViewFilter(viewFilter === 'unread' ? 'all' : 'unread')}
              className={cn(
                'h-9 rounded-full border border-white/15 bg-white/10 px-4 text-white hover:bg-white/20',
                viewFilter === 'unread' && 'border-primary/40 bg-primary/10 text-primary'
              )}
            >
              {viewFilter === 'unread' ? 'Все' : 'Новое'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'new' ? 'old' : 'new')}
              className="h-9 rounded-full border border-white/15 bg-white/10 px-4 text-white hover:bg-white/20"
            >
              <span className="mr-1 text-sm font-medium text-white/80">{sortOrder === 'new' ? 'Сначала новые' : 'Сначала старые'}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={unreadCount === 0}
              onClick={() => markAll()}
              className="h-9 rounded-full border border-white/15 bg-white/10 px-4 text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30"
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Прочитать все
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteAll(authService.getToken(), (window as any).currentUserId);
                  await clearAll();
                  setPages([]);
                  setPage(0);
                  setEnd(false);
                } catch (e) {
                  console.error(e);
                }
              }}
              className="h-9 rounded-full px-4"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Очистить
            </Button>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {CATEGORY_DEFINITIONS.map(def => (
            <button
              key={def.key}
              type="button"
              onClick={() => setCategoryFilter(def.key)}
              className={cn(
                'flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                categoryFilter === def.key && 'border-primary/50 bg-primary/15 text-white'
              )}
            >
              <span>{def.label}</span>
              <span className="flex items-center gap-1 rounded-full bg-black/20 px-2 py-0.5 text-xs text-white/60">
                {countsByCategory[def.key]?.total ?? 0}
                {(countsByCategory[def.key]?.unread ?? 0) > 0 && (
                  <span className="text-primary">+{countsByCategory[def.key]?.unread}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-10 space-y-4">
        {displayed.map(n => (
          <NotificationCard
            key={n.id}
            item={n}
            onActivate={target => {
              markRead([n.id]);
              if (target) navigate(target);
            }}
            onMarkRead={() => markRead([n.id])}
          />
        ))}
      </div>

      {displayed.length === 0 && !loading && (
        <div className="mt-10 rounded-[32px] border border-dashed border-white/10 bg-white/5 p-20 text-center text-white/70">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/10 text-4xl">📭</div>
          <h2 className="text-2xl font-semibold text-white">Ничего нового пока нет</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/60">
            {viewFilter === 'unread'
              ? 'Вы просмотрели все свежие уведомления. Мы сообщим, как только произойдет что-то важное.'
              : 'Сейчас уведомлений нет, но как только появятся новые события, вы сразу увидите их здесь.'}
          </p>
        </div>
      )}

      {!end && <div ref={sentinelRef} className="h-10" />}
      {loading && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-[28px] border border-white/5 bg-white/5 skeleton-shimmer" />
          ))}
        </div>
      )}
      {end && displayed.length > 0 && (
        <div className="py-8 text-center text-xs uppercase tracking-[0.24em] text-white/40">Больше уведомлений нет</div>
      )}
    </div>
  );
};

const NotificationCard: React.FC<{
  item: NotificationItem;
  onActivate: (target: string | null) => void;
  onMarkRead: () => void;
}> = ({ item, onActivate, onMarkRead }) => {
  const parsed = parsePayload(item.payload);
  const title = formatTitle(item.type, parsed);
  const desc = formatDescription(item.type, parsed);
  const icon = getIcon(item.type);
  const target = getNavigationTarget(item.type, parsed);
  const isUnread = item.status === 'UNREAD';
  const initialCover = resolveCoverImage(parsed);
  const mangaIdHint =
    pickFirstNumber(parsed, ['mangaId', 'manga_id', 'seriesId', 'series_id']) ??
    pickFirstNumber((parsed as any)?.manga, ['id']) ??
    pickFirstNumber((parsed as any)?.series, ['id']);
  const chapterIdHint =
    pickFirstNumber(parsed, ['chapterId', 'chapter_id', 'chapterPointId']) ??
    pickFirstNumber((parsed as any)?.chapter, ['id']);
  const coverImage = useNotificationCover(item.type, initialCover, mangaIdHint, chapterIdHint);
  const categoryLabel = CATEGORY_DEFINITIONS.find(def => def.key === resolveCategory(item.type))?.label ?? 'Уведомление';
  const isMangaUpdate = item.type === 'BOOKMARK_NEW_CHAPTER';
  const mangaTitle = parsed?.mangaTitle || parsed?.title || parsed?.seriesTitle || null;
  const rawChapterNumber = pickFirstNumber(parsed, ['chapterNumber', 'chapter', 'chapterCode']);
  const displayChapterNumber = rawChapterNumber != null ? getDisplayChapterNumber(rawChapterNumber) : null;
  const volumeNumber =
    pickFirstNumber(parsed, ['volumeNumber', 'volume', 'volumeCode']) ??
    pickFirstNumber((parsed as any)?.chapter, ['volumeNumber']) ??
    (rawChapterNumber && rawChapterNumber >= 10000 ? Math.floor(rawChapterNumber / 10000) : null);
  const chapterName =
    parsed?.chapterName || parsed?.chapterTitle || (parsed as any)?.chapter?.title || parsed?.titleSecondary || null;
  const chapterLabelRaw = typeof parsed?.chapterLabel === 'string' ? parsed.chapterLabel.trim() : null;
  const fallbackChapterLabelRaw = [
    volumeNumber ? `Том ${volumeNumber}` : null,
    displayChapterNumber != null ? `Глава ${displayChapterNumber}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const fallbackChapterLabel = fallbackChapterLabelRaw.length > 0 ? fallbackChapterLabelRaw : null;
  const chapterLabel = chapterLabelRaw && chapterLabelRaw.length > 0 ? chapterLabelRaw : fallbackChapterLabel;
  const seriesInfo = isMangaUpdate
    ? [chapterLabel, chapterName].filter(Boolean).join(' · ')
    : '';
  const cardTitle = isMangaUpdate && mangaTitle ? mangaTitle : title;
  const shouldShowDescription = desc && (!isMangaUpdate || desc !== mangaTitle);

  return (
    <article className={cn('group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white transition hover:border-white/20 hover:bg-white/[0.08]', isUnread && 'border-primary/40 bg-primary/10/80 shadow-lg shadow-primary/15')}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <button
          type="button"
          onClick={() => onActivate(target)}
          className="relative flex h-16 w-full max-w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 text-2xl transition hover:border-primary/40 md:h-20"
        >
          {coverImage ? (
            <img src={coverImage} alt="cover" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="text-2xl">{icon}</span>
          )}
          {isUnread && <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-primary shadow-lg shadow-primary/30" />}
        </button>

        <div className="flex-1 space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
            <button
              type="button"
              onClick={() => onActivate(target)}
              className="min-w-0 flex-1 text-left focus-visible:outline-none"
            >
              <h3 className="text-base font-semibold leading-tight text-white md:text-lg">{cardTitle}</h3>
              {isMangaUpdate && seriesInfo && (
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-primary/70">{seriesInfo}</div>
              )}
              {shouldShowDescription && <p className="mt-2 text-sm text-white/65 line-clamp-2 md:line-clamp-3">{desc}</p>}
            </button>
            <div className="flex flex-col items-start gap-1 text-[10px] uppercase tracking-[0.2em] text-white/40 md:items-end">
              <span>Опубликовано</span>
              <span className="text-white/70">{formatDate(item.createdAtEpoch)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-1">
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full border-white/15 bg-white/10 px-2 text-[10px] uppercase tracking-[0.18em] text-white/70',
                  isUnread && 'border-primary/60 bg-primary/15 text-primary'
                )}
              >
                {isUnread ? 'Новое' : 'Прочитано'}
              </Badge>
              <Badge variant="outline" className="rounded-full border-white/10 bg-white/10 px-2 text-[10px] uppercase tracking-[0.18em] text-white/60">
                {categoryLabel}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              {isUnread && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onMarkRead}
                  className="h-8 rounded-full border border-primary/40 bg-primary/15 px-3 text-xs font-medium text-primary hover:bg-primary/25"
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Прочитано
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onActivate(target)}
                className="h-8 w-8 rounded-full border border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10"
                title="Открыть уведомление"
                aria-label="Открыть уведомление"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

const useNotificationCover = (
  type: string,
  initialCover: string | null,
  mangaIdHint: number | null,
  chapterIdHint: number | null
) => {
  const [cover, setCover] = React.useState<string | null>(initialCover);

  React.useEffect(() => {
    setCover(initialCover);
    if (type === 'BOOKMARK_NEW_CHAPTER' && initialCover && mangaIdHint) {
      mangaCoverCache.set(mangaIdHint, initialCover);
    }
  }, [initialCover, mangaIdHint, type]);

  React.useEffect(() => {
    if (type !== 'BOOKMARK_NEW_CHAPTER') return;
    if (initialCover) return;

    let active = true;

    const ensureCover = async () => {
      let mangaId = mangaIdHint;
      if (!mangaId && chapterIdHint) {
        mangaId = await resolveMangaIdFromChapter(chapterIdHint);
      }
      if (!mangaId) return;

      if (mangaCoverCache.has(mangaId)) {
        const cached = mangaCoverCache.get(mangaId)!;
        if (cached && active) setCover(cached);
        return;
      }

      const fetched = await fetchMangaCover(mangaId);
      if (fetched && active) {
        setCover(fetched);
      }
    };

    ensureCover().catch(err => console.error('Не удалось загрузить обложку уведомления', err));

    return () => {
      active = false;
    };
  }, [type, initialCover, mangaIdHint, chapterIdHint]);

  return cover;
};

const resolveCoverImage = (payload: NotificationPayload): string | null => {
  if (!payload) return null;
  const candidates = [
    payload.coverImageUrl,
    payload.coverImage,
    payload.coverUrl,
    payload.cover,
    payload.thumbnailUrl,
    payload.thumbnail,
    payload.imageUrl,
    payload.image,
    payload.posterUrl,
    payload.poster,
    payload.bannerUrl,
  ];
  const found = candidates.find((url): url is string => typeof url === 'string' && url.trim().length > 0);
  return found || null;
};

const pickFirstNumber = (payload: NotificationPayload, fields: string[]): number | null => {
  if (!payload) return null;
  for (const field of fields) {
    const value = payload[field];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return null;
};

const mangaCoverCache = new Map<number, string>();
const mangaCoverPromises = new Map<number, Promise<string | null>>();
const chapterMangaCache = new Map<number, number>();
const chapterMangaPromises = new Map<number, Promise<number | null>>();

const fetchMangaCover = async (mangaId: number): Promise<string | null> => {
  if (mangaCoverCache.has(mangaId)) {
    return mangaCoverCache.get(mangaId) ?? null;
  }
  if (mangaCoverPromises.has(mangaId)) {
    return mangaCoverPromises.get(mangaId)!;
  }
  const promise = (async () => {
    try {
      const manga = await apiClient.getMangaById(mangaId);
      const cover = manga?.coverImageUrl || null;
      if (cover) mangaCoverCache.set(mangaId, cover);
      return cover;
    } catch (error) {
      console.error(`Не удалось получить мангу ${mangaId} для уведомления`, error);
      return null;
    } finally {
      mangaCoverPromises.delete(mangaId);
    }
  })();
  mangaCoverPromises.set(mangaId, promise);
  return promise;
};

const resolveMangaIdFromChapter = async (chapterId: number): Promise<number | null> => {
  if (chapterMangaCache.has(chapterId)) {
    return chapterMangaCache.get(chapterId)!;
  }
  if (chapterMangaPromises.has(chapterId)) {
    return chapterMangaPromises.get(chapterId)!;
  }
  const promise = (async () => {
    try {
      const chapter = await apiClient.getChapterById(chapterId);
      if (chapter?.mangaId) {
        chapterMangaCache.set(chapterId, chapter.mangaId);
        return chapter.mangaId;
      }
    } catch (error) {
      console.error(`Не удалось получить главу ${chapterId} для уведомления`, error);
    } finally {
      chapterMangaPromises.delete(chapterId);
    }
    return null;
  })();
  chapterMangaPromises.set(chapterId, promise);
  return promise;
};

type CategoryKey = 'all' | 'updates' | 'social' | 'important';

const CATEGORY_DEFINITIONS: Array<{ key: CategoryKey; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'updates', label: 'Обновления' },
  { key: 'social', label: 'Социальные' },
  { key: 'important', label: 'Важное' },
];

const resolveCategory = (type: string): CategoryKey => {
  const normalized = type.toLowerCase();
  if (normalized.includes('comment') || normalized.includes('friend') || normalized.includes('message')) {
    return 'social';
  }
  if (normalized.includes('ban') || normalized.includes('admin') || normalized.includes('system') || normalized.includes('security')) {
    return 'important';
  }
  if (normalized.includes('chapter') || normalized.includes('manga') || normalized.includes('series') || normalized.includes('update') || normalized.includes('release')) {
    return 'updates';
  }
  return 'updates';
};
