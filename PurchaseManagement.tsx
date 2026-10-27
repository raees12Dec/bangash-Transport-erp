/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Disc,
  Fuel,
  BatteryCharging,
  Plus,
  Printer,
  FileText,
  DollarSign,
  Truck,
  Building,
  Search,
  CheckCircle,
  CreditCard,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { PurchaseItem, PurchaseCategory, Supplier, CompanySettings, Vehicle, BankAccount } from '../types';
import { dbService } from '../services/db';
import {
  DateFilterPeriod,
  DateRange,
  getDateRangeFromPeriod,
  formatCurrency,
  generateSupplierLedger,
} from '../services/accountingEngine';
import {
  generatePurchaseBillHtml,
  downloadHtmlFile,
  generateSupplierLedgerHtml,
} from '../services/htmlExport';

interface PurchaseManagementProps {
  settings: CompanySettings;
  currencySymbol: string;
}

export const PurchaseManagement: React.FC<PurchaseManagementProps> = ({
  settings,
  currencySymbol,
}) => {
  const [activeTab, setActiveTab] = useState<'PURCHASES' | 'PARTY_LEDGER'>('PURCHASES');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Party ledger selected supplier
  const suppliers = dbService.getSuppliers();
  const [activeSupplierId, setActiveSupplierId] = useState<string>(suppliers[0]?.id || '');

  // New Purchase modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState<PurchaseCategory>('Tyres');
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('Nos');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Paid');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Payable'>('Cash');
  const [accountId, setAccountId] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [invoiceBillNumber, setInvoiceBillNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  const purchases = dbService.getPurchases();
  const vehicles = dbService.getVehicles();
  const accounts = dbService.getAccounts();

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (supplierFilter !== 'ALL' && p.supplierId !== supplierFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = (p.purchaseNumber || '').toLowerCase();
        const item = (p.itemName || '').toLowerCase();
        const sup = (p.supplierName || '').toLowerCase();
        const bill = (p.invoiceBillNumber || '').toLowerCase();
        if (!num.includes(q) && !item.includes(q) && !sup.includes(q) && !bill.includes(q)) return false;
      }
      return true;
    });
  }, [purchases, selectedCategory, supplierFilter, searchQuery]);

  // Party ledger date range filtering
  const [ledgerPeriod, setLedgerPeriod] = useState<DateFilterPeriod>('All Time');
  const [customRange, setCustomRange] = useState<DateRange>({
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  });

  const activeDateRange = useMemo(() => {
    return getDateRangeFromPeriod(ledgerPeriod, customRange.startDate, customRange.endDate);
  }, [ledgerPeriod, customRange]);

  // Selected Supplier
  const activeSupplier = suppliers.find((s) => s.id === activeSupplierId) || suppliers[0];
  const currentSupplierIndex = suppliers.findIndex((s) => s.id === (activeSupplier?.id || ''));

  const handlePrevSupplier = () => {
    if (currentSupplierIndex > 0) {
      setActiveSupplierId(suppliers[currentSupplierIndex - 1].id);
    }
  };

  const handleNextSupplier = () => {
    if (currentSupplierIndex < suppliers.length - 1) {
      setActiveSupplierId(suppliers[currentSupplierIndex + 1].id);
    }
  };

  // Generate the Supplier Party Ledger using the central accounting engine
  const ledgerResult = useMemo(() => {
    if (!activeSupplier) return null;
    return generateSupplierLedger(activeSupplier.id, activeDateRange, ledgerPeriod);
  }, [activeSupplier, activeDateRange, ledgerPeriod]);

  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === supplierId);
    if (!sup) {
      alert('Please select a valid supplier');
      return;
    }

    const qty = Number(quantity) || 1;
    const price = Number(unitPrice) || 0;
    const total = qty * price;
    const paid = paymentStatus === 'Paid' ? total : paymentStatus === 'Unpaid' ? 0 : Number(paidAmount) || 0;
    const remaining = Math.max(0, total - paid);

    const veh = vehicles.find((v) => v.id === vehicleId);

    try {
      dbService.addPurchase({
        purchaseNumber: dbService.generateNextPurchaseNumber(),
        date: new Date().toISOString().substring(0, 10),
        supplierId: sup.id,
        supplierName: sup.name,
        category,
        itemName,
        quantity: qty,
        unit,
        unitPrice: price,
        totalAmount: total,
        vehicleId: veh?.id,
        vehicleNumber: veh?.vehicleNumber,
        paymentStatus,
        paymentMethod,
        accountId: accountId || accounts[0]?.id,
        paidAmount: paid,
        remainingBalance: remaining,
        invoiceBillNumber,
        remarks,
      });

      setIsModalOpen(false);
      // Reset
      setItemName('');
      setQuantity('');
      setUnitPrice('');
      setPaidAmount('');
      setInvoiceBillNumber('');
      setRemarks('');
      alert('Purchase successfully recorded and ledger updated!');
    } catch (err: any) {
      alert(`Error creating purchase: ${err.message}`);
    }
  };

  const handlePrintBill = (purchase: PurchaseItem) => {
    const html = generatePurchaseBillHtml(purchase, settings, currencySymbol);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
    } else {
      downloadHtmlFile(`Purchase_Bill_${purchase.purchaseNumber}.html`, html);
    }
  };

  const handlePrintPartyLedger = () => {
    if (!activeSupplier || !ledgerResult) return;
    const html = generateSupplierLedgerHtml(activeSupplier, ledgerResult, settings, currencySymbol);
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
      downloadHtmlFile(`Party_Ledger_${activeSupplier.name.replace(/\s+/g, '_')}_${ledgerResult.periodLabel}.html`, html);
    }
  };

  const handleDownloadLedgerHtml = () => {
    if (!activeSupplier || !ledgerResult) return;
    const html = generateSupplierLedgerHtml(activeSupplier, ledgerResult, settings, currencySymbol);
    downloadHtmlFile(`Party_Ledger_${activeSupplier.name.replace(/\s+/g, '_')}_${ledgerResult.periodLabel}.html`, html);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-0.5 rounded uppercase">
              Procurement &amp; Workshop
            </span>
            <h1 className="text-xl font-black">Purchase System &amp; Party Ledger</h1>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Purchase of Tyres, Parts, Diesel, and Batty (Batteries) with Supplier Party Ledger Statements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveTab('PURCHASES')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition ${
                activeTab === 'PURCHASES' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Purchases List ({purchases.length})
            </button>
            <button
              onClick={() => setActiveTab('PARTY_LEDGER')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition ${
                activeTab === 'PARTY_LEDGER' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Supplier Party Ledger
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Log New Purchase
          </button>
        </div>
      </div>

      {activeTab === 'PURCHASES' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase mr-2">Category:</span>
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                selectedCategory === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              All Categories
            </button>
            <button
              onClick={() => setSelectedCategory('Tyres')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                selectedCategory === 'Tyres' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <Disc className="w-3.5 h-3.5" /> Purchase of Tyres
            </button>
            <button
              onClick={() => setSelectedCategory('Parts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                selectedCategory === 'Parts' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" /> Spare Parts
            </button>
            <button
              onClick={() => setSelectedCategory('Diesel')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                selectedCategory === 'Diesel' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <Fuel className="w-3.5 h-3.5" /> Diesel Fuel
            </button>
            <button
              onClick={() => setSelectedCategory('Battery')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                selectedCategory === 'Battery' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <BatteryCharging className="w-3.5 h-3.5" /> Batty (Battery)
            </button>

            <div className="ml-auto relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search purchases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* Purchases Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Purchase #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">Supplier / Party</th>
                    <th className="py-2.5 px-3">Allocated Truck</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.purchaseNumber}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.date}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{p.itemName}</div>
                        {p.invoiceBillNumber && (
                          <div className="text-[10px] text-slate-400">Bill Ref: {p.invoiceBillNumber}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{p.supplierName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.vehicleNumber || 'Depot / Bulk'}</td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        {p.quantity} {p.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatCurrency(p.unitPrice, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        {formatCurrency(p.totalAmount, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.paymentStatus === 'Partial'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handlePrintBill(p)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded flex items-center gap-1 mx-auto"
                        >
                          <Printer className="w-3 h-3" /> Bill PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPurchases.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-slate-400">
                        No purchases found matching your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUPPLIER PARTY LEDGER TAB */}
      {/* ============================================================ */}
      {activeTab === 'PARTY_LEDGER' && (
        <div className="space-y-4">
          {/* Supplier Selector & Navigation Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Party Ledger:</span>
              </div>

              {/* Prev / Next Supplier Controls */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={handlePrevSupplier}
                  disabled={currentSupplierIndex <= 0}
                  className="p-1 rounded hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Previous Supplier"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-bold text-slate-600 px-2">
                  {currentSupplierIndex + 1} of {suppliers.length}
                </span>
                <button
                  type="button"
                  onClick={handleNextSupplier}
                  disabled={currentSupplierIndex >= suppliers.length - 1}
                  className="p-1 rounded hover:bg-white text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Next Supplier"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Dropdown Selector */}
              <select
                value={activeSupplier?.id || ''}
                onChange={(e) => setActiveSupplierId(e.target.value)}
                className="text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.paymentTerms})
                  </option>
                ))}
              </select>
            </div>

            {/* Print & Export Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintPartyLedger}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition"
              >
                <Printer className="w-3.5 h-3.5" /> Print / PDF Option
              </button>
              <button
                type="button"
                onClick={handleDownloadLedgerHtml}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-slate-200 transition"
              >
                <Download className="w-3.5 h-3.5" /> .HTML
              </button>
            </div>
          </div>

          {/* Time Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Timeframe:
              </span>
              {(['All Time', 'Today', 'This Week', 'This Month', 'This Year', 'Custom'] as DateFilterPeriod[]).map(
                (p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setLedgerPeriod(p)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                      ledgerPeriod === p
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {p === 'Today' ? 'Daily' : p === 'This Week' ? 'Weekly' : p === 'This Month' ? 'Monthly' : p === 'This Year' ? 'Yearly' : p === 'Custom' ? 'Between 2 Dates' : p}
                  </button>
                )
              )}
            </div>

            {ledgerPeriod === 'Custom' && (
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

          {/* KPI Summary Cards */}
          {ledgerResult && activeSupplier && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Opening Balance ({activeDateRange.startDate})
                </div>
                <div className="text-lg font-black text-slate-800 mt-1">
                  {formatCurrency(ledgerResult.openingBalance, currencySymbol)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Prior unsettled dues</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  Period Purchases / Bills
                </div>
                <div className="text-lg font-black text-rose-600 mt-1">
                  +{formatCurrency(ledgerResult.totalCredit, currencySymbol)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Purchases recorded</div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Payments Released
                </div>
                <div className="text-lg font-black text-emerald-600 mt-1">
                  -{formatCurrency(ledgerResult.totalDebit, currencySymbol)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Disbursements cleared</div>
              </div>

              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                  Net Payable Due
                </div>
                <div className="text-lg font-black text-amber-950 mt-1">
                  {formatCurrency(ledgerResult.closingBalance, currencySymbol)}
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5">
                  Terms: {activeSupplier.paymentTerms}
                </div>
              </div>
            </div>
          )}

          {/* Party Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Party Statement: {activeSupplier?.name}
                </h3>
                <span className="text-[11px] text-slate-500">
                  Period: <strong>{ledgerResult?.periodLabel || ledgerPeriod}</strong> ({activeDateRange.startDate} to {activeDateRange.endDate})
                </span>
              </div>
              <div className="text-xs text-slate-600">
                Contact: <strong>{activeSupplier?.contactPerson || 'N/A'}</strong> ({activeSupplier?.mobileNumber || 'N/A'})
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Voucher / Bill Ref #</th>
                    <th className="py-2.5 px-3">Category / Type</th>
                    <th className="py-2.5 px-3">Description / Particulars</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700">Debit (Paid)</th>
                    <th className="py-2.5 px-3 text-right text-rose-700">Credit (Purchases)</th>
                    <th className="py-2.5 px-3 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {/* Opening Balance Row */}
                  {ledgerResult && (
                    <tr className="bg-slate-50/70 font-semibold text-slate-700">
                      <td className="py-2.5 px-3 font-mono">{activeDateRange.startDate}</td>
                      <td className="py-2.5 px-3 font-mono">OP-BAL</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                          Opening Balance
                        </span>
                      </td>
                      <td className="py-2.5 px-3 italic text-slate-600">
                        Balance brought forward before {activeDateRange.startDate}
                      </td>
                      <td className="py-2.5 px-3 text-right">-</td>
                      <td className="py-2.5 px-3 text-right">-</td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        {formatCurrency(ledgerResult.openingBalance, currencySymbol)}
                      </td>
                    </tr>
                  )}

                  {/* Ledger Entries */}
                  {ledgerResult &&
                    ledgerResult.entries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 text-slate-600 font-mono">{e.date}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{e.voucherNumber}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              e.transactionType === 'Purchase'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {e.category ? `${e.category} (${e.transactionType})` : e.transactionType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-800">{e.description}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {e.debit > 0 ? formatCurrency(e.debit, currencySymbol) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                          {e.credit > 0 ? formatCurrency(e.credit, currencySymbol) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          {formatCurrency(e.runningBalance, currencySymbol)}
                        </td>
                      </tr>
                    ))}

                  {ledgerResult && ledgerResult.entries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No transactions recorded for this supplier in the selected period ({ledgerResult.periodLabel}).
                      </td>
                    </tr>
                  )}
                </tbody>
                {/* Total Footer */}
                {ledgerResult && (
                  <tfoot className="bg-slate-100 font-bold border-t border-slate-200 text-xs">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-slate-700">
                        Period Totals &amp; Net Payable Due:
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-black">
                        {formatCurrency(ledgerResult.totalDebit, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-700 font-black">
                        {formatCurrency(ledgerResult.totalCredit, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 text-sm">
                        {formatCurrency(ledgerResult.closingBalance, currencySymbol)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: LOG NEW PURCHASE */}
      {/* ============================================================ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" /> Log New Purchase Entry
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Purchase Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Tyres">Purchase of Tyres</option>
                    <option value="Parts">Parts &amp; Spares</option>
                    <option value="Diesel">Diesel Fuel</option>
                    <option value="Battery">Batty (Batteries)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Supplier / Vendor Party</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Item Description / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bridgestone 315/80R22.5 Tubeless Tyres or Euro-5 Diesel 500L"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || '')}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    placeholder="Nos, Liters, Sets"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Unit Price ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value) || '')}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-right"
                  />
                </div>
              </div>

              {/* Total Calculation */}
              <div className="bg-slate-100 p-3 rounded-lg flex items-center justify-between">
                <span className="font-bold text-slate-600 uppercase">Calculated Total Amount:</span>
                <span className="text-base font-black text-slate-900">
                  {formatCurrency((Number(quantity) || 0) * (Number(unitPrice) || 0), currencySymbol)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Allocated Truck Fleet (Optional)</label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="">-- Depot Bulk / Terminal Yard --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNumber} ({v.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Vendor Bill / Invoice #</label>
                  <input
                    type="text"
                    placeholder="e.g. TYR-99201 or PETRO-441"
                    value={invoiceBillNumber}
                    onChange={(e) => setInvoiceBillNumber(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Paid">Fully Paid</option>
                    <option value="Partial">Partially Paid</option>
                    <option value="Unpaid">Unpaid (Credit)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="Bank">Bank Account</option>
                    <option value="Payable">Accounts Payable</option>
                  </select>
                </div>

                {paymentStatus === 'Partial' && (
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Paid Amount ({currencySymbol})</label>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value) || '')}
                      className="w-full p-2 border border-slate-300 rounded-lg font-bold text-right"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Remarks / Warranty Details</label>
                <input
                  type="text"
                  placeholder="e.g. 1-year replacement warranty, fitted to drive axle"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-md"
                >
                  Save Purchase &amp; Post to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
