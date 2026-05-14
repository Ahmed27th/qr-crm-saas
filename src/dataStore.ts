import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  addDoc,
  onSnapshot,
  limit
} from 'firebase/firestore';
import { db, auth } from './firebase';

export interface OrderItem {
  name: string;
  qty: number;
}

export interface Order {
  id: string;
  table: string;
  items: number;
  total: number;
  status: 'new' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  time: number;
  source: 'qr' | 'ubereats' | 'glovo';
  orderItems?: OrderItem[];
  driverId?: string;
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
  status: 'pending' | 'published_google' | 'internal_resolved';
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
  calories?: number;
  allergens?: string[];
  ingredients?: string[];
  available: boolean;
}

export interface RestaurantProfile {
  id?: string;
  name: string;
  description: string;
  coverImage: string;
  logo: string;
  googleReviewUrl?: string;
  openingHours?: string;
  aboutInfo?: string;
}

export interface Reservation {
  id: string;
  name: string;
  email: string;
  phone: string;
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
  avatar?: string;
  createdAt: number;
}

export interface Driver {
  id: string;
  name: string;
  status: 'available' | 'busy' | 'offline';
  phone: string;
  activeOrders: number;
}

const getRestaurantId = () => auth.currentUser?.uid || 'demo';

export const DataStore = {
  // --- ORDERS ---
  getOrders: async (): Promise<Order[]> => {
    const q = query(
      collection(db, 'restaurants', getRestaurantId(), 'orders'),
      orderBy('time', 'desc'),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
  },

  subscribeToOrders: (callback: (orders: Order[]) => void) => {
    const q = query(
      collection(db, 'restaurants', getRestaurantId(), 'orders'),
      orderBy('time', 'desc'),
      limit(50)
    );
    return onSnapshot(q, (snap) => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      callback(orders);
    });
  },

  addOrder: async (order: Omit<Order, 'id' | 'time' | 'status' | 'source'>, restaurantId?: string) => {
    const id = restaurantId || getRestaurantId();
    const newOrder = {
      ...order,
      status: 'new',
      time: Date.now(),
      source: 'qr'
    };
    await addDoc(collection(db, 'restaurants', id, 'orders'), newOrder);
  },

  updateOrderStatus: async (id: string, status: Order['status']) => {
    const docRef = doc(db, 'restaurants', getRestaurantId(), 'orders', id);
    await updateDoc(docRef, { status });
  },

  getAvailableDeliveryOrders: async (): Promise<Order[]> => {
    const q = query(
      collection(db, 'restaurants', getRestaurantId(), 'orders'),
      orderBy('time', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Order))
      .filter(o => o.table === 'Livraison' && !o.driverId && o.status !== 'delivered' && o.status !== 'cancelled');
  },

  assignOrderToDriver: async (orderId: string, driverId: string) => {
    const orderRef = doc(db, 'restaurants', getRestaurantId(), 'orders', orderId);
    await updateDoc(orderRef, { driverId });
    
    // Increment driver active orders
    const driverRef = doc(db, 'restaurants', getRestaurantId(), 'drivers', driverId);
    const driverSnap = await getDoc(driverRef);
    if (driverSnap.exists()) {
      const current = driverSnap.data().activeOrders || 0;
      await updateDoc(driverRef, { activeOrders: current + 1, status: 'busy' });
    }
  },

  // --- REVIEWS ---
  getReviews: async (): Promise<Review[]> => {
    const q = query(
      collection(db, 'restaurants', getRestaurantId(), 'reviews'),
      orderBy('time', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
  },

  subscribeToReviews: (callback: (reviews: Review[]) => void) => {
    const q = query(
      collection(db, 'restaurants', getRestaurantId(), 'reviews'),
      orderBy('time', 'desc')
    );
    return onSnapshot(q, (snap) => {
      const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
      callback(reviews);
    });
  },

  addReview: async (rating: number, comment: string, userName?: string, restaurantId?: string) => {
    const id = restaurantId || getRestaurantId();
    const newReview = {
      rating,
      comment,
      status: 'pending',
      time: Date.now(),
      userName: userName || 'Anonyme'
    };
    await addDoc(collection(db, 'restaurants', id, 'reviews'), newReview);
  },

  updateReviewStatus: async (id: string, status: Review['status']) => {
    const docRef = doc(db, 'restaurants', getRestaurantId(), 'reviews', id);
    await updateDoc(docRef, { status });
  },

  // --- MENU ---
  getMenu: async (restaurantId?: string): Promise<MenuItem[]> => {
    const id = restaurantId || getRestaurantId();
    const q = collection(db, 'restaurants', id, 'menu');
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
  },

  subscribeToMenu: (callback: (menu: MenuItem[]) => void, restaurantId?: string) => {
    const id = restaurantId || getRestaurantId();
    const q = collection(db, 'restaurants', id, 'menu');
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
    });
  },

  addMenuItem: async (item: Omit<MenuItem, 'id'>) => {
    await addDoc(collection(db, 'restaurants', getRestaurantId(), 'menu'), item);
  },

  updateMenuItem: async (id: string, updates: Partial<MenuItem>) => {
    const docRef = doc(db, 'restaurants', getRestaurantId(), 'menu', id);
    await updateDoc(docRef, updates);
  },

  deleteMenuItem: async (id: string) => {
    await deleteDoc(doc(db, 'restaurants', getRestaurantId(), 'menu', id));
  },

  // --- PROFILE ---
  getProfile: async (restaurantId?: string): Promise<RestaurantProfile> => {
    const id = restaurantId || getRestaurantId();
    const docRef = doc(db, 'restaurants', id, 'config', 'profile');
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as RestaurantProfile) : { name: 'Mon Restaurant', description: '', coverImage: '', logo: '' };
  },

  updateProfile: async (updates: Partial<RestaurantProfile>, restaurantId?: string) => {
    const id = restaurantId || getRestaurantId();
    const docRef = doc(db, 'restaurants', id, 'config', 'profile');
    await setDoc(docRef, updates, { merge: true });
  },

  subscribeToProfile: (callback: (profile: RestaurantProfile) => void, restaurantId?: string) => {
    const id = restaurantId || getRestaurantId();
    const docRef = doc(db, 'restaurants', id, 'config', 'profile');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as RestaurantProfile);
      }
    });
  },

  // --- STAFF ---
  getStaff: async (): Promise<StaffMember[]> => {
    const q = collection(db, 'restaurants', getRestaurantId(), 'staff');
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember));
  },

  subscribeToStaff: (callback: (staff: StaffMember[]) => void) => {
    const q = collection(db, 'restaurants', getRestaurantId(), 'staff');
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)));
    });
  },

  addStaffMember: async (member: Omit<StaffMember, 'id' | 'createdAt'>) => {
    const newMember = { ...member, createdAt: Date.now() };
    await addDoc(collection(db, 'restaurants', getRestaurantId(), 'staff'), newMember);
  },

  deleteStaffMember: async (id: string) => {
    await deleteDoc(doc(db, 'restaurants', getRestaurantId(), 'staff', id));
  },

  // --- DRIVERS ---
  getReservations: async (): Promise<Reservation[]> => {
    const q = collection(db, 'restaurants', getRestaurantId(), 'reservations');
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Reservation));
  },

  subscribeToReservations: (callback: (reservations: Reservation[]) => void) => {
    const q = collection(db, 'restaurants', getRestaurantId(), 'reservations');
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reservation)));
    });
  },

  getDrivers: async (): Promise<Driver[]> => {
    const q = collection(db, 'restaurants', getRestaurantId(), 'drivers');
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Driver));
  },

  subscribeToDrivers: (callback: (drivers: Driver[]) => void) => {
    const q = collection(db, 'restaurants', getRestaurantId(), 'drivers');
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Driver)));
    });
  },

  addDriver: async (driver: Omit<Driver, 'id'>) => {
    await addDoc(collection(db, 'restaurants', getRestaurantId(), 'drivers'), driver);
  },

  deleteDriver: async (id: string) => {
    await deleteDoc(doc(db, 'restaurants', getRestaurantId(), 'drivers', id));
  },

  updateDriverStatus: async (id: string, status: Driver['status']) => {
    const docRef = doc(db, 'restaurants', getRestaurantId(), 'drivers', id);
    await updateDoc(docRef, { status });
  },

  updateDriverOrders: async (id: string, count: number) => {
    const docRef = doc(db, 'restaurants', getRestaurantId(), 'drivers', id);
    await updateDoc(docRef, { activeOrders: count });
  },

  // --- RESERVATIONS ---
  getReservations: async (): Promise<Reservation[]> => {
    const q = query(
      collection(db, 'restaurants', getRestaurantId(), 'reservations'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Reservation));
  },

  addReservation: async (res: Omit<Reservation, 'id' | 'status' | 'createdAt'>, restaurantId?: string) => {
    const id = restaurantId || getRestaurantId();
    const newRes = { ...res, status: 'pending', createdAt: Date.now() };
    await addDoc(collection(db, 'restaurants', id, 'reservations'), newRes);
  },

  updateReservationStatus: async (id: string, status: Reservation['status']) => {
    const docRef = doc(db, 'restaurants', getRestaurantId(), 'reservations', id);
    await updateDoc(docRef, { status });
  },

  // --- INIT MOCK DATA ---
  initMockData: async () => {
    const profile = await DataStore.getProfile();
    if (profile.name === 'Mon Restaurant') {
      await DataStore.updateProfile({
        name: 'Dar Zellige',
        description: 'Gastronomie Marocaine Contemporaine',
        coverImage: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1600&q=80',
        logo: 'https://images.unsplash.com/photo-1559336197-defbc6ee0f73?auto=format&fit=crop&w=200&q=80'
      });
      
      await DataStore.addMenuItem({
        category: 'Plats',
        name: 'Tajine de Poulet',
        description: 'Poulet fermier, olives de Meknès',
        price: 85,
        image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&q=80',
        available: true
      });
    }
  }
};
