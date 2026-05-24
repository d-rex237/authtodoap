import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await currentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080808] text-white">
      {/* ── Animated background grid ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-purple-700/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-violet-900/10 blur-[100px]" />

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 md:px-16">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 shadow-lg shadow-purple-500/30">
            <span className="text-sm font-black">F</span>
          </div>
          <span
            className="text-xl font-black tracking-tight"
            style={{ fontFamily: "'Georgia', serif", letterSpacing: "-0.04em" }}
          >
            focus.
          </span>
        </div>
        <SignInButton mode="modal">
          <button className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-5 py-2 text-sm font-medium text-zinc-300 backdrop-blur transition hover:border-zinc-700 hover:text-white">
            Sign in
          </button>
        </SignInButton>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto flex min-h-[85vh] max-w-5xl flex-col items-center justify-center px-6 text-center">
        {/* Eyebrow badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
          Your productivity, reimagined
        </div>

        {/* Headline */}
        <h1
          className="mb-6 text-6xl font-black leading-none tracking-tight md:text-8xl"
          style={{ fontFamily: "'Georgia', serif", letterSpacing: "-0.04em" }}
        >
          Stop{" "}
          <span className="relative inline-block">
            <span className="relative z-10 bg-gradient-to-r from-purple-400 via-violet-400 to-purple-300 bg-clip-text text-transparent">
              forgetting.
            </span>
            {/* Underline decoration */}
            <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-gradient-to-r from-purple-500/60 to-transparent" />
          </span>
          <br />
          Start doing.
        </h1>

        {/* Subheading */}
        <p className="mb-12 max-w-xl text-base leading-relaxed text-zinc-500 md:text-lg">
          A beautifully minimal task manager that keeps you focused on what
          actually matters — organized by priority, category, and due time.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <SignUpButton mode="modal">
            <button className="group relative overflow-hidden rounded-2xl bg-purple-600 px-8 py-4 text-base font-semibold shadow-2xl shadow-purple-500/25 transition hover:bg-purple-500 hover:shadow-purple-500/40">
              <span className="relative z-10">Get started free</span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            </button>
          </SignUpButton>

          <SignInButton mode="modal">
            <button className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-8 py-4 text-base font-medium text-zinc-300 backdrop-blur transition hover:border-zinc-600 hover:text-white">
              Sign in
              <span className="text-zinc-600">→</span>
            </button>
          </SignInButton>
        </div>

        {/* Social proof */}
        <p className="mt-10 text-xs text-zinc-700">
          No credit card required · Free forever on basic plan
        </p>
      </section>

      {/* ── Feature cards ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              icon: "◎",
              title: "Priority-first",
              desc: "Tag every task as high, medium, or low. Always know what needs your attention first.",
              color: "from-red-950/40 to-zinc-900",
              accent: "text-red-400",
            },
            {
              icon: "🗓",
              title: "Due date reminders",
              desc: "Set a date and time. Get notified before it's too late. Never miss a deadline again.",
              color: "from-purple-950/40 to-zinc-900",
              accent: "text-purple-400",
            },
            {
              icon: "⊞",
              title: "Organized by category",
              desc: "Work, Design, Personal — keep every corner of your life clearly separated.",
              color: "from-green-950/40 to-zinc-900",
              accent: "text-green-400",
            },
          ].map((f) => (
            <div
              key={f.title}
              className={`rounded-2xl border border-zinc-800/60 bg-gradient-to-br ${f.color} p-6 transition hover:border-zinc-700/80`}
            >
              <span className={`text-2xl ${f.accent}`}>{f.icon}</span>
              <h3 className="mt-4 text-base font-semibold text-zinc-100">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA strip ── */}
      <section className="relative z-10 border-t border-zinc-800/60 px-6 py-16 text-center">
        <p
          className="mb-6 text-3xl font-black tracking-tight text-zinc-200 md:text-4xl"
          style={{ fontFamily: "'Georgia', serif", letterSpacing: "-0.03em" }}
        >
          Ready to focus?
        </p>
        <SignUpButton mode="modal">
          <button className="rounded-2xl bg-purple-600 px-8 py-4 text-sm font-semibold shadow-xl shadow-purple-500/20 transition hover:bg-purple-500">
            Create your free account →
          </button>
        </SignUpButton>
      </section>
    </main>
  );
}
