-- Create Kenya Tourism Board (KTB) partner account with authentication

DO $$
DECLARE
  ktb_user_id uuid;
  ktb_org_id uuid;
  partner_role_id uuid;
  institutional_type_id uuid;
  existing_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO existing_user_id FROM auth.users WHERE email = 'ktb@the1campaign.com';
  
  IF existing_user_id IS NULL THEN
    -- Create new auth user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'ktb@the1campaign.com',
      crypt('test1234', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO ktb_user_id;
  ELSE
    ktb_user_id := existing_user_id;
  END IF;

  -- Get institutional partner role
  SELECT id INTO partner_role_id FROM public.roles WHERE name = 'institutional_partner';
  
  -- Create or get institutional partner type
  SELECT id INTO institutional_type_id FROM public.partner_types 
  WHERE name = 'Tourism Board' AND category = 'institutional';
  
  IF institutional_type_id IS NULL THEN
    INSERT INTO public.partner_types (
      name,
      category,
      description,
      requires_api,
      transaction_enabled,
      is_active
    ) VALUES (
      'Tourism Board',
      'institutional',
      'Government tourism promotion and conservation agencies',
      true,
      true,
      true
    ) RETURNING id INTO institutional_type_id;
  END IF;

  -- Create or get Kenya Tourism Board organization
  SELECT id INTO ktb_org_id FROM public.organizations WHERE name = 'Kenya Tourism Board';
  
  IF ktb_org_id IS NULL THEN
    INSERT INTO public.organizations (
      name,
      legal_name,
      category,
      partner_type_id,
      contact_person,
      contact_email,
      contact_phone,
      website,
      address,
      is_active,
      verified,
      has_api_access,
      onboarded_date
    ) VALUES (
      'Kenya Tourism Board',
      'Kenya Tourism Board',
      'institutional',
      institutional_type_id,
      'KTB Administrator',
      'ktb@the1campaign.com',
      '+254-20-2711262',
      'https://www.ktb.go.ke',
      jsonb_build_object(
        'street', 'Kenya-Re Towers, Upper Hill',
        'city', 'Nairobi',
        'county', 'Nairobi',
        'postalCode', '00100'
      ),
      true,
      true,
      true,
      CURRENT_DATE
    ) RETURNING id INTO ktb_org_id;
  END IF;

  -- Create or update user profile and link to organization
  IF EXISTS (SELECT 1 FROM public.users WHERE user_id = ktb_user_id) THEN
    UPDATE public.users 
    SET organization_id = ktb_org_id, 
        role_id = partner_role_id,
        email_verified = true
    WHERE user_id = ktb_user_id;
  ELSE
    INSERT INTO public.users (
      user_id,
      email,
      organization_id,
      role_id,
      email_verified,
      created_via,
      created_at,
      updated_at
    ) VALUES (
      ktb_user_id,
      'ktb@the1campaign.com',
      ktb_org_id,
      partner_role_id,
      true,
      'admin_created',
      NOW(),
      NOW()
    );
  END IF;

  -- Assign default modules for institutional partners (if modules exist)
  -- Tourism & Travel Management
  INSERT INTO public.organization_modules (organization_id, module_id, permissions, is_active)
  SELECT ktb_org_id, m.id, '["view", "create", "update"]'::jsonb, true
  FROM public.modules m
  WHERE m.name IN ('trip_management', 'tourist_tracking', 'carbon_calculator')
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_modules 
      WHERE organization_id = ktb_org_id AND module_id = m.id
    );

  -- Tree Planting & Conservation
  INSERT INTO public.organization_modules (organization_id, module_id, permissions, is_active)
  SELECT ktb_org_id, m.id, '["view", "create", "update"]'::jsonb, true
  FROM public.modules m
  WHERE m.name IN ('tree_management', 'tree_tracking', 'conservation_areas')
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_modules 
      WHERE organization_id = ktb_org_id AND module_id = m.id
    );

  -- Analytics & Reporting
  INSERT INTO public.organization_modules (organization_id, module_id, permissions, is_active)
  SELECT ktb_org_id, m.id, '["view", "export"]'::jsonb, true
  FROM public.modules m
  WHERE m.name IN ('analytics_dashboard', 'impact_reports', 'tourist_analytics')
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_modules 
      WHERE organization_id = ktb_org_id AND module_id = m.id
    );

  RAISE NOTICE 'KTB account created successfully. User ID: %, Org ID: %', ktb_user_id, ktb_org_id;
END $$;