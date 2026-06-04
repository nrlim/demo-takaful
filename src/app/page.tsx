import Link from "next/link";
import {
  Mail,
  Filter,
  Cpu,
  LayoutDashboard,
  ArrowRight,
  ShieldCheck,
  ChevronRight
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-blue-600 text-white">
            <ShieldCheck size={18} />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            Takaful OCR Middleware
          </h1>
        </div>
        <div>
          <Link
            href="/login"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-colors"
          >
            Access Dashboard
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-grow flex flex-col items-center justify-center px-6 py-20 bg-white">
        <div className="max-w-4xl w-full text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6">
            Automated Document Intake
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            A seamless middleware solution connecting secure IMAP email ingestion with advanced Core OCR Engine processing, providing real-time visibility into document pipelines.
          </p>
        </div>

        {/* Visual Pipeline Diagram */}
        <div className="max-w-5xl w-full">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">

            {/* Step 1 */}
            <div className="flex flex-col items-center w-full md:w-1/4">
              <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded flex items-center justify-center shadow-sm mb-4 relative">
                <Mail size={32} className="text-blue-500" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-100 border border-blue-200 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">1</div>
              </div>
              <h3 className="font-semibold text-slate-900">IMAP Ingestion</h3>
              <p className="text-xs text-slate-500 text-center mt-2">Monitors configured mailboxes and catches incoming emails.</p>
            </div>

            <ChevronRight size={32} className="text-slate-300 hidden md:block" />
            <div className="h-8 w-px bg-slate-300 block md:hidden"></div>

            {/* Step 2 */}
            <div className="flex flex-col items-center w-full md:w-1/4">
              <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded flex items-center justify-center shadow-sm mb-4 relative">
                <Filter size={32} className="text-indigo-500" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">2</div>
              </div>
              <h3 className="font-semibold text-slate-900">Document Filter</h3>
              <p className="text-xs text-slate-500 text-center mt-2">Extracts PDF attachments and prepares file metadata.</p>
            </div>

            <ChevronRight size={32} className="text-slate-300 hidden md:block" />
            <div className="h-8 w-px bg-slate-300 block md:hidden"></div>

            {/* Step 3 */}
            <div className="flex flex-col items-center w-full md:w-1/4">
              <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded flex items-center justify-center shadow-sm mb-4 relative">
                <Cpu size={32} className="text-purple-500" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-100 border border-purple-200 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">3</div>
              </div>
              <h3 className="font-semibold text-slate-900">Core OCR Engine</h3>
              <p className="text-xs text-slate-500 text-center mt-2">Sends documents securely for AI-powered OCR processing.</p>
            </div>

            <ChevronRight size={32} className="text-slate-300 hidden md:block" />
            <div className="h-8 w-px bg-slate-300 block md:hidden"></div>

            {/* Step 4 */}
            <div className="flex flex-col items-center w-full md:w-1/4">
              <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded flex items-center justify-center shadow-sm mb-4 relative">
                <LayoutDashboard size={32} className="text-green-500" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-100 border border-green-200 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">4</div>
              </div>
              <h3 className="font-semibold text-slate-900">System Dashboard</h3>
              <p className="text-xs text-slate-500 text-center mt-2">Displays real-time transaction logs and OCR success rates.</p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} Takaful Middleware Systems. Enterprise Edition.</p>
      </footer>
    </main>
  );
}
