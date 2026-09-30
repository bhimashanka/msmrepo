import React, { useState } from 'react';
import { Shield, ShieldAlert, ArrowLeftRight, ShoppingBag, UserCheck, FileText, ChevronDown, User, Lock, Server } from 'lucide-react';

const Header = ({ activeTab, setActiveTab, currentUser, setCurrentUser, users }) => {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded font-mono font-semibold flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> ADMIN (FULL ACCESS)</span>;
      case 'base_commander':
        return <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs px-2.5 py-1 rounded font-mono font-semibold flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> BASE COMMANDER</span>;
      case 'logistics_officer':
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded font-mono font-semibold flex items-center gap-1"><ShoppingBag className="w-3.5 h-3.5" /> LOGISTICS OFFICER</span>;
      default:
        return null;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
    { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
    { id: 'assignments', label: 'Assignments & Expenditures', icon: UserCheck, restricted: currentUser?.role === 'logistics_officer' },
    { id: 'audit', label: 'Audit Trail', icon: FileText }
  ];

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40">
      {/* Classification Top Bar */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1 text-center text-xs font-mono text-amber-400 font-semibold tracking-wider flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          RESTRICTED // MILITARY ASSET LOGISTICS & DEFENSE NETWORK
        </span>
        <span className="hidden md:inline text-slate-400">SESSION SECURE (AES-256)</span>
        <span className="font-mono text-cyan-400">{new Date().toLocaleDateString()}</span>
      </div>

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-wide font-mono">MAMS NETWORK</h1>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.5 rounded font-mono">v2.4</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Tactical Asset Management & Inter-Base Logistics System</p>
            </div>
          </div>

          {/* Role Switcher Component */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-3.5 py-1.5 rounded-lg text-left transition-all hover:border-cyan-500/40"
            >
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs border border-slate-600">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-slate-200">{currentUser?.name}</div>
                <div className="text-[11px] text-slate-400">{currentUser?.title}</div>
              </div>
              <div className="ml-1">
                {getRoleBadge(currentUser?.role)}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
            </button>

            {/* Role Dropdown Menu */}
            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-800 mb-1">
                  <span className="text-xs font-mono text-slate-400 uppercase font-bold tracking-wider">Switch Role Context (RBAC Demo)</span>
                </div>
                <div className="space-y-1">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setCurrentUser(u);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg flex items-start gap-3 transition-colors ${
                        currentUser?.username === u.username
                          ? 'bg-cyan-950/60 border border-cyan-500/30 text-cyan-200'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="mt-0.5">
                        <User className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 truncate">{u.name}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{u.role.replace('_', ' ')}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{u.title}</div>
                        {u.base_name && (
                          <div className="text-[10px] text-cyan-400 mt-0.5">Scoped to: {u.base_name}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 border-t border-slate-800/80 pt-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30'
                    : item.restricted
                    ? 'border-transparent text-slate-500 hover:text-slate-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.restricted && (
                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] px-1.5 py-0.2 rounded flex items-center gap-1 font-mono">
                    <Lock className="w-3 h-3" /> RESTRICTED
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Header;
