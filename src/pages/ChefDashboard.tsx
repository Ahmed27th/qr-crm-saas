import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  ChefHat, Clock, CheckCircle2, Play, UtensilsCrossed,
  AlertCircle, Bell, Wifi, WifiOff, AlertTriangle,
  Flame, Timer, BarChart3, List
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Order } from '../dataStore';
import { useOrderManagement } from '../hooks/useOrderManagement';
import './ChefDashboard.css';

interface PrepInfo { station: string; prepTime: number; }

interface OrderItemWithPacing {
  name: string;
  qty: number;
  station: string;
  prepTime: number;
  isPaced: boolean;
  remaining: number;
  showForStation: boolean;
}

interface OrderWithPacing extends Order {
  pacedItems: OrderItemWithPacing[];
}

const ITEM_PREP_MAP: [string, PrepInfo][] = [
  ['onion rings', { station: 'fry', prepTime: 4 }],
  ['steak', { station: 'grill', prepTime: 15 }],
  ['tajine', { station: 'grill', prepTime: 15 }],
  ['couscous', { station: 'grill', prepTime: 15 }],
  ['pizza', { station: 'pizza', prepTime: 10 }],
  ['chicken', { station: 'grill', prepTime: 12 }],
  ['pastilla', { station: 'grill', prepTime: 12 }],
  ['burger', { station: 'grill', prepTime: 10 }],
  ['brochette', { station: 'grill', prepTime: 10 }],
  ['kefta', { station: 'grill', prepTime: 10 }],
  ['mergez', { station: 'grill', prepTime: 8 }],
  ['frites', { station: 'fry', prepTime: 5 }],
  ['fries', { station: 'fry', prepTime: 5 }],
  ['nuggets', { station: 'fry', prepTime: 5 }],
  ['harira', { station: 'grill', prepTime: 5 }],
  ['hrira', { station: 'grill', prepTime: 5 }],
  ['salade', { station: 'cold', prepTime: 3 }],
  ['salad', { station: 'cold', prepTime: 3 }],
  ['tartare', { station: 'cold', prepTime: 4 }],
  ['dessert', { station: 'cold', prepTime: 2 }],
  ['boisson', { station: 'cold', prepTime: 1 }],
  ['drink', { station: 'cold', prepTime: 1 }],
  ['soda', { station: 'cold', prepTime: 1 }],
  ['jus', { station: 'cold', prepTime: 1 }],
  ['water', { station: 'cold', prepTime: 1 }],
  ['lben', { station: 'cold', prepTime: 1 }],
];

const DEFAULT_PREP: PrepInfo = { station: 'expo', prepTime: 5 };

function getPrep(name: string): PrepInfo {
  const lower = name.toLowerCase();
  for (const [keyword, prep] of ITEM_PREP_MAP) {
    if (lower.includes(keyword)) return prep;
  }
  return DEFAULT_PREP;
}

const STATIONS = ['expo', 'grill', 'fry', 'cold', 'pizza'] as const;
type Station = typeof STATIONS[number];

const STATION_META: Record<string, { label: string; short: string }> = {
  expo: { label: 'All Stations', short: 'All' },
  grill: { label: 'Grill', short: 'GR' },
  fry: { label: 'Fry', short: 'FR' },
  cold: { label: 'Cold', short: 'CO' },
  pizza: { label: 'Pizza', short: 'PZ' },
};

export function ChefDashboard() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevStationPendingIds = useRef<string[]>([]);
  const newColRef = useRef<HTMLDivElement>(null);
  const prepColRef = useRef<HTMLDivElement>(null);

  const [currentStation, setCurrentStation] = useState<Station>('expo');
  const [allDayMode, setAllDayMode] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [tick, setTick] = useState(0);
  const [showStationBar, setShowStationBar] = useState(false);

  const { orders, startPreparing, finishPreparing } = useOrderManagement({
    restaurantId: restaurantId!,
    pollIntervalMs: 3000,
  });

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

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

  // ── Global max prep per order (for pacing across all stations) ──
  const orderMaxPrep = useMemo(() => {
    const map: Record<string, number> = {};
    for (const order of orders) {
      const items = order.orderItems || [];
      map[order.id] = items.length > 0
        ? Math.max(...items.map(i => getPrep(i.name).prepTime))
        : 0;
    }
    return map;
    // Only recalc when orders change, not on tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  // ── Station-aware orders with pacing ──
  const ordersWithPacing = useMemo((): OrderWithPacing[] => {
    const nowMs = Date.now();
    return orders.map(order => {
      const items = order.orderItems || [];
      const globalMax = orderMaxPrep[order.id] || 0;

      const pacedItems = items.map(item => {
        const prep = getPrep(item.name);
        const showForStation = currentStation === 'expo' || prep.station === currentStation;
        const delay = globalMax - prep.prepTime;
        const elapsed = (nowMs - order.time) / 60000;
        const remaining = Math.max(0, Math.ceil(delay - elapsed));
        return {
          ...item,
          station: prep.station,
          prepTime: prep.prepTime,
          isPaced: delay > 0 && remaining > 0,
          remaining,
          showForStation,
        };
      });

      return { ...order, pacedItems };
    });
  }, [orders, orderMaxPrep, currentStation, tick]);

  // ── Filter orders that have items for current station ──
  const stationOrders = useMemo(() => {
    if (currentStation === 'expo') return ordersWithPacing;
    return ordersWithPacing.filter(o =>
      o.pacedItems.some(i => i.showForStation)
    );
  }, [ordersWithPacing, currentStation]);

  const pending = useMemo(
    () => stationOrders.filter(o => o.status === 'pending'),
    [stationOrders]
  );
  const preparing = useMemo(
    () => stationOrders.filter(o => o.status === 'preparing'),
    [stationOrders]
  );

  // ── Station counts for tab badges ──
  const stationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of STATIONS) {
      if (s === 'expo') continue;
      counts[s] = orders.filter(o => {
        const items = o.orderItems || [];
        return items.some(i => getPrep(i.name).station === s);
      }).length;
    }
    return counts;
  }, [orders]);

  // ── All-Day aggregation ──
  const allDayItems = useMemo(() => {
    type AggOrder = { id: string; shortId: string; qty: number; status: string };
    const agg: Record<string, { totalQty: number; station: string; orders: AggOrder[] }> = {};
    for (const order of orders) {
      for (const item of (order.orderItems || [])) {
        const prep = getPrep(item.name);
        if (currentStation !== 'expo' && prep.station !== currentStation) continue;
        if (!agg[item.name]) {
          agg[item.name] = { totalQty: 0, station: prep.station, orders: [] };
        }
        agg[item.name].totalQty += item.qty;
        agg[item.name].orders.push({
          id: order.id,
          shortId: order.id.slice(-6),
          qty: item.qty,
          status: order.status,
        });
      }
    }
    return Object.entries(agg)
      .sort((a, b) => b[1].totalQty - a[1].totalQty)
      .map(([name, data]) => ({ name, ...data }));
  }, [orders, currentStation, tick]);

  // ── Sound on new orders for current station ──
  useEffect(() => {
    const ids = pending.map(o => o.id);
    const prevIds = prevStationPendingIds.current;
    const hasNew = ids.some(id => !prevIds.includes(id));
    if (hasNew && prevIds.length > 0) {
      audioRef.current?.play().catch(() => {});
    }
    prevStationPendingIds.current = ids;
  }, [pending]);

  // ── Metrics (station-aware) ──
  const metrics = useMemo(() => {
    const targetOrders = currentStation === 'expo' ? orders : stationOrders;
    const allTimers = targetOrders.map(o => getTimer(o.time));
    const waitTimes = targetOrders.map(o => (Date.now() - o.time) / 60000);
    const avgWait = waitTimes.length ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length) : 0;
    const maxWait = waitTimes.length ? Math.round(Math.max(...waitTimes)) : 0;
    const atRisk = allTimers.filter(t => t.warning).length;
    const urgent = allTimers.filter(t => t.urgent).length;

    const stuckOrders = targetOrders.filter(o => getTimer(o.time).warning || getTimer(o.time).urgent);
    const itemScore: Record<string, { count: number; totalWait: number; orders: Set<string> }> = {};
    for (const o of stuckOrders) {
      const wait = (Date.now() - o.time) / 60000;
      for (const item of o.orderItems || []) {
        const prep = getPrep(item.name);
        if (currentStation !== 'expo' && prep.station !== currentStation) continue;
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

    const itemFreq: Record<string, number> = {};
    for (const o of targetOrders) {
      for (const item of o.orderItems || []) {
        const prep = getPrep(item.name);
        if (currentStation !== 'expo' && prep.station !== currentStation) continue;
        itemFreq[item.name] = (itemFreq[item.name] || 0) + item.qty;
      }
    }
    const hotItems = Object.entries(itemFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));

    return { avgWait, maxWait, atRisk, urgent, bottlenecks, hotItems, total: targetOrders.length };
  }, [orders, stationOrders, currentStation]);

  // ── Render All-Day View ──
  const renderAllDayView = () => (
    <section className="kds-all-day-view">
      <div className="kds-all-day-header">
        <h2><List size={18} /> {STATION_META[currentStation].label} &middot; All-Day</h2>
        <span className="kds-all-day-total-label">{allDayItems.reduce((a, i) => a + i.totalQty, 0)} total</span>
      </div>
      <div className="kds-all-day-list">
        {allDayItems.length > 0 ? (
          allDayItems.map(item => (
            <div key={item.name} className="kds-all-day-row">
              <span className="kds-all-day-total">{item.totalQty}x</span>
              <span className="kds-all-day-name">{item.name}</span>
              {currentStation === 'expo' && (
                <span className={`kds-item-station-badge ${item.station}`}>{STATION_META[item.station]?.short || item.station}</span>
              )}
              <div className="kds-all-day-orders">
                {item.orders.map((o, i) => (
                  <span key={i} className={`kds-all-day-order-ref ${o.status}`} title={`#${o.shortId} ×${o.qty}`}>
                    #{o.shortId} &times;{o.qty}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="kds-all-day-empty">
            <UtensilsCrossed size={48} />
            <p>No items for this station</p>
          </div>
        )}
      </div>
    </section>
  );

  // ── Render Ticket ──
  const renderTicket = (order: OrderWithPacing) => {
    const timer = getTimer(order.time);
    const timerClass = timer.urgent ? 'urgent' : timer.warning ? 'warning' : 'fresh';

    const visibleItems = order.pacedItems.filter(i => i.showForStation);
    const hiddenCount = order.pacedItems.filter(i => !i.showForStation).length;

    const hasBottleneck = visibleItems.some(
      item => metrics.bottlenecks.some(b => b.name === item.name)
    );

    return (
      <div key={order.id} className={`kds-ticket ${timerClass} ${hasBottleneck ? 'has-bottleneck' : ''}`}>
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
          {visibleItems.length > 0 ? (
            visibleItems.map((item, idx) => {
              const isBottleneck = metrics.bottlenecks.some(b => b.name === item.name);
              const isPaced = item.isPaced;
              return (
                <div key={idx} className={`kds-item-row ${isBottleneck ? 'bottleneck-item' : ''} ${isPaced ? 'paced' : ''}`}>
                  <span className="kds-item-qty">{item.qty}</span>
                  <span className="kds-item-name">
                    {item.name}
                    {currentStation === 'expo' && (
                      <span className={`kds-item-station-badge ${item.station}`}>{STATION_META[item.station]?.short || item.station}</span>
                    )}
                  </span>
                  {isPaced && (
                    <span className="kds-pacing-badge">Starts in {item.remaining}m</span>
                  )}
                  {isBottleneck && !isPaced && <AlertTriangle size={12} className="kds-item-warn" />}
                </div>
              );
            })
          ) : (
            <div className="kds-item-row">
              <span className="kds-item-qty">{order.items}</span>
              <span className="kds-item-name">{t('chef_misc_items')}</span>
            </div>
          )}
          {hiddenCount > 0 && (
            <div className="kds-hidden-count">+{hiddenCount} item{hiddenCount > 1 ? 's' : ''} (other stations)</div>
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
          <button
            className={`kds-station-toggle ${showStationBar ? 'active' : ''}`}
            onClick={() => setShowStationBar(v => !v)}
            title="Toggle station bar"
          >
            Stations
          </button>
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
          {!allDayMode && (
            <button
              className="kds-all-day-btn"
              onClick={() => setAllDayMode(true)}
              title="Switch to All-Day aggregation"
            >
              <List size={14} />
              All-Day
            </button>
          )}
          {allDayMode && (
            <button
              className="kds-all-day-btn active"
              onClick={() => setAllDayMode(false)}
              title="Switch to ticket view"
            >
              <List size={14} />
              Tickets
            </button>
          )}
          <button
            className={`kds-metrics-toggle ${showMetrics ? 'active' : ''}`}
            onClick={() => setShowMetrics(!showMetrics)}
            title="Performance Metrics"
          >
            <BarChart3 size={16} />
          </button>
          <button className="kds-sound-btn" onClick={() => audioRef.current?.play().catch(() => {})}>
            <Bell size={16} />
          </button>
        </div>
      </header>

      {/* ── Station Bar ── */}
      {showStationBar && (
        <div className="kds-station-bar">
          {STATIONS.map(s => (
            <button
              key={s}
              className={`kds-station-tab ${currentStation === s ? 'active' : ''}`}
              onClick={() => setCurrentStation(s)}
            >
              <span className={`kds-station-label ${s}`}>{STATION_META[s].label}</span>
              {s !== 'expo' && (
                <span className="kds-station-count">{stationCounts[s] || 0}</span>
              )}
            </button>
          ))}
        </div>
      )}

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
                <span className="kds-metric-label">{currentStation === 'expo' ? 'Active Tickets' : `${STATION_META[currentStation].label} Orders`}</span>
              </div>
            </div>
          </div>

          {metrics.bottlenecks.length > 0 && (
            <div className="kds-bottleneck-section">
              <div className="kds-bottleneck-header">
                <AlertTriangle size={14} />
                <span>Bottleneck Items &mdash; delaying {metrics.bottlenecks.reduce((a, b) => a + b.orders, 0)} tickets</span>
              </div>
              <div className="kds-bottleneck-list">
                {metrics.bottlenecks.map((item, i) => (
                  <div key={i} className="kds-bottleneck-item" style={{
                    '--bottleneck-pct': `${Math.max(20, 100 - i * 15)}%`
                  } as React.CSSProperties}>
                    <span className="kds-bottleneck-name">{item.name}</span>
                    <span className="kds-bottleneck-badge">&times;{item.count} on {item.orders} tickets</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {metrics.hotItems.length > 0 && (
            <div className="kds-hot-section">
              <div className="kds-hot-header">
                <Flame size={14} />
                <span>Hot Items &mdash; most ordered right now</span>
              </div>
              <div className="kds-hot-list">
                {metrics.hotItems.map((item, i) => (
                  <div key={i} className="kds-hot-item">
                    <span className="kds-hot-name">{item.name}</span>
                    <span className="kds-hot-qty">&times;{item.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Body ── */}
      {allDayMode ? renderAllDayView() : (
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
      )}
    </div>
  );
}
