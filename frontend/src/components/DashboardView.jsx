import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, UserCheck, Flame, Layers, ExternalLink, RefreshCw, BarChart2, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { fetchWithAuth } from '../api';
import NetMovementModal from './NetMovementModal';

const DashboardView = ({ filters, currentUser, bases, equipmentTypes }) => {
  const [metrics, setMetrics] = useState({
    openingBalance: 0,
    purchases: 0,
    purchaseCost: 0,
    transfersIn: 0,
    transfersOut: 0,
    netMovement: 0,
    assigned: 0,
    expended: 0,
    closingBalance: 0,
    categoryBreakdown: []
  });

  const [loading, setLoading] = useState(true);
  const [isNetModalOpen, setIsNetModalOpen] = useState(false);

  useEffect(() => {
    loadDashboardMetrics();
  }, [filters, currentUser]);

  const loadDashboardMetrics = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.base_id && filters.base_id !== 'all') queryParams.append('base_id', filters.base_id);
      if (filters.equipment_id && filters.equipment_id !== 'all') queryParams.append('equipment_id', filters.equipment_id);
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);

      const data = await fetchWithAuth(`/dashboard/metrics?${queryParams.toString()}`, currentUser);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Banner Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-cyan-400" /> COMMAND DASHBOARD METRICS
          </h2>
          <p className="text-xs text-slate-400">Real-time asset movement, opening & closing balances overview</p>
        </div>

        <button
          onClick={loadDashboardMetrics}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>REFRESH</span>
        </button>
      </div>

      {/* 5 Key Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Opening Balance */}
        <div className="tactical-card tactical-card-hover p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Opening Balance</span>
            <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-100 mb-1">
            {loading ? '...' : metrics.openingBalance.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">Baseline Stock Total</div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-slate-500/5 rounded-full blur-xl pointer-events-none"></div>
        </div>

        {/* Card 2: Net Movement (PURCHASES + TRANSFERS IN - TRANSFERS OUT) - CLICKABLE BONUS */}
        <div
          onClick={() => setIsNetModalOpen(true)}
          className="tactical-card tactical-card-hover p-4 rounded-xl border-cyan-500/30 bg-cyan-950/20 cursor-pointer group relative overflow-hidden transition-all hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-cyan-400 uppercase font-bold flex items-center gap-1">
              Net Movement <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
            <div className="w-7 h-7 rounded bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-cyan-300 mb-1 flex items-baseline gap-2">
            {loading ? '...' : (metrics.netMovement >= 0 ? `+${metrics.netMovement}` : metrics.netMovement)}
          </div>
          <div className="text-[10px] text-cyan-400/80 font-mono flex items-center gap-1 font-semibold">
            Click for Purchases & Transfer Details
          </div>
          <div className="mt-2 text-[10px] font-mono text-slate-400 border-t border-cyan-900/50 pt-1.5 flex justify-between">
            <span>P: +{metrics.purchases}</span>
            <span>In: +{metrics.transfersIn}</span>
            <span>Out: -{metrics.transfersOut}</span>
          </div>
        </div>

        {/* Card 3: Assigned Assets */}
        <div className="tactical-card tactical-card-hover p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Assigned Assets</span>
            <div className="w-7 h-7 rounded bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-blue-300 mb-1">
            {loading ? '...' : metrics.assigned.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">Active Personnel Assignments</div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
        </div>

        {/* Card 4: Expended Assets */}
        <div className="tactical-card tactical-card-hover p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Expended Assets</span>
            <div className="w-7 h-7 rounded bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-red-400 mb-1">
            {loading ? '...' : metrics.expended.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">Training / Operations Spent</div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full blur-xl pointer-events-none"></div>
        </div>

        {/* Card 5: Closing Balance */}
        <div className="tactical-card tactical-card-hover p-4 rounded-xl border-emerald-500/40 bg-emerald-950/20 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-emerald-400 uppercase font-bold">Closing Balance</span>
            <div className="w-7 h-7 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-300 mb-1">
            {loading ? '...' : metrics.closingBalance.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-400/80 font-mono font-semibold">Available Active Stock</div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
        </div>

      </div>

      {/* Dynamic Visual Analytics & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recharts Category Stock Chart */}
        <div className="lg:col-span-2 tactical-card p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold font-mono text-slate-200 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" /> INVENTORY STOCK DISTRIBUTION BY CATEGORY
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Units in Stock</span>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">Loading analytics...</div>
            ) : metrics.categoryBreakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">No inventory data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.categoryBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                  />
                  <Bar dataKey="stock_count" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Units Stocked" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick System Readiness Panel */}
        <div className="tactical-card p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold font-mono text-slate-200 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> OPERATIONAL READINESS SUMMARY
            </h3>
            <div className="space-y-3 font-mono text-xs">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Procurement Investment Total</div>
                <div className="text-lg font-bold text-amber-400 mt-0.5">${metrics.purchaseCost.toLocaleString()}</div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Asset Deployment Ratio</div>
                <div className="text-base font-bold text-cyan-400 mt-0.5">
                  {metrics.closingBalance > 0
                    ? `${Math.round((metrics.assigned / (metrics.closingBalance + metrics.assigned)) * 100)}% Assigned`
                    : '0%'}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsNetModalOpen(true)}
            className="mt-4 w-full py-2.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <span>DRILL DOWN NET MOVEMENT MODAL</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Net Movement Drill-down Pop-Up Modal */}
      <NetMovementModal
        isOpen={isNetModalOpen}
        onClose={() => setIsNetModalOpen(false)}
        filters={filters}
        currentUser={currentUser}
      />
    </div>
  );
};

export default DashboardView;
