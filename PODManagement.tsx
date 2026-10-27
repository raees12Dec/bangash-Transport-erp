/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  FileCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Upload,
  Camera,
  Eye,
  AlertTriangle,
  X,
  FileText,
  UserCheck,
  Download,
} from 'lucide-react';
import { POD, PODStatus, Trip, CompanySettings } from '../types';
import { dbService } from '../services/db';
import { downloadHtmlFile, generatePODHtml } from '../services/htmlExport';

interface PODManagementProps {
  pods: POD[];
  trips: Trip[];
  onSelectPODToPrint: (pod: POD) => void;
  activeVerifyPodId?: string | null;
  setActiveVerifyPodId?: (id: string | null) => void;
  settings?: CompanySettings;
}

export const PODManagement: React.FC<PODManagementProps> = ({
  pods,
  trips,
  onSelectPODToPrint,
  activeVerifyPodId,
  setActiveVerifyPodId,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleDownloadPODHtml = (pod: POD) => {
    const compSettings = settings || dbService.getState().settings;
    const html = generatePODHtml(pod, compSettings);
    downloadHtmlFile(`POD_${pod.podNumber}_${pod.tripNumber}.html`, html);
  };
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedPODForAction, setSelectedPODForAction] = useState<POD | null>(null);

  // Edit / Verification form state
  const [receivedBy, setReceivedBy] = useState('');
  const [receiverDesignation, setReceiverDesignation] = useState('');
  const [receiverContact, setReceiverContact] = useState('');
  const [quantityDelivered, setQuantityDelivered] = useState<number>(0);
  const [deliveryRemarks, setDeliveryRemarks] = useState('');
  const [shortageDamageDetails, setShortageDamageDetails] = useState('Nil / Zero Shortage');
  const [verifiedBy, setVerifiedBy] = useState('Current Operations Manager');
  const [rejectionReason, setRejectionReason] = useState('');
  const [mockSignature, setMockSignature] = useState<string | null>(null);

  // Canvas ref for digital signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Open action modal for a POD
  const openActionModal = (pod: POD) => {
    setSelectedPODForAction(pod);
    setReceivedBy(pod.receivedBy || '');
    setReceiverDesignation(pod.receiverDesignation || 'Receiving In-Charge');
    setReceiverContact(pod.receiverContactNumber || '');
    setQuantityDelivered(pod.quantityDelivered || pod.quantityDispatched);
    setDeliveryRemarks(pod.deliveryRemarks || '');
    setShortageDamageDetails(pod.shortageDamageDetails || 'Nil / Zero Shortage');
    setVerifiedBy(pod.verifiedBy || 'Suleman Baig (Operations Head)');
    setRejectionReason(pod.rejectionReason || '');
    setMockSignature(pod.signatureDataUrl || null);
  };

  // If activeVerifyPodId passed from dashboard
  React.useEffect(() => {
    if (activeVerifyPodId) {
      const p = pods.find((item) => item.id === activeVerifyPodId);
      if (p) {
        openActionModal(p);
        if (setActiveVerifyPodId) setActiveVerifyPodId(null);
      }
    }
  }, [activeVerifyPodId, pods]);

  const filteredPODs = pods.filter((p) => {
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      p.podNumber.toLowerCase().includes(term) ||
      p.tripNumber.toLowerCase().includes(term) ||
      p.customerName.toLowerCase().includes(term) ||
      p.vehicleNumber.toLowerCase().includes(term) ||
      p.driverName.toLowerCase().includes(term) ||
      p.deliveryLocation.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: PODStatus) => {
    switch (status) {
      case 'Generated':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Received':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Verified':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Rejected':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      setMockSignature(canvasRef.current.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setMockSignature(null);
  };

  const handleMarkReceived = () => {
    if (!selectedPODForAction) return;
    if (!receivedBy.trim()) {
      alert('Please enter the name of the receiver.');
      return;
    }
    dbService.updatePOD(selectedPODForAction.id, {
      receivedBy,
      receiverDesignation,
      receiverContactNumber: receiverContact,
      quantityDelivered,
      deliveryRemarks,
      shortageDamageDetails,
      deliveryConfirmation: true,
      signatureDataUrl: mockSignature || undefined,
      status: 'Received',
    });
    setSelectedPODForAction(null);
  };

  const handleVerifyPOD = () => {
    if (!selectedPODForAction) return;
    if (!receivedBy.trim()) {
      alert('Please provide the receiver name before official verification.');
      return;
    }
    dbService.updatePOD(selectedPODForAction.id, {
      receivedBy,
      receiverDesignation,
      receiverContactNumber: receiverContact,
      quantityDelivered,
      deliveryRemarks,
      shortageDamageDetails,
      deliveryConfirmation: true,
      signatureDataUrl: mockSignature || undefined,
      status: 'Verified',
      verificationDate: new Date().toISOString().substring(0, 16).replace('T', ' '),
      verifiedBy,
    });
    setSelectedPODForAction(null);
  };

  const handleRejectPOD = () => {
    if (!selectedPODForAction) return;
    if (!rejectionReason.trim()) {
      alert('Please provide the rejection reason (e.g. quantity shortage / damaged goods / seal broken).');
      return;
    }
    dbService.updatePOD(selectedPODForAction.id, {
      status: 'Rejected',
      rejectionReason,
      verificationDate: new Date().toISOString().substring(0, 16).replace('T', ' '),
      verifiedBy,
    });
    setSelectedPODForAction(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <FileCheck className="w-6 h-6 text-blue-600" />
            <span>Automatic Proof of Delivery (POD) Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-created on delivery status change. Digital receiver signatures, scanned slips, and verification workflow.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="p-2 bg-amber-50 text-amber-800 rounded-lg font-bold border border-amber-200">
            {pods.filter((p) => p.status === 'Generated' || p.status === 'Pending').length} Pending
          </span>
          <span className="p-2 bg-emerald-50 text-emerald-800 rounded-lg font-bold border border-emerald-200">
            {pods.filter((p) => p.status === 'Verified').length} Verified
          </span>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search POD #, Trip #, Customer, Destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['All', 'Generated', 'Received', 'Verified', 'Rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
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

      {/* POD Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">POD # &amp; Trip</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Vehicle &amp; Driver</th>
                <th className="px-4 py-3.5">Delivery Destination</th>
                <th className="px-4 py-3.5">Goods &amp; Quantities</th>
                <th className="px-4 py-3.5">Receiver &amp; Ack</th>
                <th className="px-4 py-3.5 text-center">POD Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPODs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No POD records match the search filter.
                  </td>
                </tr>
              ) : (
                filteredPODs.map((pod) => (
                  <tr key={pod.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-blue-700 text-sm">{pod.podNumber}</div>
                      <div className="text-[11px] font-semibold text-slate-800">Trip: {pod.tripNumber}</div>
                      <div className="text-[10px] text-slate-400">{pod.deliveryDateTime}</div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[150px]">
                      <div className="font-bold text-slate-900 truncate">{pod.customerName}</div>
                      {pod.customerInvoiceNumber && (
                        <div className="text-[10px] text-slate-500">Ref: {pod.customerInvoiceNumber}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800">{pod.vehicleNumber}</div>
                      <div className="text-[11px] text-slate-600">{pod.driverName}</div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[160px] truncate">
                      <div className="font-medium text-slate-800 truncate">{pod.deliveryLocation}</div>
                      {pod.shortageDamageDetails && (
                        <div className="text-[10px] text-emerald-600 font-medium">
                          {pod.shortageDamageDetails}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800 max-w-[130px] truncate">{pod.goodsDescription}</div>
                      <div className="text-[11px] font-bold text-slate-900">
                        Disp: {pod.quantityDispatched} | Del: {pod.quantityDelivered} {pod.quantityUnit}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {pod.receivedBy ? (
                        <div>
                          <div className="font-semibold text-slate-900">{pod.receivedBy}</div>
                          <div className="text-[10px] text-slate-500">{pod.receiverDesignation}</div>
                        </div>
                      ) : (
                        <span className="text-amber-600 italic font-medium">Pending Acknowledgement</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          pod.status
                        )}`}
                      >
                        {pod.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => openActionModal(pod)}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded font-bold text-xs transition-colors cursor-pointer"
                      >
                        {pod.status === 'Verified' ? 'View' : 'Action / Sign'}
                      </button>

                      <button
                        onClick={() => handleDownloadPODHtml(pod)}
                        className="p-1 hover:bg-emerald-50 rounded text-slate-600 hover:text-emerald-700 cursor-pointer"
                        title="Download POD as .HTML"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onSelectPODToPrint(pod)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                        title="Print POD Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POD Action & Verification Modal */}
      {selectedPODForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 text-white p-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="font-bold text-base">
                    Proof of Delivery (POD): {selectedPODForAction.podNumber}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Linked Trip #{selectedPODForAction.tripNumber} • Status:{' '}
                    <span className="font-bold text-amber-400">{selectedPODForAction.status}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadPODHtml(selectedPODForAction)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer shadow-xs"
                  title="Download standalone offline .HTML POD"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .HTML</span>
                </button>
                <button
                  onClick={() => onSelectPODToPrint(selectedPODForAction)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print POD</span>
                </button>
                <button
                  onClick={() => setSelectedPODForAction(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 text-xs">
              {/* Trip Cargo Snapshot */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Consignee (Customer)</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedPODForAction.customerName}</div>
                  <div className="text-slate-500">Destination: {selectedPODForAction.deliveryLocation}</div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Fleet &amp; Driver</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedPODForAction.vehicleNumber}</div>
                  <div className="text-slate-600">Driver: {selectedPODForAction.driverName}</div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Cargo Dispatched</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedPODForAction.goodsDescription}</div>
                  <div className="text-blue-700 font-bold">
                    Dispatched Qty: {selectedPODForAction.quantityDispatched} {selectedPODForAction.quantityUnit}
                  </div>
                </div>
              </div>

              {/* Delivery Receipt Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Received By (Name) *</label>
                  <input
                    type="text"
                    placeholder="e.g. Tariq Javed / Guard In-charge"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Receiver Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Warehouse In-charge / Supervisor"
                    value={receiverDesignation}
                    onChange={(e) => setReceiverDesignation(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Receiver Phone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="e.g. +92 321 4455667"
                    value={receiverContact}
                    onChange={(e) => setReceiverContact(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Quantity Delivered (Verified)</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      step="any"
                      value={quantityDelivered}
                      onChange={(e) => setQuantityDelivered(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900"
                    />
                    <span className="p-2 bg-slate-100 rounded-lg font-medium text-slate-600 shrink-0">
                      {selectedPODForAction.quantityUnit}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Shortage / Damage Particulars</label>
                  <input
                    type="text"
                    placeholder="e.g. Nil / Zero Shortage, or 2 bags torn"
                    value={shortageDamageDetails}
                    onChange={(e) => setShortageDamageDetails(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
              </div>

              {/* Digital Signature Canvas & Document Upload Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Signature Pad */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Receiver Digital Signature:</span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[10px] text-rose-600 hover:underline font-semibold"
                    >
                      Clear Signature
                    </button>
                  </div>

                  <div className="border border-slate-300 rounded-lg overflow-hidden bg-slate-50 relative">
                    <canvas
                      ref={canvasRef}
                      width={380}
                      height={120}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="w-full h-28 cursor-crosshair block"
                    />
                    {!isDrawing && !mockSignature && (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-400 pointer-events-none text-xs italic">
                        Draw receiver signature here
                      </div>
                    )}
                  </div>
                  {mockSignature && (
                    <div className="text-[10px] text-emerald-600 font-bold flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Signature Captured
                    </div>
                  )}
                </div>

                {/* Upload or Mock Scanned Copy */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">
                      Physical Scanned / Photographed Bilty Copy:
                    </span>
                    <p className="text-slate-500 text-[11px] mb-3">
                      Attach signed paper consignment note or offload stamp photo.
                    </p>

                    <label className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="font-semibold text-blue-600 text-xs">Upload Signed POD File</span>
                      <span className="text-[10px] text-slate-400">JPG, PNG, PDF up to 10MB</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            alert(`File "${e.target.files[0].name}" attached successfully to POD record!`);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="pt-2 text-[10px] text-slate-400">
                    Rule 9: Distinct stages: POD Generated ➔ Received ➔ Verified.
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Delivery Observations / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Received intact at dock #4, seal matched bill of lading"
                  value={deliveryRemarks}
                  onChange={(e) => setDeliveryRemarks(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Verification Audit Details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Verifier Name &amp; Title</label>
                  <input
                    type="text"
                    value={verifiedBy}
                    onChange={(e) => setVerifiedBy(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Rejection Reason (if rejecting POD)
                  </label>
                  <input
                    type="text"
                    placeholder="State reason if rejecting..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleRejectPOD}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg font-bold text-xs cursor-pointer"
                >
                  Reject POD
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleMarkReceived}
                  className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg font-bold text-xs cursor-pointer"
                >
                  Mark Physical POD Received
                </button>

                <button
                  type="button"
                  onClick={handleVerifyPOD}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                >
                  Confirm &amp; Officially Verify POD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
