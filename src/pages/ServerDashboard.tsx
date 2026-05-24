import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, QrCode, User, UtensilsCrossed, Search, Check, CreditCard, Hand, History, Bell, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataStore, type Order, type StaffMember } from '../dataStore';
import { useOrderManagement } from '../hooks/useOrderManagement';
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
          <span className="server-order-price">{order.total.toFixed(2)} DH</span>
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
