/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  UserCheck,
  Shield,
  Key,
  CheckCircle,
  Lock,
  Unlock,
  ShieldAlert,
  Settings,
  Plus,
  LogIn,
  Sparkles,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { dbService } from '../services/db';
import { signInWithGoogle } from '../services/firebase';

interface LoginSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUserSwitched: (user: UserProfile) => void;
  onOpenSettingsModal?: () => void;
}

export const LoginSwitchModal: React.FC<LoginSwitchModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserSwitched,
  onOpenSettingsModal,
}) => {
  if (!isOpen) return null;

  const users = dbService.getUsers();
  const settings = dbService.getSettings();
  const isActualAdmin = currentUser.role === 'Admin';

  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(isActualAdmin);
  const [selectedUserForPin, setSelectedUserForPin] = useState<UserProfile | null>(null);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserData, setNewUserData] = useState<{
    fullName: string;
    username: string;
    role: UserRole;
    title: string;
    email: string;
    department: string;
    pin: string;
  }>({
    fullName: '',
    username: '',
    role: 'Operations',
    title: 'Operations Assistant',
    email: '',
    department: 'Dispatch Operations',
    pin: '1234',
  });

  // Verify PIN for admin unlock
  const handleVerifyMasterPin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = settings.adminPin || '1234';
    if (enteredPin.trim() === correctPin.trim()) {
      setAdminUnlocked(true);
      setPinError(null);
    } else {
      setPinError('Incorrect Admin PIN. Default is 1234.');
    }
  };

  // Switch to user with either user PIN or master admin PIN
  const handleConfirmLogin = (user: UserProfile, pinToTest: string) => {
    const userPin = user.pin || '1234';
    const masterAdminPin = settings.adminPin || '1234';

    if (pinToTest.trim() === userPin.trim() || pinToTest.trim() === masterAdminPin.trim() || isActualAdmin || adminUnlocked) {
      dbService.switchUser(user.id);
      onUserSwitched(user);
      onClose();
    } else {
      setPinError(`Incorrect PIN for ${user.fullName}. (Default PIN: ${user.pin || '1234'})`);
    }
  };

  const handleSelectUserCard = (user: UserProfile) => {
    if (user.id === currentUser.id) return;

    if (isActualAdmin || adminUnlocked) {
      // Already unlocked as admin
      dbService.switchUser(user.id);
      onUserSwitched(user);
      onClose();
    } else {
      // Prompt for user's personal PIN or master admin PIN
      setSelectedUserForPin(user);
      setEnteredPin('');
      setPinError(null);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleAuthError(null);
      const user = await signInWithGoogle();
      if (user) {
        // Find existing user or link to admin
        let matching = users.find((u) => u.email?.toLowerCase() === user.email?.toLowerCase());
        if (!matching) {
          // If no matching profile, link as authorized cloud operator
          matching = dbService.addUser({
            username: user.email?.split('@')[0] || 'google.user',
            fullName: user.displayName || 'Cloud Operator',
            role: 'Admin',
            title: 'Google Cloud Authenticated Executive',
            email: user.email || '',
            department: 'Cloud Administration',
            avatarBg: 'bg-blue-600',
            permissions: ['all', 'admin', 'billing', 'fleet'],
            pin: '1234',
            status: 'Active',
          });
        }
        dbService.switchUser(matching.id);
        onUserSwitched(matching);
        onClose();
      }
    } catch (err: any) {
      console.error('Google Auth Failed:', err);
      setGoogleAuthError(err.message || 'Google Sign-in failed. Please retry.');
    }
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.fullName || !newUserData.username) {
      alert('Full name and username are required');
      return;
    }
    const created = dbService.addUser({
      ...newUserData,
      avatarBg:
        newUserData.role === 'Admin'
          ? 'bg-amber-600'
          : newUserData.role === 'Accounts'
          ? 'bg-emerald-600'
          : newUserData.role === 'Workshop'
          ? 'bg-purple-600'
          : 'bg-blue-600',
      permissions:
        newUserData.role === 'Admin'
          ? ['all', 'admin', 'billing', 'fleet']
          : ['trips_read', 'trips_write'],
      status: 'Active',
    });
    setShowAddUserForm(false);
    dbService.switchUser(created.id);
    onUserSwitched(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Bangash Transport Staff Logins ({users.length} Accounts)</h2>
                <span className="text-[10px] bg-blue-500 text-white font-black px-1.5 py-0.5 rounded">
                  MULTI-USER
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Switch between dispatchers, accounts, workshop, and executive profiles with instant PIN authentication
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GOOGLE CLOUD AUTH & MASTER UNLOCK BAR */}
        <div className="p-3.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 shadow-2xs flex items-center gap-1.5 cursor-pointer transition hover:border-blue-400"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google Cloud</span>
            </button>
            <span className="text-slate-400">or</span>
            <span className="text-[11px] text-slate-600 font-medium">Use Staff PIN Login below</span>
          </div>

          {(isActualAdmin || adminUnlocked) ? (
            <button
              type="button"
              onClick={() => setShowAddUserForm(!showAddUserForm)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff Login</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Master Admin PIN: <strong>1234</strong></span>
            </div>
          )}
        </div>

        {googleAuthError && (
          <div className="p-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 font-semibold text-xs px-6">
            {googleAuthError}
          </div>
        )}

        {/* PIN Entry Prompt when selecting a user */}
        {selectedUserForPin && (
          <div className="p-4 bg-blue-50 border-b border-blue-200 text-xs text-blue-900 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-blue-950 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-blue-600" />
                Login as: {selectedUserForPin.fullName} ({selectedUserForPin.title})
              </span>
              <button
                type="button"
                onClick={() => setSelectedUserForPin(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕ Cancel
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmLogin(selectedUserForPin, enteredPin);
              }}
              className="flex items-center gap-2 pt-1"
            >
              <input
                type="password"
                placeholder={`PIN (Default: ${selectedUserForPin.pin || '1234'})`}
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError(null);
                }}
                className="p-2 border border-blue-300 rounded-lg text-xs font-mono font-bold tracking-widest w-48 bg-white"
                maxLength={10}
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In As {selectedUserForPin.fullName.split(' ')[0]}</span>
              </button>
              <button
                type="button"
                onClick={() => handleConfirmLogin(selectedUserForPin, selectedUserForPin.pin || '1234')}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg cursor-pointer"
                title="Quick login with staff default PIN"
              >
                Auto-fill Default PIN
              </button>
            </form>
            {pinError && <div className="text-xs text-rose-600 font-bold">{pinError}</div>}
          </div>
        )}

        {/* Add User Form Accordion */}
        {showAddUserForm && (
          <form onSubmit={handleCreateNewUser} className="p-4 bg-slate-50 border-b border-slate-300 space-y-3 text-xs">
            <div className="font-extrabold text-slate-900">Add New Staff Login Profile</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Asif Qureshi"
                  value={newUserData.fullName}
                  onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-xs font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase">Username</label>
                <input
                  type="text"
                  placeholder="e.g. asif.qureshi"
                  value={newUserData.username}
                  onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value.toLowerCase().replace(/\s+/g, '.') })}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-xs font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase">Role</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-xs font-semibold"
                >
                  <option value="Admin">Admin (Full Access)</option>
                  <option value="Operations">Operations (Trips &amp; Fleet)</option>
                  <option value="Accounts">Accounts (Billing &amp; Ledgers)</option>
                  <option value="Workshop">Workshop (Purchases &amp; Spares)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase">Login PIN</label>
                <input
                  type="text"
                  placeholder="4-digit PIN (e.g. 7777)"
                  value={newUserData.pin}
                  onChange={(e) => setNewUserData({ ...newUserData, pin: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-xs font-mono font-bold"
                  maxLength={6}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddUserForm(false)}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded font-bold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs cursor-pointer"
              >
                Save &amp; Activate Login
              </button>
            </div>
          </form>
        )}

        {/* User Cards Grid */}
        <div className="p-6 space-y-2.5 bg-slate-50 max-h-[55vh] overflow-y-auto">
          {users.map((user) => {
            const isActive = user.id === currentUser.id;

            return (
              <div
                key={user.id}
                onClick={() => handleSelectUserCard(user)}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  isActive
                    ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/30 shadow-sm cursor-default'
                    : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 shadow-xs cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0 ${
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
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
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
                      <span className="text-[10px] text-slate-400 font-mono">PIN: {user.pin || '1234'}</span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium mt-0.5">{user.title}</div>
                    <div className="text-[11px] text-slate-400">
                      Dept: {user.department} • <span className="font-mono text-slate-500">{user.username}</span>
                    </div>
                  </div>
                </div>

                <div>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 bg-blue-100 px-3 py-1 rounded-full border border-blue-300 shadow-2xs">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600" /> Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg cursor-pointer flex items-center gap-1 transition"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Switch ➔</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>* All 6 staff accounts are active with separate credentials.</span>
            {onOpenSettingsModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettingsModal();
                }}
                className="text-blue-600 hover:text-blue-800 font-bold underline flex items-center gap-1 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Open Settings &amp; Cloud Guide</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
