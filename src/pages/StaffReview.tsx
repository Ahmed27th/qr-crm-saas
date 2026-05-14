import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, CheckCircle, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataStore } from '../dataStore';
import './StaffReview.css';

export function StaffReview() {
  const { staffId } = useParams<{ staffId: string }>();
  const [staff, setStaff] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<'rate' | 'comment' | 'done'>('rate');
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const loadData = async () => {
      const [sList, prof] = await Promise.all([
        DataStore.getStaff(),
        DataStore.getProfile()
      ]);
      const foundStaff = sList.find(s => s.id === staffId);
      setStaff(foundStaff);
      setProfile(prof);
    };
    loadData();
  }, [staffId]);

  const isGoodReview = rating >= 4;

  const handleStarClick = (star: number) => {
    setRating(star);
    setStep('comment');
  };

  const handleSubmit = async () => {
    if (rating > 0) {
      await DataStore.addReview(rating, `[${staff?.name || 'Staff'}] ${comment}`);
    }
    setStep('done');
  };

  const handleShareGoogle = async () => {
    const reviewText = `${comment || t('review_textarea_placeholder_good', { name: staff?.name || '' }).split('...')[0]}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(reviewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
    if (profile?.googleReviewUrl) {
      setTimeout(() => window.open(profile.googleReviewUrl, '_blank'), 400);
    }
  };

  const initials = staff?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?';
  const starColor = '#E2B36B';


  if (!staff) {
    return (
      <div className="sr-container">
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
    <div className="sr-container">

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

            {isGoodReview && (
              <button className="sr-btn-google" onClick={handleShareGoogle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {copied ? t('review_copied') : t('review_google_btn')}
              </button>
            )}

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
