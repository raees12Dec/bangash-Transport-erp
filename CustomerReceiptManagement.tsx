/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ReceiptText,
  Plus,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Building,
  CreditCard,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  FileCheck,
  CheckCircle,
  X,
  BookOpen,
  Landmark,
  Wallet,
  Clock,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Customer,
  Invoice,
  Trip,
  BankAccount,
  CashBankTransaction,
  CompanySettings,
} from '../types';
import {
  DateFilterPeriod,
  DateRange,
  getDateRangeFromPeriod,
  isDateInRange,
  formatCurrency,
  amountToWords,
} from '../services/accountingEngine';
import { dbService } from '../services/db';
import {
  downloadHtmlFile,
  generatePaymentReceiptHtml,
  PaymentReceiptData,
} from '../services/htmlExport';

interface CustomerReceiptManagementProps {
  customers: Customer[];
  invoices: Invoice[];
  trips: Trip[];
  accounts: BankAccount[];
  transactions: CashBankTransaction[];
  currency: string;
  settings: CompanySettings;
  onPrintReceipt?: (receiptData: PaymentReceiptData) => void;
  onViewCustomerLedger?: (customerId: string) => void;
}

export const CustomerReceiptManagement: React.FC<CustomerReceiptManagementProps> = ({
  customers,
  invoices,
  trips,
  accounts,
  transactions,
  currency,
  settings,
  onPrintReceipt,
  onViewCustomerLedger,
}) => {
  // Navigation / View modes: REGISTER (table) or ONE_BY_ONE (individual receipt card)
  const [viewMode, setViewMode] = useState<'REGISTER' | 'ONE_BY_ONE'>('REGISTER');

  // Time Period Filter: All Time, Today, This Week, This Month, This Year, Custom
  const [period, setPeriod] = useState<DateFilterPeriod>('All Time');
  const [customRange, setCustomRange] = useState<DateRange>({
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  });

  const activeDateRange = useMemo(() => {
    return getDateRangeFromPeriod(period, customRange.startDate, customRange.endDate);
  }, [period, customRange]);

  // Customer filter
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');

  // Account filter
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Selected receipt index for ONE_BY_ONE view
  const [selectedReceiptIndex, setSelectedReceiptIndex] = useState(0);

  // Modal: Issue New Receipt
  const [isNewReceiptModalOpen, setIsNewReceiptModalOpen] = useState(false);
  const [formCustomerId, setFormCustomerId] = useState<string>(customers[0]?.id || '');
  const [formAccountId, setFormAccountId] = useState<string>(accounts[0]?.id || '');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [formPaymentMethod, setFormPaymentMethod] = useState<
    'Cash' | 'Online Bank Transfer' | 'Cheque / Pay Order' | 'Demand Draft'
  >('Online Bank Transfer');
  const [formReferenceNumber, setFormReferenceNumber] = useState('');
  const [formReceiptType, setFormReceiptType] = useState<'Invoice' | 'TripAdvance' | 'OnAccount'>('Invoice');
  const [formInvoiceId, setFormInvoiceId] = useState<string>('');
  const [formTripId, setFormTripId] = useState<string>('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formRemarks, setFormRemarks] = useState('');

  // Filter all customer receipts from transactions
  const customerReceipts = useMemo(() => {
    return transactions.filter(
      (tx) =>
        (tx.transactionType === 'Customer Receipt' ||
          tx.partyType === 'Customer' ||
          (tx.description && tx.description.toLowerCase().includes('customer receipt'))) &&
        tx.status !== 'Cancelled'
    );
  }, [transactions]);

  // Apply filters (Date range, Customer, Account, Search)
  const filteredReceipts = useMemo(() => {
    return customerReceipts.filter((r) => {
      // Date filter
      if (period !== 'All Time' && !isDateInRange(r.date, activeDateRange)) {
        return false;
      }

      // Customer filter
      if (selectedCustomerId !== 'ALL' && r.partyId !== selectedCustomerId) {
        return false;
      }

      // Account filter
      if (selectedAccountId !== 'ALL' && r.accountId !== selectedAccountId) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const vNum = (r.voucherNumber || '').toLowerCase();
        const pName = (r.partyName || '').toLowerCase();
        const ref = (r.referenceNumber || '').toLowerCase();
        const inv = (r.invoiceNumber || '').toLowerCase();
        const trp = (r.tripNumber || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        const acc = (r.accountName || '').toLowerCase();

        if (
          !vNum.includes(q) &&
          !pName.includes(q) &&
          !ref.includes(q) &&
          !inv.includes(q) &&
          !trp.includes(q) &&
          !desc.includes(q) &&
          !acc.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [customerReceipts, period, activeDateRange, selectedCustomerId, selectedAccountId, searchQuery]);

  // Period stats
  const periodTotalAmount = useMemo(() => {
    return filteredReceipts.reduce((sum, r) => sum + r.amount, 0);
  }, [filteredReceipts]);

  const cashReceiptsTotal = useMemo(() => {
    return filteredReceipts
      .filter((r) => {
        const acc = accounts.find((a) => a.id === r.accountId);
        return acc?.accountType === 'Cash in Hand' || acc?.accountType === 'Petty Cash';
      })
      .reduce((sum, r) => sum + r.amount, 0);
  }, [filteredReceipts, accounts]);

  const bankReceiptsTotal = useMemo(() => {
    return filteredReceipts
      .filter((r) => {
        const acc = accounts.find((a) => a.id === r.accountId);
        return acc?.accountType === 'Bank Account';
      })
      .reduce((sum, r) => sum + r.amount, 0);
  }, [filteredReceipts, accounts]);

  // Total customer outstanding across all customers
  const totalReceivables = useMemo(() => {
    return invoices
      .filter((inv) => inv.paymentStatus !== 'Paid' && inv.paymentStatus !== 'Cancelled')
      .reduce((sum, inv) => sum + inv.remainingBalance, 0);
  }, [invoices]);

  // Selected customer for New Receipt Form
  const selectedFormCustomer = customers.find((c) => c.id === formCustomerId);

  // Unpaid invoices of selected form customer
  const customerUnpaidInvoices = useMemo(() => {
    if (!formCustomerId) return [];
    return invoices.filter(
      (inv) =>
        inv.customerId === formCustomerId &&
        inv.paymentStatus !== 'Paid' &&
        inv.paymentStatus !== 'Cancelled'
    );
  }, [invoices, formCustomerId]);

  // Active trips of selected form customer
  const customerActiveTrips = useMemo(() => {
    if (!formCustomerId) return [];
    return trips.filter((t) => t.customerId === formCustomerId);
  }, [trips, formCustomerId]);

  // Customer current outstanding
  const getCustomerOutstanding = (cust: Customer) => {
    let out = cust.openingBalanceType === 'Receivable' ? cust.openingBalance : -cust.openingBalance;
    invoices
      .filter((inv) => inv.customerId === cust.id && inv.paymentStatus !== 'Cancelled')
      .forEach((inv) => {
        out += inv.remainingBalance;
      });
    return out;
  };

  // Convert receipt to PaymentReceiptData
  const getPaymentReceiptData = (tx: CashBankTransaction): PaymentReceiptData => {
    const cust = customers.find((c) => c.id === tx.partyId);
    const inv = invoices.find((i) => i.id === tx.invoiceId || i.invoiceNumber === tx.invoiceNumber);
    const trp = trips.find((t) => t.id === tx.tripId || t.tripNumber === tx.tripNumber);

    let paymentMethod = 'Bank Transfer / Deposit';
    const acc = accounts.find((a) => a.id === tx.accountId);
    if (acc?.accountType === 'Cash in Hand' || acc?.accountType === 'Petty Cash') {
      paymentMethod = 'Cash in Hand';
    } else if (tx.referenceNumber && tx.referenceNumber.toLowerCase().includes('chq')) {
      paymentMethod = 'Bank Cheque';
    }

    return {
      receiptNumber: tx.voucherNumber,
      receiptDate: tx.date,
      receivedFrom: tx.partyName || cust?.companyName || 'Valued Customer',
      tripNumber: tx.tripNumber || inv?.tripNumber || trp?.tripNumber,
      biltyNumber: trp?.bdNumber,
      vehicleNumber: trp?.vehicleNumber || inv?.vehicleNumber,
      route: trp?.startingLocation && trp?.destinationLocation ? `${trp.startingLocation} ➔ ${trp.destinationLocation}` : undefined,
      cargoDescription: trp?.goodsDescription,
      amount: tx.amount,
      paymentMethod,
      referenceNumber: tx.referenceNumber,
      towardsParticulars:
        tx.description ||
        (tx.invoiceNumber
          ? `Freight Invoice ${tx.invoiceNumber}`
          : tx.tripNumber
          ? `Advance against Trip ${tx.tripNumber}`
          : 'Customer On-Account Settlement'),
      totalFreightAmount: inv?.totalInvoiceAmount || trp?.totalFreightAmount,
      remainingBalance: inv?.remainingBalance,
      notes: `Deposited into ${tx.accountName}. Posted by ${tx.postedBy}.`,
    };
  };

  // Print Receipt handler
  const handlePrintReceipt = (tx: CashBankTransaction) => {
    const receiptData = getPaymentReceiptData(tx);
    if (onPrintReceipt) {
      onPrintReceipt(receiptData);
    } else {
      const html = generatePaymentReceiptHtml(receiptData, settings, currency);
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
        downloadHtmlFile(`Customer_Receipt_${tx.voucherNumber}.html`, html);
      }
    }
  };

  // Download Receipt HTML
  const handleDownloadReceiptHtml = (tx: CashBankTransaction) => {
    const receiptData = getPaymentReceiptData(tx);
    const html = generatePaymentReceiptHtml(receiptData, settings, currency);
    downloadHtmlFile(`Customer_Receipt_${tx.voucherNumber}.html`, html);
  };

  // Export CSV of filtered receipts
  const handleExportCSV = () => {
    if (filteredReceipts.length === 0) {
      alert('No customer receipts to export.');
      return;
    }

    const headers = [
      'Receipt #',
      'Date',
      'Customer Name',
      'Receiving Account',
      'Amount',
      'Ref / Cheque #',
      'Invoice #',
      'Trip #',
      'Description',
      'Posted By',
    ];

    const rows = filteredReceipts.map((r) => [
      r.voucherNumber,
      r.date,
      `"${(r.partyName || '').replace(/"/g, '""')}"`,
      `"${r.accountName.replace(/"/g, '""')}"`,
      r.amount,
      `"${(r.referenceNumber || '').replace(/"/g, '""')}"`,
      r.invoiceNumber || '',
      r.tripNumber || '',
      `"${r.description.replace(/"/g, '""')}"`,
      r.postedBy,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `Customer Receipts Register - ${settings.companyName}`,
        `Period: ${period} (${activeDateRange.startDate} to ${activeDateRange.endDate})`,
        `Total Receipts: ${periodTotalAmount}`,
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Customer_Receipts_${activeDateRange.startDate}_${activeDateRange.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Form Submission for New Customer Receipt
  const handleCreateCustomerReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFormCustomer) {
      alert('Please select a valid customer.');
      return;
    }

    const amt = Number(formAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid receipt amount greater than zero.');
      return;
    }

    const targetAccount = accounts.find((a) => a.id === formAccountId);
    if (!targetAccount) {
      alert('Please select a valid receiving account.');
      return;
    }

    let inv: Invoice | undefined;
    if (formReceiptType === 'Invoice' && formInvoiceId) {
      inv = invoices.find((i) => i.id === formInvoiceId);
    }

    let trp: Trip | undefined;
    if (formReceiptType === 'TripAdvance' && formTripId) {
      trp = trips.find((t) => t.id === formTripId);
    }

    const narration =
      formRemarks.trim() ||
      (inv
        ? `Customer payment received against Invoice ${inv.invoiceNumber} (${formPaymentMethod})`
        : trp
        ? `Advance received against Trip ${trp.tripNumber} (${formPaymentMethod})`
        : `On-account customer settlement received (${formPaymentMethod})`);

    try {
      const newTx = dbService.addCustomerReceipt({
        customerId: selectedFormCustomer.id,
        customerName: selectedFormCustomer.companyName,
        accountId: targetAccount.id,
        amount: amt,
        receiptDate: formDate,
        paymentMethod: formPaymentMethod,
        referenceNumber: formReferenceNumber || undefined,
        invoiceId: inv?.id,
        invoiceNumber: inv?.invoiceNumber,
        tripId: trp?.id || inv?.tripId,
        tripNumber: trp?.tripNumber || inv?.tripNumber,
        biltyNumber: trp?.bdNumber,
        remarks: narration,
      });

      setIsNewReceiptModalOpen(false);
      // Reset form
      setFormAmount('');
      setFormReferenceNumber('');
      setFormRemarks('');
      setFormInvoiceId('');
      setFormTripId('');

      // Ask to print
      const askPrint = window.confirm(
        `Customer Receipt ${newTx.voucherNumber} for ${formatCurrency(
          amt,
          currency
        )} successfully recorded!\n\nWould you like to print the official Money Receipt Voucher now?`
      );
      if (askPrint) {
        handlePrintReceipt(newTx);
      }
    } catch (err: any) {
      alert(`Error recording customer receipt: ${err.message}`);
    }
  };

  // When form customer changes, auto-select first unpaid invoice
  const handleFormCustomerChange = (cId: string) => {
    setFormCustomerId(cId);
    const unpaids = invoices.filter(
      (inv) => inv.customerId === cId && inv.paymentStatus !== 'Paid' && inv.paymentStatus !== 'Cancelled'
    );
    if (unpaids.length > 0) {
      setFormInvoiceId(unpaids[0].id);
      setFormAmount(unpaids[0].remainingBalance);
    } else {
      setFormInvoiceId('');
      setFormAmount('');
    }
  };

  // When form invoice changes, auto-populate amount with remaining balance
  const handleFormInvoiceChange = (invId: string) => {
    setFormInvoiceId(invId);
    const inv = invoices.find((i) => i.id === invId);
    if (inv) {
      setFormAmount(inv.remainingBalance);
    }
  };

  // Current receipt for ONE_BY_ONE mode
  const currentOneByOneReceipt = filteredReceipts[selectedReceiptIndex] || filteredReceipts[0];

  const handlePrevReceipt = () => {
    if (selectedReceiptIndex > 0) {
      setSelectedReceiptIndex(selectedReceiptIndex - 1);
    }
  };

  const handleNextReceipt = () => {
    if (selectedReceiptIndex < filteredReceipts.length - 1) {
      setSelectedReceiptIndex(selectedReceiptIndex + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-0.5 rounded uppercase flex items-center gap-1">
              <ReceiptText className="w-3.5 h-3.5" /> Customer Accounts
            </span>
            <h1 className="text-xl font-black">Receipt from Customers</h1>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Official customer money receipt vouchers (CRV), freight invoice collections, and bank deposits.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('REGISTER')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'REGISTER'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Receipt Register
            </button>
            <button
              type="button"
              onClick={() => setViewMode('ONE_BY_ONE')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'ONE_BY_ONE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> One-by-One Voucher
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export CSV
          </button>

          <button
            type="button"
            onClick={() => {
              handleFormCustomerChange(customers[0]?.id || '');
              setIsNewReceiptModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> + Issue Customer Receipt
          </button>
        </div>
      </div>

      {/* KPI Financial Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Period Receipts Collected</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {formatCurrency(periodTotalAmount, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            {filteredReceipts.length} receipt{filteredReceipts.length === 1 ? '' : 's'} recorded
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Cash In-Hand Collections</span>
            <Wallet className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCurrency(cashReceiptsTotal, currency)}
          </div>
          <div className="text-[11px] text-teal-600 mt-0.5 font-medium">Main safe &amp; depot counters</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Bank Deposits &amp; Transfers</span>
            <Landmark className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-700 mt-1">
            {formatCurrency(bankReceiptsTotal, currency)}
          </div>
          <div className="text-[11px] text-blue-600 mt-0.5 font-medium">Online RTGS, Cheques, FT</div>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-900 uppercase">Total Receivables Outstanding</span>
            <Building className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-xl font-black text-amber-950 mt-1">
            {formatCurrency(totalReceivables, currency)}
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5 font-medium">Across all customer bills</div>
        </div>
      </div>

      {/* Filter Toolbar: Customer Dropdown, Account Dropdown, Timeframe Pills, Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Customer Dropdown */}
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-500" />
            <label className="text-xs font-bold text-slate-600 uppercase">Customer:</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setSelectedReceiptIndex(0);
              }}
              className="text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Customers ({customers.length})</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          {/* Account Dropdown */}
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-slate-500" />
            <label className="text-xs font-bold text-slate-600 uppercase">Account:</label>
            <select
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setSelectedReceiptIndex(0);
              }}
              className="text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Accounts ({accounts.length})</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountName} ({formatCurrency(a.currentBalance, currency)})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search receipt #, customer, cheque #, invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Timeframe Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Timeframe:
            </span>
            {(['All Time', 'Today', 'This Week', 'This Month', 'This Year', 'Custom'] as DateFilterPeriod[]).map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    period === p
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {p === 'Today'
                    ? 'Daily'
                    : p === 'This Week'
                    ? 'Weekly'
                    : p === 'This Month'
                    ? 'Monthly'
                    : p === 'This Year'
                    ? 'Yearly'
                    : p === 'Custom'
                    ? 'Between 2 Dates'
                    : p}
                </button>
              )
            )}
          </div>

          {period === 'Custom' && (
            <div className="flex items-center gap-2 text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-500">From:</span>
              <input
                type="date"
                value={customRange.startDate}
                onChange={(e) => setCustomRange((r) => ({ ...r, startDate: e.target.value }))}
                className="border border-slate-300 rounded px-2 py-0.5 text-xs bg-white"
              />
              <span className="font-bold text-slate-500">To:</span>
              <input
                type="date"
                value={customRange.endDate}
                onChange={(e) => setCustomRange((r) => ({ ...r, endDate: e.target.value }))}
                className="border border-slate-300 rounded px-2 py-0.5 text-xs bg-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* VIEW MODE: REGISTER (TABLE LIST) */}
      {/* ============================================================ */}
      {viewMode === 'REGISTER' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Customer Money Receipts Register
              </h3>
              <span className="text-[11px] text-slate-500">
                Showing {filteredReceipts.length} receipt{filteredReceipts.length === 1 ? '' : 's'} • Total Collected:{' '}
                <strong className="text-emerald-700">{formatCurrency(periodTotalAmount, currency)}</strong>
              </span>
            </div>

            <div className="text-xs text-slate-500">
              Period: <strong>{period}</strong> ({activeDateRange.startDate} to {activeDateRange.endDate})
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Receipt / Voucher #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer Party</th>
                  <th className="py-2.5 px-3">Received Into Account</th>
                  <th className="py-2.5 px-3">Cheque / Ref #</th>
                  <th className="py-2.5 px-3">Towards Particulars</th>
                  <th className="py-2.5 px-3 text-right">Amount Received</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {r.voucherNumber}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">{r.date}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      <div>{r.partyName}</div>
                      {r.partyId && (
                        <button
                          type="button"
                          onClick={() => onViewCustomerLedger && onViewCustomerLedger(r.partyId!)}
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5 font-normal"
                        >
                          <BookOpen className="w-2.5 h-2.5" /> View Ledger
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <span className="font-semibold">{r.accountName}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {r.referenceNumber || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate" title={r.description}>
                      <div className="font-medium text-slate-800">{r.description}</div>
                      {(r.invoiceNumber || r.tripNumber) && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {r.invoiceNumber ? `Inv: ${r.invoiceNumber}` : ''}{' '}
                          {r.tripNumber ? `Trip: ${r.tripNumber}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-700 text-sm">
                      {formatCurrency(r.amount, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(r)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                          title="Print Official Customer Money Receipt"
                        >
                          <Printer className="w-3 h-3" /> Print
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadReceiptHtml(r)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-[11px] flex items-center gap-1 border border-slate-200 transition"
                          title="Download single-file HTML receipt"
                        >
                          <Download className="w-3 h-3" /> .HTML
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredReceipts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <ReceiptText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <div className="font-bold text-slate-600">No customer receipts found matching filters.</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Click "+ Issue Customer Receipt" above to record a new customer collection.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredReceipts.length > 0 && (
                <tfoot className="bg-slate-100 font-bold border-t border-slate-200 text-xs">
                  <tr>
                    <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-slate-700">
                      Period Total Customer Collections:
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-black text-sm">
                      {formatCurrency(periodTotalAmount, currency)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW MODE: ONE-BY-ONE VOUCHER BROWSER */}
      {/* ============================================================ */}
      {viewMode === 'ONE_BY_ONE' && (
        <div className="space-y-4">
          {/* Stepper Header */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Browse Customer Receipts:
              </span>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={handlePrevReceipt}
                  disabled={selectedReceiptIndex <= 0}
                  className="p-1 rounded hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Previous Receipt"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-bold text-slate-700 px-2">
                  {filteredReceipts.length > 0 ? selectedReceiptIndex + 1 : 0} of {filteredReceipts.length}
                </span>
                <button
                  type="button"
                  onClick={handleNextReceipt}
                  disabled={selectedReceiptIndex >= filteredReceipts.length - 1}
                  className="p-1 rounded hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Next Receipt"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Jump Dropdown */}
              <select
                value={selectedReceiptIndex}
                onChange={(e) => setSelectedReceiptIndex(Number(e.target.value))}
                className="text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg shadow-sm"
              >
                {filteredReceipts.map((r, idx) => (
                  <option key={r.id} value={idx}>
                    #{idx + 1} — {r.voucherNumber} ({r.partyName} - {formatCurrency(r.amount, currency)})
                  </option>
                ))}
              </select>
            </div>

            {currentOneByOneReceipt && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(currentOneByOneReceipt)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadReceiptHtml(currentOneByOneReceipt)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1.5 border border-slate-200 transition"
                >
                  <Download className="w-3.5 h-3.5" /> .HTML
                </button>
              </div>
            )}
          </div>

          {/* Render One-by-One Receipt Card */}
          {currentOneByOneReceipt ? (
            (() => {
              const r = currentOneByOneReceipt;
              const rData = getPaymentReceiptData(r);
              const cust = customers.find((c) => c.id === r.partyId);
              return (
                <div className="bg-white rounded-xl border border-slate-300 shadow-md p-6 max-w-3xl mx-auto space-y-6">
                  {/* Voucher Header */}
                  <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={settings.logoUrl || '/assets/aistudio/Bangash_Transport_Co._Logo_b758f5dc.png'}
                        alt={settings.companyName}
                        className="w-14 h-14 object-contain rounded-md border border-slate-200 bg-white p-0.5"
                      />
                      <div>
                        <h2 className="text-lg font-black text-slate-900">{settings.companyName}</h2>
                        <p className="text-[11px] font-bold text-blue-700 uppercase">{settings.tagline}</p>
                        <p className="text-[10px] text-slate-500">{settings.address}, {settings.cityCountry}</p>
                        <p className="text-[10px] text-slate-500">NTN / Tax ID: {settings.taxRegistrationNumber}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block bg-emerald-600 text-white font-bold text-xs uppercase px-3 py-1 rounded">
                        CUSTOMER MONEY RECEIPT
                      </span>
                      <div className="text-xs font-mono font-bold text-slate-900 mt-2">
                        Receipt #: {r.voucherNumber}
                      </div>
                      <div className="text-xs text-slate-600 font-mono">Date: {r.date}</div>
                      <div className="text-[11px] text-slate-500">Mode: {rData.paymentMethod}</div>
                    </div>
                  </div>

                  {/* Customer & Particulars Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Received with Thanks From:
                      </span>
                      <div className="text-base font-black text-slate-900">{r.partyName}</div>
                      {cust && (
                        <div className="text-xs text-slate-600 mt-1">
                          Contact: {cust.contactPerson} ({cust.mobile})
                        </div>
                      )}
                      {cust?.taxRegistrationNumber && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          Customer NTN: {cust.taxRegistrationNumber}
                        </div>
                      )}
                      <div className="mt-2 text-xs font-semibold text-slate-700">
                        Towards: <span className="text-blue-700 font-bold">{rData.towardsParticulars}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Deposit &amp; Instrument Particulars:
                      </span>
                      <div className="text-xs text-slate-700">
                        <span className="text-slate-500">Deposited Into:</span>{' '}
                        <strong>{r.accountName}</strong>
                      </div>
                      {r.referenceNumber && (
                        <div className="text-xs text-slate-700 mt-1">
                          <span className="text-slate-500">Cheque / Ref #:</span>{' '}
                          <strong className="font-mono text-slate-900">{r.referenceNumber}</strong>
                        </div>
                      )}
                      {r.invoiceNumber && (
                        <div className="text-xs text-slate-700 mt-1">
                          <span className="text-slate-500">Linked Invoice:</span>{' '}
                          <strong className="font-mono text-blue-700">{r.invoiceNumber}</strong>
                        </div>
                      )}
                      {r.tripNumber && (
                        <div className="text-xs text-slate-700 mt-1">
                          <span className="text-slate-500">Linked Trip:</span>{' '}
                          <strong className="font-mono text-slate-900">{r.tripNumber}</strong>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 mt-2">
                        Posted by: {r.postedBy} • Status: {r.status}
                      </div>
                    </div>
                  </div>

                  {/* Net Amount Box */}
                  <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-emerald-800 uppercase">
                        Net Amount Received &amp; Credited
                      </div>
                      <div className="text-3xl font-black text-emerald-700 mt-1">
                        {formatCurrency(r.amount, currency)}
                      </div>
                    </div>

                    {cust && (
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-500 uppercase">Customer Ledger Balance</div>
                        <div className="text-lg font-bold text-slate-800">
                          {formatCurrency(getCustomerOutstanding(cust), currency)}
                        </div>
                        <button
                          type="button"
                          onClick={() => onViewCustomerLedger && onViewCustomerLedger(cust.id)}
                          className="text-[11px] text-blue-600 hover:underline font-bold"
                        >
                          Open Statement ➔
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Amount in Words */}
                  <div className="bg-slate-50 border-l-4 border-l-emerald-600 border border-slate-200 rounded-xl p-3 flex items-start gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap mt-0.5">
                      Amount in Words:
                    </span>
                    <span className="text-xs font-black text-slate-900 italic">
                      {amountToWords(r.amount)}
                    </span>
                  </div>

                  {/* Official Signatures with Authorized Signatory */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-center text-xs">
                    <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-3 flex flex-col justify-between min-h-[110px]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer / Depositor</div>
                      <div className="w-3/4 border-b border-slate-400 mx-auto my-2"></div>
                      <div>
                        <div className="font-bold text-slate-900 text-[11px] truncate">{r.partyName}</div>
                        <div className="text-[10px] text-slate-500">Signature &amp; Stamp</div>
                      </div>
                    </div>
                    <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-3 flex flex-col justify-between min-h-[110px]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cashier / Accountant</div>
                      <div className="w-3/4 border-b border-slate-400 mx-auto my-2"></div>
                      <div>
                        <div className="font-bold text-slate-900 text-[11px]">Accounts Department</div>
                        <div className="text-[10px] text-slate-500">Verified &amp; Deposited</div>
                      </div>
                    </div>
                    <div className="border border-blue-400 bg-blue-50/70 rounded-xl p-3 flex flex-col justify-between min-h-[110px] shadow-2xs">
                      <div className="text-[10px] font-black uppercase tracking-wider text-blue-800">For {settings.companyName}</div>
                      <div className="my-1">
                        <span className="inline-block border border-dashed border-blue-500 bg-white px-2 py-0.5 rounded text-[9px] font-black text-blue-700 tracking-wider uppercase">
                          ★ Official Seal &amp; Stamp ★
                        </span>
                      </div>
                      <div className="pt-1 border-t border-blue-200">
                        <div className="font-black text-slate-900 text-[11px]">{settings.authorizedSignatoryName}</div>
                        <div className="text-[10px] font-bold text-blue-700">{settings.authorizedSignatoryTitle || 'Authorized Signatory'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200">
              No receipt selected.
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ISSUE NEW CUSTOMER RECEIPT */}
      {/* ============================================================ */}
      {isNewReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-emerald-400" /> Issue Customer Money Receipt (CRV)
              </h2>
              <button
                type="button"
                onClick={() => setIsNewReceiptModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerReceipt} className="p-6 space-y-4 text-xs">
              {/* Row 1: Customer & Receiving Account */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Select Customer / Party *
                  </label>
                  <select
                    required
                    value={formCustomerId}
                    onChange={(e) => handleFormCustomerChange(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.paymentTerms})
                      </option>
                    ))}
                  </select>
                  {selectedFormCustomer && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      Current Outstanding:{' '}
                      <strong className="text-rose-600">
                        {formatCurrency(getCustomerOutstanding(selectedFormCustomer), currency)}
                      </strong>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Receiving Account (Cash/Bank) *
                  </label>
                  <select
                    required
                    value={formAccountId}
                    onChange={(e) => setFormAccountId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountName} ({formatCurrency(a.currentBalance, currency)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Date & Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Receipt Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Payment Method *</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                  >
                    <option value="Online Bank Transfer">Online Bank Transfer (FT / RTGS)</option>
                    <option value="Cheque / Pay Order">Bank Cheque / Pay Order</option>
                    <option value="Cash">Cash in Hand</option>
                    <option value="Demand Draft">Demand Draft (DD)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Cheque / Online Ref # */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Cheque # / Deposit Slip # / Transaction Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-991823 or HBL-FT-49102"
                  value={formReferenceNumber}
                  onChange={(e) => setFormReferenceNumber(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-semibold"
                />
              </div>

              {/* Row 4: Receipt Type Selection */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Receipt Allocation *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormReceiptType('Invoice')}
                    className={`p-2 rounded-lg font-bold text-center border transition ${
                      formReceiptType === 'Invoice'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Against Freight Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormReceiptType('TripAdvance')}
                    className={`p-2 rounded-lg font-bold text-center border transition ${
                      formReceiptType === 'TripAdvance'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Advance on Trip
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormReceiptType('OnAccount')}
                    className={`p-2 rounded-lg font-bold text-center border transition ${
                      formReceiptType === 'OnAccount'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    On-Account Advance
                  </button>
                </div>
              </div>

              {/* Dependent Selector based on Receipt Type */}
              {formReceiptType === 'Invoice' && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Select Freight Invoice
                  </label>
                  {customerUnpaidInvoices.length > 0 ? (
                    <select
                      value={formInvoiceId}
                      onChange={(e) => handleFormInvoiceChange(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                    >
                      <option value="">-- Choose Invoice to Clear --</option>
                      {customerUnpaidInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} (Trip: {inv.tripNumber}) • Total:{' '}
                          {formatCurrency(inv.totalInvoiceAmount, currency)} • Unpaid Due:{' '}
                          {formatCurrency(inv.remainingBalance, currency)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2.5 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-[11px]">
                      This customer has no unpaid invoices. Payment will be credited on-account.
                    </div>
                  )}
                </div>
              )}

              {formReceiptType === 'TripAdvance' && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Select Consignment Trip</label>
                  <select
                    value={formTripId}
                    onChange={(e) => setFormTripId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                  >
                    <option value="">-- Select Trip for Advance --</option>
                    {customerActiveTrips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tripNumber} ({t.startingLocation} ➔ {t.destinationLocation}) • Freight:{' '}
                        {formatCurrency(t.totalFreightAmount, currency)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Row 5: Amount Received */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Amount Received ({currency}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">{currency}</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(Number(e.target.value) || '')}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-2 text-base font-black border border-slate-300 rounded-lg text-emerald-700"
                  />
                </div>
              </div>

              {/* Remarks / Narration */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Remarks / Narration</label>
                <input
                  type="text"
                  placeholder="e.g. Received via cheque # 882194 drawn on HBL for October freight clearance"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              {/* Live Preview Box */}
              {selectedFormCustomer && formAmount && Number(formAmount) > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">Balance Before:</span>{' '}
                    <strong>{formatCurrency(getCustomerOutstanding(selectedFormCustomer), currency)}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-600 font-bold">Less Receipt:</span>{' '}
                    <strong className="text-emerald-700 font-black">-{formatCurrency(Number(formAmount), currency)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Projected Balance:</span>{' '}
                    <strong className="text-blue-700">
                      {formatCurrency(
                        Math.max(0, getCustomerOutstanding(selectedFormCustomer) - Number(formAmount)),
                        currency
                      )}
                    </strong>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewReceiptModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Save &amp; Post Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
