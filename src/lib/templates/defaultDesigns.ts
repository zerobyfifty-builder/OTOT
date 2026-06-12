import type { CategoryKey, TemplateDesign } from './types';

const baseStyle = {
  primaryColor: '#2f7c49',
  accentColor: '#1a4d2e',
  fontFamily: 'Helvetica',
  pageSize: 'A4' as const,
  orientation: 'landscape' as const,
  margin: 36,
};

export function getDefaultDesign(category: CategoryKey): TemplateDesign {
  if (category === 'pledge_certificate') {
    return {
      version: 1,
      style: { ...baseStyle, orientation: 'portrait', margin: 24 },
      layoutPreset: 'pledge_default',
      presetFields: {
        subtitle: 'Certificate of Commitment',
        title: 'I am a Responsible Traveler',
        presentedTo: 'This certificate is presented to',
        pledgeDateText: 'for taking the Responsible Traveler Pledge on {{date}}',
        pledgeHeading: 'I PLEDGE TO',
      },
      blocks: [
        { id: 'h', kind: 'header', leftLogo: '{{ktbLogoUrl}}', rightLogo: '{{partnerLogoUrl}}' },
      ],
    };
  }
  if (category === 'tree_certificate') {
    return {
      version: 1,
      style: { ...baseStyle },
      blocks: [
        { id: '1', kind: 'header', leftLogo: '{{ktbLogoUrl}}', rightLogo: '{{partnerLogoUrl}}' },
        { id: '2', kind: 'title', text: 'Tree Planting Certificate' },
        { id: '3', kind: 'subtitle', text: 'Kenya Tourism Board' },
        { id: '4', kind: 'awardedTo', text: 'Awarded to' },
        { id: '5', kind: 'recipientName', text: '{{userName}}' },
        { id: '6', kind: 'paragraph', text: 'For contributing {{numTrees}} tree(s) at {{location}}, offsetting {{co2Offset}} kg of CO₂.' },
        { id: '7', kind: 'stats', text: 'Trees:{{numTrees}}|CO₂ kg:{{co2Offset}}|Location:{{location}}' },
        { id: '8', kind: 'qrId' },
        { id: '9', kind: 'footer', text: 'Issued {{date}} · ID {{certificateId}}' },
      ],
    };
  }
  if (category.startsWith('social_')) {
    return {
      version: 1,
      style: { ...baseStyle, orientation: 'portrait' },
      blocks: [],
      social: {
        message: 'I just contributed {{numTrees}} tree(s) with @KenyaTourism — join me! {{verificationUrl}}',
        hashtags: ['MagicalKenya', 'PlantATree'],
      },
    };
  }
  // invoice variants
  return {
    version: 1,
    style: { ...baseStyle, orientation: 'portrait' },
    blocks: [
      { id: '1', kind: 'header', leftLogo: '{{ktbLogoUrl}}', rightLogo: '{{partnerLogoUrl}}' },
      { id: '2', kind: 'title', text: 'Contribution Invoice' },
      { id: '3', kind: 'subtitle', text: 'Kenya Tourism Board' },
      { id: '4', kind: 'paragraph', text: 'Date: {{date}}' },
      { id: '5', kind: 'paragraph', text: 'Contribution ID: {{contributionId}}' },
      { id: '6', kind: 'paragraph', text: 'Trees: {{numTrees}}   Amount: {{currency}} {{amount}}' },
      { id: '7', kind: 'footer', text: 'Thank you for your contribution.' },
    ],
  };
}
