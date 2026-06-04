"use client";

import { useActionState } from "react";
import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {};

export function LoginForm(): React.JSX.Element {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-800" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
          placeholder="admin"
          aria-describedby="login-help"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-800" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
          placeholder="*************"
          aria-describedby="login-help login-error"
        />
      </div>

      <p id="login-help" className="text-sm leading-6 text-slate-600">
        Akun demo: username admin dan password *************.
      </p>

      {state.error ? (
        <p
          id="login-error"
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-sky-800 px-4 text-sm font-semibold text-white transition hover:bg-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Memproses" : "Masuk"}
      </button>
    </form>
  );
}
