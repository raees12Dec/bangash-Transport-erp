/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { dbService, ERPDatabaseState } from './services/db';
import {
  DateFilterPeriod,
  DateRange,
  getDateRangeFromPeriod,
  computeDashboardKPIs,
} from './services/accountingEngine';
import {
  Trip,
  Customer,
  Invoice,
  POD,
  UserProfile,
} from './types';

// Core UI Components
import { Sidebar, ActiveTab } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { DashboardView } from './components/DashboardView';
import { FleetMarketDashboard } from './components/FleetMarketDashboard';
import { TripManagement } from './components/TripManagement';
import { VehicleManagement } from './components/VehicleManagement';
import { CustomerManagement } from './components/CustomerManagement';
import { DriverManagement } from './components/DriverManagement';
import { PurchaseManagement } from './components/PurchaseManagement';
import { PODManagement } from './components/PODManagement';
import { InvoiceManagement } from './components/InvoiceManagement';
import { CustomerReceiptManagement } from './components/CustomerReceiptManagement';
import { ExpenseManagement } from './components/ExpenseManagement';
import { CustomerLedgerView } from './components/CustomerLedgerView';
import { CashBankManagement } from './components/CashBankManagement';
import { DayBookRegister } from './components/DayBookRegister';
import { ProfitLossView } from './components/ProfitLossView';
import { SupplierManagement } from './components/SupplierManagement';
import { ReportsCenter } from './components/ReportsCenter';

// Modals
import { NewTripModal } from './components/NewTripModal';
import { NewExpenseModal } from './components/NewExpenseModal';
import { NewInvoiceModal } from './components/NewInvoiceModal';
import { TripSheetModal } from './components/TripSheetModal';
import { TripExpenseSettlementModal } from './components/TripExpenseSettlementModal';
import { LoginSwitchModal } from './components/LoginSwitchModal';
import { SettingsModal } from './components/SettingsModal';
import { PrintDocumentsModal } from './components/PrintDocuments';

export default function App() {
  // Database State with real-time sync subscription
  const [dbState, setDbState] = useState<ERPDatabaseState>(() => dbService.getState());

  useEffect(() => {
    const unsubscribe = dbService.subscribe(() => {
      setDbState({ ...dbService.getState() });
    });
    return unsubscribe;
  }, []);

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Accounting Date Range Filter
  const [period, setPeriod] = useState<DateFilterPeriod>('This Month');
  const [customRange, setCustomRange] = useState<DateRange>(() =>
    getDateRangeFromPeriod('This Month')
  );

  const effectiveDateRange = useMemo<DateRange>(() => {
    return getDateRangeFromPeriod(period, customRange.startDate, customRange.endDate);
  }, [period, customRange]);

  // Active User Profile
  const currentUser: UserProfile = useMemo(() => {
    return dbService.getActiveUser();
  }, [dbState.activeUserId, dbState.users]);

  // KPIs and Alerts
  const kpis = useMemo(() => {
    return computeDashboardKPIs(effectiveDateRange);
  }, [dbState, effectiveDateRange]);

  const pendingPODs = useMemo(() => {
    return (dbState.pods || []).filter(
      (p) => p.status !== 'Verified' || !p.deliveryConfirmation
    );
  }, [dbState.pods]);

  const pendingExpensesCount = useMemo(() => {
    return (dbState.trips || []).filter(
      (t) => t.expensesPending && t.status !== 'Cancelled'
    ).length;
  }, [dbState.trips]);

  // Drilldown & Selection States
  const [selectedTripForDetails, setSelectedTripForDetails] = useState<Trip | null>(null);
  const [selectedCustomerIdForLedger, setSelectedCustomerIdForLedger] = useState<string>(() => {
    return dbState.customers && dbState.customers.length > 0 ? dbState.customers[0].id : '';
  });
  const [activeVerifyPodId, setActiveVerifyPodId] = useState<string | null>(null);

  // Modal Open States
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isNewExpenseModalOpen, setIsNewExpenseModalOpen] = useState(false);
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
  const [isTripSheetsModalOpen, setIsTripSheetsModalOpen] = useState(false);
  const [isExpenseSettlementModalOpen, setIsExpenseSettlementModalOpen] = useState(false);
  const [settlementTripId, setSettlementTripId] = useState<string | undefined>(undefined);
  const [isLoginSwitchModalOpen, setIsLoginSwitchModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    'logins' | 'cloud' | 'profile' | 'prefixes' | 'backup' | 'audit'
  >('cloud');

  // Print Document Modal
  const [printModal, setPrintModal] = useState<{
    type: 'bilty' | 'invoice' | 'pod' | 'statement' | 'receipt' | 'voucher' | 'supplier-statement' | null;
    data: any;
  }>({
    type: null,
    data: null,
  });

  const currency = dbState.settings?.currencySymbol || 'PKR';

  // Handlers
  const handleOpenExpenseSettlement = (tripId?: string) => {
    setSettlementTripId(tripId);
    setIsExpenseSettlementModalOpen(true);
  };

  const handleNavigateToCustomerLedger = (customerId: string) => {
    setSelectedCustomerIdForLedger(customerId);
    setActiveTab('customer-ledger');
  };

  const handleQuickVerifyPOD = (podId: string) => {
    setActiveVerifyPodId(podId);
    setActiveTab('pod');
  };

  const handleResetDemo = () => {
    if (window.confirm('Reset all demo data back to default initial records?')) {
      dbService.resetToDemo();
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* LEFT SIDEBAR NAVIGATION */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'trip-sheets') {
            setIsTripSheetsModalOpen(true);
          } else if (tab === 'settings') {
            setSettingsInitialTab('cloud');
            setIsSettingsModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        pendingPODCount={pendingPODs.length}
        pendingExpenseCount={pendingExpensesCount}
        logoUrl={dbState.settings?.logoUrl}
        companyName={dbState.settings?.companyName}
      />

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TOP NAVBAR */}
        <TopNavbar
          settings={dbState.settings}
          period={period}
          setPeriod={setPeriod}
          customRange={customRange}
          setCustomRange={setCustomRange}
          currentUser={currentUser}
          pendingExpensesCount={pendingExpensesCount}
          onOpenLoginSwitchModal={() => setIsLoginSwitchModalOpen(true)}
          onOpenExpenseSettlementModal={() => handleOpenExpenseSettlement()}
          onOpenTripSheetsModal={() => setIsTripSheetsModalOpen(true)}
          onOpenNewTripModal={() => setIsNewTripModalOpen(true)}
          onOpenNewExpenseModal={() => setIsNewExpenseModalOpen(true)}
          onOpenNewInvoiceModal={() => setIsNewInvoiceModalOpen(true)}
          onOpenCashBankModal={() => setActiveTab('cash-bank')}
          onOpenSettingsModal={() => {
            setSettingsInitialTab('cloud');
            setIsSettingsModalOpen(true);
          }}
          onResetDemo={handleResetDemo}
        />

        {/* PAGE CONTENT ROUTER */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
          {activeTab === 'dashboard' && (
            <DashboardView
              kpis={kpis}
              currency={currency}
              trips={dbState.trips || []}
              pendingPODs={pendingPODs}
              accounts={dbState.accounts || []}
              vehicles={dbState.vehicles || []}
              dateRange={effectiveDateRange}
              onSelectTrip={(trip) => {
                setSelectedTripForDetails(trip);
                setActiveTab('trips');
              }}
              onNavigateToTab={(tab) => {
                if (tab === 'trip-sheets') {
                  setIsTripSheetsModalOpen(true);
                } else {
                  setActiveTab(tab);
                }
              }}
              onQuickVerifyPOD={handleQuickVerifyPOD}
              settings={dbState.settings}
            />
          )}

          {activeTab === 'fleet-dashboard' && (
            <FleetMarketDashboard
              settings={dbState.settings}
              currencySymbol={currency}
              onOpenNewTripModal={() => setIsNewTripModalOpen(true)}
              onNavigateToPurchases={() => setActiveTab('purchases')}
            />
          )}

          {activeTab === 'trips' && (
            <TripManagement
              trips={dbState.trips || []}
              customers={dbState.customers || []}
              vehicles={dbState.vehicles || []}
              drivers={dbState.drivers || []}
              currency={currency}
              onSelectTripToPrint={(trip) => setPrintModal({ type: 'bilty', data: trip })}
              onSelectInvoiceToPrint={(invoice) => setPrintModal({ type: 'invoice', data: invoice })}
              onSelectReceiptToPrint={(receipt) => setPrintModal({ type: 'receipt', data: receipt })}
              onOpenNewTripModal={() => setIsNewTripModalOpen(true)}
              selectedTripForDetails={selectedTripForDetails}
              setSelectedTripForDetails={setSelectedTripForDetails}
              settings={dbState.settings}
            />
          )}

          {activeTab === 'vehicles' && (
            <VehicleManagement
              vehicles={dbState.vehicles || []}
              trips={dbState.trips || []}
              drivers={dbState.drivers || []}
              currency={currency}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerManagement
              customers={dbState.customers || []}
              trips={dbState.trips || []}
              invoices={dbState.invoices || []}
              currency={currency}
              onViewCustomerLedger={handleNavigateToCustomerLedger}
              onSelectCustomerToPrintStatement={(cust) =>
                setPrintModal({ type: 'statement', data: cust })
              }
              onViewCustomerReceipts={() => setActiveTab('customer-receipts')}
            />
          )}

          {activeTab === 'drivers' && (
            <DriverManagement
              drivers={dbState.drivers || []}
              trips={dbState.trips || []}
              vehicles={dbState.vehicles || []}
              currency={currency}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchaseManagement
              settings={dbState.settings}
              currencySymbol={currency}
            />
          )}

          {activeTab === 'pod' && (
            <PODManagement
              pods={dbState.pods || []}
              trips={dbState.trips || []}
              onSelectPODToPrint={(pod) => setPrintModal({ type: 'pod', data: pod })}
              activeVerifyPodId={activeVerifyPodId}
              setActiveVerifyPodId={setActiveVerifyPodId}
              settings={dbState.settings}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoiceManagement
              invoices={dbState.invoices || []}
              trips={dbState.trips || []}
              customers={dbState.customers || []}
              accounts={dbState.accounts || []}
              currency={currency}
              onSelectInvoiceToPrint={(inv) => setPrintModal({ type: 'invoice', data: inv })}
              onOpenNewInvoiceModal={() => setIsNewInvoiceModalOpen(true)}
              settings={dbState.settings}
            />
          )}

          {activeTab === 'customer-receipts' && (
            <CustomerReceiptManagement
              customers={dbState.customers || []}
              invoices={dbState.invoices || []}
              trips={dbState.trips || []}
              accounts={dbState.accounts || []}
              transactions={dbState.transactions || []}
              currency={currency}
              settings={dbState.settings}
              onPrintReceipt={(receipt) => setPrintModal({ type: 'receipt', data: receipt })}
              onViewCustomerLedger={handleNavigateToCustomerLedger}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpenseManagement
              vouchers={dbState.expenseVouchers || []}
              categories={dbState.expenseCategories || []}
              trips={dbState.trips || []}
              vehicles={dbState.vehicles || []}
              drivers={dbState.drivers || []}
              accounts={dbState.accounts || []}
              currency={currency}
              onOpenNewExpenseModal={() => setIsNewExpenseModalOpen(true)}
            />
          )}

          {activeTab === 'customer-ledger' && (
            <CustomerLedgerView
              customers={dbState.customers || []}
              selectedCustomerId={selectedCustomerIdForLedger}
              setSelectedCustomerId={setSelectedCustomerIdForLedger}
              dateRange={effectiveDateRange}
              setDateRange={setCustomRange}
              currency={currency}
              onPrintStatement={(cust) => setPrintModal({ type: 'statement', data: cust })}
              settings={dbState.settings}
            />
          )}

          {activeTab === 'cash-bank' && (
            <CashBankManagement
              accounts={dbState.accounts || []}
              transactions={dbState.transactions || []}
              currency={currency}
            />
          )}

          {activeTab === 'day-book' && (
            <DayBookRegister
              dateRange={effectiveDateRange}
              setDateRange={setCustomRange}
              currency={currency}
              settings={dbState.settings}
            />
          )}

          {activeTab === 'profit-loss' && (
            <ProfitLossView
              dateRange={effectiveDateRange}
              setDateRange={setCustomRange}
              currency={currency}
              settings={dbState.settings}
            />
          )}

          {activeTab === 'suppliers' && (
            <SupplierManagement
              suppliers={dbState.suppliers || []}
              accounts={dbState.accounts || []}
              vouchers={dbState.expenseVouchers || []}
              currency={currency}
              settings={dbState.settings}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsCenter
              trips={dbState.trips || []}
              customers={dbState.customers || []}
              vehicles={dbState.vehicles || []}
              drivers={dbState.drivers || []}
              invoices={dbState.invoices || []}
              pods={dbState.pods || []}
              vouchers={dbState.expenseVouchers || []}
              accounts={dbState.accounts || []}
              transactions={dbState.transactions || []}
              suppliers={dbState.suppliers || []}
              currency={currency}
              dateRange={effectiveDateRange}
              settings={dbState.settings}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      <NewTripModal
        isOpen={isNewTripModalOpen}
        onClose={() => setIsNewTripModalOpen(false)}
        customers={dbState.customers || []}
        vehicles={dbState.vehicles || []}
        drivers={dbState.drivers || []}
        currency={currency}
      />

      <NewExpenseModal
        isOpen={isNewExpenseModalOpen}
        onClose={() => setIsNewExpenseModalOpen(false)}
        categories={dbState.expenseCategories || []}
        trips={dbState.trips || []}
        vehicles={dbState.vehicles || []}
        drivers={dbState.drivers || []}
        accounts={dbState.accounts || []}
        currency={currency}
      />

      <NewInvoiceModal
        isOpen={isNewInvoiceModalOpen}
        onClose={() => setIsNewInvoiceModalOpen(false)}
        trips={dbState.trips || []}
        customers={dbState.customers || []}
        currency={currency}
      />

      <TripSheetModal
        isOpen={isTripSheetsModalOpen}
        onClose={() => setIsTripSheetsModalOpen(false)}
        settings={dbState.settings}
        currencySymbol={currency}
      />

      <TripExpenseSettlementModal
        isOpen={isExpenseSettlementModalOpen}
        onClose={() => {
          setIsExpenseSettlementModalOpen(false);
          setSettlementTripId(undefined);
        }}
        selectedTripId={settlementTripId}
        currencySymbol={currency}
      />

      <LoginSwitchModal
        isOpen={isLoginSwitchModalOpen}
        onClose={() => setIsLoginSwitchModalOpen(false)}
        currentUser={currentUser}
        onUserSwitched={() => {
          setIsLoginSwitchModalOpen(false);
        }}
        onOpenSettingsModal={() => {
          setIsLoginSwitchModalOpen(false);
          setSettingsInitialTab('logins');
          setIsSettingsModalOpen(true);
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={dbState.settings}
        auditLogs={dbState.auditLogs || []}
        onResetDemo={handleResetDemo}
        currentUser={currentUser}
        onUserSwitched={() => {
          // updated via subscription
        }}
        initialTab={settingsInitialTab}
      />

      {printModal.type && (
        <PrintDocumentsModal
          type={printModal.type}
          data={printModal.data}
          settings={dbState.settings}
          currency={currency}
          onClose={() => setPrintModal({ type: null, data: null })}
        />
      )}
    </div>
  );
}
