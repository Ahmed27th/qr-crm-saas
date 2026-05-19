import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, QrCode, Zap, Star, ArrowRight, Eye, EyeOff, Users, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useMutation } from 'convex/react';
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from '../../convex/_generated/api';
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
  const navigate = useNavigate();

  const createProfile = useMutation(api.profiles.create);
  const { signIn } = useAuthActions();

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
      const flow = isLogin ? "login" : "register";
      await signIn("password", { email, password, name: isLogin ? undefined : name, flow, redirectTo: "/tarifs" });
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signIn("google", { redirectTo: "/tarifs" });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la connexion Google');
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
              <QrCode size={28} className="logo-icon" />
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

                {/* Social Logins */}
                <div className="auth-social-divider">
                  <span>ou continuer avec</span>
                </div>
                
                <div className="auth-social-buttons">
                  <button type="button" className="social-login-btn google" onClick={handleGoogleLogin} disabled={loading}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    <span>Google</span>
                  </button>
                  <button type="button" className="social-login-btn apple">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39" />
                    </svg>
                    <span>Apple</span>
                  </button>
                </div>

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
