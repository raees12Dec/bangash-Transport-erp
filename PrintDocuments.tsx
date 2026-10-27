/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Printer,
  X,
  Truck,
  CheckCircle,
  ShieldCheck,
  Building,
  Download,
  FileCode,
} from 'lucide-react';
import { Trip, Invoice, POD, Customer, CompanySettings } from '../types';
import { formatCurrency, CustomerLedgerResult, amountToWords } from '../services/accountingEngine';
import {
  downloadHtmlFile,
  generateBiltyHtml,
  generateInvoiceHtml,
  generatePODHtml,
  generateLedgerHtml,
  generatePaymentReceiptHtml,
  generateExpenseVoucherHtml,
  generateSupplierStatementHtml,
  PaymentReceiptData,
} from '../services/htmlExport';
import { ExpenseVoucher, Supplier, CashBankTransaction } from '../types';

interface PrintDocumentsModalProps {
  type: 'bilty' | 'invoice' | 'pod' | 'statement' | 'receipt' | 'voucher' | 'supplier-statement' | null;
  data: any;
  settings: CompanySettings;
  currency: string;
  onClose: () => void;
}

export const PrintDocumentsModal: React.FC<PrintDocumentsModalProps> = ({
  type,
  data,
  settings,
  currency,
  onClose,
}) => {
  if (!type || !data) return null;

  const logoSrc = settings.logoUrl || '/assets/aistudio/Bangash_Transport_Co._Logo_b758f5dc.png';

  const renderAmountInWordsUI = (amount: number, label: string = 'Amount in Words') => (
    <div className="bg-slate-50 border-l-4 border-l-blue-600 border border-slate-200 rounded-lg p-3 flex items-start gap-2 text-xs">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap mt-0.5">
        {label}:
      </span>
      <span className="text-xs font-black text-slate-900 italic">
        {amountToWords(amount)}
      </span>
    </div>
  );

  const renderOfficialSignaturesUI = (
    cols: Array<{ title: string; subtitle?: string; name?: string; isAuthorized?: boolean }>
  ) => {
    const signatoryName = settings.authorizedSignatoryName || 'Malik Bangash (Managing Director)';
    const signatoryTitle = settings.authorizedSignatoryTitle || 'Authorized Signatory';
    const showStamp = settings.showOfficialStamp !== false;

    return (
      <div className={`grid grid-cols-${cols.length} gap-3 sm:gap-4 pt-6 mt-6 border-t border-slate-300 text-center text-xs page-break-inside-avoid`}>
        {cols.map((c, idx) => (
          <div
            key={idx}
            className={`border rounded-xl p-3 flex flex-col justify-between min-h-[120px] ${
              c.isAuthorized ? 'border-blue-400 bg-blue-50/70 shadow-xs' : 'border-slate-300 bg-slate-50/70'
            }`}
          >
            <div className={`text-[10px] font-black uppercase tracking-wider ${c.isAuthorized ? 'text-blue-800' : 'text-slate-600'}`}>
              {c.isAuthorized ? `For ${settings.companyName}` : c.title}
            </div>
            <div className="h-10 flex items-center justify-center my-1">
              {c.isAuthorized && showStamp ? (
                <div className="border border-dashed border-blue-500 bg-white rounded px-2.5 py-1 text-[9px] font-black text-blue-700 tracking-wider uppercase shadow-2xs">
                  ★ Official Seal &amp; Stamp ★
                </div>
              ) : (
                <div className="w-4/5 border-b border-slate-400"></div>
              )}
            </div>
            <div className={`pt-1 border-t ${c.isAuthorized ? 'border-blue-200' : 'border-slate-300'}`}>
              <div className="font-black text-slate-900 text-[11px] leading-tight">
                {c.isAuthorized ? signatoryName : (c.name || c.title)}
              </div>
              <div className={`text-[10px] font-bold ${c.isAuthorized ? 'text-blue-700' : 'text-slate-500'}`}>
                {c.isAuthorized ? signatoryTitle : (c.subtitle || '')}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleDownloadHtml = () => {
    if (type === 'bilty') {
      const html = generateBiltyHtml(data, settings, currency);
      downloadHtmlFile(`Bilty_${data.bdNumber}_${data.tripNumber}.html`, html);
    } else if (type === 'invoice') {
      const html = generateInvoiceHtml(data, settings, currency);
      downloadHtmlFile(`Invoice_${data.invoiceNumber}.html`, html);
    } else if (type === 'pod') {
      const html = generatePODHtml(data, settings);
      downloadHtmlFile(`POD_${data.podNumber}_${data.tripNumber}.html`, html);
    } else if (type === 'statement') {
      const html = generateLedgerHtml(data.customer, data.ledger, settings, currency);
      downloadHtmlFile(`Statement_${data.customer.companyName.replace(/\s+/g, '_')}.html`, html);
    } else if (type === 'receipt') {
      const html = generatePaymentReceiptHtml(data, settings, currency);
      downloadHtmlFile(`Receipt_${data.receiptNumber}.html`, html);
    } else if (type === 'voucher') {
      const html = generateExpenseVoucherHtml(data, settings, currency);
      downloadHtmlFile(`Voucher_${data.voucherNumber}.html`, html);
    } else if (type === 'supplier-statement') {
      const html = generateSupplierStatementHtml(data.supplier, data.transactions || [], data.vouchers || [], settings, currency);
      downloadHtmlFile(`Supplier_Statement_${data.supplier.name.replace(/\s+/g, '_')}.html`, html);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] overflow-y-auto border border-slate-300">
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="no-print sticky top-0 bg-slate-900 text-white p-4 rounded-t-2xl flex items-center justify-between z-20">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm">
              Document Preview: {type.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleDownloadHtml}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
              title="Download standalone offline .HTML document"
            >
              <Download className="w-4 h-4" />
              <span>Download .HTML</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE CANVAS CONTAINER */}
        <div className="p-8 text-slate-900 printable-card text-xs space-y-6">
          {/* ================= BILTY / CONSIGNMENT NOTE ================= */}
          {type === 'bilty' && (() => {
            const trip = data as Trip;
            return (
              <div className="space-y-5 border-2 border-slate-900 p-6 rounded-lg">
                {/* Header with Logo */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                  <div className="flex items-start space-x-3.5">
                    <img
                      src={logoSrc}
                      alt={settings.companyName}
                      className="w-16 h-16 object-contain rounded-md border border-slate-200 bg-white p-0.5 shrink-0"
                    />
                    <div>
                      <h1 className="text-xl font-black tracking-wide text-slate-950 uppercase">
                        {settings.companyName}
                      </h1>
                      <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">{settings.tagline}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{settings.address}, {settings.cityCountry}</p>
                      <p className="text-[10px] text-slate-600">Tel: {settings.phone} | Email: {settings.email}</p>
                      <p className="text-[10px] font-mono font-bold text-slate-800">Tax NTN/GST: {settings.taxRegistrationNumber}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="border-2 border-slate-900 px-3 py-1 text-center font-black text-sm uppercase bg-slate-100">
                      GOODS CONSIGNMENT NOTE / BILTY
                    </div>
                    <div className="mt-2 text-[11px] font-mono">
                      <div><strong>Bilty No:</strong> <span className="font-bold text-blue-800 text-sm">{trip.bdNumber}</span></div>
                      <div><strong>Trip Ref:</strong> {trip.tripNumber}</div>
                      <div><strong>Date:</strong> {trip.tripDate}</div>
                    </div>
                  </div>
                </div>

                {/* Parties & Transport Grid */}
                <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-4">
                  <div className="border border-slate-300 p-3 rounded space-y-1">
                    <span className="font-bold text-slate-900 uppercase block text-[10px] border-b pb-1">
                      Consignor (Sender) &amp; Customer
                    </span>
                    <div className="font-bold text-sm text-slate-900">{trip.customerCompanyName}</div>
                    <div>Ref / PO #: {trip.customerInvoiceNumber || 'N/A'}</div>
                    <div><strong>Pickup Origin:</strong> {trip.startingLocation}</div>
                    <div>Dispatched: {trip.startingDateTime}</div>
                  </div>

                  <div className="border border-slate-300 p-3 rounded space-y-1">
                    <span className="font-bold text-slate-900 uppercase block text-[10px] border-b pb-1">
                      Carrier Vehicle &amp; Driver Details
                    </span>
                    <div className="font-bold text-sm text-slate-900">Vehicle: {trip.vehicleNumber}</div>
                    <div>Type: {trip.vehicleType} ({trip.vehicleSize})</div>
                    <div><strong>Driver:</strong> {trip.driverName} (Contact: {trip.driverContactNumber})</div>
                    <div className="font-mono text-[10px]">Driver CNIC: {trip.driverIdNumber}</div>
                  </div>
                </div>

                {/* Route Destination */}
                <div className="p-2.5 bg-slate-100 rounded border border-slate-300 flex justify-between items-center font-semibold text-xs">
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Destination Location:</span>
                    <span className="font-bold text-slate-900">{trip.destinationLocation}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">Expected Delivery:</span>
                    <span>{trip.expectedDeliveryDateTime}</span>
                  </div>
                </div>

                {/* Goods Table */}
                <table className="w-full text-left border border-slate-900">
                  <thead className="bg-slate-200 border-b border-slate-900 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border-r border-slate-900">Cargo Particulars &amp; Marks</th>
                      <th className="p-2 border-r border-slate-900 text-center">Quantity</th>
                      <th className="p-2 border-r border-slate-900 text-center">Unit</th>
                      <th className="p-2 border-r border-slate-900 text-right">Freight Rate</th>
                      <th className="p-2 text-right">Freight Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border-r border-slate-900 font-bold text-slate-900">
                        {trip.goodsDescription}
                        {trip.remarks && <div className="text-[10px] text-slate-500 font-normal italic mt-1">{trip.remarks}</div>}
                      </td>
                      <td className="p-3 border-r border-slate-900 text-center font-bold">{trip.goodsQuantity}</td>
                      <td className="p-3 border-r border-slate-900 text-center">{trip.quantityUnit}</td>
                      <td className="p-3 border-r border-slate-900 text-right font-semibold">
                        {formatCurrency(trip.freightRate, currency)} ({trip.rateType})
                      </td>
                      <td className="p-3 text-right font-black text-slate-950 text-sm">
                        {formatCurrency(trip.totalFreightAmount, currency)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="border-t border-slate-900 font-bold bg-slate-50">
                    <tr>
                      <td colSpan={4} className="p-2 text-right border-r border-slate-900">Customer Advance Received:</td>
                      <td className="p-2 text-right font-bold text-emerald-700">
                        {formatCurrency(trip.advanceReceived, currency)}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-900">
                      <td colSpan={4} className="p-2 text-right border-r border-slate-900 text-sm">Balance Payable at Delivery:</td>
                      <td className="p-2 text-right font-black text-sm text-slate-950">
                        {formatCurrency(trip.outstandingFreightAmount, currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {renderAmountInWordsUI(trip.totalFreightAmount, 'Total Freight Revenue in Words')}

                {/* Signatures */}
                {renderOfficialSignaturesUI([
                  { title: 'Consignor / Sender', subtitle: 'Signature & Stamp', name: trip.customerCompanyName },
                  { title: 'Carrier Driver', subtitle: 'Driver Acknowledgment', name: `${trip.driverName} (${trip.vehicleNumber})` },
                  { title: 'Booking Dispatch', subtitle: 'Station Verified', name: 'Operations Desk' },
                  { title: 'Carrier Authorization', isAuthorized: true },
                ])}
              </div>
            );
          })()}

          {/* ================= TAX FREIGHT INVOICE ================= */}
          {type === 'invoice' && (() => {
            const inv = data as Invoice;
            return (
              <div className="space-y-6 border border-slate-300 p-8 rounded-xl shadow-xs">
                {/* Header with Logo */}
                <div className="flex justify-between items-start border-b pb-5">
                  <div className="flex items-start space-x-3.5">
                    <img
                      src={logoSrc}
                      alt={settings.companyName}
                      className="w-16 h-16 object-contain rounded-md border border-slate-200 bg-white p-0.5 shrink-0"
                    />
                    <div>
                      <h1 className="text-2xl font-black text-slate-900">{settings.companyName}</h1>
                      <p className="text-blue-700 font-bold text-xs uppercase tracking-wide">{settings.tagline}</p>
                      <p className="text-slate-500 text-[11px] mt-1">{settings.address}, {settings.cityCountry}</p>
                      <p className="text-slate-500 text-[11px]">Phone: {settings.phone} | NTN: {settings.taxRegistrationNumber}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <h2 className="text-xl font-black text-blue-800 uppercase tracking-wide">
                      FREIGHT TAX INVOICE
                    </h2>
                    <div className="mt-2 space-y-1 text-slate-700">
                      <div><strong>Invoice #:</strong> <span className="font-bold">{inv.invoiceNumber}</span></div>
                      <div><strong>Invoice Date:</strong> {inv.invoiceDate}</div>
                      <div><strong>Due Date:</strong> {inv.dueDate}</div>
                      <div>
                        <strong>Status:</strong>{' '}
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 uppercase">
                          {inv.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bill To */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">BILLED TO (CUSTOMER):</span>
                    <div className="text-sm font-bold text-slate-900 mt-1">{inv.customerName}</div>
                    <div className="text-slate-600">{inv.billingAddress || 'Official Billing Address'}</div>
                    <div className="text-slate-500 font-mono mt-1">Tax NTN: {inv.customerTaxNumber || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">CARRIER PARTICULARS:</span>
                    <div className="text-xs text-slate-700 mt-1"><strong>Trip Ref:</strong> {inv.tripNumber}</div>
                    <div className="text-xs text-slate-700"><strong>Vehicle:</strong> {inv.vehicleNumber}</div>
                  </div>
                </div>

                {/* Line Items Table */}
                <table className="w-full text-left border border-slate-200">
                  <thead className="bg-slate-100 font-bold text-[11px] uppercase border-b border-slate-300">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-center">Quantity</th>
                      <th className="p-3 text-right">Freight Rate</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-3 font-semibold text-slate-900">
                        Freight Transportation: {inv.goodsDescription}
                        <div className="text-[10px] text-slate-400 font-normal">Consignment Trip {inv.tripNumber}</div>
                      </td>
                      <td className="p-3 text-center font-bold">{inv.quantity} {inv.quantityUnit}</td>
                      <td className="p-3 text-right">{formatCurrency(inv.freightRate, currency)}</td>
                      <td className="p-3 text-right font-bold">{formatCurrency(inv.freightAmount, currency)}</td>
                    </tr>
                    {inv.loadingUnloadingCharges > 0 && (
                      <tr>
                        <td className="p-3 text-slate-700">Loading &amp; Offloading Handling Charges</td>
                        <td className="p-3 text-center">-</td>
                        <td className="p-3 text-right">-</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(inv.loadingUnloadingCharges, currency)}</td>
                      </tr>
                    )}
                    {inv.additionalCharges > 0 && (
                      <tr>
                        <td className="p-3 text-slate-700">Additional Surcharges &amp; Tolls</td>
                        <td className="p-3 text-center">-</td>
                        <td className="p-3 text-right">-</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(inv.additionalCharges, currency)}</td>
                      </tr>
                    )}
                    {inv.discount > 0 && (
                      <tr>
                        <td className="p-3 text-emerald-700 font-semibold">Special Contract Discount</td>
                        <td className="p-3 text-center">-</td>
                        <td className="p-3 text-right">-</td>
                        <td className="p-3 text-right font-bold text-emerald-700">
                          − {formatCurrency(inv.discount, currency)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-300 font-bold bg-slate-50">
                    <tr>
                      <td colSpan={3} className="p-2.5 text-right">Total Invoice Value:</td>
                      <td className="p-2.5 text-right text-sm font-black text-slate-900">
                        {formatCurrency(inv.totalInvoiceAmount, currency)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="p-2.5 text-right text-emerald-700">Less: Payments / Advances Received:</td>
                      <td className="p-2.5 text-right font-bold text-emerald-700">
                        − {formatCurrency(inv.amountReceived, currency)}
                      </td>
                    </tr>
                    <tr className="bg-slate-900 text-white font-black text-sm">
                      <td colSpan={3} className="p-3 text-right uppercase">Net Balance Due:</td>
                      <td className="p-3 text-right text-emerald-400">
                        {formatCurrency(inv.remainingBalance, currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {renderAmountInWordsUI(
                  inv.remainingBalance > 0 ? inv.remainingBalance : inv.totalInvoiceAmount,
                  inv.remainingBalance > 0 ? 'Net Balance Payable in Words' : 'Total Invoice Value in Words'
                )}

                {/* Bank Payment Details */}
                <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                  <span className="font-bold text-slate-900 block mb-1">Bank Payment Wire Instructions:</span>
                  <p className="text-slate-700">{settings.bankDetailsForInvoice}</p>
                </div>

                {/* Signatory */}
                {renderOfficialSignaturesUI([
                  { title: 'Client Acceptance', subtitle: 'Received & Accepted', name: inv.customerName },
                  { title: 'Billing & Accounts Auditor', subtitle: 'Finance Department', name: 'Accounts Wing' },
                  { title: 'Commercial Authorization', isAuthorized: true },
                ])}
              </div>
            );
          })()}

          {/* ================= PROOF OF DELIVERY (POD) ================= */}
          {type === 'pod' && (() => {
            const pod = data as POD;
            return (
              <div className="space-y-6 border-2 border-slate-900 p-8 rounded-xl shadow-xs">
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                  <div className="flex items-start space-x-3.5">
                    <img
                      src={logoSrc}
                      alt={settings.companyName}
                      className="w-16 h-16 object-contain rounded-md border border-slate-200 bg-white p-0.5 shrink-0"
                    />
                    <div>
                      <h1 className="text-xl font-black text-slate-950 uppercase">{settings.companyName}</h1>
                      <p className="text-xs text-blue-700 font-bold uppercase">{settings.tagline}</p>
                      <p className="text-[10px] text-slate-500">{settings.address}, {settings.cityCountry}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="border-2 border-slate-900 px-3 py-1 font-black text-sm uppercase bg-slate-100">
                      PROOF OF DELIVERY (POD) CERTIFICATE
                    </div>
                    <div className="mt-2 text-xs font-mono font-bold text-blue-800">
                      POD #: {pod.podNumber}
                    </div>
                    <div className="text-slate-600">Trip #: {pod.tripNumber}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border border-slate-300 p-4 rounded">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Customer / Consignee:</span>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">{pod.customerName}</div>
                    <div>Destination: {pod.deliveryLocation}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Carrier Fleet:</span>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">{pod.vehicleNumber}</div>
                    <div>Driver In-Charge: {pod.driverName}</div>
                  </div>
                </div>

                {/* Delivery Verification Table */}
                <table className="w-full text-left border border-slate-900">
                  <thead className="bg-slate-200 border-b border-slate-900 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border-r border-slate-900">Cargo Description</th>
                      <th className="p-2 border-r border-slate-900 text-center">Dispatched Qty</th>
                      <th className="p-2 border-r border-slate-900 text-center">Delivered Qty</th>
                      <th className="p-2 border-r border-slate-900 text-center">Unit</th>
                      <th className="p-2">Condition &amp; Shortage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border-r border-slate-900 font-bold">{pod.goodsDescription}</td>
                      <td className="p-3 border-r border-slate-900 text-center font-semibold">{pod.quantityDispatched}</td>
                      <td className="p-3 border-r border-slate-900 text-center font-bold text-blue-800">{pod.quantityDelivered}</td>
                      <td className="p-3 border-r border-slate-900 text-center">{pod.quantityUnit}</td>
                      <td className="p-3 text-emerald-700 font-semibold">{pod.shortageDamageDetails || 'Nil / Intact'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Receiver Acknowledgement */}
                <div className="p-4 bg-slate-50 border border-slate-300 rounded-lg space-y-2">
                  <span className="font-bold text-slate-900 uppercase block text-xs">
                    Receiver Official Acknowledgement:
                  </span>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Received By (Name):</span>
                      <strong className="text-slate-900">{pod.receivedBy || 'Verified'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Designation / Title:</span>
                      <strong className="text-slate-900">{pod.receiverDesignation || 'Receiving In-charge'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Contact Phone:</span>
                      <strong className="text-slate-900">{pod.receiverContactNumber || 'N/A'}</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-slate-700">
                    <span className="text-slate-500">Delivery Remarks:</span>{' '}
                    <span>{pod.deliveryRemarks || 'Cargo verified against bill of lading.'}</span>
                  </div>
                </div>

                {/* Official Signatures */}
                {renderOfficialSignaturesUI([
                  { title: 'Consignee Receiver Stamp', subtitle: pod.receiverDesignation || 'Receiver Acknowledgment', name: pod.receivedBy || 'Designated Receiver' },
                  { title: 'Fleet Driver', subtitle: 'Delivery Confirmed', name: `${pod.driverName} (${pod.vehicleNumber})` },
                  { title: 'Carrier Operations Audit', isAuthorized: true },
                ])}
              </div>
            );
          })()}

          {/* ================= CUSTOMER STATEMENT ================= */}
          {type === 'statement' && (() => {
            const customer = data.customer as Customer;
            const ledger = data.ledger as CustomerLedgerResult;
            return (
              <div className="space-y-6">
                <div className="flex justify-between items-start border-b pb-4">
                  <div className="flex items-start space-x-3.5">
                    <img
                      src={logoSrc}
                      alt={settings.companyName}
                      className="w-16 h-16 object-contain rounded-md border border-slate-200 bg-white p-0.5 shrink-0"
                    />
                    <div>
                      <h1 className="text-2xl font-black text-slate-900">{settings.companyName}</h1>
                      <p className="text-xs text-blue-700 font-bold uppercase">{settings.tagline}</p>
                      <p className="text-xs text-slate-600">{settings.address}, {settings.cityCountry}</p>
                      <p className="text-xs text-slate-500">NTN: {settings.taxRegistrationNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-black text-blue-800 uppercase">CUSTOMER ACCOUNT STATEMENT</h2>
                    <div className="text-xs text-slate-600 mt-1">Date Printed: {new Date().toISOString().substring(0, 10)}</div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-base text-slate-900">{customer.companyName}</div>
                  <div className="text-xs text-slate-600">{customer.billingAddress}</div>
                  <div className="text-xs text-slate-500">NTN: {customer.taxRegistrationNumber} • Terms: {customer.paymentTerms}</div>
                </div>

                <table className="w-full text-left border border-slate-200 text-xs">
                  <thead className="bg-slate-100 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Voucher / Ref #</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-right">Debit</th>
                      <th className="p-2.5 text-right">Credit</th>
                      <th className="p-2.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    <tr className="bg-slate-50 font-bold">
                      <td colSpan={4} className="p-2.5">OPENING BALANCE</td>
                      <td className="p-2.5 text-right">-</td>
                      <td className="p-2.5 text-right">-</td>
                      <td className="p-2.5 text-right font-bold">{formatCurrency(ledger.openingBalance, currency)}</td>
                    </tr>
                    {ledger.entries.map((e) => (
                      <tr key={e.id}>
                        <td className="p-2.5">{e.date}</td>
                        <td className="p-2.5">{e.transactionType}</td>
                        <td className="p-2.5 font-bold">{e.voucherNumber}</td>
                        <td className="p-2.5">{e.description}</td>
                        <td className="p-2.5 text-right font-bold text-blue-700">
                          {e.debit > 0 ? formatCurrency(e.debit, currency) : '-'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-600">
                          {e.credit > 0 ? formatCurrency(e.credit, currency) : '-'}
                        </td>
                        <td className="p-2.5 text-right font-black">{formatCurrency(e.runningBalance, currency)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 text-white font-black">
                      <td colSpan={4} className="p-3 uppercase">Net Statement Closing Balance:</td>
                      <td className="p-3 text-right">{formatCurrency(ledger.totalDebit, currency)}</td>
                      <td className="p-3 text-right">{formatCurrency(ledger.totalCredit, currency)}</td>
                      <td className="p-3 text-right text-emerald-400 text-sm">
                        {formatCurrency(ledger.closingBalance, currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {renderAmountInWordsUI(ledger.closingBalance, 'Closing Receivable Balance in Words')}

                {renderOfficialSignaturesUI([
                  { title: 'Customer Accounts Officer', subtitle: 'Statement Confirmed', name: customer.companyName },
                  { title: 'Billing & Receivables Auditor', subtitle: 'Reconciled & Verified', name: 'Finance Department' },
                  { title: 'Commercial Authorization', isAuthorized: true },
                ])}
              </div>
            );
          })()}

          {/* PAYMENT RECEIPT PREVIEW */}
          {type === 'receipt' && (() => {
            const r = data as PaymentReceiptData;
            return (
              <div className="space-y-6">
                <div className="flex justify-between items-start border-b pb-4">
                  <div className="flex items-start space-x-3.5">
                    <img
                      src={logoSrc}
                      alt={settings.companyName}
                      className="w-16 h-16 object-contain rounded-md border border-slate-200 bg-white p-0.5 shrink-0"
                    />
                    <div>
                      <h1 className="text-2xl font-black text-slate-900">{settings.companyName}</h1>
                      <p className="text-xs text-blue-700 font-bold uppercase">{settings.tagline}</p>
                      <p className="text-xs text-slate-600">{settings.address}, {settings.cityCountry}</p>
                      <p className="text-xs text-slate-500">NTN: {settings.taxRegistrationNumber} | Phone: {settings.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-emerald-700 text-white font-bold text-xs uppercase px-3 py-1 rounded">
                      OFFICIAL CUSTOMER MONEY RECEIPT
                    </span>
                    <div className="text-xs font-bold text-slate-900 mt-2">Receipt #: {r.receiptNumber}</div>
                    <div className="text-xs text-slate-600">Date: {r.receiptDate}</div>
                    <div className="text-xs text-slate-600">Mode: {r.paymentMethod}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Received With Thanks From:</div>
                    <div className="text-base font-bold text-slate-900 mt-1">{r.receivedFrom}</div>
                    <div className="text-xs text-slate-600 mt-1">Towards: <strong>{r.towardsParticulars}</strong></div>
                    {r.referenceNumber && <div className="text-xs text-slate-500">Ref / Cheque #: {r.referenceNumber}</div>}
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Consignment Particulars:</div>
                    {r.tripNumber && <div className="text-xs text-slate-700 font-semibold mt-1">Trip #: {r.tripNumber}</div>}
                    {r.biltyNumber && <div className="text-xs text-slate-600">Bilty #: {r.biltyNumber}</div>}
                    {r.vehicleNumber && <div className="text-xs text-slate-600">Vehicle: {r.vehicleNumber}</div>}
                    {r.route && <div className="text-xs text-slate-600">Route: {r.route}</div>}
                  </div>
                </div>

                <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold text-emerald-800 uppercase">Net Amount Received</div>
                    <div className="text-2xl font-black text-emerald-700">{formatCurrency(r.amount, currency)}</div>
                  </div>
                  {r.remainingBalance !== undefined && (
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-600 uppercase">Outstanding Balance</div>
                      <div className="text-lg font-bold text-amber-600">{formatCurrency(r.remainingBalance, currency)}</div>
                    </div>
                  )}
                </div>

                {renderAmountInWordsUI(r.amount, 'Amount Received in Words')}

                {settings.bankDetailsForInvoice && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                    <span className="font-bold text-slate-900 block mb-0.5">Bank Remittance Info:</span>
                    <span>{settings.bankDetailsForInvoice}</span>
                  </div>
                )}

                {r.notes && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                    <strong>Payment Notes:</strong> {r.notes}
                  </div>
                )}

                {renderOfficialSignaturesUI([
                  { title: 'Customer / Depositor', subtitle: 'Signature & Official Stamp', name: r.receivedFrom },
                  { title: 'Cashier / Accountant', subtitle: 'Accounts & Treasury', name: 'Finance Wing' },
                  { title: 'Authorized Carrier Approval', isAuthorized: true },
                ])}
              </div>
            );
          })()}

          {/* EXPENSE VOUCHER PREVIEW */}
          {type === 'voucher' && (() => {
            const v = data as ExpenseVoucher;
            return (
              <div className="space-y-6">
                <div className="flex justify-between items-start border-b pb-4">
                  <div className="flex items-start space-x-3.5">
                    <img
                      src={logoSrc}
                      alt={settings.companyName}
                      className="w-16 h-16 object-contain rounded-md border border-slate-200 bg-white p-0.5 shrink-0"
                    />
                    <div>
                      <h1 className="text-2xl font-black text-slate-900">{settings.companyName}</h1>
                      <p className="text-xs text-blue-700 font-bold uppercase">{settings.tagline}</p>
                      <p className="text-xs text-slate-600">{settings.address}, {settings.cityCountry}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-slate-900 text-white font-bold text-xs uppercase px-3 py-1 rounded">
                      EXPENSE PAYMENT VOUCHER
                    </span>
                    <div className="text-xs font-bold text-slate-900 mt-2">Voucher #: {v.voucherNumber}</div>
                    <div className="text-xs text-slate-600">Date: {v.date}</div>
                    <div className="text-xs text-amber-700 font-bold">{v.type} Expense</div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Expense Title &amp; Description</div>
                  <div className="text-lg font-black text-slate-900">{v.expenseName || v.categoryName}</div>
                  <div className="text-xs text-slate-600">Category: <strong>{v.categoryName}</strong> • Paid to: <strong>{v.payee || 'N/A'}</strong></div>
                  <div className="text-xs text-slate-500">{v.description}</div>
                </div>

                <table className="w-full text-left border border-slate-200 text-xs">
                  <thead className="bg-slate-100 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Account / Source</th>
                      <th className="p-2.5">Method</th>
                      <th className="p-2.5">Reference #</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2.5 font-bold">{(v as any).paidFromAccountName || 'Cash / Bank Account'}</td>
                      <td className="p-2.5">{v.paymentMethod}</td>
                      <td className="p-2.5">{v.referenceNumber || '-'}</td>
                      <td className="p-2.5 text-right font-black text-rose-600 text-sm">{formatCurrency(v.amount, currency)}</td>
                    </tr>
                  </tbody>
                </table>

                {renderAmountInWordsUI(v.amount, 'Voucher Amount Disbursed in Words')}

                {renderOfficialSignaturesUI([
                  { title: 'Prepared By', subtitle: 'Accounts Desk', name: 'Billing Clerk' },
                  { title: 'Payee Signature', subtitle: 'Amount Received By', name: v.payee },
                  { title: 'Accounts Officer', subtitle: 'Finance Wing', name: 'Internal Audit' },
                  { title: 'Executive Approval', isAuthorized: true },
                ])}
              </div>
            );
          })()}

          {/* SUPPLIER STATEMENT PREVIEW */}
          {type === 'supplier-statement' && (() => {
            const sup = data.supplier as Supplier;
            const txs = (data.transactions || []) as CashBankTransaction[];
            const vchs = (data.vouchers || []) as ExpenseVoucher[];
            return (
              <div className="space-y-6">
                <div className="flex justify-between items-start border-b pb-4">
                  <div className="flex items-start space-x-3.5">
                    <img
                      src={logoSrc}
                      alt={settings.companyName}
                      className="w-16 h-16 object-contain rounded-md border border-slate-200 bg-white p-0.5 shrink-0"
                    />
                    <div>
                      <h1 className="text-2xl font-black text-slate-900">{settings.companyName}</h1>
                      <p className="text-xs text-blue-700 font-bold uppercase">{settings.tagline}</p>
                      <p className="text-xs text-slate-600">{settings.address}, {settings.cityCountry}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-slate-900 text-white font-bold text-xs uppercase px-3 py-1 rounded">
                      SUPPLIER / PAYABLE STATEMENT
                    </span>
                    <div className="text-xs text-slate-600 mt-2">Date: {new Date().toISOString().substring(0, 10)}</div>
                    <div className="text-xs font-bold text-rose-600">Payable: {formatCurrency(sup.currentBalance, currency)}</div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-base text-slate-900">{sup.name}</div>
                  <div className="text-xs text-slate-600">Contact: {sup.contactPerson} ({sup.mobileNumber})</div>
                  <div className="text-xs text-slate-500">{sup.address} • Terms: {sup.paymentTerms}</div>
                </div>

                <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 flex justify-between items-center">
                  <span className="font-bold text-xs text-rose-900">Net Outstanding Payable Balance:</span>
                  <span className="text-xl font-black text-rose-700">{formatCurrency(sup.currentBalance, currency)}</span>
                </div>

                {renderAmountInWordsUI(sup.currentBalance, 'Net Payable Due in Words')}

                {renderOfficialSignaturesUI([
                  { title: 'Vendor / Supplier Stamp', subtitle: 'Confirmation & Seal', name: sup.name },
                  { title: 'Accounts & Payables Auditor', subtitle: 'Verified & Reconciled', name: 'Finance Wing' },
                  { title: 'Executive Authorization', isAuthorized: true },
                ])}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
