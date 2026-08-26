import { Sparkles, CheckCircle2, ShieldCheck, FileText, Printer, Smartphone, Layers, X, GitCommit } from 'lucide-react';
import { Modal, Button, Badge } from '@/components/ui';

interface ReleaseNotesModalProps {
  open: boolean;
  onClose: () => void;
}

export const APP_VERSION = 'v1.4.1';
export const APP_BUILD = '5842382';
export const RELEASE_DATE = '26 Aug 2026';

export function ReleaseNotesModal({ open, onClose }: ReleaseNotesModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="What's New & Release Notes"
      subtitle={`Studio ERP ${APP_VERSION} (Build ${APP_BUILD}) — Released ${RELEASE_DATE}`}
    >
      <div className="space-y-6 text-sm">
        {/* Version Hero Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-800 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-xs font-mono font-bold">
                {APP_VERSION} CURRENT RELEASE
              </Badge>
              <span className="text-xs text-teal-200 font-mono">Commit #{APP_BUILD}</span>
            </div>
            <h3 className="text-lg font-extrabold tracking-tight">PDF Exporting & Shoot Voucher Update</h3>
            <p className="text-xs text-teal-100/90 leading-relaxed">
              Complete PDF layout overhaul, dedicated Shoot Order Vouchers, and multi-page duplicate prevention.
            </p>
          </div>
          <div className="shrink-0">
            <Button size="sm" variant="secondary" onClick={onClose} className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              Got it
            </Button>
          </div>
        </div>

        {/* Feature Enhancements & Bug Fixes Grid */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
            <Sparkles size={14} className="text-teal-600" /> New Features & Enhancements
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-1">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <Printer size={16} className="text-teal-600 shrink-0" />
                <span>Dedicated Shoot Order Voucher</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Click "Print Shoot Voucher" on any booking to generate an official Shoot Confirmation with studio logo, client details, logistics, financial breakdown, and signature box.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-1">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <FileText size={16} className="text-teal-600 shrink-0" />
                <span>1-Page Clean PDF Exports</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Fixed 2-page repetition bug in Chrome PDF print exports. Background pages are automatically hidden during print, outputting exactly 1 pristine single page.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-1">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <Smartphone size={16} className="text-teal-600 shrink-0" />
                <span>Mobile & PDF Alignment Fix</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Replaced grid columns with responsive flexbox wrappers. BILL TO and EVENT DETAILS no longer collide or overlap on mobile or narrow PDF previews.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-1">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <ShieldCheck size={16} className="text-teal-600 shrink-0" />
                <span>React Error Boundary Protection</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Added global React ErrorBoundary to prevent blank screens. If an error occurs, a recovery card with a "Reload Page" button is displayed.
              </p>
            </div>
          </div>
        </div>

        {/* Bug Fixes & Resolved Issues */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" /> Resolved Issues Log
          </h4>
          <ul className="space-y-2 text-xs text-gray-600">
            <li className="flex items-start gap-2 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/60">
              <span className="font-bold text-emerald-700 shrink-0">[Fixed]</span>
              <span>Fixed Chrome CSS print bug (`position: fixed` header repetition) where receipts duplicated 2 times on Page 1 and Page 2.</span>
            </li>
            <li className="flex items-start gap-2 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/60">
              <span className="font-bold text-emerald-700 shrink-0">[Fixed]</span>
              <span>Fixed background text bleeding during print where `A n i s h W e d d i n g ...` collapsed into vertical 1-character strips.</span>
            </li>
            <li className="flex items-start gap-2 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/60">
              <span className="font-bold text-emerald-700 shrink-0">[Fixed]</span>
              <span>Fixed React Error #310 caused by conditional hook declarations before early returns in `InvoiceDetailPage.tsx`.</span>
            </li>
            <li className="flex items-start gap-2 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/60">
              <span className="font-bold text-emerald-700 shrink-0">[Fixed]</span>
              <span>Updated `formatCurrency` to gracefully handle `null`, `undefined`, or missing subtotal figures without throwing errors.</span>
            </li>
          </ul>
        </div>

        {/* Version History Table */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
            <GitCommit size={14} className="text-teal-600" /> Version Control History
          </h4>
          <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Version</th>
                  <th className="py-2 px-3">Commit Hash</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Primary Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                <tr className="bg-teal-50/30">
                  <td className="py-2 px-3 font-bold text-teal-800">v1.4.1</td>
                  <td className="py-2 px-3 font-mono text-gray-500">5842382</td>
                  <td className="py-2 px-3">26 Aug 2026</td>
                  <td className="py-2 px-3 font-semibold text-gray-900">Stop 2-page repetition in PDF exports</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-teal-800">v1.4.0</td>
                  <td className="py-2 px-3 font-mono text-gray-500">aa2716b</td>
                  <td className="py-2 px-3">26 Aug 2026</td>
                  <td className="py-2 px-3">Shoot Order Voucher & PDF print-area isolation</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-teal-800">v1.3.9</td>
                  <td className="py-2 px-3 font-mono text-gray-500">e7d6514</td>
                  <td className="py-2 px-3">26 Aug 2026</td>
                  <td className="py-2 px-3">Mobile & PDF alignment layout fix</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-teal-800">v1.3.8</td>
                  <td className="py-2 px-3 font-mono text-gray-500">47145ee</td>
                  <td className="py-2 px-3">26 Aug 2026</td>
                  <td className="py-2 px-3">React Error #310 fix & ErrorBoundary addition</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
