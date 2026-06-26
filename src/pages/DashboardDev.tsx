import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Doc } from '../../convex/_generated/dataModel';
import { Plus, X, Clock, Trash2, Crown, Star, Zap, CheckCircle, XCircle, RefreshCw, Copy, Check, Hash } from 'lucide-react';
import './DashboardDev.css';

const PLAN_ICONS: Record<string, React.ReactNode> = {
  starter: <Star size={16} />,
  pro: <Zap size={16} />,
  ultimate: <Crown size={16} />,
};

const PLAN_NAMES: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  ultimate: 'Ultimate',
};

export function DashboardDev() {
  const subscriptions = useQuery(api.dev.getAllSubscriptions);
  const codes = useQuery(api.redeemCode.getAllCodes);
  const createSubscription = useMutation(api.dev.createSubscription);
  const extendSubscription = useMutation(api.dev.extendSubscription);
  const setStatus = useMutation(api.dev.setSubscriptionStatus);
  const deleteSub = useMutation(api.dev.deleteSubscription);
  const generateCode = useMutation(api.redeemCode.generateCode);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formUserId, setFormUserId] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPlan, setFormPlan] = useState('starter');
  const [formPeriod, setFormPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [formDuration, setFormDuration] = useState(30);
  const [formStatus, setFormStatus] = useState('active');
  const [submitting, setSubmitting] = useState(false);

  const [extendId, setExtendId] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [extending, setExtending] = useState(false);

  const [codePlan, setCodePlan] = useState('ultimate');
  const [codeDays, setCodeDays] = useState(365);
  const [generating, setGenerating] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!formUserId.trim()) return;
    setSubmitting(true);
    try {
      const now = Date.now();
      await createSubscription({
        userId: formUserId.trim(),
        email: formEmail.trim() || undefined,
        planId: formPlan,
        billingPeriod: formPeriod,
        status: formStatus,
        currentPeriodStart: now,
        currentPeriodEnd: now + formDuration * 86400000,
      });
      setShowAddForm(false);
      setFormUserId('');
      setFormEmail('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExtend = async (id: string) => {
    setExtending(true);
    try {
      await extendSubscription({ subscriptionId: id as any, days: extendDays });
      setExtendId(null);
      setExtendDays(30);
    } finally {
      setExtending(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'cancelled' : 'active';
    await setStatus({ subscriptionId: id as any, status: newStatus });
  };

  const handleChangePlan = async (id: string, planId: string) => {
    await setStatus({ subscriptionId: id as any, status: 'active', planId });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const code = await generateCode({ planId: codePlan, durationDays: codeDays });
      setLastCode(code);
      setCopied(false);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const loading = subscriptions === undefined || codes === undefined;

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="btn-spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
      </div>
    );
  }

  return (
    <div className="dev-dashboard">
      <div className="dev-header">
        <div>
          <h1 className="dev-title">Developer Admin</h1>
          <p className="dev-subtitle">{subscriptions.length} subscriptions · {codes.length} codes</p>
        </div>
        <button className="dev-btn dev-btn--primary" onClick={() => setShowAddForm(true)}>
          <Plus size={16} /> New Subscription
        </button>
      </div>

      {showAddForm && (
        <div className="dev-modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="dev-modal" onClick={e => e.stopPropagation()}>
            <div className="dev-modal-header">
              <h2>Create Subscription</h2>
              <button className="dev-modal-close" onClick={() => setShowAddForm(false)}><X size={18} /></button>
            </div>
            <div className="dev-modal-body">
              <div className="dev-field">
                <label>User ID *</label>
                <input value={formUserId} onChange={e => setFormUserId(e.target.value)} placeholder="User ID from auth" />
              </div>
              <div className="dev-field">
                <label>Email</label>
                <input value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="user@example.com" />
              </div>
              <div className="dev-row">
                <div className="dev-field">
                  <label>Plan</label>
                  <select value={formPlan} onChange={e => setFormPlan(e.target.value)}>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="ultimate">Ultimate</option>
                  </select>
                </div>
                <div className="dev-field">
                  <label>Billing</label>
                  <select value={formPeriod} onChange={e => setFormPeriod(e.target.value as any)}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="dev-row">
                <div className="dev-field">
                  <label>Duration (days)</label>
                  <input type="number" value={formDuration} onChange={e => setFormDuration(Number(e.target.value))} min={1} />
                </div>
                <div className="dev-field">
                  <label>Status</label>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="dev-modal-footer">
              <button className="dev-btn" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button className="dev-btn dev-btn--primary" onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Code Generator ── */}
      <div className="dev-code-section">
        <div className="dev-code-form">
          <h3 className="dev-section-title"><Hash size={18} /> Generate Activation Code</h3>
          <div className="dev-code-row">
            <div className="dev-field">
              <label>Plan</label>
              <select value={codePlan} onChange={e => setCodePlan(e.target.value)}>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="ultimate">Ultimate</option>
              </select>
            </div>
            <div className="dev-field">
              <label>Duration (days)</label>
              <input type="number" value={codeDays} onChange={e => setCodeDays(Number(e.target.value))} min={1} />
            </div>
            <div className="dev-field dev-field-btn">
              <label>&nbsp;</label>
              <button className="dev-btn dev-btn--primary" onClick={handleGenerate} disabled={generating}>
                {generating ? '...' : 'Generate Code'}
              </button>
            </div>
          </div>
          {lastCode && (
            <div className="dev-code-result">
              <span className="dev-code-label">Code:</span>
              <span className="dev-code-value">{lastCode}</span>
              <button className="dev-btn dev-btn--sm" onClick={() => copyToClipboard(lastCode)}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {/* ── Recent Codes ── */}
        {codes.length > 0 && (
          <div className="dev-codes-list">
            <h4>Recent Codes</h4>
            <div className="dev-codes-grid">
              {codes.slice(0, 20).map((c) => (
                <div key={c._id} className={`dev-code-chip ${c.used ? 'used' : ''}`}>
                  <span className="dev-chip-code">{c.code}</span>
                  <span className={`dev-plan-badge plan-${c.planId}`}>{PLAN_NAMES[c.planId]}</span>
                  <span className="dev-chip-days">{c.durationDays}d</span>
                  {c.used ? (
                    <span className="dev-chip-used">Used</span>
                  ) : (
                    <span className="dev-chip-avail">Available</span>
                  )}
                  {!c.used && (
                    <button className="dev-btn-icon" title="Copy" onClick={() => copyToClipboard(c.code)}>
                      <Copy size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Subscriptions Table ── */}
      <div className="dev-table-wrap">
        <table className="dev-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Email</th>
              <th>Restaurant</th>
              <th>Plan</th>
              <th>Period</th>
              <th>Status</th>
              <th>Started</th>
              <th>Expires</th>
              <th>Time Left</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.length === 0 && (
              <tr>
                <td colSpan={10} className="dev-empty">No subscriptions yet</td>
              </tr>
            )}
            {subscriptions.map((sub: Doc<"subscriptions"> & { restaurantName: string | null }) => {
              const now = Date.now();
              const expired = sub.currentPeriodEnd < now;
              const daysLeft = Math.ceil((sub.currentPeriodEnd - now) / 86400000);
              return (
                <tr key={sub._id} className={expired ? 'row-expired' : ''}>
                  <td className="dev-cell-mono" title={sub.userId}>{sub.userId.slice(0, 16)}...</td>
                  <td>{sub.email || '—'}</td>
                  <td>{sub.restaurantName || '—'}</td>
                  <td>
                    <span className={`dev-plan-badge plan-${sub.planId}`}>
                      {PLAN_ICONS[sub.planId]} {PLAN_NAMES[sub.planId] || sub.planId}
                    </span>
                  </td>
                  <td className="dev-cell-mono">{sub.billingPeriod}</td>
                  <td>
                    <span className={`dev-status status-${sub.status}`}>
                      {sub.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {sub.status}
                    </span>
                  </td>
                  <td className="dev-cell-mono">{new Date(sub.currentPeriodStart).toLocaleDateString()}</td>
                  <td className="dev-cell-mono">{new Date(sub.currentPeriodEnd).toLocaleDateString()}</td>
                  <td>
                    {expired ? (
                      <span className="dev-timeout">Expired</span>
                    ) : (
                      <span className="dev-days">{daysLeft}d</span>
                    )}
                  </td>
                  <td>
                    <div className="dev-actions">
                      {extendId === sub._id ? (
                        <div className="dev-extend-inline">
                          <input type="number" value={extendDays} onChange={e => setExtendDays(Number(e.target.value))} min={1} className="dev-extend-input" />
                          <button className="dev-btn dev-btn--sm" onClick={() => handleExtend(sub._id)} disabled={extending}>
                            {extending ? '...' : 'Add'}
                          </button>
                          <button className="dev-btn dev-btn--sm dev-btn--ghost" onClick={() => setExtendId(null)}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button className="dev-btn-icon" title="Extend" onClick={() => { setExtendId(sub._id); setExtendDays(30); }}>
                            <Clock size={14} />
                          </button>
                          <button className="dev-btn-icon" title="Toggle active/cancelled" onClick={() => handleToggleStatus(sub._id, sub.status)}>
                            <RefreshCw size={14} />
                          </button>
                          <select
                            className="dev-plan-select"
                            value={sub.planId}
                            onChange={e => handleChangePlan(sub._id, e.target.value)}
                            title="Change plan"
                          >
                            <option value="starter">Starter</option>
                            <option value="pro">Pro</option>
                            <option value="ultimate">Ultimate</option>
                          </select>
                          <button
                            className="dev-btn-icon dev-btn-icon--danger"
                            title="Delete"
                            onClick={async () => {
                              if (confirm(`Delete subscription for ${sub.email || sub.userId}?`)) {
                                await deleteSub({ subscriptionId: sub._id });
                              }
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
