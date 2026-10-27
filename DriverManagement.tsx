/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  DollarSign,
  Phone,
  AlertTriangle,
  CheckCircle,
  Truck,
  Edit2,
  X,
  Calendar,
  Wallet,
} from 'lucide-react';
import { Driver, Trip, Vehicle } from '../types';
import { formatCurrency } from '../services/accountingEngine';
import { dbService } from '../services/db';

interface DriverManagementProps {
  drivers: Driver[];
  trips: Trip[];
  vehicles: Vehicle[];
  currency: string;
}

export const DriverManagement: React.FC<DriverManagementProps> = ({
  drivers,
  trips,
  vehicles,
  currency,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [selectedDriverForHistory, setSelectedDriverForHistory] = useState<Driver | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [nationalIdNumber, setNationalIdNumber] = useState('');
  const [drivingLicenceNumber, setDrivingLicenceNumber] = useState('');
  const [licenceExpiryDate, setLicenceExpiryDate] = useState('2027-01-01');
  const [dateOfJoining, setDateOfJoining] = useState(new Date().toISOString().substring(0, 10));
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [basicSalary, setBasicSalary] = useState<number>(40000);
  const [allowances, setAllowances] = useState<number>(10000);
  const [overtime, setOvertime] = useState<number>(3000);
  const [bonuses, setBonuses] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0);
  const [salaryAdvance, setSalaryAdvance] = useState<number>(5000);
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<Driver['employmentStatus']>('Active');
  const [remarks, setRemarks] = useState('');

  const todayStr = new Date().toISOString().substring(0, 10);
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

  const filteredDrivers = drivers.filter((d) => {
    const matchesStatus = statusFilter === 'All' || d.employmentStatus === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      d.name.toLowerCase().includes(term) ||
      d.mobileNumber.toLowerCase().includes(term) ||
      d.drivingLicenceNumber.toLowerCase().includes(term) ||
      d.nationalIdNumber.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const openCreateModal = () => {
    setEditingDriverId(null);
    setName('');
    setFatherName('');
    setNationalIdNumber('');
    setDrivingLicenceNumber(`HTV-${Math.floor(10000 + Math.random() * 90000)}`);
    setLicenceExpiryDate('2027-12-31');
    setDateOfJoining(new Date().toISOString().substring(0, 10));
    setMobileNumber('');
    setAddress('');
    setBasicSalary(42000);
    setAllowances(8000);
    setOvertime(2000);
    setBonuses(0);
    setDeductions(0);
    setSalaryAdvance(0);
    setAssignedVehicleId('');
    setEmploymentStatus('Active');
    setRemarks('');
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (d: Driver) => {
    setEditingDriverId(d.id);
    setName(d.name);
    setFatherName(d.fatherName);
    setNationalIdNumber(d.nationalIdNumber);
    setDrivingLicenceNumber(d.drivingLicenceNumber);
    setLicenceExpiryDate(d.licenceExpiryDate);
    setDateOfJoining(d.dateOfJoining);
    setMobileNumber(d.mobileNumber);
    setAddress(d.address);
    setBasicSalary(d.basicSalary);
    setAllowances(d.allowances);
    setOvertime(d.overtime);
    setBonuses(d.bonuses);
    setDeductions(d.deductions);
    setSalaryAdvance(d.salaryAdvance);
    setAssignedVehicleId(d.assignedVehicleId || '');
    setEmploymentStatus(d.employmentStatus);
    setRemarks(d.remarks || '');
    setIsAddEditModalOpen(true);
  };

  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    const veh = vehicles.find((v) => v.id === assignedVehicleId);

    if (editingDriverId) {
      dbService.updateDriver(editingDriverId, {
        name,
        fatherName,
        nationalIdNumber,
        drivingLicenceNumber,
        licenceExpiryDate,
        dateOfJoining,
        mobileNumber,
        address,
        basicSalary,
        allowances,
        overtime,
        bonuses,
        deductions,
        salaryAdvance,
        assignedVehicleId,
        assignedVehicleNumber: veh?.vehicleNumber,
        employmentStatus,
        remarks,
      });
    } else {
      dbService.addDriver({
        name,
        fatherName,
        nationalIdNumber,
        drivingLicenceNumber,
        licenceExpiryDate,
        dateOfJoining,
        mobileNumber,
        address,
        basicSalary,
        allowances,
        overtime,
        bonuses,
        deductions,
        salaryAdvance,
        netSalary: basicSalary + allowances + overtime + bonuses - deductions,
        assignedVehicleId,
        assignedVehicleNumber: veh?.vehicleNumber,
        employmentStatus,
        remarks,
      });
    }

    setIsAddEditModalOpen(false);
  };

  const getDriverStats = (driverName: string) => {
    const dTrips = trips.filter((t) => t.driverName === driverName && t.status !== 'Cancelled');
    let totalFreight = 0;
    let totalAllowances = 0;
    dTrips.forEach((t) => {
      totalFreight += t.totalFreightAmount;
      totalAllowances += t.financials?.driverAllowance || 0;
    });
    return {
      tripsCount: dTrips.length,
      totalFreight,
      totalAllowances,
      trips: dTrips,
    };
  };

  const calculatedNetSalary =
    (basicSalary || 0) + (allowances || 0) + (overtime || 0) + (bonuses || 0) - (deductions || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <UserCheck className="w-6 h-6 text-blue-600" />
            <span>Driver Master, Payroll &amp; Trip Allowance</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Heavy Transport Vehicle (HTV) licensing validation, trip history, advances, and payroll register.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Register Driver</span>
        </button>
      </div>

      {/* Driver List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Driver &amp; CNIC</th>
                <th className="px-4 py-3.5">Licence &amp; Expiry</th>
                <th className="px-4 py-3.5">Assigned Vehicle</th>
                <th className="px-4 py-3.5">Basic Salary</th>
                <th className="px-4 py-3.5">Allowances &amp; OT</th>
                <th className="px-4 py-3.5 text-right">Net Monthly Salary</th>
                <th className="px-4 py-3.5 text-right">Trip Count &amp; Allowances</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.map((d) => {
                const stats = getDriverStats(d.name);
                const isLicenceExpiring = d.licenceExpiryDate <= thirtyDaysLater;

                return (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{d.name}</div>
                      <div className="text-[11px] text-slate-600 font-medium">S/O {d.fatherName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{d.nationalIdNumber}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-slate-800">{d.drivingLicenceNumber}</div>
                      <div className={`text-[10px] ${isLicenceExpiring ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                        Exp: {d.licenceExpiryDate}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {d.assignedVehicleNumber ? (
                        <div className="font-bold text-blue-700">{d.assignedVehicleNumber}</div>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">
                      {formatCurrency(d.basicSalary, currency)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      <div>Allow: {formatCurrency(d.allowances, currency)}</div>
                      <div className="text-[10px] text-slate-500">OT: {formatCurrency(d.overtime, currency)}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="font-bold text-emerald-600 text-sm">
                        {formatCurrency(d.netSalary, currency)}
                      </div>
                      {d.salaryAdvance > 0 && (
                        <div className="text-[10px] text-amber-600 font-semibold">
                          Advance: {formatCurrency(d.salaryAdvance, currency)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="font-bold text-slate-800">{stats.tripsCount} trips</div>
                      <div className="text-[10px] text-blue-600 font-medium">
                        Earned: {formatCurrency(stats.totalAllowances, currency)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          d.employmentStatus === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {d.employmentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedDriverForHistory(d)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                      >
                        History
                      </button>
                      <button
                        onClick={() => openEditModal(d)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                        title="Edit Driver"
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

      {/* Add / Edit Driver Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 text-white p-5 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <span>{editingDriverId ? 'Edit Driver Profile & Payroll' : 'Register New Professional Driver'}</span>
              </h3>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Driver Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Muhammad Aslam"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Father's Name</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">National ID / CNIC # *</label>
                  <input
                    type="text"
                    placeholder="42201-1234567-1"
                    value={nationalIdNumber}
                    onChange={(e) => setNationalIdNumber(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Driving Licence # (HTV) *</label>
                  <input
                    type="text"
                    value={drivingLicenceNumber}
                    onChange={(e) => setDrivingLicenceNumber(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Licence Expiry Date *</label>
                  <input
                    type="date"
                    value={licenceExpiryDate}
                    onChange={(e) => setLicenceExpiryDate(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Vehicle</label>
                  <select
                    value={assignedVehicleId}
                    onChange={(e) => setAssignedVehicleId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">-- None --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNumber} ({v.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payroll Calculator Section */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block mb-3 text-xs uppercase tracking-wider">
                  Driver Monthly Compensation &amp; Payroll Formula:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Basic Salary</label>
                    <input
                      type="number"
                      min="0"
                      value={basicSalary}
                      onChange={(e) => setBasicSalary(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Allowances</label>
                    <input
                      type="number"
                      min="0"
                      value={allowances}
                      onChange={(e) => setAllowances(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Overtime</label>
                    <input
                      type="number"
                      min="0"
                      value={overtime}
                      onChange={(e) => setOvertime(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Bonuses</label>
                    <input
                      type="number"
                      min="0"
                      value={bonuses}
                      onChange={(e) => setBonuses(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Deductions</label>
                    <input
                      type="number"
                      min="0"
                      value={deductions}
                      onChange={(e) => setDeductions(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-rose-600 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Salary Advance</label>
                    <input
                      type="number"
                      min="0"
                      value={salaryAdvance}
                      onChange={(e) => setSalaryAdvance(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold text-amber-700"
                    />
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
                  <span className="text-slate-600">
                    Net Salary = Basic + Allowances + Overtime + Bonuses − Deductions
                  </span>
                  <div className="text-sm font-black text-emerald-700">
                    Calculated Net: {formatCurrency(calculatedNetSalary, currency)}
                  </div>
                </div>
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
                  Save Driver Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver History Modal */}
      {selectedDriverForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 text-white p-5 rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  Driver Trip Sheet: {selectedDriverForHistory.name}
                </h3>
                <p className="text-xs text-slate-300">
                  Licence: {selectedDriverForHistory.drivingLicenceNumber} • Contact: {selectedDriverForHistory.mobileNumber}
                </p>
              </div>
              <button
                onClick={() => setSelectedDriverForHistory(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {(() => {
                const stats = getDriverStats(selectedDriverForHistory.name);
                return (
                  <>
                    <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <div>
                        <div className="text-slate-500 text-[10px] uppercase font-bold">Total Trips</div>
                        <div className="text-lg font-bold text-slate-900 mt-0.5">{stats.tripsCount}</div>
                      </div>
                      <div>
                        <div className="text-blue-700 text-[10px] uppercase font-bold">Total Freight Hauled</div>
                        <div className="text-lg font-bold text-blue-900 mt-0.5">{formatCurrency(stats.totalFreight, currency)}</div>
                      </div>
                      <div>
                        <div className="text-emerald-700 text-[10px] uppercase font-bold">Allowances Earned</div>
                        <div className="text-lg font-bold text-emerald-900 mt-0.5">{formatCurrency(stats.totalAllowances, currency)}</div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px]">
                          <tr>
                            <th className="px-3 py-2.5">Trip #</th>
                            <th className="px-3 py-2.5">Date</th>
                            <th className="px-3 py-2.5">Vehicle</th>
                            <th className="px-3 py-2.5">Route</th>
                            <th className="px-3 py-2.5 text-right">Allowance Paid</th>
                            <th className="px-3 py-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {stats.trips.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                                No trips on record for this driver.
                              </td>
                            </tr>
                          ) : (
                            stats.trips.map((t) => (
                              <tr key={t.id}>
                                <td className="px-3 py-2 font-bold text-blue-700">{t.tripNumber}</td>
                                <td className="px-3 py-2 text-slate-600">{t.tripDate}</td>
                                <td className="px-3 py-2 font-medium text-slate-900">{t.vehicleNumber}</td>
                                <td className="px-3 py-2 text-slate-600">
                                  {t.startingLocation} ➔ {t.destinationLocation}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-slate-900">
                                  {formatCurrency(t.financials?.driverAllowance || 0, currency)}
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
                  </>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setSelectedDriverForHistory(null)}
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
