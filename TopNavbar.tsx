/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  PlusCircle,
  Download,
  Printer,
  RotateCcw,
  Building,
  CheckCircle,
  AlertTriangle,
  FileText,
  Shield,
  Lock,
  Settings,
  Cloud,
  CloudUpload,
  RefreshCw,
} from 'lucide-react';
import { DateFilterPeriod, DateRange } from '../services/accountingEngine';
import { CompanySettings, UserProfile } from '../types';
import { dbService } from '../services/db';
import { downloadHtmlFile, generateOfflineErpAppHtml } from '../services/htmlExport';
import { cloudSyncService, CloudStatusInfo } from '../services/cloudSync';

interface TopNavbarProps {
  settings: CompanySettings;
  period: DateFilterPeriod;
  setPeriod: (p: DateFilterPeriod) => void;
  customRange: DateRange;
  setCustomRange: (r: DateRange) => void;
  currentUser: UserProfile;
  pendingExpensesCount: number;
  onOpenLoginSwitchModal: () => void;
  onOpenExpenseSettlementModal: () => void;
  onOpenTripSheetsModal: () => void;
  onOpenNewTripModal: () => void;
  onOpenNewExpenseModal: () => void;
  onOpenNewInvoiceModal: () => void;
  onOpenCashBankModal: () => void;
  onOpenSettingsModal: () => void;
  onResetDemo: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  settings,
  period,
  setPeriod,
  customRange,
  setCustomRange,
  currentUser,
  pendingExpensesCount,
  onOpenLoginSwitchModal,
  onOpenExpenseSettlementModal,
  onOpenTripSheetsModal,
  onOpenNewTripModal,
  onOpenNewExpenseModal,
  onOpenNewInvoiceModal,
  onOpenCashBankModal,
  onOpenSettingsModal,
  onResetDemo,
}) => {
  const [showCustomRangePicker, setShowCustomRangePicker] = useState(false);
  const [cloudInfo, setCloudInfo] = useState<CloudStatusInfo>(() => cloudSyncService.getStatusInfo());

  useEffect(() => {
    return cloudSyncService.subscribe((info) => {
      setCloudInfo(info);
    });
  }, []);

  const periods: DateFilterPeriod[] = ['Today', 'This Week', 'This Month', 'This Year', 'Custom'];

  const handleDownloadOfflineErpHtml = () => {
    const currentState = dbService.getState();
    const html = generateOfflineErpAppHtml(currentState);
    downloadHtmlFile('Bangash_Transport_Offline_ERP.html', html);
  };

  return (
    <header className="no-print h-16 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Company & Financial year indicator with Logo */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5">
          <img
            src={settings.logoUrl || '/assets/aistudio/Bangash_Transport_Co._Logo_b758f5dc.png'}
            alt={settings.companyName}
            className="w-9 h-9 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs shrink-0"
          />
          <div>
            <h2 className="text-sm font-black text-slate-900 leading-tight truncate max-w-xs sm:max-w-md tracking-tight uppercase">
              {settings.companyName}
            </h2>
            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-600">FY {settings.financialYear}</span>
              <span>•</span>
              <span className="inline-flex items-center text-emerald-600 font-medium">
                <CheckCircle className="w-3 h-3 mr-0.5" /> {settings.accountingBasis} Accounting
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center & Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Date Filter selector */}
        <div className="relative flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1 hidden md:block" />
          <select
            value={period}
            onChange={(e) => {
              const val = e.target.value as DateFilterPeriod;
              setPeriod(val);
              if (val === 'Custom') setShowCustomRangePicker(true);
              else setShowCustomRangePicker(false);
            }}
            className="bg-transparent border-none text-slate-700 font-semibold focus:outline-hidden py-1 px-1 cursor-pointer"
          >
            {periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {period === 'Custom' && (
            <div className="flex items-center space-x-1 pl-1 border-l border-slate-300">
              <input
                type="date"
                value={customRange.startDate}
                onChange={(e) =>
                  setCustomRange({ ...customRange, startDate: e.target.value })
                }
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-700"
              />
              <span className="text-slate-400 text-[10px]">to</span>
              <input
                type="date"
                value={customRange.endDate}
                onChange={(e) =>
                  setCustomRange({ ...customRange, endDate: e.target.value })
                }
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-700"
              />
            </div>
          )}
        </div>

        {/* Quick Action dropdown or buttons */}
        <div className="flex items-center space-x-1.5">
          {/* PENDING TO ADD EXPENSES POPUP BUTTON */}
          {pendingExpensesCount > 0 && (
            <button
              onClick={onOpenExpenseSettlementModal}
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3 py-2 rounded-lg shadow-sm border border-amber-400 animate-pulse cursor-pointer"
              title="Vehicles returned from trip! Click to open and add settled route expenses"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-slate-950" />
              <span>Pending Expenses ({pendingExpensesCount})</span>
            </button>
          )}

          {/* TRIP SHEETS IN PDF BUTTON */}
          <button
            onClick={onOpenTripSheetsModal}
            className="hidden sm:flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-2.5 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="View & Print Detailed Trip Sheets One by One with costs & calculations"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Trip Sheets (PDF)</span>
            <span className="md:hidden">Sheets</span>
          </button>

          {/* OFFLINE HTML DOWNLOAD BUTTON */}
          <button
            onClick={handleDownloadOfflineErpHtml}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Download complete standalone ERP application as a single .HTML file to use offline without internet"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">.HTML (Offline)</span>
            <span className="md:hidden">.HTML</span>
          </button>

          <button
            onClick={onOpenNewTripModal}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Trip</span>
          </button>

          <button
            onClick={onOpenNewExpenseModal}
            className="hidden xl:flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-2.5 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Log Direct or Operating Expense Voucher"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Expense</span>
          </button>

          <button
            onClick={onOpenNewInvoiceModal}
            className="hidden xl:flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Create Freight Invoice"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Invoice</span>
          </button>
        </div>

        {/* CLOUD FIRESTORE DATABASE STATUS PILL */}
        <div
          onClick={onOpenSettingsModal}
          className="hidden md:flex items-center space-x-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl border border-slate-700 shadow-xs text-xs cursor-pointer hover:bg-slate-800 transition"
          title="Cloud Firestore Database Connected. Real-time multi-terminal sync active. Click to view Cloud DB details."
        >
          <div className="flex items-center space-x-1.5">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  cloudInfo.status === 'syncing' ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  cloudInfo.status === 'syncing' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              ></span>
            </span>
            <span className="font-extrabold text-[11px] tracking-wide text-slate-200">
              {cloudInfo.status === 'syncing' ? 'Syncing...' : 'Cloud Firestore'}
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-[10px] font-bold text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            {cloudInfo.entryCount} Entries
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cloudSyncService.pushToCloud();
            }}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition cursor-pointer"
            title="Push latest entries to Firebase Cloud Database"
          >
            <CloudUpload className={`w-3.5 h-3.5 ${cloudInfo.status === 'syncing' ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        {/* 6 LOGINS USER PROFILE PILL */}
        <button
          onClick={onOpenLoginSwitchModal}
          className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 p-1.5 pr-2.5 rounded-xl transition cursor-pointer"
          title={
            currentUser?.role === 'Admin'
              ? 'Logged in as Administrator (Malik Bangash). Click to switch user (6 Accounts).'
              : 'Logged in as Staff. Only Admin can change user login (Admin PIN required).'
          }
        >
          <div
            className={`w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center relative ${
              currentUser?.avatarBg || 'bg-slate-800'
            }`}
          >
            {currentUser?.fullName
              ? currentUser.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
              : 'U'}
            {currentUser?.role !== 'Admin' && (
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 border border-white">
                <Lock className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
          <div className="text-left hidden lg:block leading-none">
            <div className="text-xs font-black text-slate-900 flex items-center gap-1">
              <span>{currentUser?.fullName || 'User'}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-bold mt-0.5 flex items-center gap-1">
              <span>{currentUser?.role || 'Staff'}</span>
              <span>•</span>
              <span className={currentUser?.role === 'Admin' ? 'text-emerald-700' : 'text-amber-700'}>
                {currentUser?.role === 'Admin' ? 'Admin Access' : 'Locked'}
              </span>
            </div>
          </div>
        </button>

        {/* Secondary utilities */}
        <div className="flex items-center space-x-1 border-l border-slate-200 pl-2">
          <button
            onClick={() => window.print()}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Print Document / Screen"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSettingsModal}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="System Settings, User Logins & Database Backup"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (window.confirm('Reset database to realistic default demo dataset?')) {
                onResetDemo();
              }
            }}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Reset to Demo Data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
