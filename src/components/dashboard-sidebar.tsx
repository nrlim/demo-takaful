"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Inbox,
  LogOut,
  MailCheck,
  MessagesSquare,
  FileSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Server,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";

const menuItems = [
  {
    href: "/dashboard",
    label: "Overview",
    description: "OCR monitoring",
    icon: BarChart3,
  },
  {
    href: "/dashboard/mail-server",
    label: "Mail Server",
    description: "IMAP connection",
    icon: Server,
  },
  {
    href: "/dashboard/messages",
    label: "Messages",
    description: "OCR false queue",
    icon: MessagesSquare,
  },
  {
    href: "/dashboard/ocr-results",
    label: "OCR Results",
    description: "Rendered JSON",
    icon: FileSearch,
  },
  {
    href: "/dashboard/catch-rules",
    label: "OCR Inboxes",
    description: "Recipient catch rules",
    icon: MailCheck,
  },
  {
    href: "/dashboard/configuration",
    label: "Configuration",
    description: "OCR API keys",
    icon: SlidersHorizontal,
  },
] satisfies Array<{
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}>;

const expandedWidth = "13rem";
const collapsedWidth = "5rem";

export function DashboardSidebar(): React.JSX.Element {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--dashboard-sidebar-width",
      isCollapsed ? collapsedWidth : expandedWidth,
    );
  }, [isCollapsed]);

  return (
    <aside className="border-b border-slate-200 bg-white transition-[width] duration-200 lg:fixed lg:inset-y-0 lg:left-0 lg:w-[var(--dashboard-sidebar-width,13rem)] lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col relative">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} gap-2`}>
            <Link
              href="/"
              className="flex min-w-0 items-center gap-3 focus:outline-none focus:ring-2 focus:ring-sky-200"
              aria-label="Takaful OCR Middleware Console"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sky-800 text-white">
                <Inbox className="size-5" aria-hidden />
              </span>
              {!isCollapsed ? (
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-950">Takaful OCR</span>
                  <span className="block truncate text-xs text-slate-500">Middleware Console</span>
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((current) => !current)}
          className="absolute -right-4 top-6 hidden size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200 lg:flex shadow-sm z-50"
          aria-label={isCollapsed ? "Expand sidebar" : "Minimize sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen className="size-4" aria-hidden /> : <PanelLeftClose className="size-4" aria-hidden />}
        </button>

        <nav className="flex flex-1 gap-2 overflow-x-auto px-3 py-4 lg:flex-col lg:overflow-visible" aria-label="Dashboard menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                title={isCollapsed ? item.label : undefined}
                className={`flex min-w-48 items-center gap-3 rounded-md border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-sky-200 lg:min-w-0 ${isCollapsed ? "lg:justify-center lg:px-0" : ""
                  } ${isActive
                    ? "border-sky-200 bg-sky-50 text-sky-950"
                    : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
                  }`}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                {!isCollapsed ? (
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs opacity-75">{item.description}</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          {!isCollapsed ? (
            <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                <Settings className="size-4" aria-hidden />
                System Online
              </div>
              <p className="mt-1 text-xs leading-5 text-emerald-800">IMAP monitor and Core OCR Engine are reachable.</p>
            </div>
          ) : null}
          <form action={logoutAction}>
            <button
              type="submit"
              title={isCollapsed ? "Logout" : undefined}
              className={`flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-red-300 hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-100 ${isCollapsed ? "px-0" : ""
                }`}
            >
              <LogOut className="size-4" aria-hidden />
              {!isCollapsed ? "Logout" : null}
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
