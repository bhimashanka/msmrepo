import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import DashboardView from './components/DashboardView';
import PurchasesView from './components/PurchasesView';
import TransfersView from './components/TransfersView';
import AssignmentsView from './components/AssignmentsView';
import AuditTrailView from './components/AuditTrailView';
import { fetchWithAuth } from './api';

const DEFAULT_BASES = [
  { id: 1, code: 'ALPHA-01', name: 'Fort Alpha HQ', location: 'Sector 1 - Central Command', commander_name: 'General Vance' },
  { id: 2, code: 'BRAVO-02', name: 'Fort Bravo Post', location: 'Sector 2 - Northern Frontier', commander_name: 'Col. Marcus Miller' },
  { id: 3, code: 'CHARLIE-03', name: 'Outpost Charlie', location: 'Sector 3 - Eastern Ridge', commander_name: 'Col. Sarah Davis' },
  { id: 4, code: 'DELTA-04', name: 'Naval Station Delta', location: 'Sector 4 - Coastal Ops', commander_name: 'Capt. Robert Chen' },
  { id: 5, code: 'ECHO-05', name: 'Air Base Echo', location: 'Sector 5 - Western Airfield', commander_name: 'Maj. Elena Rostova' }
];

const DEFAULT_EQUIPMENT = [
  { id: 1, name: 'M4A1 Tactical Carbine', category: 'Weapons', description: 'Standard issue 5.56mm NATO assault rifle', unit_of_measure: 'Units', is_serialized: 1 },
  { id: 2, name: 'Barrett M82 Sniper Rifle', category: 'Weapons', description: '12.7mm (.50 BMG) anti-materiel sniper rifle', unit_of_measure: 'Units', is_serialized: 1 },
  { id: 3, name: 'HMMWV Armored (Humvee)', category: 'Vehicles', description: 'High-Mobility Multipurpose Wheeled Vehicle', unit_of_measure: 'Vehicles', is_serialized: 1 },
  { id: 4, name: 'M1A2 Abrams Main Battle Tank', category: 'Vehicles', description: 'Heavy armored battle tank', unit_of_measure: 'Vehicles', is_serialized: 1 },
  { id: 5, name: '5.56mm NATO Rounds', category: 'Ammunition', description: 'Standard rifle cartridge bulk case', unit_of_measure: 'Crates', is_serialized: 0 },
  { id: 6, name: '120mm Tank Shells', category: 'Ammunition', description: 'High-explosive anti-tank rounds', unit_of_measure: 'Rounds', is_serialized: 0 },
  { id: 7, name: 'Harris PRC-152 Radio', category: 'Communications', description: 'Multi-band handheld tactical radio', unit_of_measure: 'Units', is_serialized: 1 },
  { id: 8, name: 'PVS-31A Dual Night Vision', category: 'Communications', description: 'Gen 3 night vision binocular goggle', unit_of_measure: 'Units', is_serialized: 1 },
  { id: 9, name: 'MQ-9 Reconnaissance Drone', category: 'Vehicles', description: 'Tactical unmanned aerial surveillance system', unit_of_measure: 'Units', is_serialized: 1 },
  { id: 10, name: 'Javelin Anti-Tank Missile', category: 'Weapons', description: 'Man-portable fire-and-forget missile', unit_of_measure: 'Units', is_serialized: 1 }
];

const DEFAULT_USERS = [
  { id: 1, username: 'admin_gen', name: 'General Arthur Vance', role: 'admin', base_id: null, rank: 'General', title: 'Commander-in-Chief / Supreme Admin' },
  { id: 2, username: 'commander_alpha', name: 'Col. Marcus Miller', role: 'base_commander', base_id: 1, rank: 'Colonel', title: 'Base Commander - Fort Alpha HQ' },
  { id: 3, username: 'commander_bravo', name: 'Col. Sarah Davis', role: 'base_commander', base_id: 2, rank: 'Colonel', title: 'Base Commander - Fort Bravo Post' },
  { id: 4, username: 'logistics_officer', name: 'Lt. James Hayes', role: 'logistics_officer', base_id: 1, rank: 'Lieutenant', title: 'Logistics & Supply Officer' }
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data lists
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [bases, setBases] = useState(DEFAULT_BASES);
  const [equipmentTypes, setEquipmentTypes] = useState(DEFAULT_EQUIPMENT);
  const [currentUser, setCurrentUser] = useState(DEFAULT_USERS[0]);

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
      // Fetch initial metadata safely with catch blocks
      const [usersData, basesData, equipData] = await Promise.all([
        fetchWithAuth('/users').catch(() => []),
        fetchWithAuth('/bases').catch(() => []),
        fetchWithAuth('/equipment-types').catch(() => [])
      ]);

      const finalUsers = Array.isArray(usersData) && usersData.length > 0 ? usersData : DEFAULT_USERS;
      const finalBases = Array.isArray(basesData) && basesData.length > 0 ? basesData : DEFAULT_BASES;
      const finalEquip = Array.isArray(equipData) && equipData.length > 0 ? equipData : DEFAULT_EQUIPMENT;

      setUsers(finalUsers);
      setBases(finalBases);
      setEquipmentTypes(finalEquip);
      setCurrentUser(finalUsers[0]);
    } catch (err) {
      console.error('Initialization error, utilizing default military assets:', err);
      setUsers(DEFAULT_USERS);
      setBases(DEFAULT_BASES);
      setEquipmentTypes(DEFAULT_EQUIPMENT);
      setCurrentUser(DEFAULT_USERS[0]);
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
