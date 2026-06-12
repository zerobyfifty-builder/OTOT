import type { CategoryKey } from './types';

export function getSampleData(category: CategoryKey): Record<string, string> {
  const common = {
    userName: 'Jane Wanjiku',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    certificateId: 'CERT-SAMPLE-12345',
    ototId: 'OTOT-SAMPLE',
    qrCodeUrl: '',
    ktbLogoUrl: '',
    partnerLogoUrl: '',
  };
  switch (category) {
    case 'tree_certificate':
      return { ...common, numTrees: '5', co2Offset: '110', location: 'Mau Forest', partnerName: 'Kenya Forest Service' };
    case 'tourist_invoice':
    case 'b2b_invoice':
      return { ...common, contributionId: 'CTR-00001', numTrees: '5', amount: '550', currency: 'KES', paymentMethod: 'M-Pesa', orgName: 'Acme Ltd', contactName: 'John Doe', billTo: 'Acme Ltd, Nairobi' };
    case 'agent_invoice':
      return {
        ...common,
        ticketNumber: 'TKT-001',
        pnr: 'PNR123',
        lpo: 'LPO-9',
        staffName: 'Mary Otieno',
        origin: 'NBO',
        destination: 'JFK',
        travelClass: 'Economy',
        treesNeeded: '12',
        co2Kg: '264',
        amountKes: '1,320',
        agentBusinessName: 'Sample Travels',
        agentContact: 'agent@example.com',
        billToBlock: 'Sample Travels\nNairobi, Kenya',
      };
    case 'social_share_pledge':
    case 'social_share_contribution':
    case 'social_share_generic':
      return { ...common, numTrees: '5', co2Offset: '110', verificationUrl: 'https://example.com/v/1', hashtags: '#KTB #PlantATree' };
    default:
      return common;
  }
}
