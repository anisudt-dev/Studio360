import { useMemo } from 'react';
import { Plus, FileText, Printer, Share2 } from 'lucide-react';
import { useInvoices } from '@/lib/hooks';
import { useNav } from '@/lib/nav';
import { Card, Button, PageHeader, EmptyState, Skeleton, Badge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';

const CURRENCY = '₹';

export function InvoicesPage() {
  const { invoices, loading } = useInvoices();
  const { navigate, openModal } = useNav();

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-40" /><Skeleton className="h-64" /></div>;

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} invoices`}
        actions={<Button onClick={() => openModal('addInvoice', {})}><Plus size={16} /> Create Invoice</Button>}
      />

      {invoices.length === 0 ? (
        <Card><EmptyState icon={<FileText size={26} />} title="No invoices yet" description="Create an invoice from any booking" action={<Button onClick={() => openModal('addInvoice', {})}><Plus size={16} /> Create Invoice</Button>} /></Card>
      ) : (
        <>
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="font-medium py-3 px-4">Invoice #</th>
                  <th className="font-medium py-3 px-4">Customer</th>
                  <th className="font-medium py-3 px-4">Event</th>
                  <th className="font-medium py-3 px-4">Issued</th>
                  <th className="font-medium py-3 px-4">Due</th>
                  <th className="font-medium py-3 px-4 text-right">Amount</th>
                  <th className="font-medium py-3 px-4 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => (
                  <tr key={inv.id} onClick={() => navigate({ page: 'invoice', id: inv.id })} className="hover:bg-gray-50/50 cursor-pointer">
                    <td className="py-3 px-4 font-semibold text-gray-900">{inv.invoice_number}</td>
                    <td className="py-3 px-4 text-gray-600">{inv.booking?.customer?.name || '—'}</td>
                    <td className="py-3 px-4 text-gray-500">{inv.booking?.event_type || '—'}</td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(inv.issue_date)}</td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(inv.due_date)}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900 whitespace-nowrap">{formatCurrency(inv.total, CURRENCY)}</td>
                    <td className="py-3 px-4 text-gray-300"><Printer size={15} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="md:hidden space-y-2">
            {invoices.map((inv) => (
              <Card key={inv.id} onClick={() => navigate({ page: 'invoice', id: inv.id })} hover className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500">{inv.booking?.customer?.name} · {formatDate(inv.issue_date)}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(inv.total, CURRENCY)}</span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
