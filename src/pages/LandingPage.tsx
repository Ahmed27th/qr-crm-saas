import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelector } from '../components/LanguageSelector';
import { QrCode, CreditCard, ShoppingBag, Calendar, Star, ArrowRight, Tablet, Smartphone, Monitor, CheckCircle2, Clock } from 'lucide-react';
import './LandingPage.css';

export function LandingPage() {
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');




  const handleInstall = async () => {
    // Also request notification permission when user interacts with install
    if (typeof Notification !== 'undefined') {
      Notification.requestPermission();
    }
    
    const prompt = (window as any).deferredPrompt;
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      (window as any).deferredPrompt = null;
    } else {
      alert(t('pwa_install_info', 'To install this app, please use your browser menu (e.g. "Add to Home Screen" or the Install icon in the address bar).'));
    }
  };

  const services = [
    {
      id: "menu",
      icon: <QrCode size={28} className="feature-icon" />,
      titleKey: "feature_1_title",
      bullets: ["feature_1_bullet_1", "feature_1_bullet_2", "feature_1_bullet_3", "feature_1_bullet_4", "feature_1_bullet_5"]
    },
    {
      id: "orders",
      icon: <CreditCard size={28} className="feature-icon" />,
      titleKey: "feature_2_title",
      bullets: ["feature_2_bullet_1", "feature_2_bullet_2", "feature_2_bullet_3", "feature_2_bullet_4", "feature_2_bullet_5"]
    },
    {
      id: "delivery",
      icon: <ShoppingBag size={28} className="feature-icon" />,
      titleKey: "feature_3_title",
      bullets: ["feature_3_bullet_1", "feature_3_bullet_2", "feature_3_bullet_3", "feature_3_bullet_4", "feature_3_bullet_5"]
    },
    {
      id: "reservation",
      icon: <Calendar size={28} className="feature-icon" />,
      titleKey: "feature_4_title",
      bullets: ["feature_4_bullet_1", "feature_4_bullet_2", "feature_4_bullet_3", "feature_4_bullet_4", "feature_4_bullet_5"]
    },
    {
      id: "reviews",
      icon: <Star size={28} className="feature-icon" />,
      titleKey: "feature_5_title",
      bullets: ["feature_5_bullet_1", "feature_5_bullet_2", "feature_5_bullet_3", "feature_5_bullet_4"]
    },
    {
      id: "collection",
      icon: <Tablet size={28} className="feature-icon" />,
      titleKey: "feature_6_title",
      bullets: ["feature_6_bullet_1", "feature_6_bullet_2", "feature_6_bullet_3", "feature_6_bullet_4", "feature_6_bullet_5"]
    },
    {
      id: "mobile",
      icon: <Smartphone size={28} className="feature-icon" />,
      titleKey: "feature_7_title",
      bullets: ["feature_7_bullet_1", "feature_7_bullet_2", "feature_7_bullet_3", "feature_7_bullet_4", "feature_7_bullet_5"]
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="glass-nav">
        <div className="container nav-container">
          <div className="logo-area">
            <div className="logo-icon hover-3d">
              <QrCode size={24} color="white" />
            </div>
            <span className="logo-text">QR CRM System</span>
          </div>
          
          <div className="nav-links desktop-only">
            <a href="#how-it-works" className="hover-underline">{t('how_it_works')}</a>
            <a href="#features" className="hover-underline">{t('features')}</a>
            <a href="#pricing" className="hover-underline">{t('pricing')}</a>
          </div>

          <div className="nav-actions">
            <LanguageSelector />
            <ThemeToggle />
            <a href="/login" className="btn btn-secondary desktop-only btn-3d">{t('login')}</a>
            <a href="#book" className="btn btn-primary btn-3d">{t('book_demo')}</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section perspective-container">
        <div className="hero-background">
          <div className="glow-orb primary animate-float"></div>
          <div className="glow-orb secondary animate-float-delayed"></div>
          <div className="grid-overlay"></div>
        </div>
        
        <div className="container hero-content animate-slide-up 3d-transform">
          <h1 className="hero-title">
            <span className="text-gradient">Hospitality OS</span><br/>
            {t('hero_title').replace('The Ultimate Digital Platform for Hospitality', '')}
          </h1>
          <p className="hero-subtitle">{t('hero_subtitle')}</p>
          <div className="hero-cta">
            <button className="btn-primary btn-3d px-6 py-2 rounded-full glow-effect">
              {t('start_free')} <ArrowRight size={20} className="ml-2 icon-bounce" />
            </button>
          </div>
          
          <div className="hero-stats gallery-3d">
            <div className="stat-card glass-card card-hover-3d tilt-effect">
              <div className="stat-value text-gradient">99</div>
              <div className="stat-label">{t('stat_languages')}</div>
            </div>
            <div className="stat-card glass-card card-hover-3d tilt-effect">
              <div className="stat-value text-gradient">+30%</div>
              <div className="stat-label">{t('stat_turnover')}</div>
            </div>
            <div className="stat-card glass-card card-hover-3d tilt-effect">
              <div className="stat-value text-gradient">0%</div>
              <div className="stat-label">{t('stat_commissions')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section perspective-container">
        <div className="container">
          <h2 className="section-title text-center mb-12 animate-fade-in">{t('features')}</h2>
          
          <div className="features-masonry">
            {services.map((service, idx) => (
              <div key={service.id} className={`feature-list-card glass-card card-hover-3d tilt-effect delay-${idx}`}>
                <div className="feature-header">
                  <div className={`feature-icon-wrapper pulse-animation delay-${idx}`}>
                    {service.icon}
                  </div>
                  <h3 className="feature-title text-gradient">{t(service.titleKey)}</h3>
                </div>
                <ul className="feature-bullets">
                  {service.bullets.map((bulletKey, i) => (
                    t(bulletKey) ? (
                      <li key={i} className="bullet-item">
                        <span className="bullet-dot"></span>
                        <span dangerouslySetInnerHTML={{ 
                          __html: t(bulletKey).replace(/^([^:]+):/, '<strong>$1:</strong>') 
                        }} />
                      </li>
                    ) : null
                  ))}
                </ul>
                <div className="feature-footer">
                  <button className="details-btn">
                    {t('details')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section perspective-container">
        <div className="container">
          <div className="section-header text-center mb-16">
            <h2 className="section-title text-gradient">{t('pricing')}</h2>
            <p className="section-subtitle">{t('hero_subtitle').split('.')[0]}</p>
            
            <div className="pricing-toggle-wrapper mt-8">
              <span className={`toggle-label ${billingCycle === 'monthly' ? 'active' : ''}`}>{t('pricing_monthly')}</span>
              <div 
                className={`pricing-toggle ${billingCycle === 'yearly' ? 'yearly' : ''}`}
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              >
                <div className="toggle-handle"></div>
              </div>
              <span className={`toggle-label ${billingCycle === 'yearly' ? 'active' : ''}`}>
                {t('pricing_yearly')} <span className="promo-badge">{t('pricing_promo')}</span>
              </span>
            </div>
          </div>

          <div className="pricing-grid">
            {/* Starter */}
            <div className="pricing-card glass-card card-hover-3d tilt-effect">
              <div className="pricing-badge">{t('pricing_starter_badge')}</div>
              <h3 className="plan-name">{t('pricing_starter_name')}</h3>
              <div className="plan-price">
                <span className="currency">DH</span>
                <span className="amount">
                  {billingCycle === 'monthly' 
                    ? t('pricing_starter_price') 
                    : Math.round(parseInt(t('pricing_starter_price')) * 0.8)}
                </span>
                <span className="period">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              <p className="plan-desc">{t('pricing_starter_desc')}</p>
              <ul className="plan-features">
                <li><CheckCircle2 size={16} /> {t('pricing_feature_menu')}</li>
                <li><CheckCircle2 size={16} /> {t('pricing_feature_reviews')}</li>
                <li><CheckCircle2 size={16} /> {t('pricing_feature_languages')}</li>
                <li className="disabled"><Clock size={16} /> {t('pricing_feature_orders')}</li>
                <li className="disabled"><Clock size={16} /> {t('pricing_feature_delivery')}</li>
              </ul>
              <button className="btn btn-secondary w-full">
                {t('pricing_choose', { plan: t('pricing_starter_name') })}
              </button>
            </div>

            {/* Pro */}
            <div className="pricing-card glass-card featured card-hover-3d tilt-effect">
              <div className="pricing-badge featured">{t('pricing_pro_badge')}</div>
              <h3 className="plan-name">{t('pricing_pro_name')}</h3>
              <div className="plan-price">
                <span className="currency">DH</span>
                <span className="amount">
                  {billingCycle === 'monthly' 
                    ? t('pricing_pro_price') 
                    : Math.round(parseInt(t('pricing_pro_price')) * 0.8)}
                </span>
                <span className="period">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              <p className="plan-desc">{t('pricing_pro_desc')}</p>
              <ul className="plan-features">
                <li><CheckCircle2 size={16} /> <strong>{t('pricing_starter_name')}</strong></li>
                <li><CheckCircle2 size={16} /> {t('pricing_feature_orders')}</li>
                <li><CheckCircle2 size={16} /> {t('pricing_feature_reservation')}</li>
                <li><CheckCircle2 size={16} /> {t('pricing_feature_analytics')}</li>
                <li className="disabled"><Clock size={16} /> {t('pricing_feature_mobile')}</li>
              </ul>
              <button className="btn btn-primary w-full glow-effect">
                {t('pricing_choose', { plan: t('pricing_pro_name') })}
              </button>
            </div>

            {/* Ultimate */}
            <div className="pricing-card glass-card card-hover-3d tilt-effect">
              <div className="pricing-badge">{t('pricing_ultimate_badge')}</div>
              <h3 className="plan-name">{t('pricing_ultimate_name')}</h3>
              <div className="plan-price">
                <span className="currency">DH</span>
                <span className="amount">
                  {billingCycle === 'monthly' 
                    ? t('pricing_ultimate_price') 
                    : Math.round(parseInt(t('pricing_ultimate_price')) * 0.8)}
                </span>
                <span className="period">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              <p className="plan-desc">{t('pricing_ultimate_desc')}</p>
              <ul className="plan-features">
                <li><CheckCircle2 size={16} /> <strong>{t('pricing_pro_name')}</strong></li>
                <li><CheckCircle2 size={16} /> {t('pricing_feature_delivery')}</li>
                <li><CheckCircle2 size={16} /> Tablette Point de Collecte</li>
                <li><CheckCircle2 size={16} /> {t('pricing_feature_mobile')}</li>
                <li><CheckCircle2 size={16} /> {t('pricing_feature_support')}</li>
              </ul>
              <button className="btn btn-secondary w-full">
                {t('pricing_choose', { plan: t('pricing_ultimate_name') })}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* App Download Section */}
      <section className="download-section perspective-container">
        <div className="container">
          <h2 className="section-title text-center mb-12 text-gradient">{t('download_apps_title')}</h2>
          <div className="download-grid">
            <div className="download-card glass-card card-hover-3d tilt-effect">
              <div className="download-icon-wrapper">
                <Monitor size={48} className="text-gradient" />
              </div>
              <h3 className="download-title">{t('download_pc_title')}</h3>
              <p className="download-desc">{t('download_pc_desc')}</p>
              <div className="download-actions">
                <button className="btn btn-secondary btn-3d w-full mb-2" onClick={handleInstall}>Windows .EXE</button>
                <button className="btn btn-secondary btn-3d w-full" onClick={handleInstall}>macOS .DMG</button>
              </div>
            </div>

            <div className="download-card glass-card card-hover-3d tilt-effect featured">
              <div className="download-icon-wrapper">
                <Smartphone size={48} className="text-white" />
              </div>
              <h3 className="download-title text-white">{t('download_mobile_title')}</h3>
              <p className="download-desc text-white/80">{t('download_mobile_desc')}</p>
              <div className="download-actions">
                <button className="btn btn-primary btn-3d w-full mb-2 glow-effect" onClick={handleInstall}>App Store</button>
                <button className="btn btn-primary btn-3d w-full glow-effect" onClick={handleInstall}>Google Play</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works-section perspective-container">
        <div className="container">
          <h2 className="section-title text-center mb-12">{t('how_it_works')}</h2>
          
          <div className="steps-container">
            <div className="step-item card-hover-3d">
              <div className="step-number floating-number">1</div>
              <h4 className="step-title">{t('step_1')}</h4>
            </div>
            <div className="step-connector animated-connector"></div>
            <div className="step-item card-hover-3d">
              <div className="step-number floating-number delay-1">2</div>
              <h4 className="step-title">{t('step_2')}</h4>
            </div>
            <div className="step-connector animated-connector"></div>
            <div className="step-item card-hover-3d">
              <div className="step-number floating-number delay-2">3</div>
              <h4 className="step-title">{t('step_3')}</h4>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="logo-area mb-4">
                <div className="logo-icon hover-3d">
                  <QrCode size={20} color="white" />
                </div>
                <span className="logo-text">QR CRM System</span>
              </div>
              <p className="text-tertiary">Empowering hospitality with intelligent digital tools.</p>
            </div>
            <div className="footer-links">
              <div className="link-group">
                <h4>Product</h4>
                <a href="#features" className="hover-underline">{t('features')}</a>
                <a href="#pricing" className="hover-underline">{t('pricing')}</a>
              </div>
              <div className="link-group">
                <h4>Company</h4>
                <a href="#contact" className="hover-underline">{t('contact')}</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="text-tertiary">© 2026 QR CRM SAAS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
