/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  DollarSign,
  Tag,
  Truck,
  CreditCard,
  Building,
  CheckCircle,
  X,
  FileText,
  AlertCircle,
  Printer,
  Download,
} from 'lucide-react';
import { ExpenseVoucher, ExpenseCategory, Trip, Vehicle, Driver, BankAccount } from '../types';
import { formatCurrency } from '../services/accountingEngine';
import { dbService } from '../services/db';
import { downloadHtmlFile, generateExpenseVoucherHtml } from '../services/htmlExport';

interface ExpenseManagementProps {
  vouchers: ExpenseVoucher[];
  categories: ExpenseCategory[];
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  accounts: BankAccount[];
  currency: string;
  onOpenNewExpenseModal: () => void;
}

export const ExpenseManagement: React.FC<ExpenseManagementProps> = ({
  vouchers,
  categories,
  trips,
  vehicles,
  drivers,
  accounts,
  currency,
  onOpenNewExpenseModal,
}) => {
  const [activeTab, setActiveTab] = useState<'vouchers' | 'categories'>('vouchers');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Add new category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'Direct Trip' | 'Operating Overhead'>('Direct Trip');
  const [newCatDesc, setNewCatDesc] = useState('');

  const filteredVouchers = vouchers.filter((v) => {
    const matchesType = typeFilter === 'All' || v.type === typeFilter;
    const matchesCategory = categoryFilter === 'All' || v.categoryId === categoryFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      v.voucherNumber.toLowerCase().includes(term) ||
      (v.expenseName && v.expenseName.toLowerCase().includes(term)) ||
      v.categoryName.toLowerCase().includes(term) ||
      v.description.toLowerCase().includes(term) ||
      (v.tripNumber && v.tripNumber.toLowerCase().includes(term)) ||
      (v.vehicleNumber && v.vehicleNumber.toLowerCase().includes(term)) ||
      v.payee.toLowerCase().includes(term);
    return matchesType && matchesCategory && matchesSearch;
  });

  const handlePrintVoucher = (voucher: ExpenseVoucher) => {
    const settings = dbService.getState().settings;
    const html = generateExpenseVoucherHtml(voucher, settings, currency);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) win.focus();
  };

  const handleDownloadVoucherHtml = (voucher: ExpenseVoucher) => {
    const settings = dbService.getState().settings;
    const html = generateExpenseVoucherHtml(voucher, settings, currency);
    downloadHtmlFile(`Voucher_${voucher.voucherNumber}.html`, html);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    dbService.addExpenseCategory({
      name: newCatName.trim(),
      type: newCatType,
      description: newCatDesc.trim(),
      active: true,
    });
    setNewCatName('');
    setNewCatDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            <span>Expense Vouchers &amp; Cost Master</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log direct trip costs (fuel, tolls, driver allowance) and operating overheads with cash/bank reconciliation.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('vouchers')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'vouchers' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Expense Vouchers
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'categories' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Category Master
            </button>
          </div>

          <button
            onClick={onOpenNewExpenseModal}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Log Expense</span>
          </button>
        </div>
      </div>

      {activeTab === 'vouchers' ? (
        <>
          {/* Search & Filter */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Voucher #, Category, Trip, Payee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 font-medium">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded-lg font-medium"
                >
                  <option value="All">All Types</option>
                  <option value="Direct Trip">Direct Trip</option>
                  <option value="Operating Overhead">Operating Overhead</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 font-medium">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded-lg font-medium"
                >
                  <option value="All">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Vouchers Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Voucher # &amp; Date</th>
                    <th className="px-4 py-3.5">Expense Name / Title</th>
                    <th className="px-4 py-3.5">Category &amp; Classification</th>
                    <th className="px-4 py-3.5">Linked Trip / Fleet</th>
                    <th className="px-4 py-3.5">Payee &amp; Description</th>
                    <th className="px-4 py-3.5">Payment Method &amp; Ref</th>
                    <th className="px-4 py-3.5 text-right">Amount</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-right">Print / PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-blue-700">{v.voucherNumber}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{v.date}</div>
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <div className="font-bold text-slate-900 text-xs truncate" title={v.expenseName || v.categoryName}>
                          {v.expenseName || v.categoryName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{v.description}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{v.categoryName}</div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mt-0.5 ${
                            v.type === 'Direct Trip'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {v.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {v.tripNumber ? (
                          <div>
                            <div className="font-bold text-slate-800">{v.tripNumber}</div>
                            <div className="text-[10px] text-slate-500">{v.vehicleNumber || '-'}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">General Overhead</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-semibold text-slate-900">{v.payee}</div>
                        <div className="text-[10px] text-slate-500 truncate">{v.remarks || v.referenceNumber || '-'}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800">{v.paymentMethod}</div>
                        {v.referenceNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">Ref: {v.referenceNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-rose-600 text-sm">
                        {formatCurrency(v.amount, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handlePrintVoucher(v)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded flex items-center space-x-1 shadow-xs cursor-pointer"
                            title="Print Voucher / Save as PDF"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Print</span>
                          </button>
                          <button
                            onClick={() => handleDownloadVoucherHtml(v)}
                            className="p-1 hover:bg-emerald-50 rounded text-slate-600 hover:text-emerald-700 cursor-pointer"
                            title="Download Voucher as .HTML"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Category Master Tab */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs h-fit text-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Add New Expense Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Workshop Repairs, Container Demurrage"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Accounting Classification *</label>
                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="Direct Trip">Direct Trip Cost (Deducted from Trip P&amp;L)</option>
                  <option value="Operating Overhead">Operating Overhead (Administrative P&amp;L)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="Purpose of this category"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Save Category
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Active Chart of Expense Categories</h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Category Name</th>
                  <th className="px-4 py-3">Classification</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          c.type === 'Direct Trip'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.description || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
