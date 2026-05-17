import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Plus, Minus, Search, Info, Flame, AlertCircle, X, Sparkles, HeartHandshake, Star, Clock, FileText, MapPin, Phone, ShoppingBag, Navigation, ChevronRight, User } from 'lucide-react';
import { DataStore } from '../dataStore';
import type { MenuItem, RestaurantProfile } from '../dataStore';
import './PublicMenu.css';


export function PublicMenu() {
  const { restaurantId } = useParams();
  const { t, i18n } = useTranslation();

  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [tipPercentage, setTipPercentage] = useState(15);
  const [modalState, setModalState] = useState<'checkout' | 'success' | 'review' | 'tracking'>('checkout');
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  
  const [orderType, setOrderType] = useState<'dine_in' | 'delivery'>('dine_in');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    building: '',
    floor: '',
    instructions: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const isRTL = i18n.language === 'ar' || i18n.language === 'ary';

  useEffect(() => {
    
    // Real-time profile subscription
    const unsubscribeProfile = DataStore.subscribeToProfile((p) => {
      setProfile(p);
    }, restaurantId);

    // Real-time menu subscription
    const unsubscribeMenu = DataStore.subscribeToMenu((m) => {
      setMenuItems(m);
      const cats = Array.from(new Set(m.map(item => item.category)));
      setCategories(cats);
      if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0]);
    }, restaurantId);

    return () => {
      unsubscribeProfile();
      unsubscribeMenu();
    };
  }, [restaurantId]);

  // Set HTML dir for RTL support
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [isRTL]);

  // Smart search: matches name, description, ingredients, allergens, calories
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null; // null = not in search mode
    return menuItems.filter(item => {
      const calStr = item.calories ? String(item.calories) : '';
      const allergenStr = item.allergens ? item.allergens.join(' ') : '';
      const ingredientStr = item.ingredients ? item.ingredients : '';
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        calStr.includes(q) ||
        allergenStr.toLowerCase().includes(q) ||
        ingredientStr.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, menuItems]);

  const displayItems = searchResults !== null
    ? searchResults
    : menuItems.filter(item => item.category === activeCategory);

  const upsellItems = menuItems.filter(item =>
    item.category === 'Drinks' || item.category === 'Desserts' || item.category === 'Boissons'
  ).slice(0, 2);

  const addToCart = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart(prev => {
      const next = { ...prev };
      if (next[id] > 1) next[id] -= 1;
      else delete next[id];
      return next;
    });
  };

  const cartTotalItems = Object.values(cart).reduce((s, c) => s + c, 0);
  const cartTotalPrice = Object.entries(cart).reduce((s, [id, c]) => {
    const item = menuItems.find(m => m.id === id);
    return s + (item?.price || 0) * c;
  }, 0);
  const tipAmount = cartTotalPrice * (tipPercentage / 100);
  const finalTotal = cartTotalPrice + tipAmount;

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    try {
      const orderId = '#' + Math.floor(1000 + Math.random() * 9000);
      await DataStore.addOrder({ 
        table: orderType === 'delivery' ? 'Livraison' : tableNumber, 
        items: cartTotalItems, 
        total: finalTotal,
        customerName: orderType === 'delivery' ? customerName : undefined,
        customerPhone: orderType === 'delivery' ? customerPhone : undefined,
        customerAddress: orderType === 'delivery' ? `${deliveryAddress.street}, Bât: ${deliveryAddress.building}, Etage: ${deliveryAddress.floor}` : undefined,
        deliveryInstructions: deliveryAddress.instructions,
        orderItems: Object.entries(cart).map(([id, qty]) => {
          const item = menuItems.find(m => m.id === id);
          return { name: item?.name || 'Inconnu', qty, price: item?.price || 0 };
        })
      }, restaurantId);
      setLastOrderId(orderId);
      setModalState('success');
      
      // Clear cart
      setCart({});

      // Simulate flow
      if (orderType === 'delivery') {
        setTimeout(() => setModalState('tracking'), 2500);
      } else {
        setTimeout(() => setModalState('review'), 2500);
      }
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Erreur lors de la validation de la commande. Veuillez réessayer.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDeliveryAddress(prev => ({ ...prev, street: `${position.coords.latitude}, ${position.coords.longitude}` }));
        },
        () => {
          alert("Impossible d'obtenir votre position. Veuillez autoriser l'accès au GPS ou saisir l'adresse manuellement.");
        }
      );
    } else {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
    }
  };

  const [deliveryStatus, setDeliveryStatus] = useState(0); // 0: Confirmed, 1: Preparing, 2: Picking up, 3: On the way, 4: Delivered
  
  useEffect(() => {
    if (modalState === 'tracking') {
      const interval = setInterval(() => {
        setDeliveryStatus(prev => (prev < 4 ? prev + 1 : prev));
      }, 8000);
      return () => clearInterval(interval);
    } else {
      setDeliveryStatus(0);
    }
  }, [modalState]);

  const deliveryStatusMessages = [
    "Commande confirmée",
    "Le chef prépare votre festin...",
    "Le livreur récupère votre commande",
    "En route vers vous !",
    "Bon appétit ! Votre commande est arrivée"
  ];

  const handleSubmitReview = async () => {
    if (reviewRating > 0) {
      setIsSubmittingReview(true);
      try {
        await DataStore.addReview(reviewRating, reviewComment, undefined, restaurantId);
        closeModal();
      } catch (error) {
        console.error("Error submitting review:", error);
        alert("Erreur lors de l'envoi de l'avis.");
      } finally {
        setIsSubmittingReview(false);
      }
    } else {
      closeModal();
    }
  };

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [estimatedDeliveryTime] = useState('25-35');

  const closeModal = () => {
    setIsCartOpen(false); setCart({}); setTableNumber('');
    setModalState('checkout'); setReviewRating(0); setReviewComment('');
  };


  return (
    <div className="public-menu-container" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top Nav */}
      <div className="public-menu-top-nav">
        {/* Search Bar */}
        <div className="menu-search-bar">
          <Search size={16} className="menu-search-icon" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="menu-search-input"
          />
          {searchQuery && (
            <button className="menu-search-clear" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

      </div>

      {/* Hero Section */}
      <div className="menu-hero">
        <div className="menu-cover" style={{ backgroundImage: `url(${profile?.coverImage})` }}>
          <div className="menu-cover-overlay" />
        </div>
        <div className="menu-header-info">
          <img src={profile?.logo} alt="Logo" className="menu-logo" />
          <h1 className="menu-restaurant-name">{profile?.name}</h1>
          <p className="menu-restaurant-desc">{profile?.description}</p>
          <div className="menu-restaurant-meta">
            <span className="meta-badge" onClick={() => setIsInfoOpen(true)} style={{ cursor: 'pointer' }}>
              <Info size={14} /> {t('settings_about')}
            </span>
          </div>
        </div>
      </div>

      {/* Categories — hidden when searching */}
      {!searchQuery && (
        <div className="menu-categories-wrapper">
          <div className="menu-categories">
            {categories.map(cat => (
              <button key={cat} className={`category-btn ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search result header */}
      {searchQuery && (
        <div style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
          {displayItems.length === 1 
            ? t('search_results_count_single', { query: searchQuery }) 
            : t('search_results_count', { count: displayItems.length, query: searchQuery })}
        </div>
      )}

      {/* Menu Items */}
      <div className="menu-items-container">
        {displayItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
            <Search size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>{t('no_results')}</p>
          </div>
        )}
        {displayItems.map(item => (
          <div key={item.id} className="menu-item-card glass-panel">
            <div className="item-details">
              {item.popular && <span className="popular-badge">{t('popular_tag')}</span>}
              <h3 className="item-name">{item.name}</h3>
              <p className="item-desc">{item.description}</p>

              {(item.calories || (item.allergens && item.allergens.length > 0)) && (
                <div className="item-health-meta">
                  {item.calories && <span className="health-tag calories"><Flame size={12} /> {item.calories} kcal</span>}
                  {item.allergens && item.allergens.length > 0 && (
                    <span className="health-tag allergens"><AlertCircle size={12} /> {item.allergens.join(', ')}</span>
                  )}
                </div>
              )}

              <div className="item-price-row">
                <span className="item-price">{item.price.toFixed(2)} DH</span>
                {item.available ? (
                  cart[item.id] ? (
                    <div className="quantity-controls">
                      <button onClick={e => removeFromCart(item.id, e)} className="qty-btn minus"><Minus size={16} /></button>
                      <span className="qty-count">{cart[item.id]}</span>
                      <button onClick={e => addToCart(item.id, e)} className="qty-btn plus"><Plus size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={e => addToCart(item.id, e)} className="add-btn"><Plus size={18} /> {t('add_to_cart')}</button>
                  )
                ) : (
                  <span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>{t('sold_out')}</span>
                )}
              </div>
            </div>
            <div className="item-image" style={{ backgroundImage: `url(${item.image})` }} />
          </div>
        ))}
      </div>

      {/* Floating Cart */}
      {cartTotalItems > 0 && !isCartOpen && (
        <div className="floating-cart-wrapper">
          <button className="floating-cart-btn glow-effect" onClick={() => setIsCartOpen(true)}>
            <div className="cart-icon-group">
              <ShoppingCart size={20} />
              <span className="cart-badge">{cartTotalItems}</span>
            </div>
            <span className="cart-text">{t('your_order')}</span>
            <span className="cart-total">{cartTotalPrice.toFixed(2)} DH</span>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="cart-modal-overlay">
          <div className="cart-modal">
            {modalState === 'success' && (
              <div className="success-state">
                <div className="success-icon"><HeartHandshake size={48} /></div>
                <h2>{t('order_sent')}</h2>
                <p>{t('order_success_msg', { table: tableNumber || '?' })}</p>
              </div>
            )}

            {modalState === 'review' && (
              <div className="review-state">
                <button className="close-btn absolute right-4 top-4" onClick={closeModal}><X size={24} /></button>
                <h2>{t('experience_question')}</h2>
                <p className="text-tertiary">{t('feedback_improve')}</p>
                <div className="star-rating-input">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} className={`star-btn ${star <= reviewRating ? 'active' : ''}`} onClick={() => setReviewRating(star)}>
                      <Star size={36} fill={star <= reviewRating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
                {reviewRating > 0 && (
                  <div className="review-feedback">
                    <textarea placeholder={t('feedback_placeholder')} value={reviewComment} onChange={e => setReviewComment(e.target.value)} className="review-textarea" />
                    <button 
                      className="btn btn-primary w-full mt-4" 
                      onClick={handleSubmitReview}
                      disabled={isSubmittingReview}
                      style={{ opacity: isSubmittingReview ? 0.7 : 1 }}
                    >
                      {isSubmittingReview ? "Envoi..." : t('submit_review')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {modalState === 'tracking' && (
              <div className="tracking-state">
                <button className="close-btn absolute right-4 top-4 z-20" onClick={closeModal}><X size={24} /></button>
                
                <div className="tracking-header">
                  <div className="pulsing-dot"></div>
                  <h2>Suivi en temps réel</h2>
                  <p className="order-id">Commande {lastOrderId}</p>
                </div>

                {/* Mock Live Map */}
                <div className="mock-map-container">
                  <div className="map-placeholder">
                    <div className="map-route-line"></div>
                    <div className="map-marker restaurant">
                      <div className="marker-icon"><ShoppingBag size={14} /></div>
                      <span className="marker-label">Restaurant</span>
                    </div>
                    <div className="map-marker driver animate-move-on-path">
                      <div className="marker-icon"><Navigation size={14} /></div>
                    </div>
                    <div className="map-marker client">
                      <div className="marker-icon"><MapPin size={14} /></div>
                      <span className="marker-label">Vous</span>
                    </div>
                  </div>
                  <div className="delivery-eta-overlay">
                    <Clock size={16} />
                    <span>Arrivée prévue dans <strong>{estimatedDeliveryTime} min</strong></span>
                  </div>
                </div>

                <div className="tracking-status-badge">
                  {deliveryStatusMessages[deliveryStatus]}
                </div>

                <div className="tracking-timeline-modern">
                  <div className={`timeline-step ${deliveryStatus >= 1 ? 'done' : 'active'}`}>
                    <div className="step-circle">{deliveryStatus >= 1 ? <Plus size={12} style={{ transform: 'rotate(45deg)' }} /> : <div className="inner-dot"></div>}</div>
                    <span className="step-label">Confirmée</span>
                  </div>
                  <div className={`timeline-step ${deliveryStatus >= 2 ? 'done' : deliveryStatus === 1 ? 'active' : ''}`}>
                    <div className="step-circle">{deliveryStatus >= 2 ? <Plus size={12} style={{ transform: 'rotate(45deg)' }} /> : deliveryStatus === 1 ? <div className="inner-dot"></div> : null}</div>
                    <span className="step-label">Cuisine</span>
                  </div>
                  <div className={`timeline-step ${deliveryStatus >= 3 ? 'done' : deliveryStatus === 2 ? 'active' : ''}`}>
                    <div className="step-circle">{deliveryStatus >= 3 ? <Plus size={12} style={{ transform: 'rotate(45deg)' }} /> : deliveryStatus === 2 ? <div className="inner-dot"></div> : null}</div>
                    <span className="step-label">Collecte</span>
                  </div>
                  <div className={`timeline-step ${deliveryStatus >= 4 ? 'done' : deliveryStatus === 3 ? 'active' : ''}`}>
                    <div className="step-circle">{deliveryStatus >= 4 ? <Plus size={12} style={{ transform: 'rotate(45deg)' }} /> : deliveryStatus === 3 ? <div className="inner-dot"></div> : null}</div>
                    <span className="step-label">Livraison</span>
                  </div>
                </div>

                <div className="driver-info-compact">
                  <div className="driver-avatar">
                    <User size={20} />
                  </div>
                  <div className="driver-details">
                    <p className="driver-name">Yassine B.</p>
                    <p className="driver-meta"><Star size={10} fill="currentColor" /> 4.9 • Votre livreur</p>
                  </div>
                  <button className="contact-driver-btn">
                    <Phone size={18} />
                  </button>
                </div>

                <button className="btn btn-secondary w-full mt-6" onClick={() => setModalState('review')}>Donner mon avis</button>
              </div>
            )}

            {modalState === 'checkout' && (
              <>
                <div className="cart-modal-header">
                  <h2>{t('your_order')}</h2>
                  <button className="close-btn" onClick={closeModal}><X size={24} /></button>
                </div>
                <div className="cart-modal-body">
                  <div className="order-type-tabs">
                    <button 
                      className={`order-type-tab ${orderType === 'dine_in' ? 'active' : ''}`}
                      onClick={() => setOrderType('dine_in')}
                    >
                      <ShoppingCart size={18} />
                      <span>Sur place</span>
                    </button>
                    <button 
                      className={`order-type-tab ${orderType === 'delivery' ? 'active' : ''}`}
                      onClick={() => setOrderType('delivery')}
                    >
                      <MapPin size={18} />
                      <span>Livraison</span>
                    </button>
                  </div>

                  {orderType === 'dine_in' ? (
                    <div className="table-input-section">
                      <label>{t('seating_question')}</label>
                      <input type="number" placeholder={t('table_placeholder')} value={tableNumber} onChange={e => setTableNumber(e.target.value)} className="table-number-input" />
                    </div>
                  ) : (
                    <div className="delivery-input-section">
                      <div className="input-group-modern">
                        <User size={16} className="group-icon" />
                        <input type="text" placeholder="Nom Complet" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                      </div>
                      <div className="input-group-modern">
                        <Phone size={16} className="group-icon" />
                        <input type="tel" placeholder="Téléphone (Ex: 06...)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                      </div>
                      <div className="address-grid-modern">
                        <div className="input-group-modern street">
                          <MapPin size={16} className="group-icon" />
                          <input type="text" placeholder="Rue / Quartier" value={deliveryAddress.street} onChange={e => setDeliveryAddress({...deliveryAddress, street: e.target.value})} />
                        </div>
                        <div className="input-group-modern building">
                          <input type="text" placeholder="Bât / Villa" value={deliveryAddress.building} onChange={e => setDeliveryAddress({...deliveryAddress, building: e.target.value})} />
                        </div>
                        <div className="input-group-modern floor">
                          <input type="text" placeholder="Etage / Appt" value={deliveryAddress.floor} onChange={e => setDeliveryAddress({...deliveryAddress, floor: e.target.value})} />
                        </div>
                        <div className="input-group-modern instructions full">
                          <textarea placeholder="Instructions (ex: Code porte, sonner à gauche...)" value={deliveryAddress.instructions} onChange={e => setDeliveryAddress({...deliveryAddress, instructions: e.target.value})} rows={1} />
                        </div>
                      </div>
                      <button 
                        onClick={handleGetLocation}
                        className="location-btn-modern"
                      >
                        <Navigation size={14} /> Utiliser ma position GPS
                      </button>

                      <div className="payment-method-selector mt-4">
                        <p className="section-label">Mode de paiement</p>
                        <div className="payment-options">
                          <button 
                            className={`payment-opt ${paymentMethod === 'cash' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('cash')}
                          >
                            <div className="opt-circle"></div>
                            <div className="opt-label-group">
                              <span className="opt-title">Espèces</span>
                              <span className="opt-subtitle">Payer à la livraison</span>
                            </div>
                          </button>
                          <button 
                            className={`payment-opt ${paymentMethod === 'card' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('card')}
                          >
                            <div className="opt-circle"></div>
                            <div className="opt-label-group">
                              <span className="opt-title">Carte / Apple Pay</span>
                              <span className="opt-subtitle">Sécurisé & Rapide</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="cart-summary-list">
                    <div className="summary-header">Détails de la commande</div>
                    {Object.entries(cart).map(([id, count]) => {
                      const item = menuItems.find(m => m.id === id);
                      if (!item) return null;
                      return (
                        <div key={id} className="cart-summary-item">
                          <div className="summary-item-info">
                            <span className="summary-qty">{count}x</span>
                            <span className="summary-name">{item.name}</span>
                          </div>
                          <span className="summary-price">{(item.price * count).toFixed(2)} DH</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="upsell-section">
                    <h4><Sparkles size={16} className="text-gradient" /> {t('complete_meal')}</h4>
                    <p className="upsell-subtitle">{t('perfect_pairings')}</p>
                    <div className="upsell-items-scroll">
                      {upsellItems.map(item => (
                        <div key={item.id} className="upsell-card">
                          <div className="upsell-img" style={{ backgroundImage: `url(${item.image})` }} />
                          <div className="upsell-info">
                            <span className="upsell-name">{item.name}</span>
                            <span className="upsell-price">{item.price.toFixed(2)} DH</span>
                          </div>
                          <button className="upsell-add-btn" onClick={() => addToCart(item.id)}><Plus size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="tipping-section">
                    <h4>{t('leave_tip')}</h4>
                    <div className="tip-options">
                      {[10, 15, 20].map(pct => (
                        <button key={pct} className={`tip-btn ${tipPercentage === pct ? 'active' : ''}`} onClick={() => setTipPercentage(pct)}>{pct}%</button>
                      ))}
                      <button className={`tip-btn ${tipPercentage === 0 ? 'active' : ''}`} onClick={() => setTipPercentage(0)}>{t('tip_none')}</button>
                    </div>
                  </div>
                </div>
                <div className="cart-modal-footer">
                  <div className="totals-breakdown">
                    <div className="total-row">
                      <span className="total-label">{t('subtotal')}</span>
                      <span className="total-val">{cartTotalPrice.toFixed(2)} DH</span>
                    </div>
                    {orderType === 'delivery' && (
                      <div className="total-row">
                        <span className="total-label">Frais de livraison</span>
                        <span className="total-val">15.00 DH</span>
                      </div>
                    )}
                    {tipAmount > 0 && (
                      <div className="total-row text-success">
                        <span className="total-label">{t('tip_label')} ({tipPercentage}%)</span>
                        <span className="total-val">+{tipAmount.toFixed(2)} DH</span>
                      </div>
                    )}
                    <div className="total-row final">
                      <span>{t('total_label')}</span>
                      <span className="final-price">{(finalTotal + (orderType === 'delivery' ? 15 : 0)).toFixed(2)} DH</span>
                    </div>
                  </div>
                    <button 
                      className="btn btn-primary place-order-btn-swipe" 
                      onClick={handlePlaceOrder} 
                      disabled={isPlacingOrder || (orderType === 'dine_in' ? !tableNumber : (!customerName || !customerPhone || !deliveryAddress.street))}
                      style={{ opacity: isPlacingOrder ? 0.7 : 1 }}
                    >
                      <div className="swipe-shimmer"></div>
                      <span className="btn-text">
                        {isPlacingOrder 
                          ? "Traitement..."
                          : orderType === 'dine_in' 
                            ? (!tableNumber ? t('enter_table_to_order') : t('send_to_kitchen'))
                            : (!customerName || !customerPhone || !deliveryAddress.street ? 'Informations manquantes' : 'Confirmer & Commander')
                        }
                      </span>
                      <ChevronRight className="swipe-icon" size={20} />
                    </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Info Modal */}
      {isInfoOpen && (
        <div className="cart-modal-overlay">
          <div className="cart-modal" style={{ padding: '2rem' }}>
            <button className="close-btn absolute right-4 top-4" onClick={() => setIsInfoOpen(false)}><X size={24} /></button>
            <h2 className="text-2xl font-black mb-6 text-gradient">{t('settings_about')}</h2>
            
            <div className="info-section mb-6">
              <h4 className="text-accent mb-2 flex items-center gap-2"><Clock size={16} /> {t('settings_hours')}</h4>
              <p className="text-primary font-medium">{profile?.openingHours || 'Non spécifié'}</p>
            </div>

            <div className="info-section mb-6">
              <h4 className="text-accent mb-2 flex items-center gap-2"><FileText size={16} /> {t('settings_desc')}</h4>
              <p className="text-primary leading-relaxed">{profile?.aboutInfo || profile?.description}</p>
              {profile?.aboutImage && (
                <img src={profile.aboutImage} alt="About" className="w-full h-48 object-cover rounded-xl mt-4 shadow-lg" />
              )}
            </div>

            <button className="btn btn-primary w-full mt-4" onClick={() => setIsInfoOpen(false)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
