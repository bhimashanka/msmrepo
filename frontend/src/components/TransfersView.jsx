import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Plus, CheckCircle2, AlertCircle, Clock, Truck, ShieldAlert, X } from 'lucide-react';
import { fetchWithAuth } from '../api';

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

const TransfersView = ({ filters, currentUser, bases = [], equipmentTypes = [] }) => {
  const activeBases = bases && bases.length > 0 ? bases : DEFAULT_BASES;
  const activeEquipment = equipmentTypes && equipmentTypes.length > 0 ? equipmentTypes : DEFAULT_EQUIPMENT;

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    source_base_id: currentUser?.role === 'base_commander' ? currentUser.base_id?.toString() : activeBases[0].id.toString(),
    dest_base_id: (activeBases[1] || activeBases[0]).id.toString(),
    equipment_id: activeEquipment[0].id.toString(),
    quantity: 5,
    transfer_date: new Date().toISOString().split('T')[0],
    tracking_number: `TR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    status: 'Completed',
    notes: 'Tactical relocation requested by regional command'
  });

  // Sync selection when bases or equipmentTypes populate asynchronously
  useEffect(() => {
    if (activeBases.length > 0) {
      setFormData(prev => ({
        ...prev,
        source_base_id: prev.source_base_id || (currentUser?.role === 'base_commander' ? currentUser.base_id?.toString() : activeBases[0].id.toString()),
        dest_base_id: prev.dest_base_id || (activeBases[1] || activeBases[0]).id.toString()
      }));
    }
    if (activeEquipment.length > 0 && !formData.equipment_id) {
      setFormData(prev => ({
        ...prev,
        equipment_id: activeEquipment[0].id.toString()
      }));
    }
  }, [bases, equipmentTypes, currentUser]);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTransfers();
  }, [filters, currentUser]);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.base_id && filters.base_id !== 'all') queryParams.append('base_id', filters.base_id);
      if (filters.equipment_id && filters.equipment_id !== 'all') queryParams.append('equipment_id', filters.equipment_id);
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);

      const data = await fetchWithAuth(`/transfers?${queryParams.toString()}`, currentUser);
      setTransfers(data);
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (formData.source_base_id === formData.dest_base_id) {
      setFormError('Source base and destination base cannot be the same installation.');
      return;
    }

    setSubmitting(true);

    try {
      await fetchWithAuth('/transfers', currentUser, {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      setFormSuccess('Asset transfer initiated successfully!');
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess('');
        loadTransfers();
        setFormData((prev) => ({
          ...prev,
          tracking_number: `TR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
        }));
      }, 1200);
    } catch (err) {
      setFormError(err.message || 'Failed to initiate transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (transferId, newStatus) => {
    try {
      await fetchWithAuth(`/transfers/${transferId}/status`, currentUser, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      loadTransfers();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>;
      case 'In-Transit':
        return <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit animate-pulse"><Truck className="w-3.5 h-3.5" /> In-Transit</span>;
      case 'Pending':
        return <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1 w-fit"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      default:
        return <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-cyan-400" /> INTER-BASE ASSET TRANSFERS
          </h2>
          <p className="text-xs text-slate-400">Facilitate and track asset redistribution across military bases</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>INITIATE NEW TRANSFER</span>
        </button>
      </div>

      {/* Transfer History Table */}
      <div className="tactical-card rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-300">INTER-BASE MOVEMENT LOG ({transfers.length})</span>
          <span className="text-[11px] text-slate-400 font-mono">Real-time status updates</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">Loading transfer movement log...</div>
          ) : transfers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">No transfer records found matching the filter parameters.</div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Tracking #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Origin Base</th>
                  <th className="py-3 px-4">Destination Base</th>
                  <th className="py-3 px-4">Equipment Details</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{t.tracking_number}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{t.transfer_date}</td>
                    <td className="py-3 px-4 text-slate-200">{t.source_base_name}</td>
                    <td className="py-3 px-4 text-slate-200 font-semibold">{t.dest_base_name}</td>
                    <td className="py-3 px-4 text-slate-100 font-semibold">
                      <div>{t.equipment_name}</div>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono">{t.equipment_category}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-cyan-300">{t.quantity}</td>
                    <td className="py-3 px-4">{getStatusBadge(t.status)}</td>
                    <td className="py-3 px-4">
                      {t.status !== 'Completed' && (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'Completed')}
                          className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white rounded text-[11px] font-mono transition-colors"
                        >
                          Mark Received
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Initiate Transfer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl military-box">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-cyan-400" /> INITIATE INTER-BASE TRANSFER
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs font-mono text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateTransfer} className="space-y-4 text-xs font-mono">
              {/* Origin Base */}
              <div>
                <label className="block text-slate-400 mb-1">SOURCE / ORIGIN BASE</label>
                <select
                  value={formData.source_base_id}
                  disabled={currentUser?.role === 'base_commander'}
                  onChange={(e) => setFormData({ ...formData, source_base_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-cyan-500"
                >
                  {activeBases.map((b) => (
                    <option key={b.id} value={b.id.toString()}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              {/* Destination Base */}
              <div>
                <label className="block text-slate-400 mb-1">DESTINATION BASE</label>
                <select
                  value={formData.dest_base_id}
                  onChange={(e) => setFormData({ ...formData, dest_base_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-cyan-500"
                >
                  {activeBases.map((b) => (
                    <option key={b.id} value={b.id.toString()}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              {/* Equipment */}
              <div>
                <label className="block text-slate-400 mb-1">EQUIPMENT TYPE</label>
                <select
                  value={formData.equipment_id}
                  onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-cyan-500"
                >
                  {activeEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id.toString()}>[{eq.category}] {eq.name}</option>
                  ))}
                </select>
              </div>

              {/* Quantity & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">TRANSFER QUANTITY</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">TRANSFER DATE</label>
                  <input
                    type="date"
                    value={formData.transfer_date}
                    onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              {/* Tracking Number & Initial Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">TRACKING REF</label>
                  <input
                    type="text"
                    value={formData.tracking_number}
                    onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">INITIAL STATUS</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-cyan-500"
                  >
                    <option value="Completed">Completed (Instant)</option>
                    <option value="In-Transit">In-Transit</option>
                    <option value="Pending">Pending Approval</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 mb-1">TACTICAL JUSTIFICATION / NOTES</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-cyan-500 h-20"
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors"
                >
                  {submitting ? 'PROCESSING...' : 'DISPATCH TRANSFER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransfersView;
