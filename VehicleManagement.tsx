/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CarFront,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  DollarSign,
  TrendingUp,
  FileCheck,
  ChevronRight,
  X,
  Edit2,
  Calendar,
} from 'lucide-react';
import { Vehicle, Trip, Driver } from '../types';
import { formatCurrency } from '../services/accountingEngine';
import { dbService } from '../services/db';

interface VehicleManagementProps {
  vehicles: Vehicle[];
  trips: Trip[];
  drivers: Driver[];
  currency: string;
}

export const VehicleManagement: React.FC<VehicleManagementProps> = ({
  vehicles,
  trips,
  drivers,
  currency,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [ownershipFilter, setOwnershipFilter] = useState('All');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // Form states for Add/Edit
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState('40ft Container Trailer');
  const [sizeCapacity, setSizeCapacity] = useState('35 Metric Tons');
  const [makeModel, setMakeModel] = useState('');
  const [manufacturingYear, setManufacturingYear] = useState(2021);
  const [chassisNumber, setChassisNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [registrationExpiryDate, setRegistrationExpiryDate] = useState('2027-01-01');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('2027-01-01');
  const [fitnessCertificateExpiryDate, setFitnessCertificateExpiryDate] = useState('2026-12-01');
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [ownership, setOwnership] = useState<Vehicle['ownership']>('Owned');
  const [status, setStatus] = useState<Vehicle['status']>('Available');
  const [notes, setNotes] = useState('');

  const todayStr = new Date().toISOString().substring(0, 10);
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

  const filteredVehicles = vehicles.filter((v) => {
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    const matchesOwner = ownershipFilter === 'All' || v.ownership === ownershipFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      v.vehicleNumber.toLowerCase().includes(term) ||
      v.name.toLowerCase().includes(term) ||
      v.makeModel.toLowerCase().includes(term) ||
      v.vehicleType.toLowerCase().includes(term) ||
      (v.assignedDriverName && v.assignedDriverName.toLowerCase().includes(term));
    return matchesStatus && matchesOwner && matchesSearch;
  });

  const openCreateModal = () => {
    setEditingVehicleId(null);
    setVehicleNumber('');
    setRegistrationNumber(`REG-${Math.floor(1000 + Math.random() * 9000)}`);
    setName('');
    setVehicleType('40ft Container Trailer');
    setSizeCapacity('35 Metric Tons');
    setMakeModel('');
    setManufacturingYear(2022);
    setChassisNumber(`CHAS-${Math.floor(100000 + Math.random() * 900000)}`);
    setEngineNumber(`ENG-${Math.floor(100000 + Math.random() * 900000)}`);
    setRegistrationExpiryDate('2027-06-30');
    setInsuranceExpiryDate('2027-05-15');
    setFitnessCertificateExpiryDate('2027-04-10');
    setAssignedDriverId(drivers[0]?.id || '');
    setOwnership('Owned');
    setStatus('Available');
    setNotes('');
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicleId(v.id);
    setVehicleNumber(v.vehicleNumber);
    setRegistrationNumber(v.registrationNumber);
    setName(v.name);
    setVehicleType(v.vehicleType);
    setSizeCapacity(v.sizeCapacity);
    setMakeModel(v.makeModel);
    setManufacturingYear(v.manufacturingYear);
    setChassisNumber(v.chassisNumber);
    setEngineNumber(v.engineNumber);
    setRegistrationExpiryDate(v.registrationExpiryDate);
    setInsuranceExpiryDate(v.insuranceExpiryDate);
    setFitnessCertificateExpiryDate(v.fitnessCertificateExpiryDate);
    setAssignedDriverId(v.assignedDriverId || '');
    setOwnership(v.ownership);
    setStatus(v.status);
    setNotes(v.notes || '');
    setIsAddEditModalOpen(true);
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedDriver = drivers.find((d) => d.id === assignedDriverId);

    if (editingVehicleId) {
      dbService.updateVehicle(editingVehicleId, {
        vehicleNumber,
        registrationNumber,
        name,
        vehicleType,
        sizeCapacity,
        makeModel,
        manufacturingYear,
        chassisNumber,
        engineNumber,
        registrationExpiryDate,
        insuranceExpiryDate,
        fitnessCertificateExpiryDate,
        assignedDriverId: assignedDriverId || undefined,
        assignedDriverName: assignedDriver?.name,
        ownership,
        status,
        notes,
      });

      if (assignedDriverId) {
        dbService.allocateDriverToVehicle(editingVehicleId, assignedDriverId);
      } else {
        dbService.deallocateDriverFromVehicle(editingVehicleId);
      }
    } else {
      const newV = dbService.addVehicle({
        vehicleNumber,
        registrationNumber,
        name,
        vehicleType,
        sizeCapacity,
        makeModel,
        manufacturingYear,
        chassisNumber,
        engineNumber,
        registrationExpiryDate,
        insuranceExpiryDate,
        fitnessCertificateExpiryDate,
        assignedDriverId: assignedDriverId || undefined,
        assignedDriverName: assignedDriver?.name,
        ownership,
        status,
        notes,
      });

      if (assignedDriverId) {
        dbService.allocateDriverToVehicle(newV.id, assignedDriverId);
      }
    }

    setIsAddEditModalOpen(false);
  };

  // Compute vehicle profitability from trips
  const getVehicleFinancials = (vehNo: string) => {
    const vTrips = trips.filter((t) => t.vehicleNumber === vehNo && t.status !== 'Cancelled');
    let totalRevenue = 0;
    let totalDirectCosts = 0;
    let maintenanceCosts = 0;

    vTrips.forEach((t) => {
      totalRevenue += t.totalFreightAmount;
      totalDirectCosts += t.financials?.totalTripExpenses || 0;
      maintenanceCosts += t.financials?.vehicleRepairMaintenance || 0;
    });

    const netProfit = totalRevenue - totalDirectCosts;
    const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

    return {
      tripCount: vTrips.length,
      totalRevenue,
      totalDirectCosts,
      maintenanceCosts,
      netProfit,
      margin,
      trips: vTrips,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <CarFront className="w-6 h-6 text-blue-600" />
            <span>Vehicle Master &amp; Fleet Profitability</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Fleet tracking, compliance expiration monitoring, maintenance costs, and vehicle-level P&amp;L analysis.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Vehicle</span>
        </button>
      </div>

      {/* Fleet Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-slate-500 text-xs font-semibold uppercase">Total Fleet</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{vehicles.length}</div>
          <span className="text-[11px] text-slate-400">All prime movers &amp; trucks</span>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
          <span className="text-blue-700 text-xs font-semibold uppercase">Currently On Trip</span>
          <div className="text-2xl font-bold text-blue-900 mt-1">
            {vehicles.filter((v) => v.status === 'On Trip').length}
          </div>
          <span className="text-[11px] text-blue-600">Active transit consignments</span>
        </div>

        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <span className="text-emerald-700 text-xs font-semibold uppercase">Available in Yard</span>
          <div className="text-2xl font-bold text-emerald-900 mt-1">
            {vehicles.filter((v) => v.status === 'Available').length}
          </div>
          <span className="text-[11px] text-emerald-600">Ready for dispatch</span>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
          <span className="text-amber-700 text-xs font-semibold uppercase">Under Maintenance</span>
          <div className="text-2xl font-bold text-amber-900 mt-1">
            {vehicles.filter((v) => v.status === 'Under Maintenance').length}
          </div>
          <span className="text-[11px] text-amber-600">Workshop &amp; repairs</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Vehicle Plate, Make/Model, Type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Ownership:</span>
            <select
              value={ownershipFilter}
              onChange={(e) => setOwnershipFilter(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg font-medium"
            >
              <option value="All">All Ownership</option>
              <option value="Owned">Owned</option>
              <option value="Leased">Leased</option>
              <option value="Attached">Attached</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicle Grid & Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Plate &amp; Name</th>
                <th className="px-4 py-3.5">Type &amp; Capacity</th>
                <th className="px-4 py-3.5">Ownership</th>
                <th className="px-4 py-3.5">Assigned Driver</th>
                <th className="px-4 py-3.5">Certificates &amp; Expiries</th>
                <th className="px-4 py-3.5 text-right">Trips &amp; Revenue</th>
                <th className="px-4 py-3.5 text-right">Net Profit</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.map((v) => {
                const fin = getVehicleFinancials(v.vehicleNumber);
                const isFitnessExpiring = v.fitnessCertificateExpiryDate <= thirtyDaysLater;
                const isInsExpiring = v.insuranceExpiryDate <= thirtyDaysLater;

                return (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{v.vehicleNumber}</div>
                      <div className="text-[11px] text-slate-600 font-medium">{v.name}</div>
                      <div className="text-[10px] text-slate-400">{v.makeModel} ({v.manufacturingYear})</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800">{v.vehicleType}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{v.sizeCapacity}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {v.ownership}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {v.assignedDriverName ? (
                        <div className="font-medium text-slate-800">{v.assignedDriverName}</div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5 text-[10px]">
                        <div className={isFitnessExpiring ? 'text-rose-600 font-bold flex items-center' : 'text-slate-500'}>
                          Fitness: {v.fitnessCertificateExpiryDate}
                          {isFitnessExpiring && <AlertTriangle className="w-3 h-3 ml-1" />}
                        </div>
                        <div className={isInsExpiring ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                          Insurance: {v.insuranceExpiryDate}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="font-bold text-slate-900">{formatCurrency(fin.totalRevenue, currency)}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{fin.tripCount} consignments</div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="font-bold text-emerald-600">{formatCurrency(fin.netProfit, currency)}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{fin.margin}% margin</div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          v.status === 'Available'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : v.status === 'On Trip'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : v.status === 'Under Maintenance'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedVehicle(v)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                      >
                        History &amp; P&amp;L
                      </button>
                      <button
                        onClick={() => openEditModal(v)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                        title="Edit Vehicle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Vehicle Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 text-white p-5 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <CarFront className="w-5 h-5 text-blue-400" />
                <span>{editingVehicleId ? 'Edit Vehicle Master Record' : 'Add New Vehicle to Fleet'}</span>
              </h3>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Registration Plate # *</label>
                  <input
                    type="text"
                    placeholder="e.g. TLA-7842"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Vehicle Doc / Reg #</label>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Vehicle Nickname / Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Volvo FH460 Prime Mover"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Vehicle Body Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="40ft Container Trailer">40ft Container Trailer</option>
                    <option value="20ft Multi-Axle Trailer">20ft Multi-Axle Trailer</option>
                    <option value="Flatbed Tri-Axle Trailer">Flatbed Tri-Axle Trailer</option>
                    <option value="Covered Box Body">Covered Box Body</option>
                    <option value="Open High-Side Cargo Truck">Open High-Side Cargo Truck</option>
                    <option value="Tanker Semi-Trailer">Tanker Semi-Trailer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Capacity / Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 40 Metric Tons / 40ft HQ"
                    value={sizeCapacity}
                    onChange={(e) => setSizeCapacity(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Make &amp; Model (Year)</label>
                  <input
                    type="text"
                    placeholder="e.g. Volvo FH460 2021"
                    value={makeModel}
                    onChange={(e) => setMakeModel(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Chassis Number</label>
                  <input
                    type="text"
                    value={chassisNumber}
                    onChange={(e) => setChassisNumber(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Engine Number</label>
                  <input
                    type="text"
                    value={engineNumber}
                    onChange={(e) => setEngineNumber(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Driver</label>
                  <select
                    value={assignedDriverId}
                    onChange={(e) => setAssignedDriverId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="">-- No Driver Assigned --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.mobileNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Expiry Dates */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 block mb-2">Compliance Expiration Dates:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Road Registration Expiry</label>
                    <input
                      type="date"
                      value={registrationExpiryDate}
                      onChange={(e) => setRegistrationExpiryDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Insurance Expiry</label>
                    <input
                      type="date"
                      value={insuranceExpiryDate}
                      onChange={(e) => setInsuranceExpiryDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Fitness Certificate Expiry</label>
                    <input
                      type="date"
                      value={fitnessCertificateExpiryDate}
                      onChange={(e) => setFitnessCertificateExpiryDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ownership Type</label>
                  <select
                    value={ownership}
                    onChange={(e) => setOwnership(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Owned">Owned Fleet</option>
                    <option value="Market">Market Vehicle / Attached Spot</option>
                    <option value="Attached">Attached Contractor</option>
                    <option value="Leased">Leased Commercial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Initial Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-blue-700"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Technical Notes / GPS ID</label>
                <input
                  type="text"
                  placeholder="e.g. Dual fuel tanks 800L, GPS tracker installed, speed limiter configured"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Details & Trip History Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 text-white p-5 rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  Vehicle Performance: {selectedVehicle.vehicleNumber} ({selectedVehicle.name})
                </h3>
                <p className="text-xs text-slate-300">
                  {selectedVehicle.vehicleType} • Ownership: {selectedVehicle.ownership} • Status: {selectedVehicle.status}
                </p>
              </div>
              <button
                onClick={() => setSelectedVehicle(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              {/* Financial KPI Cards */}
              {(() => {
                const fin = getVehicleFinancials(selectedVehicle.vehicleNumber);
                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Total Trips Completed</span>
                        <div className="text-xl font-bold text-slate-900 mt-1">{fin.tripCount}</div>
                      </div>

                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                        <span className="text-blue-700 text-[10px] uppercase font-bold">Total Freight Revenue</span>
                        <div className="text-xl font-bold text-blue-900 mt-1">{formatCurrency(fin.totalRevenue, currency)}</div>
                      </div>

                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <span className="text-amber-700 text-[10px] uppercase font-bold">Direct Operating Costs</span>
                        <div className="text-xl font-bold text-amber-900 mt-1">{formatCurrency(fin.totalDirectCosts, currency)}</div>
                      </div>

                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="text-emerald-700 text-[10px] uppercase font-bold">Net Vehicle Profit</span>
                        <div className="text-xl font-bold text-emerald-900 mt-1">
                          {formatCurrency(fin.netProfit, currency)} ({fin.margin}%)
                        </div>
                      </div>
                    </div>

                    {/* Historical Consignments Table */}
                    <div>
                      <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs mb-3">
                        Consignment Trips Executed by {selectedVehicle.vehicleNumber}
                      </h4>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[10px]">
                            <tr>
                              <th className="px-3 py-2.5">Trip #</th>
                              <th className="px-3 py-2.5">Date</th>
                              <th className="px-3 py-2.5">Customer</th>
                              <th className="px-3 py-2.5">Route</th>
                              <th className="px-3 py-2.5 text-right">Revenue</th>
                              <th className="px-3 py-2.5 text-right">Profit</th>
                              <th className="px-3 py-2.5 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {fin.trips.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                                  No trips recorded yet for this vehicle.
                                </td>
                              </tr>
                            ) : (
                              fin.trips.map((t) => (
                                <tr key={t.id}>
                                  <td className="px-3 py-2 font-bold text-blue-700">{t.tripNumber}</td>
                                  <td className="px-3 py-2 text-slate-600">{t.tripDate}</td>
                                  <td className="px-3 py-2 font-medium text-slate-900">{t.customerCompanyName}</td>
                                  <td className="px-3 py-2 text-slate-600">
                                    {t.startingLocation} ➔ {t.destinationLocation}
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-slate-900">
                                    {formatCurrency(t.totalFreightAmount, currency)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-emerald-600">
                                    {formatCurrency(t.financials?.netTripProfit || 0, currency)}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                      {t.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setSelectedVehicle(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
