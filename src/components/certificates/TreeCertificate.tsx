import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
  },
  border: {
    border: '4px solid #4ade80',
    padding: 30,
    height: '100%',
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    marginHorizontal: 'auto',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    color: '#2f7c49',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#4ade80',
    marginBottom: 20,
  },
  certificateText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2f7c49',
    textAlign: 'center',
    marginBottom: 10,
    textDecoration: 'underline',
  },
  impactBox: {
    backgroundColor: '#f0fdf4',
    padding: 20,
    marginVertical: 20,
    borderRadius: 8,
    border: '2px solid #4ade80',
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  impactLabel: {
    fontSize: 12,
    color: '#666',
  },
  impactValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2f7c49',
  },
  message: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#666',
    marginTop: 20,
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTop: '1px solid #e5e7eb',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  footerText: {
    fontSize: 10,
    color: '#666',
  },
  qrCode: {
    width: 60,
    height: 60,
    marginHorizontal: 'auto',
    marginTop: 10,
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
}

export const TreeCertificate = ({ 
  userName, 
  numTrees,
  date, 
  certificateId, 
  ototId,
  co2Offset,
  location,
  qrCodeDataUrl 
}: TreeCertificateProps) => (
  <Document>
    <Page size="A4" style={styles.page} orientation="portrait">
      <View style={styles.border}>
        <View style={styles.header}>
          <Text style={styles.title}>🌳 Certificate of Environmental Contribution</Text>
          <Text style={styles.subtitle}>One Tourist One Tree Initiative</Text>
        </View>

        <Text style={styles.certificateText}>This certificate is proudly presented to</Text>
        
        <Text style={styles.userName}>{userName}</Text>
        
        <Text style={styles.certificateText}>
          for planting {numTrees} {numTrees === 1 ? 'tree' : 'trees'} in Kenya on {date}
        </Text>

        <View style={styles.impactBox}>
          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>Trees Planted:</Text>
            <Text style={styles.impactValue}>{numTrees} {numTrees === 1 ? 'tree' : 'trees'}</Text>
          </View>
          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>Estimated Annual CO₂ Offset:</Text>
            <Text style={styles.impactValue}>{co2Offset.toFixed(2)} kg</Text>
          </View>
          {location && (
            <View style={styles.impactRow}>
              <Text style={styles.impactLabel}>Location:</Text>
              <Text style={styles.impactValue}>{location}</Text>
            </View>
          )}
          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>OTOT ID:</Text>
            <Text style={styles.impactValue}>{ototId}</Text>
          </View>
        </View>

        <Text style={styles.message}>
          Your contribution helps restore Kenya's ecosystems, combat climate change, 
          and support local communities. Together, we're building a sustainable future 
          for tourism and the environment.
        </Text>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Certificate ID: {certificateId}</Text>
            <Text style={styles.footerText}>Date Issued: {date}</Text>
          </View>
          <View style={{ textAlign: 'center', marginTop: 10 }}>
            <Text style={styles.footerText}>Kenya Tourism Board - Environmental Partnership</Text>
          </View>
          {qrCodeDataUrl && (
            <Image style={styles.qrCode} src={qrCodeDataUrl} />
          )}
        </View>
      </View>
    </Page>
  </Document>
);
