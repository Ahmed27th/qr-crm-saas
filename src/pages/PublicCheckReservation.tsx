import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Search, Users, Phone, Clock, CalendarDays, ArrowLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { DataStore } from '../dataStore';
import type { RestaurantProfile } from '../dataStore';
import './PublicCheckReservation.css';

const statusConfig: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  confirmed: { icon: CheckCircle2, className: 'status-confirmed' },
  pending: { icon: AlertCircle, className: 'status-pending' },
  cancelled: { icon: XCircle, className: 'status-cancelled' },
};

export function PublicCheckReservation() {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [search, setSearch] = useState('');
  const today = new Date().toISOString().split('T')[0];

  const reservations = useQuery(api.reservations.getByDate, {
    restaurantId: restaurantId || '',
    date: today,
  });

  useEffect(() => {
    const unsub = DataStore.subscribeToProfile((p) => {
      setProfile(p);
    }, restaurantId);
    return () => unsub();
  }, [restaurantId]);

  const filtered = (reservations ?? []).filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: reservations?.length ?? 0,
    confirmed: reservations?.filter((r) => r.status === 'confirmed').length ?? 0,
    pending: reservations?.filter((r) => r.status === 'pending').length ?? 0,
  };

  const formatDate = (d: string) => {
    const date = new Date(d + 'T12:00:00');
    const day = date.toLocaleDateString('fr-FR', { weekday: 'long' });
    const dayNum = date.getDate();
    const month = date.toLocaleDateString('fr-FR', { month: 'long' });
    return `${day} ${dayNum} ${month}`;
  };

  const containerStyle = profile?.coverImage
    ? {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.92)), url(${profile.coverImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : {};

  return (
    <div className="check-reservation-container" style={containerStyle}>
      <div className="check-reservation-overlay" />

      <header className="check-header">
        <div className="check-header-top">
          {profile?.logo ? (
            <img src={profile.logo} alt="" className="check-logo" />
          ) : (
            <div className="check-logo-placeholder">
              {profile?.name?.[0] ?? 'R'}
            </div>
          )}
          <div className="check-header-info">
            <h1>{profile?.name ?? 'Restaurant'}</h1>
            <p className="check-date">
              <CalendarDays size={14} />
              {formatDate(today)}
            </p>
          </div>
          <button className="check-back-btn" onClick={() => navigate(`/menu/${restaurantId}`)}>
            <ArrowLeft size={20} />
          </button>
        </div>

        <div className="check-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-item stat-confirmed">
            <span className="stat-value">{stats.confirmed}</span>
            <span className="stat-label">Confirmé</span>
          </div>
          <div className="stat-item stat-pending">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">En attente</span>
          </div>
        </div>

        <div className="check-search">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </header>

      <main className="check-main">
        {reservations === undefined ? (
          <div className="check-loading">
            <div className="btn-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="check-empty">
            <CalendarDays size={48} className="empty-icon" />
            <p className="empty-title">
              {search ? 'Aucun résultat' : 'Aucune réservation aujourd\'hui'}
            </p>
            <p className="empty-sub">
              {search ? 'Essayez un autre nom' : 'Les réservations apparaîtront ici'}
            </p>
          </div>
        ) : (
          <div className="check-list">
            {filtered.map((r) => {
              const StatusIcon = statusConfig[r.status]?.icon ?? AlertCircle;
              const statusClass = statusConfig[r.status]?.className ?? 'status-pending';
              return (
                <div key={r._id} className={`reservation-card ${statusClass}`}>
                  <div className="reservation-time">
                    <Clock size={16} />
                    <span>{r.time}</span>
                  </div>
                  <div className="reservation-body">
                    <div className="reservation-name">{r.name}</div>
                    <div className="reservation-details">
                      <span><Users size={13} /> {r.guests} pers.</span>
                      {r.phone && <span><Phone size={13} /> {r.phone}</span>}
                    </div>
                    {r.email && <div className="reservation-email">{r.email}</div>}
                  </div>
                  <div className={`reservation-status ${statusClass}`}>
                    <StatusIcon size={16} />
                    <span>{r.status === 'confirmed' ? 'Confirmé' : r.status === 'cancelled' ? 'Annulé' : 'En attente'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
