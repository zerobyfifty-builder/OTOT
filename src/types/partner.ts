export type PartnerCategory = 'institutional' | 'business';

export interface PartnerFormData {
  // Step 1
  category: PartnerCategory;
  
  // Step 2
  partnerTypeId: string;
  organizationName: string;
  legalName: string;
  description: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: {
    street: string;
    city: string;
    county: string;
    postalCode: string;
  };
  website?: string;
  logoUrl?: string;
  
  // Business specific
  businessRegNumber?: string;
  taxId?: string;
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string;
    swiftCode: string;
    mpesaNumber?: string;
  };
  paymentTerms?: string;
  
  // Step 3
  moduleAccess: ModuleAccess[];
  dataAccessScope: DataAccessScope;
  customRestrictions: CustomRestrictions;
  
  // Step 4
  apiEnabled: boolean;
  apiConfig?: ApiConfiguration;
  
  // Step 5
  sendWelcomeEmail: boolean;
  activateImmediately: boolean;
  scheduledActivation?: Date;
  acceptedTerms: boolean;
}

export interface ModuleAccess {
  moduleId: string;
  moduleName: string;
  category: string;
  permissions: string[];
  enabled: boolean;
  customSettings?: Record<string, any>;
}

export interface DataAccessScope {
  scope: 'all' | 'own_org' | 'restricted';
  anonymizePII: boolean;
  geographicRestrictions?: string[];
  timeRange?: {
    type: 'all' | 'months' | 'custom';
    value?: number | { start: Date; end: Date };
  };
  exportFormats: string[];
}

export interface CustomRestrictions {
  readOnly: boolean;
  requireIPWhitelist: boolean;
  ipWhitelist?: string[];
  require2FA: boolean;
  sessionTimeout?: number;
}

export interface ApiConfiguration {
  scopes: string[];
  rateLimit: number;
  environment: 'production' | 'sandbox';
  keyName: string;
  webhookUrl?: string;
  webhookEvents?: string[];
  ipWhitelist?: string[];
}

export interface PartnerType {
  id: string;
  name: string;
  category: 'institutional' | 'business';
  description?: string;
  default_modules?: any;
  requires_api: boolean;
  transaction_enabled: boolean;
}
