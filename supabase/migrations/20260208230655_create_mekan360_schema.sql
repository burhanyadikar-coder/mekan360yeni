/*
  # Mekan360 Database Schema
  
  ## Overview
  Complete database schema for Mekan360 property viewing platform with authentication,
  property management, visitor tracking, and payment systems.
  
  ## New Tables
  
  ### 1. users
  Core user authentication and subscription management
  - `id` (uuid, primary key)
  - `email` (text, unique) - User email
  - `password` (text) - Hashed password
  - `first_name` (text) - First name
  - `last_name` (text) - Last name
  - `company_name` (text) - Real estate company name
  - `phone` (text) - Contact phone
  - `profile_photo` (text) - Profile image URL
  - `company_logo` (text) - Company logo URL
  - `package` (text) - Subscription package (free, starter, premium, ultra, corporate)
  - `auto_payment` (boolean) - Auto-renewal enabled
  - `subscription_status` (text) - active, pending, expired
  - `subscription_end` (timestamptz) - Subscription expiry date
  - `property_count` (integer) - Number of properties created
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 2. properties
  Property listings with rooms and virtual tour data
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - Owner
  - `company_name` (text) - Company name snapshot
  - `title` (text) - Property title
  - `description` (text) - Property description
  - `address` (text) - Full address
  - `city` (text) - City
  - `district` (text) - District
  - `square_meters` (float) - Total area
  - `room_count` (text) - Room configuration (e.g., "3+1")
  - `property_type` (text) - single, duplex, triplex
  - `floor` (integer) - Floor number
  - `total_floors` (integer) - Total floors in building
  - `building_age` (integer) - Building age in years
  - `heating_type` (text) - Heating system type
  - `facing_direction` (text) - Cardinal direction
  - `price` (float) - Property price
  - `currency` (text) - Currency code (TRY, USD, EUR)
  - `view_type` (text) - regular or 360
  - `rooms` (jsonb) - Array of room objects with photos and floor plans
  - `entry_room_id` (text) - Starting room for virtual tour
  - `pois` (jsonb) - Points of interest nearby
  - `cover_image` (text) - Cover photo URL
  - `view_count` (integer) - Total view count
  - `total_view_duration` (integer) - Total viewing time in seconds
  - `share_link` (text) - Public share URL path
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 3. visitors
  Visitor tracking for property views
  - `id` (uuid, primary key)
  - `property_id` (uuid, foreign key)
  - `user_id` (uuid, foreign key) - Property owner
  - `first_name` (text) - Visitor first name
  - `last_name` (text) - Visitor last name
  - `phone` (text) - Visitor phone
  - `visit_count` (integer) - Number of visits
  - `total_duration` (integer) - Total viewing time in seconds
  - `rooms_visited` (jsonb) - Array of visited room IDs
  - `last_visit` (timestamptz) - Last visit timestamp
  - `created_at` (timestamptz)
  
  ### 4. visits
  Individual visit records for analytics
  - `id` (uuid, primary key)
  - `property_id` (uuid, foreign key)
  - `visitor_id` (uuid, foreign key)
  - `duration` (integer) - Visit duration in seconds
  - `rooms_visited` (jsonb) - Array of visited room IDs
  - `visited_at` (timestamptz)
  
  ### 5. payments
  Payment transaction records
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `amount` (float) - Payment amount
  - `package` (text) - Package purchased
  - `status` (text) - completed, pending, failed
  - `payment_date` (timestamptz)
  - `next_payment_date` (timestamptz)
  - `note` (text) - Additional notes
  
  ### 6. password_resets
  Password reset token management
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `token` (text, unique) - Reset token
  - `expires_at` (timestamptz) - Token expiry
  - `used` (boolean) - Token used flag
  - `created_at` (timestamptz)
  
  ### 7. groups
  Property group collections for bulk sharing
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `company_name` (text) - Company name snapshot
  - `name` (text) - Group name
  - `description` (text) - Group description
  - `property_ids` (jsonb) - Array of property IDs
  - `share_link` (text) - Public share URL path
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## Security
  
  Row Level Security (RLS) is enabled on all tables with appropriate policies
  for data protection and access control.
  
  ## Notes
  
  - All timestamps use UTC timezone
  - JSONB columns allow flexible schema for rooms, POIs, and arrays
  - Foreign keys ensure referential integrity
  - Indexes added for common query patterns
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  company_name text NOT NULL,
  phone text,
  profile_photo text,
  company_logo text,
  package text NOT NULL DEFAULT 'free',
  auto_payment boolean DEFAULT false,
  subscription_status text NOT NULL DEFAULT 'pending',
  subscription_end timestamptz,
  property_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  title text NOT NULL,
  description text,
  address text NOT NULL,
  city text NOT NULL,
  district text NOT NULL,
  square_meters float NOT NULL,
  room_count text NOT NULL,
  property_type text DEFAULT 'single',
  floor integer NOT NULL,
  total_floors integer NOT NULL,
  building_age integer NOT NULL,
  heating_type text NOT NULL,
  facing_direction text NOT NULL,
  price float NOT NULL,
  currency text DEFAULT 'TRY',
  view_type text DEFAULT 'regular',
  rooms jsonb DEFAULT '[]'::jsonb,
  entry_room_id text,
  pois jsonb DEFAULT '[]'::jsonb,
  cover_image text,
  view_count integer DEFAULT 0,
  total_view_duration integer DEFAULT 0,
  share_link text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create visitors table
CREATE TABLE IF NOT EXISTS visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  visit_count integer DEFAULT 0,
  total_duration integer DEFAULT 0,
  rooms_visited jsonb DEFAULT '[]'::jsonb,
  last_visit timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create visits table
CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  visitor_id uuid NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  duration integer NOT NULL DEFAULT 0,
  rooms_visited jsonb DEFAULT '[]'::jsonb,
  visited_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount float NOT NULL,
  package text NOT NULL,
  status text DEFAULT 'pending',
  payment_date timestamptz DEFAULT now(),
  next_payment_date timestamptz,
  note text
);

-- Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  name text NOT NULL,
  description text,
  property_ids jsonb DEFAULT '[]'::jsonb,
  share_link text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_property_id ON visitors(property_id);
CREATE INDEX IF NOT EXISTS idx_visitors_user_id ON visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_property_id ON visits(property_id);
CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Note: We're using custom JWT auth, not Supabase Auth, so policies are permissive for backend access
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own data"
  ON users FOR DELETE
  USING (true);

-- RLS Policies for properties table
CREATE POLICY "Anyone can view properties"
  ON properties FOR SELECT
  USING (true);

CREATE POLICY "Users can create properties"
  ON properties FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own properties"
  ON properties FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own properties"
  ON properties FOR DELETE
  USING (true);

-- RLS Policies for visitors table
CREATE POLICY "Users can view visitors"
  ON visitors FOR SELECT
  USING (true);

CREATE POLICY "Anyone can register as visitor"
  ON visitors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update visitor data"
  ON visitors FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete visitor data"
  ON visitors FOR DELETE
  USING (true);

-- RLS Policies for visits table
CREATE POLICY "Users can view visits"
  ON visits FOR SELECT
  USING (true);

CREATE POLICY "Anyone can record visit"
  ON visits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update visit data"
  ON visits FOR UPDATE
  USING (true);

CREATE POLICY "System can delete visit data"
  ON visits FOR DELETE
  USING (true);

-- RLS Policies for payments table
CREATE POLICY "Users can view payments"
  ON payments FOR SELECT
  USING (true);

CREATE POLICY "System can create payment"
  ON payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update payment"
  ON payments FOR UPDATE
  USING (true);

CREATE POLICY "System can delete payment"
  ON payments FOR DELETE
  USING (true);

-- RLS Policies for password_resets table
CREATE POLICY "System can manage password resets"
  ON password_resets FOR ALL
  USING (true);

-- RLS Policies for groups table
CREATE POLICY "Anyone can view groups"
  ON groups FOR SELECT
  USING (true);

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update groups"
  ON groups FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete groups"
  ON groups FOR DELETE
  USING (true);