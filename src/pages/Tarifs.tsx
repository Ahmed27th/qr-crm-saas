import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { QrCode, Check, X, Sparkles, Crown, ArrowLeft, Zap, Shield, Headphones, BarChart3, Globe, Star, Monitor, Smartphone, Download, Percent } from 'lucide-react';
import './Tarifs.css';

export function Tarifs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useQuery(api.users.me);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.documentElement.removeAttribute('data-theme');
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      alert("Pour installer l'application, utilisez le menu de votre navigateur (Ajouter à l'écran d'accueil / Installer l'application).");
    }
  };

  const handleCheckout = (plan: typeof plans[0]) => {
    let userId = localStorage.getItem('qr_restaurant_id');
    if (!userId && user?.subject) {
      userId = user.subject;
      localStorage.setItem('qr_restaurant_id', userId);
      localStorage.setItem('qr_is_authenticated', 'true');
    }
    if (!userId) {
      navigate('/login');
      return;
    }
    const baseUrl = plan.checkoutUrl[billingCycle];
    const separator = baseUrl.includes('?') ? '&' : '?';
    const checkoutUrl = `${baseUrl}${separator}checkout[custom][user_id]=${encodeURIComponent(userId)}&checkout[custom][plan]=${plan.id}&checkout[custom][billing]=${billingCycle}`;
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
  };

  const monthlyPrices = {
    starter: parseInt(t('pricing_starter_price')),
    pro: parseInt(t('pricing_pro_price')),
    ultimate: parseInt(t('pricing_ultimate_price')),
  };

  const plans = [
    {
      id: 'starter',
      name: t('pricing_starter_name'),
      badge: t('pricing_starter_badge'),
      monthlyPrice: monthlyPrices.starter,
      yearlyPrice: 2000,
      savings: 388,
      checkoutUrl: {
        monthly: 'https://saasprojectreview.lemonsqueezy.com/checkout/buy/6f1df6f9-ab9d-46f7-8f24-d9d1daa08c90',
        yearly: 'https://saasprojectreview.lemonsqueezy.com/checkout/buy/5c111176-1b68-4e09-a5c8-40dc412409e6',
      },
      desc: t('pricing_starter_desc'),
      icon: <Star size={24} />,
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      features: [
        { text: t('pricing_feature_reviews'), included: true },
        { text: t('pricing_feature_menu'), included: false },
        { text: t('pricing_feature_orders'), included: false },
        { text: t('pricing_feature_reservation'), included: false },
        { text: t('pricing_feature_analytics'), included: false },
      ],
    },
    {
      id: 'pro',
      name: t('pricing_pro_name'),
      badge: t('pricing_pro_badge'),
      monthlyPrice: monthlyPrices.pro,
      yearlyPrice: 5000,
      savings: 988,
      checkoutUrl: {
        monthly: 'https://saasprojectreview.lemonsqueezy.com/checkout/buy/96c4bcaf-a41e-425f-a87e-60d43e0dc3d3?discount=0',
        yearly: 'https://saasprojectreview.lemonsqueezy.com/checkout/buy/39d74bf6-7d6a-45fe-8b1f-63949fcfbe42',
      },
      desc: t('pricing_pro_desc'),
      icon: <Zap size={24} />,
      color: '#e2b36b',
      gradient: 'linear-gradient(135deg, #e2b36b, #d4a055)',
      popular: true,
      features: [
        { text: t('pricing_feature_menu'), included: true },
        { text: t('pricing_feature_reviews'), included: true },
        { text: t('pricing_feature_orders'), included: true },
        { text: t('pricing_feature_reservation'), included: true },
        { text: t('pricing_feature_analytics'), included: true },
      ],
    },
    {
      id: 'ultimate',
      name: t('pricing_ultimate_name'),
      badge: t('pricing_ultimate_badge'),
      monthlyPrice: monthlyPrices.ultimate,
      yearlyPrice: 11000,
      savings: 988,
      checkoutUrl: {
        monthly: 'https://saasprojectreview.lemonsqueezy.com/checkout/buy/2c46c199-3fd3-4223-b63b-d06a1056d544',
        yearly: 'https://saasprojectreview.lemonsqueezy.com/checkout/buy/8aab7afb-e0e6-4862-afa3-626ce1fae247',
      },
      desc: t('pricing_ultimate_desc'),
      icon: <Crown size={24} />,
      color: '#11998e',
      gradient: 'linear-gradient(135deg, #11998e, #38ef7d)',
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
    <div 
      className="tarifs-page"
      style={{ '--mouse-x': `${mousePos.x}px`, '--mouse-y': `${mousePos.y}px` } as React.CSSProperties}
    >
      {/* Animated background */}
      <div className="tarifs-bg">
        <div className="tarifs-orb tarifs-orb-1"></div>
        <div className="tarifs-orb tarifs-orb-2"></div>
        <div className="tarifs-orb tarifs-orb-3"></div>
        <div className="tarifs-grid-overlay"></div>
      </div>

      {/* Navigation */}
      <nav className="tarifs-nav">
        <div className="tarifs-nav-inner">
          <button className="tarifs-logo" onClick={() => navigate('/')} aria-label="Accueil">
            <div className="tarifs-logo-icon">
              <QrCode size={22} color="white" />
            </div>
            <span className="tarifs-logo-text">QR CRM</span>
          </button>
          
          <div className="tarifs-nav-actions">
            <button className="tarifs-nav-btn" onClick={() => navigate('/login')}>
              <ArrowLeft size={16} />
              <span>{t('login')}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="tarifs-hero">
        <div className="tarifs-hero-content">
          <div className="tarifs-hero-badge">
            <Sparkles size={14} />
            <span>Plans & Pricing</span>
          </div>
          <h1 className="tarifs-hero-title">
            Choose your <span className="tarifs-gradient-text">perfect plan</span>
          </h1>
          <p className="tarifs-hero-subtitle">
            Digital menus, order-to-table, payments, delivery, and reservations all in one seamless ecosystem.
          </p>

          {/* Billing Toggle */}
          <div className="tarifs-billing-toggle">
            <span className={`toggle-label ${billingCycle === 'monthly' ? 'active' : ''}`}>Monthly</span>
            <div 
              className={`toggle-track ${billingCycle === 'yearly' ? 'active' : ''}`}
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            >
              <div className="toggle-thumb"></div>
            </div>
            <span className={`toggle-label ${billingCycle === 'yearly' ? 'active' : ''}`}>
              Yearly
            </span>
            <span className="save-badge">
              <Percent size={12} /> -20%
            </span>
            {billingCycle === 'yearly' && (
              <span className="best-value-badge">Best Value</span>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="tarifs-cards-section">
        <div className="tarifs-cards-container">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`tarifs-card ${plan.popular ? 'tarifs-card-popular' : ''}`}
            >
              {plan.popular && (
                <div className="tarifs-popular-ribbon">
                  <Star size={12} /> Most Popular
                </div>
              )}

              {/* Card Header */}
              <div className="tarifs-card-header">
                <div className="tarifs-card-icon" style={{ background: plan.gradient }}>
                  {plan.icon}
                </div>
                <h3 className="tarifs-plan-name">{plan.name}</h3>
                <p className="tarifs-plan-desc">{plan.desc}</p>
              </div>

              {/* Price */}
              <div className="tarifs-price-section">
                <span className="tarifs-currency">DH</span>
                <span className="tarifs-amount">{billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}</span>
                <span className="tarifs-period">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
              </div>

              {billingCycle === 'yearly' && (
                <div className="tarifs-save-tag">
                  <Percent size={14} />
                  <span>Économisez DH {plan.savings}/an</span>
                </div>
              )}

              {/* Features */}
              <ul className="tarifs-features-list">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className={`tarifs-feature-item ${feature.included ? '' : 'tarifs-feature-disabled'}`}>
                    <div className={`tarifs-feature-icon ${feature.included ? 'tarifs-feature-check' : 'tarifs-feature-x'}`}>
                      {feature.included ? <Check size={14} /> : <X size={14} />}
                    </div>
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button 
                className={`tarifs-cta-btn ${plan.popular ? 'tarifs-cta-primary' : 'tarifs-cta-secondary'}`}
                onClick={() => handleCheckout(plan)}
                style={plan.popular ? { background: plan.gradient } : {}}
              >
                <span>Get Started</span>
                <ArrowLeft size={16} className="tarifs-cta-arrow" style={{ transform: 'rotate(180deg)' }} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Download Section */}
      <section className="tarifs-download-section">
        <div className="tarifs-download-container">
          <div className="tarifs-download-badge">
            <Download size={14} />
            <span>Install App</span>
          </div>
          <h2 className="tarifs-download-title">
            Use QR CRM on <span className="tarifs-gradient-text">any device</span>
          </h2>
          <p className="tarifs-download-subtitle">
            Install our Progressive Web App for a native-like experience on your phone, tablet, or computer.
            No app store needed — works offline too.
          </p>

          <div className="tarifs-download-grid">
            <div className="tarifs-download-card">
              <div className="tarifs-download-card-icon">
                <Smartphone size={36} />
              </div>
              <h4>Mobile App</h4>
              <p>Install on Android or iOS directly from your browser. Works offline.</p>
              <ul className="tarifs-download-features">
                <li><Check size={14} /> Push notifications</li>
                <li><Check size={14} /> Offline mode</li>
                <li><Check size={14} /> Camera scanner</li>
                <li><Check size={14} /> Full dashboard</li>
              </ul>
              <button className="tarifs-download-btn" onClick={handleInstall}>
                <Smartphone size={18} />
                <span>Install Mobile App</span>
              </button>
            </div>

            <div className="tarifs-download-card tarifs-download-card-featured">
              <div className="tarifs-download-card-icon">
                <Monitor size={36} />
              </div>
              <h4>Desktop App</h4>
              <p>Install as a standalone app on Windows, Mac, or Linux. Ready in seconds.</p>
              <ul className="tarifs-download-features">
                <li><Check size={14} /> Multi-window</li>
                <li><Check size={14} /> Keyboard shortcuts</li>
                <li><Check size={14} /> Taskbar integration</li>
                <li><Check size={14} /> Auto-updates</li>
              </ul>
              <button className="tarifs-download-btn tarifs-download-btn-primary" onClick={handleInstall}>
                <Monitor size={18} />
                <span>Install Desktop App</span>
              </button>
            </div>
          </div>

          <p className="tarifs-download-note">
            No APK or .exe to download — the app installs directly from your browser.
            Look for the "Install" or "Add to Home Screen" option in your browser menu.
          </p>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="tarifs-trust-section">
        <div className="tarifs-trust-grid">
          <div className="tarifs-trust-item">
            <div className="tarifs-trust-icon">
              <Shield size={24} />
            </div>
            <h4>Secure & Reliable</h4>
            <p>99.9% uptime guarantee</p>
          </div>
          <div className="tarifs-trust-item">
            <div className="tarifs-trust-icon">
              <Globe size={24} />
            </div>
            <h4>99 Languages</h4>
            <p>Automatic translation</p>
          </div>
          <div className="tarifs-trust-item">
            <div className="tarifs-trust-icon">
              <BarChart3 size={24} />
            </div>
            <h4>Pro Analytics</h4>
            <p>Real-time insights</p>
          </div>
          <div className="tarifs-trust-item">
            <div className="tarifs-trust-icon">
              <Headphones size={24} />
            </div>
            <h4>24/7 Support</h4>
            <p>Always here to help</p>
          </div>
        </div>
      </section>
    </div>
  );
}
