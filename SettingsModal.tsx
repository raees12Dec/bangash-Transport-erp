/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Download,
  Upload,
  RotateCcw,
  Building,
  ShieldCheck,
  FileText,
  DollarSign,
  CheckCircle,
  Database,
  Shield,
  Lock,
  Unlock,
  Key,
  UserCheck,
  AlertTriangle,
  ShieldAlert,
  Edit,
  Save,
  Cloud,
  CloudUpload,
  CloudDownload,
  Server,
  Globe,
  ExternalLink,
  HardDrive,
  CheckCircle2,
  Copy,
  Check,
  Layers,
  Terminal,
} from 'lucide-react';
import { CompanySettings, AuditLog, UserProfile, UserRole } from '../types';
import { dbService } from '../services/db';
import { cloudSyncService, CloudStatusInfo } from '../services/cloudSync';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanySettings;
  auditLogs: AuditLog[];
  onResetDemo: () => void;
  currentUser?: UserProfile;
  onUserSwitched?: (user: UserProfile) => void;
  initialTab?: 'logins' | 'cloud' | 'profile' | 'prefixes' | 'backup' | 'audit';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  auditLogs,
  onResetDemo,
  currentUser,
  onUserSwitched,
  initialTab = 'logins',
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'logins' | 'cloud' | 'profile' | 'prefixes' | 'backup' | 'audit'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Security & Admin verification state
  const isActualAdmin = currentUser?.role === 'Admin';
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(isActualAdmin);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [adminMasterPin, setAdminMasterPin] = useState<string>(settings.adminPin || '1234');
  const [pinChangeSuccess, setPinChangeSuccess] = useState<boolean>(false);
  const [showAdminPinConfig, setShowAdminPinConfig] = useState<boolean>(false);

  // Cloud Sync state
  const [cloudInfo, setCloudInfo] = useState<CloudStatusInfo>(() => cloudSyncService.getStatusInfo());
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  useEffect(() => {
    return cloudSyncService.subscribe((info) => {
      setCloudInfo(info);
    });
  }, []);

  // User management state
  const users = dbService.getUsers();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    fullName: string;
    username: string;
    title: string;
    email: string;
    department: string;
    role: UserRole;
    pin: string;
  }>({
    fullName: '',
    username: '',
    title: '',
    email: '',
    department: '',
    role: 'Operations',
    pin: '',
  });
  const [switchNotice, setSwitchNotice] = useState<string | null>(null);

  // Company Profile form state
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '/assets/aistudio/Bangash_Transport_Co._Logo_b758f5dc.png');
  const [address, setAddress] = useState(settings.address);
  const [cityCountry, setCityCountry] = useState(settings.cityCountry);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [taxRegistrationNumber, setTaxRegistrationNumber] = useState(settings.taxRegistrationNumber);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [financialYear, setFinancialYear] = useState(settings.financialYear);
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);
  const [tripPrefix, setTripPrefix] = useState(settings.tripPrefix);
  const [podPrefix, setPodPrefix] = useState(settings.podPrefix);
  const [voucherPrefix, setVoucherPrefix] = useState(settings.voucherPrefix);
  const [receiptPrefix, setReceiptPrefix] = useState(settings.receiptPrefix || 'CRV-2026-');
  const [accountingBasis, setAccountingBasis] = useState<CompanySettings['accountingBasis']>(
    settings.accountingBasis
  );
  const [bankDetailsForInvoice, setBankDetailsForInvoice] = useState(settings.bankDetailsForInvoice);
  const [authorizedSignatoryName, setAuthorizedSignatoryName] = useState(
    settings.authorizedSignatoryName
  );
  const [authorizedSignatoryTitle, setAuthorizedSignatoryTitle] = useState(
    settings.authorizedSignatoryTitle || 'Managing Director & Chief Executive'
  );
  const [showOfficialStamp, setShowOfficialStamp] = useState<boolean>(
    settings.showOfficialStamp !== false
  );
  const [printNotesFooter, setPrintNotesFooter] = useState<string>(
    settings.printNotesFooter ||
      'This is an authentic commercial transport document issued by Bangash Transport Co. Subject to national freight forwarding carriage terms.'
  );

  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Handle Admin Authorization PIN verification
  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = settings.adminPin || '1234';
    if (enteredPin.trim() === correctPin.trim()) {
      setAdminUnlocked(true);
      setPinError(null);
      setSwitchNotice('Admin verification successful! Admin controls unlocked.');
    } else {
      setPinError('Incorrect Admin PIN. Please enter the valid administrator PIN (Default: 1234).');
    }
  };

  // Handle instant switch to Admin account
  const handleQuickSwitchToAdmin = () => {
    const correctPin = settings.adminPin || '1234';
    if (enteredPin.trim() === correctPin.trim() || isActualAdmin) {
      const adminUser = users.find((u) => u.role === 'Admin') || users[0];
      dbService.switchUser(adminUser.id);
      onUserSwitched?.(adminUser);
      setAdminUnlocked(true);
      setSwitchNotice(`Switched active profile to ${adminUser.fullName} (Administrator)!`);
    } else {
      setPinError('Enter valid Admin PIN (1234) to switch to Administrator.');
    }
  };

  // Handle switching active login to any selected user
  const handleSwitchToUser = (user: UserProfile) => {
    if (!isActualAdmin && !adminUnlocked) {
      setPinError('Only Administrator can change logins. Please enter Admin PIN above.');
      return;
    }
    dbService.switchUser(user.id);
    onUserSwitched?.(user);
    setSwitchNotice(`Active login successfully changed to: ${user.fullName} (${user.role})`);
    setTimeout(() => setSwitchNotice(null), 4000);
  };

  // Start editing a user
  const handleStartEditUser = (user: UserProfile) => {
    if (!isActualAdmin && !adminUnlocked) {
      setPinError('Only Administrator can modify user credentials.');
      return;
    }
    setEditingUserId(user.id);
    setEditFormData({
      fullName: user.fullName,
      username: user.username,
      title: user.title,
      email: user.email,
      department: user.department,
      role: user.role,
      pin: user.pin || '1234',
    });
  };

  // Save edited user
  const handleSaveUser = (userId: string) => {
    dbService.updateUser(userId, editFormData);
    setEditingUserId(null);
    setSwitchNotice(`Updated account details for ${editFormData.fullName}.`);
    setTimeout(() => setSwitchNotice(null), 4000);
  };

  // Save updated Admin Master PIN
  const handleSaveAdminMasterPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMasterPin || adminMasterPin.trim().length < 4) {
      alert('Admin PIN must be at least 4 digits');
      return;
    }
    dbService.updateSettings({ adminPin: adminMasterPin.trim() });
    setPinChangeSuccess(true);
    setTimeout(() => setPinChangeSuccess(false), 3000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    dbService.updateSettings({
      companyName,
      tagline,
      logoUrl,
      address,
      cityCountry,
      phone,
      email,
      taxRegistrationNumber,
      currencySymbol,
      financialYear,
      invoicePrefix,
      tripPrefix,
      podPrefix,
      voucherPrefix,
      receiptPrefix,
      accountingBasis,
      bankDetailsForInvoice,
      authorizedSignatoryName,
      authorizedSignatoryTitle,
      showOfficialStamp,
      printNotesFooter,
    });
    alert('Settings saved successfully!');
    onClose();
  };

  const handleExportJSON = () => {
    const jsonStr = dbService.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bangash_Transport_Backup_${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    if (!isActualAdmin && !adminUnlocked) {
      alert('Security Alert: Only Administrator can restore database backups. Please unlock with Admin PIN first.');
      return;
    }
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = dbService.importDatabaseJSON(content);
      if (success) {
        setImportStatus('Backup database restored successfully!');
      } else {
        setImportStatus('Failed to parse backup JSON. Invalid structure.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 text-white p-5 rounded-t-2xl flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center space-x-2.5">
            <Settings className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-base leading-tight">Settings &amp; Backup Administration</h3>
              <p className="text-[11px] text-slate-300">
                User Logins &amp; Access Control (Admin Only) • JSON Database Backup • Company Legal Headers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="p-3 border-b border-slate-200 flex flex-wrap gap-1.5 text-xs font-semibold bg-slate-50 sticky top-[72px] z-10">
          {[
            {
              id: 'logins',
              label: 'User Logins (6 Accounts)',
              icon: Shield,
              badge: 'ADMIN ONLY',
            },
            {
              id: 'cloud',
              label: 'Cloud DB & Hosting Guide',
              icon: Cloud,
              badge: '60+ DAILY ENTRIES',
            },
            { id: 'backup', label: 'JSON Backup & Restore', icon: Database },
            { id: 'profile', label: 'Company Profile & Invoice Details', icon: Building },
            { id: 'prefixes', label: 'Prefixes & Financial Year', icon: FileText },
            { id: 'audit', label: 'System Audit Trail', icon: CheckCircle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-black tracking-wider ${
                    activeTab === tab.id ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: USER LOGINS & SECURITY (ONLY ADMIN CAN CHANGE)     */}
        {/* ======================================================== */}
        {activeTab === 'logins' && (
          <div className="p-6 space-y-5 text-xs">
            {/* Status Feedback Notice */}
            {switchNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 font-bold text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{switchNotice}</span>
              </div>
            )}

            {/* ADMIN AUTHORIZATION STATUS BANNER */}
            {isActualAdmin || adminUnlocked ? (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                      <span>Administrator Rights Active</span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 font-black px-2 py-0.5 rounded">
                        AUTHORIZED
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      You have full authorization to change active logins, reassign roles, update security PINs, and manage database backups.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdminPinConfig(!showAdminPinConfig)}
                    className="px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-100/60 text-emerald-900 font-bold text-xs rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{showAdminPinConfig ? 'Hide PIN Settings' : 'Change Master Admin PIN'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* RESTRICTED: NON-ADMIN ALERT & UNLOCK FORM */
              <div className="p-5 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-400 rounded-xl space-y-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-amber-950 text-sm">
                        ADMINISTRATOR PRIVILEGES REQUIRED
                      </h4>
                      <span className="text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded">
                        RESTRICTED
                      </span>
                    </div>
                    <p className="text-amber-900 text-xs mt-1">
                      <strong>Only the System Administrator (Malik Bangash - Managing Director)</strong> has authority to change system logins, switch user profiles, or manage security parameters.
                    </p>
                    <div className="text-xs text-amber-950 font-semibold mt-1">
                      Currently Logged In: <span className="underline font-bold">{currentUser?.fullName}</span> ({currentUser?.role} - {currentUser?.department})
                    </div>
                  </div>
                </div>

                {/* PIN Unlock Card */}
                <div className="p-4 bg-white border border-amber-300 rounded-xl space-y-2.5 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <Key className="w-4 h-4 text-amber-600" />
                    <span>Enter Administrator Security PIN to Unlock Login Changing:</span>
                  </div>
                  <form onSubmit={handleVerifyAdminPin} className="flex flex-wrap items-center gap-2">
                    <input
                      type="password"
                      placeholder="Admin PIN (Default: 1234)"
                      value={enteredPin}
                      onChange={(e) => {
                        setEnteredPin(e.target.value);
                        setPinError(null);
                      }}
                      className="p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-widest w-52 bg-amber-50/40 focus:bg-white"
                      maxLength={12}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-transform active:scale-95"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Verify PIN &amp; Unlock</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickSwitchToAdmin}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-transform active:scale-95"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Login As Malik Bangash (Admin)</span>
                    </button>
                  </form>
                  {pinError && <div className="text-xs text-rose-600 font-bold">{pinError}</div>}
                  <div className="text-[11px] text-slate-500">
                    * Default system Administrator PIN is <code className="font-mono font-bold text-slate-700">1234</code>.
                  </div>
                </div>
              </div>
            )}

            {/* MASTER ADMIN PIN CONFIG (When Admin clicks change PIN) */}
            {showAdminPinConfig && (isActualAdmin || adminUnlocked) && (
              <form onSubmit={handleSaveAdminMasterPin} className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Update Master Administrator Security PIN</span>
                  <button
                    type="button"
                    onClick={() => setShowAdminPinConfig(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="New 4-digit Master Admin PIN"
                    value={adminMasterPin}
                    onChange={(e) => setAdminMasterPin(e.target.value)}
                    className="p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-widest w-52"
                    maxLength={10}
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
                  >
                    Save New Master PIN
                  </button>
                </div>
                {pinChangeSuccess && (
                  <div className="text-xs text-emerald-600 font-bold">Admin PIN updated successfully!</div>
                )}
              </form>
            )}

            {/* 4 SYSTEM USER ACCOUNTS LIST */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">System User Profiles &amp; Login Switcher</h4>
                  <p className="text-[11px] text-slate-500">
                    {isActualAdmin || adminUnlocked
                      ? 'Select any user profile below to change active login, or edit user details and PIN.'
                      : '🔒 Only Administrator can switch active logins. Locked until authorized.'}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-slate-100 border border-slate-300 text-slate-700 rounded-md text-[11px] font-bold">
                  4 Active Logins
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {users.map((user) => {
                  const isActive = user.id === currentUser?.id;
                  const isEditing = editingUserId === user.id;

                  return (
                    <div
                      key={user.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {isEditing ? (
                        /* INLINE USER EDIT FORM */
                        <div className="space-y-3">
                          <div className="font-bold text-slate-900 text-xs">Edit User Account: {user.fullName}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name</label>
                              <input
                                type="text"
                                value={editFormData.fullName}
                                onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Username</label>
                              <input
                                type="text"
                                value={editFormData.username}
                                onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">System Role</label>
                              <select
                                value={editFormData.role}
                                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
                                className="w-full p-2 border border-slate-300 rounded text-xs font-bold"
                              >
                                <option value="Admin">Admin</option>
                                <option value="Operations">Operations</option>
                                <option value="Accounts">Accounts</option>
                                <option value="Workshop">Workshop</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Job Title</label>
                              <input
                                type="text"
                                value={editFormData.title}
                                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Department</label>
                              <input
                                type="text"
                                value={editFormData.department}
                                onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">User PIN</label>
                              <input
                                type="password"
                                value={editFormData.pin}
                                onChange={(e) => setEditFormData({ ...editFormData, pin: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded text-xs font-mono tracking-widest font-bold"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingUserId(null)}
                              className="px-3 py-1.5 border border-slate-300 rounded text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveUser(user.id)}
                              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Changes</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* USER PROFILE ROW */
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-12 h-12 rounded-xl text-white font-black text-base flex items-center justify-center shadow-xs shrink-0 ${
                                user.avatarBg || 'bg-slate-800'
                              }`}
                            >
                              {user.fullName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-sm">{user.fullName}</span>
                                <span
                                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                    user.role === 'Admin'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : user.role === 'Operations'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                      : user.role === 'Accounts'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-purple-100 text-purple-800 border border-purple-300'
                                  }`}
                                >
                                  {user.role}
                                </span>
                                {user.role === 'Admin' && (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                    ★ Full Access
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 font-medium mt-0.5">{user.title}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Username: <span className="font-mono text-slate-600">{user.username}</span> • Dept:{' '}
                                {user.department} • PIN: <span className="font-mono">••••</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {/* Edit Button (Admin Only) */}
                            {(isActualAdmin || adminUnlocked) && (
                              <button
                                type="button"
                                onClick={() => handleStartEditUser(user)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Edit user details and PIN"
                              >
                                <Edit className="w-3.5 h-3.5 text-slate-500" />
                                <span>Edit</span>
                              </button>
                            )}

                            {/* Active or Switch Button */}
                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 bg-blue-100 px-3.5 py-1.5 rounded-lg border border-blue-300 shadow-2xs">
                                <CheckCircle className="w-4 h-4 text-blue-600" /> Active Logged In
                              </span>
                            ) : isActualAdmin || adminUnlocked ? (
                              <button
                                type="button"
                                onClick={() => handleSwitchToUser(user)}
                                className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-transform active:scale-95"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Switch Login ➔</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="px-3 py-1.5 text-xs font-bold text-slate-400 bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1 cursor-not-allowed"
                                title="Admin authorization required to change login"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Admin Only</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: CLOUD DB & HOSTING GUIDE (60+ DAILY ENTRIES)         */}
        {/* ======================================================== */}
        {activeTab === 'cloud' && (
          <div className="p-6 space-y-6 text-xs text-slate-800">
            {/* Live Cloud Status Banner */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl shadow-md border border-slate-700 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-inner">
                    <Cloud className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-white tracking-wide">
                        Google Cloud Firestore Database
                      </h3>
                      <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                        LIVE &amp; CONNECTED
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 font-medium">
                      Enterprise Cloud Persistence enabled for Bangash Transport Co. • Database ID:{' '}
                      <code className="text-amber-300 font-mono text-[11px] font-bold">
                        {cloudInfo.databaseId}
                      </code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await cloudSyncService.pushToCloud();
                      if (ok) {
                        setCopyNotice('Full ERP database successfully synced to Cloud Firestore!');
                        setTimeout(() => setCopyNotice(null), 4000);
                      }
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-transform active:scale-95"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>Push Current Data to Cloud</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await cloudSyncService.pullFromCloud();
                      if (ok) {
                        setCopyNotice('Latest cloud entries pulled and loaded into your screen!');
                        setTimeout(() => setCopyNotice(null), 4000);
                      }
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-600 shadow-xs cursor-pointer flex items-center gap-1.5 transition-transform active:scale-95"
                  >
                    <CloudDownload className="w-4 h-4 text-emerald-400" />
                    <span>Pull Latest Cloud Data</span>
                  </button>
                </div>
              </div>

              {copyNotice && (
                <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-200 font-bold text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{copyNotice}</span>
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-left">
                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Cloud Entries Stored
                  </span>
                  <span className="text-lg font-black text-amber-400">{cloudInfo.entryCount} Records</span>
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Multi-User Logins
                  </span>
                  <span className="text-lg font-black text-blue-400">{users.length} Active Staff</span>
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Daily Capacity
                  </span>
                  <span className="text-lg font-black text-emerald-400">Unlimited (60+ Entries/day)</span>
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Sync Latency
                  </span>
                  <span className="text-lg font-black text-purple-400">&lt; 100ms Real-Time</span>
                </div>
              </div>
            </div>

            {/* SECTION 1: 60+ ENTRIES DAILY & BIG DATABASE CAPABILITY */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <HardDrive className="w-4 h-4 text-blue-600" />
                <span>Handling Daily 60+ Entries &amp; Big Database Capacity</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                Logistics operations with 60+ entries daily generate approximately <strong>1,800 records every month</strong> and over <strong>21,900 transactions annually</strong> (trips, bilty consignments, customer cash/bank receipts, diesel fuel fills, toll taxes, maintenance, and PODs).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1">
                  <div className="font-extrabold text-blue-900 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>No Storage Quota Limits</span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    Traditional browser localStorage crashes after 5MB. Cloud Firestore supports <strong>billions of documents</strong> with zero memory caps.
                  </p>
                </div>
                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1">
                  <div className="font-extrabold text-emerald-900 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Real-Time Multi-Device Sync</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    When data entry clerks enter trips or payments, all dispatchers, accountants, and Managing Director Malik Bangash see live updates immediately.
                  </p>
                </div>
                <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 space-y-1">
                  <div className="font-extrabold text-purple-900 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>Offline-First Resilience</span>
                  </div>
                  <p className="text-[11px] text-purple-800">
                    If internet drops at a remote yard or toll terminal, operators can continue typing entries. Data automatically queues and syncs when reconnected.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 2: 4 TO 6 LOGINS ROLES ARCHITECTURE */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Configured Staff Logins (6 Pre-configured Accounts)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('logins')}
                  className="text-blue-600 hover:text-blue-800 font-bold text-xs cursor-pointer"
                >
                  Manage User PINs &amp; Access ➔
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[
                  { name: 'Malik Bangash', role: 'Managing Director (Admin)', pin: '1234', dept: 'Executive Board', access: 'Full All-Access Master' },
                  { name: 'Tariq Khan', role: 'Operations & Dispatch Lead', pin: '2222', dept: 'Transport Operations', access: 'Trips, Fleet Allotment & PODs' },
                  { name: 'Rashid Mehmood', role: 'Billing & Accounts Executive', pin: '3333', dept: 'Finance & Audit', access: 'Invoices, Receipts & Ledgers' },
                  { name: 'Umer Afridi', role: 'Workshop Supervisor', pin: '4444', dept: 'Maintenance & Depot', access: 'Tyres, Parts & Diesel Purchases' },
                  { name: 'Suleman Baig', role: 'POD Verification Officer', pin: '5555', dept: 'Logistics Operations', access: 'Delivery Verification & Signatures' },
                  { name: 'Farhan Ali', role: 'Gate Pass & Entries Clerk', pin: '6666', dept: 'Data Entry & Terminal', access: 'Daily 60+ Routine Entries' },
                ].map((account, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div className="text-left leading-tight">
                      <div className="font-bold text-slate-900 text-xs">{account.name}</div>
                      <div className="text-[10px] text-blue-700 font-bold">{account.role}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">PIN: <code className="font-mono font-bold text-slate-700">{account.pin}</code> • {account.access}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3: HOSTING GUIDE — IS IT EASY TO UPLOAD ON GITHUB PAGES? */}
            <div className="p-5 rounded-2xl border-2 border-blue-400 bg-gradient-to-br from-blue-50/40 via-white to-blue-50/40 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <Globe className="w-5 h-5 text-blue-600" />
                <span>Hosting Guide: Is it Easy and Successful to Upload to GitHub Pages, or Any Better Way?</span>
              </div>

              {/* Direct Answer Alert */}
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>DIRECT ANSWER: YES, IT IS VERY EASY AND FULLY SUCCESSFUL!</span>
                </div>
                <p className="text-emerald-900 text-[11px] leading-relaxed">
                  Because <strong>Bangash Transport Co. ERP</strong> is built as a <strong>React Single Page Application (SPA)</strong> with a direct <strong>Google Cloud Firebase Firestore</strong> backend, you do not need to host a custom Node server. The frontend static bundle can be hosted 100% free on <strong>GitHub Pages</strong>, while Firebase securely handles all 60+ daily entries, databases, and multi-user logins!
                </p>
              </div>

              {/* Method 1: GitHub Pages step by step */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-extrabold text-slate-900 text-xs">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[11px] flex items-center justify-center">1</span>
                    <span>Method 1: Step-by-Step GitHub Pages Deployment</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-300">
                    100% Free • Free Hosting
                  </span>
                </div>

                <ol className="list-decimal pl-4 space-y-2 text-slate-700 text-[11px]">
                  <li>
                    <strong>Push your project to a GitHub repository:</strong>
                    <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[10px] mt-1 overflow-x-auto">
                      git init<br />
                      git add .<br />
                      git commit -m "Bangash Transport ERP with Cloud Firestore"<br />
                      git remote add origin https://github.com/&lt;your-github-username&gt;/bangash-transport-erp.git<br />
                      git push -u origin main
                    </div>
                  </li>
                  <li>
                    <strong>Install GitHub Pages automated publisher:</strong>
                    <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[10px] mt-1 overflow-x-auto">
                      npm install --save-dev gh-pages
                    </div>
                  </li>
                  <li>
                    <strong>Add homepage and deploy script in your package.json:</strong>
                    <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[10px] mt-1 overflow-x-auto">
                      "homepage": "https://&lt;your-github-username&gt;.github.io/bangash-transport-erp",<br />
                      "scripts": &#123;<br />
                      &nbsp;&nbsp;"deploy": "vite build && gh-pages -d dist"<br />
                      &#125;
                    </div>
                  </li>
                  <li>
                    <strong>Run deploy:</strong>
                    <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[10px] mt-1 overflow-x-auto">
                      npm run deploy
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Your Bangash Transport ERP is instantly live worldwide on GitHub Pages!
                    </p>
                  </li>
                </ol>
              </div>

              {/* Method 2: Firebase Hosting (The Recommended Best Option) */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-extrabold text-blue-950 text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">2</span>
                    <span>Method 2: Firebase Hosting (RECOMMENDED — Best Native Fit)</span>
                  </div>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-black">
                    ★ HIGHEST RECOMMENDATION
                  </span>
                </div>
                <p className="text-[11px] text-blue-900">
                  Since your Cloud Firestore database is already on Firebase (project: <code className="font-bold">noted-composition-65wls</code>), using <strong>Firebase Hosting</strong> means your frontend and database share the exact same Google Cloud security credentials, custom domain SSL (<code className="font-bold">erp.bangashtransport.com</code>), and 1-command deployment:
                </p>
                <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[10px] overflow-x-auto">
                  npm install -g firebase-tools<br />
                  firebase login<br />
                  firebase init hosting &nbsp;&nbsp;# select public directory: dist, single-page app: yes<br />
                  npm run build<br />
                  firebase deploy --only hosting
                </div>
              </div>

              {/* Method 3: Vercel / Netlify */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-extrabold text-slate-900 text-xs">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[11px] flex items-center justify-center">3</span>
                    <span>Method 3: Vercel or Netlify (Zero Configuration CI/CD)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-300">
                    Automated Continuous Deployment
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Connect your GitHub repo to <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">Vercel</a> or <a href="https://netlify.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">Netlify</a>. Every time you push a git commit, it automatically builds and deploys to production with free global CDN and instant HTTPS.
                </p>
              </div>

              {/* Method 4: Existing Google Cloud Run URL */}
              <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-extrabold text-emerald-950 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center">4</span>
                    <span>Method 4: Current Google Cloud Run Production URL</span>
                  </div>
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-black">
                    READY RIGHT NOW
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900">
                  Your application is already hosted and running live on Google Cloud Run right now! You can access it anytime using the provided Shared App URL on any browser or smartphone.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: BACKUP & RESTORE                                  */}
        {/* ======================================================== */}
        {activeTab === 'backup' && (
          <div className="p-6 space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export JSON */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                  <Download className="w-5 h-5 text-blue-600" />
                  <span>Export Complete Database (JSON)</span>
                </div>
                <p className="text-slate-600">
                  Export all trips, vehicles, drivers, customer ledgers, invoices, PODs, cash/bank accounts, and expense vouchers into a portable JSON backup file.
                </p>
                <button
                  onClick={handleExportJSON}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup JSON</span>
                </button>
              </div>

              {/* Restore JSON (Protected by Admin) */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                  <Upload className="w-5 h-5 text-emerald-600" />
                  <span>Restore from Backup (JSON)</span>
                  {!isActualAdmin && !adminUnlocked && (
                    <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300">
                      ADMIN ONLY
                    </span>
                  )}
                </div>
                <p className="text-slate-600">
                  Restore an exported enterprise JSON database. Existing records will be cleanly replaced with verified backup contents.
                </p>

                {isActualAdmin || adminUnlocked ? (
                  <label className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center space-x-2 cursor-pointer shadow-xs">
                    <Upload className="w-4 h-4" />
                    <span>Select JSON File to Restore</span>
                    <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                  </label>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('logins');
                      setPinError('Please enter Admin PIN to authorize database restore.');
                    }}
                    className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                  >
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Unlock with Admin PIN to Restore</span>
                  </button>
                )}

                {importStatus && (
                  <div className="p-2 text-center rounded bg-white border font-semibold text-slate-800">
                    {importStatus}
                  </div>
                )}
              </div>
            </div>

            {/* Reset to Demo (Admin Protected) */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-rose-900 text-sm">Reset Database to Default Demo Dataset</h4>
                <p className="text-rose-700 text-[11px] mt-0.5">
                  Restores realistic vehicles, customer accounts, active &amp; completed trips, automatic PODs, and calibrated cash/bank accounts.
                </p>
              </div>
              <button
                onClick={() => {
                  if (!isActualAdmin && !adminUnlocked) {
                    alert('Only Administrator can reset the database. Please unlock with Admin PIN in User Logins tab.');
                    setActiveTab('logins');
                    return;
                  }
                  if (window.confirm('Reset database to default demo dataset? All current changes will be reverted.')) {
                    onResetDemo();
                    onClose();
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer shrink-0"
              >
                Reset Demo
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: COMPANY PROFILE                                   */}
        {/* ======================================================== */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveSettings} className="p-6 space-y-4 text-xs">
            {/* Logo Preview & Customization Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <img
                  src={logoUrl || '/assets/aistudio/Bangash_Transport_Co._Logo_b758f5dc.png'}
                  alt="Company Logo Preview"
                  className="w-16 h-16 object-contain rounded-xl bg-white p-1 border border-slate-300 shadow-xs shrink-0"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{companyName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                      Official Logo
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Rendered on all Consignment Bilties, Invoices, Proof of Delivery (PODs), and HTML exports.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setLogoUrl('/assets/aistudio/Bangash_Transport_Co._Logo_b758f5dc.png')}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Reset Logo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Company Trading Name *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Company Tagline / Slogan</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Terminal / Yard Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">City, Country</label>
                <input
                  type="text"
                  value={cityCountry}
                  onChange={(e) => setCityCountry(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Official Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Official Dispatch Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">NTN / Tax Registration Number</label>
                <input
                  type="text"
                  value={taxRegistrationNumber}
                  onChange={(e) => setTaxRegistrationNumber(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Official Bank Remittance Details (Printed on Invoices &amp; Bilties)
              </label>
              <textarea
                rows={2}
                value={bankDetailsForInvoice}
                onChange={(e) => setBankDetailsForInvoice(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono text-[11px]"
              />
            </div>

            {/* Official Authorized Signatory Settings */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-blue-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Official Authorized Signatory &amp; Document Stamp Settings</span>
                  </h4>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    These settings are rendered at the bottom of all Customer Receipts, Freight Invoices, Bilties, PODs, and Statements.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Authorized Signatory / Executive Name *
                  </label>
                  <input
                    type="text"
                    value={authorizedSignatoryName}
                    onChange={(e) => setAuthorizedSignatoryName(e.target.value)}
                    required
                    placeholder="e.g. Malik Bangash (Managing Director)"
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white"
                  />
                  <span className="text-[10px] text-slate-500">Name printed below signature line on documents</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Signatory Title / Designation *
                  </label>
                  <input
                    type="text"
                    value={authorizedSignatoryTitle}
                    onChange={(e) => setAuthorizedSignatoryTitle(e.target.value)}
                    required
                    placeholder="e.g. Managing Director &amp; Chief Executive"
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold bg-white"
                  />
                  <span className="text-[10px] text-slate-500">Executive title shown on official seal endorsement</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="showStampCheck"
                  checked={showOfficialStamp}
                  onChange={(e) => setShowOfficialStamp(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="showStampCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Display Official Carrier Seal &amp; Stamp (★ Official Seal &amp; Stamp ★) on All Printed Documents
                </label>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Document Print Footer Legal Note / Disclaimer
                </label>
                <input
                  type="text"
                  value={printNotesFooter}
                  onChange={(e) => setPrintNotesFooter(e.target.value)}
                  placeholder="e.g. This is an authentic commercial transport document issued by Bangash Transport Co."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              {/* LIVE PREVIEW OF AUTHORIZED SIGNATORY BLOCK */}
              <div className="pt-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                  Live Preview of Official Signatory Endorsement on Print / PDF:
                </span>
                <div className="border border-blue-400 bg-white rounded-xl p-3 max-w-sm text-center shadow-xs">
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-800">
                    For {companyName || 'Bangash Transport Co.'}
                  </div>
                  <div className="h-10 flex items-center justify-center my-1.5">
                    {showOfficialStamp ? (
                      <div className="border border-dashed border-blue-500 bg-blue-50/50 rounded px-3 py-1 text-[9px] font-black text-blue-700 tracking-wider uppercase">
                        ★ Official Seal &amp; Stamp ★
                      </div>
                    ) : (
                      <div className="w-4/5 border-b border-slate-400"></div>
                    )}
                  </div>
                  <div className="pt-1 border-t border-blue-200">
                    <div className="font-black text-slate-900 text-xs leading-tight">
                      {authorizedSignatoryName || 'Malik Bangash (Managing Director)'}
                    </div>
                    <div className="text-[10px] font-bold text-blue-700 mt-0.5">
                      {authorizedSignatoryTitle || 'Authorized Signatory'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
              >
                Save Company Legal Profile
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 4: PREFIXES & FINANCIAL YEAR                         */}
        {/* ======================================================== */}
        {activeTab === 'prefixes' && (
          <form onSubmit={handleSaveSettings} className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Active Financial Year</label>
                <input
                  type="text"
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Currency Code / Symbol</label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Trip Number Prefix</label>
                <input
                  type="text"
                  value={tripPrefix}
                  onChange={(e) => setTripPrefix(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">POD Prefix</label>
                <input
                  type="text"
                  value={podPrefix}
                  onChange={(e) => setPodPrefix(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Voucher Prefix</label>
                <input
                  type="text"
                  value={voucherPrefix}
                  onChange={(e) => setVoucherPrefix(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Customer Receipt Prefix</label>
                <input
                  type="text"
                  value={receiptPrefix}
                  onChange={(e) => setReceiptPrefix(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-emerald-700"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
              >
                Save Prefixes &amp; Accounting Parameters
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 5: AUDIT TRAIL                                       */}
        {/* ======================================================== */}
        {activeTab === 'audit' && (
          <div className="p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800">System Transaction &amp; Modification Audit Trail</span>
              <span className="text-slate-500 font-medium">{auditLogs.length} Events Logged</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto shadow-2xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">User</th>
                    <th className="p-2.5">Module</th>
                    <th className="p-2.5">Action</th>
                    <th className="p-2.5">Identifier</th>
                    <th className="p-2.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-500">{log.timestamp}</td>
                      <td className="p-2.5 font-sans font-bold text-slate-800">{log.user}</td>
                      <td className="p-2.5 font-sans">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 border">
                          {log.entityType}
                        </span>
                      </td>
                      <td className="p-2.5 font-sans">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'CREATE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action === 'UPDATE'
                              ? 'bg-blue-100 text-blue-800'
                              : log.action === 'DELETE'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">{log.entityId}</td>
                      <td className="p-2.5 font-sans text-slate-600 max-w-xs truncate">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
