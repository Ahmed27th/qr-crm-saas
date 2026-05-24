import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingBag, Clock, QrCode, User, X, UtensilsCrossed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataStore, type Order, type StaffMember } from '../dataStore';
import './ServerDashboard.css';

export function ServerDashboard() {
  const { restaurantId, staffId } = useParams<{ restaurantId: string; staffId: string }>();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    const unsubscribe = DataStore.subscribeToOrders((currentOrders) => {
      setOrders(currentOrders);
    }, restaurantId);
    return () => { if (unsubscribe) unsubscribe(); };
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId || !staffId) return;
    DataStore.getStaff(restaurantId).then(list => {
      const found = list.find(s => s.id === staffId);
      if (found) setStaff(found);
    });
  }, [restaurantId, staffId]);

  const baseUrl = window.location.origin;
  const reviewUrl = staffId ? `${baseUrl}/staff-review/${restaurantId}/${staffId}` : '';

  const sortedOrders = [...orders.filter(o => o.table !== 'Livraison')].sort((a, b) => b.time - a.time);

  return (
    <div className="server-page">
      <header className="server-header">
        <div className="server-header-left">
          <div className="server-avatar">
            {staff ? staff.name.charAt(0).toUpperCase() : <User size={24} />}
          </div>
          <div>
            <h1 className="server-title">{staff?.name || t('server_loading', 'Serveur')}</h1>
            <p className="server-role">{staff?.role || ''}</p>
          </div>
        </div>
        <button className="server-qr-btn" onClick={() => setShowQR(!showQR)}>
          <QrCode size={20} /> QR Avis
        </button>
      </header>

      {showQR && (
        <div className="server-qr-modal">
          <div className="server-qr-card">
            <button className="server-qr-close" onClick={() => setShowQR(false)}><X size={18} /></button>
            <div className="server-avatar-large">{staff?.name.charAt(0).toUpperCase() || '?'}</div>
            <h3>{staff?.name || ''}</h3>
            <p className="server-role">{staff?.role || ''}</p>
            <div className="server-qr-image">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(reviewUrl)}`} alt="QR Review" />
            </div>
            <p className="server-qr-hint">{t('server_qr_hint', 'Scannez pour laisser un avis')}</p>
          </div>
        </div>
      )}

      <div className="server-stats">
        <div className="server-stat">
          <span className="server-stat-value">{orders.length}</span>
          <span className="server-stat-label">{t('dash_orders', 'Commandes')}</span>
        </div>
        <div className="server-stat">
          <span className="server-stat-value">{orders.filter(o => o.status === 'pending' || o.status === 'preparing').length}</span>
          <span className="server-stat-label">{t('server_active', 'En cours')}</span>
        </div>
        <div className="server-stat">
          <span className="server-stat-value">{orders.filter(o => o.status === 'ready').length}</span>
          <span className="server-stat-label">{t('server_ready', 'Prêtes')}</span>
        </div>
      </div>

      <div className="server-orders-list">
        {sortedOrders.length === 0 ? (
          <div className="server-empty">
            <ShoppingBag size={48} className="server-empty-icon" />
            <p>{t('server_no_orders', 'Aucune commande pour le moment')}</p>
          </div>
        ) : (
          sortedOrders.map(order => (
            <div key={order.id} className={`server-order-card ${order.status}`}>
              <div className="server-order-top">
                <div className="server-order-table">
                  <UtensilsCrossed size={16} />
                  <span>{t('chef_table', 'Table')} {order.table}</span>
                </div>
                <span className="server-order-status">{order.status}</span>
              </div>
              <div className="server-order-items">
                {order.orderItems ? (
                  order.orderItems.map((item, i) => (
                    <div key={i} className="server-order-item">
                      <span className="server-item-qty">x{item.qty}</span>
                      <span>{item.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="server-order-item">
                    <span className="server-item-qty">x{order.items}</span>
                    <span>{t('chef_misc_items')}</span>
                  </div>
                )}
              </div>
              <div className="server-order-footer">
                <span className="server-order-price">{order.total.toFixed(2)} DH</span>
                <span className="server-order-time"><Clock size={12} /> {Math.floor((Date.now() - order.time) / 60000)} min</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
