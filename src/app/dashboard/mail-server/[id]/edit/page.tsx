import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateMailServerAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditMailServerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const connection = await prisma.mailServerConnection.findUnique({ where: { id } }).catch(() => null);

  if (!connection) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link href="/dashboard/mail-server" className="text-sm font-semibold text-sky-800 hover:text-sky-950">
          Back to Mail Server
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Edit Mail Server</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Update konfigurasi IMAP. Password boleh dikosongkan jika tidak ingin diganti.
        </p>
      </header>

      <form action={updateMailServerAction} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <input type="hidden" name="connectionId" value={connection.id} />
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium text-slate-800">Connection name</label>
          <input id="name" name="name" defaultValue={connection.name} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" required />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="host" className="text-sm font-medium text-slate-800">IMAP host</label>
          <input id="host" name="host" defaultValue={connection.host} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" required />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="port" className="text-sm font-medium text-slate-800">Port</label>
          <input id="port" name="port" type="number" defaultValue={connection.port} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" required />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="mailbox" className="text-sm font-medium text-slate-800">Mailboxes</label>
          <input id="mailbox" name="mailbox" defaultValue={connection.mailbox} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" required />
          <p className="text-xs leading-5 text-slate-500">Contoh: INBOX,Junk,Junk Email,Spam,[Gmail]/Spam</p>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="username" className="text-sm font-medium text-slate-800">Username</label>
          <input id="username" name="username" defaultValue={connection.username} className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" required />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-800">New password / app password</label>
          <input id="password" name="password" type="password" className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100" placeholder="Leave blank to keep existing password" />
        </div>
        <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800">
            <input type="checkbox" name="secure" value="true" defaultChecked={connection.secure} className="size-4 accent-sky-800" />
            Use secure TLS connection
          </label>
          <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800">
            <input type="checkbox" name="onlyUnread" value="true" defaultChecked={connection.onlyUnread} className="size-4 accent-sky-800" />
            Fetch unread messages only
          </label>
        </div>
        <div className="flex gap-3 md:col-span-2">
          <button type="submit" className="h-11 rounded-md bg-sky-800 px-4 text-sm font-semibold text-white transition hover:bg-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-200">
            Save and test connection
          </button>
          <Link href="/dashboard/mail-server" className="inline-flex h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
