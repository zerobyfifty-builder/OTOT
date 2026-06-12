// Templates Studio shared types.
// Kept independent of @react-pdf so renderer and resolver can import without a heavy graph.

export type TemplateOutputKind = 'pdf' | 'social';
export type TemplateStatus = 'draft' | 'pending_approval' | 'approved' | 'archived';
export type TemplateAssignmentScope = 'global' | 'partner' | 'portal';

export type CategoryKey =
  | 'pledge_certificate'
  | 'tree_certificate'
  | 'tourist_invoice'
  | 'b2b_invoice'
  | 'agent_invoice'
  | 'lodge_receipt'
  | 'social_share_pledge'
  | 'social_share_contribution'
  | 'social_share_generic';

export interface TemplateBlock {
  id: string;
  kind:
    | 'header'
    | 'title'
    | 'subtitle'
    | 'paragraph'
    | 'awardedTo'
    | 'recipientName'
    | 'stats'
    | 'signature'
    | 'qrId'
    | 'footer'
    | 'spacer';
  text?: string;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  color?: string;
  // For header
  leftLogo?: string; // token or url
  rightLogo?: string; // token or url
}

export interface TemplateStyle {
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  pageSize: 'A4' | 'LETTER';
  orientation: 'portrait' | 'landscape';
  margin: number;
}

export interface TemplateDesign {
  version: 1;
  style: TemplateStyle;
  blocks: TemplateBlock[];
  // For social categories
  social?: {
    message: string;
    hashtags: string[];
  };
}

export interface DocumentTemplate {
  id: string;
  category_key: CategoryKey;
  name: string;
  description: string | null;
  status: TemplateStatus;
  version: number;
  is_default: boolean;
  current_design_id: string | null;
  approved_at: string | null;
  parity_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateCategory {
  key: CategoryKey;
  label: string;
  description: string | null;
  output_kind: TemplateOutputKind;
  merge_fields: string[];
  default_page_size: string;
  default_orientation: string;
  sort_order: number;
  is_active: boolean;
}

export interface TemplateAssignment {
  id: string;
  category_key: CategoryKey;
  template_id: string;
  scope: TemplateAssignmentScope;
  scope_ref_id: string | null;
  is_active: boolean;
  priority: number;
}

export interface ResolveContext {
  partnerOrgId?: string | null;
  portal?: 'tourist' | 'b2b' | 'agent' | 'lodge' | null;
}
