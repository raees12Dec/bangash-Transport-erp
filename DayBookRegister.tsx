/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BookMarked,
  Printer,
  Download,
  Search,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Wallet,
  Landmark,
} from 'lucide-react';
import { DateRange, generateDayBook, formatCurrency } from '../services/accountingEngine';
import { CompanySettings } from '../types';
import { downloadHtmlFile, generateDayBookHtml } from '../services/htmlExport';
import { dbService } from '../services/db';

interface DayBookRegisterProps {
  dateRange: DateRange;
  setDateRange: (r: DateRange) => void;
  currency: string;
  settings?: CompanySettings;
}

export const DayBookRegister: React.FC<DayBookRegisterProps> = ({
  dateRange,
  setDateRange,
  currency,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const dayBook = generateDayBook(dateRange);

  const filteredEntries = dayBook.entries.filter((e) => {
    const matchesType =
      typeFilter === 'All' ||
      (typeFilter === 'Operational' && e.isOperationalOnly) ||
      (typeFilter === 'Financial' && !e.isOperationalOnly);
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      e.voucherNumber.toLowerCase().includes(term) ||
      (e.tripNumber && e.tripNumber.toLowerCase().includes(term)) ||
      e.partyName.toLowerCase().includes(term) ||
      e.description.toLowerCase().includes(term) ||
      e.transactionType.toLowerCase().includes(term);
    return matchesType && matchesSearch;
  });

  const exportCSV = () => {
    const headers = [
      'Date',
      'Voucher #',
      'Trip #',
      'Transaction Type',
      'Party / Payee',
      'Vehicle',
      'Description',
      'Cash In',
      'Cash Out',
      'Bank In',
      'Bank Out',
      'Running Cash',
      'Running Bank',
      'Posted By',
    ];

    const rows = filteredEntries.map((e) => [
      e.date,
      e.voucherNumber,
      e.tripNumber || '',
      e.transactionType,
      `"${e.partyName.replace(/"/g, '""')}"`,
      e.vehicleNumber || '',
      `"${e.description.replace(/"/g, '""')}"`,
      e.cashIn,
      e.cashOut,
      e.bankIn,
      e.bankOut,
      e.runningCashBalance,
      e.runningBankBalance,
      e.postedBy,
    ]);

    const csv =
      'data:text/csv;charset=utf-8,' +
      [
        `Day Book Register (${dateRange.startDate} to ${dateRange.endDate})`,
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\n');

    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `DayBook_${dateRange.startDate}_${dateRange.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadDayBookHtml = () => {
    const compSettings = settings || dbService.getState().settings;
    const html = generateDayBookHtml(filteredEntries, dayBook, compSettings, currency, dateRange);
    downloadHtmlFile(`Bangash_DayBook_${dateRange.startDate}_${dateRange.endDate}.html`, html);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <BookMarked className="w-6 h-6 text-blue-600" />
            <span>Master Day Book Register</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological audit log of all financial inflows/outflows alongside operational consignment dispatches.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadDayBookHtml}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
            title="Download Day Book as a standalone offline .HTML document"
          >
            <Download className="w-4 h-4" />
            <span>Download in .HTML</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Day Book</span>
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="block text-slate-600 font-bold mb-1">Search Day Book:</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search voucher, party, trip..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-600 font-bold mb-1">Entry Type Filter:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg font-medium"
          >
            <option value="All">All Operational &amp; Financial</option>
            <option value="Financial">Financial Transactions Only</option>
            <option value="Operational">Operational Consignments Only</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-600 font-bold mb-1">From Date:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="w-full p-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-slate-600 font-bold mb-1">To Date:</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="w-full p-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
          <span className="text-[10px] text-teal-700 font-bold uppercase">Cash In (Collected)</span>
          <div className="text-base font-black text-teal-900 mt-0.5">
            {formatCurrency(dayBook.totalCashIn, currency)}
          </div>
        </div>

        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
          <span className="text-[10px] text-rose-700 font-bold uppercase">Cash Out (Paid)</span>
          <div className="text-base font-black text-rose-900 mt-0.5">
            {formatCurrency(dayBook.totalCashOut, currency)}
          </div>
        </div>

        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <span className="text-[10px] text-indigo-700 font-bold uppercase">Bank In (Deposits)</span>
          <div className="text-base font-black text-indigo-900 mt-0.5">
            {formatCurrency(dayBook.totalBankIn, currency)}
          </div>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-[10px] text-amber-700 font-bold uppercase">Bank Out (Withdrawals)</span>
          <div className="text-base font-black text-amber-900 mt-0.5">
            {formatCurrency(dayBook.totalBankOut, currency)}
          </div>
        </div>

        <div className="p-3 bg-slate-900 text-white rounded-xl">
          <span className="text-[10px] text-teal-400 font-bold uppercase">Closing Cash in Safe</span>
          <div className="text-base font-black text-teal-300 mt-0.5">
            {formatCurrency(dayBook.closingCash, currency)}
          </div>
        </div>

        <div className="p-3 bg-slate-900 text-white rounded-xl">
          <span className="text-[10px] text-indigo-400 font-bold uppercase">Closing Bank Balances</span>
          <div className="text-base font-black text-indigo-300 mt-0.5">
            {formatCurrency(dayBook.closingBank, currency)}
          </div>
        </div>
      </div>

      {/* Day Book Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Voucher #</th>
                <th className="px-3 py-3">Trip #</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Party / Account</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3 text-right">Cash In</th>
                <th className="px-3 py-3 text-right">Cash Out</th>
                <th className="px-3 py-3 text-right">Bank In</th>
                <th className="px-3 py-3 text-right">Bank Out</th>
                <th className="px-3 py-3 text-right">Running Cash</th>
                <th className="px-3 py-3 text-right">Running Bank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredEntries.map((e) => (
                <tr
                  key={e.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    e.isOperationalOnly ? 'bg-blue-50/20' : ''
                  }`}
                >
                  <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{e.date}</td>
                  <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">{e.voucherNumber}</td>
                  <td className="px-3 py-2.5 text-blue-700 whitespace-nowrap">{e.tripNumber || '-'}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        e.isOperationalOnly
                          ? 'bg-blue-100 text-blue-800'
                          : e.cashIn > 0 || e.bankIn > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {e.transactionType}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-900 font-semibold max-w-[130px] truncate">
                    {e.partyName}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 max-w-[180px] truncate">{e.description}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-teal-700">
                    {e.cashIn > 0 ? formatCurrency(e.cashIn, currency) : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-rose-600">
                    {e.cashOut > 0 ? formatCurrency(e.cashOut, currency) : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-indigo-700">
                    {e.bankIn > 0 ? formatCurrency(e.bankIn, currency) : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-amber-700">
                    {e.bankOut > 0 ? formatCurrency(e.bankOut, currency) : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-800">
                    {formatCurrency(e.runningCashBalance, currency)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-800">
                    {formatCurrency(e.runningBankBalance, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
