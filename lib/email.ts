import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReminderEmail({
  to,
  taskText,
  dueAt,
  category,
  priority,
}: {
  to: string;
  taskText: string;
  dueAt: Date;
  category: string;
  priority: string;
}) {
  const priorityColors: Record<string, string> = {
    high: "#ef4444",
    medium: "#eab308",
    low: "#22c55e",
  };

  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: to, // hardcode it
    subject: `⏰ Reminder: "${taskText}" is due soon`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;padding:40px;border-radius:20px;border:1px solid #27272a">

        <!-- Header -->
        <div style="margin-bottom:32px;display:flex;align-items:center;gap:10px">
          <div style="background:#7c3aed;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center">
            <span style="color:white;font-weight:900;font-size:14px">F</span>
          </div>
          <span style="color:#ffffff;font-size:16px;font-weight:800;letter-spacing:-0.03em">focus.</span>
        </div>

        <!-- Title -->
        <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.02em">
          Task due soon ⏰
        </h1>
        <p style="color:#71717a;font-size:14px;margin:0 0 28px">
          This is your reminder from Focus.
        </p>

        <!-- Task card -->
        <div style="background:#18181b;border:1px solid #27272a;border-radius:14px;padding:20px;margin-bottom:28px;border-left:3px solid ${priorityColors[priority] ?? "#7c3aed"}">
          <p style="color:#ffffff;font-size:16px;font-weight:600;margin:0 0 12px">
            ${taskText}
          </p>
          <div style="display:flex;flex-direction:column;gap:6px">
            <p style="color:#71717a;font-size:13px;margin:0">
              📁 Category: <span style="color:#a1a1aa">${category}</span>
            </p>
            <p style="color:#71717a;font-size:13px;margin:0">
              🗓 Due: <span style="color:#a78bfa">${dueAt.toLocaleString()}</span>
            </p>
            <p style="color:#71717a;font-size:13px;margin:0">
              ⚡ Priority: <span style="color:${priorityColors[priority] ?? "#a1a1aa"}">${priority}</span>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <p style="color:#3f3f46;font-size:12px;margin:0;line-height:1.6">
          You're receiving this because you set a due date on this task in Focus.
        </p>
      </div>
    `,
  });

  console.log("Resend data:", data);
  console.log("Resend error:", error);

  if (error) throw new Error(`Failed to send email: ${error.message}`);
  return data;
}
