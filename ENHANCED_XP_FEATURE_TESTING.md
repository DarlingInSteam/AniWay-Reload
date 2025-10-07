# XP Expansion & History Feature - Test Plan

## Scope
Validate new XP sources and history filtering:
1. Forum thread like events (FORUM_THREAD_LIKE_RECEIVED)
2. Forum post like events (FORUM_POST_LIKE_RECEIVED)
3. Extended transactions endpoint filters (sourceType, sinceDays)
4. Frontend history hook & component (`useUserXpHistory`, `XpHistoryList`)
5. Badge evaluation still triggered (FIRST_LIKE_RECEIVED, etc.)

## Pre-requisites
- RabbitMQ running with exchange `xp.events.exchange` and bound queue `xp.events.queue`
- ForumService, LevelService, CommentService, PostService up
- At least two users (A = receiver/author, B = liker)

## Test Cases

### 1. Thread like XP
1. User A creates a forum thread (note its ID T).
2. User B likes thread T.
3. Assert LevelService logs: `FORUM_THREAD_LIKE_RECEIVED` applied with +XP (default 2).
4. GET `/api/levels/{A}/transactions?sourceType=FORUM_THREAD_LIKE_RECEIVED` returns at least one entry referencing threadId.
5. Badge FIRST_LIKE_RECEIVED awarded if it is the first like source for A.

Edge: B toggles like to DISLIKE then back to LIKE -> Only one XP transaction (event id dedup) created.

### 2. Post like XP
1. User A creates a forum post (ID P) under thread T.
2. User B likes post P.
3. Assert XP transaction with sourceType `FORUM_POST_LIKE_RECEIVED`.
4. Verify history filter `sourceType=FORUM_POST_LIKE_RECEIVED` returns it.

### 3. Self-like prevention
1. User A likes own thread or post.
2. No XP transaction created.

### 4. Idempotency
1. B likes thread T (creates event + XP)
2. B repeats like action (already LIKE)
3. No second XP transaction (event id stable per (threadId, likerId)).

### 5. sinceDays filter
1. Query without filter -> full page.
2. Query with `sinceDays=1` -> only last 24h entries.

### 6. Combined filters
`/transactions?sourceType=FORUM_POST_LIKE_RECEIVED&sinceDays=1` returns only recent post-like XP.

### 7. Frontend hook
1. Navigate to profile achievements panel where `XpHistoryList` rendered.
2. Ensure list displays new event types with localized labels.

### 8. Regression: existing events
Trigger COMMENT_CREATED, LIKE_RECEIVED (comment), POST_UPVOTED, CHAPTER_READ.
Expectation update: COMMENT_CREATED now records a zero-XP transaction (for badge tracking only) while the others still grant XP.
Verify that:
1. LIKE_RECEIVED / POST_UPVOTED / CHAPTER_READ increase total XP.
2. COMMENT_CREATED appears in transaction history with 0 XP delta.
3. FIRST_COMMENT / TEN_COMMENTS badges still evaluate based on COMMENT_CREATED transactions.

## Logging Validation
- LevelService should log each applied XP with total.
- ForumService logs publishing events (info level added in service).

## Configuration Keys (defaults)
```
leveling.xp.forumThreadLikeReceived=2
leveling.xp.forumPostLikeReceived=2
xp.events.forumThreadLikeRoutingKey=xp.events.forum-thread-like
xp.events.forumPostLikeRoutingKey=xp.events.forum-post-like
```

## Future Enhancements
- Move filtering to repository layer with dynamic predicates.
- Add pagination metadata for filtered responses (currently manual subset meta).
- Add REVIEW_LIKE_RECEIVED if/when review like domain implemented.
