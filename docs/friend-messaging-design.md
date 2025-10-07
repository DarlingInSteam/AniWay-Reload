# Friendship & Messaging Platform – Technical Design

## Vision
Build a cohesive social layer consisting of friending, direct messaging, and multi-category global chat. The experience must feel instantly responsive (red-dot indicators, quick navigation to replies), reuse the projects minimalist glass aesthetic, and integrate seamlessly with existing microservices (GatewayService, AuthService, NotificationService, RabbitMQ, Frontend).

## Service Responsibilities
| Service | Responsibility | Notes |
|---------|----------------|-------|
| **FriendService** | Ownership of friend requests, friendships, pending counts, and acceptance workflow. | Stateless HTTP API behind Gateway. Pushes notifications when requests arrive/are accepted. |
| **MessageService** | Direct (1:1) conversations, message delivery, reply threading, read markers, and global chat categories (admin-curated). | Persists conversation state, exposes REST APIs, emits notification events. |
| **NotificationService** | Receives new internal events for friend requests, direct messages, and channel replies. | Emits SSE red-dot updates already consumed by the frontend. |
| **GatewayService** | Routes `/api/friends/**` and `/api/messages/**` traffic to the corresponding services (including WebSocket plans). | Both YAML configs must be updated. |
| **docker-compose.*.yml** | Spins up FriendService + MessageService + PostgreSQL databases and links to RabbitMQ. | Applies to dev & prod manifests. |
| **Frontend** | New tabs/sections in profile, messaging workspace UI, global chat category nav, badge indicators, and request management. | Reuse existing tailwind utilities and notification context. |

## FriendService Architecture
### Data Model (PostgreSQL)
- `friend_requests`
  - `id` UUID PK (generated in service)
  - `requester_id`, `receiver_id` (BIGINT, not null)
  - `status` (`PENDING`,`ACCEPTED`,`DECLINED`,`CANCELLED`)
  - `context` (TEXT, optional message)
  - `created_at`, `updated_at`, `responded_at` (TIMESTAMP WITH TIME ZONE)
  - Unique index on `(requester_id, receiver_id)` for status `PENDING` to prevent duplicates.
- `friendships`
  - `id` BIGSERIAL PK
  - `user_a_id`, `user_b_id` (BIGINT, stored sorted `min/max`)
  - `created_at` TIMESTAMP WITH TIME ZONE DEFAULT `now()`
  - Unique index on `(user_a_id, user_b_id)` ensuring symmetry.
- `friend_audit_log` (optional): records state transitions for traceability (stretch goal if time permits).

### API Contract
All endpoints live under `/api/friends` and require Gateway-provided security headers (`X-User-Id`, `X-User-Role`). Responses rely on DTOs returning only user IDs; the frontend will enrich using existing profile lookups.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/friends` | List current users friends with `friendUserId`, `since`, `requestId` (if derived). |
| `GET` | `/api/friends/users/{userId}` | Public-visible list of another users friends. |
| `POST` | `/api/friends/requests` | Body: `{ targetUserId, message? }`. Creates or reactivates request. |
| `GET` | `/api/friends/requests/incoming` | List pending requests targeting current user. |
| `GET` | `/api/friends/requests/outgoing` | List requests created by current user. |
| `POST` | `/api/friends/requests/{requestId}/accept` | Accept request 			|
| `POST` | `/api/friends/requests/{requestId}/decline` | Decline request. |
| `DELETE` | `/api/friends/{friendUserId}` | Remove friendship bidirectionally. |
| `GET` | `/api/friends/summary` | Returns counts: friends, incomingPending, outgoingPending. |

### Service Components
- `FriendRequestEntity`, `FriendshipEntity`, mapped with Spring Data JPA.
- `FriendRequestRepository`, `FriendshipRepository` with derived query methods and custom spec for statuses.
- `FriendshipService` orchestrating validations (same user guard, existing friendship detection, etc.).
- `FriendController` and `FriendRequestController` splitting listing vs. mutation responsibilities.
- `SecurityConfig` + `GatewayAuthenticationFilter` (copied & adapted from ForumService) to read `X-User-*` headers.
- Integration with `NotificationService` via HTTP (RestTemplate/WebClient) for new notification types:
  - `FRIEND_REQUEST_RECEIVED`
  - `FRIEND_REQUEST_ACCEPTED`

## MessageService Architecture
### Core Concepts
- **Conversations** unify private dialogs and global chat categories, enabling reuse of message + reply handling.
- **Global Chat Categories** are represented as channel-type conversations. Admins manage the catalog (`/api/messages/categories`). Default category `общие` is seeded at startup.
- **Replies** store `replyToMessageId` (nullable) with self-reference, enabling quick navigation.
- **Read State**
  - Private: `ConversationParticipant.lastReadMessageId`
  - Channels: `ChannelReadMarker` per `(categoryId, userId)` storing last-read message timestamp/id.
- **Notification Hooks**
  - Private message: notify target participant of new message.
  - Channel reply: notify original message author when someone replies.

### Data Model (PostgreSQL)
- `chat_categories`
  - `id` BIGSERIAL PK, `slug`, `title`, `description`, `is_default`, `is_archived`, `created_by`, stamps.
- `conversations`
  - `id` UUID PK, `type` ENUM(`PRIVATE`,`CHANNEL`), `category_id` (nullable FK), `created_at`, `last_message_at`.
- `conversation_participants`
  - `id` BIGSERIAL PK, `conversation_id` FK, `user_id`, `joined_at`, `last_read_message_id` (UUID), `last_read_at`, `muted`.
- `messages`
  - `id` UUID PK, `conversation_id` FK, `sender_id`, `content` (TEXT w/ length cap enforced), `reply_to_message_id` (nullable self FK), `created_at`, `edited_at`, `deleted_at`, `deleted_by`, `metadata_json` (optional for attachments).
- `channel_read_markers`
  - `category_id`, `user_id` composite PK with `last_read_message_id`, `last_read_at`.

All tables include indexes on search-heavy columns (e.g., conversation_id, created_at, sender_id).

### API Contract
Routes scoped under `/api/messages`.

#### Conversations (Direct Messages)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/conversations` | List conversations for current user with latest message + unread count. |
| `POST` | `/conversations` | Body: `{ targetUserId }` – create/reuse a private conversation. |
| `GET` | `/conversations/{conversationId}/messages` | Paginated fetch (`?cursor`, `?pageSize`). Supports `before`/`after` cursors. |
| `POST` | `/conversations/{conversationId}/messages` | Send message `{ content, replyTo? }`. |
| `POST` | `/conversations/{conversationId}/read` | Mark messages up to supplied `lastMessageId` as read. |
| `GET` | `/conversations/unread-count` | Aggregate unread count for badge display. |

#### Category (Global Chat)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/categories` | List categories with metadata + user-specific unread counts (if authenticated). |
| `POST` | `/categories` | Admin-only create `{ title, slug?, description? }`. |
| `PATCH` | `/categories/{id}` | Admin update fields / toggle archive. |
| `GET` | `/categories/{id}/messages` | Paginated fetch similar to private messages. Optional `since`.
| `POST` | `/categories/{id}/messages` | Send channel message. Supports replies.
| `POST` | `/categories/{id}/read` | Mark channel as read up to message id.
| `GET` | `/categories/unread` | Return map categoryId -> unread count for red dots.

#### Inbox Summary
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/summary` | Combined unread counters: `{ directUnread, channelUnread, pendingFriendRequests }` (pulls from FriendService via HTTP client). Used for nav indicators.

### Service Components
- `MessageService` orchestrating conversation + message creation, reply linking, read markers, permission checks.
- `ConversationService` (helper) to fetch or create direct conversation (ensures canonical pair ordering).
- `CategoryService` for admin CRUD and seeding default category.
- DTO mappers ensure consistent shape to frontend (IDs, content, timestamp epoch, reply snippet).
- Validation rules:
  - Non-empty content (max 4 000 characters for direct, 2 000 for channel).
  - Reply target must belong to same conversation.
  - Senders cannot send to themselves in direct (guard earlier at conversation creation).
  - Deleting messages (stretch) – not in scope unless time remains.
- Security: adopt Gateway filter pattern and `SecurityConfig` (similar to ForumService). Roles: `ROLE_ADMIN` for category management endpoints; `ROLE_USER` for messaging.

### Notification Integration
MessageService sends HTTP POST requests to NotificationService (`/internal/events/...`) via a small client bean to avoid duplicating logic. New payloads:
- `friend-request` (target user, requester id + optional message excerpt).
- `friend-accepted`.
- `direct-message` (target participant, conversation id, excerpt).
- `direct-reply` (target participant, conversation id, originalMessageId).
- `global-reply` (target user, category id, message id).

## NotificationService Enhancements
- Extend `NotificationType` enum with:
  - `FRIEND_REQUEST_RECEIVED`
  - `FRIEND_REQUEST_ACCEPTED`
  - `DIRECT_MESSAGE`
  - `DIRECT_MESSAGE_REPLY`
  - `CHANNEL_MESSAGE_REPLY`
- `InternalEventController`: add endpoints `friend-request`, `friend-accepted`, `direct-message`, `direct-message-reply`, `channel-message-reply` accepting JSON payloads (validating IDs & excerpts). Each delegates to `NotificationServiceFacade.createBasic` with dedupe keys (e.g., direct messages dedupe by conversation).
- Update frontend notification utilities to format new types (human-friendly titles / descriptions / navigation targets).

## Infrastructure Updates
### GatewayService
Add routes (both configs):
```yaml
- id: friends-api
  uri: http://friend-service:8102
  predicates:
    - Path=/api/friends/**
  filters:
    - StripPrefix=0
- id: messages-api
  uri: http://message-service:8103
  predicates:
    - Path=/api/messages/**
  filters:
    - StripPrefix=0
```
(Ports 8102/8103 chosen to avoid clashes; adjust if required.)

### docker-compose (dev & prod)
Add services:
- `friend-service`
  - build context, volumes (`src`, `build.gradle`), Gradle cache, env for datasource + RabbitMQ (if future events). Port mapping `8102`.
  - depends on `friend-postgres`, `rabbitmq`.
- `message-service`
  - similar pattern, env for datasource + RabbitMQ. Port `8103`.
- Corresponding PostgreSQL containers (`friend-postgres`, `message-postgres`) with init SQL mounted (`FriendService/friendDB.sql`, `MessageService/messageDB.sql`).
- Extend networks + volumes at bottom of compose.

### Database Init Scripts
- `FriendService/friendDB.sql`
- `MessageService/messageDB.sql`
Contain `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` plus CREATE TABLE statements matching JPA.

## Frontend Roadmap (Phase 2)
- **Navigation**: add main nav badge(s) using `/api/messages/summary`.
- **Profile Tabs**: introduce `Friends` tab listing friend cards (grid of avatars + status) with search/filter, using `GET /api/friends/users/{userId}`.
- **Messages Workspace**: new route `/messages`
  - Left sidebar: conversation list with unread counts.
  - Middle panel: message timeline with reply preview, ability to jump to parent.
  - Right drawer: global categories with red-dot states + quick reply.
- **Global Chat**: replicates Slack-like category switcher, message composer, reply overlay.
- **Friend Requests Panel**: accessible via `/friends` or nav popover; handles accept/decline.
- **Notification Utils**: extend `parsePayload`, `formatTitle`, `getNavigationTarget` for new types.
- **Hooks**: implement `useFriends`, `useMessages`, `useChannelMessages`, `useMessageReplies` w/ SWR style caching.
- **Styling**: reuse glass panels, inline badges, chip wrappers (consistent with new badge sizes).

## Non-Functional Requirements
- Java 21, Spring Boot 3.5.6 alignment.
- Reuse Lombok for DTOs to minimize boilerplate.
- Limit payload size in controllers to prevent abuse (Spring `@Validated` + `@Size`).
- Add indexes on `(conversation_id, created_at)` and `(category_id, created_at)` for message queries.
- IDs: use `UUID` for message & conversation to avoid enumeration leakage.
- Add flyway? (not currently used; rely on init SQL for now).
- Default global category seed executed via `CommandLineRunner` in MessageService.

## Next Steps
1. Scaffold FriendService (entities, repos, services, controllers, SQL, build.gradle dependencies, security config).
2. Scaffold MessageService (full stack) + init data runner.
3. Extend NotificationService types & REST endpoints.
4. Configure Gateway routes and compose files.
5. Backend validation via gradle builds + simple RestAssured tests.
6. Frontend implementation (tabs, messaging UI, notification parsing) referencing the APIs above.
7. Run integration build + e2e smoke (manual for messaging UI once built).

This design will guide the implementation tasks in subsequent TODO items.
