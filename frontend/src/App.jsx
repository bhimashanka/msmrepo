import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import DashboardView from './components/DashboardView';
import PurchasesView from './components/PurchasesView';
import TransfersView from './components/TransfersView';
import AssignmentsView from './components/AssignmentsView';
import AuditTrailView from './components/AuditTrailView';
import { fetchWithAuth } from './api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data lists
  const [users, setUsers] = useState([]);
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Global Filters State
  const [filters, setFilters] = useState({
    base_id: 'all',
    equipment_id: 'all',
    start_date: '',
    end_date: ''
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      setLoading(true);
      // Fetch initial metadata
      const [usersData, basesData, equipData] = await Promise.all([
        fetchWithAuth('/users'),
        fetchWithAuth('/bases'),
        fetchWithAuth('/equipment-types')
      ]);

      setUsers(usersData);
      setBases(basesData);
      setEquipmentTypes(equipData);

      // Default active user is Admin (General Vance)
      if (usersData.length > 0) {
        setCurrentUser(usersData[0]);
      }
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync Base Commander filter lock when switching user role
  const handleSetCurrentUser = (user) => {
    setCurrentUser(user);
    if (user.role === 'base_commander' && user.base_id) {
      setFilters((prev) => ({
        ...prev,
        base_id: user.base_id.toString()
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        base_id: 'all'
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex flex-col items-center justify-center text-cyan-400 font-mono text-sm gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"></div>
        <span>INITIALIZING MILITARY ASSET MANAGEMENT SYSTEM...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans grid-bg">
      {/* Navbar Header with Role Switcher */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        setCurrentUser={handleSetCurrentUser}
        users={users}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Global Filter Bar (Available on Dashboard, Purchases, Transfers, Assignments) */}
        {activeTab !== 'audit' && (
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            bases={bases}
            equipmentTypes={equipmentTypes}
            currentUser={currentUser}
          />
        )}

        {/* View Router */}
        {activeTab === 'dashboard' && (
          <DashboardView
            filters={filters}
            currentUser={currentUser}
            bases={bases}
            equipmentTypes={equipmentTypes}
          />
        )}

        {activeTab === 'purchases' && (
          <PurchasesView
            filters={filters}
            currentUser={currentUser}
            bases={bases}
            equipmentTypes={equipmentTypes}
          />
        )}

        {activeTab === 'transfers' && (
          <TransfersView
            filters={filters}
            currentUser={currentUser}
            bases={bases}
            equipmentTypes={equipmentTypes}
          />
        )}

        {activeTab === 'assignments' && (
          <AssignmentsView
            filters={filters}
            currentUser={currentUser}
            bases={bases}
            equipmentTypes={equipmentTypes}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTrailView currentUser={currentUser} />
        )}
      </main>

      {/* Military Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 px-6 text-center text-[11px] font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CLASSIFIED // FOR OFFICIAL USE ONLY (FOUO)</span>
          <span>MAMS ARCHITECTURE // EXPRESS REST API + REACT + SQLITE</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
