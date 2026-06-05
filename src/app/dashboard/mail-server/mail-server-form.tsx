"use client";

import { useActionState } from "react";
import { connectMailServerAction, type MailServerActionState } from "./actions";

const initialState: MailServerActionState = {};

export function MailServerForm(): React.JSX.Element {
  const [state, formAction, pending] = useActionState(connectMailServerAction, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2" noValidate>
      <div className="md:col-span-2">
        <h2 className="text-lg font-semibold text-slate-950">Connect mail server</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Middleware akan membuka koneksi IMAP dan menyimpan konfigurasi untuk proses monitoring pesan masuk.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium text-slate-800">Connection name</label>
        <input id="name" name="name" className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" placeholder="Takaful claims IMAP" required />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="host" className="text-sm font-medium text-slate-800">IMAP host</label>
        <input id="host" name="host" className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" placeholder="imap.company.com" required />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="port" className="text-sm font-medium text-slate-800">Port</label>
        <input id="port" name="port" type="number" className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" defaultValue="993" required />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="mailbox" className="text-sm font-medium text-slate-800">Mailboxes</label>
        <input id="mailbox" name="mailbox" className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" defaultValue="INBOX,Junk,Junk Email,Spam,[Gmail]/Spam" required />
        <p className="text-xs leading-5 text-slate-500">Pisahkan dengan koma. Tambahkan folder Junk/Spam karena email test sering masuk ke sana.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm font-medium text-slate-800">Username</label>
        <input id="username" name="username" autoComplete="username" className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" placeholder="ocr-inbox@company.com" required />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-slate-800">Password / app password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" required />
      </div>

      <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
        <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800">
          <input type="checkbox" name="secure" value="true" defaultChecked className="size-4 accent-sky-800" />
          Use secure TLS connection
        </label>
        <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800">
          <input type="checkbox" name="onlyUnread" value="true" defaultChecked className="size-4 accent-sky-800" />
          Fetch unread messages only
        </label>
      </div>

      {state.error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 md:col-span-2">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 md:col-span-2">{state.message}</p>
      ) : null}

      <div className="md:col-span-2">
        <button type="submit" disabled={pending} className="h-11 rounded-md bg-sky-800 px-4 text-sm font-semibold text-white transition hover:bg-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60">
          {pending ? "Connecting" : "Connect and save"}
        </button>
      </div>
    </form>
  );
}
