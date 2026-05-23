import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Send, Heart, MessageSquare, ArrowLeft } from 'lucide-react';
import { DataStore } from '../dataStore';
import type { RestaurantProfile } from '../dataStore';
import './PublicReview.css';

export const PublicReview = () => {
  const { restaurantId } = useParams();
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hover, setHover] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Real-time profile subscription
    const unsubscribeProfile = DataStore.subscribeToProfile((p) => {
      setProfile(p);
    }, restaurantId);

    window.scrollTo(0, 0);

    return () => {
      unsubscribeProfile();
    };
  }, [restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    await DataStore.addReview(rating, comment, undefined, restaurantId);
    setSubmitted(true);
  };

  const handleGoogleShare = async () => {
    if (comment) {
      try {
        await navigator.clipboard.writeText(comment);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        // clipboard not available
      }
    }
    if (profile?.googleReviewUrl) {
      window.open(profile.googleReviewUrl, '_blank');
    }
  };

  const getRatingLabel = (val: number) => {
    const labels: Record<number, string> = {
      5: '⭐ Excellent !',
      4: '👍 Très bien',
      3: '🤔 Correct',
      2: '😕 Moyen',
      1: '😞 Décevant',
    };
    return labels[val] ?? 'Sélectionnez une étoile';
  };

  const RestaurantLogo = () => {
    if (profile?.logo) {
      return <img src={profile.logo} alt={profile.name} className="review-logo" />;
    }
    return (
      <div className="review-logo-placeholder">
        {profile?.name?.[0] ?? 'R'}
      </div>
    );
  };

  const containerStyle = profile?.coverImage ? {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9)), url(${profile.coverImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  } : {};

  /* ── Success State ───────────────────────────────── */
  if (submitted) {
    const isPositive = rating >= 4;
    return (
      <div className="review-container" style={containerStyle}>
        <div className="review-background-overlay" />
        <div className="review-card-wrapper" style={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
          <div className="glass-panel p-10 w-full success-celebration">
            <div className="success-icon-wrapper">
              {isPositive
                ? <Star size={52} fill="currentColor" />
                : <Heart size={52} fill="currentColor" />}
            </div>

            <h2 className="text-4xl font-black mb-3 text-gradient">
              {isPositive ? 'C\'est parfait !' : 'Merci beaucoup !'}
            </h2>
            <p className="text-secondary leading-relaxed mb-10" style={{ fontSize: '1rem', maxWidth: '320px', margin: '0 auto 2.5rem' }}>
              {isPositive
                ? 'Partagez votre expérience sur Google Maps et aidez-nous à grandir !'
                : `Votre retour nous aide à nous améliorer. À très bientôt chez ${profile?.name ?? 'nous'} !`}
            </p>

            <div className="flex flex-col gap-3">
              {isPositive && profile?.googleReviewUrl && (
                <button className="google-btn" onClick={handleGoogleShare}>
                  <img
                    src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png"
                    alt="Google"
                    className="google-logo-mini"
                  />
                  {copied ? 'Commentaire copié ✓' : 'Publier sur Google'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Review Form ─────────────────────────────────── */
  return (
    <div className="review-container" style={containerStyle}>
      <div className="review-background-overlay" />

      <div className="review-card-wrapper">
        {/* Header */}
        <header className="review-header">
          <RestaurantLogo />
          <h1 className="text-3xl font-black mb-1">{profile?.name ?? 'Notre Restaurant'}</h1>
          <p className="text-tertiary" style={{ fontSize: '0.9rem' }}>
            Partagez votre expérience avec nous
          </p>
        </header>

        {/* Card */}
        <main>
          <div className="glass-panel p-8">
            <form onSubmit={handleSubmit}>
              {/* Stars */}
              <div className="text-center">
                <h3 className="font-bold mb-1" style={{ fontSize: '1.05rem' }}>
                  Votre note globale
                </h3>
                <div className="star-rating-container">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="star-button"
                      onMouseEnter={() => setHover(star)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setRating(star)}
                      aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        size={42}
                        className={(hover || rating) >= star ? 'text-accent' : 'text-tertiary'}
                        fill={(hover || rating) >= star ? 'currentColor' : 'none'}
                        strokeWidth={1.2}
                      />
                    </button>
                  ))}
                </div>
                <p className="rating-label">{getRatingLabel(hover || rating)}</p>
              </div>

              {/* Comment */}
              <div>
                <div className="flex items-center gap-2 mb-3 text-tertiary">
                  <MessageSquare size={15} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Commentaire (Optionnel)
                  </span>
                </div>
                <div className="review-textarea-wrapper">
                  <textarea
                    id="review-comment"
                    name="review-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Qu'avez-vous le plus aimé ? Le service, les plats, l'ambiance..."
                    className="review-textarea"
                    maxLength={500}
                  />
                </div>
              </div>

              {/* Submit */}
              <button type="submit" className="submit-btn" disabled={rating === 0}>
                <Send size={18} />
                Envoyer mon avis
              </button>
            </form>
          </div>

          <button
            className="review-back-btn"
            onClick={() => (window.location.href = `/menu/${restaurantId}`)}
          >
            <ArrowLeft size={16} />
            Retour au menu
          </button>
        </main>
      </div>
    </div>
  );
};
