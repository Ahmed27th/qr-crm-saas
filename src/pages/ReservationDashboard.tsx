import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  CalendarDays, Users, Phone, Clock, CheckCircle2,
  XCircle, AlertCircle, ArrowLeft, User,
  Mail, ChevronLeft, ChevronRight, Search
} from 'lucide-react';
import './ReservationDashboard.css';

type Status = 'pending' | 'confirmed' | 'arrived' | 'cancelled';

const STATUS_META: Record<Status, { label: string; icon: typeof CheckCircle2; className: string }> = {
  pending: { label: 'Pending', icon: AlertCircle, className: 'status-pending' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, className: 'status-confirmed' },
  arrived: { label: 'Arrived', icon: User, className: 'status-arrived' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'status-cancelled' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function ReservationDashboard() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [search, setSearch] = useState('');
  const updateStatus = useMutation(api.reservations.updateStatus);

  const reservations = useQuery(api.reservations.getByDate, {
    restaurantId: restaurantId || '',
    date: selectedDate,
  });

  const sorted = useMemo(() => {
    if (!reservations) return [];
    return [...reservations].sort((a, b) => a.time.localeCompare(b.time));
  }, [reservations]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.trim().toLowerCase();
    return sorted.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.phone && r.phone.includes(q))
    );
  }, [sorted, search]);

  const displayList = search.trim() ? filtered : sorted;

  const stats = useMemo(() => {
    if (!reservations) return { total: 0, pending: 0, confirmed: 0, arrived: 0, cancelled: 0, guests: 0 };
    const source = search.trim() ? filtered : reservations;
    const s = { total: source.length, pending: 0, confirmed: 0, arrived: 0, cancelled: 0, guests: 0 };
    for (const r of source) {
      const status = r.status as Status;
      if (status === 'pending') s.pending++;
      else if (status === 'confirmed') s.confirmed++;
      else if (status === 'arrived') s.arrived++;
      else if (status === 'cancelled') s.cancelled++;
      s.guests += r.guests;
    }
    return s;
  }, [reservations, filtered, search]);

  const goDate = (offset: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleStatus = (id: string, status: Status) => {
    updateStatus({ id: id as any, status });
  };

  return (
    <div className="reservation-page">
      <header className="reservation-header">
        <div className="reservation-header-top">
          <h1><CalendarDays size={22} /> Reservations</h1>
          <div className="reservation-date-nav">
            <button className="date-nav-btn" onClick={() => goDate(-1)}><ChevronLeft size={16} /></button>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="reservation-date-input"
            />
            <button className="date-nav-btn" onClick={() => goDate(1)}><ChevronRight size={16} /></button>
          </div>
          <span className="reservation-date-label">{formatDate(selectedDate)}</span>
        </div>

        <div className="reservation-search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="reservation-search-input"
          />
          {search && (
            <button className="reservation-search-clear" onClick={() => setSearch('')}>×</button>
          )}
        </div>

        <div className="reservation-stats">
          <div className="reservation-stat stat-total">
            <span className="stat-num">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="reservation-stat stat-pending">
            <span className="stat-num">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="reservation-stat stat-confirmed">
            <span className="stat-num">{stats.confirmed}</span>
            <span className="stat-label">Confirmed</span>
          </div>
          <div className="reservation-stat stat-arrived">
            <span className="stat-num">{stats.arrived}</span>
            <span className="stat-label">Arrived</span>
          </div>
          <div className="reservation-stat stat-cancelled">
            <span className="stat-num">{stats.cancelled}</span>
            <span className="stat-label">Cancelled</span>
          </div>
          <div className="reservation-stat stat-guests">
            <span className="stat-num">{stats.guests}</span>
            <span className="stat-label">Guests</span>
          </div>
        </div>
      </header>

      <main className="reservation-body">
        {!reservations ? (
          <div className="reservation-loading">
            <div className="btn-spinner" />
          </div>
        ) : displayList.length === 0 && search.trim() ? (
          <div className="reservation-empty">
            <Search size={48} />
            <p>No reservations match your search</p>
          </div>
        ) : displayList.length === 0 ? (
          <div className="reservation-empty">
            <CalendarDays size={48} />
            <p>No reservations for {formatDate(selectedDate).toLowerCase()}</p>
          </div>
        ) : (
          <div className="reservation-timeline">
            {displayList.map(r => {
              const status = r.status as Status;
              const meta = STATUS_META[status];
              const StatusIcon = meta.icon;
              return (
                <div key={r._id} className={`reservation-card ${status}`}>
                  <div className="reservation-card-left">
                    <div className="reservation-time">
                      <Clock size={14} />
                      <span>{r.time}</span>
                    </div>
                    <div className="reservation-guests">
                      <Users size={14} />
                      <span>{r.guests}</span>
                    </div>
                  </div>

                  <div className="reservation-card-main">
                    <div className="reservation-card-name-row">
                      <span className="reservation-name">{r.name}</span>
                      <span className={`reservation-status-badge ${meta.className}`}>
                        <StatusIcon size={12} />
                        {meta.label}
                      </span>
                    </div>

                    <div className="reservation-card-contact">
                      {r.phone && (
                        <a href={`tel:${r.phone}`} className="reservation-contact-link">
                          <Phone size={12} />
                          {r.phone}
                        </a>
                      )}
                      {r.email && (
                        <span className="reservation-contact-email">
                          <Mail size={12} />
                          {r.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="reservation-card-actions">
                    {status === 'pending' && (
                      <>
                        <button className="res-action-btn action-confirm" onClick={() => handleStatus(r._id, 'confirmed')} title="Confirm">
                          <CheckCircle2 size={16} />
                        </button>
                        <button className="res-action-btn action-cancel" onClick={() => handleStatus(r._id, 'cancelled')} title="Cancel">
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                    {status === 'confirmed' && (
                      <>
                        <button className="res-action-btn action-arrive" onClick={() => handleStatus(r._id, 'arrived')} title="Mark arrived">
                          <User size={16} />
                        </button>
                        <button className="res-action-btn action-cancel" onClick={() => handleStatus(r._id, 'cancelled')} title="Cancel">
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                    {status === 'arrived' && (
                      <span className="res-action-done">Seated</span>
                    )}
                    {status === 'cancelled' && (
                      <button className="res-action-btn action-restore" onClick={() => handleStatus(r._id, 'pending')} title="Restore">
                        <ArrowLeft size={16} />
                      </button>
                    )}
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
