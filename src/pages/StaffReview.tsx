import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, CheckCircle, Heart, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataStore } from '../dataStore';
import './StaffReview.css';

export function StaffReview() {
  const { restaurantId, staffId } = useParams<{ restaurantId: string; staffId: string }>();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<'rate' | 'comment' | 'done'>('rate');
  const [redirecting, setRedirecting] = useState(false);
  const [staff, setStaff] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const loadStaff = async () => {
      const sList = await DataStore.getStaff(restaurantId);
      const foundStaff = sList.find(s => s.id === staffId);
      setStaff(foundStaff);
    };
    loadStaff();

    // Subscribe to profile in real-time
    const unsubscribeProfile = DataStore.subscribeToProfile((p) => {
      setProfile(p);
    }, restaurantId);

    return () => {
      unsubscribeProfile();
    };
  }, [restaurantId, staffId]);

  const containerStyle = profile?.coverImage ? {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.85)), url(${profile.coverImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  } : {};

  const isGoodReview = rating >= 4;

  const handleStarClick = (star: number) => {
    setRating(star);
    setStep('comment');
  };

  const handleSubmit = async () => {
    if (rating > 0) {
      await DataStore.addReview(rating, `[${staff?.name || 'Staff'}] ${comment}`, undefined, restaurantId);
    }
    if (rating >= 4 && profile?.googleReviewUrl) {
      setRedirecting(true);
      window.location.href = profile.googleReviewUrl;
      return;
    }
    setStep('done');
  };

  const initials = staff?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?';
  const starColor = '#E2B36B';


  if (redirecting) {
    return (
      <div className="sr-container" style={containerStyle}>
        <div className="sr-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <Loader2 size={40} style={{ color: '#E2B36B', margin: '0 auto 1rem' }} className="animate-spin" />
          <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>Redirection vers Google&nbsp;Maps…</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="sr-container" style={containerStyle}>
        <div className="sr-card">
          <p style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>{t('review_member_not_found')}</p>
        </div>
      </div>
    );
  }

  const getHint = () => {
    if (hovered === 1) return t('review_hint_1');
    if (hovered === 2) return t('review_hint_2');
    if (hovered === 3) return t('review_hint_3');
    if (hovered === 4) return t('review_hint_4');
    if (hovered === 5) return t('review_hint_5');
    return t('review_hint_default');
  };

  return (
    <div className="sr-container" style={containerStyle}>

      <div className="sr-card animate-scale-up">

        {/* Restaurant Brand */}
        <div className="sr-brand">
          {profile?.logo && <img src={profile.logo} alt={profile.name} className="sr-logo" />}
          <span className="sr-restaurant-name">{profile?.name}</span>
        </div>

        {/* Staff Avatar */}
        <div className="sr-avatar-wrap">
          <div className="sr-avatar">{initials}</div>
          <div className="sr-avatar-ring" />
        </div>

        {/* --- STEP: RATE --- */}
        {step === 'rate' && (
          <div className="sr-step animate-fade-in">
            <h1 className="sr-title">{t('review_rate_title', { name: staff.name })}</h1>
            <p className="sr-role">{staff.role}</p>
            <p className="sr-subtitle">{t('review_subtitle_rate')}</p>
            <div className="sr-stars">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  className="sr-star-btn"
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => handleStarClick(star)}
                  aria-label={`${star} étoiles`}
                >
                  <Star
                    size={48}
                    fill={(hovered || rating) >= star ? starColor : 'none'}
                    stroke={(hovered || rating) >= star ? starColor : '#ccc'}
                    strokeWidth={1.5}
                    style={{ transition: 'all 0.15s ease', transform: (hovered || rating) >= star ? 'scale(1.15)' : 'scale(1)' }}
                  />
                </button>
              ))}
            </div>
            <p className="sr-hint">{getHint()}</p>
          </div>
        )}

        {/* --- STEP: COMMENT --- */}
        {step === 'comment' && (
          <div className="sr-step animate-fade-in">
            <h1 className="sr-title">{rating >= 4 ? t('review_comment_title_good') : t('review_comment_title_bad')}</h1>
            <div className="sr-stars sr-stars--small">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={28} fill={s <= rating ? starColor : 'none'} stroke={s <= rating ? starColor : '#ddd'} strokeWidth={1.5} />
              ))}
            </div>
            <p className="sr-subtitle" style={{ marginTop: '0.5rem' }}>
              {isGoodReview ? t('review_comment_subtitle_good') : t('review_comment_subtitle_bad')}
            </p>
            <textarea
              className="sr-textarea"
              placeholder={isGoodReview ? t('review_textarea_placeholder_good', { name: staff.name }) : t('review_textarea_placeholder_bad')}
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              autoFocus
            />
            <button className="sr-btn-primary" onClick={handleSubmit}>
              {isGoodReview ? <><Heart size={18} /> {t('review_submit_share')}</> : <><CheckCircle size={18} /> {t('review_submit_send')}</>}
            </button>
            <button className="sr-btn-ghost" onClick={() => handleSubmit()}>{t('review_skip')}</button>
          </div>
        )}

        {/* --- STEP: DONE --- */}
        {step === 'done' && (
          <div className="sr-step animate-fade-in">
            <div className="sr-success-icon">{isGoodReview ? '🎉' : '🙏'}</div>
            <h1 className="sr-title">{isGoodReview ? t('review_done_title_good') : t('review_done_title_bad')}</h1>
            <p className="sr-subtitle">
              {isGoodReview ? t('review_done_subtitle_good') : t('review_done_subtitle_bad')}
            </p>



            <div className="sr-staff-thanks">
              <div className="sr-avatar sr-avatar--small">{initials}</div>
              <span>{t('review_staff_thanks', { name: staff.name })}</span>
            </div>
          </div>
        )}

        <p className="sr-footer">{t('review_powered_by')} <strong>QR CRM</strong></p>
      </div>
    </div>
  );
}
