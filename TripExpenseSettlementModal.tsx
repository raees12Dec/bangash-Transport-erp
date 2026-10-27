/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  DollarSign,
  Truck,
  User,
  MapPin,
  Calendar,
  FileText,
  Calculator,
} from 'lucide-react';
import { Trip, STANDARD_RETURN_EXPENSES } from '../types';
import { dbService } from '../services/db';
import { formatCurrency } from '../services/accountingEngine';

interface ExpenseRow {
  id: string;
  name: string;
  amount: number | '';
  note: string;
  paymentMethod: 'Cash' | 'Bank' | 'Payable' | 'Driver Advance';
  payee: string;
}

interface TripExpenseSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTripId?: string;
  currencySymbol: string;
}

export const TripExpenseSettlementModal: React.FC<TripExpenseSettlementModalProps> = ({
  isOpen,
  onClose,
  selectedTripId,
  currencySymbol,
}) => {
  const [pendingTrips, setPendingTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string>('');
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [selectedPresetExpense, setSelectedPresetExpense] = useState<string>(STANDARD_RETURN_EXPENSES[0]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = () => {
    const allTrips = dbService.getTrips();
    const pending = allTrips.filter((t) => t.expensesPending === true);
    setPendingTrips(pending);

    let targetId = selectedTripId;
    if (!targetId || !allTrips.some((t) => t.id === targetId)) {
      targetId = pending.length > 0 ? pending[0].id : allTrips[0]?.id || '';
    }
    setActiveTripId(targetId);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setIsSuccess(false);
    }
  }, [isOpen, selectedTripId]);

  const activeTrip = dbService.getTripById(activeTripId);

  useEffect(() => {
    if (activeTrip) {
      if (activeTrip.tripExpenseItems && activeTrip.tripExpenseItems.length > 0) {
        setExpenseRows(
          activeTrip.tripExpenseItems.map((item, idx) => ({
            id: item.id || `row-${idx}`,
            name: item.name || item.category || STANDARD_RETURN_EXPENSES[0],
            amount: item.amount,
            note: item.note || item.notes || '',
            paymentMethod: item.paymentMethod || 'Cash',
            payee: item.payee || activeTrip.driverName || 'Driver / Route Vendor',
          }))
        );
      } else {
        // Start with the primary top expenses for quick fill
        setExpenseRows([
          { id: '1', name: 'Toll Tax', amount: '', note: 'Motorway / Highway Plazas', paymentMethod: 'Cash', payee: 'Toll Plaza' },
          { id: '2', name: 'Oil Lubricant Expense', amount: '', note: 'Engine top-up on route', paymentMethod: 'Cash', payee: 'Fuel Station' },
          { id: '3', name: 'Gate Passes', amount: '', note: 'Terminal entry & clearance', paymentMethod: 'Cash', payee: 'Terminal Gate' },
          { id: '4', name: 'Fooding Expenses', amount: '', note: 'Driver food allowance', paymentMethod: 'Cash', payee: activeTrip.driverName || 'Driver' },
          { id: '5', name: 'Police Expenses', amount: '', note: 'Route check-post / municipality', paymentMethod: 'Cash', payee: 'Check Post' },
        ]);
      }
    }
  }, [activeTripId]);

  if (!isOpen) return null;

  const handleAddExpenseRow = (expenseName?: string) => {
    const nameToAdd = expenseName || selectedPresetExpense;
    setExpenseRows([
      ...expenseRows,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: nameToAdd,
        amount: '',
        note: '',
        paymentMethod: 'Cash',
        payee: activeTrip?.driverName || 'Driver',
      },
    ]);
  };

  const handleLoadAll18Categories = () => {
    const rows: ExpenseRow[] = STANDARD_RETURN_EXPENSES.map((name, idx) => ({
      id: `all-18-${idx}`,
      name,
      amount: '',
      note: '',
      paymentMethod: 'Cash',
      payee: activeTrip?.driverName || 'Driver',
    }));
    setExpenseRows(rows);
  };

  const handleRemoveRow = (id: string) => {
    setExpenseRows(expenseRows.filter((r) => r.id !== id));
  };

  const handleRowChange = (id: string, field: keyof ExpenseRow, val: any) => {
    setExpenseRows(
      expenseRows.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const totalExpenseSum = expenseRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const grossFreight = activeTrip?.totalFreightAmount || 0;
  const projectedProfit = grossFreight - totalExpenseSum;
  const profitMargin = grossFreight > 0 ? (projectedProfit / grossFreight) * 100 : 0;

  const handleSaveAndSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;

    try {
      dbService.settleTripExpenses(
        activeTrip.id,
        expenseRows.map((r) => ({
          name: r.name,
          amount: Number(r.amount) || 0,
          note: r.note,
          paymentMethod: r.paymentMethod,
          payee: r.payee,
        }))
      );

      setIsSuccess(true);
      setSuccessMessage(
        `Expenses for Trip #${activeTrip.tripNumber} (GR #${activeTrip.bdNumber}) have been successfully settled! Net Profit: ${formatCurrency(
          projectedProfit,
          currencySymbol
        )}`
      );

      loadData();
    } catch (err: any) {
      alert(`Error settling expenses: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Trip Return Route Expenses Settlement</h2>
                <span className="bg-amber-500 text-slate-950 text-xs font-black px-2 py-0.5 rounded-full uppercase">
                  {pendingTrips.length} Pending Approval
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Confirm vehicle arrival, final route expenses from receipts/driver slip, and finalize trip net profit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Success Alert */}
        {isSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-4 px-6 flex items-center justify-between">
            <div className="flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div className="text-sm font-semibold">{successMessage}</div>
            </div>
            <button
              onClick={() => setIsSuccess(false)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Trip Selector Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Trip Pending Expenses
                </label>
                <select
                  value={activeTripId}
                  onChange={(e) => setActiveTripId(e.target.value)}
                  className="w-full md:w-96 text-sm font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
                >
                  {pendingTrips.length > 0 && (
                    <optgroup label="⚠️ Returned Vehicles (Pending Expenses)">
                      {pendingTrips.map((t) => (
                        <option key={t.id} value={t.id}>
                          Trip #{t.tripNumber} (GR: {t.bdNumber}) - {t.vehicleNumber} ({t.customerCompanyName})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="All Other Delivered / Transit Trips">
                    {dbService
                      .getTrips()
                      .filter((t) => !t.expensesPending)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          Trip #{t.tripNumber} (GR: {t.bdNumber}) - {t.vehicleNumber} ({t.status})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {activeTrip && (
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200">
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Gross Freight</span>
                    <div className="text-base font-extrabold text-blue-600">
                      {formatCurrency(activeTrip.totalFreightAmount, currencySymbol)}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Status</span>
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          activeTrip.expensesPending
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {activeTrip.expensesPending ? 'Pending Expenses' : activeTrip.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Trip Details Card */}
            {activeTrip && (
              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <div className="font-bold text-slate-900 truncate">{activeTrip.customerCompanyName}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Route:</span>
                  <div className="font-bold text-slate-900">
                    {activeTrip.startingLocation} ➔ {activeTrip.destinationLocation}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Vehicle &amp; Driver:</span>
                  <div className="font-bold text-slate-900">
                    {activeTrip.vehicleNumber} ({activeTrip.driverName})
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Consignment Weight:</span>
                  <div className="font-bold text-slate-900">
                    {activeTrip.goodsQuantity} {activeTrip.quantityUnit} @ {formatCurrency(activeTrip.freightRate, currencySymbol)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSaveAndSettle} className="space-y-4">
            {/* Quick Actions Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-100 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase">Add From 18 Standard Categories:</span>
                <select
                  value={selectedPresetExpense}
                  onChange={(e) => setSelectedPresetExpense(e.target.value)}
                  className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded shadow-sm"
                >
                  {STANDARD_RETURN_EXPENSES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleAddExpenseRow()}
                  className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadAll18Categories}
                  className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded shadow-sm"
                  title="Prefills all 18 standard return expenses from screenshot"
                >
                  ⚡ Populate All 18 Return Categories
                </button>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">#</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Expense Name (18 Standard Items)</th>
                      <th className="py-2.5 px-3 w-36 text-right">Amount ({currencySymbol})</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Note / Location / Voucher Ref</th>
                      <th className="py-2.5 px-3 w-32">Payment Mode</th>
                      <th className="py-2.5 px-3 w-36">Payee / Driver</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {expenseRows.map((row, index) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">{index + 1}</td>
                        <td className="py-2 px-3">
                          <select
                            value={row.name}
                            onChange={(e) => handleRowChange(row.id, 'name', e.target.value)}
                            className="w-full text-xs font-medium px-2 py-1.5 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-blue-500"
                          >
                            {STANDARD_RETURN_EXPENSES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                            {!STANDARD_RETURN_EXPENSES.includes(row.name as any) && (
                              <option value={row.name}>{row.name}</option>
                            )}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={row.amount}
                            onChange={(e) => handleRowChange(row.id, 'amount', e.target.value)}
                            className="w-full text-xs font-bold text-right px-2 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="e.g. Kohat Pass Plaza slip, Sukkur checkpost"
                            value={row.note}
                            onChange={(e) => handleRowChange(row.id, 'note', e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={row.paymentMethod}
                            onChange={(e) => handleRowChange(row.id, 'paymentMethod', e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded bg-white"
                          >
                            <option value="Cash">Cash (Safe)</option>
                            <option value="Bank">Bank Online</option>
                            <option value="Driver Advance">Driver Advance</option>
                            <option value="Payable">Supplier Credit</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.payee}
                            onChange={(e) => handleRowChange(row.id, 'payee', e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded bg-white"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {expenseRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No expenses added yet. Click &quot;Add&quot; above to select from the 18 return categories.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations & Net Profit Summary Card */}
            <div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Freight Recognized</div>
                  <div className="text-xl font-extrabold text-white mt-1">
                    {formatCurrency(grossFreight, currencySymbol)}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Total Route Expenses</div>
                  <div className="text-xl font-extrabold text-amber-400 mt-1">
                    - {formatCurrency(totalExpenseSum, currencySymbol)}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Trip Profit / (Loss)</div>
                  <div
                    className={`text-xl font-extrabold mt-1 ${
                      projectedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatCurrency(projectedProfit, currencySymbol)}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Profit Margin</div>
                  <div className="text-xl font-extrabold text-blue-400 mt-1">
                    {profitMargin.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-500">
                * Saving will automatically update the trip status to <strong>Completed</strong>, log direct vouchers, and clear the pending alert.
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100 text-xs"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!activeTrip}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-md text-xs flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save &amp; Settle Trip Expenses
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
