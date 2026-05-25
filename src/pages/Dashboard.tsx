import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, ShoppingBag, Utensils, QrCode, Settings,
  Bell, Search, Plus, CheckCircle, Clock, TrendingUp, User, Users, Star, MessageSquare, ExternalLink, ShieldAlert, Smartphone, Calendar, Mail, Trash2, X, Tag, Image as ImageIcon, Link as LinkIcon, FileText, Sparkles,
  BarChart3, Activity, PieChart as PieChartIcon, Target, Phone, Truck, Crown, Lock, CreditCard, Download, MoreHorizontal, Loader2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { useQuery, useMutation, useAction, useConvex } from 'convex/react';
import { useConvexAuth } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import { DataStore, setStableRestaurantId } from '../dataStore';
import { formatPrice } from '../utils/format';
import type { Order, Review, MenuItem, Reservation, Driver } from '../dataStore';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { NotificationService } from '../utils/notifications';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { PushService } from '../utils/pushService';
import './Dashboard.css';

export function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated: isAuth } = useConvexAuth();
  const convex = useConvex();
  const authUser = useQuery(api.users.me);
  const accessLevel = useQuery(api.subscriptions.getUserAccessLevel, { 
    userId: localStorage.getItem('qr_restaurant_id') || 'demo' 
  });
  const subscription = authUser?.subscription;
  const searchParams = new URLSearchParams(window.location.search);
  const demoParam = searchParams.get('demo');
  const checkoutSuccess = searchParams.get('checkout') === 'success';
  const isDemoUltimate = demoParam === 'ultimate';
  const isSubActive = isDemoUltimate || subscription?.status === 'active';
  const planId = isDemoUltimate ? 'ultimate' : (isSubActive ? (subscription?.planId ?? 'none') : 'none');
  const createPortal = useAction(api.stripe.createPortalSession);

  const handleManageSubscription = async () => {
    try {
      const { url } = await createPortal({ returnUrl: window.location.href });
      window.location.href = url;
    } catch (err) {
      console.error("Failed to open portal:", err);
    }
  };

  const PLAN_TABS: Record<string, Set<string>> = {
    starter: new Set(['overview', 'reviews', 'qr', 'settings']),
    pro: new Set(['overview', 'analytics', 'orders', 'reservations', 'reviews', 'staff', 'menu', 'qr', 'settings']),
    ultimate: new Set(['overview', 'analytics', 'orders', 'collection', 'reservations', 'reviews', 'staff', 'drivers', 'menu', 'qr', 'settings']),
  };
  const allowedTabs = PLAN_TABS[planId] ?? new Set<string>();
  const PRIMARY_NAV_IDS = new Set(['overview', 'orders', 'menu', 'reviews', 'qr']);

  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<{id: string, text: string, time: string, read: boolean, type: 'order' | 'review'}[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pushStatus, setPushStatus] = useState<'loading' | 'on' | 'off' | 'blocked'>('loading');
  const [prevOrdersCount, setPrevOrdersCount] = useState(0);
  const [prevReviewsCount, setPrevReviewsCount] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [profile, setProfile] = useState<any>({ 
    id: localStorage.getItem('qr_restaurant_id') || 'demo',
    name: 'Chargement...', 
    description: '', 
    coverImage: '', 
    logo: '' 
  });
  const [isAddingDish, setIsAddingDish] = useState(false);
  const [newDish, setNewDish] = useState<Omit<MenuItem, 'id'>>({
    name: '', category: 'Plats', description: '', price: 0, image: '', available: true, popular: false
  });
  const [settingsForm, setSettingsForm] = useState<any>({ name: '', description: '', coverImage: '', logo: '', aboutImage: '' });
  const [isEditingDish, setIsEditingDish] = useState(false);
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [addingStaff, setAddingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Serveur');

  const [addingDriver, setAddingDriver] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAddingDriverLoading, setIsAddingDriverLoading] = useState(false);
  const [qrStaffId, setQrStaffId] = useState<string | null>(null);
  const [qrDriverId, setQrDriverId] = useState<string | null>(null);
  const [isAddingDishLoading, setIsAddingDishLoading] = useState(false);
  const [isAddingStaffLoading, setIsAddingStaffLoading] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);
  const [deletingDriverId, setDeletingDriverId] = useState<string | null>(null);
  const [deletingDishId, setDeletingDishId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [updatingReviewId, setUpdatingReviewId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [googleSearchName, setGoogleSearchName] = useState('');
  const [googleSearchCity, setGoogleSearchCity] = useState('');
  const [googleSearchCountry, setGoogleSearchCountry] = useState('');
  const [googleSearchLoading, setGoogleSearchLoading] = useState(false);
  const [googleSearchError, setGoogleSearchError] = useState<string | null>(null);
  const migrateRestaurantIds = useMutation(api.migrateRestaurantIds.run);
  useEffect(() => {
    let isAuthenticated = localStorage.getItem('qr_is_authenticated') === 'true';
    let restaurantId = localStorage.getItem('qr_restaurant_id');

    // Always enforce stable userId from auth, regardless of new/existing session
    if (isAuth && authUser?.subject) {
      const stableId = authUser.subject.split('|')[0];
      if (restaurantId !== stableId) {
        restaurantId = stableId;
        localStorage.setItem('qr_restaurant_id', restaurantId);
        migrateRestaurantIds().catch((e: any) => console.warn("Migration error:", e));
      }
      if (!isAuthenticated) {
        localStorage.setItem('qr_is_authenticated', 'true');
        isAuthenticated = true;
      }
      setStableRestaurantId(restaurantId);
    }

    // Wait for Convex Auth to finish loading before making redirect decisions
    if (authUser === undefined) return;

    if (isDemoUltimate) {
      restaurantId = 'demo-ultimate';
      isAuthenticated = true;
      localStorage.setItem('qr_restaurant_id', 'demo-ultimate');
      localStorage.setItem('qr_is_authenticated', 'true');
      // Continue to subscribe with demo restaurant ID
    } else if (!isAuthenticated || !restaurantId) {
      // Only redirect if Convex Auth confirms we're not authenticated.
      // Prevents race condition where me query returns null before auth
      // token propagates to the Convex client.
      if (!isAuth) {
        navigate('/login' + window.location.search);
      }
      return;
    }

    PushService.getSubscriptionStatus().then((s) => {
      setPushStatus(s === "granted" ? "on" : s === "denied" ? "blocked" : "off");
    });

    // Try subscribing silently (works if permission already granted)
    PushService.subscribe(convex).then((ok) => {
      if (ok) setPushStatus("on");
    });

    const activeCleanups: (() => void)[] = [];

    // Initialize subscriptions
    activeCleanups.push(DataStore.subscribeToProfile((p) => {
      setProfile(p);
      setSettingsForm((prev: any) => {
        if (!prev.name) return p;
        return prev;
      });
    }, restaurantId));

    activeCleanups.push(DataStore.subscribeToMenu((m) => {
      setMenuItems(m);
    }, restaurantId));

    activeCleanups.push(DataStore.subscribeToStaff((s) => {
      setStaffList(s);
    }, restaurantId));

    activeCleanups.push(DataStore.subscribeToDrivers((d) => {
      setDrivers(d);
    }, restaurantId));

    activeCleanups.push(DataStore.subscribeToReservations((r: Reservation[]) => {
      setReservations(r);
    }, restaurantId));

    activeCleanups.push(DataStore.subscribeToOrders((currentOrders) => {
      if (currentOrders.length > prevOrdersCount && prevOrdersCount > 0) {
        const latestOrder = currentOrders[0];
        NotificationService.showNotification(
          t('notifications.newOrder'),
          { body: `${t('notifications.table')} ${latestOrder.table} - ${latestOrder.total}€` }
        );
      }
      setOrders(currentOrders);
      setPrevOrdersCount(currentOrders.length);
    }, restaurantId));

    activeCleanups.push(DataStore.subscribeToReviews((currentReviews) => {
      if (currentReviews.length > prevReviewsCount && prevReviewsCount > 0) {
        NotificationService.showNotification(
          t('notifications.newReview'),
          { body: t('notifications.checkNewReview') }
        );
      }
      setReviews(currentReviews);
      setPrevReviewsCount(currentReviews.length);
    }, restaurantId));

    return () => {
      activeCleanups.forEach((fn) => fn());
    };
  }, [navigate, prevOrdersCount, prevReviewsCount, t, isAuth, authUser]);

  const handleLogout = async () => {
    PushService.unsubscribe(convex);
    localStorage.removeItem('qr_is_authenticated');
    localStorage.removeItem('qr_restaurant_id');
    navigate('/login');
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (activeTab === 'settings' && profile) {
        setIsSavingSettings(true);
        try {
          setSaveError(null);
          await DataStore.updateProfile(settingsForm);
          setProfile({ ...profile, ...settingsForm });
        } catch (err: any) {
          console.error(err);
          setSaveError(err.message || 'Erreur de sauvegarde');
        } finally {
          setTimeout(() => setIsSavingSettings(false), 1000);
        }
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [settingsForm]);

  const handleUpdateOrderStatus = async (id: string, status: Order['status']) => {
    setUpdatingOrderId(id);
    try {
      await DataStore.updateOrderStatus(id, status);
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Erreur lors de la mise à jour de la commande.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleUpdateReviewStatus = async (id: string, status: Review['status']) => {
    setUpdatingReviewId(id);
    try {
      await DataStore.updateReviewStatus(id, status);
    } catch (error) {
      console.error("Error updating review status:", error);
      alert("Erreur lors de la mise à jour de l'avis.");
    } finally {
      setUpdatingReviewId(null);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaffName.trim()) return;
    setIsAddingStaffLoading(true);
    try {
      await DataStore.addStaffMember({ name: newStaffName.trim(), role: newStaffRole });
      setNewStaffName(''); 
      setNewStaffRole('Serveur'); 
      setAddingStaff(false);
    } catch (error) {
      console.error("Error adding staff:", error);
      alert("Erreur lors de l'ajout du membre. Veuillez réessayer.");
    } finally {
      setIsAddingStaffLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm(t('staff_delete_confirm') || 'Voulez-vous supprimer ce membre ?')) return;
    setDeletingStaffId(id);
    try {
      await DataStore.deleteStaffMember(id);
    } catch (error) {
      console.error("Error deleting staff:", error);
      alert("Erreur lors de la suppression du membre.");
    } finally {
      setDeletingStaffId(null);
    }
  };

  const handleAddDriver = async () => {
    if (!newDriverName.trim()) return alert("Le nom est obligatoire");
    setIsAddingDriverLoading(true);
    try {
      await DataStore.addDriver({ 
        name: newDriverName.trim(), 
        phone: newDriverPhone.trim(),
        status: 'available',
        activeOrders: 0
      });
      setNewDriverName('');
      setNewDriverPhone('');
      setAddingDriver(false);
    } catch (error) {
      console.error("Error adding driver:", error);
      alert("Erreur lors de l'ajout du livreur. Vérifiez votre connexion.");
    } finally {
      setIsAddingDriverLoading(false);
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (!confirm(t('driver_delete_confirm') || 'Voulez-vous supprimer ce livreur ?')) return;
    setDeletingDriverId(id);
    try {
      await DataStore.deleteDriver(id);
    } catch (error) {
      console.error("Error deleting driver:", error);
      alert("Erreur lors de la suppression du livreur.");
    } finally {
      setDeletingDriverId(null);
    }
  };


  const renderStaff = () => {
    const q = searchQuery.toLowerCase();
    const filteredStaff = q ? staffList.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q)
    ) : staffList;
    const isPremium = planId === 'pro' || planId === 'ultimate' || accessLevel?.isPremium;
    if (!isPremium) {
      return (
        <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Crown size={32} className="text-accent" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Fonctionnalité Premium</h2>
          <p className="text-tertiary max-w-md mx-auto mb-8">La gestion du personnel et les QR codes personnalisés pour les avis sont réservés aux abonnés Pro et Ultimate.</p>
          <button className="btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }} onClick={() => navigate('/tarifs')}>Découvrir les offres</button>
        </div>
      );
    }
    const baseUrl = window.location.origin;
    return (
      <div className="dashboard-content">
        <div className="page-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="page-title">{t('staff_mgmt')}</h2>
            <p className="text-tertiary">{t('staff_no_members_desc', 'Ajoutez votre équipe et générez un QR avis personnalisé pour chaque membre.')}</p>
          </div>
          <button className="btn-primary" style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', border: 'none', background: 'var(--accent-gradient)', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
            onClick={() => setAddingStaff(true)}>
            <Plus size={16} /> {t('staff_add')}
          </button>
        </div>

        {/* Stats Row */}
        <div className="stats-grid mb-8">
          <div className="stat-card glass-panel staff-stats-card">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(226, 179, 107, 0.1)', color: 'var(--accent-primary)' }}>
              <Users size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-title">{t('staff_members')}</span>
              <h3 className="stat-value">{filteredStaff.length}</h3>
            </div>
          </div>
          <div className="stat-card glass-panel staff-stats-card">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <MessageSquare size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-title">{t('staff_total_reviews')}</span>
              <h3 className="stat-value">{reviews.length}</h3>
            </div>
          </div>
          <div className="stat-card glass-panel staff-stats-card">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <Star size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-title">{t('staff_avg_rating')}</span>
              <h3 className="stat-value text-gradient">
                {reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—'} ⭐
              </h3>
            </div>
          </div>
        </div>

        {/* Add Staff Modal */}
        {addingStaff && (
          <div className="modal-overlay" onClick={() => setAddingStaff(false)}>
            <div className="glass-modal" onClick={e => e.stopPropagation()}>
              <button className="close-modal-btn" onClick={() => setAddingStaff(false)} aria-label={t('close')}><X size={18} /></button>
              <div className="premium-input-group">
                <label>{t('staff_name_label')}</label>
                <div className="premium-input-wrapper">
                  <Users size={16} className="input-icon" />
                  <input className="premium-input" placeholder={t('staff_name_placeholder')} value={newStaffName} onChange={e => setNewStaffName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddStaff()} autoFocus />
                </div>
              </div>
              <div className="premium-input-group">
                <label>{t('staff_role_label')}</label>
                <select className="premium-select" value={newStaffRole} onChange={e => setNewStaffRole(e.target.value)}>
                  <option value="Serveur">{t('role_server')}</option>
                  <option value="Hôtesse">{t('role_hostess')}</option>
                  <option value="Barman">{t('role_barman')}</option>
                  <option value="Chef">{t('role_chef')}</option>
                  <option value="Gérant">{t('role_manager')}</option>
                  <option value="Caissier">{t('role_cashier')}</option>
                </select>
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setAddingStaff(false)}>{t('staff_cancel')}</button>
                <button className="btn-primary" onClick={handleAddStaff} disabled={isAddingStaffLoading} style={{ border: 'none', cursor: isAddingStaffLoading ? 'not-allowed' : 'pointer', background: 'var(--accent-gradient)', color: 'white', fontWeight: 700, opacity: isAddingStaffLoading ? 0.7 : 1 }}>
                  {isAddingStaffLoading ? "Ajout en cours..." : t('staff_add')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR Modal */}
        {qrStaffId && (() => {
          const member = staffList.find(s => s.id === qrStaffId);
          if (!member) return null;
          const reviewUrl = `${baseUrl}/staff-review/${profile?.id || 'demo'}/${member.id}`;
          return (
            <div className="modal-overlay" onClick={() => setQrStaffId(null)}>
              <div className="glass-modal" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                <button className="close-modal-btn" onClick={() => setQrStaffId(null)} aria-label={t('close')}><X size={18} /></button>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.1rem', margin: '0 auto 1rem' }}>
                  {member.name[0]}
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1.2rem' }}>{t('staff_qr_title')} — {member.name}</h3>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{member.role}</p>
                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '16px', display: 'inline-block', border: '1px solid var(--border-color)' }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(reviewUrl)}`} alt="QR" style={{ width: 180, height: 180 }} />
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.75rem', wordBreak: 'break-all', padding: '0 0.5rem' }}>{reviewUrl}</p>
                <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
                  <button className="btn-secondary" onClick={() => window.open(reviewUrl, '_blank')} style={{ cursor: 'pointer' }}>{t('staff_test_link')}</button>
                  <button className="btn-primary" style={{ cursor: 'pointer', border: 'none', background: 'var(--accent-gradient)', color: 'white', fontWeight: 700 }}
                    onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(reviewUrl)}`, '_blank')}>
                    {t('staff_download')}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Staff Cards Grid */}
        {staffList.length === 0 ? (
          <div className="glass-panel" style={{ padding: '5rem 2rem', textAlign: 'center', background: 'var(--bg-secondary)', border: '2px dashed var(--border-color)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Users size={32} className="text-tertiary" style={{ opacity: 0.5 }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>{t('staff_no_members')}</h3>
            <p className="text-tertiary" style={{ maxWidth: '300px', margin: '0 auto 1.5rem' }}>{t('staff_no_members_desc')}</p>
            <button className="btn-primary" onClick={() => setAddingStaff(true)} style={{ padding: '0.75rem 1.5rem' }}>
              <Plus size={18} /> {t('staff_add')}
            </button>
          </div>
        ) : (
          <>
          {filteredStaff.length === 0 && searchQuery && (
            <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)' }}>
              <p className="text-tertiary">Aucun résultat pour "{searchQuery}"</p>
            </div>
          )}
          {filteredStaff.length > 0 && (
          <div className="staff-cards-grid">
            {filteredStaff.map((member, idx) => {
              const memberReviews = reviews.filter(r => r.comment?.includes(`[${member.name}]`));
              const avgRating = memberReviews.length 
                ? (memberReviews.reduce((s, r) => s + r.rating, 0) / memberReviews.length).toFixed(1) 
                : null;
              
              const isTopPerformer = avgRating && parseFloat(avgRating) >= 4.5 && memberReviews.length >= 3;
              const initials = member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
              const colors = ['linear-gradient(135deg,#667eea,#764ba2)', 'linear-gradient(135deg,#E2B36B,#d4a055)', 'linear-gradient(135deg,#11998e,#38ef7d)', 'linear-gradient(135deg,#f093fb,#f5576c)', 'linear-gradient(135deg,#4facfe,#00f2fe)'];
              const bg = colors[idx % colors.length];

              return (
                <div key={member.id} className="glass-panel staff-card">
                  {isTopPerformer && (
                    <div className="top-performer-badge">
                      <Star size={12} fill="currentColor" /> {t('staff_top_performer', 'TOP')}
                    </div>
                  )}
                  
                  <div className="staff-card-header">
                    <div className="staff-avatar" style={{ background: bg }}>{initials}</div>
                    <div className="staff-info-text">
                      <div className="staff-name-text">{member.name}</div>
                      <div className="staff-role-text">{member.role}</div>
                    </div>
                  </div>

                  <div className="staff-rating-section">
                    <div className="flex justify-between items-center mb-1">
                      <span className="stat-label-tiny">{t('staff_rating_short', 'Note')}</span>
                      <span className="stat-val-highlight" style={{ fontSize: '0.9rem' }}>{avgRating ? `⭐ ${avgRating}` : '—'}</span>
                    </div>
                    <div className="rating-progress-bg">
                      <div className="rating-progress-fill" style={{ width: avgRating ? `${(parseFloat(avgRating) / 5) * 100}%` : '0%', background: parseFloat(avgRating || '0') >= 4 ? 'var(--success)' : 'var(--warning)' }}></div>
                    </div>
                  </div>

                  <div className="staff-stats-row">
                    <div className="staff-mini-stat">
                      <div className="stat-val-normal">{memberReviews.length}</div>
                      <div className="stat-label-tiny">{t('dash_reviews')}</div>
                    </div>
                    <div className="staff-mini-stat" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
                      <div className="stat-val-normal" style={{ color: 'var(--success)' }}>
                        {memberReviews.filter(r => r.rating >= 4).length}
                      </div>
                      <div className="stat-label-tiny">Positifs</div>
                    </div>
                  </div>

                  <div className="staff-card-actions">
                    <button onClick={() => window.open(`${window.location.origin}/serveur/${profile?.id || 'demo'}/${member.id}`, '_blank')} className="staff-dash-btn">
                      <ExternalLink size={15} /> {t('staff_dashboard', 'Dashboard')}
                    </button>
                    <button onClick={() => setQrStaffId(member.id)} className="staff-qr-btn">
                      <QrCode size={15} /> {t('dash_qr')}
                    </button>
                    <button 
                      onClick={() => handleDeleteStaff(member.id)} 
                      className="staff-delete-btn"
                      disabled={deletingStaffId === member.id}
                      style={{ opacity: deletingStaffId === member.id ? 0.5 : 1 }}
                    >
                      {deletingStaffId === member.id ? <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
          </>
        )}
      </div>
    );
  };

  const renderDrivers = () => {
    const q = searchQuery.toLowerCase();
    const filteredDrivers = q ? drivers.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.phone.toLowerCase().includes(q) ||
      d.status.toLowerCase().includes(q)
    ) : drivers;
    return (
      <div className="dashboard-content">
        <div className="page-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="page-title">{t('driver_mgmt')}</h2>
            <p className="text-tertiary">Gérez vos livreurs et suivez leurs performances en temps réel.</p>
          </div>
          <button className="btn-primary" style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', border: 'none', background: 'var(--accent-gradient)', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
            onClick={() => setAddingDriver(true)}>
            <Plus size={16} /> {t('driver_add')}
          </button>
        </div>

        {/* Stats Row */}
        <div className="stats-grid mb-8">
          <div className="stat-card glass-panel staff-stats-card">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(226, 179, 107, 0.1)', color: 'var(--accent-primary)' }}>
              <Truck size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-title">{t('dash_drivers')}</span>
              <h3 className="stat-value">{filteredDrivers.length}</h3>
            </div>
          </div>
          <div className="stat-card glass-panel staff-stats-card">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <Activity size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-title">{t('driver_status_label')}</span>
              <h3 className="stat-value">{filteredDrivers.filter(d => d.status === 'available').length} Dispo</h3>
            </div>
          </div>
          <div className="stat-card glass-panel staff-stats-card">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
              <ShoppingBag size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-title">{t('driver_active_orders')}</span>
              <h3 className="stat-value">{filteredDrivers.reduce((sum, d) => sum + (d.activeOrders || 0), 0)}</h3>
            </div>
          </div>
        </div>

        {/* Add Driver Modal */}
        {/* Modals moved to global level */}

        {/* Drivers Cards Grid */}
        {drivers.length === 0 ? (
          <div className="glass-panel" style={{ padding: '5rem 2rem', textAlign: 'center', background: 'var(--bg-secondary)', border: '2px dashed var(--border-color)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Truck size={32} className="text-tertiary" style={{ opacity: 0.5 }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Aucun livreur pour le moment</h3>
            <p className="text-tertiary" style={{ maxWidth: '300px', margin: '0 auto 1.5rem' }}>Ajoutez vos livreurs pour suivre leurs livraisons.</p>
            <button className="btn-primary" onClick={() => setAddingDriver(true)} style={{ padding: '0.75rem 1.5rem' }}>
              <Plus size={18} /> {t('driver_add')}
            </button>
          </div>
        ) : (
          <>
          {filteredDrivers.length === 0 && searchQuery && (
            <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)' }}>
              <p className="text-tertiary">Aucun résultat pour "{searchQuery}"</p>
            </div>
          )}
          {filteredDrivers.length > 0 && (
          <div className="staff-cards-grid">
              {filteredDrivers.map((driver) => {
              const initials = driver.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              const statusColors = { available: 'var(--success)', busy: 'var(--warning)', offline: 'var(--text-tertiary)' };
              
              return (
                <div key={driver.id} className="glass-panel staff-card">
                  <div className="staff-card-header">
                    <div className="staff-avatar" style={{ background: 'linear-gradient(135deg,#00ccbc,#11998e)' }}>{initials}</div>
                    <div className="staff-info-text">
                      <div className="staff-name-text">{driver.name}</div>
                      <div className="staff-role-text">
                        <span className="status-dot" style={{ background: statusColors[driver.status] || 'var(--text-tertiary)' }}></span>
                        {driver.status === 'available' ? 'Disponible' : driver.status === 'busy' ? 'En Livraison' : 'Hors-ligne'}
                      </div>
                    </div>
                  </div>

                  <div className="staff-stats-row">
                    <div className="staff-mini-stat">
                      <div className="stat-val-normal">{driver.activeOrders || 0}</div>
                      <div className="stat-label-tiny">{t('driver_active_orders')}</div>
                    </div>
                    <div className="staff-mini-stat" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
                      <div className="stat-val-normal">{driver.phone}</div>
                      <div className="stat-label-tiny">{t('driver_phone_label')}</div>
                    </div>
                  </div>

                  <div className="staff-card-actions">
                    <button onClick={() => setQrDriverId(driver.id)} className="staff-qr-btn">
                      <QrCode size={15} /> PORTAIL
                    </button>
                    <button 
                      onClick={() => handleDeleteDriver(driver.id)} 
                      className="staff-delete-btn"
                      disabled={deletingDriverId === driver.id}
                      style={{ opacity: deletingDriverId === driver.id ? 0.5 : 1 }}
                    >
                      {deletingDriverId === driver.id ? <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
          </>
        )}
      </div>
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void, mode: 'square' | 'cover' = 'square') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (mode === 'cover') {
            const W = 1200, H = 400;
            canvas.width = W;
            canvas.height = H;
            const srcRatio = img.width / img.height;
            const dstRatio = W / H;
            let sourceX = 0, sourceY = 0, sourceW = img.width, sourceH = img.height;
            if (srcRatio > dstRatio) {
              sourceW = img.height * dstRatio;
              sourceX = (img.width - sourceW) / 2;
            } else {
              sourceH = img.width / dstRatio;
              sourceY = (img.height - sourceH) / 2;
            }
            ctx?.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, W, H);
          } else {
            const SIZE = 800;
            canvas.width = SIZE;
            canvas.height = SIZE;
            let sourceX = 0, sourceY = 0;
            const sourceSize = Math.min(img.width, img.height);
            if (img.width > img.height) {
              sourceX = (img.width - img.height) / 2;
            } else {
              sourceY = (img.height - img.width) / 2;
            }
            ctx?.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, SIZE, SIZE);
          }
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          callback(dataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const renderAnalytics = () => {
    const isPremium = planId === 'pro' || planId === 'ultimate' || accessLevel?.isPremium;
    if (!isPremium) {
      return (
        <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Crown size={32} className="text-accent" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Fonctionnalité Premium</h2>
          <p className="text-tertiary max-w-md mx-auto mb-8">Les statistiques et analyses de performances détaillées sont réservées aux abonnés Pro et Ultimate.</p>
          <button className="btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }} onClick={() => navigate('/tarifs')}>Découvrir les offres</button>
        </div>
      );
    }
    const now = Date.now();
    const oneDay = 86400000;
    
    // 1. Sales by Day (Last 7 Days)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const salesByDay = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now - (6 - i) * oneDay);
      const dayName = days[date.getDay()];
      const dayStart = new Date(date.setHours(0,0,0,0)).getTime();
      const dayEnd = dayStart + oneDay;
      
      const daySales = orders
        .filter(o => o.time >= dayStart && o.time < dayEnd)
        .reduce((sum, o) => sum + o.total, 0);
        
      return { day: dayName, sales: daySales }; 
    });

    // 2. Source Data
    const sourceData = [
      { name: 'QR Menu', value: orders.filter(o => o.source === 'qr').reduce((s,o) => s+o.total, 0) },
      { name: 'UberEats', value: orders.filter(o => o.source === 'ubereats').reduce((s,o) => s+o.total, 0) },
      { name: 'Glovo', value: orders.filter(o => o.source === 'glovo').reduce((s,o) => s+o.total, 0) }
    ];

    const COLORS = ['#e2b36b', '#06C167', '#00ccbc'];

    // 3. Hourly Traffic
    const hourlyTraffic = Array.from({ length: 24 }, (_, i) => {
      const hour = i;
      const count = orders.filter(o => {
        const h = new Date(o.time).getHours();
        return h === hour;
      }).length;
      return { hour: `${hour}h`, orders: count };
    });

    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const totalOrdersCount = orders.length;
    const avgTicket = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

    return (
      <div className="dashboard-content">
        <div className="page-header">
          <div>
            <h2 className="page-title">{t('analytics_title')}</h2>
            <p className="text-tertiary">{t('analytics_desc', 'Données de performance et analyses de votre établissement.')}</p>
          </div>
          <div className="flex gap-2">
             <button className="btn-secondary flex items-center gap-2" style={{ padding: '0.6rem 1rem', borderRadius: '10px' }}><Clock size={16}/> {t('last_7_days', '7 derniers jours')}</button>
             <button className="btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: '10px' }}>{t('export_report', 'Exporter')}</button>
          </div>
        </div>

        {/* Big Stats Row */}
        <div className="stats-grid mb-8">
          <div className="stat-card glass-panel">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(226, 179, 107, 0.1)', color: 'var(--accent-primary)' }}>
              <TrendingUp size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-title">{t('analytics_revenue')}</span>
              <h3 className="stat-value">{formatPrice(totalRevenue, 0)}</h3>
              <span className="stat-trend positive" style={{ opacity: totalRevenue > 0 ? 1 : 0.5 }}>{totalRevenue > 0 ? '+100% (New)' : 'Aucun revenu'}</span>
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <ShoppingBag size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-title">{t('analytics_orders')}</span>
              <h3 className="stat-value">{totalOrdersCount}</h3>
              <span className="stat-trend positive" style={{ opacity: totalOrdersCount > 0 ? 1 : 0.5 }}>{totalOrdersCount > 0 ? '+100% (New)' : 'Aucune commande'}</span>
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Users size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-title">{t('analytics_avg_ticket')}</span>
              <h3 className="stat-value">{formatPrice(avgTicket, 0)}</h3>
              <span className="stat-trend neutral">Moyenne globale</span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="analytics-charts-grid-2">
          {/* Main Sales Chart */}
          <div className="glass-panel p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '24px' }}>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-accent"/> {t('analytics_sales_over_time')}</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesByDay}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: 'var(--text-tertiary)', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-tertiary)', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ background: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                    itemStyle={{ color: 'var(--accent-primary)' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Traffic Chart */}
          <div className="glass-panel p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '24px' }}>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Clock size={20} className="text-accent"/> {t('analytics_peak_hours')}</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyTraffic}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: 'var(--text-tertiary)', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-tertiary)', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ background: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                  />
                  <Bar dataKey="orders" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="analytics-charts-grid-3">
          {/* Source Breakdown */}
          <div className="glass-panel p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '24px' }}>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><PieChartIcon size={20} className="text-accent"/> {t('analytics_channel_breakdown')}</h3>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sourceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-3 mt-4">
              {sourceData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i] }} />
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <span className="text-sm font-bold">{((s.value / sourceData.reduce((acc, v) => acc + v.value, 0)) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Items */}
          <div className="glass-panel p-6 analytics-popular-items" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '24px' }}>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Target size={20} className="text-accent"/> {t('analytics_popular_items')}</h3>
            <div className="flex flex-col gap-4">
              {menuItems.slice(0, 5).map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center font-black text-accent text-lg">#{idx+1}</div>
                    <div className="flex items-center gap-3">
                      <img src={item.image} className="w-12 h-12 rounded-xl object-cover shadow-lg" alt={item.name} />
                      <div>
                        <div className="font-bold text-base">{item.name}</div>
                        <div className="text-xs text-tertiary font-semibold uppercase tracking-wider">{item.category}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-lg">{(150 - idx * 25)} <span className="text-xs text-tertiary font-normal">commandes</span></div>
                    <div className="text-sm text-success font-bold flex items-center justify-end gap-1">
                      <TrendingUp size={14}/> {12 - idx}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOrders = () => {
    const q = searchQuery.toLowerCase();
    const filteredOrders = q ? orders.filter(o =>
      o.id.toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.table || '').toLowerCase().includes(q)
    ) : orders;
    return (
    <div className="dashboard-content">
      <div className="page-header">
        <h2 className="page-title">{t('dash_orders')}</h2>
        <div className="flex gap-2">
          <span className="badge-success">{filteredOrders.filter(o => o.status === 'pending').length} {t('status_new', 'Nouveau')}</span>
        </div>
      </div>
      
      <div className="orders-kanban mt-6">
        {(['pending', 'preparing', 'ready'] as const).map(status => (
          <div key={status} className="kanban-col glass-panel">
            <div className="kanban-col-header">
              <span className="kanban-title">{status.toUpperCase()}</span>
              <span className="kanban-count">
                {filteredOrders.filter(o => o.status === status).length}
              </span>
            </div>
            <div className="kanban-cards">
              {filteredOrders.filter(o => o.status === status).map(order => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <span className="order-id">{order.id}</span>
                    <span className="order-time"><Clock size={12}/> {Math.floor((Date.now() - order.time) / 60000)} min</span>
                  </div>
                  <div className="order-body">
                    <div className="order-table">Table {order.table}</div>
                    <div className="order-meta">{order.items} items • {formatPrice(order.total)}</div>
                  </div>
                  <div className="order-actions">
                    {status === 'pending' && <button className="btn-primary btn-full" disabled={updatingOrderId === order.id} onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}>{updatingOrderId === order.id ? "..." : "Accepter"}</button>}
                    {status === 'preparing' && <button className="btn-secondary btn-full" disabled={updatingOrderId === order.id} onClick={() => handleUpdateOrderStatus(order.id, 'ready')}>{updatingOrderId === order.id ? "..." : "Prêt"}</button>}
                    {status === 'ready' && <button className="btn-success btn-full"><CheckCircle size={16}/> Terminé</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
    );
  };

  const renderOverview = () => {
    const todaySales = orders.reduce((sum, o) => sum + o.total, 0);
    const activeOrders = orders.filter(o => o.status !== 'ready');
    const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';
    
    return (
      <div className="dashboard-content">
        {/* Welcome Banner */}
        <div className="overview-welcome glass-panel">
          <div className="overview-welcome-content">
            <div>
              <h2 className="page-title">
                {t('dash_welcome', 'Bienvenue')}{authUser?.name ? `, ${authUser.name.split(' ')[0]}` : ''} 👋
              </h2>
              <p>{t('dash_welcome_desc', 'Voici un aperçu de votre activité en temps réel.')}</p>
            </div>
            <div className="badge-accent">
              <span className="live-dot"></span>
              {t('status_live', 'Live')}
            </div>
          </div>
        </div>

        {/* 4-card Stats */}
        <div className="overview-stats-grid">
          <div className="stat-card glass-panel">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(226, 179, 107, 0.12)', color: 'var(--accent-primary)' }}>
              <TrendingUp size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-title">{t('today_sales', "Ventes")}</span>
              <h3 className="stat-value">{formatPrice(todaySales, 0)}</h3>
              <span className="stat-trend positive">+{orders.length} {t('orders', 'commandes')}</span>
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>
              <ShoppingBag size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-title">{t('active_orders', 'Commandes')}</span>
              <h3 className="stat-value">{activeOrders.length}</h3>
              <span className="stat-trend positive">{activeOrders.filter(o => o.status === 'pending').length} {t('status_new', 'en attente')}</span>
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)' }}>
              <Utensils size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-title">{t('dash_menu', 'Menu')}</span>
              <h3 className="stat-value">{menuItems.length}</h3>
              <span className="stat-trend">{menuItems.filter(i => i.available).length} {t('available', 'disponibles')}</span>
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6' }}>
              <Star size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-title">{t('dash_reviews', 'Avis')}</span>
              <h3 className="stat-value">{avgRating} <span style={{ fontSize: '0.85rem' }}>⭐</span></h3>
              <span className="stat-trend">{reviews.length} {t('total', 'total')}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-row">
          <button className="quick-action-btn primary" onClick={() => setActiveTab('menu')}>
            <Plus size={16} /> {t('menu_add_plat', 'Ajouter un plat')}
          </button>
          <button className="quick-action-btn secondary" onClick={() => setActiveTab('qr')}>
            <QrCode size={16} /> {t('qr_view', 'QR Codes')}
          </button>
          <button className="quick-action-btn secondary" onClick={() => window.open(`${window.location.origin}/menu/${profile?.id || 'demo'}`, '_blank')}>
            <ExternalLink size={16} /> {t('view_menu', 'Voir mon menu')}
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="analytics-charts-grid-2">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <div className="section-header-icon" style={{ background: 'rgba(var(--accent-primary-rgb), 0.1)' }}>
                <Clock size={18} className="text-accent"/>
              </div>
              File d'attente Cuisine
            </h3>
            <div className="flex flex-col gap-3">
              {activeOrders.slice(0, 5).map(order => (
                <div key={order.id} className="overview-order-item">
                  <div>
                    <div className="font-bold" style={{ fontSize: '0.9rem' }}>{order.id}</div>
                    <div className="text-xs text-tertiary">Table {order.table} • {order.items} articles</div>
                  </div>
                  <span className={`status-badge ${order.status === 'pending' ? 'inactive' : 'active'}`}>
                    {order.status === 'pending' ? '⏳ Attente' : '🍳 Préparation'}
                  </span>
                </div>
              ))}
              {activeOrders.length === 0 && (
                <div className="empty-mini">
                  <div className="empty-mini-icon">🍽️</div>
                  <p className="text-tertiary">Aucune commande active</p>
                  <p className="text-tertiary">Les commandes apparaîtront ici en temps réel</p>
                </div>
              )}
              <button className="btn-secondary btn-full" onClick={() => setActiveTab('orders')}>
                Voir tout le Kanban →
              </button>
            </div>
          </div>
          
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <div className="section-header-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <Users size={18} style={{ color: 'var(--success)' }}/>
              </div>
              Staff en Service
            </h3>
            <div className="flex flex-col gap-3">
              {staffList.slice(0, 5).map((member, idx) => {
                const colors = ['#667eea', '#E2B36B', '#11998e', '#f093fb', '#4facfe'];
                return (
                  <div key={member.id} className="overview-staff-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="staff-avatar-mini" style={{ background: colors[idx % colors.length] }}>{member.name.charAt(0)}</div>
                      <div>
                        <div className="font-bold">{member.name}</div>
                        <div className="text-xs text-tertiary">{member.role}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div className="status-dot-active"></div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Actif</span>
                    </div>
                  </div>
                );
              })}
              {staffList.length === 0 && (
                <div className="empty-mini">
                  <div className="empty-mini-icon">👥</div>
                  <p className="text-tertiary">Aucun staff ajouté</p>
                  <p className="text-tertiary">Ajoutez votre équipe pour commencer</p>
                </div>
              )}
              <button className="btn-secondary btn-full" onClick={() => setActiveTab('staff')}>
                Gérer le Staff →
              </button>
            </div>
          </div>
        </div>

        {/* Recent Reviews Section */}
        {reviews.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <div className="section-header-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                <MessageSquare size={18} style={{ color: '#8B5CF6' }}/>
              </div>
              Derniers Avis
            </h3>
            <div className="reviews-grid">
              {reviews.slice(0, 3).map(review => (
                <div key={review.id} className="glass-panel overview-review-card">
                  <div className="review-header">
                    <div className="review-stars">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} size={14} className={star <= review.rating ? 'star-filled' : 'star-empty'} fill={star <= review.rating ? "currentColor" : "none"} />
                      ))}
                    </div>
                    <span className="review-time">{Math.floor((Date.now() - review.time) / 60000)}m</span>
                  </div>
                  <p className="review-comment" style={{ fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>"{review.comment}"</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReviews = () => {
    const q = searchQuery.toLowerCase();
    const filteredReviews = q ? reviews.filter(r =>
      (r.userName || '').toLowerCase().includes(q) ||
      (r.comment || '').toLowerCase().includes(q)
    ) : reviews;
    return (
    <div className="dashboard-content">
      <div className="page-header">
        <h2 className="page-title">Review Management</h2>
        <p className="text-tertiary">Real-time feedback directly from customer tables.</p>
      </div>

      {filteredReviews.length === 0 && searchQuery && (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)' }}>
          <p className="text-tertiary">Aucun résultat pour "{searchQuery}"</p>
        </div>
      )}
      {filteredReviews.length > 0 && (
      <div className="reviews-grid">
        {filteredReviews.sort((a, b) => b.time - a.time).map(review => {
          const isGood = review.rating >= 4;
          return (
            <div key={review.id} className="review-card glass-panel">
              <div className="review-header">
                <div className="review-stars">
                  {[1,2,3,4,5].map(star => (
                    <Star key={star} size={16} className={star <= review.rating ? 'star-filled' : 'star-empty'} fill={star <= review.rating ? "currentColor" : "none"} />
                  ))}
                </div>
                <span className="review-time">{Math.floor((Date.now() - review.time) / 60000)}m ago</span>
              </div>
              <p className="review-comment">"{review.comment}"</p>
              
              <div className="review-actions">
                {isGood ? (
                  <>
                    {review.status === 'published_google' ? (
                      <span className="badge-success"><CheckCircle size={14}/> Shared to Google</span>
                    ) : (
                      <button className="btn-google" disabled={updatingReviewId === review.id} onClick={() => {
                        handleUpdateReviewStatus(review.id, 'published_google');
                        if(profile.googleReviewUrl) window.open(profile.googleReviewUrl, '_blank');
                      }}>
                        <ExternalLink size={16}/> {updatingReviewId === review.id ? "..." : "Share to Google"}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {review.status === 'internal_resolved' ? (
                      <span className="badge-resolved"><CheckCircle size={14}/> Resolved Internally</span>
                    ) : (
                      <button className="btn-resolve" disabled={updatingReviewId === review.id} onClick={() => handleUpdateReviewStatus(review.id, 'internal_resolved')}>
                        <ShieldAlert size={16}/> {updatingReviewId === review.id ? "..." : "Resolve Internal Issue"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
    );
  };

  const handleToggleAvailability = async (id: string, current: boolean) => {
    try {
      await DataStore.updateMenuItem(id, { available: !current });
    } catch (error) {
      console.error("Error toggling availability:", error);
      alert("Erreur lors du changement de disponibilité.");
    }
  };

  const handleUpdatePrice = async (id: string, newPrice: string) => {
    const price = parseFloat(newPrice);
    if (!isNaN(price)) {
      try {
        await DataStore.updateMenuItem(id, { price });
      } catch (error) {
        console.error("Error updating price:", error);
        alert("Erreur lors de la mise à jour du prix.");
      }
    }
  };

  const renderMenuEditor = () => {
    const q = searchQuery.toLowerCase();
    const filteredItems = q ? menuItems.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    ) : menuItems;
    return (
    <div className="dashboard-content">
      <div className="page-header">
        <h2 className="page-title">Menu Management</h2>
        <button className="btn btn-primary" onClick={() => setIsAddingDish(true)}><Plus size={18}/> Add Dish</button>
      </div>

      {filteredItems.length === 0 && searchQuery && (
        <div className="glass-panel mt-4" style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px dashed var(--border-color)' }}>
          <p className="text-tertiary">Aucun résultat pour "{searchQuery}"</p>
        </div>
      )}
      {filteredItems.length > 0 && (
      <div className="menu-editor-grid glass-panel mt-4">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Price (DH)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id}>
                <td className="font-semibold">{item.name}</td>
                <td><span className="category-badge">{item.category}</span></td>
                <td>
                  <input 
                    type="number" 
                    defaultValue={item.price.toFixed(2)} 
                    onBlur={(e) => handleUpdatePrice(item.id, e.target.value)}
                    style={{ width: '80px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}
                  />
                </td>
                <td>
                  <button 
                    onClick={() => handleToggleAvailability(item.id, item.available)}
                    className={`status-badge ${item.available ? 'active' : 'inactive'}`}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    {item.available ? 'Available' : 'Sold Out'}
                  </button>
                </td>
                <td>
                  <button className="icon-btn-ghost text-accent mr-2" onClick={() => {
                    setEditingDish(item);
                    setIsEditingDish(true);
                  }}><Settings size={16} /></button>
                  <button 
                    className="icon-btn-ghost text-danger" 
                    disabled={deletingDishId === item.id}
                    onClick={async () => {
                      if(confirm(t('dish_delete_confirm') || 'Supprimer ce plat ?')) {
                        setDeletingDishId(item.id);
                        try {
                          await DataStore.deleteMenuItem(item.id);
                        } catch (error) {
                          console.error("Error deleting dish:", error);
                          alert("Erreur lors de la suppression du plat.");
                        } finally {
                          setDeletingDishId(null);
                        }
                      }
                    }}
                  >
                    {deletingDishId === item.id ? <div className="animate-spin h-4 w-4 border-2 border-danger border-t-transparent rounded-full" /> : <Trash2 size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
    );
  };

  const renderCollectionPoint = () => {
    const qrSales = orders.filter(o => o.source === 'qr').reduce((sum, o) => sum + o.total, 0);
    const deliverySales = orders.filter(o => o.table === 'Delivery' || o.table === 'Livraison' || o.customerAddress).reduce((sum, o) => sum + o.total, 0);

    return (
      <div className="dashboard-content">
        <div className="page-header">
          <h2 className="page-title">Omnichannel Collection Point</h2>
          <p className="text-tertiary">Gérez vos livraisons propres et vos commandes sur place.</p>
        </div>

        <div className="stats-grid mb-8">
          <div className="stat-card glass-panel" style={{ borderColor: 'var(--accent-primary)', position: 'relative', overflow: 'hidden' }}>
            <div className="stat-info">
              <span className="stat-title">Ventes QR Menu</span>
              <h3 className="stat-value">{formatPrice(qrSales)}</h3>
              <span className="stat-trend positive"><Activity size={12}/> En direct</span>
            </div>
          </div>
          <div className="stat-card glass-panel" style={{ borderColor: 'var(--success)' }}>
            <div className="stat-info">
              <span className="stat-title">Ventes Livraison</span>
              <h3 className="stat-value">{formatPrice(deliverySales)}</h3>
              <span className="stat-trend positive"><ShoppingBag size={12}/> Flotte Manager</span>
            </div>
          </div>
          <div className="stat-card glass-panel" style={{ borderColor: 'var(--accent-primary)' }}>
            <div className="stat-info">
              <span className="stat-title">Livreurs Actifs</span>
              <h3 className="stat-value">{drivers.filter(d => d.status === 'busy' || d.status === 'available').length}</h3>
              <span className="stat-trend">{drivers.filter(d => d.status === 'available').length} disponibles</span>
            </div>
          </div>
        </div>

        <div className="analytics-charts-grid-2 mb-8">
          {/* Delivery Fleet Management */}
          <div className="glass-panel p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '24px' }}>
             <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
               <span className="flex items-center gap-2"><Smartphone size={20} className="text-accent"/> Flotte de Livraison</span>
               <button onClick={() => setAddingDriver(true)} className="text-accent hover:text-accent-secondary transition-colors">
                 <Plus size={20}/>
               </button>
             </h3>
             <div className="flex flex-col gap-4">
               {drivers.map(driver => (
                 <div key={driver.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-accent/30 transition-colors">
                   <div className="flex items-center gap-4">
                     <div className={`w-3 h-3 rounded-full ${driver.status === 'available' ? 'bg-success' : driver.status === 'busy' ? 'bg-warning' : 'bg-tertiary'}`}></div>
                     <div>
                       <div className="font-bold flex items-center gap-2">
                         {driver.name}
                         <button onClick={() => setQrDriverId(driver.id)} className="text-tertiary hover:text-accent transition-colors">
                           <QrCode size={14}/>
                         </button>
                       </div>
                       <div className="text-xs text-tertiary">{driver.phone}</div>
                     </div>
                   </div>
                   <div className="flex items-center gap-4">
                     <div className="flex flex-col items-end gap-1">
                       <div className="text-xs font-bold uppercase tracking-wider" style={{ color: driver.status === 'available' ? 'var(--success)' : driver.status === 'busy' ? 'var(--warning)' : 'var(--text-tertiary)' }}>
                         {driver.status}
                       </div>
                       <div className="text-xs text-tertiary">{driver.activeOrders} en cours</div>
                     </div>
                      <button onClick={async () => {
                        await DataStore.deleteDriver(driver.id);
                        const updated = await DataStore.getDrivers();
                        setDrivers(updated);
                      }} className="text-tertiary hover:text-error transition-colors p-1">
                        <Trash2 size={16}/>
                      </button>
                   </div>
                 </div>
               ))}
               {drivers.length === 0 && (
                 <div className="text-center py-8 text-tertiary italic text-sm">Aucun livreur configuré</div>
               )}
             </div>
          </div>

          {/* Assign Orders */}
          <div className="glass-panel p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '24px' }}>
             <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><ShoppingBag size={20} className="text-accent"/> Assignation des Livraisons</h3>
             <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
               {orders.filter(o => (o.table === 'Delivery' || o.table === 'Livraison' || o.customerAddress || o.source !== 'qr') && o.status === 'ready' && !o.driverId).map(order => (
                 <div key={order.id} className="p-4 rounded-xl bg-accent/5 border border-accent/20 flex items-center justify-between">
                   <div>
                     <div className="font-bold">Commande {order.id}</div>
                     <div className="text-xs text-tertiary">{order.total} DH • Prête pour départ</div>
                   </div>
                   <select 
                     className="select-mini"
                     onChange={async (e) => {
                       if(e.target.value) {
                         const driverId = e.target.value;
                         const driver = drivers.find(d => d.id === driverId);
                         const driverName = driver?.name;
                         
                         setNotifications(prev => [{
                           id: Math.random().toString(),
                           text: `Mission assignée à ${driverName}`,
                           time: 'À l\'instant',
                           read: false,
                           type: 'order'
                         }, ...prev]);

                         await DataStore.assignOrderToDriver(order.id, driverId);
                         await DataStore.updateDriverStatus(driverId, 'busy');
                         await DataStore.updateDriverOrders(driverId, (driver?.activeOrders || 0) + 1);
                          
                         const [drvList, ordList] = await Promise.all([
                            DataStore.getDrivers(),
                            DataStore.getOrders()
                         ]);
                         setDrivers(drvList);
                         setOrders(ordList);
                       }
                     }}
                     style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.4rem' }}
                   >
                     <option value="">Assigner...</option>
                     {drivers.filter(d => d.status === 'available').map(d => (
                       <option key={d.id} value={d.id}>{d.name}</option>
                     ))}
                   </select>
                 </div>
               ))}
               
               {/* Show currently out for delivery */}
               {orders.filter(o => o.driverId && o.status !== 'delivered').map(order => (
                 <div key={order.id} className="p-4 rounded-xl bg-success/5 border border-success/20 flex items-center justify-between opacity-80">
                   <div>
                     <div className="font-bold flex items-center gap-2">
                       {order.id} <span className="text-[10px] bg-success/20 text-success px-2 py-0.5 rounded">EN ROUTE</span>
                     </div>
                     <div className="text-xs text-tertiary">Assigné à: {drivers.find(d => d.id === order.driverId)?.name}</div>
                   </div>
                   <div className="text-xs text-tertiary italic">Livraison en cours</div>
                 </div>
               ))}

               {orders.filter(o => (o.table === 'Delivery' || o.table === 'Livraison' || o.customerAddress || o.source !== 'qr') && o.status === 'ready').length === 0 && (
                 <div className="text-center p-8 text-tertiary italic text-sm">Aucune commande en attente de livraison</div>
               )}
             </div>
          </div>
        </div>

        <div className="section-header mt-8">
          <h3 className="text-lg font-bold">Commandes Entrantes Unifiées</h3>
          <span className="badge-success" style={{ padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={16}/> Synchronisation POS Active
          </span>
        </div>

        <div className="glass-panel mt-4">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Commande</th>
                <th>Source / Table</th>
                <th>Articles</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td className="font-semibold">{order.id}</td>
                  <td>
                    <span 
                      className="category-badge" 
                      style={{ 
                        backgroundColor: order.source === 'ubereats' ? 'rgba(6,193,103,0.1)' : order.source === 'glovo' ? 'rgba(0,204,188,0.1)' : 'rgba(var(--accent-primary-rgb),0.1)', 
                        color: order.source === 'ubereats' ? '#06C167' : order.source === 'glovo' ? '#00ccbc' : 'var(--accent-primary)' 
                      }}
                    >
                      {order.source === 'ubereats' ? 'UberEats' : order.source === 'glovo' ? 'Glovo' : (order.table === 'Livraison' || order.customerAddress) ? 'Livraison' : `Table ${order.table}`}
                    </span>
                  </td>
                  <td>{order.items} articles</td>
                  <td>{formatPrice(order.total)}</td>
                  <td>
                    <span className={`status-badge ${order.status === 'pending' ? 'inactive' : 'active'}`}>
                      {order.status === 'pending' ? t('status_new', 'Nouveau') : order.status === 'preparing' ? t('status_preparing', 'En cours') : order.status === 'ready' ? t('status_ready', 'Prêt') : 'Terminé'}
                    </span>
                  </td>
                  <td>
                    {order.status === 'pending' ? (
                      <button className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', opacity: updatingOrderId === order.id ? 0.7 : 1 }} disabled={updatingOrderId === order.id} onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}>
                        {updatingOrderId === order.id ? "..." : "Accepter"}
                      </button>
                    ) : order.status === 'preparing' ? (
                      <button className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', opacity: updatingOrderId === order.id ? 0.7 : 1 }} disabled={updatingOrderId === order.id} onClick={() => handleUpdateOrderStatus(order.id, 'ready')}>
                        {updatingOrderId === order.id ? "..." : "Marquer Prêt"}
                      </button>
                    ) : order.status === 'ready' && (order.table === 'Delivery' || order.table === 'Livraison' || order.customerAddress || order.source !== 'qr') ? (
                      <span className="text-warning text-xs font-bold">Attente Livreur</span>
                    ) : (
                      <span className="text-success text-xs font-bold">Terminé</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modals removed from here as they are now global */}
      </div>
    );
  };

  const renderReservations = () => {
    const q = searchQuery.toLowerCase();
    const filteredReservations = q ? reservations.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q) ||
      (r.phone || '').toLowerCase().includes(q)
    ) : reservations;
    return (
    <div className="dashboard-content">
      <div className="page-header">
        <h2 className="page-title">Reservations Engine</h2>
        <p className="text-tertiary">Real-time bookings, automated email reminders, and customer CRM.</p>
      </div>

      <div className="stats-grid mb-8">
        <div className="stat-card glass-panel" style={{ borderColor: 'var(--accent-primary)' }}>
          <div className="stat-info">
            <span className="stat-title">Upcoming Bookings</span>
            <h3 className="stat-value">{filteredReservations.filter(r => r.status === 'confirmed').length}</h3>
            <span className="stat-trend positive">No overbookings</span>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-info">
            <span className="stat-title">Pending Approvals</span>
            <h3 className="stat-value text-accent">{filteredReservations.filter(r => r.status === 'pending').length}</h3>
            <span className="stat-trend">Action required</span>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-info">
            <span className="stat-title">CRM Database</span>
            <h3 className="stat-value">{filteredReservations.length + orders.length}</h3>
            <span className="stat-trend">Emails & phones collected</span>
          </div>
        </div>
      </div>

      {filteredReservations.length === 0 && searchQuery && (
        <div className="glass-panel mt-4" style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px dashed var(--border-color)' }}>
          <p className="text-tertiary">Aucun résultat pour "{searchQuery}"</p>
        </div>
      )}
      {filteredReservations.length > 0 && (
      <div className="glass-panel mt-4">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Customer</th>
              <th>Contact</th>
              <th>Guests</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredReservations.sort((a,b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()).map(res => (
              <tr key={res.id}>
                <td className="font-semibold">{res.date} at {res.time}</td>
                <td>{res.name}</td>
                <td className="text-tertiary" style={{ fontSize: '0.85rem' }}>{res.email}<br/>{res.phone}</td>
                <td><Users size={14} className="inline mr-1 text-accent"/> {res.guests}</td>
                <td>
                  <span className={`status-badge ${res.status === 'confirmed' ? 'active' : res.status === 'pending' ? 'inactive' : ''}`} style={res.status === 'cancelled' ? { background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' } : {}}>
                    {res.status.charAt(0).toUpperCase() + res.status.slice(1)}
                  </span>
                </td>
                <td>
                  {res.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={async () => {
                        await DataStore.updateReservationStatus(res.id, 'confirmed');
                        const updated = await DataStore.getReservations();
                        setReservations(updated);
                      }}>
                        <CheckCircle size={14} className="mr-1 inline"/> Confirm
                      </button>
                    </div>
                  ) : res.status === 'confirmed' ? (
                    <span className="badge-success" style={{ fontSize: '0.8rem' }}><Mail size={12} className="inline mr-1"/> Reminder Sent</span>
                  ) : (
                    <span className="text-tertiary" style={{ fontSize: '0.8rem' }}>Cancelled</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
    );
  };

  const downloadQR = (buttonEl: HTMLElement, filename: string) => {
    const panel = buttonEl.closest('.glass-panel');
    if (!panel) return;
    const container = panel.querySelector('.qr-preview-container');
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [dismissCheckout, setDismissCheckout] = useState(false);
  const [checkoutTimedOut, setCheckoutTimedOut] = useState(false);

  // If checkout success but subscription hasn't appeared in 30s, show contact-support message
  useEffect(() => {
    if (checkoutSuccess && !isSubActive && !dismissCheckout) {
      const timer = setTimeout(() => setCheckoutTimedOut(true), 30000);
      return () => clearTimeout(timer);
    }
    if (isSubActive) setCheckoutTimedOut(false);
  }, [checkoutSuccess, isSubActive, dismissCheckout]);

  useEffect(() => {
    if (isAuth && authUser && !authUser.subject) return;
    if (isAuth && authUser?.subject && !isSubActive && !checkoutSuccess) {
      navigate('/tarifs');
    }
  }, [isAuth, authUser, isSubActive, navigate, checkoutSuccess]);

  // Redirect hook removed to allow users to view locked tabs with premium overlays
  /*
  useEffect(() => {
    if (activeTab && !allowedTabs.has(activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, allowedTabs]);
  */

  const NAV_ITEMS = [
    { id: 'overview', icon: <LayoutDashboard size={17}/>, label: t('dash_overview') },
    { id: 'analytics', icon: <BarChart3 size={17}/>, label: t('dash_analytics') },
    { id: 'orders', icon: <ShoppingBag size={17}/>, label: t('dash_orders') },
    { id: 'collection', icon: <Smartphone size={17}/>, label: t('dash_collection') },
    { id: 'reservations', icon: <Calendar size={17}/>, label: t('dash_reservations') },
    { id: 'reviews', icon: <MessageSquare size={17}/>, label: t('dash_reviews') },
    { id: 'staff', icon: <Users size={17}/>, label: t('dash_staff') },
    { id: 'drivers', icon: <Truck size={17}/>, label: t('dash_drivers') },
    { id: 'menu', icon: <Utensils size={17}/>, label: t('dash_menu') },
    { id: 'qr', icon: <QrCode size={17}/>, label: t('dash_qr') },
    { id: 'settings', icon: <Settings size={17}/>, label: t('dash_settings') },
  ];

  const navGroups: Record<string, string[]> = {
    '': ['overview'],
    'Opérations': ['analytics', 'orders', 'collection', 'reservations'],
    'Équipe': ['reviews', 'staff', 'drivers'],
    'Contenu': ['menu', 'qr'],
  };

  const getNavGroup = (id: string): string | null => {
    for (const [group, ids] of Object.entries(navGroups)) {
      if (ids.includes(id)) return group || null;
    }
    return null;
  };

  const handleNavClick = (id: string) => { setActiveTab(id); setMobileNavOpen(false); };

  const renderLockedFeaturePlaceholder = (tabId: string) => {
    let requiredPlan = 'Pro';
    let title = '';
    let description = '';
    let benefits: string[] = [];
    let mockupBg = null;

    if (tabId === 'drivers') {
      requiredPlan = 'Ultimate';
      title = t('locked_drivers_title', 'Flotte de Livrateurs & Suivi en Direct');
      description = t('locked_drivers_desc', 'Gérez vos propres livreurs et suivez leurs trajets en temps réel.');
      benefits = [
        t('locked_drivers_benefit_1', 'Géolocalisation en direct et répartition intelligente des commandes'),
        t('locked_drivers_benefit_2', 'Portail mobile optimisé pour les livreurs'),
        t('locked_drivers_benefit_3', 'Preuves de livraison et statistiques de temps de trajet'),
      ];
      mockupBg = (
        <div className="locked-mockup-preview">
          <div className="mock-map">
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', opacity: 0.6 }} />
              <div style={{ width: '80px', height: '12px', borderRadius: '6px', backgroundColor: 'var(--text-tertiary)', opacity: 0.3 }} />
            </div>
          </div>
        </div>
      );
    } else {
      requiredPlan = 'Pro';
      if (tabId === 'analytics') {
        title = t('locked_analytics_title', 'Analyses de Performance en Temps Réel');
        description = t('locked_analytics_desc', 'Prenez des décisions basées sur les données pour maximiser vos revenus.');
        benefits = [
          t('locked_analytics_benefit_1', 'Suivi en direct du chiffre d\'affaires et volumes de commandes'),
          t('locked_analytics_benefit_2', 'Classement des plats les plus populaires et les plus rentables'),
          t('locked_analytics_benefit_3', 'Analyse approfondie des heures d\'affluence et des avis clients'),
        ];
        mockupBg = (
          <div className="locked-mockup-preview">
            <div className="mock-grid">
              <div className="mock-card" />
              <div className="mock-card" />
              <div className="mock-card" />
            </div>
            <div className="mock-chart-container" />
          </div>
        );
      } else if (tabId === 'orders') {
        title = t('locked_orders_title', 'Gestion des Commandes Intelligente');
        description = t('locked_orders_desc', 'Gérez, suivez et traitez les commandes sur place, à emporter ou en livraison.');
        benefits = [
          t('locked_orders_benefit_1', 'Réception des commandes en temps réel avec notifications sonores'),
          t('locked_orders_benefit_2', 'Suivi des statuts de préparation et historique complet'),
          t('locked_orders_benefit_3', 'Statistiques quotidiennes et impression de tickets simplifiée'),
        ];
        mockupBg = (
          <div className="locked-mockup-preview" style={{ gap: '1rem' }}>
            <div className="mock-order-row" />
            <div className="mock-order-row" />
            <div className="mock-order-row" />
            <div className="mock-order-row" />
          </div>
        );
      } else if (tabId === 'reservations') {
        title = t('locked_reservations_title', 'Module de Réservation & Plan de Salle');
        description = t('locked_reservations_desc', 'Optimisez l\'occupation de vos tables et évitez les doublons.');
        benefits = [
          t('locked_reservations_benefit_1', 'Prise de réservation en ligne automatisée via code QR'),
          t('locked_reservations_benefit_2', 'Gestion des statuts de table et de la capacité de la salle'),
          t('locked_reservations_benefit_3', 'Rappels automatiques envoyés aux clients par email/SMS'),
        ];
        mockupBg = (
          <div className="locked-mockup-preview">
            <div className="mock-calendar" />
          </div>
        );
      } else if (tabId === 'staff') {
        title = t('locked_staff_title', 'Gestion d\'Équipe & Performance');
        description = t('locked_staff_desc', 'Coordonnez votre personnel de salle et de cuisine efficacement.');
        benefits = [
          t('locked_staff_benefit_1', 'Comptes d\'accès sécurisés pour vos serveurs et chefs'),
          t('locked_staff_benefit_2', 'Suivi de la satisfaction et avis spécifiques par serveur'),
          t('locked_staff_benefit_3', 'Attribution des tâches et rôles personnalisés'),
        ];
        mockupBg = (
          <div className="locked-mockup-preview">
            <div className="mock-staff-grid">
              <div className="mock-staff-card" />
              <div className="mock-staff-card" />
              <div className="mock-staff-card" />
            </div>
          </div>
        );
      } else if (tabId === 'menu') {
        title = t('locked_menu_title', 'Éditeur de Carte Dynamique & Illimité');
        description = t('locked_menu_desc', 'Mettez à jour vos prix, plats et allergènes en une fraction de seconde.');
        benefits = [
          t('locked_menu_benefit_1', 'Nombre de catégories et de plats illimité'),
          t('locked_menu_benefit_2', 'Mise à jour instantanée sans réimpression des codes QR'),
          t('locked_menu_benefit_3', 'Mise en avant des plats populaires et gestion de la disponibilité'),
        ];
        mockupBg = (
          <div className="locked-mockup-preview">
            <div className="mock-menu-grid">
              <div className="mock-menu-item" />
              <div className="mock-menu-item" />
              <div className="mock-menu-item" />
            </div>
          </div>
        );
      }
    }

    return (
      <div className="locked-feature-container">
        <div className="locked-mockup-bg">
          {mockupBg}
        </div>
        <div className="upgrade-overlay-card">
          <div className="upgrade-card-glow" />
          <div className="upgrade-icon-badge">
            <Crown size={32} color="#ffb800" />
          </div>
          <span className="required-plan-badge">
            Plan {requiredPlan} requis
          </span>
          <h3 className="upgrade-title">{title}</h3>
          <p className="upgrade-description">{description}</p>
          <div className="upgrade-benefits-list">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="upgrade-benefit-item">
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
          <button className="btn-primary upgrade-cta-btn w-full py-4 text-sm font-bold flex items-center justify-center gap-2" onClick={() => navigate('/tarifs')}>
            <Sparkles size={16} /> Débloquer maintenant
          </button>
        </div>
      </div>
    );
  };

  if (authUser === undefined) {
    return (
      <div className="dashboard-loading">
        <div className="btn-spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">

      {/* ── Mobile Burger Overlay ── */}
      <div className={`mobile-nav-overlay ${mobileNavOpen ? 'open' : ''}`} onClick={() => setMobileNavOpen(false)} />

      {/* ── Mobile Slide-In Drawer ── */}
      <div className={`mobile-nav-drawer ${mobileNavOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <div className="sidebar-brand" style={{ margin: 0 }}>
            <div className="brand-logo"><img src="/favicon.svg" className="brand-logo-img" alt="QR CRM" /></div>
            <h2>QR CRM</h2>
          </div>
          <button className="icon-btn-ghost" onClick={() => setMobileNavOpen(false)} aria-label={t('close')} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.4rem' }}>
            <X size={20} />
          </button>
        </div>

        {isSubActive && (subscription || isDemoUltimate) && (
          <div className="sidebar-plan-badge" style={{ margin: '0.5rem 1rem' }}>
            <span className="plan-badge-dot" />
            <span className="plan-badge-label">{isDemoUltimate ? 'Ultimate (Demo)' : (subscription?.planId === 'ultimate' ? 'Ultimate' : subscription?.planId === 'pro' ? 'Pro' : 'Starter')}</span>
            {!isDemoUltimate && subscription?.currentPeriodEnd && (
              <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginLeft: '0.2rem' }}>
                Exp. {new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {!isDemoUltimate && (
              <button className="manage-sub-btn" onClick={handleManageSubscription} style={{ marginLeft: 'auto', fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: 'transparent', border: '1px solid rgba(var(--accent-primary-rgb),0.2)', borderRadius: '6px', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <CreditCard size={10} />
              </button>
            )}
          </div>
        )}
        
        <div className="mobile-drawer-body">
          <nav className="mobile-nav-list">
            {NAV_ITEMS.map((item, idx) => {
              const isLocked = !allowedTabs.has(item.id);
              const group = getNavGroup(item.id);
              const prevItem = idx > 0 ? NAV_ITEMS[idx - 1] : null;
              const prevGroup = prevItem ? getNavGroup(prevItem.id) : null;
              const showLabel = group && group !== prevGroup;
              return (
                <span key={item.id}>
                  {showLabel && <div className="nav-group-label">{group}</div>}
                  <button
                    className={`nav-item ${activeTab === item.id ? 'active' : ''} ${isLocked ? 'locked-nav-item' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    data-tip={item.label}>
                    {item.icon}
                    <span>{item.label}</span>
                    {isLocked && <Lock size={13} className="lock-icon" />}
                  </button>
                </span>
              );
            })}
          </nav>
        </div>

        <div className="mobile-drawer-footer">
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => handleNavClick('settings')} data-tip={t('dash_settings')}>
            <Settings size={17} /><span>{t('dash_settings')}</span>
          </button>
          <div className="sidebar-lang">
            <LanguageSwitcher variant="minimal" />
          </div>
          <button className="nav-item" onClick={() => {
            const prompt = (window as any).deferredPrompt;
            if (prompt) {
              prompt.prompt();
              (window as any).deferredPrompt = null;
            } else {
              alert(t('pwa_install_info', 'To install this app, please use your browser menu (e.g. "Add to Home Screen" or the Install icon in the address bar).'));
            }
          }}>
            <Smartphone size={17} /><span>Installer App</span>
          </button>
          <button className="nav-item text-error" onClick={handleLogout}>
            <ExternalLink size={17} /><span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside className="dashboard-sidebar glass-panel">
          <div className="sidebar-brand">
            <div className="brand-logo"><img src="/favicon.svg" className="brand-logo-img" alt="QR CRM" /></div>
            <h2>QR CRM</h2>
          </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item, idx) => {
            const isLocked = !allowedTabs.has(item.id);
            const group = getNavGroup(item.id);
            const prevItem = idx > 0 ? NAV_ITEMS[idx - 1] : null;
            const prevGroup = prevItem ? getNavGroup(prevItem.id) : null;
            const showLabel = group && group !== prevGroup;
            const isPrimary = PRIMARY_NAV_IDS.has(item.id);
            return (
              <span key={item.id}>
                {showLabel && <div className="nav-group-label">{group}</div>}
                <button
                  className={`nav-item ${activeTab === item.id ? 'active' : ''} ${isLocked ? 'locked-nav-item' : ''} ${isPrimary ? 'nav-item--primary' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                  data-tip={item.label}>
                  {item.icon}
                  <span>{item.label}</span>
                  {isLocked && <Lock size={13} className="lock-icon" />}
                </button>
              </span>
            );
          })}
          {/* "More" button — hidden on desktop, appears in bottom bar on phone */}
          <button className="nav-item mobile-more-btn mobile-only" onClick={() => setMoreSheetOpen(true)} data-tip="Plus">
            <MoreHorizontal size={17} />
            <span>Plus</span>
          </button>
        </nav>

        <div className="sidebar-lang">
          <LanguageSwitcher />
        </div>

        <div className="sidebar-footer">
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} data-tip={t('dash_settings')}>
            <Settings size={17} /><span>{t('dash_settings')}</span>
          </button>
          <button className="nav-item" onClick={() => {
            const prompt = (window as any).deferredPrompt;
            if (prompt) {
              prompt.prompt();
              (window as any).deferredPrompt = null;
            } else {
              alert(t('pwa_install_info', 'To install this app, please use your browser menu (e.g. "Add to Home Screen" or the Install icon in the address bar).'));
            }
          }}>
            <Smartphone size={17} /><span>Installer App</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile "More" Bottom Sheet ── */}
      <div className={`bottom-sheet-overlay ${moreSheetOpen ? 'open' : ''}`} onClick={() => setMoreSheetOpen(false)} />
      <div className={`bottom-sheet ${moreSheetOpen ? 'open' : ''}`}>
        <div className="bottom-sheet-handle" />
        <div className="bottom-sheet-header">
          <h3>Navigation</h3>
          <button className="icon-btn-ghost" onClick={() => setMoreSheetOpen(false)} aria-label="Fermer" style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.4rem' }}>
            <X size={20} />
          </button>
        </div>
        <div className="bottom-sheet-body">
          {NAV_ITEMS.map((item, idx) => {
            const isLocked = !allowedTabs.has(item.id);
            const group = getNavGroup(item.id);
            const prevItem = idx > 0 ? NAV_ITEMS[idx - 1] : null;
            const prevGroup = prevItem ? getNavGroup(prevItem.id) : null;
            const showLabel = group && group !== prevGroup;
            return (
              <span key={item.id}>
                {showLabel && <div className="nav-group-label">{group}</div>}
                <button
                  className={`nav-item ${activeTab === item.id ? 'active' : ''} ${isLocked ? 'locked-nav-item' : ''}`}
                  onClick={() => { setActiveTab(item.id); setMoreSheetOpen(false); }}>
                  {item.icon}
                  <span>{item.label}</span>
                  {isLocked && <Lock size={13} className="lock-icon" />}
                </button>
              </span>
            );
          })}
        </div>
        <div className="bottom-sheet-footer">
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setMoreSheetOpen(false); }}>
            <Settings size={17} /><span>{t('dash_settings')}</span>
          </button>
          <button className="nav-item" onClick={() => {
            setMoreSheetOpen(false);
            const prompt = (window as any).deferredPrompt;
            if (prompt) {
              prompt.prompt();
              (window as any).deferredPrompt = null;
            } else {
              alert(t('pwa_install_info', 'To install this app, please use your browser menu (e.g. "Add to Home Screen" or the Install icon in the address bar).'));
            }
          }}>
            <Smartphone size={17} /><span>Installer App</span>
          </button>
          <button className="nav-item text-error" onClick={() => { setMoreSheetOpen(false); handleLogout(); }}>
            <ExternalLink size={17} /><span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Expiring Soon Banner */}
      {isSubActive && !isDemoUltimate && subscription?.currentPeriodEnd && (
        (() => {
          const daysLeft = Math.ceil((subscription.currentPeriodEnd - Date.now()) / 86400000);
          if (daysLeft <= 0) {
            return (
              <div className="glass-panel" style={{ margin: '0 1.5rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 500 }}>⚠ Votre abonnement a expiré. Renouvelez-le pour continuer à utiliser toutes les fonctionnalités.</span>
                <button className="manage-sub-btn" onClick={handleManageSubscription} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', background: 'var(--accent)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>Renouveler</button>
              </div>
            );
          }
          if (daysLeft <= 7) {
            return (
              <div className="glass-panel" style={{ margin: '0 1.5rem', padding: '0.75rem 1rem', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--warning)', fontSize: '0.85rem', fontWeight: 500 }}>⚠ Votre abonnement expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}. Gérez votre abonnement pour éviter toute interruption.</span>
                <button className="manage-sub-btn" onClick={handleManageSubscription} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', background: 'var(--accent)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>Gérer</button>
              </div>
            );
          }
          return null;
        })()
      )}

      {/* Checkout success banner — pending */}
      {checkoutSuccess && !dismissCheckout && !isSubActive && !checkoutTimedOut && (
        <div className="glass-panel" style={{ margin: '0 1.5rem', padding: '1rem 1.25rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#22c55e', fontSize: '0.95rem', display: 'block' }}>Paiement confirmé !</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Merci pour votre abonnement. L'activation de votre compte est en cours...</span>
          </div>
          <div className="spinner" style={{ width: 20, height: 20, border: '2px solid rgba(34,197,94,0.3)', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
        </div>
      )}

      {/* Checkout success banner — timed out */}
      {checkoutSuccess && !dismissCheckout && !isSubActive && checkoutTimedOut && (
        <div className="glass-panel" style={{ margin: '0 1.5rem', padding: '1rem 1.25rem', background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.35)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(234,179,8,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '1.1rem' }}>⏳</span>
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ color: 'var(--warning)', fontSize: '0.95rem', display: 'block' }}>Activation en attente</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Votre paiement a bien été reçu mais l'activation prend plus de temps que prévu. Si le problème persiste, contactez le support.</span>
          </div>
          <button onClick={() => setDismissCheckout(true)} style={{ background: 'rgba(234,179,8,0.2)', border: 'none', borderRadius: '8px', padding: '0.4rem 0.75rem', color: 'var(--warning)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0 }}>
            OK
          </button>
        </div>
      )}

      {/* Success banner after subscription activates */}
      {checkoutSuccess && !dismissCheckout && isSubActive && (
        <div className="glass-panel" style={{ margin: '0 1.5rem', padding: '1rem 1.25rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#22c55e', fontSize: '0.95rem', display: 'block' }}>Abonnement activé !</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Votre abonnement {subscription?.planId === 'ultimate' ? 'Ultimate' : subscription?.planId === 'pro' ? 'Pro' : 'Starter'} est maintenant actif. Profitez de toutes les fonctionnalités !</span>
          </div>
          <button onClick={() => setDismissCheckout(true)} style={{ background: 'rgba(34,197,94,0.2)', border: 'none', borderRadius: '8px', padding: '0.4rem 0.75rem', color: '#22c55e', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0 }}>
            OK
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Navbar */}
        <header className="dashboard-header glass-panel">
          {/* Burger button — mobile only */}
          <button className="burger-btn mobile-only" onClick={() => setMobileNavOpen(true)} aria-label="Menu">
            <span className="burger-line" />
            <span className="burger-line" />
            <span className="burger-line" />
          </button>
          <div className="search-bar">
            <Search size={18} className="text-tertiary" />
            <input type="text" placeholder={t('dash_search')} aria-label={t('dash_search')}
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          
          <div className="header-actions">

            {/* Subscription Badge */}
            {isSubActive && (subscription || isDemoUltimate) && (
              <div className="header-plan-badge">
                <span className="plan-badge-dot" />
                <span className="header-plan-label">{isDemoUltimate ? 'Ultimate (Demo)' : (subscription?.planId === 'ultimate' ? 'Ultimate' : subscription?.planId === 'pro' ? 'Pro' : 'Starter')}</span>
                {!isDemoUltimate && subscription?.currentPeriodEnd && (
                  <span className="header-plan-expiry">
                    Exp. {new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                {!isDemoUltimate && (
                  <button className="header-manage-sub-btn" onClick={handleManageSubscription} title="Gérer l'abonnement">
                    <CreditCard size={12} />
                  </button>
                )}
              </div>
            )}

            {/* User Profile */}
            <div className="user-profile" onClick={() => setActiveTab('settings')} title={authUser?.email || ''}>
              <div className="avatar">
                {profile.name && profile.name !== 'Chargement...' ? profile.name.charAt(0).toUpperCase() : <User size={16} />}
              </div>
              <div className="user-info desktop-only">
                <span className="user-name">{profile.name && profile.name !== 'Chargement...' ? profile.name : (authUser?.name || 'Compte')}</span>
                <span className="user-role">Gérant</span>
              </div>
            </div>

            {/* Notifications */}
            <div className="notification-wrapper" style={{ position: 'relative' }}>
              <button 
                className="icon-btn-ghost" 
                style={{ position: 'relative' }}
                onClick={async () => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) {
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                  }
                  if (pushStatus === 'off') {
                    const ok = await PushService.requestPermission(convex);
                    setPushStatus(ok ? 'on' : 'blocked');
                  }
                }}
              >
                <Bell size={20} />
                {notifications.some(n => !n.read) && <span className="notification-dot"></span>}
              </button>
              
                  {showNotifications && (
                <div className="notification-dropdown glass-panel">
                  <div className="notification-header">
                    <h3>Notifications</h3>
                    <button className="text-xs text-accent" onClick={() => setNotifications([])}>Effacer tout</button>
                  </div>
                  {pushStatus !== 'on' && (
                    <div className="p-4 text-center border-b border-[var(--border-color)]">
                      <p className="text-tertiary text-sm mb-2">
                        {pushStatus === 'blocked'
                          ? 'Notifications bloquées. Activez-les dans les paramètres du navigateur.'
                          : 'Activez les notifications pour être alerté des nouvelles commandes et avis.'}
                      </p>
                      {pushStatus === 'off' && (
                        <button className="btn-primary btn-sm" onClick={async (e) => { e.stopPropagation(); const ok = await PushService.requestPermission(convex); setPushStatus(ok ? 'on' : 'blocked'); }}>
                          Activer les notifications
                        </button>
                      )}
                    </div>
                  )}
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-tertiary">Aucune nouvelle notification</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="notification-item">
                          <div className={`notif-icon ${n.type}`}>
                            {n.type === 'order' ? <ShoppingBag size={14}/> : <MessageSquare size={14}/>}
                          </div>
                          <div className="notif-content">
                            <p>{n.text}</p>
                            <span>{n.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Dynamic View */}
        <div className="dashboard-scroll-area">
          {!allowedTabs.has(activeTab) ? (
            renderLockedFeaturePlaceholder(activeTab)
          ) : (
            <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'analytics' && renderAnalytics()}
          {activeTab === 'orders' && renderOrders()}
          {activeTab === 'collection' && renderCollectionPoint()}
          {activeTab === 'reservations' && renderReservations()}
          {activeTab === 'reviews' && renderReviews()}
          {activeTab === 'staff' && renderStaff()}
          {activeTab === 'drivers' && renderDrivers()}
          {activeTab === 'menu' && renderMenuEditor()}
          {activeTab === 'qr' && (
            <div className="dashboard-content">
              <div className="page-header">
                <h2 className="page-title">{t('dash_qr')}</h2>
                <p className="text-tertiary">{t('qr_desc', 'Gérez et téléchargez tous les codes QR de votre établissement.')}</p>
              </div>

              <div className="qr-grid mt-8">
                {/* Core QR Codes */}
                {planId !== 'starter' && (
                <div className="glass-panel p-8 text-center qr-premium-card">
                  <div className="qr-preview-container" style={{ minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QRCodeSVG 
                      value={`${window.location.origin}/menu/${profile?.id || 'demo'}`}
                      size={180}
                      level="H"
                      includeMargin={true}
                      fgColor="#000000"
                      bgColor="#FFFFFF"
                      style={{ width: 180, height: 180 }}
                    />
                  </div>
                  <h3 className="text-xl font-bold mb-2">QR Menu</h3>
                  <p className="text-tertiary text-sm mb-6">{t('qr_menu_desc', 'Lien direct vers votre carte digitale.')}</p>
                  <div className="flex gap-2 w-full">
                    <button className="btn-primary flex-1" onClick={() => window.open(`${window.location.origin}/menu/${profile?.id || 'demo'}`, '_blank')}>
                      {t('staff_test_link')}
                    </button>
                    <button className="btn-secondary qr-dl-btn" onClick={(e) => downloadQR(e.currentTarget, 'qr-menu')} title="Télécharger QR Menu">
                      <Download size={15} />
                    </button>
                  </div>
                </div>
                )}

                {planId !== 'starter' && (
                <div className="glass-panel p-8 text-center qr-premium-card">
                  <div className="qr-preview-container" style={{ minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QRCodeSVG 
                      value={`${window.location.origin}/book/${profile?.id || 'demo'}`}
                      size={180}
                      level="H"
                      includeMargin={true}
                      fgColor="#000000"
                      bgColor="#FFFFFF"
                      style={{ width: 180, height: 180 }}
                    />
                  </div>
                  <h3 className="text-xl font-bold mb-2">QR Réservation</h3>
                  <p className="text-tertiary text-sm mb-6">{t('qr_book_desc', 'Permettez à vos clients de réserver une table.')}</p>
                  <div className="flex gap-2 w-full">
                    <button className="btn-primary flex-1" onClick={() => window.open(`${window.location.origin}/book/${profile?.id || 'demo'}`, '_blank')}>
                      {t('staff_test_link')}
                    </button>
                    <button className="btn-secondary qr-dl-btn" onClick={(e) => downloadQR(e.currentTarget, 'qr-reservation')} title="Télécharger QR Réservation">
                      <Download size={15} />
                    </button>
                  </div>
                </div>
                )}

                <div className="glass-panel p-8 text-center qr-premium-card">
                  <div className="qr-preview-container" style={{ minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QRCodeSVG 
                      value={`${window.location.origin}/review/${profile?.id || 'demo'}`}
                      size={180}
                      level="H"
                      includeMargin={true}
                      fgColor="#000000"
                      bgColor="#FFFFFF"
                      style={{ width: 180, height: 180 }}
                    />
                  </div>
                  <h3 className="text-xl font-bold mb-2">QR Avis</h3>
                  <p className="text-tertiary text-sm mb-6">{t('qr_review_desc', 'Récoltez des avis clients sur votre établissement.')}</p>
                  <div className="flex gap-2 w-full">
                    <button className="btn-primary flex-1" onClick={() => window.open(`${window.location.origin}/review/${profile?.id || 'demo'}`, '_blank')}>
                      {t('staff_test_link')}
                    </button>
                    <button className="btn-secondary qr-dl-btn" onClick={(e) => downloadQR(e.currentTarget, 'qr-avis')} title="Télécharger QR Avis">
                      <Download size={15} />
                    </button>
                  </div>
                </div>

                {planId !== 'starter' && (
                <div className="glass-panel p-8 text-center qr-premium-card">
                  <div className="qr-preview-container" style={{ minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QRCodeSVG 
                      value={`${window.location.origin}/chef/${profile?.id || 'demo'}`}
                      size={180}
                      level="H"
                      includeMargin={true}
                      fgColor="#000000"
                      bgColor="#FFFFFF"
                      style={{ width: 180, height: 180 }}
                    />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t('qr_chef_title', 'QR Cuisine')}</h3>
                  <p className="text-tertiary text-sm mb-6">{t('qr_chef_desc', 'Accès direct au tableau de bord pour le Chef.')}</p>
                  <div className="flex gap-2 w-full">
                    <button className="btn-primary flex-1" onClick={() => window.open(`${window.location.origin}/chef/${profile?.id || 'demo'}`, '_blank')}>
                      {t('staff_test_link')}
                    </button>
                    <button className="btn-secondary qr-dl-btn" onClick={(e) => downloadQR(e.currentTarget, 'qr-cuisine')} title="Télécharger QR Cuisine">
                      <Download size={15} />
                    </button>
                  </div>
                </div>
                )}
              </div>

              {/* Personnel QR Codes */}
              {planId !== 'starter' && staffList.length > 0 && (
                <div className="mt-16">
                  <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                      <Users size={20} />
                    </div>
                    Personnel
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {staffList.map((staff) => {
                      const reviewUrl = `${window.location.origin}/staff-review/${profile?.id || 'demo'}/${staff.id}`;
                      return (
                        <div key={staff.id} className="glass-panel p-6 text-center qr-premium-card">
                          <div className="qr-preview-container mb-4" style={{ padding: '1rem' }}>
                            <QRCodeSVG 
                              value={reviewUrl}
                              size={120}
                              level="H"
                              includeMargin={true}
                              fgColor="#000000"
                              bgColor="#FFFFFF"
                              style={{ width: 120, height: 120 }}
                            />
                          </div>
                          <h4 className="font-bold text-sm mb-1">{staff.name}</h4>
                          <p className="text-tertiary text-[10px] mb-4 truncate">{staff.role}</p>
                          <div className="flex gap-2 w-full">
                            <button className="btn-secondary flex-1 py-2 text-xs" onClick={() => window.open(reviewUrl, '_blank')}>
                              {t('staff_test_link')}
                            </button>
                            <button className="btn-secondary qr-dl-btn" onClick={(e) => downloadQR(e.currentTarget, `qr-staff-${staff.name.replace(/\s+/g, '-').toLowerCase()}`)} title={t('staff_download')}>
                              <Download size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Drivers QR Codes */}
              {planId !== 'starter' && drivers.length > 0 && (
                <div className="mt-16 mb-16">
                  <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                      <ShoppingBag size={20} />
                    </div>
                    Livreurs
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {drivers.map((driver) => {
                      const driverUrl = `${window.location.origin}/driver/${profile?.id || 'demo'}/${driver.id}`;
                      return (
                        <div key={driver.id} className="glass-panel p-6 text-center qr-premium-card">
                          <div className="qr-preview-container mb-4" style={{ padding: '1rem', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <QRCodeSVG 
                              value={driverUrl}
                              size={120}
                              level="H"
                              includeMargin={true}
                              fgColor="#000000"
                              bgColor="#FFFFFF"
                              style={{ width: 120, height: 120 }}
                            />
                          </div>
                          <h4 className="font-bold text-sm mb-1">{driver.name}</h4>
                          <p className="text-tertiary text-[10px] mb-4 truncate">{driver.phone}</p>
                          <div className="flex gap-2 w-full">
                            <button className="btn-primary flex-1 py-2 text-xs font-bold" onClick={() => window.open(driverUrl, '_blank')}>
                              Ouvrir Portail Livreur
                            </button>
                            <button className="btn-secondary qr-dl-btn" onClick={(e) => downloadQR(e.currentTarget, `qr-driver-${driver.name.replace(/\s+/g, '-').toLowerCase()}`)} title="Télécharger QR Livreur">
                              <Download size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="dashboard-content">
              <div className="page-header">
                <h2 className="page-title">{t('settings_title')}</h2>
                <div className="flex items-center gap-3">
                  {isSavingSettings && <span className="text-xs text-accent animate-pulse font-bold flex items-center gap-2"><Clock size={12}/> Sauvegarde automatique...</span>}
                </div>
              </div>

              <div className="settings-layout mt-8">
                {saveError && (
                  <div className="error-message mb-6">
                    <ShieldAlert size={20} />
                    <span>{saveError}</span>
                  </div>
                )}
                <div className="glass-panel p-8">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Utensils size={20} className="text-accent"/> {t('settings_profile')}</h3>
                  <div className="premium-input-group">
                    <label>{t('settings_name')}</label>
                    <div className="premium-input-wrapper">
                      <ImageIcon className="input-icon" size={18} />
                      <input type="text" value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} className="premium-input" />
                    </div>
                  </div>
                  <div className="premium-input-group">
                    <label>{t('settings_desc')}</label>
                    <div className="premium-input-wrapper">
                      <FileText className="input-icon" size={18} style={{ top: '12px' }} />
                      <textarea value={settingsForm.description} onChange={e => setSettingsForm({...settingsForm, description: e.target.value})} className="premium-input" rows={3} style={{ paddingLeft: '2.75rem' }} />
                    </div>
                  </div>
                  <div className="premium-input-group">
                    <label>{t('settings_google', 'Google Review')}</label>
                    <p className="google-search-hint">
                      Entrez le nom exact de votre restaurant tel qu'il apparaît sur Google&nbsp;Maps, ainsi que sa ville et son pays.
                      Les avis clients seront redirigés directement vers votre fiche Google&nbsp;Maps.
                    </p>
                    <div className="google-search-row">
                      <input type="text" value={googleSearchName} onChange={e => setGoogleSearchName(e.target.value)} className="premium-input" placeholder="Nom du restaurant" style={{ flex: 1 }} />
                      <input type="text" value={googleSearchCity} onChange={e => setGoogleSearchCity(e.target.value)} className="premium-input" placeholder="Ville" style={{ flex: 0.6 }} />
                      <input type="text" value={googleSearchCountry} onChange={e => setGoogleSearchCountry(e.target.value)} className="premium-input" placeholder="Pays" style={{ flex: 0.5 }} />
                      <button
                        className="google-search-btn"
                        onClick={async () => {
                          if (!googleSearchName || !googleSearchCity) return;
                          setGoogleSearchLoading(true);
                          setGoogleSearchError(null);
                          try {
                            const query = googleSearchCountry ? `${googleSearchName} ${googleSearchCity} ${googleSearchCountry}` : `${googleSearchName} ${googleSearchCity}`;
                            const res = await fetch('/.netlify/functions/get-place-id', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ restaurantName: query }),
                            });
                            const data = await res.json();
                            if (!res.ok) { setGoogleSearchError(data.error); return; }
                            setSettingsForm({ ...settingsForm, googleReviewUrl: `https://search.google.com/local/writereview?placeid=${data.placeId}` });
                          } catch { setGoogleSearchError('Erreur réseau'); }
                          finally { setGoogleSearchLoading(false); }
                        }}
                        disabled={googleSearchLoading || !googleSearchName || !googleSearchCity}
                      >
                        {googleSearchLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        Chercher
                      </button>
                    </div>
                    {googleSearchError && <p className="google-search-error">{googleSearchError}</p>}
                    {settingsForm.googleReviewUrl && (
                      <div className="google-result-row">
                        <LinkIcon size={14} />
                        <span className="google-result-url">{settingsForm.googleReviewUrl}</span>
                        <button className="google-clear-btn" onClick={() => setSettingsForm({...settingsForm, googleReviewUrl: ''})}><X size={14} /></button>
                      </div>
                    )}
                  </div>
                  <div className="premium-input-group">
                    <label>{t('settings_hours')}</label>
                    <div className="premium-input-wrapper">
                      <Clock className="input-icon" size={18} />
                      <input type="text" value={settingsForm.openingHours || ''} onChange={e => setSettingsForm({...settingsForm, openingHours: e.target.value})} className="premium-input" placeholder="Lun-Dim: 12:00 - 23:00" />
                    </div>
                  </div>
                  <div className="premium-input-group">
                    <label>{t('settings_about')}</label>
                    <div className="premium-input-wrapper">
                      <FileText className="input-icon" size={18} style={{ top: '12px' }} />
                      <textarea value={settingsForm.aboutInfo || ''} onChange={e => setSettingsForm({...settingsForm, aboutInfo: e.target.value})} className="premium-input" rows={3} style={{ paddingLeft: '2.75rem' }} placeholder="Description détaillée..." />
                    </div>
                  </div>

                </div>

                <div className="glass-panel p-8">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Sparkles size={20} className="text-accent"/> {t('settings_branding')}</h3>
                  <div className="branding-edit flex gap-8">
                    <div className="logo-edit">
                      <label className="block mb-2 text-sm text-tertiary">{t('settings_logo')}</label>
                      <div className="flex items-end gap-3">
                        <label className="relative group cursor-pointer inline-block">
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }}
                            onChange={(e) => handleImageUpload(e, (url) => setSettingsForm({...settingsForm, logo: url}))}
                          />
                          <img src={settingsForm.logo} className="w-24 h-24 rounded-full border-4 border-accent object-cover shadow-xl" alt="Logo" />
                          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-bold">{t('settings_change')}</span>
                          </div>
                        </label>
                        {settingsForm.logo && (
                          <button type="button" onClick={() => setSettingsForm({...settingsForm, logo: ''})} className="btn-icon text-red-400 hover:text-red-300 transition-colors mb-1" title={t('image_delete')}>
                            <X size={18} />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-tertiary mt-2">{t('click_to_change')}</p>
                    </div>
                    <div className="cover-edit flex-1">
                      <label className="block mb-2 text-sm text-tertiary">{t('settings_cover')}</label>
                      <div className="relative">
                        <label className="relative group cursor-pointer block">
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }}
                            onChange={(e) => handleImageUpload(e, (url) => setSettingsForm({...settingsForm, coverImage: url}), 'cover')}
                          />
                          <img src={settingsForm.coverImage} className="w-full h-24 rounded-xl object-cover border border-border shadow-lg mb-2" alt="Cover" />
                          <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-bold">{t('settings_change')}</span>
                          </div>
                        </label>
                        {settingsForm.coverImage && (
                          <button type="button" onClick={() => setSettingsForm({...settingsForm, coverImage: ''})} className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-red-400 rounded-full p-1.5 transition-colors z-10" title={t('image_delete')}>
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-tertiary">{t('recommended_size')} • {t('click_to_change')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </main>

      {/* Edit Dish Modal */}
      {isEditingDish && editingDish && (
        <div className="modal-overlay">
          <div className="glass-modal">
            <button onClick={() => setIsEditingDish(false)} className="close-modal-btn" aria-label={t('close')}>
              <X size={20}/>
            </button>
            <h2 className="text-3xl font-black mb-8 text-gradient">Modifier {editingDish.name}</h2>
            
            <div className="premium-input-group">
              <label>{t('menu_dish_name')}</label>
              <div className="premium-input-wrapper">
                <Tag className="input-icon" size={18} />
                <input type="text" value={editingDish.name} onChange={e => setEditingDish({...editingDish, name: e.target.value})} className="premium-input" />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="premium-input-group flex-1">
                <label>{t('menu_category')}</label>
                <select value={editingDish.category} onChange={e => setEditingDish({...editingDish, category: e.target.value})} className="premium-select">
                  <option value="Entrées">{t('cat_entrees')}</option>
                  <option value="Plats">{t('cat_plats')}</option>
                  <option value="Desserts">{t('cat_desserts')}</option>
                  <option value="Boissons">{t('cat_boissons')}</option>
                </select>
              </div>
              <div className="premium-input-group flex-1">
                <label>{t('menu_price')} (DH)</label>
                <div className="premium-input-wrapper">
                  <span className="input-icon font-bold text-xs">DH</span>
                  <input type="number" value={editingDish.price} onChange={e => setEditingDish({...editingDish, price: parseFloat(e.target.value)})} className="premium-input" />
                </div>
              </div>
            </div>

            <div className="premium-input-group mb-10">
              <label>{t('menu_image')}</label>
              <div className="flex gap-4 items-center">
                <label className="flex-1 cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }}
                    onChange={(e) => handleImageUpload(e, (url) => setEditingDish({...editingDish, image: url}))}
                  />
                  <div className="premium-input-wrapper group">
                    <ImageIcon className="input-icon group-hover:text-accent transition-colors" size={18} />
                    <div className="premium-input flex items-center text-tertiary">
                      {editingDish.image ? t('image_selected') : t('choose_photo')}
                    </div>
                  </div>
                </label>
                {editingDish.image && (
                  <>
                    <img src={editingDish.image} className="w-24 h-24 rounded-lg object-cover border border-accent shadow-lg" alt="Preview" />
                    <button type="button" onClick={() => setEditingDish({...editingDish, image: ''})} className="btn-icon text-red-400 hover:text-red-300 transition-colors" title={t('image_delete')}>
                      <X size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsEditingDish(false)}>{t('staff_cancel')}</button>
              <button className="btn-primary" onClick={async () => {
                if(!editingDish.name || !editingDish.price) return alert(t('error_name_price'));
                setIsAddingDishLoading(true); // Using the same loading state for simplicity or I could add isEditingDishLoading
                try {
                  await DataStore.updateMenuItem(editingDish.id, editingDish);
                  setIsEditingDish(false);
                } catch (error) {
                  console.error("Error updating dish:", error);
                  alert("Erreur lors de la mise à jour du plat.");
                } finally {
                  setIsAddingDishLoading(false);
                }
              }} disabled={isAddingDishLoading}>
                {isAddingDishLoading ? "Mise à jour..." : t('menu_save')}
              </button>
            </div>
          </div>
        </div>
      )}
      {isAddingDish && (
        <div className="modal-overlay">
          <div className="glass-modal">
            <button onClick={() => setIsAddingDish(false)} className="close-modal-btn" aria-label={t('close')}>
              <X size={20}/>
            </button>
            <h2 className="text-3xl font-black mb-8 text-gradient">{t('menu_add_plat')}</h2>
            
            <div className="premium-input-group">
              <label>{t('menu_dish_name')}</label>
              <div className="premium-input-wrapper">
                <Tag className="input-icon" size={18} />
                <input type="text" placeholder="ex: Couscous Royal" value={newDish.name} onChange={e => setNewDish({...newDish, name: e.target.value})} className="premium-input" />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="premium-input-group flex-1">
                <label>{t('menu_category')}</label>
                <select value={newDish.category} onChange={e => setNewDish({...newDish, category: e.target.value})} className="premium-select">
                  <option value="Entrées">{t('cat_entrees')}</option>
                  <option value="Plats">{t('cat_plats')}</option>
                  <option value="Desserts">{t('cat_desserts')}</option>
                  <option value="Boissons">{t('cat_boissons')}</option>
                </select>
              </div>
              <div className="premium-input-group flex-1">
                <label>{t('menu_price')} (DH)</label>
                <div className="premium-input-wrapper">
                  <span className="input-icon font-bold text-xs">DH</span>
                  <input type="number" placeholder="85.00" value={newDish.price || ''} onChange={e => setNewDish({...newDish, price: parseFloat(e.target.value)})} className="premium-input" />
                </div>
              </div>
            </div>

            <div className="premium-input-group">
              <label>{t('menu_description', 'Description')}</label>
              <div className="premium-input-wrapper">
                <FileText className="input-icon" size={18} />
                <textarea 
                  placeholder="ex: Ingrédients, préparation..." 
                  value={newDish.description} 
                  onChange={e => setNewDish({...newDish, description: e.target.value})} 
                  className="premium-input"
                  style={{ minHeight: '80px', paddingTop: '0.75rem' }}
                />
              </div>
            </div>

            <div className="premium-input-group mb-10">
              <label>{t('menu_image')}</label>
              <div className="flex gap-4 items-center">
                <label className="flex-1 cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }}
                    onChange={(e) => handleImageUpload(e, (url) => setNewDish({...newDish, image: url}))}
                  />
                  <div className="premium-input-wrapper group">
                    <ImageIcon className="input-icon group-hover:text-accent transition-colors" size={18} />
                    <div className="premium-input flex items-center text-tertiary">
                      {newDish.image ? t('image_selected') : t('choose_photo')}
                    </div>
                  </div>
                </label>
                {newDish.image && (
                  <>
                    <img src={newDish.image} className="w-24 h-24 rounded-lg object-cover border border-accent shadow-lg" alt="Preview" />
                    <button type="button" onClick={() => setNewDish({...newDish, image: ''})} className="btn-icon text-red-400 hover:text-red-300 transition-colors" title={t('image_delete')}>
                      <X size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsAddingDish(false)}>{t('staff_cancel')}</button>
              <button className="btn-primary" onClick={async () => {
                if(!newDish.name || !newDish.price) return alert(t('error_name_price'));
                setIsAddingDishLoading(true);
                try {
                  await DataStore.addMenuItem(newDish);
                  setIsAddingDish(false);
                  setNewDish({ name: '', category: 'Plats', description: '', price: 0, image: '', available: true, popular: false });
                } catch (error) {
                  console.error("Error adding dish:", error);
                  alert("Erreur lors de l'ajout du plat. Veuillez réessayer.");
                } finally {
                  setIsAddingDishLoading(false);
                }
              }} disabled={isAddingDishLoading}>
                {isAddingDishLoading ? "Ajout en cours..." : t('menu_save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Driver Modals */}
      {addingDriver && (
        <div className="modal-overlay" onClick={() => setAddingDriver(false)}>
          <div className="glass-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setAddingDriver(false)} aria-label={t('close')}><X size={18} /></button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>{t('driver_new')}</h3>
            <div className="premium-input-group">
              <label>{t('driver_name_label')}</label>
              <div className="premium-input-wrapper">
                <Users size={16} className="input-icon" />
                <input className="premium-input" placeholder="Ex: Karim Delivery" value={newDriverName} onChange={e => setNewDriverName(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="premium-input-group">
              <label>{t('driver_phone_label')}</label>
              <div className="premium-input-wrapper">
                <Phone size={16} className="input-icon" />
                <input className="premium-input" placeholder={t('driver_phone_placeholder')} value={newDriverPhone} onChange={e => setNewDriverPhone(e.target.value)} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setAddingDriver(false)}>{t('driver_cancel')}</button>
              <button className="btn-primary" onClick={handleAddDriver} disabled={isAddingDriverLoading} style={{ border: 'none', cursor: isAddingDriverLoading ? 'not-allowed' : 'pointer', background: 'var(--accent-gradient)', color: 'white', fontWeight: 700, opacity: isAddingDriverLoading ? 0.7 : 1 }}>
                {isAddingDriverLoading ? "Ajout en cours..." : t('driver_add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {qrDriverId && (() => {
        const driver = drivers.find(d => d.id === qrDriverId);
        if (!driver) return null;
        const driverUrl = `${window.location.origin}/driver/${profile?.id || 'demo'}/${driver.id}`;
        return (
          <div className="modal-overlay" onClick={() => setQrDriverId(null)}>
            <div className="glass-modal" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <button className="close-modal-btn" onClick={() => setQrDriverId(null)} aria-label={t('close')}><X size={18} /></button>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#00ccbc,#11998e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.1rem', margin: '0 auto 1rem' }}>
                {driver.name[0]}
              </div>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem' }}>Portail Livreur — {driver.name}</h3>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{driver.phone}</p>
              <div style={{ background: 'white', padding: '1.25rem', borderRadius: '16px', display: 'inline-block', border: '1px solid var(--border-color)' }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(driverUrl)}`} alt="QR" style={{ width: 180, height: 180 }} />
              </div>
              <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
                <button className="btn-primary" style={{ cursor: 'pointer', border: 'none', background: 'var(--accent-gradient)', color: 'white', fontWeight: 700, width: '100%' }}
                  onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(driverUrl)}`, '_blank')}>
                  {t('staff_download')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
