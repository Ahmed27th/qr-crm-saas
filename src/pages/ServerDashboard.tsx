import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, QrCode, User, UtensilsCrossed, Search, Check, CreditCard, Hand, History, Bell, AlertTriangle, ShoppingCart, Plus, Minus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataStore, type Order, type StaffMember, type MenuItem } from '../dataStore';
import { useOrderManagement } from '../hooks/useOrderManagement';
import { formatPrice } from '../utils/format';
import './ServerDashboard.css';

type Tab = 'a-servir' | 'mes-commandes' | 'payees';

export function ServerDashboard() {
  const { restaurantId, staffId } = useParams<{ restaurantId: string; staffId: string }>();
  const { t } = useTranslation();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [tab, setTab] = useState<Tab>('a-servir');
  const [search, setSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [orderTable, setOrderTable] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const {
    aServir,
    mesCommandes,
    payees,
    claimOrder: optimisticClaim,
    markServed: optimisticServe,
    markPaid: optimisticPay,
  } = useOrderManagement({
    restaurantId: restaurantId!,
    staffId: staffId!,
  });

  useEffect(() => {
    if (!restaurantId || !staffId) return;
    DataStore.getStaff(restaurantId).then(list => {
      const found = list.find(s => s.id === staffId);
      if (found) setStaff(found);
    });
  }, [restaurantId, staffId]);

  useEffect(() => {
    if (!restaurantId) return;
    const unsub = DataStore.subscribeToMenu((items) => {
      setMenuItems(items);
      const cats = Array.from(new Set(items.map(i => i.category)));
      setCategories(cats);
      if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0]);
    }, restaurantId);
    return () => unsub();
  }, [restaurantId]);

  const baseUrl = window.location.origin;
  const reviewUrl = staffId ? `${baseUrl}/staff-review/${restaurantId}/${staffId}` : '';

  const filteredAServir = aServir.filter(o => o.table.toLowerCase().includes(search.toLowerCase()));
  const filteredMesCommandes = mesCommandes.filter(o => o.table.toLowerCase().includes(search.toLowerCase()));
  const filteredPayees = payees.filter(o => o.table.toLowerCase().includes(search.toLowerCase()));

  const handleClaim = async (orderId: string) => {
    try {
      setErrorMsg(null);
      await optimisticClaim(orderId);
    } catch (err: any) {
      if (err?.isConflict) {
        setErrorMsg(t('server_conflict', 'Cette commande a déjà été prise par un autre serveur'));
      } else {
        setErrorMsg(t('server_error', 'Erreur lors de la mise à jour de la commande'));
      }
    }
  };

  const handleServe = async (orderId: string) => {
    try {
      setErrorMsg(null);
      await optimisticServe(orderId);
    } catch (err: any) {
      if (err?.isConflict) {
        setErrorMsg(t('server_conflict_serve', 'Cette commande a déjà été servie'));
      } else {
        setErrorMsg('Erreur lors du marquage "servi"');
      }
    }
  };

  const handlePay = async (orderId: string) => {
    try {
      setErrorMsg(null);
      await optimisticPay(orderId);
    } catch (err: any) {
      if (err?.isConflict) {
        setErrorMsg(t('server_conflict_paid', 'Cette commande a déjà été payée'));
      } else {
        setErrorMsg('Erreur lors du marquage "payé"');
      }
    }
  };

  const cartTotalItems = Object.values(cart).reduce((s, c) => s + c, 0);
  const cartTotalPrice = Object.entries(cart).reduce((s, [id, c]) => {
    const item = menuItems.find(m => m.id === id);
    return s + (item?.price || 0) * c;
  }, 0);

  const handlePlaceOrder = async () => {
    if (!restaurantId || !orderTable || cartTotalItems === 0) return;
    setIsPlacingOrder(true);
    try {
      const workerUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8787";
      const res = await fetch(`${workerUrl}/api/add-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          table: orderTable,
          items: cartTotalItems,
          total: cartTotalPrice,
          orderItems: Object.entries(cart).map(([id, qty]) => {
            const item = menuItems.find(m => m.id === id);
            return { name: item?.name || 'Inconnu', qty, price: item?.price || 0 };
          }),
          source: 'server',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCart({});
      setOrderTable('');
      setShowMenuModal(false);
      setTab('mes-commandes');
    } catch (err) {
      console.error('Failed to place order:', err);
      setErrorMsg('Erreur lors de la création de la commande');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const displayItems = menuItems.filter(item => item.category === activeCategory);

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
        <div className="server-header-actions">
          <button className="server-qr-btn" onClick={() => setShowMenuModal(true)}>
            <ShoppingCart size={16} /> Nouvelle commande
          </button>
          <button className="server-qr-btn" onClick={() => setShowQR(!showQR)}>
            <QrCode size={20} /> QR Avis
          </button>
        </div>
      </header>

      {showQR && (
        <div className="server-qr-modal" onClick={() => setShowQR(false)}>
          <div className="server-qr-card" onClick={e => e.stopPropagation()}>
            <button className="server-qr-close" onClick={() => setShowQR(false)}><QrCode size={18} /></button>
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

      {errorMsg && (
        <div className="server-error-toast" onClick={() => setErrorMsg(null)}>
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="server-stats">
        <div className="server-stat">
          <span className="server-stat-value">{aServir.length}</span>
          <span className="server-stat-label">À servir</span>
        </div>
        <div className="server-stat">
          <span className="server-stat-value">{mesCommandes.length}</span>
          <span className="server-stat-label">Mes commandes</span>
        </div>
        <div className="server-stat">
          <span className="server-stat-value">{payees.length}</span>
          <span className="server-stat-label">Payées (hist.)</span>
        </div>
      </div>

      <div className="server-tabs">
        <button className={`server-tab ${tab === 'a-servir' ? 'active' : ''}`} onClick={() => setTab('a-servir')}>
          <Bell size={16} /> À servir
        </button>
        <button className={`server-tab ${tab === 'mes-commandes' ? 'active' : ''}`} onClick={() => setTab('mes-commandes')}>
          <Hand size={16} /> Mes commandes
        </button>
        <button className={`server-tab ${tab === 'payees' ? 'active' : ''}`} onClick={() => setTab('payees')}>
          <History size={16} /> Payées
        </button>
      </div>

      <div className="server-search-bar">
        <Search size={16} className="server-search-icon" />
        <input
          type="text"
          placeholder="Rechercher par table..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="server-search-input"
        />
      </div>

      <div className="server-orders-list">
        {tab === 'a-servir' && (
          filteredAServir.length === 0 ? (
            <div className="server-empty">
              <Bell size={48} className="server-empty-icon" />
              <p>{search ? 'Aucune table trouvée' : 'Aucune commande prête à servir'}</p>
            </div>
          ) : (
            filteredAServir.map(order => (
              <ServerOrderCard
                key={order.id}
                order={order}
                tab={tab}
                onClaim={() => handleClaim(order.id)}
              />
            ))
          )
        )}

        {tab === 'mes-commandes' && (
          filteredMesCommandes.length === 0 ? (
            <div className="server-empty">
              <Hand size={48} className="server-empty-icon" />
              <p>{search ? 'Aucune table trouvée' : 'Aucune commande en cours'}</p>
            </div>
          ) : (
            filteredMesCommandes.map(order => (
              <ServerOrderCard
                key={order.id}
                order={order}
                tab={tab}
                onServed={() => handleServe(order.id)}
                onPaid={() => handlePay(order.id)}
              />
            ))
          )
        )}

        {tab === 'payees' && (
          filteredPayees.length === 0 ? (
            <div className="server-empty">
              <History size={48} className="server-empty-icon" />
              <p>{search ? 'Aucune table trouvée' : 'Aucun historique'}</p>
            </div>
          ) : (
            filteredPayees.map(order => (
              <ServerOrderCard
                key={order.id}
                order={order}
                tab={tab}
              />
            ))
          )
        )}
      </div>

      {/* Menu Ordering Modal */}
      {showMenuModal && (
        <div className="server-menu-overlay" onClick={() => { if (cartTotalItems === 0) { setShowMenuModal(false); setOrderTable(''); } }}>
          <div className="server-menu-modal" onClick={e => e.stopPropagation()}>
            <div className="server-menu-header">
              <h2><ShoppingCart size={18} /> Nouvelle commande</h2>
              <button className="server-menu-close" onClick={() => { setShowMenuModal(false); setCart({}); setOrderTable(''); }}>
                <X size={20} />
              </button>
            </div>

            <div className="server-menu-table-input">
              <UtensilsCrossed size={16} />
              <input
                type="number"
                placeholder="Numéro de table"
                value={orderTable}
                onChange={e => setOrderTable(e.target.value)}
              />
            </div>

            <div className="server-menu-categories">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`server-menu-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="server-menu-items">
              {displayItems.map(item => (
                <div key={item.id} className={`server-menu-item ${!item.available ? 'sold-out' : ''}`}>
                  <div className="server-menu-item-info">
                    <span className="server-menu-item-name">{item.name}</span>
                    <span className="server-menu-item-price">{formatPrice(item.price)}</span>
                  </div>
                  <div className="server-menu-item-actions">
                    {item.available ? (
                      cart[item.id] ? (
                        <div className="server-menu-qty">
                          <button onClick={() => setCart(prev => {
                            const next = { ...prev };
                            if (next[item.id] > 1) next[item.id] -= 1;
                            else delete next[item.id];
                            return next;
                          })}><Minus size={14} /></button>
                          <span>{cart[item.id]}</span>
                          <button onClick={() => setCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))}><Plus size={14} /></button>
                        </div>
                      ) : (
                        <button className="server-menu-add-btn" onClick={() => setCart(prev => ({ ...prev, [item.id]: 1 }))}>
                          <Plus size={14} /> Ajouter
                        </button>
                      )
                    ) : (
                      <span className="server-menu-sold-out">Épuisé</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {cartTotalItems > 0 && (
              <div className="server-menu-cart-footer">
                <div className="server-menu-cart-summary">
                  <span>{cartTotalItems} article{cartTotalItems > 1 ? 's' : ''}</span>
                  <span className="server-menu-cart-total">{formatPrice(cartTotalPrice)}</span>
                </div>
                <button
                  className="server-menu-submit-btn"
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder || !orderTable}
                >
                  {isPlacingOrder ? 'Envoi...' : `Valider la commande`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ServerOrderCard({ order, tab, onClaim, onServed, onPaid }: {
  order: Order;
  tab: Tab;
  onClaim?: () => void;
  onServed?: () => void;
  onPaid?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className={`server-order-card ${order.status}`}>
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
        <div className="server-order-footer-left">
          <span className="server-order-price">{formatPrice(order.total)}</span>
          <span className="server-order-time"><Clock size={12} /> {Math.floor((Date.now() - order.time) / 60000)} min</span>
        </div>
        <div className="server-order-actions">
          {tab === 'a-servir' && onClaim && (
            <button className="server-action-btn claim" onClick={onClaim}>
              <Hand size={14} /> Prendre
            </button>
          )}
          {tab === 'mes-commandes' && order.status === 'ready' && onServed && (
            <button className="server-action-btn served" onClick={onServed}>
              <Check size={14} /> Servi
            </button>
          )}
          {tab === 'mes-commandes' && order.status === 'served' && onPaid && (
            <button className="server-action-btn paid" onClick={onPaid}>
              <CreditCard size={14} /> Payé
            </button>
          )}
          {tab === 'payees' && (
            <span className="server-paid-badge"><Check size={14} /> Payée</span>
          )}
        </div>
      </div>
    </div>
  );
}
