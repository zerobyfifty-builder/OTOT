-- Create tree carers table
CREATE TABLE IF NOT EXISTS public.tree_carers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
  age INTEGER,
  marital_status TEXT CHECK (marital_status IN ('Married', 'Unmarried', 'Single')),
  number_of_kids INTEGER DEFAULT 0,
  county TEXT,
  conservancy TEXT,
  associated_partner_id UUID REFERENCES public.organizations(id),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tree_carers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active tree carers"
  ON public.tree_carers FOR SELECT
  USING (status = 'Active');

CREATE POLICY "Admins can manage tree carers"
  ON public.tree_carers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Business partners can view tree carers"
  ON public.tree_carers FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add tree_carer_id to trees table
ALTER TABLE public.trees ADD COLUMN IF NOT EXISTS tree_carer_id UUID REFERENCES public.tree_carers(id);

-- Insert initial tree carers
INSERT INTO public.tree_carers (name, gender, age, marital_status, number_of_kids, county, conservancy, status)
VALUES 
  ('Agnes Wanjiru', 'Female', 35, 'Married', 3, 'Nairobi', 'Karura Forest', 'Active'),
  ('Peter Otieno', 'Male', 42, 'Married', 4, 'Kisumu', 'Lake Victoria Basin', 'Active'),
  ('Mary Wambui', 'Female', 28, 'Single', 0, 'Kiambu', 'Aberdare Ranges', 'Active'),
  ('James Kipchoge', 'Male', 38, 'Married', 2, 'Eldoret', 'Mau Forest Complex', 'Active');

-- Create trigger for updated_at
CREATE TRIGGER update_tree_carers_updated_at
  BEFORE UPDATE ON public.tree_carers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();