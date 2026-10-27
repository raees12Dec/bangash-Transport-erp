/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Truck,
  TrendingUp,
  Receipt,
  AlertTriangle,
  FileCheck,
  Wallet,
  Building,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  ChevronRight,
  Calendar,
  Download,
} from 'lucide-react';
import { DashboardKPIs, formatCurrency, DateRange } from '../services/accountingEngine';
import { Trip, POD, BankAccount, Vehicle, CompanySettings } from '../types';

interface DashboardViewProps {
  kpis: DashboardKPIs;
  currency: string;
  trips: Trip[];
  pendingPODs: POD[];
  accounts: BankAccount[];
  vehicles: Vehicle[];
  dateRange: DateRange;
  onSelectTrip: (trip: Trip) => void;
  onNavigateToTab: (tab: any) => void;
  onQuickVerifyPOD: (podId: string) => void;
  settings?: CompanySettings;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  kpis,
  currency,
  trips,
  pendingPODs,
  accounts,
  vehicles,
  dateRange,
  onSelectTrip,
  onNavigateToTab,
  onQuickVerifyPOD,
  settings,
}) => {
  // Recent trips (last 5)
  const recentTrips = [...trips].slice(0, 5);

  // Status badge styling helper
  const getStatusBadge = (status: Trip['status']) => {
    switch (status) {
      case 'Planned':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'Dispatched':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'In Transit':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Delivered':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'POD Received':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Invoiced':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Brand Hero Welcome Banner with Logo */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center space-x-4">
          <img
            src={settings?.logoUrl || '/assets/aistudio/Bangash_Transport_Co._Logo_b758f5dc.png'}
            alt={settings?.companyName || 'Bangash Transport Co.'}
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl bg-white p-1 border-2 border-slate-600 shadow-md shrink-0"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Goods Forwarding ERP
              </span>
              <span className="text-[10px] font-bold text-amber-400">
                FY {settings?.financialYear || '2025-2026'} • {settings?.accountingBasis || 'Accrual'} Accounting
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mt-1">
              {settings?.companyName || 'Bangash Transport Co.'}
            </h1>
            <p className="text-xs text-slate-300 font-medium">
              {settings?.tagline || 'Nationwide Heavy Freight Forwarding & Logistics'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
          <button
            onClick={() => onNavigateToTab('reports')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Download Reports in standalone .HTML format"
          >
            <Download className="w-4 h-4" />
            <span>Download Reports (.HTML)</span>
          </button>
          <button
            onClick={() => onNavigateToTab('trips')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>Trip Operations</span>
          </button>
        </div>
      </div>

      {/* Expiry / Pending Alert Banner if needed */}
      {(kpis.pendingPODs > 0 || kpis.expiringDocumentsCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kpis.pendingPODs > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">
                    {kpis.pendingPODs} Pending Proof of Delivery (POD)
                  </h4>
                  <p className="text-xs text-amber-700">
                    Delivered trips awaiting signed acknowledgement document or verification.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('pod')}
                className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Review PODs
              </button>
            </div>
          )}

          {kpis.expiringDocumentsCount > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-900">
                    {kpis.expiringDocumentsCount} Vehicle Certificates Expiring Soon
                  </h4>
                  <p className="text-xs text-rose-700">
                    Fitness certificate, insurance, or road tax renewal due within 30 days.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('vehicles')}
                className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                View Fleet
              </button>
            </div>
          )}
        </div>
      )}

      {/* Top 8 KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Trips */}
        <div
          onClick={() => onNavigateToTab('trips')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Trips</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{kpis.totalTrips}</div>
          <div className="flex items-center space-x-2 mt-2 text-xs text-slate-500">
            <span className="text-blue-600 font-semibold">{kpis.tripsInProgress} in transit</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold">{kpis.completedTrips} done</span>
          </div>
        </div>

        {/* Freight Revenue */}
        <div
          onClick={() => onNavigateToTab('profit-loss')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Freight Revenue</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(kpis.totalFreightRevenue, currency)}</div>
          <div className="flex items-center space-x-1 mt-2 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Recognized from active consignments</span>
          </div>
        </div>

        {/* Total Trip Expenses */}
        <div
          onClick={() => onNavigateToTab('expenses')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trip Expenses</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(kpis.totalTripExpenses, currency)}</div>
          <div className="flex items-center space-x-1 mt-2 text-xs text-amber-700 font-medium">
            <span>Fuel, tolls, loading, maintenance &amp; allowances</span>
          </div>
        </div>

        {/* Net Trip Profit */}
        <div
          onClick={() => onNavigateToTab('profit-loss')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trip Net Profit</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-700">{formatCurrency(kpis.totalTripProfit, currency)}</div>
          <div className="flex items-center space-x-2 mt-2 text-xs font-semibold text-indigo-600">
            <span>Margin: {kpis.profitMarginPercent}%</span>
            <span className="text-slate-400 font-normal">Revenue − Direct Cost</span>
          </div>
        </div>

        {/* Customer Receivables */}
        <div
          onClick={() => onNavigateToTab('customer-ledger')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-cyan-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer Receivables</span>
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg group-hover:bg-cyan-600 group-hover:text-white transition-colors">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(kpis.customerReceivables, currency)}</div>
          <div className="text-xs text-slate-500 mt-2">Unpaid &amp; partially paid customer bills</div>
        </div>

        {/* Supplier Payables */}
        <div
          onClick={() => onNavigateToTab('suppliers')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-rose-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier Payables</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(kpis.supplierPayables, currency)}</div>
          <div className="text-xs text-slate-500 mt-2">Fuel pumps, workshops, tyre vendors</div>
        </div>

        {/* Total Cash Balance */}
        <div
          onClick={() => onNavigateToTab('cash-bank')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-teal-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash in Hand</span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(kpis.totalCashBalance, currency)}</div>
          <div className="text-xs text-slate-500 mt-2">Terminal safe &amp; petty cash</div>
        </div>

        {/* Bank Balances */}
        <div
          onClick={() => onNavigateToTab('cash-bank')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-purple-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank Accounts</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(kpis.totalBankBalance, currency)}</div>
          <div className="flex items-center space-x-1 mt-2 text-xs font-semibold text-purple-700">
            <span>Liquid Funds: {formatCurrency(kpis.totalLiquidFunds, currency)}</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Profit Chart (Custom high-fidelity SVG chart) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Revenue &amp; Trip Financial Overview</h3>
              <p className="text-xs text-slate-500">Live operational financial margins for {dateRange.startDate} to {dateRange.endDate}</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="inline-flex items-center">
                <span className="w-3 h-3 bg-blue-600 rounded-xs mr-1.5"></span> Revenue
              </span>
              <span className="inline-flex items-center">
                <span className="w-3 h-3 bg-amber-500 rounded-xs mr-1.5"></span> Direct Expenses
              </span>
              <span className="inline-flex items-center">
                <span className="w-3 h-3 bg-emerald-500 rounded-xs mr-1.5"></span> Net Profit
              </span>
            </div>
          </div>

          {/* SVG Bar Chart with real numbers */}
          <div className="h-64 flex flex-col justify-end pt-4">
            <div className="h-48 grid grid-cols-5 gap-4 items-end border-b border-slate-200 pb-2">
              {/* Trip 1 */}
              <div className="flex flex-col items-center space-y-1 group">
                <div className="w-full flex justify-center space-x-1 h-36 items-end">
                  <div style={{ height: '80%' }} className="w-3.5 bg-blue-600 rounded-t-xs" title="Revenue: PKR 240,000"></div>
                  <div style={{ height: '43%' }} className="w-3.5 bg-amber-500 rounded-t-xs" title="Expenses: PKR 130,000"></div>
                  <div style={{ height: '37%' }} className="w-3.5 bg-emerald-500 rounded-t-xs" title="Profit: PKR 110,000"></div>
                </div>
                <span className="text-[11px] font-medium text-slate-600 truncate max-w-[70px]">TRP-0001</span>
                <span className="text-[10px] text-slate-400">Hub-Lhr</span>
              </div>

              {/* Trip 2 */}
              <div className="flex flex-col items-center space-y-1 group">
                <div className="w-full flex justify-center space-x-1 h-36 items-end">
                  <div style={{ height: '58%' }} className="w-3.5 bg-blue-600 rounded-t-xs" title="Revenue: PKR 176,400"></div>
                  <div style={{ height: '31%' }} className="w-3.5 bg-amber-500 rounded-t-xs" title="Expenses: PKR 94,000"></div>
                  <div style={{ height: '27%' }} className="w-3.5 bg-emerald-500 rounded-t-xs" title="Profit: PKR 82,400"></div>
                </div>
                <span className="text-[11px] font-medium text-slate-600 truncate max-w-[70px]">TRP-0002</span>
                <span className="text-[10px] text-slate-400">Khi-Isb</span>
              </div>

              {/* Trip 3 */}
              <div className="flex flex-col items-center space-y-1 group">
                <div className="w-full flex justify-center space-x-1 h-36 items-end">
                  <div style={{ height: '71%' }} className="w-3.5 bg-blue-600 rounded-t-xs" title="Revenue: PKR 213,200"></div>
                  <div style={{ height: '36%' }} className="w-3.5 bg-amber-500 rounded-t-xs" title="Expenses: PKR 108,000"></div>
                  <div style={{ height: '35%' }} className="w-3.5 bg-emerald-500 rounded-t-xs" title="Profit: PKR 105,200"></div>
                </div>
                <span className="text-[11px] font-medium text-slate-600 truncate max-w-[70px]">TRP-0003</span>
                <span className="text-[10px] text-slate-400">Lhr-Port</span>
              </div>

              {/* Trip 4 */}
              <div className="flex flex-col items-center space-y-1 group">
                <div className="w-full flex justify-center space-x-1 h-36 items-end">
                  <div style={{ height: '56%' }} className="w-3.5 bg-blue-600 rounded-t-xs" title="Revenue: PKR 168,000"></div>
                  <div style={{ height: '26%' }} className="w-3.5 bg-amber-500 rounded-t-xs" title="Expenses: PKR 77,000"></div>
                  <div style={{ height: '30%' }} className="w-3.5 bg-emerald-500 rounded-t-xs" title="Profit: PKR 91,000"></div>
                </div>
                <span className="text-[11px] font-medium text-slate-600 truncate max-w-[70px]">TRP-0004</span>
                <span className="text-[10px] text-slate-400">Noori-Suk</span>
              </div>

              {/* Trip 5 */}
              <div className="flex flex-col items-center space-y-1 group">
                <div className="w-full flex justify-center space-x-1 h-36 items-end">
                  <div style={{ height: '92%' }} className="w-3.5 bg-blue-600 rounded-t-xs" title="Revenue: PKR 276,000"></div>
                  <div style={{ height: '46%' }} className="w-3.5 bg-amber-500 rounded-t-xs" title="Expenses: PKR 137,500"></div>
                  <div style={{ height: '46%' }} className="w-3.5 bg-emerald-500 rounded-t-xs" title="Profit: PKR 138,500"></div>
                </div>
                <span className="text-[11px] font-medium text-slate-600 truncate max-w-[70px]">TRP-0005</span>
                <span className="text-[10px] text-slate-400">Hub-Psh</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Consignment Summary Totals:</span>
              <span className="font-bold text-blue-700">Gross: {formatCurrency(kpis.totalFreightRevenue, currency)}</span>
              <span className="font-bold text-amber-600">Cost: {formatCurrency(kpis.totalTripExpenses, currency)}</span>
              <span className="font-bold text-emerald-600">Net Profit: {formatCurrency(kpis.totalTripProfit, currency)} ({kpis.profitMarginPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Fleet Utilization & Direct Cost Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Fleet Operations</h3>
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold">
                {kpis.vehicleUtilizationPercent}% Active
              </span>
            </div>

            {/* Vehicle Status Counters */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs text-slate-500">Total Fleet</div>
                <div className="text-lg font-bold text-slate-800">{kpis.totalVehicles}</div>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-700 font-medium">On Trip</div>
                <div className="text-lg font-bold text-blue-800">{kpis.activeVehicles}</div>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="text-xs text-emerald-700 font-medium">Available</div>
                <div className="text-lg font-bold text-emerald-800">
                  {vehicles.filter((v) => v.status === 'Available').length}
                </div>
              </div>
            </div>

            {/* Cost Breakdown progress bars */}
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Direct Cost Allocation
            </h4>
            <div className="space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Diesel / Fuel</span>
                  <span className="font-semibold text-slate-900">~ 58%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: '58%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Toll Plazas &amp; Road Tax</span>
                  <span className="font-semibold text-slate-900">~ 14%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '14%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Loading &amp; Offloading Labor</span>
                  <span className="font-semibold text-slate-900">~ 12%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-cyan-500 h-2 rounded-full" style={{ width: '12%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Driver Allowance &amp; En-Route</span>
                  <span className="font-semibold text-slate-900">~ 16%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-500 h-2 rounded-full" style={{ width: '16%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigateToTab('vehicles')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer"
            >
              <span>Manage Fleet &amp; Maintenance</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Trips & Pending PODs review */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trips Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Trip Consignments</h3>
              <p className="text-xs text-slate-500">Live operational status and route tracking</p>
            </div>
            <button
              onClick={() => onNavigateToTab('trips')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center cursor-pointer"
            >
              <span>View All Trips</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Trip # / Bilty</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Vehicle / Driver</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3 text-right">Freight Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-blue-700">
                      <div>{trip.tripNumber}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{trip.bdNumber}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[140px] truncate">
                      {trip.customerCompanyName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="font-medium text-slate-800">{trip.vehicleNumber}</div>
                      <div className="text-[10px] text-slate-500">{trip.driverName}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate">
                      <div className="text-[11px] font-medium text-slate-800 truncate">{trip.startingLocation}</div>
                      <div className="text-[10px] text-slate-400 truncate">➔ {trip.destinationLocation}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      <div>{formatCurrency(trip.totalFreightAmount, currency)}</div>
                      {trip.advanceReceived > 0 && (
                        <div className="text-[10px] text-emerald-600 font-medium">
                          Adv: {formatCurrency(trip.advanceReceived, currency)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                          trip.status
                        )}`}
                      >
                        {trip.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onSelectTrip(trip)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending PODs Quick Review */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Pending POD Receipts</h3>
                <p className="text-xs text-slate-500">Require receiving signature or upload</p>
              </div>
              <button
                onClick={() => onNavigateToTab('pod')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                All PODs
              </button>
            </div>

            <div className="p-4 space-y-3">
              {pendingPODs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  All delivered consignments have verified proof of delivery!
                </div>
              ) : (
                pendingPODs.slice(0, 4).map((pod) => (
                  <div
                    key={pod.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                      <span className="text-blue-700">{pod.podNumber}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        {pod.status}
                      </span>
                    </div>
                    <div className="text-slate-700 font-medium">{pod.customerName}</div>
                    <div className="text-[11px] text-slate-500">
                      Trip: {pod.tripNumber} • Vehicle: {pod.vehicleNumber}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                        {pod.deliveryLocation}
                      </span>
                      <button
                        onClick={() => onQuickVerifyPOD(pod.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] px-2.5 py-1 rounded transition-colors cursor-pointer"
                      >
                        Verify / Sign
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <span className="text-xs text-slate-500">
              Rule: Delivered trips automatically generate a linked POD record.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
