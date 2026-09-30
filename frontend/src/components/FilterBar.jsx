import React from 'react';
import { Filter, Calendar, MapPin, Package, RotateCcw, Lock } from 'lucide-react';

const DEFAULT_BASES = [
  { id: 1, code: 'ALPHA-01', name: 'Fort Alpha HQ' },
  { id: 2, code: 'BRAVO-02', name: 'Fort Bravo Post' },
  { id: 3, code: 'CHARLIE-03', name: 'Outpost Charlie' },
  { id: 4, code: 'DELTA-04', name: 'Naval Station Delta' },
  { id: 5, code: 'ECHO-05', name: 'Air Base Echo' }
];

const DEFAULT_EQUIPMENT = [
  { id: 1, name: 'M4A1 Tactical Carbine', category: 'Weapons' },
  { id: 2, name: 'Barrett M82 Sniper Rifle', category: 'Weapons' },
  { id: 3, name: 'HMMWV Armored (Humvee)', category: 'Vehicles' },
  { id: 4, name: 'M1A2 Abrams Main Battle Tank', category: 'Vehicles' },
  { id: 5, name: '5.56mm NATO Rounds', category: 'Ammunition' },
  { id: 6, name: '120mm Tank Shells', category: 'Ammunition' },
  { id: 7, name: 'Harris PRC-152 Radio', category: 'Communications' },
  { id: 8, name: 'PVS-31A Dual Night Vision', category: 'Communications' },
  { id: 9, name: 'MQ-9 Reconnaissance Drone', category: 'Vehicles' },
  { id: 10, name: 'Javelin Anti-Tank Missile', category: 'Weapons' }
];

const FilterBar = ({ filters, setFilters, bases = [], equipmentTypes = [], currentUser }) => {
  const activeBases = bases && bases.length > 0 ? bases : DEFAULT_BASES;
  const activeEquipment = equipmentTypes && equipmentTypes.length > 0 ? equipmentTypes : DEFAULT_EQUIPMENT;

  const isBaseCommander = currentUser?.role === 'base_commander';

  const handleReset = () => {
    setFilters({
      base_id: isBaseCommander ? currentUser.base_id.toString() : 'all',
      equipment_id: 'all',
      start_date: '',
      end_date: ''
    });
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 mb-6 backdrop-blur-sm shadow-xl">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold tracking-wider">
          <Filter className="w-4 h-4" />
          <span>FILTER PARAMETERS</span>
        </div>

        {/* Filters Group */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full lg:w-auto">
          {/* Base Filter */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> BASE / OUTPOST</span>
              {isBaseCommander && <span className="text-[9px] text-amber-400 flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> LOCKED</span>}
            </label>
            <select
              value={filters.base_id}
              disabled={isBaseCommander}
              onChange={(e) => setFilters({ ...filters, base_id: e.target.value })}
              className={`w-full bg-slate-800 border text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-cyan-500 transition-colors ${
                isBaseCommander ? 'border-amber-500/30 bg-slate-800/50 cursor-not-allowed text-amber-200' : 'border-slate-700'
              }`}
            >
              {!isBaseCommander && <option value="all">All Bases & Commands</option>}
              {activeBases.map((b) => (
                <option key={b.id} value={b.id.toString()}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Equipment Type Filter */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1 flex items-center gap-1">
              <Package className="w-3 h-3 text-slate-400" /> EQUIPMENT TYPE
            </label>
            <select
              value={filters.equipment_id}
              onChange={(e) => setFilters({ ...filters, equipment_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="all">All Equipment Types</option>
              {activeEquipment.map((eq) => (
                <option key={eq.id} value={eq.id.toString()}>
                  [{eq.category}] {eq.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> FROM DATE
            </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> TO DATE
            </label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Reset Action */}
        <button
          onClick={handleReset}
          className="self-end lg:self-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all hover:border-slate-500"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESET</span>
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
