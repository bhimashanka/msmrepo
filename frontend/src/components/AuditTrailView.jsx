import React, { useState, useEffect } from 'react';
import { FileText, Search, Shield, User, Clock, Terminal, Filter } from 'lucide-react';
import { fetchWithAuth } from '../api';

const AuditTrailView = ({ currentUser }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter, currentUser]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (actionFilter !== 'all') queryParams.append('action', actionFilter);

      const data = await fetchWithAuth(`/audit-logs?${queryParams.toString()}`, currentUser);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'PURCHASE_RECORDED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PURCHASE RECORDED</span>;
      case 'TRANSFER_INITIATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">TRANSFER INITIATED</span>;
      case 'TRANSFER_STATUS_UPDATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">TRANSFER UPDATED</span>;
      case 'ASSET_ASSIGNED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">ASSET ASSIGNED</span>;
      case 'ASSET_EXPENDED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30">ASSET EXPENDED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" /> SYSTEM AUDIT LOG & TRANSACTION TRAIL
          </h2>
          <p className="text-xs text-slate-400">Immutable ledger logging all purchase, transfer, assignment & expenditure transactions</p>
        </div>

        {/* Action Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono rounded-lg px-3 py-1.5 outline-none focus:border-amber-500"
          >
            <option value="all">All Action Types</option>
            <option value="PURCHASE_RECORDED">Purchases</option>
            <option value="TRANSFER_INITIATED">Transfers Initiated</option>
            <option value="ASSET_ASSIGNED">Assignments</option>
            <option value="ASSET_EXPENDED">Expenditures</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="tactical-card rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-300">AUDIT LOG TRAIL ({logs.length})</span>
          <span className="text-[11px] text-slate-400 font-mono">Timestamped (UTC)</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">Loading audit ledger logs...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">No audit logs recorded for selected action.</div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-3 px-4 text-slate-200 font-bold">{log.username}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] text-slate-400 uppercase bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                        {log.user_role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                    <td className="py-3 px-4 text-slate-300 font-semibold">{log.resource}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditTrailView;
