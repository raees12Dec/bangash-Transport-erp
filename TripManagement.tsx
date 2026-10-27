/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Printer,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  DollarSign,
  MapPin,
  Calendar,
  ChevronDown,
  Clock,
  ArrowRight,
  ShieldAlert,
  Download,
  Edit2,
  Trash2,
  Receipt,
  Check,
  Building,
} from 'lucide-react';
import {
  Trip,
  TripStatus,
  Customer,
  Vehicle,
  Driver,
  CompanySettings,
  Invoice,
  TripExpenseItem,
  RateType,
} from '../types';
import { formatCurrency } from '../services/accountingEngine';
import { dbService } from '../services/db';
import {
  downloadHtmlFile,
  generateBiltyHtml,
  generateInvoiceHtml,
  generatePaymentReceiptHtml,
  PaymentReceiptData,
} from '../services/htmlExport';

interface TripManagementProps {
  trips: Trip[];
  customers: Customer[];
  vehicles: Vehicle[];
  drivers: Driver[];
  currency: string;
  onSelectTripToPrint: (trip: Trip) => void;
  onSelectInvoiceToPrint?: (invoice: Invoice) => void;
  onSelectReceiptToPrint?: (receiptData: PaymentReceiptData) => void;
  onOpenNewTripModal: () => void;
  selectedTripForDetails: Trip | null;
  setSelectedTripForDetails: (trip: Trip | null) => void;
  settings?: CompanySettings;
}

export const TripManagement: React.FC<TripManagementProps> = ({
  trips,
  customers,
  vehicles,
  drivers,
  currency,
  onSelectTripToPrint,
  onSelectInvoiceToPrint,
  onSelectReceiptToPrint,
  onOpenNewTripModal,
  selectedTripForDetails,
  setSelectedTripForDetails,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [cancelModalTrip, setCancelModalTrip] = useState<Trip | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Delete modal state
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  // Edit modal state
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editForm, setEditForm] = useState<{
    customerId: string;
    vehicleId: string;
    driverId: string;
    customerInvoiceNumber: string;
    startingLocation: string;
    destinationLocation: string;
    additionalLocations: string;
    tripDate: string;
    startingDateTime: string;
    expectedDeliveryDateTime: string;
    goodsDescription: string;
    goodsQuantity: number;
    quantityUnit: string;
    rateType: RateType;
    freightRate: number;
    totalFreightAmount: number;
    advanceReceived: number;
    status: TripStatus;
    remarks: string;
    tripExpenseItems: TripExpenseItem[];
  }>({
    customerId: '',
    vehicleId: '',
    driverId: '',
    customerInvoiceNumber: '',
    startingLocation: '',
    destinationLocation: '',
    additionalLocations: '',
    tripDate: '',
    startingDateTime: '',
    expectedDeliveryDateTime: '',
    goodsDescription: '',
    goodsQuantity: 0,
    quantityUnit: 'Tons',
    rateType: 'Fixed Per Trip',
    freightRate: 0,
    totalFreightAmount: 0,
    advanceReceived: 0,
    status: 'Planned',
    remarks: '',
    tripExpenseItems: [],
  });

  const compSettings = settings || dbService.getState().settings;

  // Helper to retrieve or synthesize an Invoice for a trip
  const getTripInvoice = (trip: Trip): Invoice => {
    const existing = dbService.getState().invoices.find(
      (i) => i.tripId === trip.id || i.tripNumber === trip.tripNumber
    );
    if (existing) return existing;
    return {
      id: `inv-${trip.id}`,
      invoiceNumber: `INV-${trip.tripNumber.replace('TRP-', '')}`,
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      customerId: trip.customerId,
      customerName: trip.customerCompanyName,
      customerTaxNumber: 'NTN-8934521-7',
      billingAddress: 'Corporate Freight Client Address',
      invoiceDate: trip.tripDate,
      dueDate: trip.expectedDeliveryDateTime ? trip.expectedDeliveryDateTime.substring(0, 10) : trip.tripDate,
      vehicleNumber: trip.vehicleNumber,
      goodsDescription: trip.goodsDescription,
      quantity: trip.goodsQuantity,
      quantityUnit: trip.quantityUnit,
      freightRate: trip.freightRate,
      freightAmount: trip.totalFreightAmount,
      loadingUnloadingCharges:
        (trip.financials?.loadingCharges || 0) + (trip.financials?.unloadingCharges || 0),
      additionalCharges: 0,
      discount: 0,
      taxRatePercent: 0,
      taxAmount: 0,
      previousOutstandingBalance: 0,
      totalInvoiceAmount: trip.totalFreightAmount,
      amountReceived: trip.advanceReceived,
      remainingBalance: trip.outstandingFreightAmount,
      paymentStatus:
        trip.outstandingFreightAmount <= 0
          ? 'Paid'
          : trip.advanceReceived > 0
          ? 'Partially Paid'
          : 'Unpaid',
      createdAt: trip.createdAt,
    };
  };

  // Helper to synthesize Receipt Data
  const getTripReceiptData = (trip: Trip): PaymentReceiptData => {
    return {
      receiptNumber: `REC-${trip.tripNumber.replace('TRP-', '')}`,
      receiptDate: trip.tripDate,
      receivedFrom: trip.customerCompanyName,
      tripNumber: trip.tripNumber,
      biltyNumber: trip.bdNumber,
      vehicleNumber: trip.vehicleNumber,
      route: `${trip.startingLocation} ➔ ${trip.destinationLocation}`,
      cargoDescription: `${trip.goodsDescription} (${trip.goodsQuantity} ${trip.quantityUnit})`,
      amount: trip.advanceReceived > 0 ? trip.advanceReceived : trip.totalFreightAmount,
      paymentMethod: 'Bank Transfer / Cash',
      referenceNumber: trip.customerInvoiceNumber || trip.bdNumber,
      towardsParticulars:
        trip.advanceReceived > 0 ? 'Freight Advance Collection' : 'Freight Settlement',
      totalFreightAmount: trip.totalFreightAmount,
      remainingBalance: trip.outstandingFreightAmount,
      notes: `Official freight collection receipt for consignment ${trip.bdNumber} dispatched on ${trip.tripDate}`,
    };
  };

  // Download & Print handlers
  const handleDownloadBiltyHtml = (trip: Trip) => {
    const html = generateBiltyHtml(trip, compSettings, currency);
    downloadHtmlFile(`Bilty_${trip.bdNumber}_${trip.tripNumber}.html`, html);
  };

  const handlePrintInvoice = (trip: Trip) => {
    const inv = getTripInvoice(trip);
    if (onSelectInvoiceToPrint) {
      onSelectInvoiceToPrint(inv);
    } else {
      const html = generateInvoiceHtml(inv, compSettings, currency);
      downloadHtmlFile(`Invoice_${inv.invoiceNumber}.html`, html);
    }
  };

  const handleDownloadInvoiceHtml = (trip: Trip) => {
    const inv = getTripInvoice(trip);
    const html = generateInvoiceHtml(inv, compSettings, currency);
    downloadHtmlFile(`Invoice_${inv.invoiceNumber}.html`, html);
  };

  const handlePrintReceipt = (trip: Trip) => {
    const receiptData = getTripReceiptData(trip);
    if (onSelectReceiptToPrint) {
      onSelectReceiptToPrint(receiptData);
    } else {
      const html = generatePaymentReceiptHtml(receiptData, compSettings, currency);
      downloadHtmlFile(`Receipt_${receiptData.receiptNumber}.html`, html);
    }
  };

  const handleDownloadReceiptHtml = (trip: Trip) => {
    const receiptData = getTripReceiptData(trip);
    const html = generatePaymentReceiptHtml(receiptData, compSettings, currency);
    downloadHtmlFile(`Receipt_${receiptData.receiptNumber}.html`, html);
  };

  // Open Edit Trip Modal
  // Open Edit Trip Modal
  const handleOpenEdit = (trip: Trip) => {
    setEditingTrip(trip);
    const initialExpenses =
      trip.tripExpenseItems && trip.tripExpenseItems.length > 0
        ? trip.tripExpenseItems.map((item) => {
            const isFuel = item.category === 'Fuel' || item.name?.toLowerCase().includes('diesel');
            const ltrs = item.liters || item.fuelLiters || (isFuel && trip.financials?.fuelLiters ? trip.financials.fuelLiters : (isFuel && item.amount ? Math.round(item.amount / 260) : undefined));
            const rate = item.fuelRatePerLiter || (isFuel && trip.financials?.fuelRatePerLiter ? trip.financials.fuelRatePerLiter : 260);
            return {
              ...item,
              name: item.name || item.expenseName || item.category,
              expenseName: item.expenseName || item.name || item.category,
              liters: ltrs,
              fuelLiters: ltrs,
              fuelRatePerLiter: rate,
            };
          })
        : [
            {
              id: 'exp-1',
              category: 'Fuel',
              name: 'Enroute Diesel & Fueling',
              expenseName: 'Enroute Diesel & Fueling',
              amount: trip.financials?.fuelExpenses || 65000,
              liters: trip.financials?.fuelLiters || (trip.financials?.fuelExpenses ? Math.round(trip.financials.fuelExpenses / 260) : 250),
              fuelLiters: trip.financials?.fuelLiters || (trip.financials?.fuelExpenses ? Math.round(trip.financials.fuelExpenses / 260) : 250),
              fuelRatePerLiter: trip.financials?.fuelRatePerLiter || 260,
              paymentMethod: 'Cash' as const,
              payee: 'PSO / Shell Fleet Station',
            },
            {
              id: 'exp-2',
              category: 'Tolls & Taxes',
              name: 'Motorway Toll Plazas',
              expenseName: 'Motorway Toll Plazas',
              amount: trip.financials?.tollTaxes || 12000,
              paymentMethod: 'Cash' as const,
              payee: 'National Highway Authority (M-Tag)',
            },
            {
              id: 'exp-3',
              category: 'Driver Allowance',
              name: 'Driver Daily Food & Trip Allowance',
              expenseName: 'Driver Daily Food & Trip Allowance',
              amount: trip.financials?.driverAllowance || 10000,
              paymentMethod: 'Cash' as const,
              payee: trip.driverName,
            },
            {
              id: 'exp-4',
              category: 'Loading',
              name: 'Origin Cargo Loading Labor',
              expenseName: 'Origin Cargo Loading Labor',
              amount: trip.financials?.loadingCharges || 5000,
              paymentMethod: 'Cash' as const,
              payee: 'Terminal Handling Labor Union',
            },
            {
              id: 'exp-5',
              category: 'Unloading',
              name: 'Destination Offloading Charges',
              expenseName: 'Destination Offloading Charges',
              amount: trip.financials?.unloadingCharges || 4000,
              paymentMethod: 'Cash' as const,
              payee: 'Warehouse Offloading Team',
            },
          ];

    setEditForm({
      customerId: trip.customerId,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
      customerInvoiceNumber: trip.customerInvoiceNumber || '',
      startingLocation: trip.startingLocation,
      destinationLocation: trip.destinationLocation,
      additionalLocations: trip.additionalLocations || '',
      tripDate: trip.tripDate,
      startingDateTime: trip.startingDateTime,
      expectedDeliveryDateTime: trip.expectedDeliveryDateTime,
      goodsDescription: trip.goodsDescription,
      goodsQuantity: trip.goodsQuantity,
      quantityUnit: trip.quantityUnit,
      rateType: trip.rateType,
      freightRate: trip.freightRate,
      totalFreightAmount: trip.totalFreightAmount,
      advanceReceived: trip.advanceReceived,
      status: trip.status,
      remarks: trip.remarks || '',
      tripExpenseItems: initialExpenses,
    });
  };

  // Add & Remove Expense Rows in Edit Form
  const handleAddEditExpense = () => {
    if (editForm.tripExpenseItems.length >= 10) {
      alert('Maximum of 10 expense items allowed per trip.');
      return;
    }
    const newRow: TripExpenseItem = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category: 'Fuel',
      name: 'Diesel Fueling',
      expenseName: 'Diesel Fueling',
      liters: 0,
      fuelLiters: 0,
      fuelRatePerLiter: 260,
      amount: 0,
      paymentMethod: 'Cash',
      payee: '',
    };
    setEditForm((prev) => ({
      ...prev,
      tripExpenseItems: [...prev.tripExpenseItems, newRow],
    }));
  };

  const handleRemoveEditExpense = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      tripExpenseItems: prev.tripExpenseItems.filter((_, idx) => idx !== index),
    }));
  };

  const handleUpdateEditExpense = (index: number, field: keyof TripExpenseItem, val: any) => {
    setEditForm((prev) => {
      const updated = [...prev.tripExpenseItems];
      const current = { ...updated[index] };

      if (field === 'name') {
        current.name = val;
        current.expenseName = val;
      } else if (field === 'category') {
        current.category = val;
        if (!current.name || current.name === 'Miscellaneous Trip Cost' || current.name === 'Other') {
          current.name = val === 'Fuel' ? 'Diesel Fueling' : val;
          current.expenseName = current.name;
        }
      } else if (field === 'liters') {
        const ltrs = parseFloat(val) || 0;
        current.liters = ltrs;
        current.fuelLiters = ltrs;
        const rate = current.fuelRatePerLiter || 260;
        if (ltrs > 0 && rate > 0) {
          current.amount = Math.round(ltrs * rate);
        }
      } else if (field === 'fuelRatePerLiter') {
        const rate = parseFloat(val) || 0;
        current.fuelRatePerLiter = rate;
        const ltrs = current.liters || current.fuelLiters || 0;
        if (ltrs > 0 && rate > 0) {
          current.amount = Math.round(ltrs * rate);
        }
      } else if (field === 'amount') {
        const amt = parseFloat(val) || 0;
        current.amount = amt;
        const isFuel = current.category === 'Fuel' || current.name?.toLowerCase().includes('diesel');
        const rate = current.fuelRatePerLiter || 260;
        if (isFuel && rate > 0 && (!current.liters || current.liters === 0)) {
          current.liters = Math.round(amt / rate);
          current.fuelLiters = current.liters;
        }
      } else {
        (current as any)[field] = val;
      }

      updated[index] = current;
      return { ...prev, tripExpenseItems: updated };
    });
  };

  // Save Edited Trip
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;

    const cust = customers.find((c) => c.id === editForm.customerId);
    const veh = vehicles.find((v) => v.id === editForm.vehicleId);
    const drv = drivers.find((d) => d.id === editForm.driverId);

    const calculatedTotalFreight =
      editForm.rateType === 'Fixed Per Trip'
        ? Number(editForm.freightRate)
        : Number(editForm.freightRate) * Number(editForm.goodsQuantity);

    const outstanding = Math.max(0, calculatedTotalFreight - Number(editForm.advanceReceived));

    const cleanExpenseItems = editForm.tripExpenseItems.map((item) => ({
      ...item,
      name: item.name || item.expenseName || item.category,
      expenseName: item.expenseName || item.name || item.category,
      amount: Number(item.amount) || 0,
      liters: item.liters !== undefined ? Number(item.liters) : (item.fuelLiters !== undefined ? Number(item.fuelLiters) : undefined),
      fuelLiters: item.liters !== undefined ? Number(item.liters) : (item.fuelLiters !== undefined ? Number(item.fuelLiters) : undefined),
      fuelRatePerLiter: item.fuelRatePerLiter !== undefined ? Number(item.fuelRatePerLiter) : undefined,
    }));

    const updated = dbService.updateTrip(editingTrip.id, {
      customerId: editForm.customerId,
      customerCompanyName: cust ? cust.companyName : editingTrip.customerCompanyName,
      customerInvoiceNumber: editForm.customerInvoiceNumber,
      vehicleId: editForm.vehicleId,
      vehicleNumber: veh ? veh.vehicleNumber : editingTrip.vehicleNumber,
      vehicleType: veh ? veh.vehicleType : editingTrip.vehicleType,
      vehicleSize: veh ? (veh.vehicleSize || veh.sizeCapacity) : editingTrip.vehicleSize,
      driverId: editForm.driverId,
      driverName: drv ? drv.name : editingTrip.driverName,
      driverContactNumber: drv ? drv.mobileNumber : editingTrip.driverContactNumber,
      driverIdNumber: drv ? drv.drivingLicenceNumber : editingTrip.driverIdNumber,
      startingLocation: editForm.startingLocation,
      destinationLocation: editForm.destinationLocation,
      additionalLocations: editForm.additionalLocations,
      tripDate: editForm.tripDate,
      startingDateTime: editForm.startingDateTime,
      expectedDeliveryDateTime: editForm.expectedDeliveryDateTime,
      goodsDescription: editForm.goodsDescription,
      goodsQuantity: Number(editForm.goodsQuantity),
      quantityUnit: editForm.quantityUnit,
      rateType: editForm.rateType,
      freightRate: Number(editForm.freightRate),
      totalFreightAmount: calculatedTotalFreight,
      advanceReceived: Number(editForm.advanceReceived),
      outstandingFreightAmount: outstanding,
      status: editForm.status,
      remarks: editForm.remarks,
      tripExpenseItems: cleanExpenseItems,
    });

    if (selectedTripForDetails?.id === editingTrip.id) {
      setSelectedTripForDetails(updated);
    }

    setEditingTrip(null);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!tripToDelete) return;
    const success = dbService.deleteTrip(tripToDelete.id);
    if (success) {
      if (selectedTripForDetails?.id === tripToDelete.id) {
        setSelectedTripForDetails(null);
      }
      setTripToDelete(null);
    } else {
      alert('Could not delete trip. Please try again.');
    }
  };

  // Status badge styling helper
  const getStatusBadge = (status: TripStatus) => {
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

  const statuses: Array<TripStatus | 'All'> = [
    'All',
    'Planned',
    'Dispatched',
    'In Transit',
    'Delivered',
    'POD Received',
    'Invoiced',
    'Completed',
    'Cancelled',
  ];

  const filteredTrips = trips.filter((t) => {
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      t.tripNumber.toLowerCase().includes(term) ||
      t.bdNumber.toLowerCase().includes(term) ||
      t.customerCompanyName.toLowerCase().includes(term) ||
      t.vehicleNumber.toLowerCase().includes(term) ||
      t.driverName.toLowerCase().includes(term) ||
      t.startingLocation.toLowerCase().includes(term) ||
      t.destinationLocation.toLowerCase().includes(term) ||
      t.goodsDescription.toLowerCase().includes(term);

    return matchesStatus && matchesSearch;
  });

  const handleUpdateStatus = (trip: Trip, newStatus: TripStatus) => {
    if (newStatus === 'Cancelled') {
      setCancelModalTrip(trip);
      return;
    }
    const updated = dbService.updateTrip(trip.id, {
      status: newStatus,
      actualCompletionDateTime:
        newStatus === 'Delivered' || newStatus === 'Completed'
          ? new Date().toISOString().substring(0, 16).replace('T', ' ')
          : trip.actualCompletionDateTime,
    });
    if (selectedTripForDetails?.id === trip.id) {
      setSelectedTripForDetails(updated);
    }
  };

  const handleConfirmCancel = () => {
    if (!cancelModalTrip) return;
    if (!cancellationReason.trim()) {
      alert('Please provide a mandatory cancellation reason.');
      return;
    }
    dbService.cancelTrip(cancelModalTrip.id, cancellationReason);
    setCancelModalTrip(null);
    setCancellationReason('');
    if (selectedTripForDetails?.id === cancelModalTrip.id) {
      setSelectedTripForDetails(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Truck className="w-6 h-6 text-blue-600" />
            <span>Trip Entry &amp; Operations Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Book consignments, monitor dispatch status, edit/delete entries, generate bilty, tax invoices &amp; cash receipts.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onOpenNewTripModal}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Book New Trip</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Trip #, Bilty #, Customer, Vehicle, Route..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-500 font-medium mr-1 hidden sm:inline">Status:</span>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Trip Details</th>
                <th className="px-4 py-3.5">Customer &amp; PO</th>
                <th className="px-4 py-3.5">Vehicle &amp; Driver</th>
                <th className="px-4 py-3.5">Route</th>
                <th className="px-4 py-3.5">Goods &amp; Quantity</th>
                <th className="px-4 py-3.5 text-right">Freight &amp; Cost</th>
                <th className="px-4 py-3.5 text-right">Net Profit</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center">Documentation &amp; Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No trips match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => {
                  const fin = trip.financials || ({} as any);
                  return (
                    <tr key={trip.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-blue-700">{trip.tripNumber}</div>
                        <div className="text-[11px] text-slate-600 font-medium">Bilty: {trip.bdNumber}</div>
                        <div className="text-[10px] text-slate-400 flex items-center mt-0.5">
                          <Calendar className="w-3 h-3 mr-1" /> {trip.tripDate}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 max-w-[160px]">
                        <div className="font-bold text-slate-900 truncate">{trip.customerCompanyName}</div>
                        {trip.customerInvoiceNumber && (
                          <div className="text-[10px] text-slate-500 truncate">PO/Ref: {trip.customerInvoiceNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{trip.vehicleNumber}</div>
                        <div className="text-[11px] text-slate-600">{trip.driverName}</div>
                        <div className="text-[10px] text-slate-400">{trip.driverContactNumber}</div>
                      </td>
                      <td className="px-4 py-3.5 max-w-[170px]">
                        <div className="font-medium text-slate-900 truncate flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0"></span>
                          <span className="truncate">{trip.startingLocation}</span>
                        </div>
                        <div className="font-medium text-slate-700 truncate flex items-center mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 shrink-0"></span>
                          <span className="truncate">{trip.destinationLocation}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800 max-w-[140px] truncate">{trip.goodsDescription}</div>
                        <div className="text-[11px] text-slate-500 font-semibold">
                          {trip.goodsQuantity} {trip.quantityUnit}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium">
                        <div className="font-bold text-slate-900">{formatCurrency(trip.totalFreightAmount, currency)}</div>
                        <div className="text-[10px] text-amber-700 font-semibold">
                          Cost: {formatCurrency(fin.totalTripExpenses || 0, currency)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className={`font-bold ${fin.netTripProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatCurrency(fin.netTripProfit || 0, currency)}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500">
                          {fin.profitMarginPercentage || 0}% margin
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="relative inline-block text-left">
                          <select
                            value={trip.status}
                            onChange={(e) => handleUpdateStatus(trip, e.target.value as TripStatus)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer focus:outline-hidden ${getStatusBadge(
                              trip.status
                            )}`}
                          >
                            <option value="Planned">Planned</option>
                            <option value="Dispatched">Dispatched</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Delivered">Delivered</option>
                            <option value="POD Received">POD Received</option>
                            <option value="Invoiced">Invoiced</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {/* View details */}
                          <button
                            onClick={() => setSelectedTripForDetails(trip)}
                            className="px-2 py-1 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded text-xs font-semibold cursor-pointer"
                            title="View Trip Breakdown"
                          >
                            View
                          </button>

                          {/* Edit Trip */}
                          <button
                            onClick={() => handleOpenEdit(trip)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                            title="Edit Posted Trip & Expenses"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          {/* Print / PDF Invoice */}
                          <button
                            onClick={() => handlePrintInvoice(trip)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                            title="Print / PDF Freight Invoice"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Invoice</span>
                          </button>

                          {/* Print / PDF Receipt */}
                          <button
                            onClick={() => handlePrintReceipt(trip)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                            title="Print / PDF Payment Receipt"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>

                          {/* Print Bilty */}
                          <button
                            onClick={() => onSelectTripToPrint(trip)}
                            className="p-1 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded cursor-pointer"
                            title="Print Consignment Note (Bilty)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Download Bilty HTML */}
                          <button
                            onClick={() => handleDownloadBiltyHtml(trip)}
                            className="p-1 hover:bg-slate-100 text-slate-600 hover:text-emerald-600 rounded cursor-pointer"
                            title="Download Bilty as .HTML"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Trip */}
                          <button
                            onClick={() => setTripToDelete(trip)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Delete Consignment Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trip Details Modal / Drawer */}
      {selectedTripForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-slate-900 text-white p-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Truck className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="text-lg font-bold">
                    Consignment Note: {selectedTripForDetails.tripNumber} ({selectedTripForDetails.bdNumber})
                  </h3>
                  <p className="text-xs text-slate-300">
                    Status: <span className="font-bold text-amber-400">{selectedTripForDetails.status}</span> • Date: {selectedTripForDetails.tripDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const t = selectedTripForDetails;
                    setSelectedTripForDetails(null);
                    handleOpenEdit(t);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer shadow-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Trip</span>
                </button>
                <button
                  onClick={() => handlePrintInvoice(selectedTripForDetails)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer shadow-xs"
                  title="Print / Save Freight Tax Invoice"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => handlePrintReceipt(selectedTripForDetails)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer shadow-xs"
                  title="Print Payment Receipt"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => onSelectTripToPrint(selectedTripForDetails)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Bilty</span>
                </button>
                <button
                  onClick={() => handleDownloadBiltyHtml(selectedTripForDetails)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer shadow-xs border border-slate-700"
                  title="Download standalone offline .HTML Bilty"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .HTML</span>
                </button>
                <button
                  onClick={() => setSelectedTripForDetails(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 text-xs">
              {/* Trip General Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Customer</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedTripForDetails.customerCompanyName}</div>
                  <div className="text-slate-500 mt-1">Ref / PO: {selectedTripForDetails.customerInvoiceNumber || 'N/A'}</div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Assigned Fleet</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedTripForDetails.vehicleNumber}</div>
                  <div className="text-slate-600">{selectedTripForDetails.vehicleType} ({selectedTripForDetails.vehicleSize})</div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Driver In-Charge</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedTripForDetails.driverName}</div>
                  <div className="text-slate-600">Mobile: {selectedTripForDetails.driverContactNumber}</div>
                  <div className="text-slate-400 text-[10px]">ID: {selectedTripForDetails.driverIdNumber}</div>
                </div>
              </div>

              {/* Route & Consignment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center">
                    <MapPin className="w-4 h-4 text-rose-500 mr-1.5" /> Route Locations &amp; Timeline
                  </h4>
                  <div className="space-y-1.5 text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-900">From (Origin):</span> {selectedTripForDetails.startingLocation}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">To (Destination):</span> {selectedTripForDetails.destinationLocation}
                    </div>
                    {selectedTripForDetails.additionalLocations && (
                      <div>
                        <span className="font-semibold text-slate-900">Transit Stops:</span> {selectedTripForDetails.additionalLocations}
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-100 flex justify-between text-slate-500 text-[11px]">
                      <span>Dispatched: {selectedTripForDetails.startingDateTime}</span>
                      <span>Expected: {selectedTripForDetails.expectedDeliveryDateTime}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center">
                    <FileText className="w-4 h-4 text-blue-500 mr-1.5" /> Cargo Particulars
                  </h4>
                  <div className="space-y-1.5 text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-900">Description:</span> {selectedTripForDetails.goodsDescription}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">Total Quantity:</span>{' '}
                      <span className="font-bold text-slate-900">{selectedTripForDetails.goodsQuantity} {selectedTripForDetails.quantityUnit}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">Freight Rate:</span> {formatCurrency(selectedTripForDetails.freightRate, currency)} ({selectedTripForDetails.rateType})
                    </div>
                    {selectedTripForDetails.remarks && (
                      <div className="pt-2 border-t border-slate-100 text-slate-500 italic">
                        "{selectedTripForDetails.remarks}"
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Itemized Direct Expenses Table */}
              {selectedTripForDetails.tripExpenseItems && selectedTripForDetails.tripExpenseItems.length > 0 && (
                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between">
                    <span className="flex items-center">
                      <DollarSign className="w-4 h-4 text-amber-500 mr-1" />
                      Itemized Direct Expenses ({selectedTripForDetails.tripExpenseItems.length} items)
                    </span>
                    <span className="text-rose-600 font-bold">
                      Total: {formatCurrency(selectedTripForDetails.financials?.totalTripExpenses || 0, currency)}
                    </span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 font-bold uppercase text-[9px] text-slate-600">
                        <tr>
                          <th className="p-2">Category</th>
                          <th className="p-2">Expense Title</th>
                          <th className="p-2">Payee / Vendor</th>
                          <th className="p-2">Method</th>
                          <th className="p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {selectedTripForDetails.tripExpenseItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-bold text-slate-800">{item.category}</td>
                            <td className="p-2 text-slate-700">{item.name || item.expenseName || item.category}</td>
                            <td className="p-2 text-slate-600">{item.payee || '-'}</td>
                            <td className="p-2">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-700">
                                {item.paymentMethod}
                              </span>
                            </td>
                            <td className="p-2 text-right font-bold text-rose-600">
                              {formatCurrency(item.amount, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Automatic Financial Calculations Breakdown */}
              <div className="p-5 bg-slate-900 text-white rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="font-bold text-sm text-white flex items-center">
                    <DollarSign className="w-4 h-4 text-emerald-400 mr-1.5" />
                    Trip Financial Calculation &amp; Profit Engine
                  </h4>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                    Net Margin: {selectedTripForDetails.financials?.profitMarginPercentage || 0}%
                  </span>
                </div>

                {/* Direct Costs Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                    <span className="text-slate-400 text-[10px]">Gross Freight Revenue</span>
                    <div className="text-base font-bold text-blue-400 mt-0.5">
                      {formatCurrency(selectedTripForDetails.totalFreightAmount, currency)}
                    </div>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                    <span className="text-slate-400 text-[10px]">Fuel Expenses</span>
                    <div className="text-base font-bold text-amber-400 mt-0.5">
                      {formatCurrency(selectedTripForDetails.financials?.fuelExpenses || 0, currency)}
                    </div>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                    <span className="text-slate-400 text-[10px]">Tolls &amp; Road Taxes</span>
                    <div className="text-base font-bold text-amber-400 mt-0.5">
                      {formatCurrency((selectedTripForDetails.financials?.tollTaxes || 0) + (selectedTripForDetails.financials?.roadTaxes || 0), currency)}
                    </div>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                    <span className="text-slate-400 text-[10px]">Labor (Loading/Unload)</span>
                    <div className="text-base font-bold text-amber-400 mt-0.5">
                      {formatCurrency((selectedTripForDetails.financials?.loadingCharges || 0) + (selectedTripForDetails.financials?.unloadingCharges || 0), currency)}
                    </div>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                    <span className="text-slate-400 text-[10px]">Driver Allowance</span>
                    <div className="text-base font-bold text-amber-400 mt-0.5">
                      {formatCurrency(selectedTripForDetails.financials?.driverAllowance || 0, currency)}
                    </div>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                    <span className="text-slate-400 text-[10px]">Repair / Parking / Food</span>
                    <div className="text-base font-bold text-amber-400 mt-0.5">
                      {formatCurrency(
                        (selectedTripForDetails.financials?.vehicleRepairMaintenance || 0) +
                        (selectedTripForDetails.financials?.parkingCharges || 0) +
                        (selectedTripForDetails.financials?.foodAccommodation || 0),
                        currency
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                    <span className="text-slate-400 text-[10px]">Total Direct Expenses</span>
                    <div className="text-base font-bold text-rose-400 mt-0.5">
                      {formatCurrency(selectedTripForDetails.financials?.totalTripExpenses || 0, currency)}
                    </div>
                  </div>

                  <div className="bg-emerald-950/80 p-2.5 rounded-lg border border-emerald-700">
                    <span className="text-emerald-300 text-[10px]">Net Trip Profit</span>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">
                      {formatCurrency(selectedTripForDetails.financials?.netTripProfit || 0, currency)}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
                  <span>Advance Received: <strong className="text-white">{formatCurrency(selectedTripForDetails.advanceReceived, currency)}</strong></span>
                  <span>Outstanding Freight: <strong className="text-amber-300">{formatCurrency(selectedTripForDetails.outstandingFreightAmount, currency)}</strong></span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    const t = selectedTripForDetails;
                    setSelectedTripForDetails(null);
                    setTripToDelete(t);
                  }}
                  className="text-rose-600 hover:text-rose-700 font-semibold text-xs flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Trip</span>
                </button>
                <button
                  onClick={() => setCancelModalTrip(selectedTripForDetails)}
                  className="text-amber-600 hover:text-amber-700 font-semibold text-xs cursor-pointer ml-3"
                >
                  Cancel Trip...
                </button>
              </div>
              <button
                onClick={() => setSelectedTripForDetails(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TRIP MODAL */}
      {editingTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 text-white p-4 rounded-t-2xl flex items-center justify-between z-10">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">
                    Edit Trip Consignment: {editingTrip.tripNumber} ({editingTrip.bdNumber})
                  </h3>
                  <p className="text-[11px] text-slate-400">Modify routes, assigned fleet, rate, and itemized direct expenses</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTrip(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-5 text-xs">
              {/* Row 1: Customer, Fleet, Driver */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Customer / Consignor *</label>
                  <select
                    value={editForm.customerId}
                    onChange={(e) => setEditForm({ ...editForm, customerId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                    required
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Vehicle *</label>
                  <select
                    value={editForm.vehicleId}
                    onChange={(e) => setEditForm({ ...editForm, vehicleId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                    required
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNumber} ({v.vehicleType} - {v.sizeCapacity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned Driver *</label>
                  <select
                    value={editForm.driverId}
                    onChange={(e) => setEditForm({ ...editForm, driverId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                    required
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.mobileNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Route & Dates */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Origin (Pickup Location) *</label>
                  <input
                    type="text"
                    value={editForm.startingLocation}
                    onChange={(e) => setEditForm({ ...editForm, startingLocation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Destination Location *</label>
                  <input
                    type="text"
                    value={editForm.destinationLocation}
                    onChange={(e) => setEditForm({ ...editForm, destinationLocation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Trip Date *</label>
                  <input
                    type="date"
                    value={editForm.tripDate}
                    onChange={(e) => setEditForm({ ...editForm, tripDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as TripStatus })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Planned">Planned</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="POD Received">POD Received</option>
                    <option value="Invoiced">Invoiced</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Cargo & Freight Calculation */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs">Cargo Particulars &amp; Freight Rates</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">Cargo Description *</label>
                    <input
                      type="text"
                      value={editForm.goodsDescription}
                      onChange={(e) => setEditForm({ ...editForm, goodsDescription: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Quantity &amp; Unit</label>
                    <div className="flex space-x-1">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editForm.goodsQuantity}
                        onChange={(e) => setEditForm({ ...editForm, goodsQuantity: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={editForm.quantityUnit}
                        onChange={(e) => setEditForm({ ...editForm, quantityUnit: e.target.value })}
                        className="w-20 p-2 border border-slate-300 rounded-lg text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Freight Rate ({currency})</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editForm.freightRate}
                      onChange={(e) => setEditForm({ ...editForm, freightRate: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Advance Received ({currency})</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editForm.advanceReceived}
                      onChange={(e) => setEditForm({ ...editForm, advanceReceived: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-emerald-700 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic 5 to 10 Direct Expenses Editor */}
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs flex items-center">
                      <DollarSign className="w-4 h-4 text-amber-600 mr-1" />
                      Itemized Direct Expenses (5 to 10 Options)
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Specify expense names, categories, amounts, payment modes and vendors for direct trip profitability.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEditExpense}
                    disabled={editForm.tripExpenseItems.length >= 10}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Expense ({editForm.tripExpenseItems.length}/10)</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-amber-100/70 text-slate-700 font-bold uppercase text-[9px]">
                      <tr>
                        <th className="p-2 w-28">Category</th>
                        <th className="p-2">Expense Name / Title (Editable Manually) *</th>
                        <th className="p-2 w-24">Diesel Liters (Qty)</th>
                        <th className="p-2 w-20">Rate/Ltr</th>
                        <th className="p-2 w-28">Amount ({currency}) *</th>
                        <th className="p-2 w-28">Payment Mode</th>
                        <th className="p-2">Payee / Vendor</th>
                        <th className="p-2 text-center w-10">Act</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 font-medium">
                      {editForm.tripExpenseItems.map((item, idx) => {
                        const isFuel = item.category === 'Fuel' || item.name?.toLowerCase().includes('diesel') || item.category?.toLowerCase().includes('fuel');
                        return (
                          <tr key={item.id || idx}>
                            <td className="p-1.5">
                              <select
                                value={item.category}
                                onChange={(e) => handleUpdateEditExpense(idx, 'category', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white font-medium"
                              >
                                <option value="Fuel">Fuel / Diesel</option>
                                <option value="Tolls & Taxes">Tolls & Taxes</option>
                                <option value="Driver Allowance">Driver Allowance</option>
                                <option value="Loading">Loading</option>
                                <option value="Unloading">Unloading</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Parking">Parking</option>
                                <option value="Police / Chalan">Chalan / Fine</option>
                                <option value="Other">Other / Misc</option>
                              </select>
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={item.name || item.expenseName || ''}
                                onChange={(e) => handleUpdateEditExpense(idx, 'name', e.target.value)}
                                placeholder="Type custom expense name manually..."
                                className="w-full p-1.5 border border-slate-300 rounded text-xs font-bold text-slate-900 bg-white focus:ring-1 focus:ring-amber-500"
                                required
                              />
                            </td>
                            <td className="p-1.5">
                              {isFuel ? (
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.liters || item.fuelLiters || ''}
                                    onChange={(e) => handleUpdateEditExpense(idx, 'liters', e.target.value)}
                                    placeholder="Qty (Ltr)"
                                    className="w-full p-1.5 pr-5 border border-blue-300 rounded text-xs font-bold text-blue-900 bg-blue-50/70 text-right"
                                  />
                                  <span className="absolute right-1 top-1.5 text-[9px] font-bold text-blue-600 pointer-events-none">L</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-center block">-</span>
                              )}
                            </td>
                            <td className="p-1.5">
                              {isFuel ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.fuelRatePerLiter || ''}
                                  onChange={(e) => handleUpdateEditExpense(idx, 'fuelRatePerLiter', e.target.value)}
                                  placeholder="260"
                                  className="w-full p-1.5 border border-slate-300 rounded text-xs font-medium text-slate-800 text-right bg-white"
                                />
                              ) : (
                                <span className="text-slate-400 text-center block">-</span>
                              )}
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.amount}
                                onChange={(e) =>
                                  handleUpdateEditExpense(idx, 'amount', e.target.value)
                                }
                                className="w-full p-1.5 border border-slate-300 rounded text-xs font-black text-rose-700 text-right bg-white"
                                required
                              />
                            </td>
                            <td className="p-1.5">
                              <select
                                value={item.paymentMethod}
                                onChange={(e) => handleUpdateEditExpense(idx, 'paymentMethod', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                              >
                                <option value="Cash">Cash</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Payable">Payable / Credit</option>
                                <option value="Driver Advance">Driver Advance</option>
                              </select>
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={item.payee || ''}
                                onChange={(e) => handleUpdateEditExpense(idx, 'payee', e.target.value)}
                                placeholder="e.g. PSO Station / Driver"
                                className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveEditExpense(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Remove item"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-amber-200">
                  <span>Total Direct Expenses:</span>
                  <span className="text-rose-700 text-sm">
                    {formatCurrency(
                      editForm.tripExpenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
                      currency
                    )}
                  </span>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Remarks &amp; Special Instructions</label>
                <textarea
                  rows={2}
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  placeholder="Enter any additional consignor notes or delivery conditions..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingTrip(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE TRIP CONFIRMATION MODAL */}
      {tripToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <Trash2 className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">
                Delete Trip {tripToDelete.tripNumber}?
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete consignment{' '}
              <strong className="text-slate-900">{tripToDelete.tripNumber}</strong> (Bilty: {tripToDelete.bdNumber}) for{' '}
              <strong>{tripToDelete.customerCompanyName}</strong>?
            </p>
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-[11px] text-rose-800 space-y-1">
              <div>• Linked invoices, POD receipts, and trip expense vouchers will be deleted.</div>
              <div>• Fleet vehicle <strong>{tripToDelete.vehicleNumber}</strong> will be freed back to Available status.</div>
              <div>• Audit trail log will record this deletion for compliance.</div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setTripToDelete(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Delete Consignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">
                Cancel Trip {cancelModalTrip.tripNumber}?
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Cancelling will release vehicle <strong className="text-slate-900">{cancelModalTrip.vehicleNumber}</strong> back to Available fleet status and preserve this transaction in the audit trail.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Cancellation Reason:
              </label>
              <textarea
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Customer cancelled order / vehicle breakdown / route closed"
                className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setCancelModalTrip(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Keep Trip Active
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
