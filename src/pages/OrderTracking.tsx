import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, MapPin, ShoppingBag, ChefHat, Truck, Phone, User, Navigation, Home } from 'lucide-react';
import { DataStore } from '../dataStore';
import type { Order } from '../dataStore';
import './PublicMenu.css';

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

  // Subscribe to driver location updates
  useEffect(() => {
    if (!order?.driverId) return;
    const unsub = DataStore.subscribeToDriverLocation((loc) => {
      if (loc) setDriverLocation(loc);
    }, order.driverId);
    return unsub;
  }, [order?.driverId]);

  if (!order) {
    return (
      <div className="public-menu-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center p-8">
          <Clock size={48} className="text-tertiary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Recherche de la commande...</h2>
          <p className="text-tertiary text-sm">Veuillez patienter</p>
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
    <div className="public-menu-container">
      <div className="p-6">
        <h1 className="text-2xl font-black mb-1">Suivi de commande</h1>
        <p className="text-tertiary text-sm mb-6">Commande #{orderId?.slice(-6)}</p>

        {/* Progress Steps */}
        <div className="tracking-progress mb-8">
          {STATUS_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isComplete = idx <= displayIndex;
            const isCurrent = idx === displayIndex;
            return (
              <div key={step.key} className="tracking-step">
                <div className={`tracking-icon ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}>
                  <Icon size={20} />
                </div>
                <div className="tracking-label">
                  <span className={`text-xs font-bold ${isComplete ? 'text-accent' : 'text-tertiary'}`}>
                    {step.label}
                  </span>
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <div className={`tracking-line ${isComplete ? 'complete' : ''}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Order Details */}
        <div className="glass-panel p-4 mb-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <ShoppingBag size={16} className="text-accent" /> Détails de la commande
          </h3>
          <div className="space-y-2 text-sm">
            {order.orderItems?.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.qty}x {item.name}</span>
                <span className="text-tertiary">{((item.price ?? 0) * item.qty).toFixed(2)} DH</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-accent">{order.total.toFixed(2)} DH</span>
            </div>
          </div>
        </div>

        {order.customerAddress && (
          <div className="glass-panel p-4 mb-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-accent" /> Adresse de livraison
            </h3>
            <p className="text-sm">{order.customerAddress}</p>
            <button
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerAddress!)}`, '_blank')}
              className="btn-secondary w-full py-2 flex items-center justify-center gap-2 text-xs font-bold mt-3"
            >
              <Navigation size={14} /> Ouvrir dans Google Maps
            </button>
          </div>
        )}

        {/* Driver Info */}
        {order.driverId && order.status !== 'delivered' && (
          <div className="glass-panel p-4 mb-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Truck size={16} className="text-accent" /> Livreur
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                  <User size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">{driverName || 'Livreur'}</p>
                  <p className="text-xs text-tertiary">En route vers vous</p>
                </div>
              </div>
              {driverPhone && (
                <a href={`tel:${driverPhone}`} className="btn-secondary p-2 rounded-full">
                  <Phone size={18} className="text-accent" />
                </a>
              )}
            </div>

            {/* Driver location map — only visible during active delivery */}
            {driverLocation && (
              <div className="mt-4 rounded-xl overflow-hidden border border-border" style={{ height: '200px' }}>
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  scrolling="no"
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
        )}

        <Link to={`/menu/${localStorage.getItem('qr_restaurant_id') || 'demo-ultimate'}`} className="btn-secondary w-full py-3 flex items-center justify-center text-sm font-bold">
          Retour au menu
        </Link>
      </div>

      <style>{`
        .tracking-progress {
          display: flex;
          flex-direction: column;
          gap: 0;
          position: relative;
        }
        .tracking-step {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          position: relative;
          padding-bottom: 0;
        }
        .tracking-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--bg-secondary);
          border: 2px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-tertiary);
          flex-shrink: 0;
          z-index: 1;
        }
        .tracking-icon.complete {
          background: var(--accent);
          border-color: var(--accent);
          color: #000;
        }
        .tracking-icon.current {
          box-shadow: 0 0 0 4px rgba(var(--accent-primary-rgb), 0.2);
        }
        .tracking-label {
          padding-top: 0.5rem;
        }
        .tracking-line {
          position: absolute;
          left: 19px;
          top: 40px;
          width: 2px;
          height: 32px;
          background: var(--border-color);
          z-index: 0;
        }
        .tracking-line.complete {
          background: var(--accent);
        }
      `}</style>
    </div>
  );
}
