import React from 'react';

interface PaymentStatusBadgeProps {
  totalAmount?: number;
  paidAmount?: number;
  balance?: number;
  currencySymbol?: string;
  showDetails?: boolean;
}

export function PaymentStatusBadge({
  totalAmount = 0,
  paidAmount = 0,
  balance,
  currencySymbol = '₹',
  showDetails = true,
}: PaymentStatusBadgeProps) {
  const calcBalance = balance !== undefined ? balance : totalAmount - paidAmount;

  if (totalAmount <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
        Enquiry
      </span>
    );
  }

  if (calcBalance <= 0 && paidAmount > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Paid
      </span>
    );
  }

  if (paidAmount > 0 && calcBalance > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        {showDetails ? `Partial (${currencySymbol}${calcBalance.toLocaleString()} due)` : 'Partial'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
      {showDetails ? `Unpaid (${currencySymbol}${calcBalance.toLocaleString()})` : 'Unpaid'}
    </span>
  );
}
