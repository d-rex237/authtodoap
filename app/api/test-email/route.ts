import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev", // free default, no domain needed
    to: "rexemily850@gmail.com", // must be your own email for testing
    subject: "Focus app test email",
    html: "<p>Resend is working! 🎉</p>",
  });

  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ data });
}
