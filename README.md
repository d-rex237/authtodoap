# Focus — Technical Documentation

**Focus** is a full-stack task management web app built with Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma ORM, Clerk authentication, and Resend for email. It supports real-time countdown timers, in-browser audio alarms, browser push notifications, and email reminders.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Authentication — Clerk](#authentication--clerk)
4. [Database — Prisma + PostgreSQL](#database--prisma--postgresql)
5. [Server Actions — `todos.ts`](#server-actions--todosts)
6. [React Query Hooks — `use-todos.ts`](#react-query-hooks--use-todosts)
7. [Alarm System — `use-alarm.ts`](#alarm-system--use-alarmts)
8. [Email Reminders — Resend](#email-reminders--resend)
9. [Dashboard UI — `TodoPage`](#dashboard-ui--todopage)
10. [Landing Page](#landing-page)
11. [Data Flow Diagram](#data-flow-diagram)
12. [Environment Variables](#environment-variables)

---

## Tech Stack

| Layer         | Technology                             |
| ------------- | -------------------------------------- |
| Framework     | Next.js 15 (App Router)                |
| Language      | TypeScript                             |
| Styling       | Tailwind CSS                           |
| Auth          | Clerk                                  |
| Database ORM  | Prisma                                 |
| Database      | PostgreSQL                             |
| Server state  | TanStack React Query v5                |
| Email         | Resend                                 |
| Audio         | Web Audio API (native browser)         |
| Notifications | Web Notifications API (native browser) |

---

## Project Structure

```
/
├── app/
│   ├── page.tsx                  # Public landing page
│   └── dashboard/
│       └── page.tsx              # Protected todo dashboard
├── components/
│   └── due-countdown.tsx         # Per-task live countdown timer
├── hooks/
│   ├── use-todos.ts              # React Query CRUD hooks
│   └── use-alarm.ts              # Audio alarm + browser notification hook
├── lib/
│   ├── db.ts                     # Prisma client singleton
│   ├── email.ts                  # Resend email helper
│   └── actions/
│       └── todos/
│           └── todos.ts          # Next.js Server Actions (CRUD)
└── prisma/
    └── schema.prisma             # Data model
```

---

## Authentication — Clerk

### How it works

Clerk handles all authentication — sign-up, sign-in, session management, and user identity. There are two ways Clerk is used in this app:

**Client-side (React components):**

```tsx
import { useUser } from "@clerk/nextjs";

const { user } = useUser();
// user.firstName, user.lastName, user.id, etc.
```

The dashboard uses `useUser()` to display the user's initials in the top-right avatar.

**Server-side (Server Actions / API routes):**

```typescript
import { auth } from "@clerk/nextjs/server";

const { userId: clerkId } = await auth();
```

Every server action calls `auth()` to retrieve the authenticated user's Clerk ID before touching the database. This is the security boundary — unauthenticated requests are rejected before any data is read or written.

**Landing page redirect:**

```typescript
// app/page.tsx
const user = await currentUser();
if (user) redirect("/dashboard");
```

If a signed-in user visits `/`, they are immediately redirected to `/dashboard`.

---

## Database — Prisma + PostgreSQL

### Prisma client singleton — `lib/db.ts`

```typescript
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

**Why this pattern?** In Next.js development mode, hot-module reloading re-executes modules on every save. Without this singleton guard, each reload would instantiate a new `PrismaClient`, eventually exhausting the database connection pool. The singleton is stored on the `global` object so it persists across hot reloads in development. In production, module caching handles this automatically so the guard is skipped.

### Data Model

The app uses two main models:

**`users` table** — mirrors Clerk users inside the app's own database. Stores the Clerk user ID (`clerkId`) as a foreign key reference.

**`todo` table** — each task belongs to a user.

```prisma
model todo {
  id        String   @id @default(cuid())
  text      String
  completed Boolean  @default(false)
  priority  String   @default("medium")   // "high" | "medium" | "low"
  category  String   @default("General")  // "Work" | "Design" | "Personal" | "General"
  dueAt     DateTime?
  createdAt DateTime @default(now())
  userId    String
  user      users    @relation(fields: [userId], references: [id])
}
```

`dueAt` is nullable — tasks without a due date have no alarm and no countdown.

---

## Server Actions — `todos.ts`

All database mutations are Next.js **Server Actions** (`"use server"`). They run exclusively on the server and are never exposed as public API endpoints.

### Authentication helper

```typescript
async function getDbUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  const user = await db.users.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  return user;
}
```

Every action calls `getDbUser()` first. This does two things:

1. Verifies the request is authenticated via Clerk.
2. Resolves the internal database user from the Clerk ID, providing the `userId` needed for all queries.

If either check fails, the action throws immediately and no database operation runs.

### `getTodos()`

```typescript
export async function getTodos() {
  const user = await getDbUser();
  return await db.todo.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}
```

Fetches all todos belonging to the authenticated user, newest first. The `where: { userId: user.id }` clause ensures users can only ever see their own data.

### `createTodo(input)`

```typescript
export async function createTodo(input: CreateTodoInput) {
  const user = await getDbUser();
  if (!input.text.trim()) throw new Error("Text is required");

  return await db.todo.create({
    data: {
      text: input.text.trim(),
      priority: input.priority ?? "medium",
      category: input.category ?? "General",
      completed: input.completed ?? false,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      userId: user.id,
    },
  });
}
```

All fields have safe defaults. `dueAt` is converted from an ISO string (from the `datetime-local` HTML input) into a `Date` object before storage.

### `toggleTodo(id)`

```typescript
export async function toggleTodo(id: string) {
  const user = await getDbUser();
  const todo = await db.todo.findUnique({ where: { id } });

  if (!todo) throw new Error("Todo not found");
  if (todo.userId !== user.id) throw new Error("Unauthorized");

  return await db.todo.update({
    where: { id },
    data: { completed: !todo.completed },
  });
}
```

The ownership check (`todo.userId !== user.id`) is critical — it prevents a user from toggling another user's todo by guessing its ID, a classic IDOR (Insecure Direct Object Reference) vulnerability.

### `deleteTodo(id)`

Same ownership pattern as `toggleTodo`. The todo is fetched first, ownership is verified, then it is deleted.

---

## React Query Hooks — `use-todos.ts`

The client communicates with server actions through **TanStack React Query** hooks. These hooks manage loading state, caching, and automatic re-fetching.

### Cache key

All todo hooks share the query key `["getTodos"]`. When any mutation succeeds, it invalidates this key, causing React Query to automatically refetch the list.

```typescript
queryClient.invalidateQueries({ queryKey: ["getTodos"] });
```

### `useGetTodos()`

Wraps `getTodos()` in a `useQuery`. Returns `{ data, isLoading, error }`. The `data` defaults to `[]` to avoid undefined checks throughout the UI.

### `useCreateTodo()`

Wraps `createTodo()` in a `useMutation`. On success, invalidates the todo list. The `onSuccess` callback in the component closes the form and resets input state.

### `useToggleTodo()` and `useDeleteTodo()`

Same pattern — mutations that invalidate `["getTodos"]` on success.

The mutation functions (`isPending`) expose loading state so buttons can be disabled during in-flight requests, preventing double-submissions.

---

## Alarm System — `use-alarm.ts`

The alarm hook manages three things: audio playback, browser notifications, and tracking which alarms are currently firing.

### Refs used (not state)

```typescript
const audioCtxRef = useRef<AudioContext | null>(null);
const stopFnsRef = useRef<Map<string, () => void>>(new Map());
const firingIds = useRef<Set<string>>(new Set());
```

All three use `useRef` rather than `useState`. This is intentional — changing these values must not trigger re-renders. `firingIds` is a `Set` keyed by todo ID, checked in the UI to apply alarm styling.

### `triggerAlarm(id, taskText)`

```typescript
const triggerAlarm = useCallback((id: string, taskText: string) => {
  if (firingIds.current.has(id)) return; // prevent duplicate alarms
  firingIds.current.add(id);

  playSound(id);
  showNotification(taskText);

  setTimeout(() => stopAlarm(id), 30000); // auto-stop after 30 seconds
}, []);
```

The guard `firingIds.current.has(id)` ensures the same task cannot fire its alarm more than once, even if the component re-renders while the due countdown is ticking.

### `playSound(id)` — Web Audio API

Rather than loading an audio file, the alarm synthesizes sound procedurally using the Web Audio API:

```typescript
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.type = "sine";
osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
osc.frequency.setValueAtTime(880, ctx.currentTime + 0.16);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); // fade out
```

This creates a two-tone beep (880 Hz → 1100 Hz → 880 Hz) that fades out over 0.3 seconds. The beep repeats every 600 ms for up to 50 iterations (30 seconds total), scheduled via `setTimeout` offsets. All active timeouts are stored so `stopAlarm` can cancel them immediately when the user dismisses.

The `AudioContext` is created lazily (only when the first alarm fires) and reused across all subsequent alarms to avoid creating multiple audio graph instances.

### `showNotification(taskText)` — Web Notifications API

```typescript
if ("Notification" in window && Notification.permission === "granted") {
  new Notification("⏰ Task Due Now!", {
    body: taskText,
    requireInteraction: true,
  });
}
```

`requireInteraction: true` keeps the notification visible until the user explicitly dismisses it, rather than auto-hiding after a few seconds. Permission is requested once on mount via `Notification.requestPermission()`.

### `stopAlarm(id)`

Calls the stored stop function (which clears all scheduled timeouts), removes it from the maps, and removes the ID from `firingIds`. The UI reactivity comes from the `dismissedAlarms` state in the dashboard component, not from `firingIds` directly.

---

## Email Reminders — Resend

### `lib/email.ts`

The `sendReminderEmail` function uses the **Resend** SDK to send a styled HTML email when a task is due.

```typescript
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: "onboarding@resend.dev",
  to: recipientEmail,
  subject: `⏰ Reminder: "${taskText}" is due soon`,
  html: `...`,
});
```

The email body is a self-contained HTML string styled with inline CSS (required for email client compatibility). It includes:

- The task name
- Category
- Due date/time formatted with `toLocaleString()`
- Priority with color-coded styling (red for high, yellow for medium, green for low)

The priority color map is defined locally in the function:

```typescript
const priorityColors = { high: "#ef4444", medium: "#eab308", low: "#22c55e" };
```

> **Note:** The `to` field is currently hardcoded to a single address for development. In production, this would be replaced with the authenticated user's email from Clerk.

---

## Dashboard UI — `TodoPage`

`app/dashboard/page.tsx` is the main client component (`"use client"`). It composes all hooks and renders the full dashboard.

### State

| State             | Type          | Purpose                              |
| ----------------- | ------------- | ------------------------------------ |
| `task`            | `string`      | New task input text                  |
| `category`        | `string`      | Selected category for new task       |
| `priority`        | `string`      | Selected priority for new task       |
| `dueAt`           | `string`      | ISO datetime string from date input  |
| `filter`          | `string`      | `"all"` / `"active"` / `"completed"` |
| `search`          | `string`      | Live search query                    |
| `showForm`        | `boolean`     | Toggle new task form visibility      |
| `dismissedAlarms` | `Set<string>` | IDs of alarms the user has dismissed |

### Derived values (useMemo)

```typescript
const filteredTodos = useMemo(() => {
  return todos.filter((todo) => {
    const matchesSearch = todo.text
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "active"
          ? !todo.completed
          : todo.completed;
    return matchesSearch && matchesFilter;
  });
}, [todos, filter, search]);
```

`filteredTodos` is memoized so it only recalculates when `todos`, `filter`, or `search` changes, avoiding unnecessary re-computation on unrelated state changes.

Progress and overdue counts are also derived from `todos` inline:

```typescript
const progress = todos.length
  ? Math.round((completedCount / todos.length) * 100)
  : 0;
const overdueCount = todos.filter(
  (t) => t.dueAt && new Date(t.dueAt) < new Date() && !t.completed,
).length;
```

### Alarm integration in the UI

```typescript
const activeAlarms = todos.filter(
  (t) =>
    t.dueAt &&
    !t.completed &&
    !dismissedAlarms.has(t.id) &&
    firingIds.current.has(t.id),
);
```

This computes which tasks currently have an active alarm by intersecting `firingIds` (from the alarm hook) with `dismissedAlarms` (local state). Active alarms render a red banner at the top of the page.

### `handleAlarm` callback

```typescript
const handleAlarm = useCallback(
  (id: string, text: string) => {
    if (dismissedAlarms.has(id)) return;
    triggerAlarm(id, text);
  },
  [triggerAlarm, dismissedAlarms],
);
```

Passed down to the `DueCountdown` component. When the countdown reaches zero, `DueCountdown` calls `onAlarm(id, text)`, which triggers the alarm hook. The `dismissedAlarms` check prevents re-firing after the user has dismissed.

### Layout structure

```
min-h-screen
└── flex h-screen (sidebar + main)
    ├── <aside> Sidebar (hidden on mobile)
    │   ├── Progress card (% complete, progress bar)
    │   ├── Filter buttons (All / Active / Completed)
    │   └── Category list with counts
    └── <main>
        ├── Header (date, "New Task" button, user avatar)
        ├── Alarm banner (conditional)
        └── Scrollable content area
            ├── New task form (conditional)
            ├── Search bar
            └── Todo list
```

### Todo card anatomy

Each todo card renders:

- A **left color stripe** indicating priority (red/yellow/green)
- A **checkbox** button that calls `toggleTodo`
- The **task text** with strikethrough when completed
- **Category badge**, **priority badge**, **due date badge**
- A `DueCountdown` component (if `dueAt` is set and task is incomplete)
- A **dismiss button** if the alarm is firing
- A **delete button** visible on hover

---

## Landing Page

`app/page.tsx` is a server component. It checks authentication at the server level using `currentUser()` and redirects signed-in users to `/dashboard`. For unauthenticated users it renders the marketing page with:

- Animated CSS grid background
- Radial purple glow gradients
- Clerk `<SignInButton>` and `<SignUpButton>` modals
- Feature cards (Priority-first, Due date reminders, Categories)
- A bottom CTA strip

No JavaScript-heavy libraries are used on the landing page — all animation is pure CSS (`animate-pulse`, Tailwind gradient utilities).

---

## Data Flow Diagram

```
User action (click "Add Task")
        │
        ▼
useCreateTodo() mutation (React Query)
        │
        ▼
createTodo() Server Action  ──► auth() [Clerk] ──► reject if unauth
        │
        ▼
Prisma db.todo.create()
        │
        ▼
PostgreSQL
        │
        ▼
queryClient.invalidateQueries(["getTodos"])
        │
        ▼
useGetTodos() refetch ──► UI re-renders with new todo
```

```
DueCountdown reaches zero
        │
        ▼
onAlarm(id, text) callback
        │
        ▼
useAlarm.triggerAlarm()
    ├── playSound()   ──► Web Audio API (oscillator beeps)
    └── showNotification() ──► browser Notification API
        │
        ▼
Alarm banner renders at top of dashboard
        │
        ▼
User clicks "Dismiss" ──► stopAlarm() ──► dismissedAlarms.add(id)
```

---

## Environment Variables

| Variable                            | Description                                 |
| ----------------------------------- | ------------------------------------------- |
| `DATABASE_URL`                      | PostgreSQL connection string used by Prisma |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key for client-side SDK        |
| `CLERK_SECRET_KEY`                  | Clerk secret key for server-side auth       |
| `RESEND_API_KEY`                    | Resend API key for sending emails           |

These must be set in `.env.local` for local development and in your deployment environment (e.g., Vercel environment variables) for production.
