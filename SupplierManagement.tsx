/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  DollarSign,
  Phone,
  MapPin,
  Clock,
  AlertTriangle,
  X,
  CreditCard,
  Printer,
  Download,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { Supplier, BankAccount, ExpenseVoucher, CompanySettings } from '../types';
import {
  DateFilterPeriod,
  DateRange,
  getDateRangeFromPeriod,
  formatCurrency,
  generateSupplierLedger,
} from '../services/accountingEngine';
import { dbService } from '../services/db';
import {
  downloadHtmlFile,
  generateSupplierLedgerHtml,
  generateReportHtml,
} from '../services/htmlExport';

interface SupplierManagementProps {
  suppliers: Supplier[];
  accounts: BankAccount[];
  vouchers: ExpenseVoucher[];
  currency: string;
  settings?: CompanySettings;
}

export const SupplierManagement: React.FC<SupplierManagementProps> = ({
  suppliers,
  accounts,
  vouchers,
  currency,
  settings,
}) => {
  // Navigation View: 'ONE_BY_ONE_LEDGER' or 'ALL_SUPPLIERS'
  const [viewMode, setViewMode] = useState<'ONE_BY_ONE_LEDGER' | 'ALL_SUPPLIERS'>('ONE_BY_ONE_LEDGER');

  // Selected Supplier for One-by-One view
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const activeSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];

  // Date Filtering: All Time, Daily, Weekly, Monthly, Yearly, Between 2 dates
  const [period, setPeriod] = useState<DateFilterPeriod>('All Time');
  const [customRange, setCustomRange] = useState<DateRange>({
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  });

  const activeDateRange = useMemo(() => {
    return getDateRangeFromPeriod(period, customRange.startDate, customRange.endDate);
  }, [period, customRange]);

  // Search filter inside ledger
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');

  // Search filter in All Suppliers master list
  const [masterSearchTerm, setMasterSearchTerm] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [paymentModalSupplier, setPaymentModalSupplier] = useState<Supplier | null>(null);

  // New Supplier Form
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState('Weekly Credit');
  const [notes, setNotes] = useState('');

  // Payment form
  const [payAmount, setPayAmount] = useState<number>(10000);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [payRef, setPayRef] = useState('');
  const [payRemarks, setPayRemarks] = useState('');

  // Current company settings fallback
  const compSettings = settings || dbService.getState().settings;

  // Previous & Next Supplier navigation
  const currentIndex = suppliers.findIndex((s) => s.id === (activeSupplier?.id || ''));
  const handlePrevSupplier = () => {
    if (currentIndex > 0) {
      setSelectedSupplierId(suppliers[currentIndex - 1].id);
    }
  };
  const handleNextSupplier = () => {
    if (currentIndex < suppliers.length - 1) {
      setSelectedSupplierId(suppliers[currentIndex + 1].id);
    }
  };

  // Generate the Supplier Party Ledger using the central accounting engine
  const ledgerResult = useMemo(() => {
    if (!activeSupplier) return null;
    return generateSupplierLedger(activeSupplier.id, activeDateRange, period);
  }, [activeSupplier, activeDateRange, period, vouchers]);

  // Filter ledger entries by search term if typed
  const filteredLedgerEntries = useMemo(() => {
    if (!ledgerResult) return [];
    if (!ledgerSearchTerm.trim()) return ledgerResult.entries;
    const term = ledgerSearchTerm.toLowerCase().trim();
    return ledgerResult.entries.filter(
      (e) =>
        e.voucherNumber.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term) ||
        e.transactionType.toLowerCase().includes(term) ||
        (e.category && e.category.toLowerCase().includes(term))
    );
  }, [ledgerResult, ledgerSearchTerm]);

  // Print / PDF Option for the active supplier party ledger
  const handlePrintLedger = () => {
    if (!activeSupplier || !ledgerResult) return;
    const html = generateSupplierLedgerHtml(activeSupplier, ledgerResult, compSettings, currency);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) win.focus();
  };

  // Download standalone .HTML report
  const handleDownloadLedgerHtml = () => {
    if (!activeSupplier || !ledgerResult) return;
    const html = generateSupplierLedgerHtml(activeSupplier, ledgerResult, compSettings, currency);
    const fileName = `Supplier_Ledger_${activeSupplier.name.replace(/\s+/g, '_')}_${activeDateRange.startDate}_${activeDateRange.endDate}.html`;
    downloadHtmlFile(fileName, html);
  };

  // Export CSV for Excel
  const handleExportCsv = () => {
    if (!activeSupplier || !ledgerResult) return;
    const headers = [
      'Date',
      'Voucher / Ref #',
      'Transaction Type',
      'Category',
      'Description',
      'Purchases / Billed (Credit)',
      'Paid Disbursed (Debit)',
      'Running Balance',
    ];
    const rows = ledgerResult.entries.map((e) => [
      e.date,
      `"${e.voucherNumber}"`,
      `"${e.transactionType}"`,
      `"${e.category || ''}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      e.credit,
      e.debit,
      e.runningBalance,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `Supplier / Party Ledger: ${activeSupplier.name}`,
        `Period: ${activeDateRange.startDate} to ${activeDateRange.endDate} (${period})`,
        `Opening Balance: ${ledgerResult.openingBalance}`,
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        `Total Billed (Credit):,${ledgerResult.totalCredit},Total Paid (Debit):,${ledgerResult.totalDebit},Closing Balance:,${ledgerResult.closingBalance}`,
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Ledger_${activeSupplier.name.replace(/\s+/g, '_')}_${activeDateRange.startDate}_${activeDateRange.endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Master Suppliers table search filter
  const filteredMasterSuppliers = useMemo(() => {
    const term = masterSearchTerm.toLowerCase();
    return suppliers.filter(
      (s) =>
        !term ||
        s.name.toLowerCase().includes(term) ||
        s.contactPerson.toLowerCase().includes(term) ||
        s.mobileNumber.toLowerCase().includes(term)
    );
  }, [suppliers, masterSearchTerm]);

  const totalPayables = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);

  // Add Supplier Handler
  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newSup = dbService.addSupplier({
      name: name.trim(),
      contactPerson,
      mobileNumber,
      address,
      openingBalance,
      paymentTerms,
      notes,
      active: true,
    });
    setName('');
    setContactPerson('');
    setMobileNumber('');
    setAddress('');
    setOpeningBalance(0);
    setNotes('');
    setIsAddModalOpen(false);
    setSelectedSupplierId(newSup.id);
  };

  // Record Payment Handler
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalSupplier || payAmount <= 0) return;

    const acc = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
    if (!acc) return;

    dbService.addCashBankTransaction({
      voucherNumber: dbService.generateNextVoucherNumber('TX-SUP-'),
      date: new Date().toISOString().substring(0, 10),
      transactionType: 'Supplier Payment',
      accountId: acc.id,
      accountName: acc.accountName,
      amount: payAmount,
      partyType: 'Supplier',
      partyId: paymentModalSupplier.id,
      partyName: paymentModalSupplier.name,
      referenceNumber: payRef || `SUP-PAY-${Math.floor(1000 + Math.random() * 9000)}`,
      description: payRemarks || `Payment to supplier ${paymentModalSupplier.name}`,
      postedBy: 'Accounts Payable',
      status: 'Posted',
    });

    // Update supplier current balance
    paymentModalSupplier.currentBalance = Math.max(0, paymentModalSupplier.currentBalance - payAmount);
    setPaymentModalSupplier(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center space-x-2.5">
            <Building2 className="w-6 h-6 text-blue-600 shrink-0" />
            <span>Suppliers &amp; Party Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Individual vendor running ledgers, itemized bills (Tyres, Parts, Diesel, Batteries), payment debits, and printable statements
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Top View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300">
            <button
              onClick={() => setViewMode('ONE_BY_ONE_LEDGER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'ONE_BY_ONE_LEDGER'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Party Ledger (One-by-One)
            </button>
            <button
              onClick={() => setViewMode('ALL_SUPPLIERS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'ALL_SUPPLIERS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Suppliers Master List ({suppliers.length})
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Supplier</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: ONE-BY-ONE PARTY LEDGER WITH DROPDOWN & DATES     */}
      {/* ========================================================= */}
      {viewMode === 'ONE_BY_ONE_LEDGER' && (
        <div className="space-y-6">
          {/* Supplier Selector & Time Filter Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            {/* ROW 1: DROPDOWN SELECTOR & PREV/NEXT BUTTONS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex flex-1 items-center gap-2.5">
                <label className="text-xs font-extrabold text-slate-700 whitespace-nowrap">
                  Select Supplier / Vendor:
                </label>
                <div className="relative flex-1 max-w-lg">
                  <select
                    value={activeSupplier?.id || ''}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full p-2.5 pr-8 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
                  >
                    {suppliers.map((s, idx) => (
                      <option key={s.id} value={s.id}>
                        {idx + 1}. {s.name} — Due: {formatCurrency(s.currentBalance, currency)} ({s.paymentTerms})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* One-by-One Navigation Buttons */}
              <div className="flex items-center gap-1.5 self-end md:self-center">
                <button
                  type="button"
                  onClick={handlePrevSupplier}
                  disabled={currentIndex <= 0}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                  title="View previous supplier"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <span className="text-xs text-slate-500 font-bold px-2">
                  {currentIndex + 1} of {suppliers.length}
                </span>
                <button
                  type="button"
                  onClick={handleNextSupplier}
                  disabled={currentIndex >= suppliers.length - 1}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                  title="View next supplier"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ROW 2: TIME FILTERS (ALL TIME, DAILY, WEEKLY, MONTHLY, YEARLY, BETWEEN 2 DATES) */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-bold flex items-center gap-1 mr-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Period Filter:</span>
                </span>
                {(['All Time', 'Today', 'This Week', 'This Month', 'This Year', 'Custom'] as DateFilterPeriod[]).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        period === p
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p === 'Custom' ? 'Between 2 Dates' : p === 'Today' ? 'Daily (Today)' : p === 'This Week' ? 'Weekly' : p === 'This Month' ? 'Monthly' : p === 'This Year' ? 'Yearly' : 'All Time'}
                    </button>
                  )
                )}
              </div>

              {/* Action Buttons: Print/PDF, HTML, CSV, Pay */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePrintLedger}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
                  title="Print Supplier Statement / Save as PDF"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / PDF Option</span>
                </button>

                <button
                  onClick={handleDownloadLedgerHtml}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
                  title="Download standalone offline statement as .HTML"
                >
                  <Download className="w-4 h-4" />
                  <span>.HTML</span>
                </button>

                <button
                  onClick={handleExportCsv}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                  title="Export ledger entries as CSV / Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>CSV</span>
                </button>

                <button
                  onClick={() => setPaymentModalSupplier(activeSupplier)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-rose-600" />
                  <span>Record Payment</span>
                </button>
              </div>
            </div>

            {/* ROW 3: BETWEEN 2 DATES (CUSTOM DATE PICKERS) */}
            {period === 'Custom' && (
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-wrap items-center gap-3 text-xs">
                <span className="font-bold text-blue-900">Custom Date Range:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">From:</span>
                  <input
                    type="date"
                    value={customRange.startDate}
                    onChange={(e) => setCustomRange({ ...customRange, startDate: e.target.value })}
                    className="p-1.5 border border-slate-300 rounded-lg bg-white font-mono text-xs font-bold"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">To:</span>
                  <input
                    type="date"
                    value={customRange.endDate}
                    onChange={(e) => setCustomRange({ ...customRange, endDate: e.target.value })}
                    className="p-1.5 border border-slate-300 rounded-lg bg-white font-mono text-xs font-bold"
                  />
                </div>
                <span className="text-[11px] text-blue-700 font-semibold">
                  (Ledger automatically recalculated for this exact interval)
                </span>
              </div>
            )}
          </div>

          {/* Active Vendor Header Card & Summary KPIs */}
          {activeSupplier && ledgerResult && (
            <div className="space-y-4">
              {/* Vendor Info Bar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
                    {activeSupplier.name
                      .split(' ')
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-lg">{activeSupplier.name}</h3>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                        {activeSupplier.paymentTerms || 'Credit Account'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium mt-0.5 flex flex-wrap items-center gap-3">
                      <span>Contact: <strong>{activeSupplier.contactPerson || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Mobile: <strong>{activeSupplier.mobileNumber || 'N/A'}</strong></span>
                      {activeSupplier.address && (
                        <>
                          <span>•</span>
                          <span className="text-slate-500">{activeSupplier.address}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-500 uppercase block">Statement Period</span>
                  <span className="text-xs font-bold text-slate-800">
                    {period === 'All Time'
                      ? 'All Time (Full Ledger)'
                      : `${activeDateRange.startDate} to ${activeDateRange.endDate}`}
                  </span>
                </div>
              </div>

              {/* 4 Financial KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Opening Balance */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Opening Balance</span>
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {formatCurrency(ledgerResult.openingBalance, currency)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    As of {activeDateRange.startDate}
                  </div>
                </div>

                {/* 2. Total Billed / Supplies */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Period Purchases / Bills</span>
                    <ArrowUpRight className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-xl font-black text-rose-600 mt-1">
                    + {formatCurrency(ledgerResult.totalCredit, currency)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Increases payable (Credit)
                  </div>
                </div>

                {/* 3. Total Payments Made */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Payments Released</span>
                    <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-xl font-black text-emerald-600 mt-1">
                    − {formatCurrency(ledgerResult.totalDebit, currency)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Settlements disbursed (Debit)
                  </div>
                </div>

                {/* 4. Net Closing Balance Due */}
                <div className="p-4 bg-rose-50/80 rounded-xl border border-rose-300 shadow-2xs">
                  <div className="flex items-center justify-between text-rose-800 text-xs font-black uppercase">
                    <span>Current Payable Due</span>
                    <DollarSign className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-xl font-black text-rose-900 mt-1">
                    {formatCurrency(ledgerResult.closingBalance, currency)}
                  </div>
                  <div className="text-[10px] text-rose-700 font-bold mt-0.5">
                    {ledgerResult.closingBalance > 0 ? 'Payment Outstanding' : 'Account Settled'}
                  </div>
                </div>
              </div>

              {/* Ledger Filter / Search inside entries */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by voucher #, item, type, or notes..."
                    value={ledgerSearchTerm}
                    onChange={(e) => setLedgerSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div className="text-xs text-slate-500 font-semibold">
                  Showing <strong>{filteredLedgerEntries.length}</strong> transaction entries
                </div>
              </div>

              {/* Itemized Party Ledger Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3.5">Date</th>
                        <th className="px-4 py-3.5">Voucher / Bill #</th>
                        <th className="px-4 py-3.5">Transaction Type</th>
                        <th className="px-4 py-3.5">Details &amp; Item Specification</th>
                        <th className="px-4 py-3.5 text-right">Purchases (Credit)</th>
                        <th className="px-4 py-3.5 text-right">Payments (Debit)</th>
                        <th className="px-4 py-3.5 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Row 1: Opening Balance */}
                      <tr className="bg-slate-50/60 font-bold text-slate-700">
                        <td className="px-4 py-3 text-slate-500 font-mono">{activeDateRange.startDate}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono">OP-BAL</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-800">
                            Opening Balance
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 italic">
                          Opening balance carried forward as of {activeDateRange.startDate}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400">-</td>
                        <td className="px-4 py-3 text-right text-slate-400">-</td>
                        <td className="px-4 py-3 text-right font-black text-slate-900">
                          {formatCurrency(ledgerResult.openingBalance, currency)}
                        </td>
                      </tr>

                      {/* Transaction Rows */}
                      {filteredLedgerEntries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                            No transactions recorded for this supplier in the selected period ({period}).
                          </td>
                        </tr>
                      ) : (
                        filteredLedgerEntries.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-600">{e.date}</td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">{e.voucherNumber}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  e.transactionType.includes('Purchase')
                                    ? 'bg-purple-100 text-purple-800'
                                    : e.transactionType.includes('Payment')
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {e.transactionType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700 max-w-md">
                              <div>{e.description}</div>
                              {e.referenceNumber && e.referenceNumber !== e.voucherNumber && (
                                <div className="text-[10px] text-slate-400">Ref: {e.referenceNumber}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-rose-600">
                              {e.credit > 0 ? `+ ${formatCurrency(e.credit, currency)}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600">
                              {e.debit > 0 ? `− ${formatCurrency(e.debit, currency)}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                              {formatCurrency(e.runningBalance, currency)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t border-slate-300">
                      <tr>
                        <td colSpan={4} className="px-4 py-3.5 text-right uppercase text-[11px]">
                          Period Totals &amp; Net Payable Due:
                        </td>
                        <td className="px-4 py-3.5 text-right text-rose-700">
                          + {formatCurrency(ledgerResult.totalCredit, currency)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-emerald-700">
                          − {formatCurrency(ledgerResult.totalDebit, currency)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-sm text-rose-800">
                          {formatCurrency(ledgerResult.closingBalance, currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: ALL SUPPLIERS MASTER REGISTER TABLE               */}
      {/* ========================================================= */}
      {viewMode === 'ALL_SUPPLIERS' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <span className="text-slate-500 text-xs font-semibold uppercase">Total Registered Suppliers</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{suppliers.length}</div>
            </div>

            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 sm:col-span-2 flex items-center justify-between">
              <div>
                <span className="text-rose-800 text-xs font-semibold uppercase">Total Outstanding Payables</span>
                <div className="text-2xl font-black text-rose-900 mt-1">
                  {formatCurrency(totalPayables, currency)}
                </div>
              </div>
              <span className="text-xs bg-rose-200 text-rose-900 px-3 py-1 rounded-full font-bold">
                Settlement Due
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Supplier Name, Contact Person, Phone..."
                value={masterSearchTerm}
                onChange={(e) => setMasterSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Master Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Supplier Name</th>
                    <th className="px-4 py-3.5">Contact Person &amp; Phone</th>
                    <th className="px-4 py-3.5">Address</th>
                    <th className="px-4 py-3.5">Payment Terms</th>
                    <th className="px-4 py-3.5 text-right">Current Payable</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMasterSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                        {s.notes && <div className="text-[10px] text-slate-400">{s.notes}</div>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800">{s.contactPerson}</div>
                        <div className="text-[11px] text-slate-500">{s.mobileNumber}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">{s.address}</td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {s.paymentTerms}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-rose-600 text-sm">
                        {formatCurrency(s.currentBalance, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedSupplierId(s.id);
                              setViewMode('ONE_BY_ONE_LEDGER');
                            }}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded font-bold text-xs transition-colors cursor-pointer"
                          >
                            View Party Ledger ➔
                          </button>
                          <button
                            onClick={() => setPaymentModalSupplier(s)}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded font-bold text-xs transition-colors cursor-pointer"
                          >
                            Pay
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD NEW SUPPLIER                                   */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Register New Supplier / Vendor</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Supplier / Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. National Petroleum Fuel Station #42"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Contact Person</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Address / Highway Location</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Opening Payable</label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Cash on Delivery">Cash on Delivery</option>
                    <option value="Weekly Credit">Weekly Credit</option>
                    <option value="15 Days Credit">15 Days Credit</option>
                    <option value="Monthly Credit">Monthly Credit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Notes / Supply Category</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Authorized diesel credit vendor for northern route departures"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RECORD SUPPLIER PAYMENT                            */}
      {/* ========================================================= */}
      {paymentModalSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Record Payment to {paymentModalSupplier.name}
              </h3>
              <button onClick={() => setPaymentModalSupplier(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex justify-between items-center">
                <span>Current Outstanding Due:</span>
                <span className="font-black text-sm">
                  {formatCurrency(paymentModalSupplier.currentBalance, currency)}
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Disbursement Amount ({currency}) *</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  required
                  min={1}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Pay From Account *</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} (Bal: {formatCurrency(a.currentBalance, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Cheque / Online Ref #</label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-991204 or FT-881902"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Payment Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Partial settlement for October fuel bills"
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPaymentModalSupplier(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Confirm &amp; Post Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
