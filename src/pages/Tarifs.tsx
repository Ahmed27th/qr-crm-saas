import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useAction } from 'convex/react';
import { useConvexAuth } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import { Check, X, ArrowLeft, Zap, Star, Crown, ArrowRight, Percent, Monitor, Smartphone } from 'lucide-react';
import { formatPrice, formatNumber } from '../utils/format';
import './Tarifs.css';

export function Tarifs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me);
  const createCheckout = useAction(api.stripe.createCheckoutSession);
  const startTrial = useAction(api.trial.startTrial);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [scrolled, setScrolled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const sub = user?.subscription;
  const hasActiveSub = sub && (sub.status === 'active' || sub.status === 'trialing') && sub.currentPeriodEnd > Date.now();

  const handleStartTrial = async () => {
    if (isLoading) return;
    if (!isAuthenticated) { window.location.href = '/login?redirectTo=/tarifs'; return; }
    try {
      await startTrial();
      window.location.href = '/dashboard';
    } catch (err) {
      console.error("Trial failed:", err);
    }
  };

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setInstallPrompt(null);
    } else {
      alert("To install this app, use your browser menu (Add to Home Screen / Install App).");
    }
  };

  const handleCheckout = async (plan: typeof plans[0]) => {
    if (isLoading) return;
    if (!isAuthenticated) { window.location.href = '/login?redirectTo=/tarifs'; return; }
    try {
      const origin = window.location.origin;
      const { url } = await createCheckout({
        planId: plan.id,
        billingPeriod: billingCycle,
        successUrl: origin + '/dashboard?checkout=success',
        cancelUrl: origin + '/tarifs',
      });
      window.location.href = url;
    } catch (err) {
      console.error("Checkout failed:", err);
    }
  };

  const monthlyPrices = {
    starter: parseInt(t('pricing_starter_price')),
    pro: parseInt(t('pricing_pro_price')),
    ultimate: parseInt(t('pricing_ultimate_price')),
  };

  const plans = [
    {
      id: 'starter', name: t('pricing_starter_name'), badge: t('pricing_starter_badge'),
      monthlyPrice: monthlyPrices.starter, yearlyPrice: 2000, savings: 388,
      desc: t('pricing_starter_desc'), icon: <Star size={22} />,
      features: [
        { text: t('pricing_feature_reviews'), included: true },
        { text: t('pricing_feature_menu'), included: false },
        { text: t('pricing_feature_orders'), included: false },
        { text: t('pricing_feature_reservation'), included: false },
        { text: t('pricing_feature_analytics'), included: false },
      ],
    },
    {
      id: 'pro', name: t('pricing_pro_name'), badge: t('pricing_pro_badge'),
      monthlyPrice: monthlyPrices.pro, yearlyPrice: 5000, savings: 988,
      desc: t('pricing_pro_desc'), icon: <Zap size={22} />, popular: true,
      features: [
        { text: t('pricing_feature_menu'), included: true },
        { text: t('pricing_feature_reviews'), included: true },
        { text: t('pricing_feature_orders'), included: true },
        { text: t('pricing_feature_reservation'), included: true },
        { text: t('pricing_feature_analytics'), included: true },
      ],
    },
    {
      id: 'ultimate', name: t('pricing_ultimate_name'), badge: t('pricing_ultimate_badge'),
      monthlyPrice: monthlyPrices.ultimate, yearlyPrice: 11000, savings: 988,
      desc: t('pricing_ultimate_desc'), icon: <Crown size={22} />,
      features: [
        { text: t('pricing_feature_menu'), included: true },
        { text: t('pricing_feature_reviews'), included: true },
        { text: t('pricing_feature_orders'), included: true },
        { text: t('pricing_feature_reservation'), included: true },
        { text: t('pricing_feature_analytics'), included: true },
        { text: t('pricing_feature_support'), included: true },
      ],
    },
  ];

  return (
    <div className="tarifs">
      <div className="grain-overlay" aria-hidden="true" />

      <nav className={`tarifs-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="tarifs-nav-inner">
          <button className="tarifs-logo" onClick={() => navigate('/')}>
            <img src="/favicon.svg" className="tarifs-logo-img" alt="QR CRM" />
            <span>QR CRM</span>
          </button>
          <div className="tarifs-nav-right">
            <button className="landing-btn landing-btn--ghost" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
              <ArrowLeft size={15} />
              <span>{isAuthenticated ? 'Dashboard' : t('login')}</span>
            </button>
          </div>
        </div>
      </nav>

      <section className="tarifs-hero">
        <div className="tarifs-hero-bg">
          <div className="hero-orb hero-orb--1" />
          <div className="hero-orb hero-orb--2" />
          <div className="hero-orb hero-orb--3" />
          <div className="hero-grid" />
        </div>
        <div className="tarifs-hero-content">
          <span className="hero-badge">Plans & Pricing</span>
          <h1 className="tarifs-title">
            Choose your <span className="tarifs-gold">perfect plan</span>
          </h1>
          <p className="tarifs-sub">{t('hero_subtitle')}</p>
          <div className="tarifs-toggle">
            <span className={`tarifs-toggle-label ${billingCycle === 'monthly' ? 'active' : ''}`}>Monthly</span>
            <button
              className={`tarifs-toggle-switch ${billingCycle === 'yearly' ? 'yearly' : ''}`}
              onClick={() => setBillingCycle(b => b === 'monthly' ? 'yearly' : 'monthly')}
            >
              <div className="tarifs-toggle-knob" />
            </button>
            <span className={`tarifs-toggle-label ${billingCycle === 'yearly' ? 'active' : ''}`}>
              Yearly <span className="pricing-promo">{t('pricing_promo')}</span>
            </span>
          </div>
        </div>
      </section>

      <section className="tarifs-cards">
        <div className="tarifs-cards-grid">
          {plans.map((plan) => (
            <div key={plan.id} className={`tarifs-card ${plan.popular ? 'tarifs-card--featured' : ''}`}>
              {plan.popular && <div className="tarifs-popular-tag">Most Popular</div>}
              <div className="tarifs-card-header">
                <div className="tarifs-card-icon">{plan.icon}</div>
                <span className="tarifs-card-badge">{plan.badge}</span>
                <h3 className="tarifs-card-name">{plan.name}</h3>
                <p className="tarifs-card-desc">{plan.desc}</p>
              </div>
              <div className="tarifs-card-price">
                <span className="tarifs-card-currency">MAD</span>
                <span className="tarifs-card-amount">{formatNumber(billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice)}</span>
                <span className="tarifs-card-period">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                <div className="tarifs-card-usd">~{formatNumber(Math.round((billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice) / 10))} USD</div>
              </div>
              {billingCycle === 'yearly' && (
                <div className="tarifs-card-save">
                  <Percent size={14} />
                  <span>Save {formatPrice(plan.savings, 0)} ({formatNumber(Math.round(plan.savings / 10))} USD)/year</span>
                </div>
              )}
              <ul className="tarifs-card-features">
                {plan.features.map((f, i) => (
                  <li key={i} className={f.included ? '' : 'disabled'}>
                    {f.included ? <Check size={13} /> : <X size={13} />}
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
              {(() => {
                const label = !isAuthenticated ? 'Get Started' : hasActiveSub ? 'Dashboard' : plan.id === 'ultimate' ? 'Start Free Trial' : 'Get Started';
                const action = !isAuthenticated ? () => window.location.href = '/login?redirectTo=/tarifs'
                  : hasActiveSub ? () => window.location.href = '/dashboard'
                  : plan.id === 'ultimate' ? handleStartTrial
                  : () => handleCheckout(plan);
                return (
                  <button className={`tarifs-card-btn ${plan.popular ? 'tarifs-card-btn--primary' : 'tarifs-card-btn--ghost'}`}
                    onClick={action}
                    disabled={isLoading || (isAuthenticated && !user)}
                  >
                    <span>{isLoading ? '...' : isAuthenticated && !user ? 'Chargement...' : label}</span>
                    <ArrowRight size={15} />
                  </button>
                );
              })()}
            </div>
          ))}
        </div>
      </section>

      <section className="tarifs-download">
        <h2 className="tarifs-section-title">Use QR CRM on <span className="tarifs-gold">any device</span></h2>
        <p className="tarifs-section-sub">Install our Progressive Web App for a native-like experience.</p>
        <div className="tarifs-download-grid">
          <div className="tarifs-download-card">
            <Smartphone size={36} />
            <h3>Mobile App</h3>
            <p>Install on Android or iOS directly from your browser.</p>
            <button className="landing-btn landing-btn--ghost" onClick={handleInstall}>Install Mobile</button>
          </div>
          <div className="tarifs-download-card featured">
            <Monitor size={36} />
            <h3>Desktop App</h3>
            <p>Install as a standalone app on Windows, Mac, or Linux.</p>
            <button className="landing-btn landing-btn--primary" onClick={handleInstall}>Install Desktop</button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <div className="landing-logo">
              <img src="/favicon.svg" className="landing-logo-img" alt="QR CRM" />
              <span>QR CRM</span>
            </div>
            <p>{t('hero_subtitle')}</p>
          </div>
          <div className="landing-footer-links">
            <div className="landing-footer-group">
              <h4>Product</h4>
              <button onClick={() => navigate('/')}>Home</button>
              <button onClick={() => navigate('/login')}>{t('login')}</button>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <p>&copy; 2026 QR CRM SAAS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
