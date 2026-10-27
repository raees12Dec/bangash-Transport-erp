/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  DollarSign,
  Calendar,
  Building,
  Truck,
  Wallet,
} from 'lucide-react';
import { dbService } from '../services/db';
import { ExpenseCategory, Trip, Vehicle, Driver, BankAccount } from '../types';
import { formatCurrency } from '../services/accountingEngine';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  accounts: BankAccount[];
  currency: string;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({
  isOpen,
  onClose,
  categories,
  trips,
  vehicles,
  drivers,
  accounts,
  currency,
}) => {
  if (!isOpen) return null;

  const [voucherNumber, setVoucherNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [expenseName, setExpenseName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [selectedTripId, setSelectedTripId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [payee, setPayee] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Credit'>('Cash');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [amount, setAmount] = useState<number>(5000);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    const nextVch = dbService.generateNextVoucherNumber('VCH-2026-');
    setVoucherNumber(nextVch);
  }, []);

  const selectedCategory = categories.find((c) => c.id === categoryId) || categories[0];
  const isDirect = selectedCategory?.type === 'Direct Trip';

  const handleTripChange = (tripId: string) => {
    setSelectedTripId(tripId);
    const t = trips.find((item) => item.id === tripId);
    if (t) {
      setSelectedVehicleId(t.vehicleId);
      setSelectedDriverId(t.driverId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payee || !amount) {
      alert('Please fill mandatory fields (Payee, Amount).');
      return;
    }

    const trip = trips.find((t) => t.id === selectedTripId);
    const veh = vehicles.find((v) => v.id === selectedVehicleId);
    const drv = drivers.find((d) => d.id === selectedDriverId);

    dbService.addExpenseVoucher({
      voucherNumber,
      date,
      expenseName: expenseName.trim() || `${selectedCategory.name} - ${payee}`,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      type: selectedCategory.type,
      description: description || `${expenseName || selectedCategory.name} for ${payee}`,
      tripId: selectedTripId || undefined,
      tripNumber: trip?.tripNumber,
      vehicleId: selectedVehicleId || undefined,
      vehicleNumber: veh?.vehicleNumber,
      driverId: selectedDriverId || undefined,
      driverName: drv?.name,
      payee,
      paymentMethod,
      accountId,
      amount,
      referenceNumber,
      remarks,
      status: 'Posted',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 text-white p-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="font-bold text-base">Post Expense Voucher</h3>
              <p className="text-xs text-slate-300">
                Voucher #{voucherNumber} • Direct Trip cost or Operating overhead
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Voucher Number</label>
              <input
                type="text"
                value={voucherNumber}
                readOnly
                className="w-full p-2 bg-slate-100 border border-slate-300 rounded-lg font-bold text-blue-700"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Expense Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Expense Category *</label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  const selected = categories.find((c) => c.id === e.target.value);
                  if (selected && !expenseName) {
                    setExpenseName(selected.name);
                  }
                }}
                required
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Expense Name / Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Diesel Top-up at Sukkur Station, Motorway M-5 Toll Plazas, Driver Per Diem"
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900"
            />
            <span className="text-[10px] text-slate-400">Descriptive title of the expense item logged</span>
          </div>

          {/* Classification Banner */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              isDirect
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-indigo-50 border-indigo-200 text-indigo-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="font-bold">Accounting Classification:</span>
              <span className="font-semibold">{selectedCategory.type}</span>
            </div>
            <span className="text-[11px] text-slate-500">
              {isDirect
                ? 'Directly deducted from related Trip P&L'
                : 'Accounted under General Administrative Overhead'}
            </span>
          </div>

          {/* Direct Trip Linkage if applicable */}
          {isDirect && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="font-bold text-slate-700 block">Trip &amp; Vehicle Allocation:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Related Trip</label>
                  <select
                    value={selectedTripId}
                    onChange={(e) => handleTripChange(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- None / General Trip Cost --</option>
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tripNumber} ({t.customerCompanyName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Vehicle</label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Driver</label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Select Driver --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Payee / Vendor / Supplier *</label>
              <input
                type="text"
                placeholder="e.g. National Petroleum Fuel Station #42, Toll Plaza"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Expense Amount *</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg font-black text-rose-600 text-base"
              />
            </div>
          </div>

          {/* Payment Account */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg font-medium"
              >
                <option value="Cash">Cash in Hand</option>
                <option value="Bank">Bank Transfer / Cheque</option>
                <option value="Credit">Credit (Payable to Supplier)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">Deduct From Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-medium"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountName} (Balance: {formatCurrency(a.currentBalance, currency)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Receipt / Invoice Ref #</label>
              <input
                type="text"
                placeholder="e.g. DIESEL-SLIP-48201"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Voucher Description</label>
              <input
                type="text"
                placeholder="e.g. 200 Liters diesel filled on M-5 bypass"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-xs"
            >
              Post Expense Voucher
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
