import type { CategoryKey } from '../types';
import type { TemplateDesignV2, TemplateStarter, TipTapJSON } from '../typesV2';

// ---------- Helpers to build TipTap JSON ----------

const doc = (...content: TipTapJSON[]): TipTapJSON => ({ type: 'doc', content });
const p = (...content: TipTapJSON[]): TipTapJSON => ({ type: 'paragraph', content });
const text = (t: string, marks?: TipTapJSON['marks']): TipTapJSON => ({ type: 'text', text: t, marks });
const h = (level: 1 | 2 | 3, ...content: TipTapJSON[]): TipTapJSON => ({
  type: 'heading',
  attrs: { level, textAlign: 'center' },
  content,
});
const mf = (name: string): TipTapJSON => ({ type: 'mergeField', attrs: { name } });
const center = (...content: TipTapJSON[]): TipTapJSON => ({
  type: 'paragraph',
  attrs: { textAlign: 'center' },
  content,
});
const bullets = (...items: TipTapJSON[][]): TipTapJSON => ({
  type: 'bulletList',
  content: items.map((c) => ({ type: 'listItem', content: [{ type: 'paragraph', content: c }] })),
});

const baseStyle = {
  primaryColor: '#2f7c49',
  accentColor: '#1a4d2e',
  fontFamily: 'Helvetica',
  pageSize: 'A4' as const,
  orientation: 'landscape' as const,
  margin: 36,
};

// ---------- Starters ----------

function treeCertClassic(): TemplateDesignV2 {
  return {
    version: 2,
    starterKey: 'tree_certificate.classic',
    style: { ...baseStyle, orientation: 'landscape' },
    logos: { left: '{{ktbLogoUrl}}', right: '{{partnerLogoUrl}}' },
    zones: {
      body: doc(
        h(1, text('Tree Planting Certificate')),
        center(text('Kenya Tourism Board', [{ type: 'italic' }])),
        center(text('Awarded to')),
        h(2, text('', [{ type: 'bold' }]), mf('userName')),
        center(
          text('For contributing '),
          mf('numTrees'),
          text(' tree(s) at '),
          mf('location'),
          text(', offsetting '),
          mf('co2Offset'),
          text(' kg of CO₂.')
        ),
      ),
      footer: doc(center(text('Issued '), mf('date'), text(' · ID '), mf('certificateId'))),
    },
  };
}

function treeCertModern(): TemplateDesignV2 {
  return {
    version: 2,
    starterKey: 'tree_certificate.modern',
    style: { ...baseStyle, orientation: 'portrait', primaryColor: '#0f766e', accentColor: '#134e4a' },
    logos: { left: '{{ktbLogoUrl}}', right: '{{partnerLogoUrl}}' },
    zones: {
      body: doc(
        center(text('CERTIFICATE OF CONTRIBUTION', [{ type: 'bold' }])),
        h(1, text('A Tree Planted in Your Name')),
        center(text('Presented to')),
        h(2, mf('userName')),
        center(
          text('You have helped plant '),
          mf('numTrees'),
          text(' tree(s) in '),
          mf('location'),
          text('.')
        ),
        center(text('Estimated CO₂ offset: '), mf('co2Offset'), text(' kg')),
      ),
      footer: doc(center(text('{{date}} · '), mf('certificateId'))),
    },
  };
}

function treeCertCompact(): TemplateDesignV2 {
  return {
    version: 2,
    starterKey: 'tree_certificate.compact',
    style: { ...baseStyle, orientation: 'portrait', margin: 24 },
    logos: { left: '{{ktbLogoUrl}}', right: '{{partnerLogoUrl}}' },
    zones: {
      body: doc(
        h(2, text('Tree Certificate')),
        center(mf('userName'), text(' · '), mf('numTrees'), text(' trees')),
        center(text('Location: '), mf('location')),
        center(text('CO₂ offset: '), mf('co2Offset'), text(' kg')),
      ),
      footer: doc(center(text('ID '), mf('certificateId'), text(' · '), mf('date'))),
    },
  };
}

function pledgeCertClassic(): TemplateDesignV2 {
  const tilde = (): TipTapJSON => ({
    type: 'paragraph',
    attrs: { textAlign: 'center' },
    content: [text('~ ~', [{ type: 'textStyle', attrs: { color: '#aaaaaa' } }])],
  });
  const point = (s: string): TipTapJSON => ({
    type: 'paragraph',
    attrs: { textAlign: 'center' },
    content: [text(s, [{ type: 'bold' }])],
  });
  const points = [
    'Respect nature by following marked paths and protecting natural surroundings',
    'Leave no waste behind by disposing of trash properly and keeping natural areas clean',
    'Support reforestation to fight climate change through tree planting',
    'Reduce my carbon footprint by choosing eco-friendly travel options',
    'Respect wildlife by observing animals without disturbing their habitats',
    'Respect local cultures by honouring traditions and supporting communities',
    'Use resources wisely by conserving water and minimising waste',
    'Camp responsibly in designated areas with eco-friendly practices',
    "Learn and share about Kenya's conservation efforts",
    'Care for our global environment through responsible tourism',
  ];
  const bodyContent: TipTapJSON[] = [
    center(text('Certificate of Commitment', [{ type: 'textStyle', attrs: { color: '#2f7c49' } }])),
    h(1, text('I am a Responsible Traveler', [{ type: 'bold' }])),
    center(text('This certificate is presented to', [{ type: 'textStyle', attrs: { color: '#555555' } }])),
    h(2, mf('userName')),
    center(text('for taking the Responsible Traveler Pledge on ', [{ type: 'textStyle', attrs: { color: '#555555' } }]), mf('date')),
    center(text('I PLEDGE TO', [{ type: 'bold' }, { type: 'textStyle', attrs: { color: '#888888' } }])),
  ];
  points.forEach((s, i) => {
    bodyContent.push(point(s));
    if (i < points.length - 1) bodyContent.push(tilde());
  });
  return {
    version: 2,
    starterKey: 'pledge_certificate.classic',
    style: {
      ...baseStyle,
      orientation: 'portrait',
      margin: 24,
      primaryColor: '#4ade80',
      accentColor: '#2f7c49',
    },
    logos: { left: '{{ktbLogoUrl}}', right: '{{partnerLogoUrl}}' },
    zones: {
      body: { type: 'doc', content: bodyContent },
      footer: doc({
        type: 'paragraph',
        content: [
          text('Certificate ID: '),
          mf('certificateId'),
          text('     OTOT ID: '),
          mf('ototId'),
          text('          Date: '),
          mf('date'),
        ],
      }),
    },
  };
}

function pledgeCertMinimal(): TemplateDesignV2 {
  return {
    version: 2,
    starterKey: 'pledge_certificate.minimal',
    style: { ...baseStyle, orientation: 'portrait', margin: 36, primaryColor: '#1f2937', accentColor: '#374151' },
    logos: { left: '{{ktbLogoUrl}}', right: '{{partnerLogoUrl}}' },
    zones: {
      body: doc(
        h(1, text('Responsible Traveler Pledge')),
        center(mf('userName'), text(' commits to travel responsibly in Kenya.')),
        center(text('Signed on '), mf('date')),
      ),
      footer: doc(center(text('Certificate ID: '), mf('certificateId'))),
    },
  };
}

function invoiceStandard(category: CategoryKey): TemplateDesignV2 {
  return {
    version: 2,
    starterKey: `${category}.standard`,
    style: { ...baseStyle, orientation: 'portrait', margin: 36 },
    logos: { left: '{{ktbLogoUrl}}', right: '{{partnerLogoUrl}}' },
    zones: {
      body: doc(
        h(1, text('Contribution Invoice')),
        center(text('Kenya Tourism Board')),
        p(text('Date: '), mf('date')),
        p(text('Contribution ID: '), mf('contributionId')),
        p(text('Trees: '), mf('numTrees'), text('    Amount: '), mf('currency'), text(' '), mf('amount')),
      ),
      footer: doc(center(text('Thank you for your contribution.'))),
    },
  };
}

function invoiceCompact(category: CategoryKey): TemplateDesignV2 {
  return {
    version: 2,
    starterKey: `${category}.compact`,
    style: { ...baseStyle, orientation: 'portrait', margin: 24 },
    logos: { left: '{{ktbLogoUrl}}', right: '{{partnerLogoUrl}}' },
    zones: {
      body: doc(
        h(2, text('Invoice')),
        p(mf('date'), text(' · '), mf('contributionId')),
        p(mf('numTrees'), text(' trees · '), mf('currency'), text(' '), mf('amount')),
      ),
      footer: doc(center(text('Thank you.'))),
    },
  };
}

function receiptStandard(): TemplateDesignV2 {
  return {
    version: 2,
    starterKey: 'lodge_receipt.standard',
    style: { ...baseStyle, orientation: 'portrait', margin: 36 },
    logos: { left: '{{ktbLogoUrl}}', right: '{{partnerLogoUrl}}' },
    zones: {
      body: doc(
        h(1, text('Lodge Receipt')),
        p(text('Date: '), mf('date')),
        p(text('Contribution ID: '), mf('contributionId')),
        p(text('Amount: '), mf('currency'), text(' '), mf('amount')),
      ),
      footer: doc(center(text('Asante sana.'))),
    },
  };
}

function socialShort(category: CategoryKey): TemplateDesignV2 {
  return {
    version: 2,
    starterKey: `${category}.short`,
    style: { ...baseStyle, orientation: 'portrait' },
    logos: {},
    zones: {
      body: doc(p(text('I just contributed '), mf('numTrees'), text(' tree(s) with @KenyaTourism!'))),
    },
    hashtags: ['MagicalKenya', 'PlantATree'],
  };
}

function socialLong(category: CategoryKey): TemplateDesignV2 {
  return {
    version: 2,
    starterKey: `${category}.long`,
    style: { ...baseStyle, orientation: 'portrait' },
    logos: {},
    zones: {
      body: doc(
        p(
          text('Today I helped plant '),
          mf('numTrees'),
          text(' tree(s) in Kenya, offsetting '),
          mf('co2Offset'),
          text(' kg of CO₂. Join me — '),
          mf('verificationUrl'),
        ),
      ),
    },
    hashtags: ['MagicalKenya', 'PlantATree', 'ClimateAction'],
  };
}

// ---------- Registry ----------

export const STARTERS: TemplateStarter[] = [
  { key: 'tree_certificate.classic', category: 'tree_certificate', label: 'Classic landscape', description: 'KTB green border, landscape A4.', design: treeCertClassic() },
  { key: 'tree_certificate.modern', category: 'tree_certificate', label: 'Modern portrait', description: 'Teal accents, portrait A4.', design: treeCertModern() },
  { key: 'tree_certificate.compact', category: 'tree_certificate', label: 'Compact', description: 'Short, single-glance certificate.', design: treeCertCompact() },

  { key: 'pledge_certificate.classic', category: 'pledge_certificate', label: 'Classic pledge', description: 'Full 10-point Responsible Traveler pledge.', design: pledgeCertClassic() },
  { key: 'pledge_certificate.minimal', category: 'pledge_certificate', label: 'Minimal pledge', description: 'One-line commitment + signature.', design: pledgeCertMinimal() },

  { key: 'tourist_invoice.standard', category: 'tourist_invoice', label: 'Standard invoice', design: invoiceStandard('tourist_invoice') },
  { key: 'tourist_invoice.compact', category: 'tourist_invoice', label: 'Compact invoice', design: invoiceCompact('tourist_invoice') },

  { key: 'b2b_invoice.standard', category: 'b2b_invoice', label: 'Standard invoice', design: invoiceStandard('b2b_invoice') },
  { key: 'b2b_invoice.compact', category: 'b2b_invoice', label: 'Compact invoice', design: invoiceCompact('b2b_invoice') },

  { key: 'agent_invoice.standard', category: 'agent_invoice', label: 'Standard invoice', design: invoiceStandard('agent_invoice') },
  { key: 'agent_invoice.compact', category: 'agent_invoice', label: 'Compact invoice', design: invoiceCompact('agent_invoice') },

  { key: 'lodge_receipt.standard', category: 'lodge_receipt', label: 'Standard receipt', design: receiptStandard() },

  { key: 'social_share_pledge.short', category: 'social_share_pledge', label: 'Short message', design: socialShort('social_share_pledge') },
  { key: 'social_share_pledge.long', category: 'social_share_pledge', label: 'Long message', design: socialLong('social_share_pledge') },

  { key: 'social_share_contribution.short', category: 'social_share_contribution', label: 'Short message', design: socialShort('social_share_contribution') },
  { key: 'social_share_contribution.long', category: 'social_share_contribution', label: 'Long message', design: socialLong('social_share_contribution') },

  { key: 'social_share_generic.short', category: 'social_share_generic', label: 'Short message', design: socialShort('social_share_generic') },
  { key: 'social_share_generic.long', category: 'social_share_generic', label: 'Long message', design: socialLong('social_share_generic') },
];

export function startersForCategory(category: CategoryKey): TemplateStarter[] {
  return STARTERS.filter((s) => s.category === category);
}

export function findStarter(key: string): TemplateStarter | undefined {
  return STARTERS.find((s) => s.key === key);
}
