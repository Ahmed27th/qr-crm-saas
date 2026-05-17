import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, Users, User, Mail, Phone, CheckCircle } from 'lucide-react';
import { DataStore } from '../dataStore';
import type { RestaurantProfile } from '../dataStore';
import './PublicBooking.css';

export function PublicBooking() {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    guests: 2,
    name: '',
    email: '',
    phone: ''
  });
  
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Real-time profile subscription
    const unsubscribeProfile = DataStore.subscribeToProfile((p) => {
      setProfile(p);
    }, restaurantId);

    return () => {
      unsubscribeProfile();
    };
  }, [restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await DataStore.addReservation(formData, restaurantId);
    setIsSuccess(true);
  };

  const containerStyle = profile?.coverImage ? {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.85)), url(${profile.coverImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  } : {};

  if (isSuccess) {
    return (
      <div className="booking-container" style={containerStyle}>
        <div className="booking-card success-card">
          <CheckCircle size={64} className="text-success mb-4 mx-auto" />
          <h2>{t('booking_success_title')}</h2>
          <p className="text-tertiary mt-2">
            {t('booking_success_desc', { 
              name: formData.name, 
              guests: formData.guests, 
              date: formData.date, 
              time: formData.time 
            })}
          </p>
          <p className="text-tertiary mt-4">
            {t('booking_email_info', { email: formData.email })}
          </p>
          <button className="btn-primary w-full mt-8" onClick={() => navigate(`/menu/${restaurantId}`)}>
            {t('view_menu')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-container" style={containerStyle}>
      <div className="booking-card">
        <div className="booking-header">
          {profile?.logo ? (
            <img src={profile.logo} alt="Logo" className="booking-logo" />
          ) : (
            <div className="booking-logo-placeholder">
              {profile?.name?.[0] ?? 'R'}
            </div>
          )}
          <h1>{t('booking_title')}</h1>
          <p className="text-tertiary">{profile?.name}</p>
        </div>

        <form className="booking-form" onSubmit={handleSubmit}>
          {/* Section 1: Details */}
          <div className="form-section">
            <h3 className="section-title">{t('when_how_many')}</h3>
            <div className="form-row">
              <div className="input-group">
                <label><Calendar size={14} /> {t('date_label')}</label>
                <input 
                  type="date" 
                  required 
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                />
              </div>
              <div className="input-group">
                <label><Clock size={14} /> {t('time_label')}</label>
                <input 
                  type="time" 
                  required 
                  value={formData.time} 
                  onChange={e => setFormData({...formData, time: e.target.value})} 
                />
              </div>
            </div>
            <div className="input-group mt-4">
              <label><Users size={14} /> {t('guests_label')}</label>
              <select 
                value={formData.guests} 
                onChange={e => setFormData({...formData, guests: parseInt(e.target.value)})}
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? t('person') || 'Person' : t('people') || 'People'}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Contact */}
          <div className="form-section">
            <h3 className="section-title">{t('your_details')}</h3>
            <div className="input-group mt-2">
              <label><User size={14} /> {t('full_name')}</label>
              <input 
                type="text" 
                required 
                placeholder="Mohamed"
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div className="input-group mt-4">
              <label><Mail size={14} /> {t('email_address')}</label>
              <input 
                type="email" 
                required 
                placeholder="mohamed@example.ma"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
              />
            </div>
            <div className="input-group mt-4">
              <label><Phone size={14} /> {t('phone_number')}</label>
              <input 
                type="tel" 
                required 
                placeholder="+212 661 000 000"
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full mt-4 submit-booking-btn">
            {t('request_reservation')}
          </button>
        </form>
      </div>
    </div>
  );
}
