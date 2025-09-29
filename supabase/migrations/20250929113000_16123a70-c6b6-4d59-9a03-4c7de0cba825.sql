-- Create custom types for enums
CREATE TYPE travel_class_type AS ENUM ('Economy', 'Premium Economy', 'Business', 'First');
CREATE TYPE accommodation_type AS ENUM ('Hotel', 'Rental', 'Cruise Ship', 'Service Apartment', 'None');
CREATE TYPE entry_source_type AS ENUM ('Manual', 'Integration');
CREATE TYPE purchase_type AS ENUM ('One-time', 'Subscription');
CREATE TYPE tree_status_type AS ENUM ('Waiting to be Assigned', 'Assigned', 'Sapling Planted', 'Being Mapped', 'Planted');
CREATE TYPE certificate_type AS ENUM ('Pledge', 'Tree Planting');

-- Create users table (extends auth.users with additional fields)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL UNIQUE,
  pledge_status BOOLEAN NOT NULL DEFAULT FALSE,
  pledge_date TIMESTAMP WITH TIME ZONE,
  otot_id TEXT UNIQUE,
  total_donation DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lodges table (referenced by trees)
CREATE TABLE public.lodges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_airport TEXT NOT NULL,
  destination_airport TEXT NOT NULL,
  travel_class travel_class_type NOT NULL,
  is_return BOOLEAN NOT NULL DEFAULT FALSE,
  from_date DATE NOT NULL,
  to_date DATE,
  accommodation_type accommodation_type,
  num_travelers INTEGER NOT NULL DEFAULT 1,
  flight_co2 DECIMAL(10,2) NOT NULL DEFAULT 0,
  accommodation_co2 DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_co2 DECIMAL(10,2) NOT NULL DEFAULT 0,
  trees_needed INTEGER NOT NULL DEFAULT 0,
  entry_source entry_source_type NOT NULL DEFAULT 'Manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trees table
CREATE TABLE public.trees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  otot_id TEXT UNIQUE NOT NULL,
  num_trees INTEGER NOT NULL DEFAULT 1,
  purchase_type purchase_type NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  lodge_id UUID REFERENCES public.lodges(id) ON DELETE SET NULL,
  location_name TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  tree_type TEXT,
  status tree_status_type NOT NULL DEFAULT 'Waiting to be Assigned',
  plant_date DATE,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create certificates table
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_type certificate_type NOT NULL,
  certificate_url TEXT NOT NULL,
  issued_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lodges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for trips table
CREATE POLICY "Users can view their own trips" 
ON public.trips 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trips" 
ON public.trips 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips" 
ON public.trips 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips" 
ON public.trips 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for trees table
CREATE POLICY "Users can view their own trees" 
ON public.trees 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trees" 
ON public.trees 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trees" 
ON public.trees 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for certificates table
CREATE POLICY "Users can view their own certificates" 
ON public.certificates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own certificates" 
ON public.certificates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for lodges table (public read access)
CREATE POLICY "Everyone can view active lodges" 
ON public.lodges 
FOR SELECT 
USING (is_active = TRUE);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trees_updated_at
  BEFORE UPDATE ON public.trees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lodges_updated_at
  BEFORE UPDATE ON public.lodges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_users_user_id ON public.users(user_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_trees_user_id ON public.trees(user_id);
CREATE INDEX idx_trees_trip_id ON public.trees(trip_id);
CREATE INDEX idx_trees_otot_id ON public.trees(otot_id);
CREATE INDEX idx_certificates_user_id ON public.certificates(user_id);