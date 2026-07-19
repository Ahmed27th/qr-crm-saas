import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ShoppingCart, Plus, Minus, Search, Info, Flame, AlertCircle, X, Sparkles, HeartHandshake, Star, Clock, FileText, ChevronRight, Home, UtensilsCrossed, Truck, MapPin } from 'lucide-react';
import { DataStore } from '../dataStore';
import type { MenuItem, RestaurantProfile } from '../dataStore';
import { formatPrice } from '../utils/format';
import './PublicMenu.css';


export function PublicMenu() {
  const { restaurantId } = useParams();
  const { t, i18n } = useTranslation();

  const subscription = useQuery(api.subscriptions.getSubscription, { userId: restaurantId || '' });
  const canDeliver = subscription?.planId === 'ultimate';

  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [userOrderMode, setUserOrderMode] = useState<'dinein' | 'delivery'>('dinein');
  const orderMode = !canDeliver ? 'dinein' : userOrderMode;
  const setOrderMode = (mode: 'dinein' | 'delivery') => setUserOrderMode(mode);
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [tipPercentage, setTipPercentage] = useState(0);
  const [modalState, setModalState] = useState<'checkout' | 'success' | 'review'>('checkout');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

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
    (item.category === 'Drinks' || item.category === 'Desserts' || item.category === 'Boissons') && !cart[item.id]
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
      let newOrderId: string | undefined;
      if (orderMode === 'delivery') {
        newOrderId = await DataStore.addOrder({ 
          table: 'Livraison',
          items: cartTotalItems, 
          total: finalTotal,
          customerName: deliveryName,
          customerPhone: deliveryPhone,
          customerAddress: deliveryAddress,
          deliveryInstructions: deliveryTime ? `${deliveryTime} - ${deliveryInstructions}` : deliveryInstructions,
          orderItems: Object.entries(cart).map(([id, qty]) => {
            const item = menuItems.find(m => m.id === id);
            return { name: item?.name || 'Inconnu', qty, price: item?.price || 0 };
          })
        }, restaurantId);
      } else {
        newOrderId = await DataStore.addOrder({ 
          table: tableNumber, 
          items: cartTotalItems, 
          total: finalTotal,
          orderItems: Object.entries(cart).map(([id, qty]) => {
            const item = menuItems.find(m => m.id === id);
            return { name: item?.name || 'Inconnu', qty, price: item?.price || 0 };
          })
        }, restaurantId);
      }
      if (newOrderId) setLastOrderId(newOrderId);
      
      // Sync order to Worker D1 so ChefDashboard can see it
      try {
        const workerUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8787";
        await fetch(`${workerUrl}/api/add-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId,
            table: orderMode === 'dinein' ? tableNumber : 'Livraison',
            items: cartTotalItems,
            total: finalTotal,
            orderItems: Object.entries(cart).map(([id, qty]) => {
              const item = menuItems.find(m => m.id === id);
              return { name: item?.name || 'Inconnu', qty, price: item?.price || 0 };
            }),
            source: 'qr',
            customerName: orderMode === 'delivery' ? deliveryName : undefined,
            customerPhone: orderMode === 'delivery' ? deliveryPhone : undefined,
            customerAddress: orderMode === 'delivery' ? deliveryAddress : undefined,
            deliveryInstructions: orderMode === 'delivery'
              ? (deliveryTime ? `${deliveryTime} - ${deliveryInstructions}` : deliveryInstructions)
              : undefined,
          }),
        });
      } catch (err) {
        console.error('Failed to sync order to Worker:', err);
      }
      
      setModalState('success');
      
      // Clear cart
      setCart({});

      // Simulate flow
      setTimeout(() => setModalState('review'), 2500);
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Erreur lors de la validation de la commande. Veuillez réessayer.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

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

  const closeModal = () => {
    setIsCartOpen(false); setTableNumber('');
    setDeliveryName(''); setDeliveryPhone(''); setDeliveryAddress('');
    setDeliveryTime(''); setDeliveryInstructions('');
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
            aria-label={t('search_placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="menu-search-input"
          />
          {searchQuery && (
            <button className="menu-search-clear" onClick={() => setSearchQuery('')} aria-label="Effacer la recherche">
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
            <button className="meta-badge" onClick={() => setIsInfoOpen(true)}>
              <Info size={14} /> {t('settings_about')}
            </button>
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
                <span className="item-price">{formatPrice(item.price)}</span>
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
            <span className="cart-total">{formatPrice(cartTotalPrice)}</span>
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
                  {orderMode === 'delivery' ? (
                    <>
                      <p>Votre commande est en cours de préparation !</p>
                      {lastOrderId && (
                        <a href={`/track/${lastOrderId}`} className="btn btn-primary mt-4" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '12px', textDecoration: 'none' }}>
                          <Truck size={18} /> Suivre ma livraison
                        </a>
                      )}
                    </>
                  ) : (
                    <p>{t('order_success_msg', { table: tableNumber || '?' })}</p>
                  )}
                </div>
            )}

            {modalState === 'review' && (
              <div className="review-state">
                <button className="close-btn absolute right-4 top-4" onClick={closeModal} aria-label="Fermer"><X size={24} /></button>
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



            {modalState === 'checkout' && (
              <>
                <div className="cart-modal-header">
                  <h2>{t('your_order')}</h2>
                  <button className="close-btn" onClick={closeModal} aria-label="Fermer"><X size={24} /></button>
                </div>
                <div className="cart-modal-body">
                  {/* Mode Selection */}
                  <div className="checkout-mode-selector">
                    <button
                      className={`checkout-mode-btn ${orderMode === 'dinein' ? 'active' : ''}`}
                      onClick={() => setOrderMode('dinein')}
                    >
                      <UtensilsCrossed size={20} />
                      <span>Sur place</span>
                    </button>
                    {canDeliver && (
                      <button
                        className={`checkout-mode-btn ${orderMode === 'delivery' ? 'active' : ''}`}
                        onClick={() => setOrderMode('delivery')}
                      >
                        <Home size={20} />
                        <span>Livraison</span>
                      </button>
                    )}
                  </div>

                  {orderMode === 'dinein' ? (
                    <div className="table-input-section">
                      <label>{t('seating_question')}</label>
                      <input type="number" placeholder={t('table_placeholder')} value={tableNumber} onChange={e => setTableNumber(e.target.value)} className="table-number-input" />
                    </div>
                  ) : (
                    <div className="delivery-form-section">
                      <div className="delivery-form-group">
                        <label>Nom complet</label>
                        <input type="text" placeholder="Votre nom" value={deliveryName} onChange={e => setDeliveryName(e.target.value)} className="delivery-input" />
                      </div>
                      <div className="delivery-form-group">
                        <label>Téléphone</label>
                        <input type="tel" placeholder="06 XX XX XX XX" value={deliveryPhone} onChange={e => setDeliveryPhone(e.target.value)} className="delivery-input" />
                      </div>
                      <div className="delivery-form-group">
                        <label>Adresse de livraison</label>
                        <textarea placeholder="Numéro, rue, quartier, ville..." value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="delivery-textarea" rows={3} />
                        <button
                          type="button"
                          className="btn btn-secondary w-full mt-2 py-2 flex items-center justify-center gap-2 text-xs font-bold"
                          onClick={() => {
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                (pos) => {
                                  const { latitude, longitude } = pos.coords;
                                  const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                                  window.open(mapsUrl, '_blank');
                                  setDeliveryAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                                },
                                () => alert("Activez la localisation dans votre navigateur")
                              );
                            } else {
                              alert("Géolocalisation non supportée");
                            }
                          }}
                        >
                          <MapPin size={14} /> Utiliser ma position
                        </button>
                      </div>
                      <div className="delivery-form-row">
                        <div className="delivery-form-group">
                          <label>Heure souhaitée</label>
                          <input type="time" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} className="delivery-input" />
                        </div>
                        <div className="delivery-form-group">
                          <label>Mode de paiement</label>
                          <select className="delivery-input" defaultValue="">
                            <option value="" disabled>Choisir</option>
                            <option value="cash">Espèces (à la livraison)</option>
                            <option value="card">Carte bancaire (à la livraison)</option>
                          </select>
                        </div>
                      </div>
                      <div className="delivery-form-group">
                        <label>Instructions (optionnel)</label>
                        <input type="text" placeholder="Code d'accès, étage, interphone..." value={deliveryInstructions} onChange={e => setDeliveryInstructions(e.target.value)} className="delivery-input" />
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
                          <span className="summary-price">{formatPrice(item.price * count)}</span>
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
                            <span className="upsell-price">{formatPrice(item.price)}</span>
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
                      <span className="total-val">{formatPrice(cartTotalPrice)}</span>
                    </div>
                    {tipAmount > 0 && (
                      <div className="total-row text-success">
                        <span className="total-label">{t('tip_label')} ({tipPercentage}%)</span>
                        <span className="total-val">+{formatPrice(tipAmount)}</span>
                      </div>
                    )}
                    <div className="total-row final">
                      <span>{t('total_label')}</span>
                      <span className="final-price">{formatPrice(finalTotal)}</span>
                    </div>
                  </div>
                    <button 
                      className="btn btn-primary place-order-btn-swipe" 
                      onClick={handlePlaceOrder} 
                      disabled={isPlacingOrder || (orderMode === 'dinein' ? !tableNumber : !deliveryName || !deliveryPhone || !deliveryAddress)}
                      style={{ opacity: isPlacingOrder ? 0.7 : 1 }}
                    >
                      <div className="swipe-shimmer"></div>
                      <span className="btn-text">
                        {isPlacingOrder 
                          ? "Traitement..."
                          : orderMode === 'dinein' 
                            ? (!tableNumber ? t('enter_table_to_order') : t('send_to_kitchen'))
                            : (!deliveryName || !deliveryPhone || !deliveryAddress) ? "Remplissez les champs" : "Commander la livraison"
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
            <button className="close-btn absolute right-4 top-4" onClick={() => setIsInfoOpen(false)} aria-label="Fermer"><X size={24} /></button>
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
