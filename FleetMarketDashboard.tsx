/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Truck,
  Users,
  CheckCircle,
  AlertCircle,
  Plus,
  Printer,
  Calendar,
  FileText,
  DollarSign,
  Fuel,
  Wrench,
  Disc,
  BatteryCharging,
  ArrowRight,
  UserCheck,
  UserX,
  Search,
} from 'lucide-react';
import { Vehicle, Driver, PurchaseItem, PurchaseCategory, CompanySettings } from '../types';
import { dbService } from '../services/db';
import { formatCurrency } from '../services/accountingEngine';
import { generatePurchaseReportHtml, downloadHtmlFile } from '../services/htmlExport';

interface FleetMarketDashboardProps {
  settings: CompanySettings;
  currencySymbol: string;
  onOpenNewTripModal?: () => void;
  onNavigateToPurchases?: () => void;
}

export const FleetMarketDashboard: React.FC<FleetMarketDashboardProps> = ({
  settings,
  currencySymbol,
  onNavigateToPurchases,
}) => {
  const [activeFleetTab, setActiveFleetTab] = useState<'ALL' | 'OWNED' | 'MARKET' | 'UNALLOTTED'>('ALL');
  const [purchasePeriod, setPurchasePeriod] = useState<'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'>('MONTH');
  const [purchaseStartDate, setPurchaseStartDate] = useState<string>('');
  const [purchaseEndDate, setPurchaseEndDate] = useState<string>('');
  const [selectedPurchaseCategory, setSelectedPurchaseCategory] = useState<string>('ALL');

  // Allocation state
  const [allotVehicleId, setAllotVehicleId] = useState<string>('');
  const [allotDriverId, setAllotDriverId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const vehicles = dbService.getVehicles();
  const drivers = dbService.getDrivers();
  const purchases = dbService.getPurchases();

  // Fleet Statistics
  const totalVehicles = vehicles.length;
  const ownedVehicles = vehicles.filter((v) => v.ownership === 'Owned');
  const marketVehicles = vehicles.filter((v) => v.ownership !== 'Owned');
  const allottedVehicles = vehicles.filter((v) => !!v.assignedDriverId);
  const unallottedVehicles = vehicles.filter((v) => !v.assignedDriverId);

  // Driver Statistics
  const totalDrivers = drivers.length;
  const allottedDrivers = drivers.filter((d) => !!d.assignedVehicleId);
  const unallottedDrivers = drivers.filter((d) => !d.assignedVehicleId);

  // Filtered vehicles for tab
  const displayedVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (activeFleetTab === 'OWNED' && v.ownership !== 'Owned') return false;
      if (activeFleetTab === 'MARKET' && v.ownership === 'Owned') return false;
      if (activeFleetTab === 'UNALLOTTED' && !!v.assignedDriverId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = (v.vehicleNumber || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        const drv = (v.assignedDriverName || '').toLowerCase();
        if (!num.includes(q) && !name.includes(q) && !drv.includes(q)) return false;
      }
      return true;
    });
  }, [vehicles, activeFleetTab, searchQuery]);

  // Purchases Filtered by Period
  const filteredPurchases = useMemo(() => {
    const now = new Date();
    return purchases.filter((p) => {
      if (selectedPurchaseCategory !== 'ALL' && p.category !== selectedPurchaseCategory) {
        return false;
      }
      const pDate = p.date;
      if (purchasePeriod === 'WEEK') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
        if (pDate < sevenDaysAgo) return false;
      } else if (purchasePeriod === 'MONTH') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
        if (pDate < thirtyDaysAgo) return false;
      } else if (purchasePeriod === 'YEAR') {
        const yearStart = `${now.getFullYear()}-01-01`;
        if (pDate < yearStart) return false;
      } else if (purchasePeriod === 'CUSTOM') {
        if (purchaseStartDate && pDate < purchaseStartDate) return false;
        if (purchaseEndDate && pDate > purchaseEndDate) return false;
      }
      return true;
    });
  }, [purchases, purchasePeriod, purchaseStartDate, purchaseEndDate, selectedPurchaseCategory]);

  // Purchases category sums
  const tyreTotal = filteredPurchases.filter((p) => p.category === 'Tyres').reduce((sum, p) => sum + p.totalAmount, 0);
  const partsTotal = filteredPurchases.filter((p) => p.category === 'Parts').reduce((sum, p) => sum + p.totalAmount, 0);
  const dieselTotal = filteredPurchases.filter((p) => p.category === 'Diesel').reduce((sum, p) => sum + p.totalAmount, 0);
  const batteryTotal = filteredPurchases.filter((p) => p.category === 'Battery').reduce((sum, p) => sum + p.totalAmount, 0);
  const grandPurchaseTotal = tyreTotal + partsTotal + dieselTotal + batteryTotal;

  // Driver Allotment Action
  const handleAllotDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allotVehicleId || !allotDriverId) {
      alert('Please select both a vehicle and a driver to allocate.');
      return;
    }
    try {
      dbService.allocateDriverToVehicle(allotVehicleId, allotDriverId);
      setAllotVehicleId('');
      setAllotDriverId('');
      alert('Driver successfully allotted to vehicle!');
    } catch (err: any) {
      alert(`Error allocating driver: ${err.message}`);
    }
  };

  const handleDeallocate = (vehicleId: string) => {
    if (confirm('Are you sure you want to deallocate the driver from this vehicle?')) {
      dbService.deallocateDriverFromVehicle(vehicleId);
    }
  };

  const handlePrintPurchaseReport = () => {
    const periodLabel =
      purchasePeriod === 'WEEK'
        ? 'Last 7 Days (Weekly)'
        : purchasePeriod === 'MONTH'
        ? 'Last 30 Days (Monthly)'
        : purchasePeriod === 'YEAR'
        ? 'Current Year (Yearly)'
        : `${purchaseStartDate} to ${purchaseEndDate}`;

    const html = generatePurchaseReportHtml(filteredPurchases, periodLabel, settings, currencySymbol);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
    } else {
      downloadHtmlFile(`Purchases_Report_${Date.now()}.html`, html);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-0.5 rounded uppercase">
              2nd Dashboard
            </span>
            <h1 className="text-xl font-black">Fleet &amp; Market Operations Dashboard</h1>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Real-time management of Own vs Market vehicles, Driver allotment status, and Workshop Purchases
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToPurchases && (
            <button
              onClick={onNavigateToPurchases}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> New Purchase / Ledger
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Grid: Own vs Market & Driver Allotment */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Total Vehicles */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Vehicles</span>
            <Truck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalVehicles}</div>
          <div className="text-[11px] text-slate-500 mt-1">Registered in fleet</div>
        </div>

        {/* Own Vehicles */}
        <div className="bg-white p-4 rounded-xl border-l-4 border-l-blue-600 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Own Vehicles</span>
            <span className="text-xs font-extrabold">{((ownedVehicles.length / (totalVehicles || 1)) * 100).toFixed(0)}%</span>
          </div>
          <div className="text-2xl font-black text-blue-700">{ownedVehicles.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Company-owned assets</div>
        </div>

        {/* Market Vehicles */}
        <div className="bg-white p-4 rounded-xl border-l-4 border-l-amber-500 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Market Vehicles</span>
            <span className="text-xs font-extrabold">{((marketVehicles.length / (totalVehicles || 1)) * 100).toFixed(0)}%</span>
          </div>
          <div className="text-2xl font-black text-amber-700">{marketVehicles.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Attached / Contractor rigs</div>
        </div>

        {/* Driver Allotted Vehicles */}
        <div className="bg-white p-4 rounded-xl border-l-4 border-l-emerald-600 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Driver Allotted</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{allottedVehicles.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Vehicles with assigned driver</div>
        </div>

        {/* Unallotted Vehicles */}
        <div className="bg-white p-4 rounded-xl border-l-4 border-l-rose-500 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Not Allotted</span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700">{unallottedVehicles.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Vehicles awaiting driver</div>
        </div>

        {/* Standby / Float Drivers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Float Drivers</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-purple-700">{unallottedDrivers.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Unallotted standby drivers</div>
        </div>
      </div>

      {/* Driver Allocation Tool Bar */}
      <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Quick Driver Allotment &amp; Allocation Tool
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            {unallottedVehicles.length} vehicles without driver | {unallottedDrivers.length} float drivers available
          </span>
        </div>

        <form onSubmit={handleAllotDriver} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-1/2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Select Vehicle (Unallotted preferred)
            </label>
            <select
              value={allotVehicleId}
              onChange={(e) => setAllotVehicleId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm"
              required
            >
              <option value="">-- Choose Vehicle to Allot --</option>
              <optgroup label="⚠️ Unallotted Vehicles (No Driver)">
                {unallottedVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber} ({v.ownership} - {v.name})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Allotted Vehicles (Reassign Driver)">
                {allottedVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber} (Currently: {v.assignedDriverName})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="w-full sm:w-1/2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Select Driver (Standby / Float)
            </label>
            <select
              value={allotDriverId}
              onChange={(e) => setAllotDriverId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm"
              required
            >
              <option value="">-- Choose Driver --</option>
              <optgroup label="🌟 Standby / Float Drivers (Unassigned)">
                {unallottedDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.mobileNumber})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Assigned Drivers (Transfer to new vehicle)">
                {allottedDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} (Assigned: {d.assignedVehicleNumber})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="w-full sm:w-auto sm:self-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg shadow-sm text-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <UserCheck className="w-4 h-4" /> Allot Driver
            </button>
          </div>
        </form>
      </div>

      {/* Fleet Register Table with Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFleetTab('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeFleetTab === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Vehicles ({totalVehicles})
            </button>
            <button
              onClick={() => setActiveFleetTab('OWNED')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeFleetTab === 'OWNED'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Own Vehicles ({ownedVehicles.length})
            </button>
            <button
              onClick={() => setActiveFleetTab('MARKET')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeFleetTab === 'MARKET'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Market Vehicles ({marketVehicles.length})
            </button>
            <button
              onClick={() => setActiveFleetTab('UNALLOTTED')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeFleetTab === 'UNALLOTTED'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Unallotted ({unallottedVehicles.length})
            </button>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search plate, model, driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Vehicle Plate #</th>
                <th className="py-2.5 px-4">Ownership</th>
                <th className="py-2.5 px-4">Make &amp; Model</th>
                <th className="py-2.5 px-4">Body / Capacity</th>
                <th className="py-2.5 px-4">Allotted Driver</th>
                <th className="py-2.5 px-4">Fitness Expiry</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedVehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono font-black text-slate-900">{v.vehicleNumber}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        v.ownership === 'Owned'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {v.ownership}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-800">{v.name}</td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {v.vehicleType} • {v.sizeCapacity}
                  </td>
                  <td className="py-2.5 px-4">
                    {v.assignedDriverName ? (
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {v.assignedDriverName}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <UserX className="w-3 h-3" /> Not Allotted
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">{v.fitnessCertificateExpiryDate || 'N/A'}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.status === 'Available'
                          ? 'bg-emerald-100 text-emerald-800'
                          : v.status === 'On Trip'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {v.assignedDriverId ? (
                      <button
                        onClick={() => handleDeallocate(v.id)}
                        className="text-xs text-slate-500 hover:text-rose-600 font-semibold"
                        title="Deallocate Driver"
                      >
                        Deallocate
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setAllotVehicleId(v.id);
                          window.scrollTo({ top: 120, behavior: 'smooth' });
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                      >
                        Allot ➔
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* PURCHASES & WORKSHOP REPORTS SECTION (ON 2ND DASHBOARD) */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-extrabold text-slate-900">
                Purchases System &amp; Workshop Reports (Tyres, Parts, Diesel, Battery)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Expense reports: Weekly, Monthly, Between 2 dates, and Yearly for Tyres, Parts, Diesel, and Batteries
            </p>
          </div>

          {/* Period selector */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPurchasePeriod('WEEK')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                purchasePeriod === 'WEEK' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setPurchasePeriod('MONTH')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                purchasePeriod === 'MONTH' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPurchasePeriod('YEAR')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                purchasePeriod === 'YEAR' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Yearly
            </button>
            <button
              onClick={() => setPurchasePeriod('CUSTOM')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                purchasePeriod === 'CUSTOM' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Between 2 Dates
            </button>

            <button
              onClick={handlePrintPurchaseReport}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Print Report PDF
            </button>
          </div>
        </div>

        {/* Custom Date Filters */}
        {purchasePeriod === 'CUSTOM' && (
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <span className="font-bold text-slate-600">Start Date:</span>
            <input
              type="date"
              value={purchaseStartDate}
              onChange={(e) => setPurchaseStartDate(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded"
            />
            <span className="font-bold text-slate-600">End Date:</span>
            <input
              type="date"
              value={purchaseEndDate}
              onChange={(e) => setPurchaseEndDate(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-300 rounded"
            />
          </div>
        )}

        {/* 4 Purchase Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Purchase of Tyres */}
          <div
            onClick={() => setSelectedPurchaseCategory(selectedPurchaseCategory === 'Tyres' ? 'ALL' : 'Tyres')}
            className={`cursor-pointer p-4 rounded-xl border transition ${
              selectedPurchaseCategory === 'Tyres'
                ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Purchase of Tyres</span>
              <Disc className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-black text-slate-900">{formatCurrency(tyreTotal, currencySymbol)}</div>
            <div className="text-[10px] text-slate-500 mt-1">Radial &amp; tubeless truck tyres</div>
          </div>

          {/* Parts */}
          <div
            onClick={() => setSelectedPurchaseCategory(selectedPurchaseCategory === 'Parts' ? 'ALL' : 'Parts')}
            className={`cursor-pointer p-4 rounded-xl border transition ${
              selectedPurchaseCategory === 'Parts'
                ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Parts &amp; Spares</span>
              <Wrench className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-slate-900">{formatCurrency(partsTotal, currencySymbol)}</div>
            <div className="text-[10px] text-slate-500 mt-1">Brakes, filters, suspension</div>
          </div>

          {/* Diesel */}
          <div
            onClick={() => setSelectedPurchaseCategory(selectedPurchaseCategory === 'Diesel' ? 'ALL' : 'Diesel')}
            className={`cursor-pointer p-4 rounded-xl border transition ${
              selectedPurchaseCategory === 'Diesel'
                ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Diesel Purchases</span>
              <Fuel className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-black text-slate-900">{formatCurrency(dieselTotal, currencySymbol)}</div>
            <div className="text-[10px] text-slate-500 mt-1">Bulk fuel bowsers &amp; highway station</div>
          </div>

          {/* Batty (Battery) */}
          <div
            onClick={() => setSelectedPurchaseCategory(selectedPurchaseCategory === 'Battery' ? 'ALL' : 'Battery')}
            className={`cursor-pointer p-4 rounded-xl border transition ${
              selectedPurchaseCategory === 'Battery'
                ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Batty (Batteries)</span>
              <BatteryCharging className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-black text-slate-900">{formatCurrency(batteryTotal, currencySymbol)}</div>
            <div className="text-[10px] text-slate-500 mt-1">Heavy commercial 12V / 24V batteries</div>
          </div>
        </div>

        {/* Purchases Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Bill / Purchase #</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Item Details</th>
                  <th className="py-2 px-3">Vendor / Supplier</th>
                  <th className="py-2 px-3">Allocated Fleet</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">{p.purchaseNumber}</td>
                    <td className="py-2 px-3 text-slate-600">{p.date}</td>
                    <td className="py-2 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800">
                      {p.itemName} ({p.quantity} {p.unit})
                    </td>
                    <td className="py-2 px-3 text-slate-700 font-semibold">{p.supplierName}</td>
                    <td className="py-2 px-3 text-slate-600">{p.vehicleNumber || 'Terminal Bulk'}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(p.totalAmount, currencySymbol)}
                    </td>
                    <td className="py-2 px-3">
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
                  </tr>
                ))}
                {filteredPurchases.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      No purchases logged for this category or period.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-slate-600">
                    Grand Total ({purchasePeriod}):
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-slate-900 text-sm">
                    {formatCurrency(grandPurchaseTotal, currencySymbol)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
