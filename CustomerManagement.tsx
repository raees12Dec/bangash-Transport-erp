/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  BookOpen,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Building,
  Edit2,
  X,
  CreditCard,
  FileText,
  Truck,
  Printer,
  ReceiptText,
} from 'lucide-react';
import { Customer, Trip, Invoice } from '../types';
import { formatCurrency } from '../services/accountingEngine';
import { dbService } from '../services/db';

interface CustomerManagementProps {
  customers: Customer[];
  trips: Trip[];
  invoices: Invoice[];
  currency: string;
  onViewCustomerLedger: (customerId: string) => void;
  onSelectCustomerToPrintStatement: (customer: Customer) => void;
  onViewCustomerReceipts?: (customerId: string) => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  trips,
  invoices,
  currency,
  onViewCustomerLedger,
  onSelectCustomerToPrintStatement,
  onViewCustomerReceipts,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [customerType, setCustomerType] = useState<Customer['customerType']>('Manufacturer');
  const [authorizedPerson, setAuthorizedPerson] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState('Karachi');
  const [provinceState, setProvinceState] = useState('Sindh');
  const [country, setCountry] = useState('Pakistan');
  const [taxRegistrationNumber, setTaxRegistrationNumber] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(1000000);
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [openingBalanceType, setOpeningBalanceType] = useState<'Receivable' | 'Payable'>('Receivable');
  const [bankDetails, setBankDetails] = useState('');
  const [remarks, setRemarks] = useState('');
  const [active, setActive] = useState(true);

  // Quick customer info drawer
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter((c) => {
    const matchesType = typeFilter === 'All' || c.customerType === typeFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      c.companyName.toLowerCase().includes(term) ||
      c.contactPerson.toLowerCase().includes(term) ||
      c.mobile.toLowerCase().includes(term) ||
      c.city.toLowerCase().includes(term);
    return matchesType && matchesSearch;
  });

  const getCustomerOutstanding = (cust: Customer) => {
    let outstanding = cust.openingBalanceType === 'Receivable' ? cust.openingBalance : -cust.openingBalance;

    invoices
      .filter((inv) => inv.customerId === cust.id && inv.paymentStatus !== 'Cancelled')
      .forEach((inv) => {
        outstanding += inv.remainingBalance;
      });

    return outstanding;
  };

  const openCreateModal = () => {
    setEditingCustomerId(null);
    setCompanyName('');
    setCustomerType('Manufacturer');
    setAuthorizedPerson('');
    setContactPerson('');
    setMobile('');
    setWhatsapp('');
    setEmail('');
    setBillingAddress('');
    setPickupAddress('');
    setDeliveryAddress('');
    setCity('Karachi');
    setProvinceState('Sindh');
    setCountry('Pakistan');
    setTaxRegistrationNumber(`NTN-${Math.floor(1000000 + Math.random() * 9000000)}-1`);
    setCreditLimit(1500000);
    setPaymentTerms('Net 30 Days');
    setOpeningBalance(0);
    setOpeningBalanceType('Receivable');
    setBankDetails('');
    setRemarks('');
    setActive(true);
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomerId(c.id);
    setCompanyName(c.companyName);
    setCustomerType(c.customerType);
    setAuthorizedPerson(c.authorizedPerson);
    setContactPerson(c.contactPerson);
    setMobile(c.mobile);
    setWhatsapp(c.whatsapp || '');
    setEmail(c.email);
    setBillingAddress(c.billingAddress);
    setPickupAddress(c.pickupAddress || '');
    setDeliveryAddress(c.deliveryAddress || '');
    setCity(c.city);
    setProvinceState(c.provinceState);
    setCountry(c.country);
    setTaxRegistrationNumber(c.taxRegistrationNumber);
    setCreditLimit(c.creditLimit);
    setPaymentTerms(c.paymentTerms);
    setOpeningBalance(c.openingBalance);
    setOpeningBalanceType(c.openingBalanceType);
    setBankDetails(c.bankDetails || '');
    setRemarks(c.remarks || '');
    setActive(c.active);
    setIsAddEditModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomerId) {
      dbService.updateCustomer(editingCustomerId, {
        companyName,
        customerType,
        authorizedPerson,
        contactPerson,
        mobile,
        whatsapp,
        email,
        billingAddress,
        pickupAddress,
        deliveryAddress,
        city,
        provinceState,
        country,
        taxRegistrationNumber,
        creditLimit,
        paymentTerms,
        openingBalance,
        openingBalanceType,
        bankDetails,
        remarks,
        active,
      });
    } else {
      dbService.addCustomer({
        companyName,
        customerType,
        authorizedPerson,
        contactPerson,
        mobile,
        whatsapp,
        email,
        billingAddress,
        pickupAddress,
        deliveryAddress,
        city,
        provinceState,
        country,
        taxRegistrationNumber,
        creditLimit,
        paymentTerms,
        openingBalance,
        openingBalanceType,
        bankDetails,
        remarks,
        active,
      });
    }

    setIsAddEditModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Customer Master &amp; Accounts Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage clients, credit limits, authorized signatories, tax IDs, and automatic receivables ledger.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Customer</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Company Name, Contact, Mobile, City..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-medium">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="p-1.5 border border-slate-300 rounded-lg font-medium"
          >
            <option value="All">All Types</option>
            <option value="Manufacturer">Manufacturer</option>
            <option value="Corporate">Corporate</option>
            <option value="Distributor">Distributor</option>
            <option value="Trader">Trader</option>
            <option value="Individual">Individual</option>
          </select>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Company &amp; Tax ID</th>
                <th className="px-4 py-3.5">Contact Person</th>
                <th className="px-4 py-3.5">City &amp; Address</th>
                <th className="px-4 py-3.5">Credit Terms</th>
                <th className="px-4 py-3.5 text-right">Credit Limit</th>
                <th className="px-4 py-3.5 text-right">Outstanding Balance</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Ledger &amp; Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => {
                const outstanding = getCustomerOutstanding(c);
                const isOverLimit = c.creditLimit > 0 && outstanding > c.creditLimit;

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{c.companyName}</div>
                      <div className="text-[11px] text-blue-700 font-semibold">{c.customerType}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{c.taxRegistrationNumber}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800">{c.contactPerson}</div>
                      <div className="text-slate-600 text-[11px] flex items-center mt-0.5">
                        <Phone className="w-3 h-3 mr-1 text-slate-400" /> {c.mobile}
                      </div>
                      <div className="text-slate-500 text-[10px] truncate max-w-[150px]">{c.email}</div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[180px]">
                      <div className="font-semibold text-slate-800">{c.city}, {c.provinceState}</div>
                      <div className="text-slate-500 text-[10px] truncate">{c.billingAddress}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-700">{c.paymentTerms}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                      {formatCurrency(c.creditLimit, currency)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className={`font-bold text-sm ${isOverLimit ? 'text-rose-600 font-black' : outstanding > 0 ? 'text-blue-700' : 'text-slate-800'}`}>
                        {formatCurrency(outstanding, currency)}
                      </div>
                      {isOverLimit && (
                        <div className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">
                          Limit Exceeded!
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          c.active
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {c.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => onViewCustomerLedger(c.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded font-bold text-[11px] transition-colors cursor-pointer"
                        title="View Live Customer Ledger"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Ledger</span>
                      </button>

                      {onViewCustomerReceipts && (
                        <button
                          onClick={() => onViewCustomerReceipts(c.id)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded font-bold text-[11px] transition-colors cursor-pointer"
                          title="View Customer Money Receipts"
                        >
                          <ReceiptText className="w-3.5 h-3.5" />
                          <span>Receipts</span>
                        </button>
                      )}

                      <button
                        onClick={() => onSelectCustomerToPrintStatement(c)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                        title="Print Account Statement"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                        title="Edit Customer"
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

      {/* Add / Edit Customer Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 text-white p-5 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>{editingCustomerId ? 'Edit Customer Master Record' : 'Register New Customer Account'}</span>
              </h3>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">Company / Trading Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Blue Star Industrial Goods Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Customer Category</label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Trader">Trader</option>
                    <option value="Individual">Individual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Authorized Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Engr. Imran Hafeez (Supply Chain Head)"
                    value={authorizedPerson}
                    onChange={(e) => setAuthorizedPerson(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Logistics / Dispatch Contact Person *</label>
                  <input
                    type="text"
                    placeholder="e.g. Kamran Ali"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    placeholder="+92 300 1234567"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">WhatsApp Number</label>
                  <input
                    type="text"
                    placeholder="+92 300 1234567"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="accounts@customer.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">City *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Province / State</label>
                  <input
                    type="text"
                    value={provinceState}
                    onChange={(e) => setProvinceState(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Official Billing Address *</label>
                <input
                  type="text"
                  placeholder="Plot 18, Phase 2, Industrial Estate"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Default Pickup Address</label>
                  <input
                    type="text"
                    placeholder="Factory Warehouse Gate 3"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Default Delivery Address</label>
                  <input
                    type="text"
                    placeholder="Multan Road Distribution Center"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Financial Terms */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 block mb-2">Accounting &amp; Credit Parameters:</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Tax Registration #</label>
                    <input
                      type="text"
                      placeholder="NTN / GST Number"
                      value={taxRegistrationNumber}
                      onChange={(e) => setTaxRegistrationNumber(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Credit Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Payment Terms</label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Cash on Delivery">Cash on Delivery</option>
                      <option value="Net 15 Days">Net 15 Days</option>
                      <option value="Net 30 Days">Net 30 Days</option>
                      <option value="Net 45 Days">Net 45 Days</option>
                      <option value="Advance Only">Advance Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Opening Balance</label>
                    <div className="flex space-x-1">
                      <input
                        type="number"
                        min="0"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold"
                      />
                      <select
                        value={openingBalanceType}
                        onChange={(e) => setOpeningBalanceType(e.target.value as any)}
                        className="border border-slate-300 rounded-lg px-1 bg-white text-[10px]"
                      >
                        <option value="Receivable">Dr</option>
                        <option value="Payable">Cr</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Remarks &amp; Special Contract Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Long-term freight contract. Strict offload window between 9AM-4PM."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
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
                  Save Customer Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
