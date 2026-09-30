import React, { useState, useEffect } from 'react';
import { UserCheck, Flame, Plus, ShieldAlert, Lock, CheckCircle2, AlertCircle, X, RotateCcw } from 'lucide-react';
import { fetchWithAuth } from '../api';

const AssignmentsView = ({ filters, currentUser, bases, equipmentTypes }) => {
  const isLogisticsOfficer = currentUser?.role === 'logistics_officer';

  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' or 'expenditures'
  const [assignments, setAssignments] = useState([]);
  const [expenditures, setExpenditures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isExpendModalOpen, setIsExpendModalOpen] = useState(false);

  // Form State - Assignment
  const [assignForm, setAssignForm] = useState({
    base_id: currentUser?.role === 'base_commander' ? currentUser.base_id.toString() : bases[0]?.id.toString() || '1',
    equipment_id: equipmentTypes[0]?.id.toString() || '1',
    quantity: 1,
    personnel_name: 'Sgt. John Miller',
    personnel_rank: 'Staff Sergeant',
    service_id: `MIL-${Math.floor(100000 + Math.random() * 900000)}`,
    unit: '1st Recon Platoon',
    assignment_date: new Date().toISOString().split('T')[0],
    expected_return_date: '',
    notes: 'Issued for border patrol duty'
  });

  // Form State - Expenditure
  const [expendForm, setExpendForm] = useState({
    base_id: currentUser?.role === 'base_commander' ? currentUser.base_id.toString() : bases[0]?.id.toString() || '1',
    equipment_id: equipmentTypes[0]?.id.toString() || '5',
    quantity: 20,
    expenditure_date: new Date().toISOString().split('T')[0],
    reason: 'Live Fire Training',
    operation_name: 'Exercise Viper Shield'
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLogisticsOfficer) {
      loadData();
    }
  }, [activeTab, filters, currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const queryParams = new URLSearchParams();
      if (filters.base_id && filters.base_id !== 'all') queryParams.append('base_id', filters.base_id);
      if (filters.equipment_id && filters.equipment_id !== 'all') queryParams.append('equipment_id', filters.equipment_id);
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);

      if (activeTab === 'assignments') {
        const data = await fetchWithAuth(`/assignments?${queryParams.toString()}`, currentUser);
        setAssignments(data);
      } else {
        const data = await fetchWithAuth(`/expenditures?${queryParams.toString()}`, currentUser);
        setExpenditures(data);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setErrorMsg(err.message || 'Access Denied');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    try {
      await fetchWithAuth('/assignments', currentUser, {
        method: 'POST',
        body: JSON.stringify(assignForm)
      });

      setFormSuccess('Asset assigned to personnel successfully!');
      setTimeout(() => {
        setIsAssignModalOpen(false);
        setFormSuccess('');
        loadData();
      }, 1200);
    } catch (err) {
      setFormError(err.message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateExpenditure = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    try {
      await fetchWithAuth('/expenditures', currentUser, {
        method: 'POST',
        body: JSON.stringify(expendForm)
      });

      setFormSuccess('Asset expenditure recorded and inventory stock updated!');
      setTimeout(() => {
        setIsExpendModalOpen(false);
        setFormSuccess('');
        loadData();
      }, 1200);
    } catch (err) {
      setFormError(err.message || 'Failed to record expenditure');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnAsset = async (assignmentId) => {
    try {
      await fetchWithAuth(`/assignments/${assignmentId}/return`, currentUser, {
        method: 'PATCH'
      });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to process asset return');
    }
  };

  // RBAC Restricted Screen for Logistics Officer
  if (isLogisticsOfficer) {
    return (
      <div className="tactical-card p-12 rounded-2xl border border-red-500/30 text-center max-w-2xl mx-auto my-8 space-y-4 military-box">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <div className="inline-block bg-red-500/20 text-red-400 border border-red-500/30 font-mono text-xs px-3 py-1 rounded font-bold">
          HTTP 403 FORBIDDEN // RBAC ACCESS DENIED
        </div>
        <h3 className="text-lg font-bold font-mono text-slate-100">RESTRICTED MODULE: ASSIGNMENTS & EXPENDITURES</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Logistics Officers are restricted from accessing sensitive personnel asset assignments and combat operational expenditures. Permission is granted only to <span className="text-amber-400 font-semibold font-mono">Admins</span> and <span className="text-cyan-400 font-semibold font-mono">Base Commanders</span>.
        </p>
        <div className="pt-2 text-[11px] font-mono text-slate-500">
          To test this feature, switch role in the top header bar to <span className="text-slate-300 font-bold">General Arthur Vance (Admin)</span> or <span className="text-slate-300 font-bold">Col. Marcus Miller (Base Commander)</span>.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-400" /> PERSONNEL ASSIGNMENTS & EXPENDITURES
          </h2>
          <p className="text-xs text-slate-400">Manage individual weapon/vehicle equipment issuance and track consumed inventory</p>
        </div>

        {/* Action Button */}
        {activeTab === 'assignments' ? (
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>ASSIGN ASSET TO PERSONNEL</span>
          </button>
        ) : (
          <button
            onClick={() => setIsExpendModalOpen(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>RECORD EXPENDITURE</span>
          </button>
        )}
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-mono font-bold border-b-2 transition-all ${
            activeTab === 'assignments'
              ? 'border-blue-400 text-blue-400 bg-blue-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Active Asset Assignments</span>
        </button>
        <button
          onClick={() => setActiveTab('expenditures')}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-mono font-bold border-b-2 transition-all ${
            activeTab === 'expenditures'
              ? 'border-red-400 text-red-400 bg-red-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Operational Expenditures</span>
        </button>
      </div>

      {/* Tab 1: Assignments Table */}
      {activeTab === 'assignments' && (
        <div className="tactical-card rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-300">PERSONNEL ISSUANCE DIRECTORY ({assignments.length})</span>
            <span className="text-[11px] text-slate-400 font-mono">Armory asset tracking</span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-slate-500 font-mono text-xs">Loading personnel assignments...</div>
            ) : assignments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-mono text-xs">No active or historical personnel assignments found.</div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Personnel Name</th>
                    <th className="py-3 px-4">Rank / Service ID</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Base</th>
                    <th className="py-3 px-4">Equipment Assigned</th>
                    <th className="py-3 px-4 text-right">Qty</th>
                    <th className="py-3 px-4">Assignment Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-100">{a.personnel_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        <div>{a.personnel_rank}</div>
                        <span className="text-[10px] text-cyan-400">{a.service_id}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{a.unit}</td>
                      <td className="py-3 px-4 text-slate-200">{a.base_name}</td>
                      <td className="py-3 px-4 text-slate-100 font-semibold">{a.equipment_name}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-400">{a.quantity}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{a.assignment_date}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          a.status === 'Active'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {a.status === 'Active' && (
                          <button
                            onClick={() => handleReturnAsset(a.id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded text-[11px] font-mono flex items-center gap-1 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3 text-emerald-400" /> Return
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
      )}

      {/* Tab 2: Expenditures Table */}
      {activeTab === 'expenditures' && (
        <div className="tactical-card rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-300">EXPENDITURE & CONSUMPTION AUDIT ({expenditures.length})</span>
            <span className="text-[11px] text-slate-400 font-mono">Combat & Training consumption</span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-slate-500 font-mono text-xs">Loading operational expenditures...</div>
            ) : expenditures.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-mono text-xs">No expenditure records recorded.</div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Base</th>
                    <th className="py-3 px-4">Equipment Expended</th>
                    <th className="py-3 px-4 text-right">Qty Consumed</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Operation / Exercise</th>
                    <th className="py-3 px-4">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {expenditures.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">{ex.expenditure_date}</td>
                      <td className="py-3 px-4 text-slate-200">{ex.base_name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-100">{ex.equipment_name}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-red-400">-{ex.quantity}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20">
                          {ex.reason}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{ex.operation_name}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{ex.authorized_by_user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl military-box">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" /> ASSIGN ASSET TO PERSONNEL
              </h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-200">
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

            <form onSubmit={handleCreateAssignment} className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">PERSONNEL NAME</label>
                  <input
                    type="text"
                    value={assignForm.personnel_name}
                    onChange={(e) => setAssignForm({ ...assignForm, personnel_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">RANK</label>
                  <input
                    type="text"
                    value={assignForm.personnel_rank}
                    onChange={(e) => setAssignForm({ ...assignForm, personnel_rank: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">SERVICE / MILITARY ID</label>
                  <input
                    type="text"
                    value={assignForm.service_id}
                    onChange={(e) => setAssignForm({ ...assignForm, service_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">UNIT / PLATOON</label>
                  <input
                    type="text"
                    value={assignForm.unit}
                    onChange={(e) => setAssignForm({ ...assignForm, unit: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">BASE</label>
                  <select
                    value={assignForm.base_id}
                    disabled={currentUser?.role === 'base_commander'}
                    onChange={(e) => setAssignForm({ ...assignForm, base_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  >
                    {bases.map((b) => (
                      <option key={b.id} value={b.id.toString()}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">EQUIPMENT</label>
                  <select
                    value={assignForm.equipment_id}
                    onChange={(e) => setAssignForm({ ...assignForm, equipment_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  >
                    {equipmentTypes.map((eq) => (
                      <option key={eq.id} value={eq.id.toString()}>[{eq.category}] {eq.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">QUANTITY</label>
                  <input
                    type="number"
                    min="1"
                    value={assignForm.quantity}
                    onChange={(e) => setAssignForm({ ...assignForm, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">ASSIGNMENT DATE</label>
                  <input
                    type="date"
                    value={assignForm.assignment_date}
                    onChange={(e) => setAssignForm({ ...assignForm, assignment_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">CANCEL</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold">
                  {submitting ? 'PROCESSING...' : 'CONFIRM ASSIGNMENT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expend Modal */}
      {isExpendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl military-box">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-400" /> RECORD ASSET EXPENDITURE
              </h3>
              <button onClick={() => setIsExpendModalOpen(false)} className="text-slate-400 hover:text-slate-200">
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

            <form onSubmit={handleCreateExpenditure} className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">BASE</label>
                  <select
                    value={expendForm.base_id}
                    disabled={currentUser?.role === 'base_commander'}
                    onChange={(e) => setExpendForm({ ...expendForm, base_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-red-500"
                  >
                    {bases.map((b) => (
                      <option key={b.id} value={b.id.toString()}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">EQUIPMENT</label>
                  <select
                    value={expendForm.equipment_id}
                    onChange={(e) => setExpendForm({ ...expendForm, equipment_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-red-500"
                  >
                    {equipmentTypes.map((eq) => (
                      <option key={eq.id} value={eq.id.toString()}>[{eq.category}] {eq.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">EXPENDED QUANTITY</label>
                  <input
                    type="number"
                    min="1"
                    value={expendForm.quantity}
                    onChange={(e) => setExpendForm({ ...expendForm, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">EXPENDITURE DATE</label>
                  <input
                    type="date"
                    value={expendForm.expenditure_date}
                    onChange={(e) => setExpendForm({ ...expendForm, expenditure_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-red-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">REASON / CATEGORY</label>
                <select
                  value={expendForm.reason}
                  onChange={(e) => setExpendForm({ ...expendForm, reason: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-red-500"
                >
                  <option value="Live Fire Training">Live Fire Training</option>
                  <option value="Combat Loss">Combat Loss / Damage</option>
                  <option value="Operational Wear">Operational Wear & Tear</option>
                  <option value="Decommissioned">Decommissioned / Scrapped</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">OPERATION / EXERCISE NAME</label>
                <input
                  type="text"
                  value={expendForm.operation_name}
                  onChange={(e) => setExpendForm({ ...expendForm, operation_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button type="button" onClick={() => setIsExpendModalOpen(false)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">CANCEL</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold">
                  {submitting ? 'RECORDING...' : 'RECORD EXPENDITURE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsView;
