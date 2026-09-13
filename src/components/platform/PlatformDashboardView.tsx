import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  ShieldAlert, 
  UserSquare2, 
  CreditCard, 
  ToggleRight,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlayCircle
} from 'lucide-react';

interface TenantMetrics {
  id: string;
  name: string;
  slug: string;
  status: string;
  tier?: string;
  userCount: number;
  leadCount: number;
  callVolume30d: number;
}

interface Alert {
  id: string;
  timestamp: string;
  type: string;
  severity: string;
  tenantName?: string;
  details?: string;
}

interface BillingInfo {
  totalMRR: number;
  tierCounts: any;
  prioritizedInvoices: any[];
}

export const PlatformDashboardView: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'tenants'|'soc'|'impersonate'|'billing'|'features'>('tenants');
  
  // Data States
  const [tenants, setTenants] = useState<TenantMetrics[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [impersonationSessions, setImpersonationSessions] = useState<any[]>([]);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [features, setFeatures] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser?.isPlatformStaff) return;
    fetchData(activeTab);
  }, [activeTab, currentUser]);

  const fetchData = async (tab: string) => {
    try {
      if (tab === 'tenants') {
        const res = await fetch('/api/platform/tenants', { headers: { Authorization: `Bearer ${currentUser?.token}` } });
        if (res.ok) setTenants(await res.json());
      } else if (tab === 'soc') {
        const res = await fetch('/api/platform/soc/alerts', { headers: { Authorization: `Bearer ${currentUser?.token}` } });
        if (res.ok) {
          const data = await res.json();
          setAlerts(data.alerts);
          setImpersonationSessions(data.impersonationSessions);
        }
      } else if (tab === 'billing') {
        const res = await fetch('/api/platform/billing', { headers: { Authorization: `Bearer ${currentUser?.token}` } });
        if (res.ok) setBilling(await res.json());
      } else if (tab === 'features') {
        const res = await fetch('/api/platform/features', { headers: { Authorization: `Bearer ${currentUser?.token}` } });
        if (res.ok) setFeatures(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImpersonate = async (tenantId: string, tenantName: string) => {
    const reason = prompt(`Reason for impersonating ${tenantName}?`);
    if (!reason) return;
    try {
      const res = await fetch('/api/platform/impersonate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser?.token}` 
        },
        body: JSON.stringify({ targetTenantId: tenantId, reason })
      });
      if (res.ok) {
        alert('Impersonation started. Please refresh the page.');
        window.location.reload();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to impersonate');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const toggleTenantStatus = async (t: TenantMetrics) => {
    const isSuspending = t.status === 'active';
    const action = isSuspending ? 'suspend' : 'reactivate';
    let reason = '';
    
    if (isSuspending) {
       reason = prompt(`Reason for suspending ${t.name}?`) || '';
       if (!reason) return;
    } else {
       if (!confirm(`Reactivate ${t.name}?`)) return;
    }

    try {
      const res = await fetch(`/api/platform/tenants/${t.id}/${action}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser?.token}` 
        },
        body: JSON.stringify({ confirmed: true, reason })
      });
      if (res.ok) {
        fetchData('tenants');
      } else {
         const err = await res.json();
         alert(err.error || 'Failed action');
      }
    } catch (err) {
      alert('Error connecting to server');
    }
  };

  const TABS = [
    { id: 'tenants', label: 'Tenants', icon: Building2 },
    { id: 'soc', label: 'Security (SOC)', icon: ShieldAlert },
    { id: 'impersonate', label: 'Impersonation', icon: UserSquare2 },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'features', label: 'Features', icon: ToggleRight }
  ] as const;

  if (!currentUser?.isPlatformStaff) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-[#191C1B] dark:text-[#E1E3E0]">Access Denied</h2>
        <p className="text-[#404947] dark:text-[#BFC9C6]">Platform staff only.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#191C1B] dark:text-[#E1E3E0]">Platform Control Plane</h1>
          <p className="text-[#404947] dark:text-[#BFC9C6]">Manage tenant lifecycles, security alerts, and feature rollouts.</p>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 border-b border-[#E1E3E0] dark:border-[#404947] pb-2">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${
                isActive 
                  ? 'bg-[#CCE8E1] dark:bg-[#004F46] text-[#00201B] dark:text-[#A3F2E4] border-b-2 border-[#00695C]' 
                  : 'text-[#404947] dark:text-[#BFC9C6] hover:bg-[#F0F5F3] dark:hover:bg-[#272B2A]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {activeTab === 'tenants' && (
          <div className="bg-white dark:bg-[#191C1B] rounded-xl shadow-sm border border-[#E1E3E0] dark:border-[#404947] overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F0F5F3] dark:bg-[#272B2A] text-[#404947] dark:text-[#BFC9C6] font-medium">
                <tr>
                  <th className="px-6 py-4">Tenant Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Tier</th>
                  <th className="px-6 py-4 text-right">Users</th>
                  <th className="px-6 py-4 text-right">Leads</th>
                  <th className="px-6 py-4 text-right">Calls (30d)</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E3E0] dark:divide-[#404947]">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-[#202423]">
                    <td className="px-6 py-4 font-medium text-[#191C1B] dark:text-[#E1E3E0]">{t.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        t.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        t.status === 'suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 capitalize">{t.tier || 'Starter'}</td>
                    <td className="px-6 py-4 text-right">{t.userCount}</td>
                    <td className="px-6 py-4 text-right">{t.leadCount}</td>
                    <td className="px-6 py-4 text-right">{t.callVolume30d}</td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <button
                        onClick={() => handleImpersonate(t.id, t.name)}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Impersonate
                      </button>
                      <button
                        onClick={() => toggleTenantStatus(t)}
                        className={`${t.status === 'active' ? 'text-red-600' : 'text-green-600'} hover:underline`}
                      >
                        {t.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No tenants found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'soc' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#191C1B] rounded-xl shadow-sm border border-[#E1E3E0] dark:border-[#404947] overflow-hidden p-6">
              <h3 className="text-lg font-medium text-[#191C1B] dark:text-[#E1E3E0] mb-4">Cross-Tenant Security Alerts</h3>
              <div className="space-y-4">
                {alerts.map(a => (
                  <div key={a.id} className="flex gap-4 p-4 rounded-lg bg-[#F0F5F3] dark:bg-[#272B2A] border-l-4 border-red-500">
                    <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#191C1B] dark:text-[#E1E3E0]">{a.type}</span>
                        <span className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full uppercase">{a.severity}</span>
                      </div>
                      <p className="text-sm text-[#404947] dark:text-[#BFC9C6] mt-1">Tenant: {a.tenantName || 'Unknown'} | IP: {a.sourceIp}</p>
                      <p className="text-sm text-[#191C1B] dark:text-[#E1E3E0] mt-2">{a.details}</p>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No security alerts detected.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impersonate' && (
          <div className="bg-white dark:bg-[#191C1B] rounded-xl shadow-sm border border-[#E1E3E0] dark:border-[#404947] overflow-hidden p-6">
             <h3 className="text-lg font-medium text-[#191C1B] dark:text-[#E1E3E0] mb-4">Active Impersonation Sessions</h3>
             <div className="space-y-4">
               {impersonationSessions.map(s => (
                 <div key={s.id} className={`p-4 rounded-lg border ${s.active ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'border-gray-200 dark:border-gray-800 opacity-60'}`}>
                   <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">Platform User: {s.platformUserName}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Target Tenant: {s.targetTenantName}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Reason: {s.reason}</p>
                      </div>
                      <div>
                         <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${s.active ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'}`}>
                           {s.active ? 'Active' : 'Ended'}
                         </span>
                      </div>
                   </div>
                 </div>
               ))}
               {impersonationSessions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No impersonation history.</div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'billing' && billing && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="bg-white dark:bg-[#191C1B] p-6 rounded-xl border border-[#E1E3E0] dark:border-[#404947]">
                 <div className="text-sm text-[#404947] dark:text-[#BFC9C6] mb-1">Total MRR</div>
                 <div className="text-3xl font-bold text-[#191C1B] dark:text-[#E1E3E0]">₹{(billing.totalMRR).toLocaleString()}</div>
               </div>
               <div className="bg-white dark:bg-[#191C1B] p-6 rounded-xl border border-[#E1E3E0] dark:border-[#404947]">
                 <div className="text-sm text-[#404947] dark:text-[#BFC9C6] mb-1">Enterprise Tenants</div>
                 <div className="text-3xl font-bold text-[#191C1B] dark:text-[#E1E3E0]">{billing.tierCounts.enterprise}</div>
               </div>
               <div className="bg-white dark:bg-[#191C1B] p-6 rounded-xl border border-[#E1E3E0] dark:border-[#404947]">
                 <div className="text-sm text-[#404947] dark:text-[#BFC9C6] mb-1">Growth Tenants</div>
                 <div className="text-3xl font-bold text-[#191C1B] dark:text-[#E1E3E0]">{billing.tierCounts.growth}</div>
               </div>
               <div className="bg-white dark:bg-[#191C1B] p-6 rounded-xl border border-[#E1E3E0] dark:border-[#404947]">
                 <div className="text-sm text-[#404947] dark:text-[#BFC9C6] mb-1">Failed Invoices</div>
                 <div className="text-3xl font-bold text-red-600">{billing.prioritizedInvoices.filter(i => i.status === 'failed').length}</div>
               </div>
            </div>
            <div className="bg-white dark:bg-[#191C1B] rounded-xl shadow-sm border border-[#E1E3E0] dark:border-[#404947] overflow-hidden p-6">
              <h3 className="text-lg font-medium text-[#191C1B] dark:text-[#E1E3E0] mb-4">All Invoices</h3>
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F0F5F3] dark:bg-[#272B2A] text-[#404947] dark:text-[#BFC9C6] font-medium">
                  <tr>
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Invoice ID</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E3E0] dark:divide-[#404947]">
                  {billing.allInvoices.map((inv: any) => (
                     <tr key={inv.id}>
                        <td className="px-4 py-3 font-medium text-[#191C1B] dark:text-[#E1E3E0]">{inv.tenantName}</td>
                        <td className="px-4 py-3 font-mono text-xs">{inv.invoiceId}</td>
                        <td className="px-4 py-3">₹{inv.amount.toLocaleString()}</td>
                        <td className="px-4 py-3">{new Date(inv.dueDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                           <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                             inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                             inv.status === 'overdue' || inv.status === 'failed' ? 'bg-red-100 text-red-800' :
                             'bg-amber-100 text-amber-800'
                           }`}>
                             {inv.status.toUpperCase()}
                           </span>
                        </td>
                     </tr>
                  ))}
                  {billing.allInvoices.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No invoices.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="bg-white dark:bg-[#191C1B] rounded-xl shadow-sm border border-[#E1E3E0] dark:border-[#404947] overflow-hidden p-6">
             <h3 className="text-lg font-medium text-[#191C1B] dark:text-[#E1E3E0] mb-4">Feature Flags</h3>
             <div className="space-y-4">
               {features.map(f => (
                 <div key={f.id} className="p-4 rounded-lg border border-[#E1E3E0] dark:border-[#404947] flex justify-between items-center">
                    <div>
                       <h4 className="font-semibold text-[#191C1B] dark:text-[#E1E3E0]">{f.key}</h4>
                       <p className="text-sm text-[#404947] dark:text-[#BFC9C6] mt-1">{f.description}</p>
                       <div className="flex gap-2 mt-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${f.enabledGlobally ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            Global: {f.enabledGlobally ? 'ON' : 'OFF'}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                            Rollout: {f.rolloutPercentage}%
                          </span>
                          {f.enabledForTenantIds?.length > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                              Specific Tenants: {f.enabledForTenantIds.length}
                            </span>
                          )}
                       </div>
                    </div>
                    <button className="px-4 py-2 bg-white dark:bg-[#191C1B] border border-[#00695C] text-[#00695C] dark:text-[#4DB6AC] rounded-lg hover:bg-[#F0F5F3] dark:hover:bg-[#004F46]/30 text-sm font-medium transition-colors">
                      Edit Rollout
                    </button>
                 </div>
               ))}
               {features.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No feature flags registered.</div>
               )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
