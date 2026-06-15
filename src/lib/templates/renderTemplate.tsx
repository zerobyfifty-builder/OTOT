import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { TemplateDesign, TemplateBlock } from './types';
import { isV2Design } from './typesV2';
import { renderTemplateDocumentV2 } from './htmlToPdf';

type Vars = Record<string, string | number | undefined | null>;

function substitute(text: string, vars: Vars): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k];
    if (v === undefined || v === null) return '';
    return String(v);
  });
}

function resolveLogo(token: string | undefined, vars: Vars): string | undefined {
  if (!token) return undefined;
  const m = token.match(/^\{\{(\w+)\}\}$/);
  if (m) {
    const v = vars[m[1]];
    return typeof v === 'string' && v ? v : undefined;
  }
  return token;
}

const PLEDGE_POINTS = [
  'Respect nature by following marked paths and\nprotecting natural surroundings',
  'Leave no waste behind by disposing of trash properly and\nkeeping natural areas clean',
  'Support reforestation to fight climate change through\ntree planting',
  'Reduce my carbon footprint by choosing eco-friendly\ntravel options',
  'Respect wildlife by observing animals without\ndisturbing their habitats',
  'Respect local cultures by honouring traditions and\nsupporting communities',
  'Use resources wisely by conserving water and\nminimising waste',
  'Camp responsibly in designated areas with\neco-friendly practices',
  "Learn and share about Kenya's conservation efforts",
  'Care for our global environment through responsible tourism',
];

function renderPledgeDefault(design: TemplateDesign, vars: Vars) {
  const primary = design.style.primaryColor || '#2f7c49';
  const f = design.presetFields || {};
  const subtitle = substitute(f.subtitle || 'Certificate of Commitment', vars);
  const title = substitute(f.title || 'I am a Responsible Traveler', vars);
  const presentedTo = substitute(f.presentedTo || 'This certificate is presented to', vars);
  const pledgeDateText = substitute(f.pledgeDateText || 'for taking the Responsible Traveler Pledge on {{date}}', vars);
  const pledgeHeading = substitute(f.pledgeHeading || 'I PLEDGE TO', vars);

  const header = design.blocks.find((b) => b.kind === 'header');
  const leftLogo = resolveLogo(header?.leftLogo || '{{ktbLogoUrl}}', vars);
  const rightLogo = resolveLogo(header?.rightLogo || '{{partnerLogoUrl}}', vars);
  const qr = resolveLogo('{{qrCodeUrl}}', vars);
  const certId = substitute('{{certificateId}}', vars);
  const ototId = substitute('{{ototId}}', vars);
  const dateStr = substitute('{{date}}', vars);

  const s = StyleSheet.create({
    page: { flexDirection: 'column', backgroundColor: '#ffffff', padding: 24 },
    border: { border: `3px solid ${primary === '#2f7c49' ? '#4ade80' : primary}`, borderRadius: 4, padding: 28, height: '100%', position: 'relative' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    ktbLogo: { width: 140, height: 55, objectFit: 'contain' },
    kfsLogo: { width: 60, height: 65, objectFit: 'contain' },
    subtitle: { fontSize: 16, color: primary, textAlign: 'center', marginBottom: 4, marginTop: 6 },
    title: { fontSize: 28, color: '#1a1a1a', fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
    presentedTo: { fontSize: 12, color: '#555', textAlign: 'center', marginBottom: 4 },
    userName: { fontSize: 26, fontWeight: 'bold', color: primary, textAlign: 'center', marginBottom: 8, fontStyle: 'italic' },
    pledgeDate: { fontSize: 11, color: '#555', textAlign: 'center', marginBottom: 16 },
    iPledgeTo: { fontSize: 11, color: '#888', textAlign: 'center', marginBottom: 12, letterSpacing: 2 },
    pledgeItem: { fontSize: 10.5, color: '#333', textAlign: 'center', marginBottom: 3, lineHeight: 1.5, fontWeight: 'bold' },
    tilde: { fontSize: 10, color: '#aaa', textAlign: 'center', marginBottom: 3 },
    footer: { marginTop: 'auto', paddingTop: 14, borderTop: '1px solid #ddd' },
    footerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    footerLeft: { flex: 1 },
    footerRight: { flex: 1, alignItems: 'flex-end' },
    footerText: { fontSize: 8, color: '#777', marginBottom: 2 },
    qrCode: { width: 55, height: 55 },
    qrContainer: { alignItems: 'center' },
  });

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={s.page}>
        <View style={s.border}>
          <View style={s.headerRow}>
            {leftLogo ? <Image style={s.ktbLogo} src={leftLogo} /> : <View style={s.ktbLogo} />}
            {rightLogo ? <Image style={s.kfsLogo} src={rightLogo} /> : <View style={s.kfsLogo} />}
          </View>
          <Text style={s.subtitle}>{subtitle}</Text>
          <Text style={s.title}>{title}</Text>
          <Text style={s.presentedTo}>{presentedTo}</Text>
          <Text style={s.userName}>{substitute('{{userName}}', vars)}</Text>
          <Text style={s.pledgeDate}>{pledgeDateText}</Text>
          <Text style={s.iPledgeTo}>{pledgeHeading}</Text>
          <View>
            {PLEDGE_POINTS.map((p, i) => (
              <View key={i}>
                <Text style={s.pledgeItem}>{p}</Text>
                {i < PLEDGE_POINTS.length - 1 && <Text style={s.tilde}>~ ~</Text>}
              </View>
            ))}
          </View>
          <View style={s.footer}>
            <View style={s.footerContent}>
              <View style={s.footerLeft}>
                <Text style={s.footerText}>Certificate ID: {certId}</Text>
                {ototId ? <Text style={s.footerText}>OTOT ID: {ototId}</Text> : null}
              </View>
              {qr ? (
                <View style={s.qrContainer}>
                  <Image style={s.qrCode} src={qr} />
                </View>
              ) : null}
              <View style={s.footerRight}>
                <Text style={s.footerText}>Date: {dateStr}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function renderTemplateDocument(design: TemplateDesign, vars: Vars) {
  if (design.layoutPreset === 'pledge_default') {
    return renderPledgeDefault(design, vars);
  }
  const styles = StyleSheet.create({
    page: {
      padding: design.style.margin || 36,
      backgroundColor: '#ffffff',
      fontFamily: 'Helvetica',
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    logo: { width: 70, height: 70, objectFit: 'contain' },
    block: { marginVertical: 4 },
    title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: design.style.primaryColor },
    subtitle: { fontSize: 14, textAlign: 'center', color: design.style.accentColor, marginBottom: 8 },
    awardedTo: { fontSize: 12, textAlign: 'center', marginTop: 12, color: '#555' },
    recipientName: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginVertical: 6 },
    paragraph: { fontSize: 11, textAlign: 'center', lineHeight: 1.5, marginVertical: 4, color: '#333' },
    stats: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 12 },
    statBox: { alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: 'bold', color: design.style.primaryColor },
    statLabel: { fontSize: 9, color: '#666', marginTop: 2 },
    footer: { fontSize: 8, textAlign: 'center', color: '#888', marginTop: 16 },
    qrRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    qr: { width: 70, height: 70 },
    idText: { fontSize: 9, color: '#666', marginLeft: 12 },
  });

  const renderBlock = (b: TemplateBlock, i: number) => {
    switch (b.kind) {
      case 'header': {
        const left = resolveLogo(b.leftLogo, vars);
        const right = resolveLogo(b.rightLogo, vars);
        return (
          <View key={i} style={styles.headerRow}>
            {left ? <Image src={left} style={styles.logo} /> : <View style={styles.logo} />}
            {right ? <Image src={right} style={styles.logo} /> : <View style={styles.logo} />}
          </View>
        );
      }
      case 'title':
        return <Text key={i} style={styles.title}>{substitute(b.text || '', vars)}</Text>;
      case 'subtitle':
        return <Text key={i} style={styles.subtitle}>{substitute(b.text || '', vars)}</Text>;
      case 'awardedTo':
        return <Text key={i} style={styles.awardedTo}>{substitute(b.text || 'This is awarded to', vars)}</Text>;
      case 'recipientName':
        return <Text key={i} style={styles.recipientName}>{substitute(b.text || '{{userName}}', vars)}</Text>;
      case 'paragraph':
        return <Text key={i} style={styles.paragraph}>{substitute(b.text || '', vars)}</Text>;
      case 'stats': {
        const parts = (b.text || '').split('|').map((s) => s.trim()).filter(Boolean);
        return (
          <View key={i} style={styles.stats}>
            {parts.map((p, idx) => {
              const [label, value] = p.split(':');
              return (
                <View key={idx} style={styles.statBox}>
                  <Text style={styles.statValue}>{substitute(value || '', vars)}</Text>
                  <Text style={styles.statLabel}>{label || ''}</Text>
                </View>
              );
            })}
          </View>
        );
      }
      case 'qrId': {
        const qr = resolveLogo('{{qrCodeUrl}}', vars);
        return (
          <View key={i} style={styles.qrRow}>
            {qr ? <Image src={qr} style={styles.qr} /> : null}
            <Text style={styles.idText}>ID: {substitute('{{certificateId}}', vars)}</Text>
          </View>
        );
      }
      case 'signature':
        return <Text key={i} style={styles.paragraph}>{substitute(b.text || '', vars)}</Text>;
      case 'footer':
        return <Text key={i} style={styles.footer}>{substitute(b.text || '', vars)}</Text>;
      case 'spacer':
        return <View key={i} style={{ height: b.fontSize || 12 }} />;
      default:
        return null;
    }
  };

  return (
    <Document>
      <Page size={design.style.pageSize} orientation={design.style.orientation} style={styles.page}>
        {design.blocks.map(renderBlock)}
      </Page>
    </Document>
  );
}

export function renderSocialMessage(design: TemplateDesign, vars: Vars): { text: string; hashtags: string[] } {
  const s = design.social || { message: '', hashtags: [] };
  return {
    text: substitute(s.message, vars),
    hashtags: s.hashtags || [],
  };
}
