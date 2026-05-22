import { useState, useEffect, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, QrCode, Zap, Star, ArrowRight, Eye, EyeOff, Users, ArrowLeft, CheckCircle2 } from 'lucide-react';

import { useAuthActions } from "@convex-dev/auth/react";

import './Auth.css';

export function Auth() {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname !== '/signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const redirectTo = new URLSearchParams(location.search).get('redirectTo') || '/dashboard';

  // Mouse coordinate tracker for spotlight effect
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Sync state with location path
  useEffect(() => {
    setIsLogin(location.pathname !== '/signup');
    setIsForgotPassword(false);
    setResetSent(false);
    setError('');
  }, [location.pathname]);

  // Mock live orders state for interactive dashboard mockup
  interface MockOrder {
    id: number;
    target: string;
    item: string;
    status: 'preparing' | 'ready' | 'delivery' | 'delivered';
    time: string;
  }

  const [mockOrders, setMockOrders] = useState<MockOrder[]>([
    { id: 1, target: 'Table 5', item: 'Tajine de Veau', status: 'preparing', time: 'Il y a 2 min' },
    { id: 2, target: 'Livreur Ahmed', item: 'Couscous Royal', status: 'delivery', time: 'Il y a 5 min' },
    { id: 3, target: 'Table 2', item: 'Pastilla Poulet', status: 'ready', time: 'Il y a 1 min' }
  ]);

  // Update order statuses periodically
  useEffect(() => {
    const items = ['Tajine Poulet', 'Couscous Royal', 'Pastilla Poissons', 'Thé & Cornes de Gazelle', 'Zaalouk & Grillades'];
    const targets = ['Table 4', 'Table 12', 'Livreur Yassine', 'Table 7', 'Livreur Salma'];

    const interval = setInterval(() => {
      setMockOrders((prev) => {
        const rand = Math.random();
        if (rand > 0.5) {
          // Add new order
          const newOrder: MockOrder = {
            id: Date.now(),
            target: targets[Math.floor(Math.random() * targets.length)],
            item: items[Math.floor(Math.random() * items.length)],
            status: 'preparing',
            time: 'À l\'instant'
          };
          return [newOrder, ...prev.slice(0, 2)];
        } else {
          // Advance status of a random order
          return prev.map((order) => {
            if (Math.random() > 0.5) {
              let nextStatus: MockOrder['status'] = order.status;
              if (order.status === 'preparing') nextStatus = 'ready';
              else if (order.status === 'ready') nextStatus = 'delivery';
              else if (order.status === 'delivery') nextStatus = 'delivered';
              else nextStatus = 'preparing';
              return { ...order, status: nextStatus, time: 'Modifié' };
            }
            return order;
          });
        }
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      localStorage.setItem('__convex_auth_remember', rememberMe ? 'true' : 'false');

      const params: Record<string, any> = {
        email,
        password,
        flow: isLogin ? "signIn" : "signUp",
        redirectTo,
      };
      if (!isLogin && name) {
        params.name = name;
      }
      await Promise.race([
        signIn("password", params),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Délai dépassé. Vérifiez que votre déploiement Convex est actif (npx convex dev).')), 15000))
      ]);
      setLoading(false);
      navigate(redirectTo);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate reset link sending
    setTimeout(() => {
      setLoading(false);
      setResetSent(true);
    }, 1500);
  };

  // Helper for password strength validation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    
    if (score <= 1) return { score, label: 'Faible', color: '#ef4444' };
    if (score === 2) return { score, label: 'Moyen', color: '#f59e0b' };
    if (score >= 3) return { score, label: 'Fort', color: '#10b981' };
    return { score: 0, label: '', color: 'transparent' };
  };

  const strength = getPasswordStrength(password);

  return (
    <div 
      className="auth-page-container"
      style={{
        '--mouse-x': `${mousePos.x}px`,
        '--mouse-y': `${mousePos.y}px`
      } as React.CSSProperties}
    >
      {/* Visual background components */}
      <div className="auth-mesh-bg">
        <div className="auth-blob auth-blob-1"></div>
        <div className="auth-blob auth-blob-2"></div>
        <div className="auth-blob auth-blob-3"></div>
      </div>
      <div className="auth-grid-pattern"></div>
      
      <div className="auth-content-wrapper">
        
        {/* LEFT COLUMN: Premium Branding Panel */}
        <div className="auth-branding-panel">
          <div className="auth-branding-glow"></div>
          
          <div className="auth-brand-header auth-animate-fade-in">
            <div className="auth-brand-logo">
              <img src="/favicon.svg" className="auth-brand-img" alt="QR CRM" />
              <div className="logo-glow"></div>
            </div>
            <span className="auth-brand-title">QR CRM</span>
          </div>

          <div className="auth-branding-body">
            <h1 className="auth-main-headline auth-animate-slide-up auth-delay-1">
              L'ère de la restauration <span className="text-gradient">intelligente</span>
            </h1>
            <p className="auth-subheadline auth-animate-slide-up auth-delay-2">
              Digitalisez votre menu, automatisez la récolte d'avis clients, et pilotez votre équipe en temps réel.
            </p>

            {/* Features list */}
            <div className="auth-features-list auth-animate-slide-up auth-delay-3">
              <div className="auth-feature-card">
                <div className="feature-icon-box">
                  <Zap size={18} />
                </div>
                <div className="feature-text">
                  <h4>Menu Interactif</h4>
                  <p>QR Code instantané, mis à jour en temps réel.</p>
                </div>
              </div>
              
              <div className="auth-feature-card">
                <div className="feature-icon-box">
                  <Star size={18} />
                </div>
                <div className="feature-text">
                  <h4>CRM & Avis Automatiques</h4>
                  <p>Boostez votre note Google Maps sans effort.</p>
                </div>
              </div>
              
              <div className="auth-feature-card">
                <div className="feature-icon-box">
                  <Users size={18} />
                </div>
                <div className="feature-text">
                  <h4>Gestion d'Équipe</h4>
                  <p>Portail Serveurs, Cuisine et Livreurs unifié.</p>
                </div>
              </div>
            </div>

            {/* Live Interactive CSS Dashboard Mockup */}
            <div className="auth-mockup-container auth-animate-scale-up auth-delay-4">
              <div className="auth-mockup-window">
                <div className="mockup-header">
                  <div className="mockup-dots">
                    <span className="dot dot-red"></span>
                    <span className="dot dot-yellow"></span>
                    <span className="dot dot-green"></span>
                  </div>
                  <div className="mockup-search">dashboard.qrcrm.ma</div>
                </div>
                <div className="mockup-body">
                  <div className="mockup-sidebar">
                    <span className="sidebar-item active"></span>
                    <span className="sidebar-item"></span>
                    <span className="sidebar-item"></span>
                  </div>
                  <div className="mockup-main">
                    <div className="mockup-stats">
                      <div className="mockup-stat-card">
                        <span className="stat-label">Commandes</span>
                        <span className="stat-val">142</span>
                      </div>
                      <div className="mockup-stat-card highlight">
                        <span className="stat-label">Revenus (DH)</span>
                        <span className="stat-val">4 280</span>
                      </div>
                      <div className="mockup-stat-card">
                        <span className="stat-label">Performance</span>
                        <div className="mockup-chart">
                          <div className="chart-bar" style={{ '--bar-height': '40%' } as React.CSSProperties}></div>
                          <div className="chart-bar" style={{ '--bar-height': '65%' } as React.CSSProperties}></div>
                          <div className="chart-bar highlight" style={{ '--bar-height': '85%' } as React.CSSProperties}></div>
                          <div className="chart-bar" style={{ '--bar-height': '50%' } as React.CSSProperties}></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mockup-orders-list">
                      {mockOrders.map((order) => (
                        <div key={order.id} className="order-row auth-animate-fade-in">
                          <div className="order-info">
                            <span className="order-name">{order.target}</span>
                            <span className={`order-status ${order.status} font-semibold`}>
                              {order.status === 'preparing' && 'En Cuisine'}
                              {order.status === 'ready' && 'Prêt à Servir'}
                              {order.status === 'delivery' && 'En Route'}
                              {order.status === 'delivered' && 'Livré'}
                            </span>
                          </div>
                          <span className="order-time">{order.item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mockup-decor-qr">
                <div className="qr-scanner-line"></div>
                <QrCode size={32} className="text-accent" />
                <span className="font-semibold">Scanner le menu</span>
              </div>
            </div>
            
          </div>
        </div>

        {/* RIGHT COLUMN: Modern Glassmorphic Form Card */}
        <div className="auth-form-panel">
          <div className="auth-card-glass auth-animate-scale-up auth-delay-1">
            
            {/* Conditional layouts based on state */}
            {isForgotPassword ? (
              // FORGOT PASSWORD STATE
              <div className="auth-forgot-flow">
                {resetSent ? (
                  <div className="auth-animate-fade-in text-center">
                    <div className="auth-success-circle">
                      <CheckCircle2 size={32} />
                    </div>
                    <div className="auth-form-header text-center">
                      <h2>Vérifiez votre boîte mail</h2>
                      <p className="auth-form-subtitle">
                        Nous avons envoyé un lien de réinitialisation à <strong>{email}</strong>.
                      </p>
                    </div>
                    <button 
                      type="button" 
                      className="auth-btn-secondary" 
                      style={{ marginTop: '24px' }}
                      onClick={() => { setIsForgotPassword(false); setResetSent(false); }}
                    >
                      <ArrowLeft size={16} />
                      <span>Retour à la connexion</span>
                    </button>
                  </div>
                ) : (
                  <div className="auth-animate-fade-in">
                    <div className="auth-form-header">
                      <h2>Mot de passe oublié ?</h2>
                      <p className="auth-form-subtitle">
                        Saisissez votre e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                      </p>
                    </div>

                    <form onSubmit={handleForgotPassword} className="auth-main-form" style={{ marginTop: '24px' }}>
                      <div className="form-input-group">
                        <label htmlFor="reset-email">Adresse Email</label>
                        <div className="input-field-wrapper">
                          <Mail size={18} className="field-icon" />
                          <input
                            id="reset-email"
                            type="email"
                            placeholder="Ex: contact@bistro.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <button type="submit" className="auth-primary-submit-btn" disabled={loading}>
                        {loading ? (
                          <span className="btn-spinner"></span>
                        ) : (
                          <>
                            <span>Envoyer le lien</span>
                            <ArrowRight size={18} className="btn-arrow" />
                          </>
                        )}
                      </button>

                      <button 
                        type="button" 
                        className="auth-btn-secondary" 
                        style={{ marginTop: '12px' }}
                        onClick={() => setIsForgotPassword(false)}
                      >
                        <ArrowLeft size={16} />
                        <span>Retour</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              // DEFAULT LOGIN / SIGNUP STATE
              <>
                <div className="auth-form-header">
                  <h2>{isLogin ? 'Bon retour !' : 'Rejoignez-nous'}</h2>
                  <p className="auth-form-subtitle">
                    {isLogin ? 'Entrez vos identifiants pour gérer votre établissement' : 'Créez votre compte restaurateur en quelques secondes'}
                  </p>
                </div>

                {/* Sliding Toggle Control */}
                <div className="auth-toggle-slider-container">
                  <button 
                    type="button" 
                    className={`toggle-slider-btn ${isLogin ? 'active' : ''}`}
                    onClick={() => { setIsLogin(true); setError(''); }}
                  >
                    Connexion
                  </button>
                  <button 
                    type="button" 
                    className={`toggle-slider-btn ${!isLogin ? 'active' : ''}`}
                    onClick={() => { setIsLogin(false); setError(''); }}
                  >
                    Créer un compte
                  </button>
                  <div className={`sliding-bg ${isLogin ? 'left' : 'right'}`}></div>
                </div>

                {/* Form */}
                <form onSubmit={handleAuth} className="auth-main-form">
                  {!isLogin && (
                    <div className="form-input-group auth-animate-fade-in">
                      <label htmlFor="restaurant-name">Nom du Restaurant</label>
                      <div className="input-field-wrapper">
                        <User size={18} className="field-icon" />
                        <input
                          id="restaurant-name"
                          type="text"
                          placeholder="Ex: Le Petit Bistro"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required={!isLogin}
                        />
                      </div>
                    </div>
                  )}

                  <div className="form-input-group">
                    <label htmlFor="auth-email">Adresse Email</label>
                    <div className="input-field-wrapper">
                      <Mail size={18} className="field-icon" />
                      <input
                        id="auth-email"
                        type="email"
                        placeholder="Ex: contact@bistro.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-input-group">
                    <label htmlFor="auth-password">Mot de passe</label>
                    <div className="input-field-wrapper">
                      <Lock size={18} className="field-icon" />
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button 
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {!isLogin && password && (
                      <div className="password-strength-meter auth-animate-fade-in">
                        <div className="strength-bars">
                          <div 
                            className="strength-bar-segment" 
                            style={{ backgroundColor: strength.score >= 1 ? strength.color : undefined }}
                          ></div>
                          <div 
                            className="strength-bar-segment" 
                            style={{ backgroundColor: strength.score >= 2 ? strength.color : undefined }}
                          ></div>
                          <div 
                            className="strength-bar-segment" 
                            style={{ backgroundColor: strength.score >= 3 ? strength.color : undefined }}
                          ></div>
                          <div 
                            className="strength-bar-segment" 
                            style={{ backgroundColor: strength.score >= 4 ? strength.color : undefined }}
                          ></div>
                        </div>
                        <div className="strength-label">
                          <span>Sécurité du mot de passe:</span>
                          <span className="strength-label-text" style={{ color: strength.color }}>
                            {strength.label}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {isLogin && (
                    <div className="remember-forgot-row">
                      <label className="remember-me-checkbox">
                        <input 
                          type="checkbox" 
                          checked={rememberMe} 
                          onChange={(e) => setRememberMe(e.target.checked)} 
                        />
                        <span className="checkbox-custom"></span>
                        <span className="checkbox-label">Se souvenir de moi</span>
                      </label>
                      <button 
                        type="button" 
                        className="forgot-pass-link"
                        onClick={() => setIsForgotPassword(true)}
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                  )}

                  {error && (
                    <div className="auth-error-banner auth-animate-fade-in">
                      <AlertCircle size={18} className="flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button type="submit" className="auth-primary-submit-btn" disabled={loading}>
                    {loading ? (
                      <span className="btn-spinner"></span>
                    ) : (
                      <>
                        <span>{isLogin ? 'Se connecter' : 'Créer mon restaurant'}</span>
                        <ArrowRight size={18} className="btn-arrow" />
                      </>
                    )}
                  </button>
                </form>



                <div className="auth-card-footer">
                  <p>En continuant, vous acceptez nos <span>Conditions d'utilisation</span> et notre <span>Politique de confidentialité</span>.</p>
                </div>
              </>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
}
