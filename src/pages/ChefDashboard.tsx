import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  ChefHat, Clock, CheckCircle2, Play, UtensilsCrossed,
  AlertCircle, Bell, Wifi, WifiOff
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

  const { orders, startPreparing, finishPreparing } = useOrderManagement({
    restaurantId: restaurantId!,
    pollIntervalMs: 3000,
  });

  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    if (pendingCount > prevPendingCount.current && prevPendingCount.current > 0) {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    }
    prevPendingCount.current = pendingCount;
  }, [orders]);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => setConnected(true), 2000);
    return () => clearTimeout(fallbackTimer);
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

  const filterOrders = (status: Order['status']) =>
    orders.filter(o => o.status === status).sort((a, b) => b.time - a.time);

  const renderTicket = (order: Order) => {
    const timer = getTimer(order.time);
    const timerClass = timer.urgent ? 'urgent' : timer.warning ? 'warning' : 'fresh';

    return (
      <div key={order.id} className={`kds-ticket ${timerClass}`}>
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
            <span className="kds-ticket-source" style={{ background: `${sourceColors[order.source] || '#888'}22`, color: sourceColors[order.source] || 'var(--text-secondary)' }}>
              {order.source}
            </span>
          )}
        </div>

        <div className="kds-ticket-items">
          {order.orderItems ? (
            order.orderItems.map((item, idx) => (
              <div key={idx} className="kds-item-row">
                <span className="kds-item-qty">{item.qty}</span>
                <span className="kds-item-name">{item.name}</span>
              </div>
            ))
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

  const pending = filterOrders('pending');
  const preparing = filterOrders('preparing');

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
          <div className={`kds-status ${connected ? 'live' : 'off'}`}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{connected ? 'Live' : 'Reconnecting...'}</span>
          </div>
        </div>

        <div className="kds-stats">
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
          <button className="kds-sound-btn" onClick={() => audioRef.current?.play().catch(() => {})}>
            <Bell size={16} />
          </button>
        </div>
      </header>

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
