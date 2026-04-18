# Notification System — Full Changelog

> All changes made to the **Tatra-Shared-Space** project during this session.

---

## Overview

A complete notification system was implemented covering:
- Room invites with accept/decline flow
- Membership join notifications
- Expiring goal/room deadline alerts
- Notification panel UI with read/unread state
- User switcher for multi-user demo support

---

## New Files

### 1. SQL Migration

#### [001_notifications_tables.sql](file:///c:/Users/Justanic/programing_proj/Tatra-Shared-Space/backend/database/001_notifications_tables.sql)

> [!IMPORTANT]
> Run this in the **Supabase SQL Editor** before using the app.

Creates three new tables:

**`room_invites`**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `room_iban` | text | FK → rooms |
| `invited_user_iban` | text | FK → users |
| `invited_by_user_iban` | text | FK → users |
| `status` | text | `'pending'`, `'accepted'`, `'declined'`, `'cancelled'` |
| `created_at` | timestamptz | Default `now()` |
| `responded_at` | timestamptz | Set on accept/decline |

- Unique partial index: `(room_iban, invited_user_iban) WHERE status = 'pending'` — prevents duplicate pending invites at DB level.

**`notifications`**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `user_iban` | text | FK → users |
| `type` | text | e.g. `'room_invite'`, `'room_member_joined'` |
| `title` | text | |
| `body` | text | |
| `data` | jsonb | Extra payload |
| `is_read` | boolean | Default `false` |
| `created_at` | timestamptz | Default `now()` |

- Index on `(user_iban, created_at DESC)` for efficient per-user queries.

**`user_friends`**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `user_iban` | text | FK → users |
| `friend_user_iban` | text | FK → users |
| `created_at` | timestamptz | Default `now()` |

- Unique constraint on `(user_iban, friend_user_iban)`.

---

### 2. Notification Service

#### [notifications.js](file:///c:/Users/Justanic/programing_proj/Tatra-Shared-Space/src/setup/notifications.js)

| Function | Signature | Description |
|---|---|---|
| `createNotification` | `(userIban, type, title, body, data)` | Insert single notification |
| `createNotifications` | `(rows[])` | **Batch insert** — single Supabase call for multiple notifications |
| `getNotificationsForUser` | `(userIban)` | Fetch all, ordered by `created_at DESC` |
| `markNotificationRead` | `(notificationId)` | Set `is_read = true` for one |
| `markAllNotificationsRead` | `(userIban)` | Set `is_read = true` for all unread |

---

### 3. Invite & Membership Service

#### [invites.js](file:///c:/Users/Justanic/programing_proj/Tatra-Shared-Space/src/setup/invites.js)

| Function | Signature | Description |
|---|---|---|
| `createRoomInvite` | `(roomIban, invitedUserIban, invitedByUserIban)` | Create invite with full validation |
| `getPendingInvitesForUser` | `(userIban)` | Fetch pending invites enriched with room/inviter names |
| `acceptRoomInvite` | `(inviteId)` | Robust accept: insert member → mark accepted → batch-notify |
| `declineRoomInvite` | `(inviteId)` | Set status to `'declined'`, `responded_at` to now |
| `addRoomMemberAndNotify` | `(roomIban, userIban)` | Direct add (skips if already member), batch-notifies existing members |

**`createRoomInvite` validations:**
- ✅ No self-invite (`invitedUserIban === invitedByUserIban`)
- ✅ No invite if user is already in `room_members`
- ✅ No duplicate pending invite for same `(room, user)`

**`acceptRoomInvite` ordering (prevents inconsistent state):**
1. Load invite, verify `status = 'pending'`
2. Verify user not already in `room_members`
3. Get existing member list (for notifications)
4. **Insert into `room_members` FIRST**
5. Only then mark invite as `'accepted'`
6. Batch-notify existing members of the join

**`addRoomMemberAndNotify` guard:**
- If user is already a member → returns `null`, no notification sent
- Handles race condition duplicates (Postgres error `23505`)

---

### 4. Deadline Jobs Service

#### [deadline-jobs.js](file:///c:/Users/Justanic/programing_proj/Tatra-Shared-Space/src/setup/deadline-jobs.js)

| Function | Description |
|---|---|
| `processExpiringGoals1h()` | Find goals with `date` within 1 hour, `notified_expiring_1h = false` → batch-notify all room members → mark notified |
| `processExpiringRooms1h()` | Find rooms with `expiration_date` within 1 hour, `notified_expiring_1h = false` → batch-notify all room members → mark notified |
| `processDeadlineNotifications()` | Calls both above sequentially, returns summary |

> [!NOTE]
> These are **callable functions only** — no `setInterval` or client-side polling. A manual ⚙ button is provided in the UI for testing. For production, use Supabase Edge Function with cron.

---

## Modified Files

### 5. Supabase Client

#### [supabase.js](file:///c:/Users/Justanic/programing_proj/Tatra-Shared-Space/src/setup/supabase.js)

render_diffs(file:///c:/Users/Justanic/programing_proj/Tatra-Shared-Space/src/setup/supabase.js)

**Change: `createRoom` signature extended**

```diff
-export async function createRoom(roomIban, name, balance = 0) {
+export async function createRoom(roomIban, name, balance = 0, createdByUserIban = null, mode = null) {
   const client = requireSupabase();
-  const { data, error } = await client
-    .from('rooms')
-    .insert({ room_iban: roomIban, name, balance })
+  const row = { room_iban: roomIban, name, balance };
+  if (createdByUserIban) {
+    row.created_by_user_iban = createdByUserIban;
+  }
+  if (mode) {
+    row.mode = mode;
+  }
+  const { data, error } = await client
+    .from('rooms')
+    .insert(row)
```

- Now persists `created_by_user_iban` (room creator)
- Now persists `mode` (room type: trip/flat/gift/other)

---

### 6. Shared Spaces Web Page

#### [shared-spaces.web.jsx](file:///c:/Users/Justanic/programing_proj/Tatra-Shared-Space/app/shared-spaces.web.jsx)

render_diffs(file:///c:/Users/Justanic/programing_proj/Tatra-Shared-Space/app/shared-spaces.web.jsx)

This file had the most changes. Here is a breakdown by area:

---

#### 6.1 — New Imports

```js
import { getNotificationsForUser, markNotificationRead, markAllNotificationsRead } from '../src/setup/notifications';
import { createRoomInvite, getPendingInvitesForUser, acceptRoomInvite, declineRoomInvite } from '../src/setup/invites';
import { processDeadlineNotifications } from '../src/setup/deadline-jobs';
```

---

#### 6.2 — `RoomDetail`: Removed unused state

```diff
-  const [showSendForm, setShowSendForm] = useState(false);
```

Also removed the stale `setShowSendForm(false)` call inside `handleSend`.

---

#### 6.3 — Transaction timestamp fix

```diff
-  {tx.created_at ? ` · ${new Date(tx.created_at).toLocaleDateString('sk-SK')}` : ''}
+  {tx.time ? ` · ${new Date(tx.time).toLocaleDateString('sk-SK')}` : ''}
```

The DB column is `transactions.time`, not `created_at`.

---

#### 6.4 — `AddMemberModal`: Invite flow + cleanup

**Before:** Directly called `addRoomMember()` for each selected user.

**After:**
- Calls `createRoomInvite()` — users receive an invite, not instant membership
- Shows per-user results (success ✓ / error message)
- Auto-closes after 1.5s with proper `useRef` + `useEffect` cleanup to prevent stale timeout on unmount
- `loading` state reliably resets via `finally` block (was only in `catch` before)

```diff
+  const closeTimerRef = React.useRef(null);
+
+  useEffect(() => {
+    return () => {
+      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
+    };
+  }, []);
```

---

#### 6.5 — `CreateSpaceModal`: Invite flow + persist mode

**Before:** Added all selected users directly via `addRoomMember()`.

**After:**
- Creator is added directly via `addRoomMember()` ← still direct
- Other selected users receive invites via `createRoomInvite()` ← invite flow
- Room type persisted: `createRoom(roomIban, name, 0, currentUserIban, type)` → saves to `rooms.mode`
- Label changed from "Pozvat clenov z kontaktov" to "Pozvat clenov (dostanu pozvanku)"

---

#### 6.6 — New Component: `NotificationsPanel`

A modal panel showing all notifications for the current user:
- Lists notifications ordered by newest first
- Unread items highlighted with a blue left border and tinted background
- Click to mark individual notification as read
- "Oznacit vsetky ako precitane" button to mark all read
- Icons per notification type: ✉ invite, 👤 member joined, ⏰ expiring
- Timestamp displayed in Slovak locale

---

#### 6.7 — New Component: `InvitesPanel`

A modal panel showing pending invites for the current user:
- Each invite shows room name and inviter name
- **Prijat** (Accept) button → calls `acceptRoomInvite()` → refreshes room data and badge counts
- **Odmietnut** (Decline) button → calls `declineRoomInvite()` → refreshes badge counts
- Both handlers call `onCountsChanged()` immediately after action (not just on modal close)

---

#### 6.8 — `SharedSpacesWebPage`: User selector + filtered rooms + badges

**User selection (replaces `data.users[0]`):**
```js
const [currentUserIban, setCurrentUserIban] = useState(() => {
  try { return localStorage.getItem('tatra_current_user_iban') || null; } catch { return null; }
});
```
- Persisted in `localStorage` across reloads
- Validated against loaded user list — if stored IBAN doesn't exist in users, auto-resets to first available
- Explicit `<select>` dropdown in the header for switching users

**Room filtering:**
```js
const myRooms = currentUserIban
  ? data.rooms.filter(r => r.members.some(m => m.user_iban === currentUserIban))
  : data.rooms;
```
- Room list, stats, and empty state all use `myRooms`
- Label changed from "Aktivne priestory" to "Moje priestory"
- Empty state message: "Ziadne priestory pre tohto pouzivatela."

**Header buttons (new):**
| Button | Icon | Purpose |
|---|---|---|
| User selector | `<select>` | Switch active user |
| Pozvanky | ✉ + badge | Open invites panel |
| Notification bell | 🔔 + badge | Open notifications panel |
| Deadline trigger | ⚙ | Manually run `processDeadlineNotifications()` (testing) |

**Badge count refresh:**
- `refreshCounts()` called on modal close, after accept/decline, and after deadline processing
- Fetches both unread notification count and pending invite count in parallel

---

## Notification Types Summary

| Type | Trigger | Recipients | Body |
|---|---|---|---|
| `room_invite` | `createRoomInvite()` | Invited user | `"<inviterName> invited you to <roomName>"` |
| `room_member_joined` | `acceptRoomInvite()` or `addRoomMemberAndNotify()` | All existing room members (batch) | `"<userName> joined <roomName>"` |
| `goal_expiring_1h` | `processExpiringGoals1h()` | All room members (batch) | `'Goal "<goalName>" in room "<roomName>" ends in less than 1 hour'` |
| `room_expiring_1h` | `processExpiringRooms1h()` | All room members (batch) | `'Room "<roomName>" ends in less than 1 hour'` |

---

## Files Summary

| Action | File | What Changed |
|---|---|---|
| **NEW** | `backend/database/001_notifications_tables.sql` | 3 tables + indexes |
| **NEW** | `src/setup/notifications.js` | Notification CRUD + batch insert |
| **NEW** | `src/setup/invites.js` | Invite lifecycle + membership + notifications |
| **NEW** | `src/setup/deadline-jobs.js` | Expiring goals/rooms callable jobs |
| **MODIFIED** | `src/setup/supabase.js` | `createRoom()` → added `createdByUserIban` + `mode` params |
| **MODIFIED** | `app/shared-spaces.web.jsx` | Invite flow, notifications panel, invites panel, user selector, room filtering, cleanup fixes |
