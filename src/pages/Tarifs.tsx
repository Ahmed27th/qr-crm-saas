import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { useConvexAuth } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import { QrCode, Check, X, ArrowLeft, Zap, Star, Crown, ArrowRight, Percent, Monitor, Smartphone } from 'lucide-react';
import './Tarifs.css';

export function Tarifs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me);
  const subject = useQuery(api.users.getSubject);
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

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setInstallPrompt(null);
    } else {
      alert("To install this app, use your browser menu (Add to Home Screen / Install App).");
    }
  };

  const handleCheckout = (plan: typeof plans[0]) => {
    if (isLoading) return;
    if (!isAuthenticated) { window.location.href = '/login?redirectTo=/tarifs'; return; }
    const rawSubject = user?.subject || subject;
    if (!rawSubject) return;
    const userId = rawSubject.split('|')[0];
    const baseUrl = plan.checkoutUrl[billingCycle];
    const separator = baseUrl.includes('?') ? '&' : '?';
    const origin = window.location.origin;
    const checkoutUrl = `${baseUrl}${separator}checkout[custom][user_id]=${encodeURIComponent(userId)}&checkout[custom][plan]=${plan.id}&checkout[custom][billing]=${billingCycle}&checkout[success_url]=${encodeURIComponent(origin + '/dashboard')}&checkout[cancel_url]=${encodeURIComponent(origin + '/tarifs')}`;
    window.location.href = checkoutUrl;
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
      checkoutUrl: { monthly: 'https://saasprojectreview.lemonsqueezy.com/checkout/buy/6f1df6f9-ab9d-46f7-8f24-d9d1daa08c90', yearly: 'https://saasprojectreview.lemonsqueezy.com/checkout/buy/5c111176-1b68-4e09-a5c8-40dc412409e6' },
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
      checkoutUrl: { monthly: 'https://saasprojectreview.lemonsqueezy.com/checkout/buy/96c4bcaf-a41e-425f-a87e-60d43e0dc3d3', yearly: 'https://saasprojectreview.lemonsqueezy.com/checkout/buy/39d74bf6-7d6a-45fe-8b1f-63949fcfbe42' },
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
      checkoutUrl: { monthly: 'https://saasprojectreview.lemonsqueezy.com/checkout/buy/2c46c199-3fd3-4223-b63b-d06a1056d544', yearly: 'https://saasprojectreview.lemonsqueezy.com/checkout/buy/8aab7afb-e0e6-4862-afa3-626ce1fae247' },
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
            <QrCode size={22} />
            <span>QR CRM</span>
          </button>
          <div className="tarifs-nav-right">
            <button className="landing-btn landing-btn--ghost" onClick={() => navigate('/login')}>
              <ArrowLeft size={15} />
              <span>{t('login')}</span>
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
                <span className="tarifs-card-currency">DH</span>
                <span className="tarifs-card-amount">{billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}</span>
                <span className="tarifs-card-period">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              {billingCycle === 'yearly' && (
                <div className="tarifs-card-save">
                  <Percent size={14} />
                  <span>Save DH {plan.savings}/year</span>
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
              <button
                className={`tarifs-card-btn ${plan.popular ? 'tarifs-card-btn--primary' : 'tarifs-card-btn--ghost'}`}
                onClick={() => handleCheckout(plan)}
                disabled={isLoading || (isAuthenticated && !user && !subject)}
              >
                <span>{isLoading ? '...' : isAuthenticated && !user && !subject ? 'Chargement...' : 'Get Started'}</span>
                <ArrowRight size={15} />
              </button>
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
              <QrCode size={20} />
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
