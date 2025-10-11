-- Step 1: Enhanced Database Schema with Multi-Tenant Architecture (Clean Install)

-- Create partner_types table
CREATE TABLE IF NOT EXISTS public.partner_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('institutional', 'business')),
  description TEXT,
  default_modules JSONB DEFAULT '[]'::jsonb,
  requires_api BOOLEAN DEFAULT false,
  transaction_enabled BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  partner_type_id UUID REFERENCES public.partner_types(id) ON DELETE RESTRICT,
  category TEXT NOT NULL CHECK (category IN ('institutional', 'business')),
  contact_email TEXT,
  contact_phone TEXT,
  contact_person TEXT,
  address JSONB,
  tax_id TEXT,
  bank_account JSONB,
  payment_terms TEXT,
  has_api_access BOOLEAN DEFAULT false,
  api_key_hash TEXT,
  api_webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  onboarded_date DATE,
  onboarded_by UUID,
  logo_url TEXT,
  website TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create roles table (enhanced)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  role_category TEXT NOT NULL CHECK (role_category IN ('god_mode', 'institutional', 'business', 'tourist')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create modules table
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('oversight', 'operations', 'financial', 'reporting')),
  parent_module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  icon TEXT,
  route TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create module_permissions table
CREATE TABLE IF NOT EXISTS public.module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'create', 'edit', 'delete', 'approve', 'export')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(module_id, action)
);

-- Create organization_modules table
CREATE TABLE IF NOT EXISTS public.organization_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(organization_id, module_id)
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create partner_transactions table
CREATE TABLE IF NOT EXISTS public.partner_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('reimbursement', 'commission', 'payment', 'invoice')),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  related_tree_id UUID,
  related_trip_id UUID,
  related_user_id UUID,
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'paid', 'rejected')),
  payment_date DATE,
  requested_by UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  invoice_url TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  key_name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes JSONB DEFAULT '[]'::jsonb,
  rate_limit INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create integration_logs table
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  request_body JSONB,
  response_body JSONB,
  status_code INTEGER NOT NULL,
  ip_address INET,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  duration_ms INTEGER
);

-- Update users table - add new columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role_id') THEN
    ALTER TABLE public.users ADD COLUMN role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'organization_id') THEN
    ALTER TABLE public.users ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_timestamp ON public.activity_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_timestamp ON public.activity_logs(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_timestamp ON public.activity_logs(action_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_partner_type ON public.organizations(partner_type_id);
CREATE INDEX IF NOT EXISTS idx_org_modules_org_module ON public.organization_modules(organization_id, module_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_org_active ON public.api_keys(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_integration_logs_org_timestamp ON public.integration_logs(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_organization ON public.users(organization_id);

-- Enable RLS on new tables
ALTER TABLE public.partner_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

-- Create helper functions
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.user_id = user_id
    AND r.name = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization(user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.users
  WHERE user_id = user_id;
$$;

-- Drop existing policies if they exist (to make migration idempotent)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Super admins can manage partner types" ON public.partner_types;
  DROP POLICY IF EXISTS "All authenticated users can view partner types" ON public.partner_types;
  DROP POLICY IF EXISTS "Super admins can manage all organizations" ON public.organizations;
  DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
  DROP POLICY IF EXISTS "Super admins can manage roles" ON public.roles;
  DROP POLICY IF EXISTS "All authenticated users can view roles" ON public.roles;
  DROP POLICY IF EXISTS "Super admins can manage modules" ON public.modules;
  DROP POLICY IF EXISTS "All authenticated users can view modules" ON public.modules;
  DROP POLICY IF EXISTS "Super admins can manage module permissions" ON public.module_permissions;
  DROP POLICY IF EXISTS "All authenticated users can view module permissions" ON public.module_permissions;
  DROP POLICY IF EXISTS "Super admins can manage organization modules" ON public.organization_modules;
  DROP POLICY IF EXISTS "Users can view their organization modules" ON public.organization_modules;
  DROP POLICY IF EXISTS "Super admins can view all activity logs" ON public.activity_logs;
  DROP POLICY IF EXISTS "Users can view their organization activity logs" ON public.activity_logs;
  DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;
  DROP POLICY IF EXISTS "Super admins can manage all transactions" ON public.partner_transactions;
  DROP POLICY IF EXISTS "Users can view their organization transactions" ON public.partner_transactions;
  DROP POLICY IF EXISTS "Users can create transactions for their organization" ON public.partner_transactions;
  DROP POLICY IF EXISTS "Super admins can manage all api keys" ON public.api_keys;
  DROP POLICY IF EXISTS "Users can view their organization api keys" ON public.api_keys;
  DROP POLICY IF EXISTS "Super admins can view all integration logs" ON public.integration_logs;
  DROP POLICY IF EXISTS "Users can view their organization integration logs" ON public.integration_logs;
  DROP POLICY IF EXISTS "System can insert integration logs" ON public.integration_logs;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Create all RLS policies
CREATE POLICY "Super admins can manage partner types" ON public.partner_types
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "All authenticated users can view partner types" ON public.partner_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage all organizations" ON public.organizations
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own organization" ON public.organizations
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      public.is_super_admin(auth.uid()) OR
      id = public.get_user_organization(auth.uid())
    )
  );

CREATE POLICY "Super admins can manage roles" ON public.roles
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "All authenticated users can view roles" ON public.roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage modules" ON public.modules
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "All authenticated users can view modules" ON public.modules
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage module permissions" ON public.module_permissions
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "All authenticated users can view module permissions" ON public.module_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can manage organization modules" ON public.organization_modules
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their organization modules" ON public.organization_modules
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      public.is_super_admin(auth.uid()) OR
      organization_id = public.get_user_organization(auth.uid())
    )
  );

CREATE POLICY "Super admins can view all activity logs" ON public.activity_logs
  FOR SELECT USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their organization activity logs" ON public.activity_logs
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    organization_id = public.get_user_organization(auth.uid())
  );

CREATE POLICY "System can insert activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Super admins can manage all transactions" ON public.partner_transactions
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their organization transactions" ON public.partner_transactions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    organization_id = public.get_user_organization(auth.uid())
  );

CREATE POLICY "Users can create transactions for their organization" ON public.partner_transactions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    organization_id = public.get_user_organization(auth.uid())
  );

CREATE POLICY "Super admins can manage all api keys" ON public.api_keys
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their organization api keys" ON public.api_keys
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    organization_id = public.get_user_organization(auth.uid())
  );

CREATE POLICY "Super admins can view all integration logs" ON public.integration_logs
  FOR SELECT USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their organization integration logs" ON public.integration_logs
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    organization_id = public.get_user_organization(auth.uid())
  );

CREATE POLICY "System can insert integration logs" ON public.integration_logs
  FOR INSERT WITH CHECK (true);

-- Create/update triggers
CREATE OR REPLACE FUNCTION public.update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_organizations_updated_at ON public.organizations;
CREATE TRIGGER trigger_update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organizations_updated_at();

DROP TRIGGER IF EXISTS trigger_update_roles_updated_at ON public.roles;
CREATE TRIGGER trigger_update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial data
INSERT INTO public.roles (name, display_name, description, role_category) VALUES
  ('super_admin', 'Super Administrator', 'Full system access with god mode privileges', 'god_mode'),
  ('institutional_partner', 'Institutional Partner', 'Read-only oversight access for government agencies', 'institutional'),
  ('business_partner', 'Business Partner', 'Operational access for lodges, airlines, and businesses', 'business'),
  ('tourist', 'Tourist', 'End user with personal dashboard access', 'tourist')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.partner_types (name, category, description, requires_api, transaction_enabled) VALUES
  ('ktb', 'institutional', 'Kenya Tourism Board - Regulatory and oversight body', false, false),
  ('ministry', 'institutional', 'Ministry of Tourism and Wildlife - Government oversight', false, false),
  ('lodge', 'business', 'Safari lodges and accommodation providers', true, true),
  ('airline', 'business', 'Airlines and aviation partners', true, false),
  ('nursery', 'business', 'Tree nurseries and suppliers', false, true),
  ('plantation', 'business', 'Plantation management organizations', false, true),
  ('community', 'business', 'Community-based organizations', false, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.modules (name, display_name, description, category, route, sort_order) VALUES
  ('dashboard', 'Dashboard', 'Overview and key metrics', 'oversight', '/dashboard', 1),
  ('analytics', 'Analytics', 'Advanced reporting and insights', 'reporting', '/analytics', 2),
  ('tree_management', 'Tree Management', 'Track and manage tree planting', 'operations', '/trees', 3),
  ('trip_management', 'Trip Management', 'Manage tourist trips and carbon calculations', 'operations', '/trips', 4),
  ('payment_management', 'Payment Management', 'Handle payments and reimbursements', 'financial', '/payments', 5),
  ('partner_management', 'Partner Management', 'Manage partner organizations', 'oversight', '/partners', 6),
  ('user_management', 'User Management', 'Manage system users and access', 'oversight', '/users', 7),
  ('certificate_generation', 'Certificates', 'Generate and manage certificates', 'operations', '/certificates', 8),
  ('audit_logs', 'Audit Logs', 'View system activity logs', 'oversight', '/logs', 9),
  ('api_management', 'API Management', 'Manage API keys and integrations', 'oversight', '/api', 10)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.module_permissions (module_id, action, description)
SELECT m.id, perms.action, perms.description 
FROM public.modules m
CROSS JOIN (VALUES
  ('view', 'View module content'),
  ('create', 'Create new records'),
  ('edit', 'Edit existing records'),
  ('delete', 'Delete records'),
  ('approve', 'Approve transactions or requests'),
  ('export', 'Export data')
) AS perms(action, description)
ON CONFLICT (module_id, action) DO NOTHING;