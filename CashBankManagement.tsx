/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Landmark,
  Wallet,
  ArrowRightLeft,
  Plus,
  Search,
  Filter,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CreditCard,
  Building,
  Calendar,
  Printer,
  Download,
  Edit2,
  Trash2,
  CheckCircle,
  Scale,
} from 'lucide-react';
import { BankAccount, CashBankTransaction, AccountTransactionType } from '../types';
import {
  formatCurrency,
  DateFilterPeriod,
  DateRange,
  getDateRangeFromPeriod,
  isDateInRange,
} from '../services/accountingEngine';
import { dbService } from '../services/db';
import { downloadHtmlFile, generateReportHtml } from '../services/htmlExport';

interface CashBankManagementProps {
  accounts: BankAccount[];
  transactions: CashBankTransaction[];
  currency: string;
}

export const CashBankManagement: React.FC<CashBankManagementProps> = ({
  accounts,
  transactions,
  currency,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('All');

  // Time Period Filter State: Daily (Today), Weekly, Monthly, Custom (between 2 dates), Yearly, All
  const [period, setPeriod] = useState<DateFilterPeriod | 'All'>('This Month');
  const [customStartDate, setCustomStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10)
  );
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().substring(0, 10));

  // Add / Edit Account Modals State
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [isOpeningBalancesModalOpen, setIsOpeningBalancesModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);

  const [accountForm, setAccountForm] = useState<{
    accountType: 'Bank Account' | 'Cash in Hand' | 'Petty Cash';
    bankName: string;
    accountName: string;
    accountNumber: string;
    branchName: string;
    swiftIban: string;
    openingBalance: number;
  }>({
    accountType: 'Bank Account',
    bankName: '',
    accountName: '',
    accountNumber: '',
    branchName: '',
    swiftIban: '',
    openingBalance: 0,
  });

  const [openingBalancesDraft, setOpeningBalancesDraft] = useState<Record<string, number>>({});

  // Transfer modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || '');
  const [targetAccountId, setTargetAccountId] = useState(accounts[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState<number>(25000);
  const [transferReference, setTransferReference] = useState('');
  const [transferDesc, setTransferDesc] = useState('');

  // General Entry modal state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<AccountTransactionType>('Cash Receipt');
  const [entryAccountId, setEntryAccountId] = useState(accounts[0]?.id || '');
  const [entryAmount, setEntryAmount] = useState<number>(10000);
  const [entryPartyName, setEntryPartyName] = useState('');
  const [entryRef, setEntryRef] = useState('');
  const [entryDesc, setEntryDesc] = useState('');

  const totalCash = accounts
    .filter((a) => a.accountType === 'Cash in Hand' || a.accountType === 'Petty Cash')
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const totalBank = accounts
    .filter((a) => a.accountType === 'Bank Account')
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const totalLiquid = totalCash + totalBank;

  const dateRange: DateRange =
    period === 'All'
      ? { startDate: '1900-01-01', endDate: '2099-12-31' }
      : getDateRangeFromPeriod(period as DateFilterPeriod, customStartDate, customEndDate);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesAccount =
      selectedAccountId === 'All' ||
      tx.accountId === selectedAccountId ||
      tx.targetAccountId === selectedAccountId;
    const matchesDate = period === 'All' || isDateInRange(tx.date, dateRange);
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      tx.voucherNumber.toLowerCase().includes(term) ||
      tx.transactionType.toLowerCase().includes(term) ||
      tx.description.toLowerCase().includes(term) ||
      (tx.partyName && tx.partyName.toLowerCase().includes(term));
    return matchesAccount && matchesDate && matchesSearch;
  });

  // Period flow metrics
  let periodInflows = 0;
  let periodOutflows = 0;
  filteredTransactions.forEach((tx) => {
    if (tx.transactionType.includes('Receipt') || tx.transactionType === 'Opening Balance') {
      periodInflows += tx.amount;
    } else if (tx.transactionType.includes('Payment') || tx.transactionType.includes('Expense')) {
      periodOutflows += tx.amount;
    }
  });
  const periodNetFlow = periodInflows - periodOutflows;

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceAccountId === targetAccountId) {
      alert('Source and destination accounts must be distinct.');
      return;
    }
    if (transferAmount <= 0) {
      alert('Transfer amount must be positive.');
      return;
    }

    const src = accounts.find((a) => a.id === sourceAccountId);
    const dest = accounts.find((a) => a.id === targetAccountId);
    if (!src || !dest) return;

    let transferType: AccountTransactionType = 'Bank-to-Bank Transfer';
    if (src.accountType === 'Cash in Hand' && dest.accountType === 'Bank Account') {
      transferType = 'Cash-to-Bank Transfer';
    } else if (src.accountType === 'Bank Account' && (dest.accountType === 'Cash in Hand' || dest.accountType === 'Petty Cash')) {
      transferType = 'Bank-to-Cash Transfer';
    }

    dbService.addCashBankTransaction({
      voucherNumber: dbService.generateNextVoucherNumber('TX-TRF-'),
      date: new Date().toISOString().substring(0, 10),
      transactionType: transferType,
      accountId: src.id,
      accountName: src.accountName,
      targetAccountId: dest.id,
      targetAccountName: dest.accountName,
      amount: transferAmount,
      referenceNumber: transferReference || `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
      description: transferDesc || `Fund transfer from ${src.accountName} to ${dest.accountName}`,
      postedBy: 'Treasury Officer',
      status: 'Posted',
    });

    setIsTransferModalOpen(false);
  };

  const handleExecuteGeneralEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (entryAmount <= 0) return;

    const acc = accounts.find((a) => a.id === entryAccountId);
    if (!acc) return;

    dbService.addCashBankTransaction({
      voucherNumber: dbService.generateNextVoucherNumber('TX-ENT-'),
      date: new Date().toISOString().substring(0, 10),
      transactionType: entryType,
      accountId: acc.id,
      accountName: acc.accountName,
      amount: entryAmount,
      partyName: entryPartyName,
      referenceNumber: entryRef,
      description: entryDesc || `${entryType} posted to ${acc.accountName}`,
      postedBy: 'Cashier / Accountant',
      status: 'Posted',
    });

    setIsEntryModalOpen(false);
  };

  const handleOpenAddAccount = () => {
    setAccountForm({
      accountType: 'Bank Account',
      bankName: '',
      accountName: '',
      accountNumber: '',
      branchName: '',
      swiftIban: '',
      openingBalance: 0,
    });
    setIsAddAccountModalOpen(true);
  };

  const handleSubmitAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.accountName.trim()) {
      alert('Please enter an account name / title.');
      return;
    }
    dbService.addAccount({
      accountName: accountForm.accountName.trim(),
      accountType: accountForm.accountType,
      bankName: accountForm.bankName.trim() || undefined,
      accountNumber: accountForm.accountNumber.trim() || undefined,
      branchName: accountForm.branchName.trim() || undefined,
      swiftIban: accountForm.swiftIban.trim() || undefined,
      openingBalance: Number(accountForm.openingBalance) || 0,
      currentBalance: Number(accountForm.openingBalance) || 0,
      active: true,
    });
    setIsAddAccountModalOpen(false);
  };

  const handleOpenEditAccount = (acc: BankAccount) => {
    setEditingAccount(acc);
    setAccountForm({
      accountType: acc.accountType,
      bankName: acc.bankName || '',
      accountName: acc.accountName,
      accountNumber: acc.accountNumber || '',
      branchName: acc.branchName || '',
      swiftIban: acc.swiftIban || '',
      openingBalance: acc.openingBalance || 0,
    });
    setIsEditAccountModalOpen(true);
  };

  const handleSubmitEditAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    if (!accountForm.accountName.trim()) {
      alert('Please enter an account name / title.');
      return;
    }
    dbService.updateAccount(editingAccount.id, {
      accountName: accountForm.accountName.trim(),
      accountType: accountForm.accountType,
      bankName: accountForm.bankName.trim() || undefined,
      accountNumber: accountForm.accountNumber.trim() || undefined,
      branchName: accountForm.branchName.trim() || undefined,
      swiftIban: accountForm.swiftIban.trim() || undefined,
      openingBalance: Number(accountForm.openingBalance) || 0,
    });
    setIsEditAccountModalOpen(false);
    setEditingAccount(null);
  };

  const handleDeleteAccountConfirm = () => {
    if (!accountToDelete) return;
    const success = dbService.deleteAccount(accountToDelete.id);
    if (!success) {
      alert('Cannot delete the primary/only remaining account.');
    }
    setAccountToDelete(null);
  };

  const handleSaveBulkOpeningBalances = (e: React.FormEvent) => {
    e.preventDefault();
    Object.entries(openingBalancesDraft).forEach(([accId, ob]) => {
      const parsed = Number(ob) || 0;
      dbService.updateAccount(accId, { openingBalance: parsed });
    });
    setIsOpeningBalancesModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Landmark className="w-6 h-6 text-blue-600" />
            <span>Cash and Bank Accounts Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add bank accounts, edit balances, configure opening balances, inter-account transfers, and dual cash/bank books.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAddAccount}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Bank / Cash</span>
          </button>

          <button
            onClick={() => {
              const draft: Record<string, number> = {};
              accounts.forEach((a) => {
                draft[a.id] = a.openingBalance || 0;
              });
              setOpeningBalancesDraft(draft);
              setIsOpeningBalancesModalOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Scale className="w-4 h-4" />
            <span>Edit Opening Balances</span>
          </button>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Transfer Funds</span>
          </button>

          <button
            onClick={() => setIsEntryModalOpen(true)}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Cash / Bank Entry</span>
          </button>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map((acc) => {
          const isCash = acc.accountType === 'Cash in Hand' || acc.accountType === 'Petty Cash';
          return (
            <div
              key={acc.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isCash
                  ? 'bg-teal-50/60 border-teal-200 hover:border-teal-300'
                  : 'bg-indigo-50/60 border-indigo-200 hover:border-indigo-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {acc.accountType}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditAccount(acc)}
                      className="p-1 px-2 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                      title="Edit Bank Name, Details & Opening Balance"
                    >
                      <Edit2 className="w-3 h-3 text-blue-600" />
                      <span>Edit</span>
                    </button>
                    <div
                      className={`p-1.5 rounded-lg ${
                        isCash ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {isCash ? <Wallet className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                <h4 className="font-bold text-slate-900 text-xs truncate" title={acc.accountName}>
                  {acc.accountName}
                </h4>
                {acc.bankName && (
                  <div className="text-[11px] text-blue-700 font-bold mt-0.5 flex items-center gap-1">
                    <Building className="w-3 h-3 text-blue-500" />
                    <span>{acc.bankName}</span>
                  </div>
                )}
                {acc.accountNumber && (
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">A/C: {acc.accountNumber}</div>
                )}
                {acc.branchName && (
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">{acc.branchName}</div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-end justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">
                    Opening: {formatCurrency(acc.openingBalance || 0, currency)}
                  </span>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {formatCurrency(acc.currentBalance, currency)}
                  </div>
                </div>
                <button
                  onClick={() => handleOpenEditAccount(acc)}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                >
                  Edit Balances ➔
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Liquid Funds Banner */}
      <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Consolidated Liquid Treasury Funds</h4>
            <p className="text-xs text-slate-400">Cash in Safe + Commercial Bank Balances</p>
          </div>
        </div>

        <div className="flex items-center space-x-6 text-right">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Cash in Safe</span>
            <div className="text-base font-bold text-teal-400">{formatCurrency(totalCash, currency)}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Bank Balances</span>
            <div className="text-base font-bold text-indigo-400">{formatCurrency(totalBank, currency)}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Liquid Capital</span>
            <div className="text-xl font-black text-emerald-400">{formatCurrency(totalLiquid, currency)}</div>
          </div>
        </div>
      </div>

      {/* Account Transactions Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Time Period Filter Bar */}
        <div className="p-4 border-b border-slate-200 space-y-3 text-xs bg-slate-50/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Select Time Period:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'Today', label: 'Daily (Today)' },
                  { id: 'This Week', label: 'Weekly (This Week)' },
                  { id: 'This Month', label: 'Monthly (This Month)' },
                  { id: 'Custom', label: 'Between 2 Dates' },
                  { id: 'This Year', label: 'Yearly (This Year)' },
                  { id: 'All', label: 'All Records' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPeriod(item.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      period === item.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const settings = dbService.getState().settings;
                  const tableRows = filteredTransactions.map((tx) => [
                    tx.voucherNumber,
                    tx.date,
                    tx.accountName,
                    tx.transactionType,
                    tx.partyName || '-',
                    tx.description,
                    tx.transactionType.includes('Receipt') ? formatCurrency(tx.amount, currency) : '-',
                    tx.transactionType.includes('Payment') || tx.transactionType.includes('Expense') ? formatCurrency(tx.amount, currency) : '-',
                    tx.status,
                  ]);
                  const html = generateReportHtml(
                    `Cash & Bank Statement (${period})`,
                    `Transactions from ${dateRange.startDate} to ${dateRange.endDate}`,
                    ['Voucher #', 'Date', 'Account', 'Type', 'Party', 'Description', 'Inflow', 'Outflow', 'Status'],
                    tableRows,
                    [
                      { label: 'Total Inflows', value: formatCurrency(periodInflows, currency) },
                      { label: 'Total Outflows', value: formatCurrency(periodOutflows, currency) },
                      { label: 'Net Period Flow', value: formatCurrency(periodNetFlow, currency) },
                      { label: 'Transactions', value: filteredTransactions.length.toString() },
                    ],
                    settings,
                    currency,
                    dateRange
                  );
                  downloadHtmlFile(`CashBank_Statement_${dateRange.startDate}_${dateRange.endDate}.html`, html);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
                title="Download statement as .HTML"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .HTML</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>

          {/* Custom Date Pickers if selected */}
          {period === 'Custom' && (
            <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-700">Custom Date Range:</span>
              <div className="flex items-center space-x-2">
                <span className="text-slate-500">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded font-semibold text-xs"
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-500">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded font-semibold text-xs"
                />
              </div>
            </div>
          )}

          {/* Summary metrics for current period */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Period Inflows</span>
              <span className="text-sm font-bold text-emerald-600">{formatCurrency(periodInflows, currency)}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Period Outflows</span>
              <span className="text-sm font-bold text-rose-600">{formatCurrency(periodOutflows, currency)}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Period Movement</span>
              <span className={`text-sm font-black ${periodNetFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(periodNetFlow, currency)}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Records</span>
              <span className="text-sm font-bold text-slate-800">{filteredTransactions.length} Transactions</span>
            </div>
          </div>

          {/* Search and Account filter row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search voucher, party, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-500 font-semibold">Filter Account:</span>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="p-1.5 border border-slate-300 rounded-lg font-medium bg-white"
              >
                <option value="All">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Date &amp; Voucher #</th>
                <th className="px-4 py-3.5">Transaction Type</th>
                <th className="px-4 py-3.5">Primary Account</th>
                <th className="px-4 py-3.5">Party / Target Account</th>
                <th className="px-4 py-3.5">Description</th>
                <th className="px-4 py-3.5 text-right">Inflow (+)</th>
                <th className="px-4 py-3.5 text-right">Outflow (−)</th>
                <th className="px-4 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => {
                const isInflow =
                  tx.transactionType.includes('Receipt') || tx.transactionType === 'Opening Balance';
                const isOutflow =
                  tx.transactionType.includes('Payment') || tx.transactionType.includes('Advance');

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{tx.voucherNumber}</div>
                      <div className="text-[10px] text-slate-400">{tx.date}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          isInflow
                            ? 'bg-emerald-100 text-emerald-800'
                            : isOutflow
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">{tx.accountName}</td>
                    <td className="px-4 py-3.5">
                      {tx.targetAccountName ? (
                        <div className="font-semibold text-indigo-700">➔ {tx.targetAccountName}</div>
                      ) : (
                        <div className="font-semibold text-slate-900">{tx.partyName || '-'}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">{tx.description}</td>
                    <td className="px-4 py-3.5 text-right font-black text-emerald-600">
                      {isInflow ? formatCurrency(tx.amount, currency) : '-'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-rose-600">
                      {isOutflow ? formatCurrency(tx.amount, currency) : '-'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transfer Funds Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                <span>Inter-Account Fund Transfer</span>
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 text-[11px]">
              Transfer cash to bank, withdraw bank to cash, or wire between bank accounts without affecting P&amp;L or net liquidity.
            </p>

            <form onSubmit={handleExecuteTransfer} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Source Account (Debit/Deduct) *</label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} ({formatCurrency(a.currentBalance, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Destination Account (Credit/Add) *</label>
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} ({formatCurrency(a.currentBalance, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Transfer Amount *</label>
                <input
                  type="number"
                  min="1"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg font-black text-indigo-700 text-base"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Cheque / Reference #</label>
                <input
                  type="text"
                  placeholder="e.g. SELF-CHQ-10842"
                  value={transferReference}
                  onChange={(e) => setTransferReference(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Transfer Description</label>
                <input
                  type="text"
                  placeholder="e.g. Cash withdrawal to replenish yard safe"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* General Entry Modal */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Post Cash / Bank Entry</span>
              </h3>
              <button
                onClick={() => setIsEntryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteGeneralEntry} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Entry Transaction Type *</label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  <option value="Cash Receipt">Cash Receipt</option>
                  <option value="Bank Receipt">Bank Receipt</option>
                  <option value="Cash Payment">Cash Payment</option>
                  <option value="Bank Payment">Bank Payment</option>
                  <option value="Customer Receipt">Customer Receipt</option>
                  <option value="Driver Advance">Driver Advance</option>
                  <option value="Salary Payment">Salary Payment</option>
                  <option value="Bank Charges">Bank Charges</option>
                  <option value="Adjustment Voucher">Adjustment Voucher</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Account *</label>
                <select
                  value={entryAccountId}
                  onChange={(e) => setEntryAccountId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} ({formatCurrency(a.currentBalance, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Party / Payee / Beneficiary Name</label>
                <input
                  type="text"
                  placeholder="e.g. Driver Aslam, Fuel Station, Bank"
                  value={entryPartyName}
                  onChange={(e) => setEntryPartyName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Amount *</label>
                <input
                  type="number"
                  min="1"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg font-black text-slate-900 text-base"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Reference / Cheque #</label>
                <input
                  type="text"
                  value={entryRef}
                  onChange={(e) => setEntryRef(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description</label>
                <input
                  type="text"
                  value={entryDesc}
                  onChange={(e) => setEntryDesc(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD BANK / CASH ACCOUNT MODAL */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Landmark className="w-5 h-5 text-blue-600" />
                <h3>Add New Bank or Cash Account</h3>
              </div>
              <button
                onClick={() => setIsAddAccountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAddAccount} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Account Type *</label>
                  <select
                    value={accountForm.accountType}
                    onChange={(e) =>
                      setAccountForm({
                        ...accountForm,
                        accountType: e.target.value as any,
                        bankName: e.target.value === 'Bank Account' ? accountForm.bankName : '',
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Bank Account">Commercial Bank Account</option>
                    <option value="Cash in Hand">Cash in Hand / Safe</option>
                    <option value="Petty Cash">Petty Cash Drawer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {accountForm.accountType === 'Bank Account' ? 'Bank Name *' : 'Custodian / Branch'}
                  </label>
                  <input
                    type="text"
                    value={accountForm.bankName}
                    onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                    placeholder={
                      accountForm.accountType === 'Bank Account'
                        ? 'e.g. Meezan Bank, HBL, MCB'
                        : 'e.g. Head Office Safe / Cashier'
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    required={accountForm.accountType === 'Bank Account'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Account Name / Title (Display on Ledger) *
                </label>
                <input
                  type="text"
                  value={accountForm.accountName}
                  onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
                  placeholder="e.g. Meezan Bank - Fleet Freight A/C"
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  required
                />
              </div>

              {accountForm.accountType === 'Bank Account' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Account Number</label>
                    <input
                      type="text"
                      value={accountForm.accountNumber}
                      onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                      placeholder="e.g. 0201010049281"
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Branch Name &amp; City</label>
                    <input
                      type="text"
                      value={accountForm.branchName}
                      onChange={(e) => setAccountForm({ ...accountForm, branchName: e.target.value })}
                      placeholder="e.g. SITE Branch, Karachi"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">SWIFT Code / IBAN</label>
                    <input
                      type="text"
                      value={accountForm.swiftIban}
                      onChange={(e) => setAccountForm({ ...accountForm, swiftIban: e.target.value })}
                      placeholder="e.g. PK36MEZN0000201010049281"
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <label className="block text-amber-950 font-bold mb-1">
                  💰 Opening Balance ({currency}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={accountForm.openingBalance}
                  onChange={(e) =>
                    setAccountForm({
                      ...accountForm,
                      openingBalance: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2 border border-amber-300 rounded-lg font-black text-slate-900 bg-white text-base"
                />
                <p className="text-[10px] text-amber-800 mt-1">
                  Starting funds balance will automatically appear on the Cash/Bank ledger and Consolidated Liquid Capital.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BANK / CASH ACCOUNT & OPENING BALANCE MODAL */}
      {isEditAccountModalOpen && editingAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <h3>Edit Bank / Cash Account &amp; Balances</h3>
              </div>
              <button
                onClick={() => {
                  setIsEditAccountModalOpen(false);
                  setEditingAccount(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditAccount} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Account Type *</label>
                  <select
                    value={accountForm.accountType}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, accountType: e.target.value as any })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Bank Account">Commercial Bank Account</option>
                    <option value="Cash in Hand">Cash in Hand / Safe</option>
                    <option value="Petty Cash">Petty Cash Drawer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {accountForm.accountType === 'Bank Account' ? 'Bank Name *' : 'Custodian / Branch'}
                  </label>
                  <input
                    type="text"
                    value={accountForm.bankName}
                    onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                    placeholder="e.g. Meezan Bank, HBL, MCB"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    required={accountForm.accountType === 'Bank Account'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Account Name / Title (Display on Ledger) *
                </label>
                <input
                  type="text"
                  value={accountForm.accountName}
                  onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  required
                />
              </div>

              {accountForm.accountType === 'Bank Account' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Account Number</label>
                    <input
                      type="text"
                      value={accountForm.accountNumber}
                      onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Branch Name &amp; City</label>
                    <input
                      type="text"
                      value={accountForm.branchName}
                      onChange={(e) => setAccountForm({ ...accountForm, branchName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">SWIFT Code / IBAN</label>
                    <input
                      type="text"
                      value={accountForm.swiftIban}
                      onChange={(e) => setAccountForm({ ...accountForm, swiftIban: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Opening & Current Balance */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-amber-950 font-bold mb-1">
                      💰 Opening Balance ({currency}) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={accountForm.openingBalance}
                      onChange={(e) =>
                        setAccountForm({
                          ...accountForm,
                          openingBalance: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2 border border-amber-300 rounded-lg font-black text-slate-900 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Current Active Balance</label>
                    <div className="w-full p-2 bg-slate-100 border border-slate-300 rounded-lg font-black text-slate-900">
                      {formatCurrency(editingAccount.currentBalance, currency)}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-amber-800">
                  Editing the opening balance recalculates the account's starting position and updates real-time liquid capital.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                {accounts.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAccountToDelete(editingAccount);
                      setIsEditAccountModalOpen(false);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditAccountModalOpen(false);
                      setEditingAccount(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK OPENING BALANCES MODAL */}
      {isOpeningBalancesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Scale className="w-5 h-5 text-amber-600" />
                <h3>Set / Edit Opening Balances (All Banks &amp; Cash)</h3>
              </div>
              <button
                onClick={() => setIsOpeningBalancesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Set the exact starting cash in hand and commercial bank opening balances for your transport fleet operations.
            </p>

            <form onSubmit={handleSaveBulkOpeningBalances} className="space-y-4 text-xs">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Account Name</th>
                      <th className="p-3">Type / Bank</th>
                      <th className="p-3">A/C Number</th>
                      <th className="p-3 text-right">Opening Balance ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{acc.accountName}</td>
                        <td className="p-3 text-slate-600">{acc.bankName || acc.accountType}</td>
                        <td className="p-3 font-mono text-slate-500">{acc.accountNumber || '-'}</td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={openingBalancesDraft[acc.id] ?? acc.openingBalance ?? 0}
                            onChange={(e) =>
                              setOpeningBalancesDraft({
                                ...openingBalancesDraft,
                                [acc.id]: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-36 p-1.5 border border-slate-300 rounded font-black text-right text-slate-900 bg-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOpeningBalancesModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Save All Opening Balances
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <Trash2 className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">
                Delete Account {accountToDelete.accountName}?
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove account <strong>{accountToDelete.accountName}</strong>?
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setAccountToDelete(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccountConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
