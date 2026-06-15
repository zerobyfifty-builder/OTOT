import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Disable hyphenation to prevent word breaks with hyphens
Font.registerHyphenationCallback(word => [word]);

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  border: {
    border: '3px solid #4ade80',
    padding: 30,
    height: '100%',
    position: 'relative',
  },
  // Logos row
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  ktbLogo: {
    width: 140,
    height: 50,
    objectFit: 'contain',
  },
  kfsLogo: {
    width: 65,
    height: 65,
    objectFit: 'contain',
  },
  // Header
  initiativeText: {
    fontSize: 14,
    color: '#2f7c49',
    textAlign: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    color: '#1a1a1a',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  titleLine2: {
    fontSize: 26,
    color: '#1a1a1a',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  // Presentation
  presentedText: {
    fontSize: 13,
    color: '#444',
    textAlign: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 6,
    textDecoration: 'underline',
  },
  plantingText: {
    fontSize: 13,
    color: '#444',
    textAlign: 'center',
    marginBottom: 28,
  },
  plantingLocation: {
    color: '#2f7c49',
    fontWeight: 'bold',
  },
  // Impact box
  impactBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginHorizontal: 30,
    marginBottom: 28,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  impactDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  impactLabel: {
    fontSize: 12,
    color: '#555',
  },
  impactValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  // Message
  message: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#2f7c49',
    marginHorizontal: 30,
    lineHeight: 1.7,
    marginBottom: 20,
  },
  // Footer
  footer: {
    marginTop: 'auto',
  },
  footerDivider: {
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 9,
    color: '#666',
  },
  footerCenter: {
    textAlign: 'center',
    marginBottom: 10,
  },
  footerCenterText: {
    fontSize: 10,
    color: '#555',
  },
  qrCode: {
    width: 70,
    height: 70,
    marginHorizontal: 'auto',
  },
});

interface TreeCertificateProps {
  userName: string;
  numTrees: number;
  date: string;
  certificateId: string;
  ototId: string;
  co2Offset: number;
  location?: string;
  qrCodeDataUrl?: string;
  ktbLogoDataUrl?: string;
  kfsLogoDataUrl?: string;
}

export const TreeCertificate = ({
  userName,
  numTrees,
  date,
  certificateId,
  ototId,
  co2Offset,
  location,
  qrCodeDataUrl,
  ktbLogoDataUrl,
  kfsLogoDataUrl,
}: TreeCertificateProps) => (
  <Document>
    <Page size="A4" style={styles.page} orientation="portrait">
      <View style={styles.border}>
        {/* Logos */}
        <View style={styles.logoRow}>
          {ktbLogoDataUrl ? (
            <Image style={styles.ktbLogo} src={ktbLogoDataUrl} />
          ) : (
            <View style={styles.ktbLogo} />
          )}
          {kfsLogoDataUrl ? (
            <Image style={styles.kfsLogo} src={kfsLogoDataUrl} />
          ) : (
            <View style={styles.kfsLogo} />
          )}
        </View>

        {/* Header */}
        <Text style={styles.initiativeText}>One Tourist One Tree Initiative</Text>
      <Text style={styles.title}>Certificate of Environmental Action</Text>

        {/* Presentation */}
        <Text style={styles.presentedText}>This certificate is proudly presented to</Text>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.plantingText}>
          for planting {numTrees} {numTrees === 1 ? 'tree' : 'trees'} in <Text style={styles.plantingLocation}>{location && location.trim() ? location : 'Kenya'}</Text> on {date}
        </Text>

        {/* Impact Box */}
        <View style={styles.impactBox}>
          <View style={[styles.impactRow, styles.impactDivider]}>
            <Text style={styles.impactLabel}>Trees Planted:</Text>
            <Text style={styles.impactValue}>{numTrees} {numTrees === 1 ? 'tree' : 'trees'}</Text>
          </View>
          <View style={[styles.impactRow, styles.impactDivider]}>
            <Text style={styles.impactLabel}>Estimated Annual CO₂ Offset:</Text>
            <Text style={styles.impactValue}>{co2Offset.toFixed(2)} kg</Text>
          </View>
          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>OTOT ID:</Text>
            <Text style={styles.impactValue}>{ototId}</Text>
          </View>
        </View>

        {/* Inspirational Message */}
        <Text style={styles.message}>
          Your action restores Kenya's ecosystems, combats climate change, and supports local communities. Through the creation of innovative Tourist Regenerative Forests, together we are building a sustainable future for humanity while protecting our one shared planet.
        </Text>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Certificate ID: {certificateId}</Text>
            <Text style={styles.footerText}>Date Issued: {date}</Text>
          </View>
          <View style={styles.footerCenter}>
            <Text style={styles.footerCenterText}>Kenya Tourism Board - Environmental Partnership</Text>
          </View>
          {qrCodeDataUrl && (
            <Image style={styles.qrCode} src={qrCodeDataUrl} />
          )}
        </View>
      </View>
    </Page>
  </Document>
);
