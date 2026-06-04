import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage(): Promise<React.JSX.Element> {
  if (await isAuthenticated()) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_440px]">
        <section className="flex flex-col gap-6">
          <Link
            href="/"
            className="w-fit text-sm font-semibold text-sky-800 transition hover:text-sky-950 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            Takaful OCR Middleware
          </Link>
          <div className="flex max-w-2xl flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
              Secure operator access
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Masuk untuk memantau Email-to-OCR.
            </h1>
          </div>
          <div className="grid max-w-xl grid-cols-2 gap-3">
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <div className="mb-8 h-2 w-12 rounded-sm bg-sky-300" />
              <p className="text-sm font-semibold text-sky-950">Email captured</p>
              <p className="mt-2 text-3xl font-semibold text-sky-950">1,248</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="mb-8 h-2 w-12 rounded-sm bg-emerald-300" />
              <p className="text-sm font-semibold text-emerald-950">OCR completed</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-950">96.8%</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-8 h-2 w-12 rounded-sm bg-amber-300" />
              <p className="text-sm font-semibold text-amber-950">Avg. process</p>
              <p className="mt-2 text-3xl font-semibold text-amber-950">42s</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="mb-8 h-2 w-12 rounded-sm bg-indigo-300" />
              <p className="text-sm font-semibold text-indigo-950">OCR Engine jobs</p>
              <p className="mt-2 text-3xl font-semibold text-indigo-950">781</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-7 flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Login Admin
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Autentikasi demo memakai kredensial hardcoded untuk sesi internal.
            </p>
          </div>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
