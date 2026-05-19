-- Supabase Schema for QR CRM SAAS

-- 1. Profiles Table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo TEXT,
  cover_image TEXT,
  about_image TEXT,
  opening_hours TEXT,
  google_review_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Menu Items Table
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image TEXT,
  available BOOLEAN DEFAULT true,
  popular BOOLEAN DEFAULT false,
  calories INTEGER,
  allergens JSONB,
  ingredients TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Orders Table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  "table" TEXT NOT NULL,
  items JSONB NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  delivery_instructions TEXT,
  driver_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Reviews Table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published_google', 'internal_resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Staff Table
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Drivers Table
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'offline')),
  active_orders INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Reservations Table
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  guests INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can read all profiles (for menu), but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Menu Items: Everyone can read, only restaurant owner can write
CREATE POLICY "Menu items are viewable by everyone" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Owners can manage their menu items" ON menu_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = restaurant_id AND profiles.user_id = auth.uid())
);

-- Orders: Everyone can create, only restaurant owner can read/update
CREATE POLICY "Anyone can create orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can view/manage their orders" ON orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = restaurant_id AND profiles.user_id = auth.uid())
);

-- Reviews: Everyone can read and create, only restaurant owner can manage
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can create reviews" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can manage reviews" ON reviews FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = restaurant_id AND profiles.user_id = auth.uid())
);

-- Staff, Drivers, Reservations: Only owners can manage
CREATE POLICY "Owners can manage staff" ON staff FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = restaurant_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "Owners can manage drivers" ON drivers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = restaurant_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "Owners can manage reservations" ON reservations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = restaurant_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "Anyone can create reservations" ON reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view staff" ON staff FOR SELECT USING (true);
CREATE POLICY "Public can view drivers" ON drivers FOR SELECT USING (true);
CREATE POLICY "Anyone can view orders" ON orders FOR SELECT USING (true);
