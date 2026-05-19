import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode, ArrowRight, CheckCircle2, ChevronRight, Clock, Star, Smartphone, Monitor, Menu, X } from 'lucide-react';
import './LandingPage.css';

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.unobserve(el); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function useScrollNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return scrolled;
}

const FEATURES_DATA = [
  { id: 'orders', icon: <Smartphone size={24} />, titleKey: 'feature_2_title', bullets: ['feature_2_bullet_1', 'feature_2_bullet_2', 'feature_2_bullet_3', 'feature_2_bullet_4', 'feature_2_bullet_5'], size: 'large' },
  { id: 'delivery', icon: <Monitor size={24} />, titleKey: 'feature_3_title', bullets: ['feature_3_bullet_1', 'feature_3_bullet_2', 'feature_3_bullet_3', 'feature_3_bullet_4'], size: 'medium' },
  { id: 'reservation', icon: <Clock size={24} />, titleKey: 'feature_4_title', bullets: ['feature_4_bullet_1', 'feature_4_bullet_2', 'feature_4_bullet_3', 'feature_4_bullet_4', 'feature_4_bullet_5'], size: 'small' },
  { id: 'reviews', icon: <Star size={24} />, titleKey: 'feature_5_title', bullets: ['feature_5_bullet_1', 'feature_5_bullet_2', 'feature_5_bullet_3', 'feature_5_bullet_4'], size: 'small' },
  { id: 'collection', icon: <Monitor size={24} />, titleKey: 'feature_6_title', bullets: ['feature_6_bullet_1', 'feature_6_bullet_2', 'feature_6_bullet_3', 'feature_6_bullet_4', 'feature_6_bullet_5'], size: 'medium' },
  { id: 'mobile', icon: <Smartphone size={24} />, titleKey: 'feature_7_title', bullets: ['feature_7_bullet_1', 'feature_7_bullet_2', 'feature_7_bullet_3', 'feature_7_bullet_4', 'feature_7_bullet_5'], size: 'medium' },
];

function FeatureCard({ feature, t, index }: { feature: typeof FEATURES_DATA[0]; t: (key: string) => string; index: number }) {
  const { ref, inView } = useInView(0.1);
  return (
    <article ref={ref as React.Ref<HTMLDivElement>} className={`feature-card feature-card--${feature.size} ${inView ? 'in-view' : ''}`} style={{ transitionDelay: `${index * 80}ms` }}>
      <div className="feature-card-icon">
        {feature.icon}
      </div>
      <h3 className="feature-card-title">{t(feature.titleKey)}</h3>
      <ul className="feature-card-list">
        {feature.bullets.map((bk, i) => (
          t(bk) ? <li key={i}><CheckCircle2 size={14} /><span dangerouslySetInnerHTML={{ __html: t(bk).replace(/^([^:]+):/, '<strong>$1:</strong>') }} /></li> : null
        ))}
      </ul>
    </article>
  );
}

export function LandingPage() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled = useScrollNav();

  const { ref: heroRef, inView: heroInView } = useInView(0.01);
  const { ref: featuresRef, inView: featuresInView } = useInView(0.01);

  const handleInstall = useCallback(async () => {
    if (typeof Notification !== 'undefined') Notification.requestPermission();
    const prompt = (window as any).deferredPrompt;
    if (prompt) { prompt.prompt(); const { outcome } = await prompt.userChoice; if (outcome === 'accepted') console.log('accepted'); (window as any).deferredPrompt = null; }
    else alert(t('pwa_install_info', 'To install this app, please use your browser menu.'));
  }, [t]);

  const scrollTo = useCallback((id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="landing-page">
      {/* Grain overlay */}
      <div className="grain-overlay" aria-hidden="true" />

      {/* Navigation */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <div className="landing-nav-left">
            <div className="landing-logo">
              <QrCode size={22} />
              <span>QR CRM</span>
            </div>
            <div className="landing-nav-links">
              <button onClick={() => scrollTo('features')}>{t('features')}</button>
              <button onClick={() => scrollTo('how-it-works')}>{t('how_it_works')}</button>
              <a href="/tarifs" className="nav-link">{t('pricing')}</a>
            </div>
          </div>
          <div className="landing-nav-right">
            <a href="/login" className="landing-btn landing-btn--ghost desktop-only">{t('login')}</a>
            <a href="/tarifs" className="landing-btn landing-btn--primary desktop-only">{t('start_free')}</a>
            <button className="landing-btn landing-btn--icon mobile-only" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="landing-mobile-menu">
            <button onClick={() => scrollTo('features')}>{t('features')}</button>
            <button onClick={() => scrollTo('how-it-works')}>{t('how_it_works')}</button>
            <a href="/tarifs" className="nav-link">{t('pricing')}</a>
            <a href="/login" className="landing-btn landing-btn--ghost">{t('login')}</a>
            <a href="/tarifs" className="landing-btn landing-btn--primary">{t('start_free')}</a>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section ref={heroRef as React.Ref<HTMLDivElement>} className={`landing-hero ${heroInView ? 'in-view' : ''}`}>
        <div className="landing-hero-bg">
          <div className="hero-orb hero-orb--1" />
          <div className="hero-orb hero-orb--2" />
          <div className="hero-orb hero-orb--3" />
          <div className="hero-grid" />
        </div>
        <div className="landing-hero-content">
          <div className="landing-hero-text">
            <span className="hero-badge">{t('stat_languages', '99 Languages')}</span>
            <h1 className="hero-headline">
              <span className="hero-headline-accent">{t('hero_title')}</span>
            </h1>
            <p className="hero-subtitle">{t('hero_subtitle')}</p>
            <div className="hero-actions">
              <a href="/tarifs" className="landing-btn landing-btn--primary landing-btn--large">
                {t('start_free')} <ArrowRight size={18} />
              </a>
              <button onClick={() => scrollTo('how-it-works')} className="landing-btn landing-btn--ghost landing-btn--large">
                {t('how_it_works')} <ChevronRight size={16} />
              </button>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">99+</span>
                <span className="hero-stat-label">{t('stat_languages')}</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">+30%</span>
                <span className="hero-stat-label">{t('stat_turnover')}</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">0%</span>
                <span className="hero-stat-label">{t('stat_commissions')}</span>
              </div>
            </div>
          </div>
          <div className="landing-hero-visual">
            <div className="phone-mockup">
              <div className="phone-notch" />
              <div className="phone-screen">
                <div className="phone-status-bar">
                  <span>9:41</span>
                  <div className="phone-status-icons">
                    <div className="phone-signal" />
                    <div className="phone-wifi" />
                    <div className="phone-battery" />
                  </div>
                </div>
                <div className="phone-app">
                  <div className="phone-app-header">
                    <QrCode size={16} />
                    <span>QR CRM</span>
                  </div>
                  <div className="phone-menu-items">
                    {['Margherita', 'Pasta Carbonara', 'Caesar Salad', 'Tiramisu'].map((item, i) => (
                      <div key={i} className="phone-menu-item" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className="phone-menu-item-img" />
                        <div className="phone-menu-item-info">
                          <span className="phone-menu-item-name">{item}</span>
                          <span className="phone-menu-item-price">{[12, 14, 10, 8][i]}€</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="hero-visual-glow" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" ref={featuresRef as React.Ref<HTMLDivElement>} className={`landing-features ${featuresInView ? 'in-view' : ''}`}>
        <div className="landing-section-label">{t('features')}</div>
        <h2 className="landing-section-title">{t('features')}</h2>
        <p className="landing-section-desc">{t('hero_subtitle')}</p>
        <div className="features-bento">
          {FEATURES_DATA.map((f, i) => (
            <FeatureCard key={f.id} feature={f} t={t} index={i} />
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="landing-how">
        <div className="landing-section-label">{t('how_it_works')}</div>
        <h2 className="landing-section-title">{t('how_it_works')}</h2>
        <div className="how-steps">
          {[
            { num: '01', title: t('step_1'), desc: t('step_1_desc', 'Set up your digital menu in minutes') },
            { num: '02', title: t('step_2'), desc: t('step_2_desc', 'Customers scan and order from their phone') },
            { num: '03', title: t('step_3'), desc: t('step_3_desc', 'Receive orders and manage effortlessly') },
          ].map((step, i) => (
            <HowStep key={i} {...step} index={i} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="landing-cta-content">
          <span className="landing-section-label">{t('pricing')}</span>
          <h2 className="landing-section-title">Ready to get started?</h2>
          <p className="landing-section-desc">Choose the perfect plan for your business and start growing today.</p>
          <a href="/tarifs" className="landing-btn landing-btn--primary landing-btn--large">
            {t('pricing')} <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* Download */}
      <section className="landing-download">
        <div className="landing-section-label">{t('download_apps_title')}</div>
        <h2 className="landing-section-title">{t('download_apps_title')}</h2>
        <div className="download-grid">
          <div className="download-card">
            <Monitor size={40} />
            <h3>{t('download_pc_title')}</h3>
            <p>{t('download_pc_desc')}</p>
            <button className="landing-btn landing-btn--ghost" onClick={handleInstall}>{t('download_pc_title')}</button>
          </div>
          <div className="download-card download-card--featured">
            <Smartphone size={40} />
            <h3>{t('download_mobile_title')}</h3>
            <p>{t('download_mobile_desc')}</p>
            <button className="landing-btn landing-btn--primary" onClick={handleInstall}>{t('download_mobile_title')}</button>
          </div>
        </div>
      </section>

      {/* Footer */}
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
              <h4>{t('features')}</h4>
              <a href="/tarifs" className="footer-link">{t('pricing')}</a>
              <button onClick={() => scrollTo('how-it-works')}>{t('how_it_works')}</button>
            </div>
            <div className="landing-footer-group">
              <h4>Company</h4>
              <button onClick={() => scrollTo('features')}>{t('features')}</button>
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

function HowStep({ num, title, desc, index }: { num: string; title: string; desc: string; index: number }) {
  const { ref, inView } = useInView(0.3);
  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className={`how-step ${inView ? 'in-view' : ''}`} style={{ transitionDelay: `${index * 150}ms` }}>
      <div className="how-step-number">{num}</div>
      <div className="how-step-line" aria-hidden="true" />
      <h3 className="how-step-title">{title}</h3>
      <p className="how-step-desc">{desc}</p>
    </div>
  );
}
