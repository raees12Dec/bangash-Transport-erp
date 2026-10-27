/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Truck,
  CarFront,
  Users,
  UserCheck,
  FileCheck,
  Receipt,
  FileSpreadsheet,
  BookOpen,
  Landmark,
  BookMarked,
  TrendingUp,
  Building2,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wrench,
  ReceiptText,
  Layers,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'fleet-dashboard'
  | 'trip-sheets'
  | 'trips'
  | 'vehicles'
  | 'customers'
  | 'drivers'
  | 'purchases'
  | 'pod'
  | 'invoices'
  | 'customer-receipts'
  | 'expenses'
  | 'customer-ledger'
  | 'cash-bank'
  | 'day-book'
  | 'profit-loss'
  | 'suppliers'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  pendingPODCount: number;
  pendingExpenseCount?: number;
  logoUrl?: string;
  companyName?: string;
}

export type NavSectionKey =
  | 'DASHBOARD'
  | 'OPERATIONS & FLEET'
  | 'ACCOUNTS & LEDGER'
  | 'FINANCIAL REPORTS'
  | 'SYSTEM';

interface NavSectionItem {
  id: ActiveTab;
  label: string;
  icon: any;
  badge?: number | string;
}

interface NavSection {
  key: NavSectionKey;
  title: string;
  icon: any;
  items: NavSectionItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  pendingPODCount,
  pendingExpenseCount = 0,
  logoUrl,
  companyName,
}) => {
  const navSections: NavSection[] = [
    {
      key: 'DASHBOARD',
      title: 'DASHBOARD',
      icon: LayoutDashboard,
      items: [
        { id: 'dashboard' as ActiveTab, label: 'Main Operations Dashboard', icon: LayoutDashboard },
        { id: 'fleet-dashboard' as ActiveTab, label: 'Fleet & Market 2nd Dashboard', icon: CarFront },
      ],
    },
    {
      key: 'OPERATIONS & FLEET',
      title: 'OPERATIONS & FLEET',
      icon: Truck,
      items: [
        {
          id: 'trips' as ActiveTab,
          label: 'Trip Management',
          icon: Truck,
          badge: pendingExpenseCount > 0 ? pendingExpenseCount : undefined,
        },
        { id: 'trip-sheets' as ActiveTab, label: 'Trip Sheets (PDF)', icon: FileText },
        { id: 'vehicles' as ActiveTab, label: 'Vehicle Master', icon: CarFront },
        { id: 'customers' as ActiveTab, label: 'Customer Master', icon: Users },
        { id: 'drivers' as ActiveTab, label: 'Drivers & Payroll', icon: UserCheck },
        { id: 'purchases' as ActiveTab, label: 'Purchases (Tyres/Parts/Fuel)', icon: Wrench },
        {
          id: 'pod' as ActiveTab,
          label: 'Proof of Delivery (POD)',
          icon: FileCheck,
          badge: pendingPODCount > 0 ? pendingPODCount : undefined,
        },
        {
          id: 'cash-bank' as ActiveTab,
          label: 'Banks & Cash (Add/Edit Balances)',
          icon: Landmark,
        },
      ],
    },
    {
      key: 'ACCOUNTS & LEDGER',
      title: 'ACCOUNTS & LEDGER',
      icon: BookOpen,
      items: [
        { id: 'invoices' as ActiveTab, label: 'Freight Invoices', icon: Receipt },
        { id: 'customer-receipts' as ActiveTab, label: 'Receipt from Customers', icon: ReceiptText },
        { id: 'customer-ledger' as ActiveTab, label: 'Customer Ledger', icon: BookOpen },
        { id: 'expenses' as ActiveTab, label: 'Expense Vouchers', icon: FileSpreadsheet },
        { id: 'cash-bank' as ActiveTab, label: 'Cash & Bank', icon: Landmark },
        { id: 'day-book' as ActiveTab, label: 'Day Book Register', icon: BookMarked },
        { id: 'suppliers' as ActiveTab, label: 'Suppliers & Party Ledger', icon: Building2 },
      ],
    },
    {
      key: 'FINANCIAL REPORTS',
      title: 'FINANCIAL REPORTS',
      icon: TrendingUp,
      items: [
        { id: 'profit-loss' as ActiveTab, label: 'Profit & Loss (P&L)', icon: TrendingUp },
        { id: 'reports' as ActiveTab, label: 'All 18+ Reports', icon: FileText },
      ],
    },
    {
      key: 'SYSTEM',
      title: 'SYSTEM',
      icon: Settings,
      items: [
        { id: 'settings' as ActiveTab, label: 'Settings & Backup', icon: Settings },
      ],
    },
  ];

  // Helper to find which section owns the current activeTab
  const getSectionForTab = (tab: ActiveTab): NavSectionKey => {
    for (const sec of navSections) {
      if (sec.items.some((item) => item.id === tab)) {
        return sec.key;
      }
    }
    return 'DASHBOARD';
  };

  // State of open/closed dropdowns for each menu section
  // Default: the section containing the activeTab is opened!
  const [openSections, setOpenSections] = useState<Record<NavSectionKey, boolean>>(() => {
    const activeSec = getSectionForTab(activeTab);
    return {
      'DASHBOARD': activeSec === 'DASHBOARD',
      'OPERATIONS & FLEET': activeSec === 'OPERATIONS & FLEET',
      'ACCOUNTS & LEDGER': activeSec === 'ACCOUNTS & LEDGER',
      'FINANCIAL REPORTS': activeSec === 'FINANCIAL REPORTS',
      'SYSTEM': activeSec === 'SYSTEM',
    };
  });

  // Floating popover for collapsed icon mode
  const [collapsedPopoverKey, setCollapsedPopoverKey] = useState<NavSectionKey | null>(null);

  // When activeTab changes from outside (e.g. from top nav or dashboard), auto-open its dropdown
  useEffect(() => {
    const currentSec = getSectionForTab(activeTab);
    setOpenSections((prev) => ({
      ...prev,
      [currentSec]: true,
    }));
  }, [activeTab]);

  const activeSectionKey = getSectionForTab(activeTab);

  // Toggle single section dropdown
  const toggleSection = (key: NavSectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Handle selection from the top dropdown selector
  const handleDropdownSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedKey = e.target.value as NavSectionKey;
    const targetSection = navSections.find((s) => s.key === selectedKey);
    if (targetSection) {
      // Ensure that menu dropdown is opened
      setOpenSections((prev) => ({
        ...prev,
        [selectedKey]: true,
      }));
      // If the currently active tab is not in this section, open the first menu item
      if (!targetSection.items.some((item) => item.id === activeTab)) {
        setActiveTab(targetSection.items[0].id);
      }
    }
  };

  // Expand / Collapse all toggle helper
  const allAreOpen = Object.values(openSections).every(Boolean);
  const toggleAll = () => {
    const nextState = !allAreOpen;
    setOpenSections({
      'DASHBOARD': nextState,
      'OPERATIONS & FLEET': nextState,
      'ACCOUNTS & LEDGER': nextState,
      'FINANCIAL REPORTS': nextState,
      'SYSTEM': nextState,
    });
  };

  return (
    <aside
      className={`no-print transition-all duration-300 ease-in-out bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col h-screen sticky top-0 z-30 select-none ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-3 border-b border-slate-800 bg-slate-950/70 shrink-0">
        {!collapsed ? (
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <img
              src={logoUrl || '/assets/aistudio/Bangash_Transport_Co._Logo_b758f5dc.png'}
              alt={companyName || 'Bangash Transport Co.'}
              className="w-10 h-10 object-contain rounded-lg bg-white p-0.5 shadow-md shrink-0 border border-slate-700"
            />
            <div className="truncate">
              <h1 className="text-xs font-black text-white tracking-wide truncate uppercase">
                {companyName || 'Bangash Transport Co.'}
              </h1>
              <p className="text-[10px] text-amber-400 font-bold tracking-wider uppercase">Goods Forwarding ERP</p>
            </div>
          </div>
        ) : (
          <img
            src={logoUrl || '/assets/aistudio/Bangash_Transport_Co._Logo_b758f5dc.png'}
            alt="Logo"
            className="w-10 h-10 object-contain rounded-lg bg-white p-0.5 shadow-md mx-auto border border-slate-700 cursor-pointer"
            onClick={() => setCollapsed(false)}
            title="Expand Sidebar"
          />
        )}

        <button
          onClick={() => {
            setCollapsed(!collapsed);
            setCollapsedPopoverKey(null);
          }}
          className={`p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer ${
            collapsed ? 'hidden' : 'block'
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* TOP MENU DROPDOWN SELECTOR (When Expanded) */}
      {!collapsed && (
        <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-400" />
              <span>Select Menu / Module:</span>
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-[9px] text-blue-400 hover:text-blue-300 font-bold transition cursor-pointer"
            >
              {allAreOpen ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
          <div className="relative">
            <select
              value={activeSectionKey}
              onChange={handleDropdownSelect}
              className="w-full text-xs font-bold py-2 pl-3 pr-8 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs appearance-none"
            >
              <option value="DASHBOARD">📊 DASHBOARD (2 Views)</option>
              <option value="OPERATIONS & FLEET">🚚 OPERATIONS &amp; FLEET (7 Modules)</option>
              <option value="ACCOUNTS & LEDGER">📑 ACCOUNTS &amp; LEDGER (7 Modules)</option>
              <option value="FINANCIAL REPORTS">📈 FINANCIAL REPORTS (18+ Reports)</option>
              <option value="SYSTEM">⚙️ SYSTEM (Settings &amp; Backup)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Nav List with Collapsible Dropdowns for all 5 sections */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-2">
        {navSections.map((section) => {
          const SectionIcon = section.icon;
          const isOpen = !!openSections[section.key];
          const hasActiveChild = section.items.some((item) => item.id === activeTab);
          const totalBadges = section.items.reduce((sum, item) => {
            const b = typeof item.badge === 'number' ? item.badge : 0;
            return sum + b;
          }, 0);

          if (collapsed) {
            // COLLAPSED ICON MODE: Clicking opens floating popover dropdown
            return (
              <div key={section.key} className="relative flex justify-center py-1">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedPopoverKey(
                      collapsedPopoverKey === section.key ? null : section.key
                    )
                  }
                  title={`${section.title} (${section.items.length} items)`}
                  className={`p-3 rounded-xl transition-all relative cursor-pointer ${
                    hasActiveChild
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <SectionIcon className="w-5 h-5" />
                  {totalBadges > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-slate-900" />
                  )}
                </button>

                {/* Floating Popover Dropdown */}
                {collapsedPopoverKey === section.key && (
                  <div className="absolute left-full top-0 ml-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <SectionIcon className="w-4 h-4 text-blue-400" />
                        <span>{section.title}</span>
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {section.items.length} items
                      </span>
                    </div>
                    <div className="p-1 space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(item.id);
                              setCollapsedPopoverKey(null);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition ${
                              isActive
                                ? 'bg-blue-600 text-white font-bold'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate flex-1">{item.label}</span>
                            {item.badge !== undefined && (
                              <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // EXPANDED SIDEBAR: INTERACTIVE ACCORDION DROPDOWN HEADER
          return (
            <div
              key={section.key}
              className={`rounded-xl border transition-all overflow-hidden ${
                hasActiveChild
                  ? 'border-slate-700/80 bg-slate-950/40 shadow-xs'
                  : 'border-slate-800/60 bg-slate-950/20'
              }`}
            >
              {/* Dropdown Section Header Button */}
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-black tracking-wider transition-colors cursor-pointer ${
                  hasActiveChild
                    ? 'text-blue-400 bg-slate-800/60'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                }`}
                title={`Click to ${isOpen ? 'collapse' : 'open'} ${section.title} menu`}
              >
                <div className="flex items-center gap-2 truncate">
                  <SectionIcon
                    className={`w-4 h-4 shrink-0 ${
                      hasActiveChild ? 'text-blue-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate uppercase text-[11px] font-extrabold tracking-wide">
                    {section.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {totalBadges > 0 && (
                    <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full animate-pulse shadow-xs">
                      {totalBadges}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {section.items.length}
                  </span>
                  <div className={`p-0.5 rounded transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              </button>

              {/* Dropdown Sub-Items List */}
              {isOpen && (
                <div className="p-1 space-y-1 bg-slate-900/60 border-t border-slate-800/80 animate-in slide-in-from-top-1 duration-150">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center rounded-lg transition-all text-xs font-semibold px-3 py-2 space-x-2.5 cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-bold'
                            : 'text-slate-300 hover:bg-slate-800/90 hover:text-white'
                        }`}
                      >
                        <Icon
                          className={`shrink-0 w-3.5 h-3.5 ${
                            isActive ? 'text-white' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate text-left flex-1">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="ml-auto bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer / Toggle & Status */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400 shrink-0">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[11px] font-medium text-slate-300">Offline &amp; Cloud Ready</span>
            </div>
            <button
              onClick={() => {
                setCollapsed(true);
                setCollapsedPopoverKey(null);
              }}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setCollapsed(false);
              setCollapsedPopoverKey(null);
            }}
            className="w-full flex justify-center p-1 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
            title="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );
};
