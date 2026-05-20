import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ShoppingBag, CheckCircle, Clock, MapPin, 
  Smartphone, LogOut, Activity, AlertCircle, Navigation, Phone, User, Target, Truck
} from 'lucide-react';
import { DataStore } from '../dataStore';
import type { Order, Driver } from '../dataStore';
import './Dashboard.css';

export function DriverPortal() {
  const { restaurantId, driverId } = useParams<{ restaurantId: string; driverId: string }>();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrderAlert, setShowNewOrderAlert] = useState(false);
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<string | null>(null);
  const locationIntervalRef = useRef<number | null>(null);
  const [missionSteps, setMissionSteps] = useState<Record<string, number>>({});

  // Start sharing location
  const startLocationSharing = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalisation non supportée');
      return;
    }

    const success = async (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setMyLocation({ lat, lng });
      if (driverId) {
        try {
          await DataStore.updateDriverLocation(driverId, lat, lng);
        } catch (e) {
          // silently retry next interval
        }
      }
    };

    const error = (err: GeolocationPositionError) => {
      setLocationError(err.message);
    };

    navigator.geolocation.getCurrentPosition(success, error, { enableHighAccuracy: true, timeout: 10000 });
    locationIntervalRef.current = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(success, error, { enableHighAccuracy: true, timeout: 10000 });
    }, 5000);
  };

  useEffect(() => {
    startLocationSharing();
    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
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
    setMissionSteps(prev => {
      const currentStep = prev[orderId] || 0;
      const nextStep = currentStep + 1;
      
      if (nextStep === 3) {
        handleCompleteOrder(orderId);
        const next = { ...prev };
        delete next[orderId];
        return next;
      }
      
      return { ...prev, [orderId]: nextStep };
    });
  };

  const handleCompleteOrder = async (orderId: string) => {
    await DataStore.updateOrderStatus(orderId, 'delivered', restaurantId);
    if (driver) {
      await DataStore.updateDriverOrders(driver.id, Math.max(0, driver.activeOrders - 1), restaurantId);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!driverId) return;
    await DataStore.assignOrderToDriver(orderId, driverId, restaurantId);
  };

  const openGoogleMapsNavigate = (address: string) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-primary">Chargement...</div>;
  if (!driver) {
    return (
      <div className="min-h-screen bg-primary text-primary flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <Truck size={40} className="text-accent" />
          </div>
          <h2 className="text-xl font-bold mb-2">Portail Livreur</h2>
          <p className="text-tertiary text-sm mb-6">Scannez votre QR code personnel depuis le tableau de bord pour accéder à vos missions.</p>
          <a href={`/dashboard?demo=ultimate`} className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold">
            Accéder au Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary text-primary pb-20">
      {showNewOrderAlert && (
        <div className="fixed top-20 left-4 right-4 z-50 animate-bounce">
          <div className="bg-accent p-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-white/20">
            <div className="bg-white/20 p-2 rounded-full">
              <AlertCircle size={24} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold">Nouvelle Mission !</div>
              <div className="text-white/80 text-xs">Une commande vient de vous être assignée.</div>
            </div>
          </div>
        </div>
      )}

      <header className="p-6 border-b border-color flex justify-between items-center bg-secondary sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold">{driver.name}</h1>
          <p className="text-xs text-tertiary">Portail Livreur • {driver.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          {locationError && <span className="text-[10px] text-error">GPS désactivé</span>}
          {myLocation && <Target size={14} className="text-success" />}
          <button 
            onClick={handleToggleStatus}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              driver.status === 'available' ? 'bg-success/20 text-success border border-success/30' : 
              driver.status === 'busy' ? 'bg-warning/20 text-warning border border-warning/30' : 
              'bg-tertiary/20 text-tertiary border border-tertiary/30'
            }`}
          >
            {driver.status === 'available' ? 'En Ligne' : driver.status === 'busy' ? 'Occupé' : 'Hors Ligne'}
          </button>
        </div>
      </header>

      <main className="p-6 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="glass-panel p-4 flex flex-col items-center justify-center text-center">
            <ShoppingBag className="text-accent mb-2" size={24} />
            <span className="text-2xl font-bold">{assignedOrders.length}</span>
            <span className="text-[10px] uppercase text-tertiary font-bold">Missions</span>
          </div>
          <div className="glass-panel p-4 flex flex-col items-center justify-center text-center">
            <Activity className="text-success mb-2" size={24} />
            <span className="text-2xl font-bold">{driver.activeOrders}</span>
            <span className="text-[10px] uppercase text-tertiary font-bold">En cours</span>
          </div>
        </div>

        <h3 className="text-sm font-bold uppercase tracking-widest text-tertiary mb-4">Commandes Assignées</h3>

        <div className="flex flex-col gap-4">
          {assignedOrders.length === 0 ? (
            <div className="text-center py-12 glass-panel border-dashed opacity-60">
              <Clock size={32} className="mx-auto mb-2 text-tertiary" />
              <p className="text-sm">Aucune mission en cours.</p>
            </div>
          ) : (
            assignedOrders.map(order => (
              <div key={order.id} className="glass-panel p-5 animate-slide-up overflow-hidden relative border-l-4 border-accent">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold text-accent">MISSION {order.id.slice(-6)}</span>
                    <h4 className="text-lg font-bold">Livraison</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-success">{order.total.toFixed(2)} DH</span>
                    <p className="text-[10px] text-tertiary">Paiement à la livraison</p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {order.customerName && (
                    <div className="flex items-center gap-3 text-sm">
                      <User size={16} className="text-tertiary" />
                      <span className="font-bold">{order.customerName}</span>
                    </div>
                  )}
                  {order.customerPhone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone size={16} className="text-tertiary" />
                      <a href={`tel:${order.customerPhone}`} className="text-accent hover:underline">{order.customerPhone}</a>
                    </div>
                  )}
                  {order.customerAddress && (
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin size={16} className="text-tertiary shrink-0 mt-0.5" />
                      <span>{order.customerAddress}</span>
                    </div>
                  )}

                  {/* Embedded map for this order */}
                  {order.customerAddress && selectedOrderForMap === order.id && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-border" style={{ height: '200px' }}>
                      <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
                          (myLocation?.lng ? myLocation.lng - 0.01 : -5) + ',' + 
                          (myLocation?.lat ? myLocation.lat - 0.01 : 35) + ',' + 
                          (myLocation?.lng ? myLocation.lng + 0.01 : -5.5) + ',' + 
                          (myLocation?.lat ? myLocation.lat + 0.01 : 35.5)
                        )}&layer=mapnik&marker=${myLocation?.lat || 35},${myLocation?.lng || -5}`}
                      />
                    </div>
                  )}

                  {/* Mission steps progress */}
                  <div className="mission-progress-bar flex gap-1 mt-3">
                    {[0, 1, 2].map(step => (
                      <div key={step} className={`flex-1 h-1.5 rounded-full ${(missionSteps[order.id] || 0) >= step ? 'bg-accent' : 'bg-secondary'}`} />
                    ))}
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => setSelectedOrderForMap(selectedOrderForMap === order.id ? null : order.id)}
                      className={`btn-secondary flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold ${
                        selectedOrderForMap === order.id ? 'border-accent' : ''
                      }`}
                    >
                      <MapPin size={14} />
                      {selectedOrderForMap === order.id ? 'Cacher la carte' : 'Voir sur la carte'}
                    </button>
                    {order.customerAddress && (
                      <button 
                        onClick={() => openGoogleMapsNavigate(order.customerAddress!)}
                        className="btn-secondary py-2 px-4 flex items-center justify-center gap-2 text-xs font-bold"
                      >
                        <Navigation size={14} className="text-accent" />
                        Google Maps
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-tertiary">
                    <Clock size={14} />
                    <span>Assignée il y a {Math.floor((Date.now() - order.time) / 60000)} min</span>
                    {order.deliveryInstructions && <span>• {order.deliveryInstructions}</span>}
                  </div>
                </div>

                <button 
                  onClick={() => handleStepForward(order.id)}
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2 font-bold transition-all active:scale-95 text-sm"
                  style={{ 
                    background: (missionSteps[order.id] || 0) === 2 ? 'var(--success)' : 'var(--accent)', 
                    color: 'white' 
                  }}
                >
                  {(missionSteps[order.id] || 0) === 0 && <><Clock size={20} /> Je suis arrivé au restaurant</>}
                  {(missionSteps[order.id] || 0) === 1 && <><ShoppingBag size={20} /> Commande récupérée</>}
                  {(missionSteps[order.id] || 0) === 2 && <><CheckCircle size={20} /> Livraison terminée</>}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Available Missions */}
        <div className="mt-12">
          <h3 className="text-sm font-bold uppercase tracking-widest text-tertiary mb-4 flex items-center gap-2">
            Missions Disponibles <span className="bg-accent text-white px-2 py-0.5 rounded-full text-[10px]">{availableOrders.length}</span>
          </h3>
          <div className="flex flex-col gap-4">
            {availableOrders.length === 0 ? (
              <div className="text-center py-8 glass-panel border-dashed opacity-40">
                <p className="text-xs">Pas de nouvelles commandes pour le moment.</p>
              </div>
            ) : (
              availableOrders.map(order => (
                <div key={order.id} className="glass-panel p-4 animate-slide-in">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-bold text-accent">#{order.id.slice(-6)}</span>
                      {order.customerAddress && (
                        <p className="text-xs text-tertiary mt-1">{order.customerAddress}</p>
                      )}
                    </div>
                    <span className="text-sm font-black">{order.total.toFixed(2)} DH</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={() => handleAcceptOrder(order.id)}
                      className="btn-primary flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold"
                      style={{ background: 'var(--accent)', color: 'white' }}
                    >
                      Accepter
                    </button>
                    {order.customerAddress && (
                      <button 
                        onClick={() => openGoogleMapsNavigate(order.customerAddress!)}
                        className="btn-secondary py-2 px-3 flex items-center justify-center text-xs"
                      >
                        <Navigation size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {historyOrders.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-tertiary mb-4">Historique</h3>
            <div className="flex flex-col gap-3">
              {historyOrders.slice(-5).reverse().map(order => (
                <div key={order.id} className="glass-panel p-4 flex justify-between items-center opacity-70">
                  <div>
                    <span className="text-xs font-bold text-tertiary">#{order.id.slice(-6)}</span>
                    <h4 className="text-sm font-bold">Livraison Terminée</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-success">{order.total.toFixed(2)} DH</span>
                    <p className="text-[10px] text-success flex items-center gap-1 justify-end"><CheckCircle size={10}/> Livrée</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-secondary border-t border-color p-4 flex justify-around items-center z-10">
        <button className="flex flex-col items-center gap-1 text-accent">
          <Smartphone size={20} />
          <span className="text-[10px] font-bold">Missions</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-tertiary">
          <Activity size={20} />
          <span className="text-[10px] font-bold">Stats</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-error">
          <LogOut size={20} />
          <span className="text-[10px] font-bold">Déconnexion</span>
        </button>
      </nav>
    </div>
  );
}
