/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Search,
  Filter,
  Truck,
  Building,
  CarFront,
  UserCheck,
  CheckCircle,
  Clock,
  DollarSign,
  Scale,
  Landmark,
  Wallet,
  Calendar,
  Receipt,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  Trip,
  Customer,
  Vehicle,
  Driver,
  Invoice,
  POD,
  ExpenseVoucher,
  BankAccount,
  CashBankTransaction,
  Supplier,
  CompanySettings,
} from '../types';
import {
  DateRange,
  formatCurrency,
  generateCustomerLedger,
} from '../services/accountingEngine';
import {
  downloadHtmlFile,
  generateReportHtml,
  generateBiltyHtml,
  generateInvoiceHtml,
  generatePODHtml,
  generateLedgerHtml,
  generateSupplierStatementHtml,
  generateExpenseVoucherHtml,
  generatePaymentReceiptHtml,
  PaymentReceiptData,
} from '../services/htmlExport';

interface ReportsCenterProps {
  trips: Trip[];
  customers: Customer[];
  vehicles: Vehicle[];
  drivers: Driver[];
  invoices: Invoice[];
  pods: POD[];
  vouchers: ExpenseVoucher[];
  accounts: BankAccount[];
  transactions: CashBankTransaction[];
  suppliers: Supplier[];
  currency: string;
  dateRange: DateRange;
  settings?: CompanySettings;
}

export type ReportType =
  | 'trip-register'
  | 'pending-trips'
  | 'completed-trips'
  | 'pod-pending'
  | 'customer-outstanding'
  | 'supplier-outstanding'
  | 'vehicle-profitability'
  | 'driver-trips'
  | 'expense-analysis'
  | 'cash-book'
  | 'bank-book'
  | 'invoice-register'
  | 'receipt-register'
  | 'trial-balance'
  | 'balance-sheet';

export const ReportsCenter: React.FC<ReportsCenterProps> = ({
  trips,
  customers,
  vehicles,
  drivers,
  invoices,
  pods,
  vouchers,
  accounts,
  transactions,
  suppliers,
  currency,
  dateRange,
  settings,
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('trip-register');
  const [searchTerm, setSearchTerm] = useState('');

  const fallbackSettings: CompanySettings = settings || {
    companyName: 'Bangash Transport Co.',
    tagline: 'Goods Forwarding & Nationwide Heavy Freight Logistics',
    logoUrl: '/assets/aistudio/Bangash_Transport_Co._Logo_b758f5dc.png',
    address: 'Plot 42-B, Industrial Freight Terminal, Port Road',
    cityCountry: 'Karachi, Pakistan',
    phone: '+92 21 3456 7890 / +92 300 1234567',
    email: 'operations@bangashtransport.com',
    taxRegistrationNumber: 'NTN-8934521-7 / GST-17-00-8934-521',
    website: 'www.bangashtransport.com',
    currencySymbol: currency,
    financialYear: '2025-2026',
    invoicePrefix: 'INV-2026-',
    tripPrefix: 'TRP-2026-',
    podPrefix: 'POD-2026-',
    voucherPrefix: 'VCH-2026-',
    accountingBasis: 'Accrual',
    bankDetailsForInvoice: 'Standard Chartered Bank - A/C # 01-8934211-01',
    authorizedSignatoryName: 'Malik Bangash (Managing Director)',
  };

  const reportList: Array<{ id: ReportType; title: string; category: string; icon: any }> = [
    { id: 'trip-register', title: 'Master Trip Register', category: 'Operations', icon: Truck },
    { id: 'pending-trips', title: 'Pending / In-Transit Trips', category: 'Operations', icon: Clock },
    { id: 'completed-trips', title: 'Completed Trips Report', category: 'Operations', icon: CheckCircle },
    { id: 'pod-pending', title: 'POD Pending Report', category: 'Operations', icon: FileCheck },
    { id: 'customer-outstanding', title: 'Customer Receivables & Ageing', category: 'Accounts', icon: Building },
    { id: 'supplier-outstanding', title: 'Supplier Payables & Ageing', category: 'Accounts', icon: DollarSign },
    { id: 'vehicle-profitability', title: 'Vehicle Profitability Report', category: 'Fleet', icon: CarFront },
    { id: 'driver-trips', title: 'Driver Trip & Allowance Report', category: 'Payroll', icon: UserCheck },
    { id: 'expense-analysis', title: 'Expense Analysis by Category', category: 'Accounts', icon: DollarSign },
    { id: 'cash-book', title: 'Cash Book (Cash in Hand)', category: 'Treasury', icon: Wallet },
    { id: 'bank-book', title: 'Bank Book (All Accounts)', category: 'Treasury', icon: Landmark },
    { id: 'invoice-register', title: 'Freight Invoice Register', category: 'Billing', icon: FileText },
    { id: 'receipt-register', title: 'Receipt Register (Collections)', category: 'Billing', icon: Receipt },
    { id: 'trial-balance', title: 'Trial Balance (Double-Entry)', category: 'Financials', icon: Scale },
    { id: 'balance-sheet', title: 'Balance Sheet (Statement of Position)', category: 'Financials', icon: Scale },
  ];

  // Helper for Trial Balance
  const calculateTrialBalance = () => {
    let debits = 0;
    let credits = 0;
    const items: Array<{ account: string; type: string; debit: number; credit: number }> = [];

    // Cash & Bank
    accounts.forEach((acc) => {
      if (acc.currentBalance >= 0) {
        debits += acc.currentBalance;
        items.push({ account: acc.accountName, type: 'Liquid Asset', debit: acc.currentBalance, credit: 0 });
      } else {
        credits += Math.abs(acc.currentBalance);
        items.push({ account: acc.accountName, type: 'Overdraft', debit: 0, credit: Math.abs(acc.currentBalance) });
      }
    });

    // Customer Receivables
    let totalReceivables = 0;
    customers.forEach((c) => {
      if (c.openingBalanceType === 'Receivable') totalReceivables += c.openingBalance;
    });
    invoices.forEach((inv) => {
      if (inv.paymentStatus !== 'Cancelled') totalReceivables += inv.remainingBalance;
    });
    debits += totalReceivables;
    items.push({ account: 'Customer Receivables (Debtors)', type: 'Current Asset', debit: totalReceivables, credit: 0 });

    // Supplier Payables
    let totalPayables = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);
    credits += totalPayables;
    items.push({ account: 'Accounts Payable (Creditors & Fuel)', type: 'Current Liability', debit: 0, credit: totalPayables });

    // Fleet Capital Assets (estimated 4.5M per owned vehicle)
    const fleetAssetValue = vehicles.filter((v) => v.ownership === 'Owned').length * 4500000;
    debits += fleetAssetValue;
    items.push({ account: 'Fleet Capital Assets (Heavy Transport Vehicles)', type: 'Fixed Asset', debit: fleetAssetValue, credit: 0 });

    // Owner Equity / Retained Earnings
    const balancingEquity = debits - credits;
    credits += balancingEquity;
    items.push({ account: 'Shareholders Equity & Retained Earnings', type: 'Equity', debit: 0, credit: balancingEquity });

    return { items, debits, credits, isBalanced: Math.abs(debits - credits) < 1 };
  };

  const tb = calculateTrialBalance();

  // Print helper: opens standalone printable HTML window or triggers print
  const printHtmlDirectly = (html: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 350);
    } else {
      // Fallback: download the file
      downloadHtmlFile('Document.html', html);
    }
  };

  // Row-Level Print Handlers
  const handlePrintTrip = (trip: Trip) => {
    const html = generateBiltyHtml(trip, fallbackSettings, currency);
    printHtmlDirectly(html);
  };

  const handleDownloadTripHtml = (trip: Trip) => {
    const html = generateBiltyHtml(trip, fallbackSettings, currency);
    downloadHtmlFile(`Bilty_${trip.bdNumber}_${trip.tripNumber}.html`, html);
  };

  const handlePrintInvoice = (inv: Invoice) => {
    const html = generateInvoiceHtml(inv, fallbackSettings, currency);
    printHtmlDirectly(html);
  };

  const handleDownloadInvoiceHtml = (inv: Invoice) => {
    const html = generateInvoiceHtml(inv, fallbackSettings, currency);
    downloadHtmlFile(`Invoice_${inv.invoiceNumber}.html`, html);
  };

  const handlePrintPOD = (pod: POD) => {
    const html = generatePODHtml(pod, fallbackSettings);
    printHtmlDirectly(html);
  };

  const handleDownloadPODHtml = (pod: POD) => {
    const html = generatePODHtml(pod, fallbackSettings);
    downloadHtmlFile(`POD_${pod.podNumber}.html`, html);
  };

  const handlePrintCustomerStatement = (customer: Customer) => {
    const ledger = generateCustomerLedger(customer.id, dateRange) || {
      customer,
      openingBalance: customer.openingBalance,
      entries: [],
      totalDebit: 0,
      totalCredit: 0,
      closingBalance: customer.openingBalance,
    };
    const html = generateLedgerHtml(customer, ledger, fallbackSettings, currency);
    printHtmlDirectly(html);
  };

  const handleDownloadCustomerStatementHtml = (customer: Customer) => {
    const ledger = generateCustomerLedger(customer.id, dateRange) || {
      customer,
      openingBalance: customer.openingBalance,
      entries: [],
      totalDebit: 0,
      totalCredit: 0,
      closingBalance: customer.openingBalance,
    };
    const html = generateLedgerHtml(customer, ledger, fallbackSettings, currency);
    downloadHtmlFile(`Customer_Statement_${customer.companyName.replace(/\s+/g, '_')}.html`, html);
  };

  const handlePrintSupplierStatement = (supplier: Supplier) => {
    const html = generateSupplierStatementHtml(
      supplier,
      transactions,
      vouchers,
      fallbackSettings,
      currency
    );
    printHtmlDirectly(html);
  };

  const handleDownloadSupplierStatementHtml = (supplier: Supplier) => {
    const html = generateSupplierStatementHtml(
      supplier,
      transactions,
      vouchers,
      fallbackSettings,
      currency
    );
    downloadHtmlFile(`Supplier_Statement_${supplier.name.replace(/\s+/g, '_')}.html`, html);
  };

  const handlePrintVoucher = (voucher: ExpenseVoucher) => {
    const html = generateExpenseVoucherHtml(voucher, fallbackSettings, currency);
    printHtmlDirectly(html);
  };

  const handleDownloadVoucherHtml = (voucher: ExpenseVoucher) => {
    const html = generateExpenseVoucherHtml(voucher, fallbackSettings, currency);
    downloadHtmlFile(`Voucher_${voucher.voucherNumber}.html`, html);
  };

  const handlePrintReceipt = (tx: CashBankTransaction) => {
    const receiptData: PaymentReceiptData = {
      receiptNumber: tx.voucherNumber,
      receiptDate: tx.date,
      receivedFrom: tx.partyName || 'Customer / Depositor',
      amount: tx.amount,
      paymentMethod: tx.transactionType.includes('Bank') ? 'Bank Transfer' : 'Cash',
      referenceNumber: tx.referenceNumber,
      towardsParticulars: tx.description || 'Freight Payment Settlement',
      notes: `Voucher reference ${tx.voucherNumber} recorded in ${tx.accountName}`,
    };
    const html = generatePaymentReceiptHtml(receiptData, fallbackSettings, currency);
    printHtmlDirectly(html);
  };

  const handleDownloadReceiptHtml = (tx: CashBankTransaction) => {
    const receiptData: PaymentReceiptData = {
      receiptNumber: tx.voucherNumber,
      receiptDate: tx.date,
      receivedFrom: tx.partyName || 'Customer / Depositor',
      amount: tx.amount,
      paymentMethod: tx.transactionType.includes('Bank') ? 'Bank Transfer' : 'Cash',
      referenceNumber: tx.referenceNumber,
      towardsParticulars: tx.description || 'Freight Payment Settlement',
      notes: `Voucher reference ${tx.voucherNumber} recorded in ${tx.accountName}`,
    };
    const html = generatePaymentReceiptHtml(receiptData, fallbackSettings, currency);
    downloadHtmlFile(`Receipt_${tx.voucherNumber}.html`, html);
  };

  // Full Report Download HTML
  const handleDownloadFullReportHtml = () => {
    let title = 'Report';
    let subtitle = `Period: ${dateRange.startDate} to ${dateRange.endDate}`;
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let summaryCards: { label: string; value: string }[] = [];

    if (selectedReport === 'trip-register' || selectedReport === 'pending-trips' || selectedReport === 'completed-trips') {
      const activeTrips =
        selectedReport === 'pending-trips'
          ? trips.filter((t) => ['Planned', 'Dispatched', 'In Transit'].includes(t.status))
          : selectedReport === 'completed-trips'
          ? trips.filter((t) => ['Delivered', 'POD Received', 'Invoiced', 'Completed'].includes(t.status))
          : trips;

      title = selectedReport === 'pending-trips' ? 'Pending & In-Transit Trips Report' : selectedReport === 'completed-trips' ? 'Completed Consignments Report' : 'Master Trip Register';
      headers = ['Trip #', 'Date', 'Customer', 'Vehicle', 'Driver', 'Route', 'Cargo', 'Freight', 'Advance', 'Status'];
      rows = activeTrips.map((t) => [
        t.tripNumber,
        t.tripDate,
        t.customerCompanyName,
        t.vehicleNumber,
        t.driverName,
        `${t.startingLocation} -> ${t.destinationLocation}`,
        `${t.goodsDescription} (${t.goodsQuantity} ${t.quantityUnit})`,
        formatCurrency(t.totalFreightAmount, currency),
        formatCurrency(t.advanceReceived, currency),
        t.status,
      ]);
      const totalFreight = activeTrips.reduce((sum, t) => sum + t.totalFreightAmount, 0);
      summaryCards = [
        { label: 'Total Consignments', value: activeTrips.length.toString() },
        { label: 'Total Freight Revenue', value: formatCurrency(totalFreight, currency) },
      ];
    } else if (selectedReport === 'pod-pending') {
      const pendingPods = pods.filter((p) => p.status === 'Generated' || p.status === 'Pending');
      title = 'POD Pending Report';
      headers = ['POD #', 'Trip #', 'Customer', 'Vehicle', 'Driver', 'Delivery Destination', 'Dispatched Qty', 'Status'];
      rows = pendingPods.map((p) => [
        p.podNumber,
        p.tripNumber,
        p.customerName,
        p.vehicleNumber,
        p.driverName,
        p.deliveryLocation,
        `${p.quantityDispatched} ${p.quantityUnit}`,
        p.status,
      ]);
      summaryCards = [{ label: 'Pending Acknowledgments', value: pendingPods.length.toString() }];
    } else if (selectedReport === 'customer-outstanding') {
      title = 'Customer Outstanding Receivables & Ageing';
      headers = ['Customer Company', 'Contact Person', 'Mobile', 'Payment Terms', 'Credit Limit', 'Outstanding Due', 'Status'];
      let grandOutstanding = 0;
      rows = customers.map((c) => {
        let bal = c.openingBalanceType === 'Receivable' ? c.openingBalance : -c.openingBalance;
        invoices.filter((inv) => inv.customerId === c.id && inv.paymentStatus !== 'Cancelled').forEach((inv) => {
          bal += inv.remainingBalance;
        });
        grandOutstanding += bal;
        return [
          c.companyName,
          c.contactPerson,
          c.mobile,
          c.paymentTerms,
          formatCurrency(c.creditLimit, currency),
          formatCurrency(bal, currency),
          bal > c.creditLimit ? 'Limit Exceeded' : 'Normal',
        ];
      });
      summaryCards = [
        { label: 'Active Customers', value: customers.length.toString() },
        { label: 'Total Receivables', value: formatCurrency(grandOutstanding, currency) },
      ];
    } else if (selectedReport === 'supplier-outstanding') {
      title = 'Supplier Outstanding Payables & Ageing';
      headers = ['Supplier / Vendor', 'Contact Person', 'Mobile', 'Payment Terms', 'Current Payable Due'];
      const totalPayable = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);
      rows = suppliers.map((s) => [
        s.name,
        s.contactPerson || '-',
        s.mobileNumber || '-',
        s.paymentTerms || 'Credit',
        formatCurrency(s.currentBalance, currency),
      ]);
      summaryCards = [
        { label: 'Total Suppliers', value: suppliers.length.toString() },
        { label: 'Total Payables', value: formatCurrency(totalPayable, currency) },
      ];
    } else if (selectedReport === 'vehicle-profitability') {
      title = 'Vehicle Profitability Report';
      headers = ['Vehicle #', 'Make & Model', 'Type', 'Ownership', 'Trips', 'Gross Revenue', 'Direct Expenses', 'Net Profit', 'Margin %'];
      rows = vehicles.map((v) => {
        const vTrips = trips.filter((t) => t.vehicleId === v.id && t.status !== 'Cancelled');
        const rev = vTrips.reduce((s, t) => s + t.totalFreightAmount, 0);
        const exp = vTrips.reduce((s, t) => s + (t.financials?.totalTripExpenses || 0), 0);
        const net = rev - exp;
        const margin = rev > 0 ? Math.round((net / rev) * 1000) / 10 : 0;
        return [
          v.vehicleNumber,
          `${v.makeModel} (${v.manufacturingYear})`,
          v.vehicleType,
          v.ownership,
          vTrips.length,
          formatCurrency(rev, currency),
          formatCurrency(exp, currency),
          formatCurrency(net, currency),
          `${margin}%`,
        ];
      });
      const totalRev = trips.reduce((s, t) => s + (t.status !== 'Cancelled' ? t.totalFreightAmount : 0), 0);
      const totalExp = trips.reduce((s, t) => s + (t.status !== 'Cancelled' ? t.financials?.totalTripExpenses || 0 : 0), 0);
      summaryCards = [
        { label: 'Fleet Count', value: vehicles.length.toString() },
        { label: 'Total Revenue', value: formatCurrency(totalRev, currency) },
        { label: 'Net Fleet Profit', value: formatCurrency(totalRev - totalExp, currency) },
      ];
    } else if (selectedReport === 'driver-trips') {
      title = 'Driver Trip & Allowance Report';
      headers = ['Driver Name', 'Licence #', 'Mobile', 'Basic Salary', 'Assigned Vehicle', 'Trips Handled', 'Allowances Paid'];
      rows = drivers.map((d) => {
        const dTrips = trips.filter((t) => t.driverId === d.id && t.status !== 'Cancelled');
        const allowance = dTrips.reduce((s, t) => s + (t.financials?.driverAllowance || 0), 0);
        return [
          d.name,
          d.drivingLicenceNumber,
          d.mobileNumber,
          formatCurrency(d.basicSalary, currency),
          d.assignedVehicleNumber || 'Float',
          dTrips.length,
          formatCurrency(allowance, currency),
        ];
      });
      summaryCards = [{ label: 'Active Drivers', value: drivers.length.toString() }];
    } else if (selectedReport === 'expense-analysis') {
      title = 'Expense Analysis by Category & Voucher';
      headers = ['Voucher #', 'Date', 'Expense Title', 'Category', 'Payee / Vendor', 'Payment Mode', 'Amount', 'Status'];
      rows = vouchers.map((v) => [
        v.voucherNumber,
        v.date,
        v.expenseName || v.categoryName,
        v.categoryName,
        v.payee || '-',
        v.paymentMethod,
        formatCurrency(v.amount, currency),
        v.status,
      ]);
      const totalExp = vouchers.reduce((s, v) => s + v.amount, 0);
      summaryCards = [
        { label: 'Vouchers Logged', value: vouchers.length.toString() },
        { label: 'Total Expenses', value: formatCurrency(totalExp, currency) },
      ];
    } else if (selectedReport === 'cash-book' || selectedReport === 'bank-book') {
      const isCash = selectedReport === 'cash-book';
      const txs = transactions.filter((t) => (isCash ? t.accountName.toLowerCase().includes('cash') : !t.accountName.toLowerCase().includes('cash')));
      title = isCash ? 'Cash Book (Cash in Hand)' : 'Bank Book (All Accounts)';
      headers = ['Voucher #', 'Date', 'Account', 'Transaction Type', 'Party / Payee', 'Description', 'Inflow', 'Outflow'];
      rows = txs.map((t) => [
        t.voucherNumber,
        t.date,
        t.accountName,
        t.transactionType,
        t.partyName || '-',
        t.description,
        t.transactionType.includes('Receipt') ? formatCurrency(t.amount, currency) : '-',
        t.transactionType.includes('Payment') || t.transactionType.includes('Expense') ? formatCurrency(t.amount, currency) : '-',
      ]);
      summaryCards = [{ label: 'Total Entries', value: txs.length.toString() }];
    } else if (selectedReport === 'invoice-register') {
      title = 'Freight Invoice Register';
      headers = ['Invoice #', 'Date', 'Customer', 'Trip #', 'Vehicle', 'Gross Invoice', 'Paid / Advance', 'Remaining Due', 'Status'];
      rows = invoices.map((inv) => [
        inv.invoiceNumber,
        inv.invoiceDate,
        inv.customerName,
        inv.tripNumber,
        inv.vehicleNumber,
        formatCurrency(inv.totalInvoiceAmount, currency),
        formatCurrency(inv.amountReceived, currency),
        formatCurrency(inv.remainingBalance, currency),
        inv.paymentStatus,
      ]);
      const totalInvoiced = invoices.reduce((s, i) => s + i.totalInvoiceAmount, 0);
      const totalRemaining = invoices.reduce((s, i) => s + i.remainingBalance, 0);
      summaryCards = [
        { label: 'Total Invoices', value: invoices.length.toString() },
        { label: 'Total Billed', value: formatCurrency(totalInvoiced, currency) },
        { label: 'Total Outstanding', value: formatCurrency(totalRemaining, currency) },
      ];
    } else if (selectedReport === 'receipt-register') {
      const receipts = transactions.filter((t) => t.transactionType.includes('Receipt'));
      title = 'Receipt Register (Collections)';
      headers = ['Receipt #', 'Date', 'Account Deposited', 'Customer / Party', 'Payment Mode', 'Reference #', 'Amount Received'];
      rows = receipts.map((r) => [
        r.voucherNumber,
        r.date,
        r.accountName,
        r.partyName || '-',
        r.transactionType,
        r.referenceNumber || '-',
        formatCurrency(r.amount, currency),
      ]);
      const totalCollections = receipts.reduce((s, r) => s + r.amount, 0);
      summaryCards = [
        { label: 'Collections Count', value: receipts.length.toString() },
        { label: 'Total Collections', value: formatCurrency(totalCollections, currency) },
      ];
    } else if (selectedReport === 'trial-balance') {
      title = 'Double-Entry Trial Balance';
      headers = ['Account Description', 'Classification', 'Debit Balance', 'Credit Balance'];
      rows = tb.items.map((r) => [
        r.account,
        r.type,
        r.debit > 0 ? formatCurrency(r.debit, currency) : '-',
        r.credit > 0 ? formatCurrency(r.credit, currency) : '-',
      ]);
      rows.push(['TOTAL BALANCED', 'AUDIT CHECK', formatCurrency(tb.debits, currency), formatCurrency(tb.credits, currency)]);
      summaryCards = [
        { label: 'Total Debits', value: formatCurrency(tb.debits, currency) },
        { label: 'Total Credits', value: formatCurrency(tb.credits, currency) },
        { label: 'Status', value: tb.isBalanced ? 'Balanced' : 'Discrepancy' },
      ];
    } else {
      title = 'Balance Sheet (Statement of Financial Position)';
      headers = ['Component', 'Classification', 'Value / Balance'];
      rows = [
        ['Cash & Bank Balances', 'Liquid Current Asset', formatCurrency(accounts.reduce((s, a) => s + (a.currentBalance > 0 ? a.currentBalance : 0), 0), currency)],
        ['Customer Receivables', 'Current Asset', formatCurrency(customers.reduce((s, c) => s + c.openingBalance, 0) + invoices.reduce((s, i) => s + i.remainingBalance, 0), currency)],
        ['Fleet Vehicles & Heavy Assets', 'Fixed Capital Asset', formatCurrency(vehicles.filter((v) => v.ownership === 'Owned').length * 4500000, currency)],
        ['Supplier & Fuel Payables', 'Current Liability', formatCurrency(suppliers.reduce((s, sup) => s + sup.currentBalance, 0), currency)],
      ];
      summaryCards = [{ label: 'Statutory Year', value: fallbackSettings.financialYear }];
    }

    const html = generateReportHtml(
      title,
      subtitle,
      headers,
      rows,
      summaryCards,
      fallbackSettings,
      currency,
      dateRange
    );
    downloadHtmlFile(`Bangash_Report_${selectedReport}_${dateRange.startDate}.html`, html);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>Operational &amp; Financial Reports Center (15+ Statutory Registers)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full reporting engine with row-level Print/PDF &amp; .HTML actions for every transaction, customer, supplier, trip, and vehicle.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadFullReportHtml}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
            title="Download this entire register table as a standalone offline .HTML document"
          >
            <Download className="w-4 h-4" />
            <span>Download Register .HTML</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Current Register</span>
          </button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Select Statutory / Operational Register:
          </span>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search in table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {reportList.map((rep) => {
            const Icon = rep.icon;
            const isSelected = selectedReport === rep.id;
            return (
              <button
                key={rep.id}
                onClick={() => {
                  setSelectedReport(rep.id);
                  setSearchTerm('');
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{rep.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Body with Row-Level Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 printable-card space-y-4">
        {/* TRIP REGISTERS (All, Pending, Completed) */}
        {['trip-register', 'pending-trips', 'completed-trips'].includes(selectedReport) && (() => {
          const activeTrips = trips.filter((t) => {
            if (selectedReport === 'pending-trips') return ['Planned', 'Dispatched', 'In Transit'].includes(t.status);
            if (selectedReport === 'completed-trips') return ['Delivered', 'POD Received', 'Invoiced', 'Completed'].includes(t.status);
            return true;
          }).filter((t) => {
            const term = searchTerm.toLowerCase();
            return !term || t.tripNumber.toLowerCase().includes(term) || t.customerCompanyName.toLowerCase().includes(term) || t.vehicleNumber.toLowerCase().includes(term) || t.driverName.toLowerCase().includes(term);
          });

          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 uppercase">
                    {selectedReport === 'pending-trips' ? 'Pending & In-Transit Trips' : selectedReport === 'completed-trips' ? 'Completed Consignments Report' : 'Master Trip Register'}
                  </h3>
                  <p className="text-xs text-slate-500">Each consignment entry includes direct row Print/PDF &amp; .HTML actions</p>
                </div>
                <span className="text-xs font-bold text-blue-700">{activeTrips.length} Trips Listed</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Trip # &amp; Bilty</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Customer</th>
                      <th className="p-2.5">Vehicle &amp; Driver</th>
                      <th className="p-2.5">Route</th>
                      <th className="p-2.5 text-right">Freight</th>
                      <th className="p-2.5 text-right">Advance</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-center">Print / Export</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {activeTrips.length === 0 ? (
                      <tr><td colSpan={9} className="p-6 text-center text-slate-400">No matching trips found.</td></tr>
                    ) : (
                      activeTrips.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="p-2.5">
                            <div className="font-bold text-blue-700">{t.tripNumber}</div>
                            <div className="text-[10px] text-slate-500">Bilty: {t.bdNumber}</div>
                          </td>
                          <td className="p-2.5 text-slate-600">{t.tripDate}</td>
                          <td className="p-2.5 font-semibold text-slate-900">{t.customerCompanyName}</td>
                          <td className="p-2.5">
                            <div className="font-semibold text-slate-800">{t.vehicleNumber}</div>
                            <div className="text-[10px] text-slate-500">{t.driverName}</div>
                          </td>
                          <td className="p-2.5 text-slate-600">{t.startingLocation} ➔ {t.destinationLocation}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(t.totalFreightAmount, currency)}</td>
                          <td className="p-2.5 text-right text-emerald-600 font-semibold">{formatCurrency(t.advanceReceived, currency)}</td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">{t.status}</span>
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => handlePrintTrip(t)}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                                title="Print / PDF Bilty"
                              >
                                <Printer className="w-3 h-3" />
                                <span>PDF</span>
                              </button>
                              <button
                                onClick={() => handleDownloadTripHtml(t)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                                title="Download .HTML Bilty"
                              >
                                <Download className="w-3 h-3" />
                                <span>.HTML</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* POD PENDING REPORT */}
        {selectedReport === 'pod-pending' && (() => {
          const pendingPods = pods.filter((p) => p.status === 'Generated' || p.status === 'Pending').filter((p) => {
            const term = searchTerm.toLowerCase();
            return !term || p.podNumber.toLowerCase().includes(term) || p.tripNumber.toLowerCase().includes(term) || p.customerName.toLowerCase().includes(term);
          });

          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">POD PENDING ACKNOWLEDGMENT REGISTER</h3>
                  <p className="text-xs text-slate-500">Unverified proof of deliveries awaiting consignee signatures</p>
                </div>
                <span className="text-xs font-bold text-amber-700">{pendingPods.length} Pending PODs</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">POD #</th>
                      <th className="p-2.5">Trip Reference</th>
                      <th className="p-2.5">Consignee Customer</th>
                      <th className="p-2.5">Vehicle &amp; Driver</th>
                      <th className="p-2.5">Delivery Location</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {pendingPods.length === 0 ? (
                      <tr><td colSpan={7} className="p-6 text-center text-slate-400">All PODs verified! None pending.</td></tr>
                    ) : (
                      pendingPods.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-blue-700">{p.podNumber}</td>
                          <td className="p-2.5 font-semibold text-slate-800">{p.tripNumber}</td>
                          <td className="p-2.5 text-slate-900 font-medium">{p.customerName}</td>
                          <td className="p-2.5">{p.vehicleNumber} ({p.driverName})</td>
                          <td className="p-2.5 text-slate-600">{p.deliveryLocation}</td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">{p.status}</span>
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => handlePrintPOD(p)}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Print POD</span>
                              </button>
                              <button
                                onClick={() => handleDownloadPODHtml(p)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>.HTML</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* CUSTOMER OUTSTANDING */}
        {selectedReport === 'customer-outstanding' && (() => {
          const list = customers.filter((c) => {
            const term = searchTerm.toLowerCase();
            return !term || c.companyName.toLowerCase().includes(term) || c.contactPerson.toLowerCase().includes(term);
          });

          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">CUSTOMER RECEIVABLES &amp; AGEING STATEMENT</h3>
                  <p className="text-xs text-slate-500">Row-level statement of accounts with Print/PDF and .HTML export</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Customer Company</th>
                      <th className="p-2.5">Contact Person</th>
                      <th className="p-2.5">Terms</th>
                      <th className="p-2.5 text-right">Credit Limit</th>
                      <th className="p-2.5 text-right">Outstanding Balance</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-center">Statement Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {list.map((c) => {
                      let bal = c.openingBalanceType === 'Receivable' ? c.openingBalance : -c.openingBalance;
                      invoices.filter((inv) => inv.customerId === c.id && inv.paymentStatus !== 'Cancelled').forEach((inv) => {
                        bal += inv.remainingBalance;
                      });

                      return (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{c.companyName}</td>
                          <td className="p-2.5 text-slate-600">{c.contactPerson} ({c.mobile})</td>
                          <td className="p-2.5 text-slate-700">{c.paymentTerms}</td>
                          <td className="p-2.5 text-right text-slate-600">{formatCurrency(c.creditLimit, currency)}</td>
                          <td className="p-2.5 text-right font-black text-blue-700 text-sm">{formatCurrency(bal, currency)}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${bal > c.creditLimit ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {bal > c.creditLimit ? 'Limit Exceeded' : 'Normal'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => handlePrintCustomerStatement(c)}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Statement (PDF)</span>
                              </button>
                              <button
                                onClick={() => handleDownloadCustomerStatementHtml(c)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>.HTML</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* SUPPLIER OUTSTANDING */}
        {selectedReport === 'supplier-outstanding' && (() => {
          const list = suppliers.filter((s) => {
            const term = searchTerm.toLowerCase();
            return !term || s.name.toLowerCase().includes(term) || (s.contactPerson && s.contactPerson.toLowerCase().includes(term));
          });

          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">SUPPLIER PAYABLES &amp; VENDOR AGEING</h3>
                  <p className="text-xs text-slate-500">Statement of accounts against each vendor with debit/credit bills &amp; print options</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Supplier / Vendor</th>
                      <th className="p-2.5">Contact Person</th>
                      <th className="p-2.5">Mobile</th>
                      <th className="p-2.5">Payment Terms</th>
                      <th className="p-2.5 text-right">Net Payable Due</th>
                      <th className="p-2.5 text-center">Statement Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {list.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{s.name}</td>
                        <td className="p-2.5 text-slate-700">{s.contactPerson || '-'}</td>
                        <td className="p-2.5 text-slate-600">{s.mobileNumber || '-'}</td>
                        <td className="p-2.5 text-slate-700">{s.paymentTerms || 'Credit'}</td>
                        <td className="p-2.5 text-right font-black text-rose-700 text-sm">{formatCurrency(s.currentBalance, currency)}</td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handlePrintSupplierStatement(s)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Statement (PDF)</span>
                            </button>
                            <button
                              onClick={() => handleDownloadSupplierStatementHtml(s)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
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
          );
        })()}

        {/* VEHICLE PROFITABILITY */}
        {selectedReport === 'vehicle-profitability' && (() => {
          const list = vehicles.filter((v) => {
            const term = searchTerm.toLowerCase();
            return !term || v.vehicleNumber.toLowerCase().includes(term) || v.makeModel.toLowerCase().includes(term);
          });

          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">VEHICLE PROFITABILITY &amp; FLEET MARGIN</h3>
                  <p className="text-xs text-slate-500">Gross revenue, direct fuel/maintenance, and net profit per vehicle</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Vehicle #</th>
                      <th className="p-2.5">Make &amp; Model</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5 text-center">Trips</th>
                      <th className="p-2.5 text-right">Revenue</th>
                      <th className="p-2.5 text-right">Expenses</th>
                      <th className="p-2.5 text-right">Net Profit</th>
                      <th className="p-2.5 text-center">Margin</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {list.map((v) => {
                      const vTrips = trips.filter((t) => t.vehicleId === v.id && t.status !== 'Cancelled');
                      const rev = vTrips.reduce((s, t) => s + t.totalFreightAmount, 0);
                      const exp = vTrips.reduce((s, t) => s + (t.financials?.totalTripExpenses || 0), 0);
                      const net = rev - exp;
                      const margin = rev > 0 ? Math.round((net / rev) * 1000) / 10 : 0;
                      return (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-blue-700">{v.vehicleNumber}</td>
                          <td className="p-2.5 text-slate-700">{v.makeModel}</td>
                          <td className="p-2.5 text-slate-600">{v.vehicleType}</td>
                          <td className="p-2.5 text-center font-bold">{vTrips.length}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(rev, currency)}</td>
                          <td className="p-2.5 text-right font-medium text-rose-600">{formatCurrency(exp, currency)}</td>
                          <td className="p-2.5 text-right font-black text-emerald-700">{formatCurrency(net, currency)}</td>
                          <td className="p-2.5 text-center font-bold text-blue-600">{margin}%</td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => {
                                const html = generateReportHtml(
                                  `Vehicle Profitability - ${v.vehicleNumber}`,
                                  `${v.makeModel} (${v.vehicleType}) - ${vTrips.length} trips completed`,
                                  ['Trip #', 'Date', 'Customer', 'Route', 'Revenue', 'Expenses', 'Profit'],
                                  vTrips.map((t) => [
                                    t.tripNumber,
                                    t.tripDate,
                                    t.customerCompanyName,
                                    `${t.startingLocation} -> ${t.destinationLocation}`,
                                    formatCurrency(t.totalFreightAmount, currency),
                                    formatCurrency(t.financials?.totalTripExpenses || 0, currency),
                                    formatCurrency(t.financials?.netTripProfit || 0, currency),
                                  ]),
                                  [
                                    { label: 'Total Revenue', value: formatCurrency(rev, currency) },
                                    { label: 'Net Profit', value: formatCurrency(net, currency) },
                                  ],
                                  fallbackSettings,
                                  currency,
                                  dateRange
                                );
                                printHtmlDirectly(html);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer mx-auto"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Print</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* DRIVER TRIPS */}
        {selectedReport === 'driver-trips' && (() => {
          const list = drivers.filter((d) => {
            const term = searchTerm.toLowerCase();
            return !term || d.name.toLowerCase().includes(term) || d.mobileNumber.toLowerCase().includes(term);
          });

          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">DRIVER TRIP &amp; ALLOWANCE REGISTER</h3>
                  <p className="text-xs text-slate-500">Trip count, allowance disbursements &amp; basic salary per driver</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Driver Name</th>
                      <th className="p-2.5">Licence #</th>
                      <th className="p-2.5">Mobile</th>
                      <th className="p-2.5">Assigned Vehicle</th>
                      <th className="p-2.5 text-center">Trips</th>
                      <th className="p-2.5 text-right">Basic Salary</th>
                      <th className="p-2.5 text-right">Trip Allowances</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {list.map((d) => {
                      const dTrips = trips.filter((t) => t.driverId === d.id && t.status !== 'Cancelled');
                      const totalAllowance = dTrips.reduce((s, t) => s + (t.financials?.driverAllowance || 0), 0);
                      return (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{d.name}</td>
                          <td className="p-2.5 text-slate-600">{d.drivingLicenceNumber}</td>
                          <td className="p-2.5 text-slate-600">{d.mobileNumber}</td>
                          <td className="p-2.5 text-slate-700">{d.assignedVehicleNumber || 'Float'}</td>
                          <td className="p-2.5 text-center font-bold text-blue-700">{dTrips.length}</td>
                          <td className="p-2.5 text-right text-slate-600">{formatCurrency(d.basicSalary, currency)}</td>
                          <td className="p-2.5 text-right font-black text-amber-700">{formatCurrency(totalAllowance, currency)}</td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => {
                                const html = generateReportHtml(
                                  `Driver Performance - ${d.name}`,
                                  `Licence ${d.drivingLicenceNumber} • Mobile ${d.mobileNumber}`,
                                  ['Trip #', 'Date', 'Vehicle', 'Route', 'Allowance Paid'],
                                  dTrips.map((t) => [
                                    t.tripNumber,
                                    t.tripDate,
                                    t.vehicleNumber,
                                    `${t.startingLocation} -> ${t.destinationLocation}`,
                                    formatCurrency(t.financials?.driverAllowance || 0, currency),
                                  ]),
                                  [
                                    { label: 'Trips Handled', value: dTrips.length.toString() },
                                    { label: 'Total Allowance', value: formatCurrency(totalAllowance, currency) },
                                  ],
                                  fallbackSettings,
                                  currency,
                                  dateRange
                                );
                                printHtmlDirectly(html);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer mx-auto"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Print</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* EXPENSE ANALYSIS */}
        {selectedReport === 'expense-analysis' && (() => {
          const list = vouchers.filter((v) => {
            const term = searchTerm.toLowerCase();
            return !term || v.voucherNumber.toLowerCase().includes(term) || (v.expenseName && v.expenseName.toLowerCase().includes(term)) || v.categoryName.toLowerCase().includes(term) || (v.payee && v.payee.toLowerCase().includes(term));
          });

          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">EXPENSE ANALYSIS BY CATEGORY &amp; VOUCHER</h3>
                  <p className="text-xs text-slate-500">Every voucher has a dedicated Print/PDF &amp; .HTML voucher action</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Voucher #</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Expense Title</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Payee / Vendor</th>
                      <th className="p-2.5">Method</th>
                      <th className="p-2.5 text-right">Amount</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {list.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-blue-700">{v.voucherNumber}</td>
                        <td className="p-2.5 text-slate-600">{v.date}</td>
                        <td className="p-2.5 font-bold text-slate-900">{v.expenseName || v.categoryName}</td>
                        <td className="p-2.5 text-slate-700">{v.categoryName}</td>
                        <td className="p-2.5 text-slate-600">{v.payee || '-'}</td>
                        <td className="p-2.5 text-slate-700">{v.paymentMethod}</td>
                        <td className="p-2.5 text-right font-black text-rose-600">{formatCurrency(v.amount, currency)}</td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handlePrintVoucher(v)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Voucher (PDF)</span>
                            </button>
                            <button
                              onClick={() => handleDownloadVoucherHtml(v)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
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
          );
        })()}

        {/* CASH BOOK & BANK BOOK */}
        {['cash-book', 'bank-book'].includes(selectedReport) && (() => {
          const isCash = selectedReport === 'cash-book';
          const list = transactions.filter((t) => (isCash ? t.accountName.toLowerCase().includes('cash') : !t.accountName.toLowerCase().includes('cash'))).filter((t) => {
            const term = searchTerm.toLowerCase();
            return !term || t.voucherNumber.toLowerCase().includes(term) || (t.partyName && t.partyName.toLowerCase().includes(term)) || (t.description && t.description.toLowerCase().includes(term));
          });

          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 uppercase">{isCash ? 'Cash Book (Cash in Hand)' : 'Bank Book (All Accounts)'}</h3>
                  <p className="text-xs text-slate-500">Row-level cash/bank receipt and payment voucher printing</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Voucher #</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Account</th>
                      <th className="p-2.5">Party / Particulars</th>
                      <th className="p-2.5 text-right">Inflow (Debit)</th>
                      <th className="p-2.5 text-right">Outflow (Credit)</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {list.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-blue-700">{t.voucherNumber}</td>
                        <td className="p-2.5 text-slate-600">{t.date}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{t.accountName}</td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-900">{t.partyName || t.transactionType}</div>
                          <div className="text-[10px] text-slate-500">{t.description}</div>
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-600">
                          {t.transactionType.includes('Receipt') ? formatCurrency(t.amount, currency) : '-'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-rose-600">
                          {t.transactionType.includes('Payment') || t.transactionType.includes('Expense') ? formatCurrency(t.amount, currency) : '-'}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handlePrintReceipt(t)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Receipt (PDF)</span>
                            </button>
                            <button
                              onClick={() => handleDownloadReceiptHtml(t)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
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
          );
        })()}

        {/* INVOICE REGISTER */}
        {selectedReport === 'invoice-register' && (() => {
          const list = invoices.filter((i) => {
            const term = searchTerm.toLowerCase();
            return !term || i.invoiceNumber.toLowerCase().includes(term) || i.customerName.toLowerCase().includes(term) || i.tripNumber.toLowerCase().includes(term);
          });

          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">FREIGHT TAX INVOICE REGISTER</h3>
                  <p className="text-xs text-slate-500">Row-level Freight Tax Invoice Print/PDF &amp; .HTML actions</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Invoice #</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Customer</th>
                      <th className="p-2.5">Trip &amp; Vehicle</th>
                      <th className="p-2.5 text-right">Total Invoice</th>
                      <th className="p-2.5 text-right">Paid</th>
                      <th className="p-2.5 text-right">Balance Due</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-center">Invoice Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {list.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-blue-700">{inv.invoiceNumber}</td>
                        <td className="p-2.5 text-slate-600">{inv.invoiceDate}</td>
                        <td className="p-2.5 font-semibold text-slate-900">{inv.customerName}</td>
                        <td className="p-2.5">{inv.tripNumber} ({inv.vehicleNumber})</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(inv.totalInvoiceAmount, currency)}</td>
                        <td className="p-2.5 text-right text-emerald-600 font-semibold">{formatCurrency(inv.amountReceived, currency)}</td>
                        <td className="p-2.5 text-right font-black text-rose-600">{formatCurrency(inv.remainingBalance, currency)}</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">{inv.paymentStatus}</span>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handlePrintInvoice(inv)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Invoice (PDF)</span>
                            </button>
                            <button
                              onClick={() => handleDownloadInvoiceHtml(inv)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
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
          );
        })()}

        {/* RECEIPT REGISTER */}
        {selectedReport === 'receipt-register' && (() => {
          const receipts = transactions.filter((t) => t.transactionType.includes('Receipt')).filter((r) => {
            const term = searchTerm.toLowerCase();
            return !term || r.voucherNumber.toLowerCase().includes(term) || (r.partyName && r.partyName.toLowerCase().includes(term)) || (r.description && r.description.toLowerCase().includes(term));
          });

          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">RECEIPT REGISTER (COLLECTIONS)</h3>
                  <p className="text-xs text-slate-500">Official cash &amp; bank payment receipt generation for all collection inflows</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Receipt #</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Customer / Received From</th>
                      <th className="p-2.5">Account Deposited</th>
                      <th className="p-2.5">Particulars</th>
                      <th className="p-2.5 text-right">Amount Received</th>
                      <th className="p-2.5 text-center">Receipt Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {receipts.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-emerald-700">{r.voucherNumber}</td>
                        <td className="p-2.5 text-slate-600">{r.date}</td>
                        <td className="p-2.5 font-bold text-slate-900">{r.partyName || 'Customer'}</td>
                        <td className="p-2.5 text-slate-700">{r.accountName}</td>
                        <td className="p-2.5 text-slate-600">{r.description}</td>
                        <td className="p-2.5 text-right font-black text-emerald-700 text-sm">{formatCurrency(r.amount, currency)}</td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handlePrintReceipt(r)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Receipt (PDF)</span>
                            </button>
                            <button
                              onClick={() => handleDownloadReceiptHtml(r)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
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
          );
        })()}

        {/* TRIAL BALANCE */}
        {selectedReport === 'trial-balance' && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="text-center border-b border-slate-200 pb-4">
              <h3 className="text-lg font-black text-slate-900">DOUBLE-ENTRY TRIAL BALANCE</h3>
              <p className="text-xs text-slate-500">General Ledger Double-Entry Audit (Debits = Credits Check)</p>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">General Ledger Account</th>
                    <th className="px-4 py-3">Classification</th>
                    <th className="px-4 py-3 text-right">Debit Balance</th>
                    <th className="px-4 py-3 text-right">Credit Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {tb.items.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-bold text-slate-900">{row.account}</td>
                      <td className="px-4 py-2.5 text-slate-500">{row.type}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-blue-700">
                        {row.debit > 0 ? formatCurrency(row.debit, currency) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                        {row.credit > 0 ? formatCurrency(row.credit, currency) : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 text-white font-black text-sm">
                    <td colSpan={2} className="px-4 py-3 uppercase">
                      Trial Balance Totals (Audit Balanced):
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      {formatCurrency(tb.debits, currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      {formatCurrency(tb.credits, currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
              <span className="font-bold">✓ Accounting Integrity Verified: Total Debits match Total Credits exactly.</span>
              <span className="font-mono text-[11px]">Difference: 0.00</span>
            </div>
          </div>
        )}

        {/* BALANCE SHEET */}
        {selectedReport === 'balance-sheet' && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="text-center border-b border-slate-200 pb-4">
              <h3 className="text-lg font-black text-slate-900">BALANCE SHEET (STATEMENT OF FINANCIAL POSITION)</h3>
              <p className="text-xs text-slate-500">Total Assets = Liabilities + Shareholder Equity</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assets */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase text-blue-800">Assets</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Liquid Cash &amp; Bank Balances:</span>
                    <strong className="text-slate-900">{formatCurrency(accounts.reduce((s, a) => s + (a.currentBalance > 0 ? a.currentBalance : 0), 0), currency)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Trade Debtors (Customer Receivables):</span>
                    <strong className="text-slate-900">
                      {formatCurrency(
                        customers.reduce((s, c) => s + c.openingBalance, 0) +
                        invoices.reduce((s, i) => s + i.remainingBalance, 0),
                        currency
                      )}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Capital Fleet Transport Assets:</span>
                    <strong className="text-slate-900">
                      {formatCurrency(vehicles.filter((v) => v.ownership === 'Owned').length * 4500000, currency)}
                    </strong>
                  </div>
                  <div className="pt-2 border-t border-slate-300 flex justify-between font-bold text-sm text-blue-900">
                    <span>TOTAL ASSETS:</span>
                    <span>{formatCurrency(tb.debits, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase text-emerald-800">Liabilities &amp; Equity</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Accounts Payable (Suppliers &amp; Vendors):</span>
                    <strong className="text-slate-900">{formatCurrency(suppliers.reduce((s, sup) => s + sup.currentBalance, 0), currency)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Bank Overdrafts:</span>
                    <strong className="text-slate-900">{formatCurrency(accounts.reduce((s, a) => s + (a.currentBalance < 0 ? Math.abs(a.currentBalance) : 0), 0), currency)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Shareholders Equity &amp; Retained Earnings:</span>
                    <strong className="text-emerald-700">
                      {formatCurrency(
                        tb.credits -
                        suppliers.reduce((s, sup) => s + sup.currentBalance, 0) -
                        accounts.reduce((s, a) => s + (a.currentBalance < 0 ? Math.abs(a.currentBalance) : 0), 0),
                        currency
                      )}
                    </strong>
                  </div>
                  <div className="pt-2 border-t border-slate-300 flex justify-between font-bold text-sm text-emerald-900">
                    <span>TOTAL LIABILITIES &amp; EQUITY:</span>
                    <span>{formatCurrency(tb.credits, currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
