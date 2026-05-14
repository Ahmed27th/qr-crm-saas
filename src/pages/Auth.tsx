import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  updateProfile 
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Mail, Lock, User, LogIn, UserPlus, AlertCircle, QrCode, Check, Zap, Star, ShieldCheck, ArrowRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Auth.css';

export function Auth() {
  const { t } = useTranslation();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname !== '/signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Sync isLogin with URL changes
  useEffect(() => {
    setIsLogin(location.pathname !== '/signup');
  }, [location.pathname]);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const pricingPacks = [
    {
      name: t('pricing_starter_name'),
      price: t('pricing_starter_price'),
      period: `/${t('pricing_monthly').toLowerCase()}`,
      description: t('pricing_starter_desc'),
      features: [
        t('pricing_feature_menu'),
        t('pricing_feature_languages'),
        t('pricing_feature_reviews'),
        "Statistiques de Consultation Live",
        "Support Technique 5j/7"
      ],
      type: "standard",
      icon: <QrCode size={24} />
    },
    {
      name: t('pricing_pro_name'),
      price: t('pricing_pro_price'),
      period: `/${t('pricing_monthly').toLowerCase()}`,
      description: t('pricing_pro_desc'),
      features: [
        t('pricing_feature_menu'),
        t('pricing_feature_orders'),
        t('pricing_feature_reservation'),
        t('pricing_feature_analytics'),
        t('pricing_feature_support')
      ],
      featured: true,
      type: "standard",
      icon: <Zap size={24} />
    },
    {
      name: t('pricing_ultimate_name'),
      price: t('pricing_ultimate_price'),
      period: `/${t('pricing_monthly').toLowerCase()}`,
      description: t('pricing_ultimate_desc'),
      features: [
        t('pricing_feature_menu'),
        t('pricing_feature_delivery'),
        t('pricing_feature_mobile'),
        t('pricing_feature_analytics'),
        t('pricing_feature_support')
      ],
      type: "premium",
      icon: <Star size={24} />
    },
    {
      name: "Promo Opening 2024",
      price: "7900",
      period: "/an",
      description: "L'offre imbattable pour les leaders du marché.",
      features: [
        "Accès ILLIMITÉ à vie (Full Option)",
        "Économisez plus de 9000 DH/an",
        "Formation Staff & Setup Offerts",
        "Account Manager Dédié",
        "Marketing Pack (Stickers QR inclus)"
      ],
      promo: true,
      type: "promo",
      icon: <Star size={24} />
    }
  ];

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="glow-orb primary animate-float"></div>
        <div className="glow-orb secondary animate-float-delayed"></div>
        <div className="grid-overlay"></div>
        <div className="pattern-overlay"></div>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <QrCode size={32} color="#1a1a1a" />
          </div>
          <h1 className="auth-title">{isLogin ? 'Bon Retour' : 'Créer un Compte'}</h1>
          <p className="auth-subtitle">
            {isLogin 
              ? 'Accédez à votre terminal de gestion intelligent' 
              : 'Commencez à digitaliser votre établissement dès aujourd\'hui'}
          </p>
          <div className="auth-nav-pills">
            <button 
              className={`nav-pill ${isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(true); navigate('/login'); }}
            >
              Connexion
            </button>
            <button 
              className={`nav-pill ${!isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(false); navigate('/signup'); }}
            >
              Inscription
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleAuth}>
          {!isLogin && (
            <div className="form-group">
              <label>Nom complet</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input 
                  type="text" 
                  className="auth-input" 
                  placeholder="Ex: Ahmed Benani"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Adresse Email</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input 
                type="email" 
                className="auth-input" 
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Mot de passe</label>
              <button 
                type="button" 
                className="forgot-password-link"
                onClick={() => {/* Implement password reset logic if needed */}}
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input 
                type="password" 
                className="auth-input" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              'Traitement...'
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                {isLogin ? 'Se Connecter' : 'S\'inscrire'}
              </span>
            )}
          </button>
        </form>

        <div className="auth-divider">ou continuer avec</div>

        <button className="google-auth-btn" onClick={handleGoogleAuth} disabled={loading}>
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            width="20" 
            height="20" 
          />
          Google
        </button>

        <div className="auth-footer">
          <div className="auth-footer-links">
            {isLogin ? "Nouveau ici ?" : "Déjà un compte ?"}
            <button 
              className="auth-toggle-btn" 
              onClick={() => {
                const next = !isLogin;
                setIsLogin(next);
                navigate(next ? '/login' : '/signup');
              }}
            >
              {isLogin ? 'Créer un compte' : 'Se Connecter'}
              <ArrowRight size={14} />
            </button>
          </div>
          
          <div className="pricing-cta">
            <p>Vous voulez voir nos offres ?</p>
            <button 
              className="view-pricing-btn"
              onClick={() => document.querySelector('.pricing-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Voir les Tarifs & Packs
              <Star size={14} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>

      <div className="scroll-indicator" onClick={() => document.querySelector('.pricing-section')?.scrollIntoView({ behavior: 'smooth' })}>
        <span>Découvrir nos packs</span>
        <div className="mouse">
          <div className="wheel"></div>
        </div>
      </div>

      <section className="pricing-section">
        <div className="pricing-header">
          <h2 className="pricing-title">Choisissez votre pack</h2>
          <p className="pricing-subtitle">Des solutions adaptées à la taille de votre restaurant</p>
        </div>

        <div className="pricing-grid">
          {pricingPacks.map((pack, idx) => (
            <div key={idx} className={`pricing-card ${pack.featured ? 'featured' : ''} ${pack.promo ? 'promo' : ''}`}>
              {pack.featured && <div className="badge">Populaire</div>}
              {pack.promo && <div className="badge">Offre Limitée</div>}
              
              <div className="pack-icon-wrapper">{pack.icon}</div>
              <div className="plan-name">{pack.name}</div>
              <p className="plan-description">{pack.description}</p>
              <div className="plan-price">
                <span className="amount">{pack.price}</span>
                <span className="currency-label">DH</span>
                <span className="period">{pack.period}</span>
              </div>

              <ul className="plan-features">
                {pack.features.map((feature, fIdx) => (
                  <li key={fIdx}>
                    <Check size={18} className="feature-icon" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button 
                className={`pricing-btn ${pack.featured || pack.promo ? 'solid' : 'outline'}`} 
                onClick={() => {
                  setIsLogin(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Sélectionner
              </button>
            </div>
          ))}
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button 
            className="back-to-auth-btn"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Retour à l'inscription
          </button>
        </div>
      </section>
      <section className="trust-section">
        <div className="trust-badges">
          <div className="trust-item">
            <ShieldCheck size={24} className="trust-icon" />
            <span>Paiement Sécurisé</span>
          </div>
          <div className="trust-item">
            <Zap size={24} className="trust-icon" />
            <span>Activation Instantanée</span>
          </div>
          <div className="trust-item">
            <Star size={24} className="trust-icon" />
            <span>Support Local 24/7</span>
          </div>
        </div>
        <p className="trust-note">Propulsé par la technologie Cloud de pointe pour le marché Marocain</p>
      </section>
    </div>
  );
}
