import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Play, 
  UtensilsCrossed, 
  AlertCircle,
  Bell
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Order } from '../dataStore';
import { formatPrice } from '../utils/format';
import { NotificationService } from '../utils/notifications';
import { useOrderManagement } from '../hooks/useOrderManagement';
import './ChefDashboard.css';

export function ChefDashboard() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { t } = useTranslation();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPendingCount = useRef(0);

  const { orders, startPreparing, finishPreparing } = useOrderManagement({
    restaurantId: restaurantId!,
    pollIntervalMs: 3000,
  });

  useEffect(() => {
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    if (pendingCount > prevPendingCount.current && prevPendingCount.current > 0) {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
      NotificationService.showNotification(t('order_sent', 'Nouvelle Commande !'), {
        body: t('chef_new_order_msg', 'Une nouvelle commande vient d\'arriver.'),
        tag: 'new-order',
        renotify: true,
      } as any);
    }
    prevPendingCount.current = pendingCount;
  }, [orders, t]);

  const playNotification = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
    NotificationService.showNotification(t('order_sent', 'Nouvelle Commande !'), {
      body: t('chef_new_order_msg', 'Une nouvelle commande vient d\'arriver.'),
      tag: 'new-order',
      renotify: true,
    } as any);
  };

  const startLongPress = (order: Order) => {
    longPressTimer.current = setTimeout(() => {
      setSelectedOrder(order);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const getTimerInfo = (time: number) => {
    const minutes = Math.floor((Date.now() - time) / 60000);
    let colorClass = '';
    if (minutes > 15) colorClass = 'late';
    else if (minutes > 8) colorClass = 'warn';
    
    return { minutes, colorClass };
  };

  const renderOrderCard = (order: Order) => {
    const { minutes, colorClass } = getTimerInfo(order.time);
    
    return (
      <div key={order.id} className={`chef-order-card ${minutes > 15 ? 'urgent' : ''}`}
        onMouseDown={() => startLongPress(order)}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={() => startLongPress(order)}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
      >
        <div className="order-top-row">
          <span className="order-number">{order.id}</span>
          <span className={`order-timer ${colorClass}`}>
            <Clock size={14} />
            {minutes}m
          </span>
        </div>
        
        <div className="order-table-info">
          <UtensilsCrossed size={18} />
          {t('chef_table')} {order.table}
        </div>

        <div className="order-items-list">
          {order.orderItems ? (
            order.orderItems.map((item, idx) => (
              <div key={idx} className="order-item-row">
                <span className="order-item-qty">x{item.qty}</span>
                <span>{item.name}</span>
              </div>
            ))
          ) : (
            <div className="order-item-row">
              <span className="order-item-qty">x{order.items}</span>
              <span>{t('chef_misc_items')}</span>
            </div>
          )}
        </div>

        <div className="order-footer">
          {order.status === 'pending' && (
            <button 
              className="chef-action-btn start"
              onClick={() => startPreparing(order.id)}
            >
              <Play size={18} />
              {t('chef_start')}
            </button>
          )}
          {order.status === 'preparing' && (
            <button 
              className="chef-action-btn finish"
              onClick={() => finishPreparing(order.id)}
            >
              <CheckCircle2 size={18} />
              {t('chef_finish')}
            </button>
          )}
        </div>
      </div>
    );
  };

  const filterOrders = (status: Order['status']) => {
    return orders.filter(o => o.status === status);
  };

  return (
    <div className="chef-dashboard-page">
      <audio 
        ref={audioRef} 
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
        preload="auto"
      />
      
      <header className="chef-header">
        <div className="chef-logo">
          <div className="chef-icon-circle">
            <ChefHat size={20} />
          </div>
          <span>{t('chef_title')}</span>
        </div>

        <div className="chef-stats">
          <div className="chef-stat-item">
            <span className="chef-stat-value">{filterOrders('pending').length}</span>
            <span className="chef-stat-label">{t('chef_orders_new')}</span>
          </div>
          <div className="chef-stat-item separator">
            <span className="chef-stat-value">{filterOrders('preparing').length}</span>
            <span className="chef-stat-label">{t('chef_orders_preparing')}</span>
          </div>
        </div>

        <div className="chef-actions">
           <button 
             className="chef-icon-btn sound-test-btn" 
             onClick={playNotification}
           >
             <Bell size={16} />
             {t('chef_sound_test')}
           </button>
        </div>
      </header>

      <main className="chef-grid">
        {/* NEW ORDERS */}
        <section className="chef-column">
          <div className="chef-column-header">
            <h2 className="chef-column-title status-new">
              <Bell size={20} /> {t('chef_orders_new').toUpperCase()}
            </h2>
            <span className="chef-column-count">{filterOrders('pending').length}</span>
          </div>
          <div className="chef-orders-list">
            {filterOrders('pending').length > 0 ? (
              filterOrders('pending').map(renderOrderCard)
            ) : (
              <div className="chef-empty-state">
                <AlertCircle className="chef-empty-icon" size={48} />
                <p>{t('chef_no_orders')}</p>
              </div>
            )}
          </div>
        </section>

        {/* PREPARING */}
        <section className="chef-column">
          <div className="chef-column-header">
            <h2 className="chef-column-title status-preparing">
              <Play size={20} /> {t('chef_orders_preparing').toUpperCase()}
            </h2>
            <span className="chef-column-count">{filterOrders('preparing').length}</span>
          </div>
          <div className="chef-orders-list">
            {filterOrders('preparing').length > 0 ? (
              filterOrders('preparing').map(renderOrderCard)
            ) : (
              <div className="chef-empty-state">
                <UtensilsCrossed className="chef-empty-icon" size={48} />
                <p>{t('chef_no_orders')}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {selectedOrder && (
        <div className="chef-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="chef-modal-card" onClick={e => e.stopPropagation()}>
            <button className="chef-modal-close" onClick={() => setSelectedOrder(null)}>×</button>
            <div className="chef-order-card">
              <div className="order-top-row">
                <span className="order-number">{selectedOrder.id}</span>
                <span className={`order-timer ${getTimerInfo(selectedOrder.time).colorClass}`}>
                  <Clock size={14} />
                  {getTimerInfo(selectedOrder.time).minutes}m
                </span>
              </div>
              <div className="order-table-info">
                <UtensilsCrossed size={18} />
                {t('chef_table')} {selectedOrder.table}
              </div>
              <div className="order-items-list">
                {selectedOrder.orderItems ? (
                  selectedOrder.orderItems.map((item, idx) => (
                    <div key={idx} className="order-item-row">
                      <span className="order-item-qty">x{item.qty}</span>
                      <span>{item.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="order-item-row">
                    <span className="order-item-qty">x{selectedOrder.items}</span>
                    <span>{t('chef_misc_items')}</span>
                  </div>
                )}
              </div>
              {selectedOrder.orderItems && (
                <div className="order-modal-total">
                  <span className="order-modal-total-label">Commande #{selectedOrder.id.slice(-6)}</span>
                  <span className="order-modal-total-price">{formatPrice(selectedOrder.total)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
