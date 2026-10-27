/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  CreditCard,
  Building,
  Truck,
  Download,
} from 'lucide-react';
import { Invoice, InvoicePaymentStatus, Trip, Customer, BankAccount, CompanySettings } from '../types';
import { formatCurrency } from '../services/accountingEngine';
import { dbService } from '../services/db';
import { downloadHtmlFile, generateInvoiceHtml, generatePaymentReceiptHtml } from '../services/htmlExport';

interface InvoiceManagementProps {
  invoices: Invoice[];
  trips: Trip[];
  customers: Customer[];
  accounts: BankAccount[];
  currency: string;
  onSelectInvoiceToPrint: (invoice: Invoice) => void;
  onOpenNewInvoiceModal: () => void;
  settings?: CompanySettings;
}

export const InvoiceManagement: React.FC<InvoiceManagementProps> = ({
  invoices,
  trips,
  customers,
  accounts,
  currency,
  onSelectInvoiceToPrint,
  onOpenNewInvoiceModal,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleDownloadInvoiceHtml = (inv: Invoice) => {
    const compSettings = settings || dbService.getState().settings;
    const html = generateInvoiceHtml(inv, compSettings, currency);
    downloadHtmlFile(`Invoice_${inv.invoiceNumber}.html`, html);
  };
  const [statusFilter, setStatusFilter] = useState('All');
  const [receiptModalInvoice, setReceiptModalInvoice] = useState<Invoice | null>(null);

  // Receipt modal form
  const [receiptAmount, setReceiptAmount] = useState<number>(0);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptRemarks, setReceiptRemarks] = useState('');

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'All' || inv.paymentStatus === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      inv.invoiceNumber.toLowerCase().includes(term) ||
      inv.customerName.toLowerCase().includes(term) ||
      inv.tripNumber.toLowerCase().includes(term) ||
      inv.vehicleNumber.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: InvoicePaymentStatus) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Partially Paid':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Unpaid':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Overdue':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Cancelled':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const openReceiptModal = (inv: Invoice) => {
    setReceiptModalInvoice(inv);
    setReceiptAmount(inv.remainingBalance);
    setSelectedAccountId(accounts[0]?.id || '');
    setReferenceNumber(`TX-${Math.floor(10000 + Math.random() * 90000)}`);
    setReceiptRemarks(`Payment against Invoice ${inv.invoiceNumber}`);
  };

  const handleConfirmReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptModalInvoice) return;
    if (receiptAmount <= 0) {
      alert('Please enter a valid receipt amount.');
      return;
    }
    const inv = receiptModalInvoice;
    dbService.recordInvoiceReceipt(
      inv.id,
      receiptAmount,
      selectedAccountId,
      referenceNumber,
      receiptRemarks
    );
    setReceiptModalInvoice(null);

    const askPrint = window.confirm(
      `Receipt of ${formatCurrency(receiptAmount, currency)} successfully recorded for Invoice ${inv.invoiceNumber}!\n\nWould you like to print the official Customer Money Receipt now?`
    );
    if (askPrint) {
      const compSettings = settings || dbService.getState().settings;
      const html = generatePaymentReceiptHtml(
        {
          receiptNumber: referenceNumber || `CRV-${Date.now().toString().slice(-4)}`,
          receiptDate: new Date().toISOString().substring(0, 10),
          receivedFrom: inv.customerName,
          tripNumber: inv.tripNumber,
          vehicleNumber: inv.vehicleNumber,
          amount: receiptAmount,
          paymentMethod: 'Bank Transfer / Cash',
          referenceNumber,
          towardsParticulars: `Settlement against Invoice ${inv.invoiceNumber}`,
          totalFreightAmount: inv.totalInvoiceAmount,
          remainingBalance: Math.max(0, inv.remainingBalance - receiptAmount),
        },
        compSettings,
        currency
      );
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
        downloadHtmlFile(`Receipt_Invoice_${inv.invoiceNumber}.html`, html);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            <span>Customer Freight Invoicing &amp; Billing</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate formal freight tax invoices, track payment status, record partial/full bank collections.
          </p>
        </div>

        <button
          onClick={onOpenNewInvoiceModal}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Freight Invoice</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Invoice #, Customer, Trip #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['All', 'Unpaid', 'Partially Paid', 'Paid', 'Overdue'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === s
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Invoice # &amp; Date</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Linked Trip &amp; Fleet</th>
                <th className="px-4 py-3.5">Cargo Description</th>
                <th className="px-4 py-3.5 text-right">Total Invoice</th>
                <th className="px-4 py-3.5 text-right">Paid Amount</th>
                <th className="px-4 py-3.5 text-right">Balance Due</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-blue-700 text-sm">{inv.invoiceNumber}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Date: {inv.invoiceDate}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Due: {inv.dueDate}</div>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-slate-900 max-w-[150px] truncate">
                    {inv.customerName}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-slate-800">{inv.tripNumber}</div>
                    <div className="text-[10px] text-slate-500">{inv.vehicleNumber}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-slate-800">{inv.goodsDescription}</div>
                    <div className="text-[10px] text-slate-500">
                      {inv.quantity} {inv.quantityUnit} @ {formatCurrency(inv.freightRate, currency)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-slate-900 text-sm">
                    {formatCurrency(inv.totalInvoiceAmount, currency)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-emerald-600">
                    {formatCurrency(inv.amountReceived, currency)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div
                      className={`font-black text-sm ${
                        inv.remainingBalance > 0 ? 'text-blue-700' : 'text-slate-500'
                      }`}
                    >
                      {formatCurrency(inv.remainingBalance, currency)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                        inv.paymentStatus
                      )}`}
                    >
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-1.5">
                      {inv.remainingBalance > 0 && inv.paymentStatus !== 'Cancelled' && (
                        <button
                          onClick={() => openReceiptModal(inv)}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded font-bold text-xs transition-colors cursor-pointer"
                          title="Record Payment Receipt"
                        >
                          + Receipt
                        </button>
                      )}

                      <button
                        onClick={() => onSelectInvoiceToPrint(inv)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
                        title="Print Official Tax Invoice / Save as PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print / PDF</span>
                      </button>

                      <button
                        onClick={() => handleDownloadInvoiceHtml(inv)}
                        className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded font-bold text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                        title="Download Invoice as .HTML"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>.HTML</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Receipt Modal */}
      {receiptModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>Record Customer Receipt</span>
              </h3>
              <button
                onClick={() => setReceiptModalInvoice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>Invoice Number:</span>
                <strong className="text-blue-700">{receiptModalInvoice.invoiceNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <strong className="text-slate-900">{receiptModalInvoice.customerName}</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span>{formatCurrency(receiptModalInvoice.totalInvoiceAmount, currency)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 text-blue-700 font-bold">
                <span>Current Balance Due:</span>
                <span>{formatCurrency(receiptModalInvoice.remainingBalance, currency)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmReceipt} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Receipt Amount Received *</label>
                <input
                  type="number"
                  min="1"
                  max={receiptModalInvoice.remainingBalance}
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg font-black text-emerald-700 text-base"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Deposit Into Account *</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({formatCurrency(acc.currentBalance, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Cheque / Bank Reference #</label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-889102 or Online FT"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Remarks</label>
                <input
                  type="text"
                  value={receiptRemarks}
                  onChange={(e) => setReceiptRemarks(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReceiptModalInvoice(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Post Payment Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
