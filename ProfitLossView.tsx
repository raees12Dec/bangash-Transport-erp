/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  Printer,
  Calendar,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Truck,
  CarFront,
  Users,
  Download,
} from 'lucide-react';
import {
  DateRange,
  generateProfitAndLoss,
  formatCurrency,
} from '../services/accountingEngine';
import { CompanySettings } from '../types';
import { downloadHtmlFile, generateProfitLossHtml } from '../services/htmlExport';
import { dbService } from '../services/db';

interface ProfitLossViewProps {
  dateRange: DateRange;
  setDateRange: (r: DateRange) => void;
  currency: string;
  settings?: CompanySettings;
}

export const ProfitLossView: React.FC<ProfitLossViewProps> = ({
  dateRange,
  setDateRange,
  currency,
  settings,
}) => {
  const [accountingBasis, setAccountingBasis] = useState<'Accrual' | 'Cash'>('Accrual');
  const [drilldownTab, setDrilldownTab] = useState<'statement' | 'trips' | 'vehicles' | 'customers'>('statement');

  const report = generateProfitAndLoss(dateRange, accountingBasis);

  const handleDownloadPLHtml = () => {
    const compSettings = settings || dbService.getState().settings;
    const html = generateProfitLossHtml(report, compSettings, currency, dateRange, accountingBasis);
    downloadHtmlFile(`Bangash_ProfitLoss_${accountingBasis}_${dateRange.startDate}_${dateRange.endDate}.html`, html);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <span>Comprehensive Profit &amp; Loss Statement (P&amp;L)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gross Freight Margin (Direct Costs) &amp; Net Operating Profit with multi-dimensional breakdowns.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Basis Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setAccountingBasis('Accrual')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                accountingBasis === 'Accrual' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Accrual Basis
            </button>
            <button
              onClick={() => setAccountingBasis('Cash')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                accountingBasis === 'Cash' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Cash Basis
            </button>
          </div>

          <button
            onClick={handleDownloadPLHtml}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
            title="Download Profit & Loss statement as standalone offline .HTML document"
          >
            <Download className="w-4 h-4" />
            <span>Download in .HTML</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print P&amp;L</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Tabs Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-2">
          {['statement', 'trips', 'vehicles', 'customers'].map((tab) => (
            <button
              key={tab}
              onClick={() => setDrilldownTab(tab as any)}
              className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                drilldownTab === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab === 'statement'
                ? 'Full Financial Statement'
                : tab === 'trips'
                ? 'Trip-wise P&L'
                : tab === 'vehicles'
                ? 'Vehicle Profitability'
                : 'Customer Revenue & Profit'}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-medium">Period:</span>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="p-1.5 border border-slate-300 rounded-lg text-xs"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="p-1.5 border border-slate-300 rounded-lg text-xs"
          />
        </div>
      </div>

      {/* KPI Cards: Revenue, Direct Cost, Gross Profit, Operating Expenses, Net Profit */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 uppercase font-bold">Total Recognized Income</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCurrency(report.income.totalIncome, currency)}
          </div>
          <span className="text-[10px] text-blue-600 font-semibold">{accountingBasis} Basis</span>
        </div>

        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
          <span className="text-[10px] text-amber-800 uppercase font-bold">Direct Trip Costs</span>
          <div className="text-xl font-black text-amber-900 mt-1">
            {formatCurrency(report.directCosts.totalDirectCosts, currency)}
          </div>
          <span className="text-[10px] text-amber-700">Fuel, tolls, labor, en-route</span>
        </div>

        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <span className="text-[10px] text-blue-800 uppercase font-bold">Gross Operational Profit</span>
          <div className="text-xl font-black text-blue-900 mt-1">
            {formatCurrency(report.grossProfit, currency)}
          </div>
          <span className="text-[10px] text-blue-700 font-bold">{report.grossProfitMargin}% Gross Margin</span>
        </div>

        <div className="p-4 bg-slate-100 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-700 uppercase font-bold">Operating Overheads</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCurrency(report.operatingExpenses.totalOperatingExpenses, currency)}
          </div>
          <span className="text-[10px] text-slate-500">Office rent, salaries, utilities</span>
        </div>

        <div className="p-4 bg-emerald-950 text-white rounded-xl col-span-2 sm:col-span-1">
          <span className="text-[10px] text-emerald-300 uppercase font-bold">Net Final Profit</span>
          <div className="text-xl font-black text-emerald-400 mt-1">
            {formatCurrency(report.netProfit, currency)}
          </div>
          <span className="text-[10px] text-emerald-300 font-bold">{report.netProfitMargin}% Net Margin</span>
        </div>
      </div>

      {/* Main View: Statement or Drilldowns */}
      {drilldownTab === 'statement' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6 text-xs max-w-4xl mx-auto printable-card">
          <div className="text-center pb-4 border-b border-slate-200">
            <h3 className="text-lg font-black text-slate-900">PROFIT &amp; LOSS STATEMENT</h3>
            <p className="text-xs text-slate-500">
              For Period: {dateRange.startDate} to {dateRange.endDate} • Accounting Basis: {accountingBasis}
            </p>
          </div>

          {/* Section 1: Income */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-bold text-slate-900 bg-slate-100 p-2 rounded">
              <span>1. OPERATING REVENUE / INCOME</span>
              <span>{formatCurrency(report.income.totalIncome, currency)}</span>
            </div>
            <div className="pl-4 space-y-1 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Gross Freight Revenue (Consignments)</span>
                <span className="font-semibold">{formatCurrency(report.income.freightRevenue, currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Additional Freight / Demurrage / Handling Billed</span>
                <span className="font-semibold">{formatCurrency(report.income.additionalCharges, currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Other Operating Revenue</span>
                <span className="font-semibold">{formatCurrency(report.income.otherOperatingIncome, currency)}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Direct Costs */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-bold text-slate-900 bg-amber-50 p-2 rounded text-amber-900">
              <span>2. DIRECT TRIP OPERATIONAL COSTS</span>
              <span>{formatCurrency(report.directCosts.totalDirectCosts, currency)}</span>
            </div>
            <div className="pl-4 space-y-1 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Diesel &amp; Fuel Expenses</span>
                <span className="font-semibold">{formatCurrency(report.directCosts.fuel, currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Tolls &amp; Highway Taxes</span>
                <span className="font-semibold">{formatCurrency(report.directCosts.tollRoadTaxes, currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Loading &amp; Offloading Labor</span>
                <span className="font-semibold">{formatCurrency(report.directCosts.loadingUnloading, currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Driver Trip Allowances</span>
                <span className="font-semibold">{formatCurrency(report.directCosts.driverAllowances, currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>En-Route Maintenance &amp; Puncture Repairs</span>
                <span className="font-semibold">{formatCurrency(report.directCosts.repairMaintenance, currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Parking, Weighbridge &amp; Driver Food/Stay</span>
                <span className="font-semibold">{formatCurrency(report.directCosts.parkingFoodOther, currency)}</span>
              </div>
            </div>
          </div>

          {/* Gross Profit Subtotal */}
          <div className="flex justify-between items-center text-sm font-black p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
            <span>GROSS OPERATIONAL PROFIT (Revenue − Direct Costs)</span>
            <span>
              {formatCurrency(report.grossProfit, currency)} ({report.grossProfitMargin}%)
            </span>
          </div>

          {/* Section 3: Operating Expenses */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-bold text-slate-900 bg-slate-100 p-2 rounded">
              <span>3. GENERAL OPERATING EXPENSES (OVERHEADS)</span>
              <span>{formatCurrency(report.operatingExpenses.totalOperatingExpenses, currency)}</span>
            </div>
            <div className="pl-4 space-y-1 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Staff Salaries, Dispatchers &amp; Management Payroll</span>
                <span className="font-semibold">{formatCurrency(report.operatingExpenses.salaries, currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Office &amp; Warehouse Yard Facility Rent</span>
                <span className="font-semibold">{formatCurrency(report.operatingExpenses.officeRent, currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Electricity, High-speed Internet &amp; Utilities</span>
                <span className="font-semibold">{formatCurrency(report.operatingExpenses.utilities, currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Tyres &amp; Annual Mechanical Overhaul</span>
                <span className="font-semibold">{formatCurrency(report.operatingExpenses.tyresOverhaul, currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Bank Commission, Wire Charges &amp; Processing Fees</span>
                <span className="font-semibold">{formatCurrency(report.operatingExpenses.bankCharges, currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Stationery &amp; Miscellaneous Overheads</span>
                <span className="font-semibold">{formatCurrency(report.operatingExpenses.misc, currency)}</span>
              </div>
            </div>
          </div>

          {/* Final Net Profit */}
          <div className="flex justify-between items-center text-base font-black p-4 bg-slate-900 text-white rounded-xl border border-slate-800">
            <span>NET PROFIT FOR THE PERIOD (Gross Profit − Overheads)</span>
            <span className="text-xl text-emerald-400">
              {formatCurrency(report.netProfit, currency)} ({report.netProfitMargin}%)
            </span>
          </div>
        </div>
      ) : drilldownTab === 'trips' ? (
        /* Trip-wise Breakdown */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3">Trip # &amp; Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Vehicle / Driver</th>
                <th className="px-4 py-3 text-right">Freight Revenue</th>
                <th className="px-4 py-3 text-right">Direct Expenses</th>
                <th className="px-4 py-3 text-right">Net Profit</th>
                <th className="px-4 py-3 text-right">Margin %</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {report.tripWise.map((t) => (
                <tr key={t.tripNumber} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-blue-700">
                    <div>{t.tripNumber}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{t.tripDate}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{t.customer}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>{t.vehicleNumber}</div>
                    <div className="text-[10px] text-slate-500">{t.driverName}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {formatCurrency(t.revenue, currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700">
                    {formatCurrency(t.directExpenses, currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">
                    {formatCurrency(t.netProfit, currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">{t.margin}%</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : drilldownTab === 'vehicles' ? (
        /* Vehicle-wise Profitability */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3">Vehicle Plate</th>
                <th className="px-4 py-3">Make / Model</th>
                <th className="px-4 py-3">Ownership</th>
                <th className="px-4 py-3 text-center">Trips Executed</th>
                <th className="px-4 py-3 text-right">Total Revenue</th>
                <th className="px-4 py-3 text-right">Direct Costs</th>
                <th className="px-4 py-3 text-right">Vehicle Net Profit</th>
                <th className="px-4 py-3 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {report.vehicleWise.map((v) => (
                <tr key={v.vehicleNumber} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{v.vehicleNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{v.makeModel}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 font-semibold text-slate-700">
                      {v.ownership}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-800">{v.tripCount}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {formatCurrency(v.revenue, currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700">
                    {formatCurrency(v.directCosts, currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">
                    {formatCurrency(v.profit, currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">{v.margin}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Customer-wise Revenue & Profit */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3">Customer Company</th>
                <th className="px-4 py-3 text-center">Consignments</th>
                <th className="px-4 py-3 text-right">Gross Freight Revenue</th>
                <th className="px-4 py-3 text-right">Direct Transport Costs</th>
                <th className="px-4 py-3 text-right">Net Contribution Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {report.customerWise.map((c) => (
                <tr key={c.customerName} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{c.customerName}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-800">{c.tripCount}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {formatCurrency(c.totalRevenue, currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700">
                    {formatCurrency(c.directCosts, currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">
                    {formatCurrency(c.profit, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
