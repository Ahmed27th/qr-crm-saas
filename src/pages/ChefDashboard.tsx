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
import { DataStore, type Order } from '../dataStore';
import { NotificationService } from '../utils/notifications';
import './ChefDashboard.css';

export function ChefDashboard() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    // Real-time synchronization with Firestore
    const unsubscribe = DataStore.subscribeToOrders((currentOrders) => {
      const newOrders = currentOrders.filter(o => o.status === 'pending');
      
      setOrders(prevOrders => {
        const prevNewCount = prevOrders.filter(o => o.status === 'pending').length;
        if (newOrders.length > prevNewCount && prevNewCount !== 0) {
          playNotification();
        }
        return currentOrders;
      });
    }, restaurantId);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [restaurantId]);


  const playNotification = () => {
    // Audio notification
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }

    // Browser notification
    NotificationService.showNotification(t('order_sent', 'Nouvelle Commande !'), {
      body: t('chef_new_order_msg', 'Une nouvelle commande vient d\'arriver.'),
      tag: 'new-order',
      renotify: true
    } as any);
  };

  const updateStatus = async (id: string, status: Order['status']) => {
    await DataStore.updateOrderStatus(id, status, restaurantId);
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
      <div key={order.id} className={`chef-order-card ${minutes > 15 ? 'urgent' : ''}`}>
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
              onClick={() => updateStatus(order.id, 'preparing')}
            >
              <Play size={18} />
              {t('chef_start')}
            </button>
          )}
          {order.status === 'preparing' && (
            <button 
              className="chef-action-btn finish"
              onClick={async () => await updateStatus(order.id, 'ready')}
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
    <div className="chef-dashboard">
      <audio 
        ref={audioRef} 
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
        preload="auto"
      />
      
      <header className="chef-header">
        <div className="chef-logo">
          <div className="chef-icon-wrapper">
            <ChefHat className="chef-icon-main" size={24} />
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
              <div className="empty-state">
                <AlertCircle className="empty-icon" size={48} />
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
              <div className="empty-state">
                <UtensilsCrossed className="empty-icon" size={48} />
                <p>{t('chef_no_orders')}</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
