/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  Download,
  Printer,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Building,
  CheckCircle,
} from 'lucide-react';
import { Customer, CompanySettings } from '../types';
import {
  DateRange,
  generateCustomerLedger,
  formatCurrency,
} from '../services/accountingEngine';
import {
  downloadHtmlFile,
  generateLedgerHtml,
  generatePaymentReceiptHtml,
  PaymentReceiptData,
} from '../services/htmlExport';
import { CustomerLedgerEntry } from '../types';
import { dbService } from '../services/db';

interface CustomerLedgerViewProps {
  customers: Customer[];
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  dateRange: DateRange;
  setDateRange: (r: DateRange) => void;
  currency: string;
  onPrintStatement: (customer: Customer, ledger: any) => void;
  settings?: CompanySettings;
}

export const CustomerLedgerView: React.FC<CustomerLedgerViewProps> = ({
  customers,
  selectedCustomerId,
  setSelectedCustomerId,
  dateRange,
  setDateRange,
  currency,
  onPrintStatement,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const activeCustomer =
    customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const ledgerResult = activeCustomer
    ? generateCustomerLedger(activeCustomer.id, dateRange)
    : null;

  const handleDownloadLedgerHtml = () => {
    if (!activeCustomer || !ledgerResult) return;
    const compSettings = settings || dbService.getState().settings;
    const html = generateLedgerHtml(activeCustomer, ledgerResult, compSettings, currency);
    downloadHtmlFile(`Statement_${activeCustomer.companyName.replace(/\s+/g, '_')}_${dateRange.startDate}.html`, html);
  };

  const handlePrintEntryReceipt = (entry: CustomerLedgerEntry) => {
    if (!activeCustomer) return;
    const compSettings = settings || dbService.getState().settings;
    const receiptData: PaymentReceiptData = {
      receiptNumber: entry.voucherNumber,
      receiptDate: entry.date,
      receivedFrom: activeCustomer.companyName,
      tripNumber: entry.tripNumber,
      amount: entry.credit,
      paymentMethod: 'Cash / Bank Transfer',
      towardsParticulars: entry.description,
    };
    const html = generatePaymentReceiptHtml(receiptData, compSettings, currency);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        try {
          win.print();
        } catch (e) {
          console.error(e);
        }
      }, 500);
    } else {
      downloadHtmlFile(`Receipt_${entry.voucherNumber}.html`, html);
    }
  };

  const exportCSV = () => {
    if (!ledgerResult || !activeCustomer) return;
    const headers = [
      'Date',
      'Transaction Type',
      'Voucher #',
      'Trip #',
      'Invoice #',
      'Description',
      'Debit (Billed)',
      'Credit (Paid)',
      'Running Balance',
    ];
    const rows = ledgerResult.entries.map((e) => [
      e.date,
      e.transactionType,
      e.voucherNumber,
      e.tripNumber || '',
      e.invoiceNumber || '',
      `"${e.description.replace(/"/g, '""')}"`,
      e.debit,
      e.credit,
      e.runningBalance,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `Customer Ledger: ${activeCustomer.companyName}`,
        `Period: ${dateRange.startDate} to ${dateRange.endDate}`,
        `Opening Balance: ${ledgerResult.openingBalance}`,
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        `Closing Balance: ${ledgerResult.closingBalance}`,
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Ledger_${activeCustomer.companyName.replace(/\s+/g, '_')}_${dateRange.startDate}_${dateRange.endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <span>Automatic Customer Party Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time double-entry running balance derived from posted freight invoices and bank/cash receipts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeCustomer && ledgerResult && (
            <button
              onClick={handleDownloadLedgerHtml}
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Download customer statement as a standalone offline .HTML document"
            >
              <Download className="w-4 h-4" />
              <span>Download in .HTML</span>
            </button>
          )}

          {activeCustomer && ledgerResult && (
            <button
              onClick={() => onPrintStatement(activeCustomer, ledgerResult)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Statement</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Customer & Date Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block text-slate-600 font-bold mb-1">Select Customer Account:</label>
          <select
            value={selectedCustomerId || activeCustomer?.id}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName} ({c.city})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-600 font-bold mb-1">Period Start Date:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="w-full p-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-slate-600 font-bold mb-1">Period End Date:</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="w-full p-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      {/* Customer Summary Cards */}
      {activeCustomer && ledgerResult && (
        <>
          <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">Account Holder</div>
              <h3 className="text-lg font-black text-white">{activeCustomer.companyName}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tax NTN: {activeCustomer.taxRegistrationNumber || 'N/A'} • Terms: {activeCustomer.paymentTerms} • Credit Limit: {formatCurrency(activeCustomer.creditLimit, currency)}
              </p>
            </div>

            <div className="flex items-center space-x-6 text-right">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Opening Balance</span>
                <div className="text-base font-bold text-slate-200">
                  {formatCurrency(ledgerResult.openingBalance, currency)}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Closing Balance</span>
                <div className="text-2xl font-black text-emerald-400">
                  {formatCurrency(ledgerResult.closingBalance, currency)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold uppercase">Opening Balance</span>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {formatCurrency(ledgerResult.openingBalance, currency)}
              </div>
              <span className="text-[10px] text-slate-400">Prior to {dateRange.startDate}</span>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-xs text-blue-700 font-semibold uppercase flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Total Debits (Invoices)
              </span>
              <div className="text-lg font-bold text-blue-900 mt-1">
                {formatCurrency(ledgerResult.totalDebit, currency)}
              </div>
              <span className="text-[10px] text-blue-600">Freight billed in period</span>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs text-emerald-700 font-semibold uppercase flex items-center">
                <ArrowDownLeft className="w-3.5 h-3.5 mr-1" /> Total Credits (Receipts)
              </span>
              <div className="text-lg font-bold text-emerald-900 mt-1">
                {formatCurrency(ledgerResult.totalCredit, currency)}
              </div>
              <span className="text-[10px] text-emerald-600">Payments collected</span>
            </div>

            <div className="p-4 bg-slate-100 rounded-xl border border-slate-300">
              <span className="text-xs text-slate-700 font-semibold uppercase">Net Closing Receivable</span>
              <div className="text-lg font-black text-slate-900 mt-1">
                {formatCurrency(ledgerResult.closingBalance, currency)}
              </div>
              <span className="text-[10px] text-slate-500">Opening + Debits − Credits</span>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Transaction Type</th>
                    <th className="px-4 py-3.5">Voucher / Ref #</th>
                    <th className="px-4 py-3.5">Trip / Invoice #</th>
                    <th className="px-4 py-3.5">Description</th>
                    <th className="px-4 py-3.5 text-right">Debit (Billed)</th>
                    <th className="px-4 py-3.5 text-right">Credit (Received)</th>
                    <th className="px-4 py-3.5 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Opening Balance Row */}
                  <tr className="bg-slate-50/60 font-semibold text-slate-700">
                    <td className="px-4 py-3">{dateRange.startDate}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                        OPENING BALANCE
                      </span>
                    </td>
                    <td className="px-4 py-3">-</td>
                    <td className="px-4 py-3">-</td>
                    <td className="px-4 py-3 text-slate-600 italic">Balance brought forward from prior ledger period</td>
                    <td className="px-4 py-3 text-right">-</td>
                    <td className="px-4 py-3 text-right">-</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatCurrency(ledgerResult.openingBalance, currency)}
                    </td>
                  </tr>

                  {ledgerResult.entries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        No transactions found for this customer within the selected date range.
                      </td>
                    </tr>
                  ) : (
                    ledgerResult.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700">{entry.date}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              entry.transactionType === 'Freight Invoice'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {entry.transactionType}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span>{entry.voucherNumber}</span>
                            {entry.transactionType === 'Customer Receipt' && (
                              <button
                                type="button"
                                onClick={() => handlePrintEntryReceipt(entry)}
                                className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition cursor-pointer"
                                title="Print Customer Money Receipt"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {entry.tripNumber || entry.invoiceNumber || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-xs">{entry.description}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">
                          {entry.debit > 0 ? formatCurrency(entry.debit, currency) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          {entry.credit > 0 ? formatCurrency(entry.credit, currency) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-900">
                          {formatCurrency(entry.runningBalance, currency)}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Summary Footer Row */}
                  <tr className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={5} className="px-4 py-3 text-right uppercase tracking-wider text-[11px]">
                      Period Movement Totals &amp; Closing Balance:
                    </td>
                    <td className="px-4 py-3 text-right font-black text-blue-800">
                      {formatCurrency(ledgerResult.totalDebit, currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700">
                      {formatCurrency(ledgerResult.totalCredit, currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-base text-slate-950">
                      {formatCurrency(ledgerResult.closingBalance, currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
