/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  DollarSign,
  Calculator,
  Calendar,
  MapPin,
  FileText,
  User,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { dbService } from '../services/db';
import { Customer, Vehicle, Driver, Trip, TripStatus, TripExpenseItem } from '../types';
import { formatCurrency } from '../services/accountingEngine';

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  vehicles: Vehicle[];
  drivers: Driver[];
  currency: string;
}

export const NewTripModal: React.FC<NewTripModalProps> = ({
  isOpen,
  onClose,
  customers,
  vehicles,
  drivers,
  currency,
}) => {
  if (!isOpen) return null;

  const [tripNumber, setTripNumber] = useState('');
  const [tripDate, setTripDate] = useState(new Date().toISOString().substring(0, 10));
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerInvoiceNo, setCustomerInvoiceNo] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleSize, setVehicleSize] = useState('');
  const [driverId, setDriverId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverIdNumber, setDriverIdNumber] = useState('');
  const [driverContactNumber, setDriverContactNumber] = useState('');
  const [bdNumber, setBdNumber] = useState('');
  const [startingLocation, setStartingLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [additionalLocations, setAdditionalLocations] = useState('');
  const [startingDateTime, setStartingDateTime] = useState(
    new Date().toISOString().substring(0, 16).replace('T', ' ')
  );
  const [expectedDeliveryDateTime, setExpectedDeliveryDateTime] = useState('');
  const [goodsDescription, setGoodsDescription] = useState('');
  const [goodsQuantity, setGoodsQuantity] = useState<number>(20);
  const [quantityUnit, setQuantityUnit] = useState('Metric Tons');
  const [freightRate, setFreightRate] = useState<number>(6500);
  const [rateType, setRateType] = useState<'Per Unit' | 'Fixed Lump Sum'>('Per Unit');
  const [advanceReceived, setAdvanceReceived] = useState<number>(50000);
  const [status, setStatus] = useState<TripStatus>('Planned');
  const [remarks, setRemarks] = useState('');

  // Standard categories for Trip Expenses
  const standardExpenseCategories = [
    'Fuel / Diesel',
    'Toll & Highway Tax',
    'Driver Trip Allowance (Kharcha)',
    'Loading Labor Charges',
    'Offloading / Unloading Charges',
    'Vehicle Repair & Maintenance',
    'Police & Border Permits',
    'Parking & Weighbridge',
    'Food & Night Accommodation',
    'Miscellaneous Route Expenses',
  ];

  // Dynamic 5 to 10 Itemized Expenses
  const [expenseItems, setExpenseItems] = useState<TripExpenseItem[]>([
    { id: 'exp-1', category: 'Fuel / Diesel', name: 'Diesel Top-up (Highway Station)', amount: 45000, liters: 175, fuelLiters: 175, fuelRatePerLiter: 260, paymentMethod: 'Bank', payee: 'National Petroleum' },
    { id: 'exp-2', category: 'Toll & Highway Tax', name: 'Motorway M-9 / M-5 Plazas Toll', amount: 9000, paymentMethod: 'Cash', payee: 'NHA One-Network' },
    { id: 'exp-3', category: 'Driver Trip Allowance (Kharcha)', name: 'Driver Route Allowance & Food', amount: 8000, paymentMethod: 'Cash', payee: 'Assigned Driver' },
    { id: 'exp-4', category: 'Loading Labor Charges', name: 'Loading Labor & Crane Offloading', amount: 4000, paymentMethod: 'Cash', payee: 'Pickup Yard Labor' },
    { id: 'exp-5', category: 'Offloading / Unloading Charges', name: 'Consignee Offloading Charges', amount: 3500, paymentMethod: 'Cash', payee: 'Destination Labor' },
  ]);

  const [driverPocketAdvance, setDriverPocketAdvance] = useState<number>(10000);
  const [deferExpenses, setDeferExpenses] = useState<boolean>(true);

  const handleAddExpenseItem = () => {
    if (expenseItems.length >= 10) {
      alert('Maximum 10 itemized expenses allowed per trip.');
      return;
    }
    const nextCat = standardExpenseCategories[expenseItems.length] || 'Miscellaneous Route Expenses';
    setExpenseItems([
      ...expenseItems,
      {
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        category: nextCat,
        name: nextCat === 'Fuel / Diesel' ? 'Diesel Fueling' : nextCat,
        amount: nextCat === 'Fuel / Diesel' ? 52000 : 2000,
        liters: nextCat === 'Fuel / Diesel' ? 200 : undefined,
        fuelLiters: nextCat === 'Fuel / Diesel' ? 200 : undefined,
        fuelRatePerLiter: nextCat === 'Fuel / Diesel' ? 260 : undefined,
        paymentMethod: 'Cash',
        payee: '',
      },
    ]);
  };

  const handleRemoveExpenseItem = (id: string) => {
    if (expenseItems.length <= 1) {
      alert('Keep at least 1 expense item.');
      return;
    }
    setExpenseItems(expenseItems.filter((e) => e.id !== id));
  };

  const handleUpdateExpenseItem = (id: string, field: keyof TripExpenseItem, value: any) => {
    setExpenseItems(
      expenseItems.map((e) => {
        if (e.id === id) {
          const current = { ...e };
          if (field === 'name') {
            current.name = value;
            current.expenseName = value;
          } else if (field === 'liters') {
            const ltrs = parseFloat(value) || 0;
            current.liters = ltrs;
            current.fuelLiters = ltrs;
            const rate = current.fuelRatePerLiter || 260;
            if (ltrs > 0 && rate > 0) {
              current.amount = Math.round(ltrs * rate);
            }
          } else if (field === 'fuelRatePerLiter') {
            const rate = parseFloat(value) || 0;
            current.fuelRatePerLiter = rate;
            const ltrs = current.liters || current.fuelLiters || 0;
            if (ltrs > 0 && rate > 0) {
              current.amount = Math.round(ltrs * rate);
            }
          } else if (field === 'amount') {
            const amt = parseFloat(value) || 0;
            current.amount = amt;
            const isFuel = current.category?.toLowerCase().includes('fuel') || current.name?.toLowerCase().includes('diesel');
            const rate = current.fuelRatePerLiter || 260;
            if (isFuel && rate > 0 && (!current.liters || current.liters === 0)) {
              current.liters = Math.round(amt / rate);
              current.fuelLiters = current.liters;
            }
          } else {
            (current as any)[field] = value;
          }
          return current;
        }
        return e;
      })
    );
  };

  // Initialize defaults
  useEffect(() => {
    const nextTripNo = dbService.generateNextTripNumber();
    setTripNumber(nextTripNo);
    setBdNumber(`BL-${Math.floor(100000 + Math.random() * 900000)}`);

    if (customers.length > 0) {
      handleCustomerChange(customers[0].id);
    }
    if (vehicles.length > 0) {
      handleVehicleChange(vehicles[0].id);
    }
  }, [customers, vehicles]);

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const c = customers.find((cust) => cust.id === id);
    if (c) {
      setCustomerName(c.companyName);
      if (c.pickupAddress) setStartingLocation(c.pickupAddress);
      if (c.deliveryAddress) setDestinationLocation(c.deliveryAddress);
    }
  };

  const handleVehicleChange = (id: string) => {
    setVehicleId(id);
    const v = vehicles.find((veh) => veh.id === id);
    if (v) {
      setVehicleNumber(v.vehicleNumber);
      setVehicleType(v.vehicleType);
      setVehicleSize(v.sizeCapacity);
      // Auto-assign driver from vehicle allocation or matching driver
      if (v.assignedDriverId) {
        handleDriverChange(v.assignedDriverId);
      } else {
        const matchingDriver = drivers.find((d) => d.assignedVehicleId === v.id);
        if (matchingDriver) {
          handleDriverChange(matchingDriver.id);
        } else if (drivers.length > 0) {
          handleDriverChange(drivers[0].id);
        }
      }
    }
  };

  const handleDriverChange = (id: string) => {
    setDriverId(id);
    const d = drivers.find((drv) => drv.id === id);
    if (d) {
      setDriverName(d.name);
      setDriverIdNumber(d.nationalIdNumber);
      setDriverContactNumber(d.mobileNumber);
    }
  };

  // Calculations
  const grossFreight =
    rateType === 'Per Unit' ? (goodsQuantity || 0) * (freightRate || 0) : freightRate || 0;
  const outstandingFreight = Math.max(0, grossFreight - (advanceReceived || 0));

  const totalDirectExpenses = expenseItems.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  const netTripProfit = grossFreight - totalDirectExpenses;
  const profitMarginPercent =
    grossFreight > 0 ? Number(((netTripProfit / grossFreight) * 100).toFixed(2)) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !vehicleNumber || !driverName || !goodsDescription) {
      alert('Please fill all mandatory fields (Customer, Vehicle, Driver, Goods Description).');
      return;
    }

    dbService.addTrip({
      tripNumber,
      tripDate,
      customerId,
      customerCompanyName: customerName,
      customerInvoiceNumber: customerInvoiceNo,
      vehicleId,
      vehicleNumber,
      vehicleType,
      vehicleSize,
      driverId,
      driverName,
      driverIdNumber,
      driverContactNumber,
      bdNumber,
      startingLocation,
      destinationLocation,
      additionalLocations,
      startingDateTime,
      expectedDeliveryDateTime:
        expectedDeliveryDateTime ||
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16).replace('T', ' '),
      goodsDescription,
      goodsQuantity,
      quantityUnit,
      freightRate,
      rateType,
      totalFreightAmount: grossFreight,
      advanceReceived,
      outstandingFreightAmount: outstandingFreight,
      status,
      expensesPending: deferExpenses ? true : false,
      tripExpenseItems: deferExpenses ? [] : expenseItems,
      financials: deferExpenses
        ? {
            grossFreightRevenue: grossFreight,
            loadingCharges: 0,
            unloadingCharges: 0,
            fuelExpenses: 0,
            driverAllowance: 0,
            tollTaxes: 0,
            roadTaxes: 0,
            vehicleRepairMaintenance: 0,
            parkingCharges: 0,
            foodAccommodation: 0,
            routeOtherExpenses: 0,
            advancePaidToDriver: driverPocketAdvance,
            otherDirectCosts: 0,
            totalTripExpenses: 0,
            netTripProfit: grossFreight,
            profitMarginPercentage: 100,
          }
        : {
            grossFreightRevenue: grossFreight,
            loadingCharges: expenseItems
              .filter((e) => e.category.toLowerCase().includes('loading') && !e.category.toLowerCase().includes('unloading'))
              .reduce((s, i) => s + (Number(i.amount) || 0), 0),
            unloadingCharges: expenseItems
              .filter((e) => e.category.toLowerCase().includes('unloading') || e.category.toLowerCase().includes('offload'))
              .reduce((s, i) => s + (Number(i.amount) || 0), 0),
            fuelExpenses: expenseItems
              .filter((e) => e.category.toLowerCase().includes('fuel') || e.category.toLowerCase().includes('diesel'))
              .reduce((s, i) => s + (Number(i.amount) || 0), 0),
            driverAllowance: expenseItems
              .filter((e) => e.category.toLowerCase().includes('allowance') || e.category.toLowerCase().includes('kharcha'))
              .reduce((s, i) => s + (Number(i.amount) || 0), 0),
            tollTaxes: expenseItems
              .filter((e) => e.category.toLowerCase().includes('toll'))
              .reduce((s, i) => s + (Number(i.amount) || 0), 0),
            roadTaxes: expenseItems
              .filter((e) => e.category.toLowerCase().includes('road') || e.category.toLowerCase().includes('permit') || e.category.toLowerCase().includes('police'))
              .reduce((s, i) => s + (Number(i.amount) || 0), 0),
            vehicleRepairMaintenance: expenseItems
              .filter((e) => e.category.toLowerCase().includes('repair') || e.category.toLowerCase().includes('maint'))
              .reduce((s, i) => s + (Number(i.amount) || 0), 0),
            parkingCharges: expenseItems
              .filter((e) => e.category.toLowerCase().includes('parking') || e.category.toLowerCase().includes('weigh'))
              .reduce((s, i) => s + (Number(i.amount) || 0), 0),
            foodAccommodation: expenseItems
              .filter((e) => e.category.toLowerCase().includes('food') || e.category.toLowerCase().includes('stay'))
              .reduce((s, i) => s + (Number(i.amount) || 0), 0),
            routeOtherExpenses: 0,
            advancePaidToDriver: driverPocketAdvance,
            otherDirectCosts: expenseItems
              .filter((e) => e.category.toLowerCase().includes('misc') || e.category.toLowerCase().includes('other'))
              .reduce((s, i) => s + (Number(i.amount) || 0), 0),
            totalTripExpenses: totalDirectExpenses,
            netTripProfit,
            profitMarginPercentage: profitMarginPercent,
          },
      remarks,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 text-white p-5 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <Truck className="w-6 h-6 text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-white">Create New Consignment Trip &amp; Bilty</h3>
              <p className="text-xs text-slate-300">
                Auto-assigned Trip #{tripNumber} • Automatic POD &amp; Double-entry financial synchronization
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
          {/* Section 1: Trip & Consignment Info */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center">
              <FileText className="w-4 h-4 text-blue-600 mr-1.5" /> 1. Trip Identification &amp; Parties
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Trip Number (Auto)</label>
                <input
                  type="text"
                  value={tripNumber}
                  readOnly
                  className="w-full p-2 bg-slate-100 border border-slate-300 rounded-lg font-bold text-blue-700"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Trip Date *</label>
                <input
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Bilty / BD Number *</label>
                <input
                  type="text"
                  value={bdNumber}
                  onChange={(e) => setBdNumber(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Customer Order / PO #</label>
                <input
                  type="text"
                  placeholder="e.g. PO-99418"
                  value={customerInvoiceNo}
                  onChange={(e) => setCustomerInvoiceNo(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="sm:col-span-1">
                <label className="block text-slate-700 font-semibold mb-1">Customer Company *</label>
                <select
                  value={customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned Vehicle *</label>
                <select
                  value={vehicleId}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleNumber} ({v.name} - {v.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Driver In-Charge *</label>
                <select
                  value={driverId}
                  onChange={(e) => handleDriverChange(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.mobileNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Locations & Cargo */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center">
              <MapPin className="w-4 h-4 text-emerald-600 mr-1.5" /> 2. Route &amp; Cargo Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Starting Location (Origin) *</label>
                <input
                  type="text"
                  placeholder="e.g. Port Qasim Terminal Gate 2, Karachi"
                  value={startingLocation}
                  onChange={(e) => setStartingLocation(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Destination Location *</label>
                <input
                  type="text"
                  placeholder="e.g. Sundar Industrial Estate, Lahore"
                  value={destinationLocation}
                  onChange={(e) => setDestinationLocation(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Additional Transit Stops</label>
                <input
                  type="text"
                  placeholder="e.g. Hyderabad Toll, Sukkur Bypass"
                  value={additionalLocations}
                  onChange={(e) => setAdditionalLocations(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Goods Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Industrial Machinery, 40ft Container, Cement Bags"
                  value={goodsDescription}
                  onChange={(e) => setGoodsDescription(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Quantity *</label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={goodsQuantity}
                  onChange={(e) => setGoodsQuantity(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Unit of Measurement</label>
                <select
                  value={quantityUnit}
                  onChange={(e) => setQuantityUnit(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  <option value="Metric Tons">Metric Tons</option>
                  <option value="Bags">Bags</option>
                  <option value="Packages">Packages</option>
                  <option value="CBM">CBM (Cubic Meters)</option>
                  <option value="Pallets">Pallets</option>
                  <option value="Liters">Liters</option>
                  <option value="Kilograms">Kilograms (Kg)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Revenue & Direct Trip Cost Estimates */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center">
              <DollarSign className="w-4 h-4 text-emerald-600 mr-1.5" /> 3. Freight Pricing &amp; Direct Trip Costs
            </h4>

            {/* Freight Rate Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-3 bg-blue-50/60 rounded-xl border border-blue-200 mb-4">
              <div>
                <label className="block text-blue-900 font-semibold mb-1">Rate Basis</label>
                <select
                  value={rateType}
                  onChange={(e) => setRateType(e.target.value as any)}
                  className="w-full p-2 border border-blue-300 rounded-lg bg-white"
                >
                  <option value="Per Unit">Per Unit Rate</option>
                  <option value="Fixed Lump Sum">Fixed Lump Sum</option>
                </select>
              </div>

              <div>
                <label className="block text-blue-900 font-semibold mb-1">
                  Freight Rate ({rateType === 'Per Unit' ? `per ${quantityUnit}` : 'Fixed'})
                </label>
                <input
                  type="number"
                  min="0"
                  value={freightRate}
                  onChange={(e) => setFreightRate(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-blue-300 rounded-lg bg-white font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-blue-900 font-semibold mb-1">Gross Freight Revenue</label>
                <div className="w-full p-2 bg-blue-100/80 border border-blue-300 rounded-lg font-bold text-blue-800 text-sm">
                  {formatCurrency(grossFreight, currency)}
                </div>
              </div>

              <div>
                <label className="block text-blue-900 font-semibold mb-1">Customer Advance Received</label>
                <input
                  type="number"
                  min="0"
                  value={advanceReceived}
                  onChange={(e) => setAdvanceReceived(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-blue-300 rounded-lg bg-white font-semibold text-emerald-700"
                />
              </div>
            </div>

            {/* Defer Expenses to Return Banner */}
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-start sm:items-center gap-3">
                <input
                  type="checkbox"
                  id="deferExpensesCheck"
                  checked={deferExpenses}
                  onChange={(e) => setDeferExpenses(e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600 border-amber-400 focus:ring-blue-500 cursor-pointer mt-0.5 sm:mt-0"
                />
                <div>
                  <label htmlFor="deferExpensesCheck" className="font-extrabold text-amber-950 text-xs cursor-pointer flex items-center gap-1.5">
                    🌟 Do not add expenses now (Vehicle Return Expense Mode)
                  </label>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Expenses will be confirmed when the vehicle returns from trip. It will show a popup &quot;Pending to Add Expenses&quot; to pick from the 18 return categories.
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded text-[11px] font-black uppercase tracking-wider ${deferExpenses ? 'bg-amber-200 text-amber-900 border border-amber-300' : 'bg-slate-200 text-slate-700'}`}>
                {deferExpenses ? 'Return Settlement Mode' : 'Upfront Entry'}
              </span>
            </div>

            {/* Direct Expense Inputs - only if upfront entry selected */}
            {!deferExpenses ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200 pb-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Itemized Direct Trip Expenses ({expenseItems.length} of 10 Options)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Add 5 to 10 expense items. Select a standard category or type a custom manual expense title.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddExpenseItem}
                  disabled={expenseItems.length >= 10}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    expenseItems.length >= 10
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Expense Item ({expenseItems.length}/10)</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5 w-8">#</th>
                      <th className="px-3 py-2.5 w-40">Expense Category</th>
                      <th className="px-3 py-2.5">Expense Name / Title (Manual Edit)</th>
                      <th className="px-3 py-2.5 w-24">Diesel Liters</th>
                      <th className="px-3 py-2.5 w-20">Rate/L</th>
                      <th className="px-3 py-2.5 w-28 text-right">Amount ({currency})</th>
                      <th className="px-3 py-2.5 w-32">Payment Method</th>
                      <th className="px-3 py-2.5 w-36">Payee / Vendor</th>
                      <th className="px-3 py-2.5 w-10 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {expenseItems.map((item, idx) => {
                      const isFuel = item.category?.toLowerCase().includes('fuel') || item.name?.toLowerCase().includes('diesel');
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <select
                              value={item.category}
                              onChange={(e) => {
                                const newCat = e.target.value;
                                handleUpdateExpenseItem(item.id, 'category', newCat);
                                if (!item.name || standardExpenseCategories.includes(item.name)) {
                                  handleUpdateExpenseItem(item.id, 'name', newCat === 'Fuel / Diesel' ? 'Diesel Fueling' : newCat);
                                }
                              }}
                              className="w-full p-1.5 border border-slate-300 rounded font-semibold text-xs bg-slate-50"
                            >
                              {standardExpenseCategories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              placeholder="Enter manual expense name..."
                              value={item.name}
                              onChange={(e) => handleUpdateExpenseItem(item.id, 'name', e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded font-bold text-slate-900 text-xs bg-white"
                            />
                          </td>
                          <td className="px-3 py-2">
                            {isFuel ? (
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  placeholder="Ltrs"
                                  value={item.liters || item.fuelLiters || ''}
                                  onChange={(e) => handleUpdateExpenseItem(item.id, 'liters', e.target.value)}
                                  className="w-full p-1.5 pr-4 border border-blue-300 rounded font-bold text-blue-900 text-xs bg-blue-50/70 text-right"
                                />
                                <span className="absolute right-1 top-2 text-[9px] font-bold text-blue-600 pointer-events-none">L</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-center block">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isFuel ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="260"
                                value={item.fuelRatePerLiter || ''}
                                onChange={(e) => handleUpdateExpenseItem(item.id, 'fuelRatePerLiter', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded font-medium text-slate-800 text-xs bg-white text-right"
                              />
                            ) : (
                              <span className="text-slate-400 text-center block">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.amount}
                              onChange={(e) =>
                                handleUpdateExpenseItem(item.id, 'amount', e.target.value)
                              }
                              className="w-full p-1.5 border border-slate-300 rounded font-black text-rose-600 text-xs text-right bg-white"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.paymentMethod}
                              onChange={(e) =>
                                handleUpdateExpenseItem(item.id, 'paymentMethod', e.target.value as any)
                              }
                              className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                            >
                              <option value="Cash">Cash in Hand</option>
                              <option value="Bank">Bank Account</option>
                              <option value="Payable">Payable to Vendor</option>
                              <option value="Driver Advance">Driver Advance</option>
                            </select>
                          </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="Supplier / Driver / Plaza"
                            value={item.payee || ''}
                            onChange={(e) => handleUpdateExpenseItem(item.id, 'payee', e.target.value)}
                            className="w-full p-1.5 border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveExpenseItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Remove this expense item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>
            </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 text-xs flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <div className="font-bold">Trip route expenses deferred to vehicle return</div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    Upon trip completion and vehicle arrival, you will settle the exact route expenses from driver paper receipts using the 18 standard expense categories.
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Status and Advance Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Driver Pocket Cash Advance (if disbursed directly)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={driverPocketAdvance}
                    onChange={(e) => setDriverPocketAdvance(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Initial Consignment Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full p-2 border border-slate-400 rounded-lg font-bold text-blue-700 bg-white"
                  >
                    <option value="Planned">Planned</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Real-time Calculation Summary Bar */}
            <div className="mt-4 p-4 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-slate-400 text-[10px] block">TOTAL DIRECT EXPENSES</span>
                <span className="text-base font-bold text-amber-400">{formatCurrency(totalDirectExpenses, currency)}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block">OUTSTANDING FREIGHT</span>
                <span className="text-base font-bold text-slate-200">{formatCurrency(outstandingFreight, currency)}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block">ESTIMATED NET PROFIT</span>
                <span className={`text-lg font-bold ${netTripProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(netTripProfit, currency)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block">PROFIT MARGIN</span>
                <span className="text-lg font-bold text-emerald-300">{profitMarginPercent}%</span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Consignment Notes / Remarks</label>
            <input
              type="text"
              placeholder="e.g. Special crane required at offload, container seal verified intact"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Save &amp; Generate Consignment Bilty
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
