import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { TemplateDesign, TemplateBlock } from './types';

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

export function renderTemplateDocument(design: TemplateDesign, vars: Vars) {
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
