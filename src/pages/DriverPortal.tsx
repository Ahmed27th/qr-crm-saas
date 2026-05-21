import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ShoppingBag, CheckCircle, Clock, MapPin, 
  LogOut, Activity, AlertCircle, Navigation, Phone, User, Truck, X,
  ChevronRight, DollarSign, Home
} from 'lucide-react';
import { DataStore } from '../dataStore';
import type { Order, Driver } from '../dataStore';
import './DriverPortal.css';

const MISSION_STEPS = [
  { icon: Clock, label: 'Arrivé au restaurant', doneLabel: 'Arrivé' },
  { icon: ShoppingBag, label: 'Commande récupérée', doneLabel: 'Récupérée' },
  { icon: CheckCircle, label: 'Livraison terminée', doneLabel: 'Terminée' },
];

export function DriverPortal() {
  const { restaurantId, driverId } = useParams<{ restaurantId: string; driverId: string }>();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrderAlert, setShowNewOrderAlert] = useState(false);
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);
  const [missionSteps, setMissionSteps] = useState<Record<string, number>>({});
  const [confirmDeliverId, setConfirmDeliverId] = useState<string | null>(null);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'missions' | 'history'>('missions');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const locationIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const sendLocation = async (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setMyLocation({ lat, lng });
      if (driverId) {
        try { await DataStore.updateDriverLocation(driverId, lat, lng); } catch {}
      }
    };
    const onError = () => {};
    navigator.geolocation.getCurrentPosition(sendLocation, onError, { enableHighAccuracy: true, timeout: 10000 });
    locationIntervalRef.current = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(sendLocation, onError, { enableHighAccuracy: true, timeout: 10000 });
    }, 5000);
    return () => { if (locationIntervalRef.current) clearInterval(locationIntervalRef.current); };
  }, [driverId]);

  useEffect(() => {
    const loadData = async () => {
      const drivers = await DataStore.getDrivers(restaurantId);
      const currentDriver = drivers.find(d => d.id === driverId);
      if (currentDriver) {
        setDriver(currentDriver);
        const orders = await DataStore.getOrders(restaurantId);
        const currentAssigned = orders.filter(o => o.driverId === driverId && o.status !== 'delivered');
        const currentAvailable = await DataStore.getAvailableDeliveryOrders(restaurantId);
        setAvailableOrders(currentAvailable);
        setAssignedOrders(prev => {
          if (currentAssigned.length > prev.length) {
            setShowNewOrderAlert(true);
            setTimeout(() => setShowNewOrderAlert(false), 5000);
          }
          return currentAssigned;
        });
        setHistoryOrders(orders.filter(o => o.driverId === driverId && o.status === 'delivered'));
      }
      setLoading(false);
    };
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [restaurantId, driverId]);

  const handleToggleStatus = async () => {
    if (!driver) return;
    const nextStatus: Driver['status'] = driver.status === 'available' ? 'busy' : driver.status === 'busy' ? 'offline' : 'available';
    await DataStore.updateDriverStatus(driver.id, nextStatus, restaurantId);
    setDriver({ ...driver, status: nextStatus });
  };

  const handleStepForward = (orderId: string) => {
    const currentStep = missionSteps[orderId] || 0;
    if (currentStep === 2) { setConfirmDeliverId(orderId); return; }
    setMissionSteps(prev => ({ ...prev, [orderId]: currentStep + 1 }));
  };

  const confirmDelivery = async (orderId: string) => {
    await DataStore.updateOrderStatus(orderId, 'delivered', restaurantId);
    if (driver) await DataStore.updateDriverOrders(driver.id, Math.max(0, driver.activeOrders - 1), restaurantId);
    setMissionSteps(prev => { const n = { ...prev }; delete n[orderId]; return n; });
    setConfirmDeliverId(null);
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!driverId) return;
    await DataStore.assignOrderToDriver(orderId, driverId, restaurantId);
  };

  if (loading) {
    return (
      <div className="driver-portal">
        <div className="driver-loading">
          <div className="driver-loading-spinner" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="driver-portal">
        <div className="driver-empty">
          <div className="driver-empty-icon"><Truck size={48} /></div>
          <h2>Portail Livreur</h2>
          <p>Scannez votre QR code personnel depuis le tableau de bord pour accéder à vos missions.</p>
          <a href="/dashboard?demo=ultimate" className="driver-btn-primary">Accéder au Dashboard</a>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = { available: '#22c55e', busy: '#eab308', offline: '#6b7280' };
  const statusLabels: Record<string, string> = { available: 'En ligne', busy: 'Occupé', offline: 'Hors ligne' };

  return (
    <div className="driver-portal">
      {showNewOrderAlert && (
        <div className="driver-alert-overlay">
          <div className="driver-alert">
            <AlertCircle size={24} />
            <div>
              <div className="driver-alert-title">Nouvelle mission !</div>
              <div className="driver-alert-desc">Une commande vient de vous être assignée.</div>
            </div>
          </div>
        </div>
      )}

      <header className="driver-header">
        <div className="driver-header-left">
          <div className="driver-avatar">{driver.name.charAt(0)}</div>
          <div>
            <h1 className="driver-name">{driver.name}</h1>
            <div className="driver-status-row">
              <span className="driver-status-dot" style={{ background: statusColors[driver.status] }} />
              <span className="driver-status-label">{statusLabels[driver.status]}</span>
              {myLocation && <span className="driver-gps-dot" title="GPS actif" />}
            </div>
          </div>
        </div>
        <button onClick={handleToggleStatus} className="driver-status-btn" style={{ borderColor: statusColors[driver.status], color: statusColors[driver.status] }}>
          {statusLabels[driver.status]}
        </button>
      </header>

      <div className="driver-stats-row">
        <div className="driver-stat">
          <ShoppingBag size={20} />
          <div>
            <span className="driver-stat-value">{assignedOrders.length}</span>
            <span className="driver-stat-label">Missions</span>
          </div>
        </div>
        <div className="driver-stat">
          <Activity size={20} />
          <div>
            <span className="driver-stat-value">{driver.activeOrders}</span>
            <span className="driver-stat-label">En cours</span>
          </div>
        </div>
        <div className="driver-stat">
          <DollarSign size={20} />
          <div>
            <span className="driver-stat-value">{historyOrders.length}</span>
            <span className="driver-stat-label">Livrées</span>
          </div>
        </div>
      </div>

      <div className="driver-tabs">
        <button className={`driver-tab ${activeTab === 'missions' ? 'active' : ''}`} onClick={() => setActiveTab('missions')}>
          <Truck size={16} /> Missions {assignedOrders.length > 0 && <span className="driver-tab-badge">{assignedOrders.length}</span>}
        </button>
        <button className={`driver-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <Clock size={16} /> Historique
        </button>
      </div>

      <main className="driver-main">
        {activeTab === 'missions' && (
          <>
            {/* Assigned Missions */}
            {assignedOrders.length === 0 ? (
              <div className="driver-empty-state">
                <Home size={40} />
                <h3>Aucune mission en cours</h3>
                <p>En attente de nouvelles commandes...</p>
              </div>
            ) : (
              <div className="driver-mission-list">
                {assignedOrders.map(order => {
                  const step = missionSteps[order.id] || 0;
                  return (
                    <div key={order.id} className="driver-mission-card">
                      <div className="driver-mission-header">
                        <div>
                          <span className="driver-mission-id">Mission #{order.id.slice(-6)}</span>
                          <h3 className="driver-mission-title">Livraison</h3>
                        </div>
                        <div className="driver-mission-price">{order.total.toFixed(2)} DH</div>
                      </div>

                      <div className="driver-mission-info">
                        {order.customerName && (
                          <div className="driver-info-row">
                            <User size={14} /><span>{order.customerName}</span>
                          </div>
                        )}
                        {order.customerPhone && (
                          <div className="driver-info-row">
                            <Phone size={14} /><a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>
                          </div>
                        )}
                        {order.customerAddress && (
                          <div className="driver-info-row">
                            <MapPin size={14} /><span>{order.customerAddress}</span>
                          </div>
                        )}
                      </div>

                      <div className="driver-step-indicator">
                        {MISSION_STEPS.map((s, i) => {
                          const isDone = i < step;
                          const isCurrent = i === step;
                          return (
                            <div key={i} className={`driver-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                              <div className="driver-step-circle"><s.icon size={14} /></div>
                              <span className="driver-step-label">{isDone ? s.doneLabel : s.label}</span>
                              {i < 2 && <div className={`driver-step-line ${isDone ? 'done' : ''}`} />}
                            </div>
                          );
                        })}
                      </div>

                      <div className="driver-mission-actions">
                        <button onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} className="driver-btn-secondary">
                          <MapPin size={14} /> {expandedOrder === order.id ? 'Masquer la carte' : 'Carte'}
                        </button>
                        {order.customerAddress && (
                          <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.customerAddress!)}`, '_blank')} className="driver-btn-secondary">
                            <Navigation size={14} /> Google Maps
                          </button>
                        )}
                        <button onClick={() => handleStepForward(order.id)} className={`driver-btn-primary ${step === 2 ? 'driver-btn-success' : ''}`} style={{ flex: 1 }}>
                          {step === 0 && 'Arrivé au restaurant'}
                          {step === 1 && 'Récupérer la commande'}
                          {step === 2 && 'Livraison terminée'}
                        </button>
                      </div>

                      {expandedOrder === order.id && (
                        <div className="driver-map-container">
                          <iframe
                            title="Carte"
                            width="100%" height="200"
                            style={{ border: 0, borderRadius: '12px' }}
                            loading="lazy"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
                              (myLocation?.lng ? myLocation.lng - 0.01 : -5) + ',' +
                              (myLocation?.lat ? myLocation.lat - 0.01 : 35) + ',' +
                              (myLocation?.lng ? myLocation.lng + 0.01 : -5.5) + ',' +
                              (myLocation?.lat ? myLocation.lat + 0.01 : 35.5)
                            )}&layer=mapnik&marker=${myLocation?.lat || 35},${myLocation?.lng || -5}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Available Missions */}
            {availableOrders.length > 0 && (
              <div className="driver-section">
                <h3 className="driver-section-title">
                  Missions disponibles <span className="driver-section-badge">{availableOrders.length}</span>
                </h3>
                {availableOrders.map(order => (
                  <div key={order.id} className="driver-available-card">
                    <div className="driver-available-top">
                      <span className="driver-available-id">#{order.id.slice(-6)}</span>
                      <span className="driver-available-price">{order.total.toFixed(2)} DH</span>
                    </div>
                    {order.customerAddress && <p className="driver-available-addr">{order.customerAddress}</p>}
                    <div className="driver-available-actions">
                      <button onClick={() => handleAcceptOrder(order.id)} className="driver-btn-primary" style={{ flex: 1 }}>Accepter</button>
                      {order.customerAddress && (
                        <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerAddress!)}`, '_blank')} className="driver-btn-secondary">
                          <Navigation size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <div className="driver-section">
            <h3 className="driver-section-title">Historique des livraisons</h3>
            {historyOrders.length === 0 ? (
              <div className="driver-empty-state">
                <Clock size={40} />
                <h3>Aucune livraison</h3>
                <p>Vos livraisons terminées apparaîtront ici.</p>
              </div>
            ) : (
              <div className="driver-history-list">
                {historyOrders.slice(-20).reverse().map(order => (
                  <div key={order.id} className="driver-history-card" onClick={() => setSelectedHistoryOrder(order)}>
                    <div className="driver-history-left">
                      <div className="driver-history-icon"><CheckCircle size={16} /></div>
                      <div>
                        <div className="driver-history-id">#{order.id.slice(-6)}</div>
                        {order.customerName && <div className="driver-history-name">{order.customerName}</div>}
                      </div>
                    </div>
                    <div className="driver-history-right">
                      <div className="driver-history-price">{order.total.toFixed(2)} DH</div>
                      <ChevronRight size={14} className="driver-chevron" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="driver-bottom-nav">
        <button className={`driver-nav-btn ${activeTab === 'missions' ? 'active' : ''}`} onClick={() => setActiveTab('missions')}>
          <Truck size={20} />
          <span>Missions</span>
        </button>
        <button className={`driver-nav-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <Clock size={20} />
          <span>Historique</span>
        </button>
        <button className="driver-nav-btn" onClick={() => { localStorage.removeItem('qr_restaurant_id'); window.location.href = '/login'; }}>
          <LogOut size={20} />
          <span>Quitter</span>
        </button>
      </nav>

      {/* Confirm Delivery Modal */}
      {confirmDeliverId && (
        <div className="driver-modal-overlay" onClick={() => setConfirmDeliverId(null)}>
          <div className="driver-modal" onClick={e => e.stopPropagation()}>
            <div className="driver-modal-icon"><CheckCircle size={32} /></div>
            <h3>Confirmer la livraison</h3>
            <p>Êtes-vous sûr d'avoir livré cette commande ? Cette action est irréversible.</p>
            <div className="driver-modal-actions">
              <button onClick={() => setConfirmDeliverId(null)} className="driver-btn-secondary" style={{ flex: 1 }}>Annuler</button>
              <button onClick={() => confirmDelivery(confirmDeliverId)} className="driver-btn-primary driver-btn-success" style={{ flex: 1 }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* History Detail Modal */}
      {selectedHistoryOrder && (
        <div className="driver-modal-overlay" onClick={() => setSelectedHistoryOrder(null)}>
          <div className="driver-modal driver-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="driver-modal-header">
              <h3>Détails de la livraison</h3>
              <button onClick={() => setSelectedHistoryOrder(null)} className="driver-modal-close"><X size={20} /></button>
            </div>
            <div className="driver-modal-body">
              <div className="driver-detail-row"><span>Commande</span><strong>#{selectedHistoryOrder.id.slice(-6)}</strong></div>
              {selectedHistoryOrder.customerName && <div className="driver-detail-row"><span>Client</span><strong>{selectedHistoryOrder.customerName}</strong></div>}
              {selectedHistoryOrder.customerPhone && (
                <div className="driver-detail-row"><span>Téléphone</span><a href={`tel:${selectedHistoryOrder.customerPhone}`} className="driver-detail-link">{selectedHistoryOrder.customerPhone}</a></div>
              )}
              {selectedHistoryOrder.customerAddress && <div className="driver-detail-row"><span>Adresse</span><strong>{selectedHistoryOrder.customerAddress}</strong></div>}
              <div className="driver-detail-divider" />
              <div className="driver-detail-items">
                <span className="driver-detail-items-title">Articles</span>
                {selectedHistoryOrder.orderItems?.map((item, idx) => (
                  <div key={idx} className="driver-detail-item">
                    <span>{item.qty}x {item.name}</span>
                    <span>{((item.price ?? 0) * item.qty).toFixed(2)} DH</span>
                  </div>
                ))}
              </div>
              <div className="driver-detail-divider" />
              <div className="driver-detail-total">
                <span>Total</span>
                <strong>{selectedHistoryOrder.total.toFixed(2)} DH</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
