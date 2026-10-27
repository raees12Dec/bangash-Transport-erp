/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileText,
  Filter,
  Search,
  DollarSign,
  Truck,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building,
  Hash,
  Download,
} from 'lucide-react';
import { Trip, CompanySettings } from '../types';
import { dbService } from '../services/db';
import { formatCurrency } from '../services/accountingEngine';
import { generateTripSheetPdfHtml, downloadHtmlFile } from '../services/htmlExport';

interface TripSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanySettings;
  currencySymbol: string;
}

export const TripSheetModal: React.FC<TripSheetModalProps> = ({
  isOpen,
  onClose,
  settings,
  currencySymbol,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('ALL');
  const [biltySearch, setBiltySearch] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const trips = dbService.getTrips();
  const customers = dbService.getCustomers();
  const vehicles = dbService.getVehicles();

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      // Customer filter
      if (selectedCustomerId !== 'ALL' && t.customerId !== selectedCustomerId) {
        return false;
      }
      // Vehicle filter
      if (selectedVehicleId !== 'ALL' && t.vehicleId !== selectedVehicleId) {
        return false;
      }
      // Bilty / GR search
      if (biltySearch.trim()) {
        const query = biltySearch.toLowerCase().trim();
        const bd = (t.bdNumber || '').toLowerCase();
        const tripNum = (t.tripNumber || '').toLowerCase();
        if (!bd.includes(query) && !tripNum.includes(query)) {
          return false;
        }
      }
      // Date filter
      if (dateFilter !== 'ALL') {
        const tDate = t.tripDate;
        const now = new Date();
        if (dateFilter === 'WEEK') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
          if (tDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'MONTH') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
          if (tDate < thirtyDaysAgo) return false;
        } else if (dateFilter === 'YEAR') {
          const yearStart = `${now.getFullYear()}-01-01`;
          if (tDate < yearStart) return false;
        } else if (dateFilter === 'CUSTOM') {
          if (startDate && tDate < startDate) return false;
          if (endDate && tDate > endDate) return false;
        }
      }
      return true;
    });
  }, [trips, selectedCustomerId, selectedVehicleId, biltySearch, dateFilter, startDate, endDate]);

  if (!isOpen) return null;

  const totalFreight = filteredTrips.reduce((acc, t) => acc + (t.totalFreightAmount || 0), 0);
  const totalExpenses = filteredTrips.reduce((acc, t) => acc + (t.financials?.totalTripExpenses || 0), 0);
  const totalNetProfit = filteredTrips.reduce((acc, t) => acc + (t.financials?.netTripProfit || 0), 0);
  const overallMargin = totalFreight > 0 ? (totalNetProfit / totalFreight) * 100 : 0;

  const handlePrintAll = () => {
    const cust = customers.find((c) => c.id === selectedCustomerId);
    const veh = vehicles.find((v) => v.id === selectedVehicleId);
    const html = generateTripSheetPdfHtml(
      filteredTrips,
      {
        customerName: cust ? cust.companyName : undefined,
        vehicleNumber: veh ? veh.vehicleNumber : undefined,
        biltyNumber: biltySearch || undefined,
        dateRange: dateFilter === 'CUSTOM' ? `${startDate} to ${endDate}` : dateFilter !== 'ALL' ? dateFilter : undefined,
      },
      settings,
      currencySymbol
    );

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
    } else {
      downloadHtmlFile(`Trip_Sheets_Report_${Date.now()}.html`, html);
    }
  };

  const handlePrintSingle = (trip: Trip) => {
    const html = generateTripSheetPdfHtml(
      [trip],
      {
        biltyNumber: trip.bdNumber,
      },
      settings,
      currencySymbol
    );
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
    } else {
      downloadHtmlFile(`Trip_Sheet_${trip.tripNumber}.html`, html);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full my-4 overflow-hidden flex flex-col max-h-[94vh] border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Trip Sheets in PDF (All Trips Detailed Calculations)</h2>
              <p className="text-xs text-slate-400">
                Detailed one-by-one trip sheets with full costs, revenue calculations, and net profit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintAll}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm text-xs flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print / PDF All Sheets ({filteredTrips.length})
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Customer Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Customer-wise Filter
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded shadow-sm focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Customers ({customers.length})</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Vehicle-wise Filter
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded shadow-sm focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Fleet Vehicles ({vehicles.length})</option>
                <optgroup label="Own Vehicles">
                  {vehicles
                    .filter((v) => v.ownership === 'Owned')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNumber} ({v.name})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Market / Attached Vehicles">
                  {vehicles
                    .filter((v) => v.ownership !== 'Owned')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNumber} ({v.ownership} - {v.name})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Bilty Search */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Bilty / GR / LR Search
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. 10845, 10822, 1"
                  value={biltySearch}
                  onChange={(e) => setBiltySearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded shadow-sm"
                />
              </div>
            </div>

            {/* Date Range Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Period / Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded shadow-sm"
              >
                <option value="ALL">All Time</option>
                <option value="WEEK">Last 7 Days (Weekly)</option>
                <option value="MONTH">Last 30 Days (Monthly)</option>
                <option value="YEAR">This Year (Yearly)</option>
                <option value="CUSTOM">Between 2 Dates (Custom)</option>
              </select>
            </div>
          </div>

          {dateFilter === 'CUSTOM' && (
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-3 text-xs">
              <span className="font-bold text-slate-600">From Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded"
              />
              <span className="font-bold text-slate-600">To Date:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded"
              />
            </div>
          )}
        </div>

        {/* Financial Summary Banner */}
        <div className="bg-slate-900 text-white px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-400">Matching Trips:</span>{' '}
              <strong className="text-white text-sm">{filteredTrips.length}</strong>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div>
              <span className="text-slate-400">Gross Freight:</span>{' '}
              <strong className="text-blue-400 text-sm">
                {formatCurrency(totalFreight, currencySymbol)}
              </strong>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div>
              <span className="text-slate-400">Total Route Costs:</span>{' '}
              <strong className="text-amber-400 text-sm">
                {formatCurrency(totalExpenses, currencySymbol)}
              </strong>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div>
              <span className="text-slate-400">Net Profit:</span>{' '}
              <strong className={`text-sm ${totalNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(totalNetProfit, currencySymbol)}
              </strong>{' '}
              <span className="text-[10px] text-slate-400">({overallMargin.toFixed(1)}% margin)</span>
            </div>
          </div>

          <button
            onClick={handlePrintAll}
            className="text-xs text-blue-300 hover:text-white underline font-bold"
          >
            Download / Print All as One PDF ➔
          </button>
        </div>

        {/* Trips List - One by One */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-100">
          {filteredTrips.map((trip, idx) => {
            const f = trip.financials || {
              grossFreightRevenue: trip.totalFreightAmount,
              fuelExpenses: 0,
              driverAllowance: 0,
              tollTaxes: 0,
              loadingCharges: 0,
              unloadingCharges: 0,
              totalTripExpenses: 0,
              netTripProfit: trip.totalFreightAmount,
              profitMarginPercentage: 100,
            };
            const isProfit = (f.netTripProfit || 0) >= 0;

            return (
              <div
                key={trip.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition"
              >
                {/* Trip Card Header */}
                <div className="bg-slate-800 text-white p-4 px-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-600 text-white font-mono text-xs font-black px-2.5 py-1 rounded">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base">Trip #{trip.tripNumber}</span>
                        <span className="text-xs bg-slate-700 px-2 py-0.5 rounded font-mono text-amber-300">
                          Bilty / GR: {trip.bdNumber || 'N/A'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">
                        Date: {trip.tripDate} | Customer: <strong>{trip.customerCompanyName}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        trip.status === 'Completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : trip.status === 'Invoiced'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : trip.status === 'Delivered'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {trip.status}
                    </span>
                    <button
                      onClick={() => handlePrintSingle(trip)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 border border-slate-600 shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Sheet PDF
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Route &amp; Journey</div>
                    <div className="font-bold text-slate-800 text-sm">
                      {trip.startingLocation} ➔ {trip.destinationLocation}
                    </div>
                    <div className="text-slate-500">
                      Dispatched: {trip.startingDateTime || trip.tripDate}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Assigned Truck &amp; Driver</div>
                    <div className="font-bold text-slate-800">
                      {trip.vehicleNumber} ({trip.vehicleType})
                    </div>
                    <div className="text-slate-500">
                      Driver: {trip.driverName} ({trip.driverContactNumber})
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Consignment &amp; Freight</div>
                    <div className="font-bold text-slate-800">
                      {trip.goodsDescription} ({trip.goodsQuantity} {trip.quantityUnit})
                    </div>
                    <div className="text-blue-600 font-bold">
                      Rate: {formatCurrency(trip.freightRate, currencySymbol)} / {trip.rateType}
                    </div>
                  </div>
                </div>

                {/* Costs & Financials Breakdown */}
                <div className="p-5 bg-slate-50">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Detailed Route Costs &amp; Expense Breakdown</span>
                    <span className="text-[11px] text-slate-500">
                      Settled Items: {trip.tripExpenseItems?.length || 0}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-4">
                    {trip.tripExpenseItems && trip.tripExpenseItems.length > 0 ? (
                      trip.tripExpenseItems.map((item, i) => {
                        const isFuel = item.category?.toLowerCase().includes('fuel') || item.name?.toLowerCase().includes('diesel');
                        const ltrs = item.liters || item.fuelLiters || (isFuel && f.fuelLiters ? f.fuelLiters : 0);
                        const rate = item.fuelRatePerLiter || (isFuel && f.fuelRatePerLiter ? f.fuelRatePerLiter : 0);
                        return (
                          <div key={i} className="bg-white p-2 rounded border border-slate-200">
                            <div className="text-[10px] font-semibold text-slate-500 truncate flex items-center justify-between" title={item.name}>
                              <span className="truncate">{item.name}</span>
                              {ltrs > 0 && (
                                <span className="ml-1 text-[9px] font-bold text-blue-700 bg-blue-50 px-1 rounded shrink-0">
                                  {ltrs} Ltr
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-bold text-slate-800">
                              {formatCurrency(item.amount, currencySymbol)}
                            </div>
                            {ltrs > 0 && (
                              <div className="text-[9px] text-blue-600 font-semibold mt-0.5">
                                Qty: {ltrs} Liters {rate > 0 ? `@ ${formatCurrency(rate, currencySymbol)}/L` : ''}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <div className="text-[10px] font-semibold text-slate-500 flex items-center justify-between">
                            <span>Diesel / Fuel</span>
                            {(f.fuelLiters || 0) > 0 && (
                              <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1 rounded">
                                {f.fuelLiters} Ltr
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-800">
                            {formatCurrency(f.fuelExpenses || 0, currencySymbol)}
                          </div>
                          {(f.fuelLiters || 0) > 0 && (
                            <div className="text-[9px] text-blue-600 font-semibold mt-0.5">
                              Qty: {f.fuelLiters} Liters {f.fuelRatePerLiter ? `@ ${formatCurrency(f.fuelRatePerLiter, currencySymbol)}/L` : ''}
                            </div>
                          )}
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <div className="text-[10px] font-semibold text-slate-500">Driver Allowance</div>
                          <div className="text-xs font-bold text-slate-800">
                            {formatCurrency(f.driverAllowance || 0, currencySymbol)}
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <div className="text-[10px] font-semibold text-slate-500">Tolls &amp; Road Tax</div>
                          <div className="text-xs font-bold text-slate-800">
                            {formatCurrency(f.tollTaxes || 0, currencySymbol)}
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <div className="text-[10px] font-semibold text-slate-500">Loading / Unloading</div>
                          <div className="text-xs font-bold text-slate-800">
                            {formatCurrency((f.loadingCharges || 0) + (f.unloadingCharges || 0), currencySymbol)}
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <div className="text-[10px] font-semibold text-slate-500">Maintenance &amp; Tyre</div>
                          <div className="text-xs font-bold text-slate-800">
                            {formatCurrency(f.vehicleRepairMaintenance || 0, currencySymbol)}
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <div className="text-[10px] font-semibold text-slate-500">Gate / Food / Other</div>
                          <div className="text-xs font-bold text-slate-800">
                            {formatCurrency(
                              (f.parkingCharges || 0) + (f.foodAccommodation || 0) + (f.routeOtherExpenses || 0),
                              currencySymbol
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Profit Calculation Summary Bar */}
                  <div className="bg-slate-900 text-white rounded-lg p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Gross Revenue:</span>{' '}
                        <strong className="text-white text-sm">
                          {formatCurrency(trip.totalFreightAmount, currencySymbol)}
                        </strong>
                      </div>
                      <div className="h-4 w-px bg-slate-700" />
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Total Costs:</span>{' '}
                        <strong className="text-amber-400 text-sm">
                          - {formatCurrency(f.totalTripExpenses, currencySymbol)}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Net Trip Profit
                        </span>
                        <span
                          className={`text-base font-black ${
                            isProfit ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {formatCurrency(f.netTripProfit, currencySymbol)}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          isProfit ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {f.profitMarginPercentage ? Number(f.profitMarginPercentage).toFixed(1) : 0}% Margin
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredTrips.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <div className="font-bold text-slate-600">No Trips match your filter criteria</div>
              <p className="text-xs mt-1">Try clearing filters or searching another Bilty # or customer.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
