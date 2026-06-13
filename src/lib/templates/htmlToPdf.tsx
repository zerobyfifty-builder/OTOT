import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { TemplateDesignV2, TipTapJSON } from './typesV2';

type Vars = Record<string, string | number | undefined | null>;

function substitute(t: string, vars: Vars): string {
  return t.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? '' : String(v);
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

function collectMarks(marks?: TipTapJSON['marks']) {
  const style: any = {};
  if (!marks) return style;
  for (const m of marks) {
    if (m.type === 'bold') style.fontWeight = 'bold';
    if (m.type === 'italic') style.fontStyle = 'italic';
    if (m.type === 'underline') style.textDecoration = 'underline';
    if (m.type === 'textStyle' && m.attrs?.color) style.color = m.attrs.color;
  }
  return style;
}

/** Render the inline children of a paragraph/heading as a flat array of <Text> nodes. */
function renderInline(nodes: TipTapJSON[] | undefined, vars: Vars, baseStyle: any = {}): React.ReactNode[] {
  if (!nodes) return [];
  const out: React.ReactNode[] = [];
  nodes.forEach((n, i) => {
    if (n.type === 'text') {
      const s = { ...baseStyle, ...collectMarks(n.marks) };
      out.push(
        <Text key={i} style={s}>
          {substitute(n.text || '', vars)}
        </Text>,
      );
    } else if (n.type === 'mergeField') {
      const name = n.attrs?.name || '';
      const v = vars[name];
      out.push(
        <Text key={i} style={baseStyle}>
          {v === undefined || v === null ? `{{${name}}}` : String(v)}
        </Text>,
      );
    } else if (n.type === 'hardBreak') {
      out.push(<Text key={i}>{'\n'}</Text>);
    }
  });
  return out;
}

function renderBlock(node: TipTapJSON, idx: number, vars: Vars, design: TemplateDesignV2): React.ReactNode {
  const primary = design.style.primaryColor;
  switch (node.type) {
    case 'paragraph': {
      const align = node.attrs?.textAlign as any;
      return (
        <Text key={idx} style={{ fontSize: 11, marginVertical: 3, textAlign: align || 'left', color: '#333', lineHeight: 1.5 }}>
          {renderInline(node.content, vars)}
        </Text>
      );
    }
    case 'heading': {
      const level = (node.attrs?.level as number) || 1;
      const align = node.attrs?.textAlign as any;
      const size = level === 1 ? 22 : level === 2 ? 18 : 14;
      return (
        <Text key={idx} style={{ fontSize: size, fontWeight: 'bold', marginVertical: 6, textAlign: align || 'center', color: primary }}>
          {renderInline(node.content, vars)}
        </Text>
      );
    }
    case 'bulletList':
    case 'orderedList': {
      const items = node.content || [];
      return (
        <View key={idx} style={{ marginVertical: 4 }}>
          {items.map((li, i) => {
            const para = (li.content && li.content[0]) || { type: 'paragraph', content: [] };
            return (
              <View key={i} style={{ flexDirection: 'row', marginVertical: 1 }}>
                <Text style={{ width: 14, fontSize: 11 }}>{node.type === 'orderedList' ? `${i + 1}.` : '•'}</Text>
                <Text style={{ flex: 1, fontSize: 11, lineHeight: 1.5, color: '#333' }}>
                  {renderInline(para.content, vars)}
                </Text>
              </View>
            );
          })}
        </View>
      );
    }
    case 'image': {
      const src = node.attrs?.src;
      if (!src) return null;
      return <Image key={idx} src={src} style={{ maxWidth: '100%', marginVertical: 6 }} />;
    }
    default:
      // Unknown block: render its content if any.
      if (node.content) {
        return <View key={idx}>{node.content.map((c, i) => renderBlock(c, i, vars, design))}</View>;
      }
      return null;
  }
}

function renderZone(zone: TipTapJSON | undefined, vars: Vars, design: TemplateDesignV2): React.ReactNode {
  if (!zone || !zone.content) return null;
  return zone.content.map((b, i) => renderBlock(b, i, vars, design));
}

export function renderTemplateDocumentV2(design: TemplateDesignV2, vars: Vars) {
  const styles = StyleSheet.create({
    page: { padding: design.style.margin || 36, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    logo: { width: 80, height: 60, objectFit: 'contain' },
    border: { border: `2px solid ${design.style.primaryColor}`, borderRadius: 4, padding: 20, flexGrow: 1 },
    footer: { marginTop: 'auto', borderTop: '1px solid #ddd', paddingTop: 8 },
  });

  const left = resolveLogo(design.logos?.left, vars);
  const right = resolveLogo(design.logos?.right, vars);

  return (
    <Document>
      <Page size={design.style.pageSize} orientation={design.style.orientation} style={styles.page}>
        <View style={styles.border}>
          {(left || right) && (
            <View style={styles.header}>
              {left ? <Image src={left} style={styles.logo} /> : <View style={styles.logo} />}
              {right ? <Image src={right} style={styles.logo} /> : <View style={styles.logo} />}
            </View>
          )}
          {renderZone(design.zones.body, vars, design)}
          {design.zones.footer && (
            <View style={styles.footer}>{renderZone(design.zones.footer, vars, design)}</View>
          )}
        </View>
      </Page>
    </Document>
  );
}

/** Render TipTap JSON to a plain string for social/email use cases. */
export function renderZoneToPlainText(zone: TipTapJSON | undefined, vars: Vars): string {
  if (!zone) return '';
  const walk = (n: TipTapJSON): string => {
    if (n.type === 'text') return substitute(n.text || '', vars);
    if (n.type === 'mergeField') {
      const name = n.attrs?.name || '';
      const v = vars[name];
      return v === undefined || v === null ? `{{${name}}}` : String(v);
    }
    if (n.type === 'hardBreak') return '\n';
    if (n.content) {
      const inner = n.content.map(walk).join('');
      if (n.type === 'paragraph' || n.type === 'heading') return inner + '\n';
      return inner;
    }
    return '';
  };
  return walk(zone).trim();
}
