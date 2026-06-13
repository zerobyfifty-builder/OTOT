// V2 WYSIWYG template design types.
// V1 (legacy block) types continue to live in ./types.ts and are not modified.

import type { CategoryKey } from './types';

export type TipTapJSON = {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapJSON[];
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  text?: string;
};

export interface TemplateDesignV2 {
  version: 2;
  starterKey: string; // e.g. 'tree_certificate.classic'
  style: {
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    pageSize: 'A4' | 'LETTER';
    orientation: 'portrait' | 'landscape';
    margin: number;
  };
  logos: {
    left?: string; // token like {{ktbLogoUrl}} or data URL
    right?: string;
  };
  // Named zones (e.g. header, body, footer, signature) holding TipTap JSON.
  zones: Record<string, TipTapJSON>;
  // Email only
  subject?: string;
  // Social only
  hashtags?: string[];
}

export interface TemplateStarter {
  key: string; // e.g. 'tree_certificate.classic'
  category: CategoryKey;
  label: string;
  description?: string;
  thumbnail?: string; // optional image URL
  design: TemplateDesignV2;
}

export function isV2Design(d: any): d is TemplateDesignV2 {
  return !!d && typeof d === 'object' && d.version === 2 && d.zones;
}
