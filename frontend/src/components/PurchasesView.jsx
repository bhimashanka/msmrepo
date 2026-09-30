import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Search, Calendar, DollarSign, Package, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { fetchWithAuth } from '../api';

const PurchasesView = ({ filters, currentUser, bases, equipmentTypes }) => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    base_id: currentUser?.role === 'base_commander' ? currentUser.base_id.toString() : bases[0]?.id.toString() || '1',
    equipment_id: equipmentTypes[0]?.id.toString() || '1',
    quantity: 10,
    unit_cost: 500,
    supplier: 'Defense Logistics Agency',
    po_reference: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    purchase_date: new Date().toISOString().split('T')[0]
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPurchases();
  }, [filters, currentUser]);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.base_id && filters.base_id !== 'all') queryParams.append('base_id', filters.base_id);
      if (filters.equipment_id && filters.equipment_id !== 'all') queryParams.append('equipment_id', filters.equipment_id);
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);

      const data = await fetchWithAuth(`/purchases?${queryParams.toString()}`, currentUser);
      setPurchases(data);
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    try {
      await fetchWithAuth('/purchases', currentUser, {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      setFormSuccess('Asset purchase recorded successfully! Stock updated.');
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess('');
        loadPurchases();
        // Reset PO ref
        setFormData((prev) => ({
          ...prev,
          po_reference: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
        }));
      }, 1200);
    } catch (err) {
      setFormError(err.message || 'Failed to record purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpense = purchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);
  const totalUnitsPurchased = purchases.reduce((sum, p) => sum + (p.quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" /> ASSET PROCUREMENT LOGISTICS
          </h2>
          <p className="text-xs text-slate-400">Record asset acquisitions and view historical purchase orders</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>RECORD NEW PURCHASE</span>
        </button>
      </div>

      {/* Summary Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="tactical-card p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase">Total Procured Units</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{totalUnitsPurchased.toLocaleString()} Units</div>
          </div>
          <Package className="w-8 h-8 text-emerald-500/30" />
        </div>
        <div className="tactical-card p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase">Total Procurement Expense</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">${totalExpense.toLocaleString()}</div>
          </div>
          <DollarSign className="w-8 h-8 text-amber-500/30" />
        </div>
      </div>

      {/* Historical Purchases Table */}
      <div className="tactical-card rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-300">PURCHASE ORDER HISTORY ({purchases.length})</span>
          <span className="text-[11px] text-slate-400 font-mono">Sorted by latest date</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">Loading historical purchase records...</div>
          ) : purchases.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">No purchase transactions found matching the filter parameters.</div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">PO Ref</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Base</th>
                  <th className="py-3 px-4">Equipment</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Total Cost</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-400">{p.po_reference}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{p.purchase_date}</td>
                    <td className="py-3 px-4 text-slate-200">{p.base_name} ({p.base_code})</td>
                    <td className="py-3 px-4 font-semibold text-slate-100">
                      <div>{p.equipment_name}</div>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono">{p.equipment_category}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">+{p.quantity}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">${p.unit_cost.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">${p.total_cost.toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-300">{p.supplier}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{p.created_by_user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Record Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl military-box">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" /> RECORD ASSET PURCHASE
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

            <form onSubmit={handleCreatePurchase} className="space-y-4 text-xs font-mono">
              {/* Base */}
              <div>
                <label className="block text-slate-400 mb-1">TARGET BASE / INSTALLATION</label>
                <select
                  value={formData.base_id}
                  disabled={currentUser?.role === 'base_commander'}
                  onChange={(e) => setFormData({ ...formData, base_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                >
                  {bases.map((b) => (
                    <option key={b.id} value={b.id.toString()}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              {/* Equipment */}
              <div>
                <label className="block text-slate-400 mb-1">EQUIPMENT ITEM</label>
                <select
                  value={formData.equipment_id}
                  onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                >
                  {equipmentTypes.map((eq) => (
                    <option key={eq.id} value={eq.id.toString()}>[{eq.category}] {eq.name}</option>
                  ))}
                </select>
              </div>

              {/* Quantity & Unit Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">PURCHASE QUANTITY</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">UNIT COST ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Total Calculated Cost Banner */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center text-slate-300">
                <span>ESTIMATED TOTAL COST:</span>
                <span className="font-extrabold text-amber-400 text-sm">
                  ${(formData.quantity * formData.unit_cost).toLocaleString()}
                </span>
              </div>

              {/* PO Ref & Supplier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">PO REF NUMBER</label>
                  <input
                    type="text"
                    value={formData.po_reference}
                    onChange={(e) => setFormData({ ...formData, po_reference: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">PURCHASE DATE</label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">SUPPLIER / VENDOR</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                  required
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
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors"
                >
                  {submitting ? 'RECORDING...' : 'SUBMIT PURCHASE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesView;
