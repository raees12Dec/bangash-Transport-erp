/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Receipt,
  CheckSquare,
  Square,
  Building,
  Calendar,
  DollarSign,
  Truck,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { dbService } from '../services/db';
import { Trip, Customer } from '../types';
import { formatCurrency } from '../services/accountingEngine';

interface NewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  customers: Customer[];
  currency: string;
}

export const NewInvoiceModal: React.FC<NewInvoiceModalProps> = ({
  isOpen,
  onClose,
  customers,
  currency,
}) => {
  if (!isOpen) return null;

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );
  const [taxRatePercent, setTaxRatePercent] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Initialize customer with one that has uninvoiced trips (e.g. cust-kohat)
  useEffect(() => {
    const uninvoiced = dbService.getUninvoicedTrips();
    if (uninvoiced.length > 0) {
      const kohatTrip = uninvoiced.find((t) => t.customerId === 'cust-kohat');
      if (kohatTrip) {
        setSelectedCustomerId('cust-kohat');
      } else {
        setSelectedCustomerId(uninvoiced[0].customerId);
      }
    } else if (customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers]);

  // Fetch only uninvoiced trips for the selected customer!
  const uninvoicedTrips = useMemo(() => {
    return dbService.getUninvoicedTrips(selectedCustomerId);
  }, [selectedCustomerId, isSubmitted]);

  // When customer changes, select all its uninvoiced trips by default
  useEffect(() => {
    setSelectedTripIds(uninvoicedTrips.map((t) => t.id));
  }, [selectedCustomerId, uninvoicedTrips.length]);

  const handleToggleTrip = (tripId: string) => {
    if (selectedTripIds.includes(tripId)) {
      setSelectedTripIds(selectedTripIds.filter((id) => id !== tripId));
    } else {
      setSelectedTripIds([...selectedTripIds, tripId]);
    }
  };

  const handleSelectAll = () => {
    setSelectedTripIds(uninvoicedTrips.map((t) => t.id));
  };

  const handleDeselectAll = () => {
    setSelectedTripIds([]);
  };

  // Calculations of selected trips
  const selectedTrips = useMemo(() => {
    return uninvoicedTrips.filter((t) => selectedTripIds.includes(t.id));
  }, [uninvoicedTrips, selectedTripIds]);

  const totalGrossFreight = selectedTrips.reduce((acc, t) => acc + (t.totalFreightAmount || 0), 0);
  const totalTaxAmount = (totalGrossFreight * (taxRatePercent || 0)) / 100;
  const totalAdvanceDeducted = selectedTrips.reduce((acc, t) => acc + (t.advanceReceived || 0), 0);
  const netInvoiceTotal = totalGrossFreight + totalTaxAmount;
  const remainingReceivable = Math.max(0, netInvoiceTotal - totalAdvanceDeducted);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTripIds.length === 0) {
      alert('Please select at least one uninvoiced trip to generate the invoice.');
      return;
    }

    try {
      const newInv = dbService.createInvoiceFromTrips({
        customerId: selectedCustomerId,
        tripIds: selectedTripIds,
        invoiceDate,
        dueDate,
        notes: notes || undefined,
        taxRatePercent,
      });

      setIsSubmitted(true);
      alert(
        `Freight Invoice #${newInv.invoiceNumber} successfully created for ${selectedCustomer?.companyName} bundling ${selectedTripIds.length} trips!\n\nThese trips are now marked as Invoiced and will not appear again for selection.`
      );
      onClose();
    } catch (err: any) {
      alert(`Error creating invoice: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Freight Tax Invoice Builder</h3>
                <span className="bg-blue-600 text-white text-[11px] font-black px-2 py-0.5 rounded uppercase">
                  Multi-Trip Selector
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Select uninvoiced trips with tick mark to bundle into official Freight Invoice (Screenshot Form)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Customer & Invoice Config Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Select Customer (Uninvoiced Trips Only)
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
              >
                {customers.map((c) => {
                  const count = dbService.getUninvoicedTrips(c.id).length;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({count} uninvoiced)
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Payment Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Sales Tax / GST (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(Number(e.target.value) || 0)}
                className="w-full font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Table Selection Header */}
        <div className="bg-white px-6 py-3 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-700 uppercase">
              Available Uninvoiced Trips ({uninvoicedTrips.length}):
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-blue-600 hover:text-blue-800 font-bold underline text-[11px]"
            >
              Select All
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-slate-500 hover:text-slate-700 font-medium text-[11px]"
            >
              Deselect All
            </button>
          </div>

          <div className="text-slate-500">
            Selected: <strong className="text-blue-600 font-extrabold">{selectedTripIds.length}</strong> of{' '}
            {uninvoicedTrips.length} trips
          </div>
        </div>

        {/* Table Matching Screenshot 1 */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center" title="Select this option to Include Trip Amount">
                      Tick
                    </th>
                    <th className="py-3 px-3">Trip No.</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Gr No.</th>
                    <th className="py-3 px-4 min-w-[200px]">Details (Route &amp; Vehicle)</th>
                    <th className="py-3 px-4 min-w-[260px]">Amount Details (Freight Rate, Gross, Tax)</th>
                    <th className="py-3 px-4 text-right">Net Amount ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {uninvoicedTrips.map((trip) => {
                    const isSelected = selectedTripIds.includes(trip.id);
                    const gross = trip.totalFreightAmount || 0;
                    const tax = (gross * (taxRatePercent || 0)) / 100;
                    const tot = gross + tax;

                    return (
                      <tr
                        key={trip.id}
                        onClick={() => handleToggleTrip(trip.id)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-blue-50/70 hover:bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Checkbox (Tick Mark) */}
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleTrip(trip.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                            title="Select this option to Include Trip Amount"
                          />
                        </td>

                        {/* Trip No */}
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {trip.tripNumber.replace('TRP-2026-000', '').replace('TRP-2026-00', '').replace('TRP-2026-0', '')}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{trip.tripDate}</td>

                        {/* Gr No */}
                        <td className="py-3 px-3 font-mono font-bold text-blue-700">{trip.bdNumber || 'N/A'}</td>

                        {/* Details (Route & Vehicle) */}
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900">
                            {trip.startingLocation} ➔ {trip.destinationLocation}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Vehicle: <strong className="text-slate-700">{trip.vehicleNumber}</strong> ({trip.vehicleType})
                          </div>
                        </td>

                        {/* Amount Details */}
                        <td className="py-3 px-4">
                          <div className="text-slate-800 font-semibold">
                            Charge: <span className="font-bold">Freight</span>
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Rate Details: <strong>{trip.goodsQuantity} {trip.quantityUnit} @ {trip.freightRate} / {trip.quantityUnit}</strong>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Gross: {formatCurrency(gross, currency)} | Tax: {formatCurrency(tax, currency)}
                          </div>
                        </td>

                        {/* Net Amount */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-black text-slate-900 text-sm">
                            {formatCurrency(tot, currency)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {uninvoicedTrips.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-60" />
                        <div className="font-bold text-slate-700">All trips for this customer are already invoiced!</div>
                        <p className="text-xs text-slate-500 mt-1">
                          No pending uninvoiced consignments found. You can switch to another customer above.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Summary & Submit */}
        <div className="bg-slate-900 text-white p-5 px-6 border-t border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Selected Consignments</span>
                <span className="text-white text-base font-extrabold">
                  {selectedTrips.length} Consignments
                </span>
              </div>
              <div className="h-6 w-px bg-slate-700" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Gross Freight Total</span>
                <span className="text-blue-400 text-base font-extrabold">
                  {formatCurrency(totalGrossFreight, currency)}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-700" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Sales Tax ({taxRatePercent}%)</span>
                <span className="text-slate-200 text-base font-extrabold">
                  + {formatCurrency(totalTaxAmount, currency)}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-700" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Net Total Invoice</span>
                <span className="text-emerald-400 text-lg font-black">
                  {formatCurrency(netInvoiceTotal, currency)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-700 text-slate-300 font-bold rounded-lg hover:bg-slate-800 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={selectedTripIds.length === 0}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-lg shadow-lg text-xs flex items-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                Generate &amp; Post Freight Invoice ({selectedTripIds.length} Trips)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
