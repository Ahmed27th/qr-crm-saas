import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, ChefHat, CheckCircle, Truck, Home, MapPin, Phone, User, Navigation, ArrowLeft } from 'lucide-react';
import { DataStore } from '../dataStore';
import type { Order } from '../dataStore';
import { formatPrice } from '../utils/format';
import './OrderTracking.css';

const STATUS_STEPS = [
  { key: 'pending', label: 'Commande reçue', icon: ShoppingBag },
  { key: 'preparing', label: 'En préparation', icon: ChefHat },
  { key: 'ready', label: 'Prête', icon: CheckCircle },
  { key: 'driver_assigned', label: 'Livreur en route', icon: Truck },
  { key: 'delivered', label: 'Livrée', icon: Home },
];

export function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) return;
      const rid = localStorage.getItem('qr_restaurant_id') || 'demo-ultimate';
      const orders = await DataStore.getOrders(rid);
      const found = orders.find((o: Order) => o.id === orderId);
      if (found) {
        setOrder(found);
        if (found.driverId) {
          const drivers = await DataStore.getDrivers(rid);
          const drv = drivers.find((d: any) => d.id === found.driverId);
          if (drv) {
            setDriverName(drv.name);
            setDriverPhone(drv.phone);
          }
          const loc = await DataStore.getDriverLocation(found.driverId);
          if (loc) setDriverLocation(loc);
        }
      }
    };
    loadOrder();
    const interval = setInterval(loadOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (!order?.driverId) return;
    const unsub = DataStore.subscribeToDriverLocation((loc) => {
      if (loc) setDriverLocation(loc);
    }, order.driverId);
    return unsub;
  }, [order?.driverId]);

  if (!order) {
    return (
      <div className="order-tracking-page">
        <div className="ot-loading">
          <div className="ot-spinner" />
          <p>Recherche de la commande...</p>
        </div>
      </div>
    );
  }

  const currentStatusIndex = STATUS_STEPS.findIndex(s => {
    if (order.status === 'delivered') return s.key === 'delivered';
    if (order.status === 'ready' && order.driverId) return s.key === 'driver_assigned';
    return s.key === order.status;
  });
  const displayIndex = currentStatusIndex >= 0 ? currentStatusIndex : 0;

  return (
    <div className="order-tracking-page">
      <header className="ot-header">
        <Link to={`/menu/${localStorage.getItem('qr_restaurant_id') || 'demo-ultimate'}`} className="ot-back-btn">
          <ArrowLeft size={18} />
        </Link>
        <div className="ot-header-info">
          <h1>Suivi de commande</h1>
          <p>#{orderId?.slice(-6)}</p>
        </div>
        <div className="ot-live-dot" />
      </header>

      <div className="ot-hero">
        <div className="ot-hero-icon">
          <Truck size={24} />
        </div>
        <h2>Commande en cours</h2>
        <p>Mise à jour en temps réel</p>
      </div>

      <div className="ot-content">
        {/* Progress */}
        <div className="ot-progress">
          {STATUS_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isComplete = idx < displayIndex;
            const isCurrent = idx === displayIndex;
            return (
              <div key={step.key} className={`ot-progress-step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}>
                <div className="ot-step-circle">
                  {isComplete ? <CheckCircle size={14} /> : <Icon size={14} />}
                </div>
                <div className="ot-step-content">
                  <h4>{step.label}</h4>
                  {isCurrent && <p className="ot-step-sub">En cours...</p>}
                  {isComplete && <p className="ot-step-sub" style={{ color: 'var(--ot-green)' }}>Terminé</p>}
                </div>
                <div className="ot-step-line" />
              </div>
            );
          })}
        </div>

        {/* Order Details */}
        <div className="ot-card">
          <div className="ot-card-header">
            <div className="ot-card-header-icon"><ShoppingBag size={16} /></div>
            <h3>Détails de la commande</h3>
          </div>
          <div className="ot-card-body">
            {order.orderItems?.map((item, idx) => (
              <div key={idx} className="ot-item-row">
                <span>{item.qty}x {item.name}</span>
                <span>{formatPrice((item.price ?? 0) * item.qty)}</span>
              </div>
            ))}
            <div className="ot-divider" />
            <div className="ot-total-row">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        {order.customerAddress && (
          <div className="ot-card">
            <div className="ot-card-header">
              <div className="ot-card-header-icon"><MapPin size={16} /></div>
              <h3>Adresse de livraison</h3>
            </div>
            <div className="ot-card-body">
              <div className="ot-delivery-info">
                <div className="ot-delivery-item">
                  <MapPin size={14} />
                  <span>{order.customerAddress}</span>
                </div>
              </div>
              <button
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerAddress!)}`, '_blank')}
                className="ot-btn-secondary"
                style={{ marginTop: '12px' }}
              >
                <Navigation size={14} /> Ouvrir dans Google Maps
              </button>
            </div>
          </div>
        )}

        {/* Driver Info */}
        {order.driverId && order.status !== 'delivered' && (
          <div className="ot-card">
            <div className="ot-card-header">
              <div className="ot-card-header-icon"><User size={16} /></div>
              <h3>Votre livreur</h3>
            </div>
            <div className="ot-card-body">
              <div className="ot-driver-card">
                <div className="ot-driver-avatar">
                  {driverName ? driverName.charAt(0).toUpperCase() : <User size={16} />}
                </div>
                <div className="ot-driver-info">
                  <p className="ot-driver-name">{driverName || 'Livreur'}</p>
                  <p className="ot-driver-status">En route vers vous</p>
                </div>
                {driverPhone && (
                  <a href={`tel:${driverPhone}`} className="ot-driver-phone">
                    <Phone size={16} />
                  </a>
                )}
              </div>

              {driverLocation && (
                <div className="ot-map">
                  <iframe
                    title="Carte du livreur"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
                      (driverLocation.lng - 0.01) + ',' + 
                      (driverLocation.lat - 0.01) + ',' + 
                      (driverLocation.lng + 0.01) + ',' + 
                      (driverLocation.lat + 0.01)
                    )}&layer=mapnik&marker=${driverLocation.lat},${driverLocation.lng}`}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <Link to={`/menu/${localStorage.getItem('qr_restaurant_id') || 'demo-ultimate'}`} className="ot-btn-secondary">
          Retour au menu
        </Link>
      </div>
    </div>
  );
}
