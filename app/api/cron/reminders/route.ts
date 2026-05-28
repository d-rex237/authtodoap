import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendReminderEmail } from "@/lib/email";

export async function GET(request: Request) {
  try {
    const now = new Date();

    // ── 1. Check raw todo count ──────────────────────────────
    const totalTodos = await db.todo.count();

    // ── 2. Check incomplete todos ────────────────────────────
    const incompleteTodos = await db.todo.count({
      where: { completed: false },
    });

    // ── 3. Check todos with dueAt set ────────────────────────
    const withDueDate = await db.todo.count({
      where: { completed: false, dueAt: { not: null } },
    });
    // ── 4. Check todos NOT yet reminded ──────────────────────
    const notReminded = await db.todo.count({
      where: { completed: false, dueAt: { not: null }, reminded: false },
    });
    const allWithDates = await db.todo.findMany({
      where: { completed: false, dueAt: { not: null } },
      select: { text: true, dueAt: true },
    });

    // ── 5. Check todos past due ───────────────────────────────
    const pastDue = await db.todo.findMany({
      where: {
        completed: false,
        reminded: false,
        dueAt: { lte: now },
      },
      select: {
        id: true,
        text: true,
        dueAt: true,
        reminded: true,
        userId: true,
        user: { select: { email: true, clerkId: true } },
      },
    });

    console.log("=== CRON RUNNING ===", now.toISOString());

    const dueTodos = await db.todo.findMany({
      where: {
        completed: false,
        reminded: false,
        dueAt: {
          lte: now, // anything past due that hasn't been reminded
        },
      },
      include: { user: true },
    });

    console.log("Due todos found:", dueTodos.length);
    dueTodos.forEach((t) => {
      console.log(`- "${t.text}" due ${t.dueAt} → email to ${t.user.email}`);
    });

    const results = await Promise.allSettled(
      dueTodos.map(async (todo) => {
        try {
          console.log(`Sending email to ${todo.user.email} for "${todo.text}"`);

          const result = await sendReminderEmail({
            to: todo.user.email,
            taskText: todo.text,
            dueAt: todo.dueAt!,
            category: todo.category,
            priority: todo.priority,
          });

          console.log(`Email result for "${todo.text}":`, result);

          await db.todo.update({
            where: { id: todo.id },
            data: { reminded: true },
          });

          console.log(`Marked "${todo.text}" as reminded`);
        } catch (err) {
          console.error(`Failed for "${todo.text}":`, err);
          throw err;
        }
      }),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`=== DONE: ${sent} sent, ${failed} failed ===`);

    return NextResponse.json({
      serverTime: now.toISOString(),
      totalTodos,
      incompleteTodos,
      withDueDate,
      notReminded,
      pastDueCount: pastDue.length,
      actualDueDates: allWithDates,
      pastDue, // exact records — check dueAt and user.email here
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
