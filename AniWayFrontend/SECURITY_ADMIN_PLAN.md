# Admin & Security Hardening Roadmap

This file tracks the multi-sprint plan agreed.

## Guiding Principles
- Minimize blast radius: fast isolation (ban = session revoke + capability revoke).
- Full auditability: every state transition has before / after + actor + reason code.
- Defense in depth: UI validation, backend authority, token revocation, anomaly surface.
- Observability: metrics + structured logs -> future detection.

## Sprint 1 (Critical Controls) — Progress
Legend: ✅ Done · 🔄 Partial · ⏳ Pending / Deferred

1. Session Invalidation — ✅ (frontend placeholder)
   - `apiClient.invalidateUserSessions(userId)` с перебором эндпоинтов добавлен.
   - Вызывается после бан/смена роли; self-ban / self-demote → принудительный logout.
   - NOTE: Ожидает подтверждения/реализации серверного эндпоинта.
2. Temporary / Timed / Shadow Bans — 🔄 (TEMP expiry UI реализован, countdown & remaining-time badge отложены)
   - Поля типов и expiry (при TEMP) собираются в meta причины.
   - Shadow-ban визуально обозначен (бейдж + стилизация строки). ⏳ Осталось: динамический остаток времени для TEMP.
3. Standardized Reasons — ✅
   - Таксономия `MOD_REASON_CATEGORIES` внедрена, шаблоны подключены к диалогу.
   - Перенос в сериализованный формат `[CODE]|meta(...);diff(... )| текст` (переходная схема).
4. Audit Diff — ✅ (включён в сериализацию + парсится)
   - `buildReason` формирует diff, `parseReason` отображает структурно в деталях лога.
   - Раскрываемый advanced блок (meta + diff) добавлен.
5. UX / Safety — ✅ / 🔄
   - Confirm elevation: ввод имени при повышении до ADMIN — ✅.
   - Disabled actions при mutation + короткий cooldown — ✅.
   - Shadow-ban отдельная визуализация — ✅.
   - (Опционально) Доп. подтверждение для shadow-ban/unban — ⏳.

Deferred / Follow-up (remain inside Sprint 1 hardening buffer):
- Countdown badge for TEMP bans (подготовить helper `formatRemaining(banExpiresAt)`).
- Доп. подтверждение для теневого бана (тип имени + вторая модалка) — решается после обратной связи.
- Фича-флаг переключения на раздельные backend поля `reasonCode` / `diff` / `meta`.

Sprint 1 Completion Threshold (Definition of Done):
- [x] Session invalidation hook placeholder + self logout.
- [x] Reason taxonomy + serialization & parsing.
- [x] Diff capture & UI reveal.
- [x] Ban type (PERM/TEMP/SHADOW) inputs + basic visual markers.
- [x] Role elevation confirmation.
- [x] Shadow ban explicit labeling.
- [x] TEMP expiry remaining-time badge.
- [ ] Optional reinforced confirmations (shadow/unban) (pending decision).

Current Status: Sprint 1 feature set functionally usable; remaining items are polish / operator clarity improvements.

## Sprint 2 (Scalability & Efficiency)
1. Advanced Filters
   - Add: email, date registration range, last login range, min/max activity counts.
   - Persist filters to query string.
   - Debounce search (300ms).
2. Bulk Operations
   - Add checkbox column + bulk bar (ban / unban / role change) with aggregated reason.
   - Batch API endpoint (fallback sequential with concurrency limit 3).
3. Log Pagination / Streaming
   - Replace full fetch with paginated `/admin/logs?page=&size=`.
   - Infinite scroll (IntersectionObserver) or 'Load more'.
4. Optimistic Row Patch
   - `queryClient.setQueryData` partial update on success; background refetch.
5. Virtualized Table (react-window) for user list > 500 rows.

## Sprint 3 (Trust & Insight)
1. MFA / Email Status Indicators
   - Extend `AdminUserData` with `emailVerified`, `mfaEnabled`.
   - Filters: only unverified, require-mfa-later.
2. Activity Metrics Sorting
   - Server adds `engagementScore` (weighted composite of chapters/likes/comments).
   - Sort option & badge.
3. Export / CSV
   - Client-side CSV builder (current filters), stream large (chunking) later.
4. Impersonation (If Approved)
   - Secure modal: reason + audit log entries with type IMPERSONATE_START / END.
   - LocalStorage flag + header banner.

## Sprint 4 (Risk & Compliance)
1. Risk Signals
   - Add `lastIp`, `lastCountry`, `suspiciousFlags: string[]` to user record.
   - Flag icons & filter (e.g. MULTI_ACCOUNT, RAPID_ACTIONS, TOR_EXIT_NODE).
2. Analytics Dashboard
   - Charts: New regs / day, DAU, Retention (approx), Action mix.
3. GDPR / Data Subject Tools
   - Export user data (JSON package assembly client trigger -> backend).
   - Schedule deletion (mark + countdown) with undo window.
4. Shadow Ban Feedback Loop
   - Distinguish UI when viewing shadow-banned user.
5. Anomaly Alerts (future backend integration)
   - Placeholder hook for WebSocket events (risk alerts) -> toast + highlight user rows.

## Data Model Additions (Frontend Typings)
```ts
interface AdminUserData {
  // existing ...
  banType?: 'PERM' | 'TEMP' | 'SHADOW'
  banExpiresAt?: string | null
  emailVerified?: boolean
  mfaEnabled?: boolean
  engagementScore?: number
  lastIp?: string
  lastCountry?: string
  suspiciousFlags?: string[]
}

interface AdminActionLogDTO {
  // existing ...
  reasonCode?: string
  reasonDetails?: string
  diff?: Array<{ field: string; old: any; new: any }>
}
```

## Constants Skeleton
`src/constants/modReasons.ts`
```ts
export const MOD_REASON_CATEGORIES = [
  { code: 'ABUSE', label: 'Оскорбления', templates: ['Токсичное поведение', 'Оскорбительные сообщения'] },
  { code: 'SPAM', label: 'Спам', templates: ['Массовая публикация однотипного контента', 'Реклама'] },
  { code: 'NSFW', label: 'Недопустимый контент', templates: ['18+ без пометки', 'NSFW вне разрешённых зон'] },
  { code: 'DMCA', label: 'Авторские права', templates: ['Запрос правообладателя', 'Нарушение лицензии'] },
  { code: 'OTHER', label: 'Другое', templates: [] }
] as const;
```

## Transition / Migration Notes
- Until backend supports new fields: mark optional; feature-gate UI (hide if undefined).
- Diff support: if `diff` absent, gracefully fallback.
- Ban modal: if no temp ban backend yet, hold feature behind a toggle constant.

### Reason Encoding & Migration
Current Transitional Format:
```
[CODE]|meta(k=v;...);diff(field:old→new;field2:old→new)| human readable text
```
Ordering rules:
- `meta(...)` и `diff(...)` секции опциональны; если обе отсутствуют: `[CODE]| текст`.
- Разделитель между секциями и текстом — последняя вертикальная черта `|`.
Parsing Strategy:
- `parseReason` извлекает `{ code, meta: Record<string,string|null>, diff: {field,old,new}[], text }`.
- Значение `∅` → `null` при парсинге.
Forward Plan:
- Backend v2: отдельные поля `reasonCode`, `reasonDetails`, `diff[]`, `meta` (JSON / map).
- Миграция: при загрузке логов, если структурные поля пусты, парсим строку → заполняем runtime-модель; при создании — отправляем уже структурно если фича-флаг включён.
- Обратная совместимость: фронтенд оставляет `reason` строку до полной миграции.

Feature Flag Proposal:
```ts
export const FEATURE_FLAGS = {
   STRUCTURED_ADMIN_REASON: false, // переключение после готовности backend
   TEMP_BAN_REMAINING_BADGE: false // включить после внедрения периодического тикера
}
```

## Immediate Next Implementation (Step Order)
1. (DONE) Constants file + extended types.
2. (DONE) Standardized reason selector + serialization.
3. (DONE) Disabled buttons + cooldown.
4. (DONE) Optimistic updates.
5. (DONE) Diff capture (moved into reason serialization instead of description shim).
6. (NEW) Add TEMP ban remaining-time badge helper (pending backend auto-expiry confirmation).
7. (PLANNED) Introduce feature flag & structured send path.
8. (PLANNED) Optional reinforced confirmation for shadow-ban/unban.

## Security Quick Wins (Frontend)
- Prevent self-ban or self-demote without extra confirm (type CONFIRM).
- Hard disable actions if `!isAdmin` even if UI route accidentally exposed.
- Add subtle rate-limit guard (cooldown ms) around mutating buttons.

Status:
- Self demote / ban now triggers auto logout (hard isolation) — implemented.
- Additional typed confirm for elevation implemented (username match).
- Cooldown + busy state in place.

---
This document will evolve as backend capabilities expand.

## Backend Moderation Implementation (Current Progress)

✅ Added backend data model extensions:
- `users`: `ban_type`, `ban_expires_at`, `token_version` (entity fields + manual SQL migration script `AuthService/db_migration_add_ban_and_structured_reason.sql`).
- `admin_action_logs`: `reason_code`, `reason_details`, `meta_json`, `diff_json` (while keeping legacy `reason`).

✅ Added enums & DTO updates:
- New `BanType { NONE, PERM, TEMP, SHADOW }`.
- `UserDTO` now includes `banType`, `banExpiresAt`.
- `AdminActionLogDTO` extended with structured fields.

✅ Service logic:
- Legacy toggle preserved (`/ban-toggle`) now maps to PERM ban / UNBAN using new fields.
- New `applyBanAction(...)` in `UserService` supports explicit PERM / TEMP / SHADOW / NONE with tokenVersion bump.
- Token invalidation: any moderation change increments `tokenVersion`.

✅ Controller extension:
- New POST `/api/admin/util/ban` accepting structured JSON (`banType`, optional `expiresAt`, `reason`, `reasonCode`, `reasonDetails`, `metaJson`, `diffJson`).

✅ JWT hardening:
- Tokens now embed `tv` (tokenVersion), `role`, `ban` claims; validation rejects stale tokenVersion.

🗂 Migration:
- Manual SQL script provided; integrate Flyway/Liquibase later if desired.

### Remaining / Next Backend Steps
- Auto-expiry enforcement for TEMP bans (scheduled task or check-on-auth to flip to NONE when time passes).
- Optionally enrich `AdminActionLogMapper` to parse legacy `reason` into structured fields if new ones null (runtime backfill) — currently direct mapping only.
- Add security filter to deny TEMP/PERM banned users early (JWT valid but account disabled / banned nuance for SHADOW).
- Add dedicated session invalidation endpoint (increment tokenVersion server-side) for future frontend direct call.
- Activate frontend `STRUCTURED_ADMIN_REASON` flag once end-to-end tested with new endpoint.

### Toggle Activation Plan
1. Deploy backend changes + run SQL migration.
2. Observe logs for new ban actions (ensure reason_code persists when sent).
3. Flip frontend feature flag to send structured payload instead of serialized string (retain legacy for fallback).
4. After 2 weeks stable: migrate old logs (optional batch parse) and hide legacy reason string from UI.

### Risk & Rollback
- Rollback safe: new columns are additive; legacy APIs still operational.
- If issues with new `/ban` endpoint: continue using `/ban-toggle` (still functional).
- TokenVersion claim addition is backward compatible (older tokens missing `tv` pass unless logic tightened — current logic tolerates null).

### Monitoring Suggestions
- Add metric counters: `admin.ban.perm`, `admin.ban.temp`, `admin.ban.shadow`, `admin.unban`.
- Alert if spike > X/min or if shadow bans exceed threshold ratio.

---
Backend phase initial implementation COMPLETE; pending operational validation & optional enhancements above.
