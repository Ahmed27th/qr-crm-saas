import { convex } from './convexClient';
import { api } from '../convex/_generated/api';

export interface OrderItem {
  name: string;
  qty: number;
  price?: number;
}

export interface Order {
  id: string;
  table: string;
  items: number;
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'delivered' | 'cancelled';
  time: number;
  source: 'qr' | 'ubereats' | 'glovo';
  orderItems?: OrderItem[];
  driverId?: string;
  serverId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryInstructions?: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  time: number;
  status: 'pending' | 'approved' | 'rejected' | 'published_google' | 'internal_resolved';
  userName?: string;
}

export interface MenuItem {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  image: string;
  popular?: boolean;
  available: boolean;
  calories?: number;
  allergens?: string[];
  ingredients?: string;
}

export interface RestaurantProfile {
  id?: string;
  name: string;
  description: string;
  coverImage: string;
  logo: string;
  aboutInfo?: string;
  aboutImage?: string;
  openingHours?: string;
  googleReviewUrl?: string;
}

export interface Reservation {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  date: string;
  time: string;
  guests: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  createdAt: number;
}

export interface Driver {
  id: string;
  name: string;
  status: 'available' | 'busy' | 'offline';
  phone: string;
  activeOrders: number;
}

export interface Subscription {
  id?: string;
  userId: string;
  email?: string;
  planId: 'starter' | 'pro' | 'ultimate';
  billingPeriod: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  currentPeriodEnd: number;
}

// Fallback UID if no auth is set up yet
let _stableRestaurantId: string | null = null;

export const setStableRestaurantId = (id: string) => {
  _stableRestaurantId = id;
  localStorage.setItem('qr_restaurant_id', id);
};

const getRestaurantId = () => {
  if (_stableRestaurantId) return _stableRestaurantId;
  let id = localStorage.getItem('qr_restaurant_id');
  if (!id) {
    id = 'rest_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('qr_restaurant_id', id);
  }
  return id;
};

const makeSafeUnsubscribe = (unsub: () => void) => {
  let called = false;
  return () => {
    if (!called) {
      called = true;
      unsub();
    }
  };
};

export const DataStore = {
  // --- ORDERS ---
  getOrders: async (restaurantId?: string): Promise<Order[]> => {
    const resId = restaurantId || await getRestaurantId();
    if (!resId) return [];
    
    const results = await convex.query(api.orders.getByRestaurant, { restaurantId: resId });
    return results.map(d => ({
      id: d._id,
      table: d.table,
      items: d.items,
      total: d.total,
      status: d.status as any,
      time: d.createdAt,
      source: d.source as any,
      orderItems: d.orderItems,
      driverId: d.driverId,
      serverId: d.serverId,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      customerAddress: d.customerAddress,
      deliveryInstructions: d.deliveryInstructions
    }));
  },

  subscribeToOrders: (callback: (orders: Order[]) => void, restaurantId?: string) => {
    const resId = restaurantId || getRestaurantId() || 'demo';
    const unsub = convex.onUpdate(api.orders.getByRestaurant, { restaurantId: resId }, (results: any) => {
      callback(results.map((d: any) => ({
        id: d._id,
        table: d.table,
        items: d.items,
        total: d.total,
        status: d.status as any,
        time: d.createdAt,
        source: d.source as any,
        orderItems: d.orderItems,
        driverId: d.driverId,
        customerName: d.customerName,
        customerPhone: d.customerPhone,
        customerAddress: d.customerAddress,
        deliveryInstructions: d.deliveryInstructions
      })));
    });
    return makeSafeUnsubscribe(unsub);
  },

  addOrder: async (order: Omit<Order, 'id' | 'time' | 'status' | 'source'>, restaurantId?: string): Promise<string | undefined> => {
    const resId = restaurantId || await getRestaurantId();
    if (!resId) return;
    
    const orderId = await convex.mutation(api.orders.add, {
      restaurantId: resId,
      table: order.table,
      items: order.items,
      total: order.total,
      status: 'pending',
      source: 'qr',
      orderItems: (order.orderItems || []).map(item => ({
        name: item.name,
        qty: item.qty,
        price: item.price || 0
      })),
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      deliveryInstructions: order.deliveryInstructions
    });
    return orderId;
  },

  updateOrderStatus: async (id: string, status: Order['status'], _restaurantId?: string) => {
    await convex.mutation(api.orders.updateStatus, { id: id as any, status });
  },

  claimOrder: async (id: string, serverId: string) => {
    await convex.mutation(api.orders.claimOrder, { id: id as any, serverId });
  },

  markServed: async (id: string) => {
    await convex.mutation(api.orders.markServed, { id: id as any });
  },

  markPaid: async (id: string) => {
    await convex.mutation(api.orders.markPaid, { id: id as any });
  },

  getAvailableDeliveryOrders: async (restaurantId?: string): Promise<Order[]> => {
    const orders = await DataStore.getOrders(restaurantId);
    return orders.filter(o => o.table === 'Livraison' && !o.driverId && o.status !== 'delivered' && o.status !== 'cancelled');
  },

  assignOrderToDriver: async (orderId: string, driverId: string, restaurantId?: string) => {
    // 1. Assign driver to order
    await convex.mutation(api.orders.assignDriver, { id: orderId as any, driverId });
    
    // 2. Fetch driver's current activeOrders and increment it
    const resId = restaurantId || await getRestaurantId();
    const driversList = await DataStore.getDrivers(resId);
    const driver = driversList.find(d => d.id === driverId);
    if (driver) {
      await convex.mutation(api.drivers.updateDriver, {
        id: driverId as any,
        updates: {
          activeOrders: (driver.activeOrders || 0) + 1,
          status: 'busy'
        }
      });
    }
  },

  // --- REVIEWS ---
  getReviews: async (restaurantId?: string): Promise<Review[]> => {
    const resId = restaurantId || await getRestaurantId();
    if (!resId) return [];
    
    const results = await convex.query(api.reviews.getReviews, { restaurantId: resId });
    return results.map(d => ({
      id: d._id,
      rating: d.rating,
      comment: d.comment,
      time: d.createdAt,
      status: d.status as any,
      userName: d.userName
    }));
  },

  subscribeToReviews: (callback: (reviews: Review[]) => void, restaurantId?: string) => {
    const resId = restaurantId || getRestaurantId() || 'demo';
    const unsub = convex.onUpdate(api.reviews.getReviews, { restaurantId: resId }, (results: any) => {
      callback(results.map((d: any) => ({
        id: d._id,
        rating: d.rating,
        comment: d.comment,
        time: d.createdAt,
        status: d.status as any,
        userName: d.userName
      })));
    });
    return makeSafeUnsubscribe(unsub);
  },

  addReview: async (rating: number, comment: string, userName?: string, restaurantId?: string) => {
    const resId = restaurantId || await getRestaurantId();
    if (!resId) return;
    
    await convex.mutation(api.reviews.addReview, {
      restaurantId: resId,
      rating,
      comment,
      userName: userName || 'Anonyme',
      status: 'pending'
    });
  },

  updateReviewStatus: async (id: string, status: Review['status']) => {
    await convex.mutation(api.reviews.updateStatus, { id: id as any, status });
  },

  // --- MENU ---
  getMenu: async (restaurantId?: string): Promise<MenuItem[]> => {
    const resId = restaurantId || await getRestaurantId();
    if (!resId) return [];
    
    const results = await convex.query(api.menu.getItems, { restaurantId: resId });
    return results.map(d => ({
      id: d._id,
      category: d.category,
      name: d.name,
      description: d.description,
      price: d.price,
      image: d.image,
      available: d.available,
      popular: d.popular,
      calories: d.calories,
      allergens: d.allergens,
      ingredients: d.ingredients
    }));
  },

  subscribeToMenu: (callback: (menu: MenuItem[]) => void, restaurantId?: string) => {
    const resId = restaurantId || getRestaurantId() || 'demo';
    console.log(`Setting up menu subscription for ${resId}`);
    const unsub = convex.onUpdate(api.menu.getItems, { restaurantId: resId }, (results: any) => {
      console.log(`Menu update for ${resId}:`, results.length, "items");
      callback(results.map((d: any) => ({
        id: d._id,
        category: d.category,
        name: d.name,
        description: d.description,
        price: d.price,
        image: d.image,
        available: d.available,
        popular: d.popular,
        calories: d.calories,
        allergens: d.allergens,
        ingredients: d.ingredients
      })));
    });
    return makeSafeUnsubscribe(unsub);
  },

  addMenuItem: async (item: Omit<MenuItem, 'id'>) => {
    const resId = await getRestaurantId();
    if (!resId) return;
    await convex.mutation(api.menu.addItem, { ...item, restaurantId: resId });
  },

  updateMenuItem: async (id: string, updates: Partial<MenuItem>) => {
    await convex.mutation(api.menu.updateItem, { id: id as any, updates: updates as any });
  },

  deleteMenuItem: async (id: string) => {
    await convex.mutation(api.menu.deleteItem, { id: id as any });
  },

  // --- PROFILE ---
  getProfile: async (restaurantId?: string): Promise<RestaurantProfile> => {
    const resId = restaurantId || await getRestaurantId();
    const p = await convex.query(api.profiles.getByUserId, { userId: resId });
    if (p) {
      return {
        id: p.userId,
        name: p.name,
        description: p.description,
        coverImage: p.coverImage,
        logo: p.logo,
        aboutInfo: p.aboutInfo,
        aboutImage: p.aboutImage,
        openingHours: p.openingHours,
        googleReviewUrl: p.googleReviewUrl
      };
    }
    return { id: resId, name: 'Mon Restaurant', description: '', coverImage: '', logo: '' };
  },

  subscribeToProfile: (callback: (profile: RestaurantProfile) => void, restaurantId?: string) => {
    const resId = restaurantId || getRestaurantId() || 'demo';
    console.log(`Setting up profile subscription for ${resId}`);
    const unsub = convex.onUpdate(api.profiles.getByUserId, { userId: resId }, (p: any) => {
      console.log(`Profile update for ${resId}:`, p ? p.name : "null");
      if (p) {
        callback({
          id: p.userId,
          name: p.name,
          description: p.description,
          coverImage: p.coverImage,
          logo: p.logo,
          aboutInfo: p.aboutInfo,
          aboutImage: p.aboutImage,
          openingHours: p.openingHours,
          googleReviewUrl: p.googleReviewUrl
        });
      }
    });
    return makeSafeUnsubscribe(unsub);
  },

  updateProfile: async (updates: any) => {
    const resId = await getRestaurantId();
    if (!resId) return;
    
    // Filter updates to only include valid profile keys that the Convex schema allows
    const allowedKeys = [
      'name',
      'description',
      'coverImage',
      'logo',
      'aboutInfo',
      'aboutImage',
      'openingHours',
      'googleReviewUrl'
    ];
    const cleanUpdates: any = {};
    for (const key of allowedKeys) {
      if (updates[key] !== undefined) {
        cleanUpdates[key] = updates[key];
      }
    }
    
    const profile = await convex.query(api.profiles.getByUserId, { userId: resId });
    if (profile) {
      await convex.mutation(api.profiles.update, { id: profile._id, updates: cleanUpdates });
    } else {
      await convex.mutation(api.profiles.create, { 
        userId: resId, 
        name: cleanUpdates.name || 'Mon Restaurant',
        description: cleanUpdates.description || '',
        coverImage: cleanUpdates.coverImage || '',
        logo: cleanUpdates.logo || ''
      });
    }
  },

  // --- STAFF ---
  getStaff: async (restaurantId?: string): Promise<StaffMember[]> => {
    const resId = restaurantId || await getRestaurantId();
    if (!resId) return [];
    
    const results = await convex.query(api.staff.getStaff, { restaurantId: resId });
    return results.map(d => ({
      id: d._id,
      name: d.name,
      role: d.role,
      createdAt: d.createdAt
    }));
  },

  subscribeToStaff: (callback: (staff: StaffMember[]) => void, restaurantId?: string) => {
    const resId = restaurantId || getRestaurantId() || 'demo';
    const unsub = convex.onUpdate(api.staff.getStaff, { restaurantId: resId }, (results: any) => {
      callback(results.map((d: any) => ({
        id: d._id,
        name: d.name,
        role: d.role,
        createdAt: d.createdAt
      })));
    });
    return makeSafeUnsubscribe(unsub);
  },

  addStaffMember: async (member: Omit<StaffMember, 'id' | 'createdAt'>) => {
    const resId = await getRestaurantId();
    if (!resId) return;
    await convex.mutation(api.staff.addStaff, { ...member, restaurantId: resId });
  },

  deleteStaffMember: async (id: string) => {
    await convex.mutation(api.staff.deleteStaff, { id: id as any });
  },

  // --- DRIVERS ---
  getDrivers: async (restaurantId?: string): Promise<Driver[]> => {
    const resId = restaurantId || await getRestaurantId();
    if (!resId) return [];
    
    const results = await convex.query(api.drivers.getDrivers, { restaurantId: resId });
    return results.map(d => ({
      id: d._id,
      name: d.name,
      status: d.status as any,
      phone: d.phone,
      activeOrders: d.activeOrders
    }));
  },

  subscribeToDrivers: (callback: (drivers: Driver[]) => void, restaurantId?: string) => {
    const resId = restaurantId || getRestaurantId() || 'demo';
    const unsub = convex.onUpdate(api.drivers.getDrivers, { restaurantId: resId }, (results: any) => {
      callback(results.map((d: any) => ({
        id: d._id,
        name: d.name,
        status: d.status as any,
        phone: d.phone,
        activeOrders: d.activeOrders
      })));
    });
    return makeSafeUnsubscribe(unsub);
  },

  addDriver: async (driver: Omit<Driver, 'id'>) => {
    const resId = await getRestaurantId();
    if (!resId) return;
    await convex.mutation(api.drivers.addDriver, { ...driver, restaurantId: resId });
  },

  deleteDriver: async (id: string) => {
    await convex.mutation(api.drivers.deleteDriver, { id: id as any });
  },

  updateDriverStatus: async (id: string, status: Driver['status'], _restaurantId?: string) => {
    await convex.mutation(api.drivers.updateDriver, {
      id: id as any,
      updates: { status }
    });
  },

  updateDriverOrders: async (id: string, count: number, _restaurantId?: string) => {
    await convex.mutation(api.drivers.updateDriver, {
      id: id as any,
      updates: { activeOrders: count }
    });
  },

  // --- RESERVATIONS ---
  getReservations: async (restaurantId?: string): Promise<Reservation[]> => {
    const resId = restaurantId || await getRestaurantId();
    if (!resId) return [];
    
    const results = await convex.query(api.reservations.getReservations, { restaurantId: resId });
    return results.map(d => ({
      id: d._id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      date: d.date,
      time: d.time,
      guests: d.guests,
      status: d.status as any,
      createdAt: d.createdAt
    }));
  },

  subscribeToReservations: (callback: (reservations: Reservation[]) => void, restaurantId?: string) => {
    const resId = restaurantId || getRestaurantId() || 'demo';
    const unsub = convex.onUpdate(api.reservations.getReservations, { restaurantId: resId }, (results: any) => {
      callback(results.map((d: any) => ({
        id: d._id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        date: d.date,
        time: d.time,
        guests: d.guests,
        status: d.status as any,
        createdAt: d.createdAt
      })));
    });
    return makeSafeUnsubscribe(unsub);
  },

  addReservation: async (res: Omit<Reservation, 'id' | 'status' | 'createdAt'>, restaurantId?: string) => {
    const resId = restaurantId || await getRestaurantId();
    if (!resId) return;
    await convex.mutation(api.reservations.addReservation, { ...res, restaurantId: resId, status: 'pending' });
  },

  updateReservationStatus: async (id: string, status: Reservation['status']) => {
    await convex.mutation(api.reservations.updateStatus, { id: id as any, status });
  },

  // --- SUBSCRIPTIONS ---
  getSubscription: async (userId: string): Promise<Subscription | null> => {
    const sub = await convex.query(api.subscriptions.getSubscription, { userId });
    if (!sub) return null;
    return {
      id: sub._id,
      userId: sub.userId,
      email: sub.email,
      planId: sub.planId as any,
      billingPeriod: sub.billingPeriod as any,
      status: sub.status as any,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  },

  subscribeToSubscription: (callback: (sub: Subscription | null) => void, userId: string) => {
    const unsub = convex.onUpdate(api.subscriptions.getSubscription, { userId }, (result: any) => {
      if (!result) {
        callback(null);
        return;
      }
      callback({
        id: result._id,
        userId: result.userId,
        email: result.email,
        planId: result.planId as any,
        billingPeriod: result.billingPeriod as any,
        status: result.status as any,
        currentPeriodEnd: result.currentPeriodEnd,
      });
    });
    return makeSafeUnsubscribe(unsub);
  },

  // --- DRIVER LOCATIONS ---
  getDriverLocation: async (driverId: string): Promise<{lat: number, lng: number} | null> => {
    const loc = await convex.query(api.driverLocations.getByDriverId, { driverId });
    if (!loc) return null;
    return { lat: loc.lat, lng: loc.lng };
  },

  subscribeToDriverLocation: (callback: (loc: {lat: number, lng: number} | null) => void, driverId: string) => {
    const unsub = convex.onUpdate(api.driverLocations.getByDriverId, { driverId }, (result: any) => {
      if (!result) { callback(null); return; }
      callback({ lat: result.lat, lng: result.lng });
    });
    return makeSafeUnsubscribe(unsub);
  },

  updateDriverLocation: async (driverId: string, lat: number, lng: number) => {
    await convex.mutation(api.driverLocations.updateLocation, { driverId, lat, lng });
  },
};
