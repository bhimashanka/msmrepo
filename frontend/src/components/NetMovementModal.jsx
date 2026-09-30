import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, ShoppingBag, Info, Calculator } from 'lucide-react';
import { fetchWithAuth } from '../api';

const NetMovementModal = ({ isOpen, onClose, filters, currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState('purchases');
  const [details, setDetails] = useState({ purchases: [], transfersIn: [], transfersOut: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadNetMovementDetails();
    }
  }, [isOpen, filters, currentUser]);

  const loadNetMovementDetails = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.base_id && filters.base_id !== 'all') queryParams.append('base_id', filters.base_id);
      if (filters.equipment_id && filters.equipment_id !== 'all') queryParams.append('equipment_id', filters.equipment_id);
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);

      const data = await fetchWithAuth(`/dashboard/net-movement-details?${queryParams.toString()}`, currentUser);
      setDetails(data);
    } catch (err) {
      console.error('Failed to load net movement details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalPurchasesQty = details.purchases.reduce((acc, p) => acc + p.quantity, 0);
  const totalTransfersInQty = details.transfersIn.reduce((acc, t) => acc + t.quantity, 0);
  const totalTransfersOutQty = details.transfersOut.reduce((acc, t) => acc + t.quantity, 0);
  const calculatedNet = totalPurchasesQty + totalTransfersInQty - totalTransfersOutQty;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden military-box">
        
        {/* Modal Header */}
        <div className="bg-slate-900/90 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide">NET MOVEMENT BREAKDOWN ANALYTICS</h2>
              <p className="text-xs text-slate-400">Detailed breakdown of Purchases, Inbound Transfers and Outbound Transfers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formula Summary Banner */}
        <div className="bg-slate-950/70 border-b border-slate-800 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-900/80 border border-emerald-500/30 p-2.5 rounded-lg">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Purchases (+)</div>
              <div className="text-lg font-bold font-mono text-emerald-400">+{totalPurchasesQty}</div>
            </div>
            <div className="bg-slate-900/80 border border-cyan-500/30 p-2.5 rounded-lg">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Transfers In (+)</div>
              <div className="text-lg font-bold font-mono text-cyan-400">+{totalTransfersInQty}</div>
            </div>
            <div className="bg-slate-900/80 border border-red-500/30 p-2.5 rounded-lg">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Transfers Out (-)</div>
              <div className="text-lg font-bold font-mono text-red-400">-{totalTransfersOutQty}</div>
            </div>
            <div className="bg-cyan-950/40 border border-cyan-400/50 p-2.5 rounded-lg">
              <div className="text-[10px] font-mono text-cyan-300 uppercase font-semibold">Net Movement (=)</div>
              <div className="text-xl font-extrabold font-mono text-cyan-300">
                {calculatedNet >= 0 ? `+${calculatedNet}` : calculatedNet}
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Sub-Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/40">
          <button
            onClick={() => setActiveSubTab('purchases')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold font-mono border-b-2 transition-all ${
              activeSubTab === 'purchases'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Purchases ({details.purchases.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('transfersIn')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold font-mono border-b-2 transition-all ${
              activeSubTab === 'transfersIn'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Transfers In ({details.transfersIn.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('transfersOut')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold font-mono border-b-2 transition-all ${
              activeSubTab === 'transfersOut'
                ? 'border-red-400 text-red-400 bg-red-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Transfers Out ({details.transfersOut.length})</span>
          </button>
        </div>

        {/* Modal Content Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"></span>
              Loading movement details...
            </div>
          ) : (
            <>
              {/* Purchases View */}
              {activeSubTab === 'purchases' && (
                <div>
                  {details.purchases.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 font-mono text-xs">No purchase transactions found for current filter.</div>
                  ) : (
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">PO Reference</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Base</th>
                          <th className="py-2.5 px-3">Equipment</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                          <th className="py-2.5 px-3 text-right">Unit Cost</th>
                          <th className="py-2.5 px-3 text-right">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {details.purchases.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-800/50">
                            <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">{p.po_reference}</td>
                            <td className="py-2.5 px-3 text-slate-400">{p.purchase_date}</td>
                            <td className="py-2.5 px-3 text-slate-200">{p.base_name}</td>
                            <td className="py-2.5 px-3 text-slate-100 font-semibold">{p.equipment_name}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">+{p.quantity}</td>
                            <td className="py-2.5 px-3 text-right text-slate-400">${p.unit_cost.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-200">${p.total_cost.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Transfers In View */}
              {activeSubTab === 'transfersIn' && (
                <div>
                  {details.transfersIn.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 font-mono text-xs">No incoming transfer transactions found for current filter.</div>
                  ) : (
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Tracking #</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Source Base</th>
                          <th className="py-2.5 px-3">Destination</th>
                          <th className="py-2.5 px-3">Equipment</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {details.transfersIn.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-800/50">
                            <td className="py-2.5 px-3 font-mono text-cyan-400 font-semibold">{t.tracking_number}</td>
                            <td className="py-2.5 px-3 text-slate-400">{t.transfer_date}</td>
                            <td className="py-2.5 px-3 text-slate-300">{t.source_base_name}</td>
                            <td className="py-2.5 px-3 text-slate-200">{t.dest_base_name}</td>
                            <td className="py-2.5 px-3 text-slate-100 font-semibold">{t.equipment_name}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-400">+{t.quantity}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Transfers Out View */}
              {activeSubTab === 'transfersOut' && (
                <div>
                  {details.transfersOut.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 font-mono text-xs">No outgoing transfer transactions found for current filter.</div>
                  ) : (
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Tracking #</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Origin Base</th>
                          <th className="py-2.5 px-3">Destination Base</th>
                          <th className="py-2.5 px-3">Equipment</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {details.transfersOut.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-800/50">
                            <td className="py-2.5 px-3 font-mono text-red-400 font-semibold">{t.tracking_number}</td>
                            <td className="py-2.5 px-3 text-slate-400">{t.transfer_date}</td>
                            <td className="py-2.5 px-3 text-slate-300">{t.source_base_name}</td>
                            <td className="py-2.5 px-3 text-slate-200">{t.dest_base_name}</td>
                            <td className="py-2.5 px-3 text-slate-100 font-semibold">{t.equipment_name}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-red-400">-{t.quantity}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                                t.status === 'Completed' ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-900 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-cyan-400" /> Net Movement = Purchases + Transfers In - Transfers Out
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg font-mono"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetMovementModal;
