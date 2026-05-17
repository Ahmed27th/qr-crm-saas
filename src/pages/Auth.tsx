import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, QrCode, Zap, Star, ShieldCheck, ArrowRight } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import './Auth.css';

export function Auth() {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname !== '/signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Note: For simulation only
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createProfile = useMutation(api.profiles.create);

  useEffect(() => {
    setIsLogin(location.pathname !== '/signup');
  }, [location.pathname]);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // SIMULATED AUTH FOR CONVEX DEMO
      // In a real app, use Clerk or Convex Auth
      const userId = email.replace(/[^a-zA-Z0-9]/g, '_');
      
      if (!isLogin) {
        await createProfile({
          userId: userId,
          name: name || 'Mon Restaurant',
          description: 'Cuisine de qualité',
          coverImage: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1600&q=80',
          logo: 'https://images.unsplash.com/photo-1583394838336-acd977730f90?auto=format&fit=crop&w=200&q=80'
        });
      }

      localStorage.setItem('qr_restaurant_id', userId);
      localStorage.setItem('qr_is_authenticated', 'true');
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-visual">
        <div className="auth-visual-content">
          <div className="auth-logo-large">
            <QrCode size={48} />
          </div>
          <h1>QR CRM SAAS</h1>
          <p className="auth-tagline">La révolution de la gestion de restaurant est ici.</p>
          
          <div className="auth-features-list">
            <div className="auth-feature-item">
              <Zap size={20} className="text-accent" />
              <span>Menu Digital en 2 minutes</span>
            </div>
            <div className="auth-feature-item">
              <Star size={20} className="text-accent" />
              <span>Récolte d'avis automatiques</span>
            </div>
            <div className="auth-feature-item">
              <ShieldCheck size={20} className="text-accent" />
              <span>Gestion du personnel unifiée</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-card glass-panel">
          <div className="auth-header">
            <div className="auth-badge">{isLogin ? 'Connexion' : 'Inscription'}</div>
            <h2>{isLogin ? 'Bon retour !' : 'Créer un compte'}</h2>
            <p className="text-tertiary">
              {isLogin ? 'Entrez vos identifiants pour gérer votre établissement' : 'Commencez votre essai gratuit aujourd\'hui'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label>Nom du Restaurant</label>
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Mon beau restaurant"
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
                  placeholder="contact@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Mot de passe</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="auth-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary auth-btn" disabled={loading}>
              {loading ? (
                <div className="loader"></div>
              ) : (
                <>
                  <span>{isLogin ? 'Se connecter' : 'Créer mon restaurant'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              {isLogin ? "Pas encore de compte ?" : "Déjà inscrit ?"}
              <button className="text-accent font-bold ml-2" onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}>
                {isLogin ? 'S\'inscrire' : 'Se connecter'}
              </button>
            </p>
          </div>
          
          <div className="auth-disclaimer">
            <p>En continuant, vous acceptez nos <span>Conditions d'utilisation</span> et notre <span>Politique de confidentialité</span>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
