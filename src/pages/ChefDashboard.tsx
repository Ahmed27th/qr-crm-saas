import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  ChefHat, Clock, CheckCircle2, Play, UtensilsCrossed,
  AlertCircle, Bell, Wifi, WifiOff, AlertTriangle,
  Flame, Timer, BarChart3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Order } from '../dataStore';
import { useOrderManagement } from '../hooks/useOrderManagement';
import './ChefDashboard.css';

export function ChefDashboard() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevPendingCount = useRef(0);
  const newColRef = useRef<HTMLDivElement>(null);
  const prepColRef = useRef<HTMLDivElement>(null);
  const [showMetrics, setShowMetrics] = useState(true);

  const { orders, startPreparing, finishPreparing } = useOrderManagement({
    restaurantId: restaurantId!,
    pollIntervalMs: 3000,
  });

  useEffect(() => {
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    if (pendingCount > prevPendingCount.current && prevPendingCount.current > 0) {
      if (audioRef.current) audioRef.current.play().catch(() => {});
    }
    prevPendingCount.current = pendingCount;
  }, [orders]);

  const getTimer = (time: number) => {
    const mins = Math.floor((Date.now() - time) / 60000);
    return {
      mins,
      urgent: mins > 15,
      warning: mins > 8 && mins <= 15,
      fresh: mins <= 8,
    };
  };

  const sourceColors: Record<string, string> = {
    ubereats: '#5cb85c',
    glovo: '#ff6b35',
    qr: 'var(--accent-primary)',
  };

  const pending = useMemo(
    () => orders.filter(o => o.status === 'pending').sort((a, b) => b.time - a.time),
    [orders]
  );
  const preparing = useMemo(
    () => orders.filter(o => o.status === 'preparing').sort((a, b) => b.time - a.time),
    [orders]
  );

  // ── Metrics ──
  const metrics = useMemo(() => {
    const allTimers = orders.map(o => getTimer(o.time));
    const waitTimes = orders.map(o => (Date.now() - o.time) / 60000);
    const avgWait = waitTimes.length ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length) : 0;
    const maxWait = waitTimes.length ? Math.round(Math.max(...waitTimes)) : 0;
    const atRisk = allTimers.filter(t => t.warning).length;
    const urgent = allTimers.filter(t => t.urgent).length;

    // Bottleneck items: items appearing on orders waiting > 8 min, weighted by qty * wait time
    const stuckOrders = orders.filter(o => getTimer(o.time).warning || getTimer(o.time).urgent);
    const itemScore: Record<string, { count: number; totalWait: number; orders: Set<string> }> = {};
    for (const o of stuckOrders) {
      const wait = (Date.now() - o.time) / 60000;
      for (const item of o.orderItems || []) {
        if (!itemScore[item.name]) {
          itemScore[item.name] = { count: 0, totalWait: 0, orders: new Set() };
        }
        itemScore[item.name].count += item.qty;
        itemScore[item.name].totalWait += wait * item.qty;
        itemScore[item.name].orders.add(o.id);
      }
    }
    const bottlenecks = Object.entries(itemScore)
      .sort((a, b) => b[1].totalWait - a[1].totalWait)
      .slice(0, 5)
      .map(([name, data]) => ({ name, count: data.count, orders: data.orders.size, score: Math.round(data.totalWait) }));

    // Hot items: most frequently ordered right now (across all active orders)
    const itemFreq: Record<string, number> = {};
    for (const o of orders) {
      for (const item of o.orderItems || []) {
        itemFreq[item.name] = (itemFreq[item.name] || 0) + item.qty;
      }
    }
    const hotItems = Object.entries(itemFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));

    return { avgWait, maxWait, atRisk, urgent, bottlenecks, hotItems, total: orders.length };
  }, [orders]);

  // ── Render ticket ──
  const renderTicket = (order: Order) => {
    const timer = getTimer(order.time);
    const timerClass = timer.urgent ? 'urgent' : timer.warning ? 'warning' : 'fresh';

    // Check if any item is a known bottleneck
    const hasBottleneckItem = order.orderItems?.some(
      item => metrics.bottlenecks.some(b => b.name === item.name)
    );

    return (
      <div key={order.id} className={`kds-ticket ${timerClass} ${hasBottleneckItem ? 'has-bottleneck' : ''}`}>
        <div className="kds-ticket-header">
          <div className="kds-ticket-id">#{order.id.slice(-6)}</div>
          <div className={`kds-ticket-timer ${timerClass}`}>
            <Clock size={16} />
            <span>{timer.mins}</span>
            <span className="kds-timer-unit">min</span>
          </div>
        </div>

        <div className="kds-ticket-meta">
          <span className="kds-ticket-table">
            <UtensilsCrossed size={14} />
            {t('chef_table')} {order.table}
          </span>
          {order.source && (
            <span className="kds-ticket-source" style={{
              background: `${sourceColors[order.source] || '#888'}22`,
              color: sourceColors[order.source] || 'var(--text-secondary)'
            }}>
              {order.source}
            </span>
          )}
        </div>

        <div className="kds-ticket-items">
          {order.orderItems ? (
            order.orderItems.map((item, idx) => {
              const isBottleneck = metrics.bottlenecks.some(b => b.name === item.name);
              return (
                <div key={idx} className={`kds-item-row ${isBottleneck ? 'bottleneck-item' : ''}`}>
                  <span className="kds-item-qty">{item.qty}</span>
                  <span className="kds-item-name">{item.name}</span>
                  {isBottleneck && <AlertTriangle size={12} className="kds-item-warn" />}
                </div>
              );
            })
          ) : (
            <div className="kds-item-row">
              <span className="kds-item-qty">{order.items}</span>
              <span className="kds-item-name">{t('chef_misc_items')}</span>
            </div>
          )}
        </div>

        {order.deliveryInstructions && (
          <div className="kds-ticket-note">
            <AlertCircle size={12} />
            {order.deliveryInstructions}
          </div>
        )}

        {order.customerName && (
          <div className="kds-ticket-customer">{order.customerName}</div>
        )}

        <div className="kds-ticket-actions">
          {order.status === 'pending' && (
            <button className="kds-btn kds-btn-start" onClick={() => startPreparing(order.id)}>
              <Play size={20} />
              {t('chef_start')}
            </button>
          )}
          {order.status === 'preparing' && (
            <button className="kds-btn kds-btn-finish" onClick={() => finishPreparing(order.id)}>
              <CheckCircle2 size={20} />
              {t('chef_finish')}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="kds-page">
      <audio
        ref={audioRef}
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
        preload="auto"
      />

      <header className="kds-header">
        <div className="kds-header-left">
          <div className="kds-brand">
            <ChefHat size={22} />
            <h1>KDS</h1>
          </div>
          <div className={`kds-status ${orders.length > 0 ? 'live' : 'off'}`}>
            {orders.length > 0 ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{orders.length > 0 ? 'Live' : 'Waiting...'}</span>
          </div>
        </div>

        <div className="kds-stats">
          {metrics.urgent > 0 && (
            <div className="kds-stat kds-stat-urgent">
              <AlertTriangle size={16} />
              <span className="kds-stat-num">{metrics.urgent}</span>
              <span className="kds-stat-label">Urgent</span>
            </div>
          )}
          {metrics.atRisk > 0 && (
            <div className="kds-stat kds-stat-risk">
              <Timer size={16} />
              <span className="kds-stat-num">{metrics.atRisk}</span>
              <span className="kds-stat-label">At Risk</span>
            </div>
          )}
          <div className="kds-stat kds-stat-new">
            <span className="kds-stat-num">{pending.length}</span>
            <span className="kds-stat-label">{t('chef_orders_new')}</span>
          </div>
          <div className="kds-stat kds-stat-prep">
            <span className="kds-stat-num">{preparing.length}</span>
            <span className="kds-stat-label">{t('chef_orders_preparing')}</span>
          </div>
        </div>

        <div className="kds-header-right">
          <button className={`kds-metrics-toggle ${showMetrics ? 'active' : ''}`}
            onClick={() => setShowMetrics(!showMetrics)}
            title="Performance Metrics">
            <BarChart3 size={16} />
          </button>
          <button className="kds-sound-btn" onClick={() => audioRef.current?.play().catch(() => {})}>
            <Bell size={16} />
          </button>
        </div>
      </header>

      {/* ── Metrics Panel ── */}
      {showMetrics && (
        <div className="kds-metrics">
          <div className="kds-metrics-grid">
            <div className="kds-metric-card">
              <div className="kds-metric-icon avg">
                <Clock size={18} />
              </div>
              <div className="kds-metric-body">
                <span className="kds-metric-value">{metrics.avgWait}<span className="kds-metric-unit">m</span></span>
                <span className="kds-metric-label">Avg Wait</span>
              </div>
            </div>
            <div className="kds-metric-card">
              <div className="kds-metric-icon max">
                <BarChart3 size={18} />
              </div>
              <div className="kds-metric-body">
                <span className="kds-metric-value">{metrics.maxWait}<span className="kds-metric-unit">m</span></span>
                <span className="kds-metric-label">Max Wait</span>
              </div>
            </div>
            <div className="kds-metric-card">
              <div className={`kds-metric-icon ${metrics.atRisk > 0 ? 'warn' : 'ok'}`}>
                <Timer size={18} />
              </div>
              <div className="kds-metric-body">
                <span className="kds-metric-value">{metrics.atRisk}<span className="kds-metric-unit"> / {metrics.urgent}</span></span>
                <span className="kds-metric-label">At Risk / Urgent</span>
              </div>
            </div>
            <div className="kds-metric-card">
              <div className="kds-metric-icon">
                <Flame size={18} />
              </div>
              <div className="kds-metric-body">
                <span className="kds-metric-value">{metrics.total}</span>
                <span className="kds-metric-label">Active Tickets</span>
              </div>
            </div>
          </div>

          {/* Bottleneck items */}
          {metrics.bottlenecks.length > 0 && (
            <div className="kds-bottleneck-section">
              <div className="kds-bottleneck-header">
                <AlertTriangle size={14} />
                <span>Bottleneck Items — delaying {metrics.bottlenecks.reduce((a, b) => a + b.orders, 0)} tickets</span>
              </div>
              <div className="kds-bottleneck-list">
                {metrics.bottlenecks.map((item, i) => (
                  <div key={i} className="kds-bottleneck-item" style={{
                    '--bottleneck-pct': `${Math.max(20, 100 - i * 15)}%`
                  } as React.CSSProperties}>
                    <span className="kds-bottleneck-name">{item.name}</span>
                    <span className="kds-bottleneck-badge">×{item.count} on {item.orders} tickets</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hot items */}
          {metrics.hotItems.length > 0 && (
            <div className="kds-hot-section">
              <div className="kds-hot-header">
                <Flame size={14} />
                <span>Hot Items — most ordered right now</span>
              </div>
              <div className="kds-hot-list">
                {metrics.hotItems.map((item, i) => (
                  <div key={i} className="kds-hot-item">
                    <span className="kds-hot-name">{item.name}</span>
                    <span className="kds-hot-qty">×{item.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main columns ── */}
      <div className="kds-body">
        <section className="kds-col">
          <div className="kds-col-header">
            <h2><Bell size={18} /> {t('chef_orders_new')}</h2>
            <span className="kds-col-count">{pending.length}</span>
          </div>
          <div className="kds-col-orders" ref={newColRef}>
            {pending.length > 0 ? (
              pending.map(renderTicket)
            ) : (
              <div className="kds-empty">
                <AlertCircle size={48} />
                <p>{t('chef_no_orders')}</p>
              </div>
            )}
          </div>
        </section>

        <section className="kds-col">
          <div className="kds-col-header">
            <h2><Play size={18} /> {t('chef_orders_preparing')}</h2>
            <span className="kds-col-count">{preparing.length}</span>
          </div>
          <div className="kds-col-orders" ref={prepColRef}>
            {preparing.length > 0 ? (
              preparing.map(renderTicket)
            ) : (
              <div className="kds-empty">
                <UtensilsCrossed size={48} />
                <p>{t('chef_no_orders')}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
