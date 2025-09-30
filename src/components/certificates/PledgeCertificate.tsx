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
    fontSize: 32,
    color: '#2f7c49',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#4ade80',
    marginBottom: 20,
  },
  certificateText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
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
  pledgeList: {
    marginTop: 20,
    marginBottom: 20,
  },
  pledgeItem: {
    fontSize: 11,
    marginBottom: 8,
    color: '#333',
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

const pledgePoints = [
  "Respect nature by following marked paths and protecting natural surroundings",
  "Leave no waste behind by disposing of trash properly and keeping natural areas clean",
  "Support reforestation to fight climate change through tree planting",
  "Reduce my carbon footprint by choosing eco-friendly travel options",
  "Respect wildlife by observing animals without disturbing their habitats",
  "Respect local cultures by honoring traditions and supporting communities",
  "Use resources wisely by conserving water and minimizing waste",
  "Camp responsibly in designated areas with eco-friendly practices",
  "Learn and share about Kenya's conservation efforts",
  "Care for our global environment through responsible tourism"
];

interface PledgeCertificateProps {
  userName: string;
  date: string;
  certificateId: string;
  ototId?: string;
  qrCodeDataUrl?: string;
}

export const PledgeCertificate = ({ 
  userName, 
  date, 
  certificateId, 
  ototId,
  qrCodeDataUrl 
}: PledgeCertificateProps) => (
  <Document>
    <Page size="A4" style={styles.page} orientation="portrait">
      <View style={styles.border}>
        <View style={styles.header}>
          <Text style={styles.title}>🌿 I am a Responsible Traveler</Text>
          <Text style={styles.subtitle}>Certificate of Commitment</Text>
        </View>

        <Text style={styles.certificateText}>This certificate is presented to</Text>
        
        <Text style={styles.userName}>{userName}</Text>
        
        <Text style={styles.certificateText}>
          for taking the Responsible Traveler Pledge on {date}
        </Text>

        <View style={styles.pledgeList}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 10, color: '#2f7c49' }}>
            My Pledge Commitments:
          </Text>
          {pledgePoints.map((point, index) => (
            <Text key={index} style={styles.pledgeItem}>
              {index + 1}. {point}
            </Text>
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Certificate ID: {certificateId}</Text>
            <Text style={styles.footerText}>Date: {date}</Text>
          </View>
          {ototId && (
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>OTOT ID: {ototId}</Text>
            </View>
          )}
          {qrCodeDataUrl && (
            <Image style={styles.qrCode} src={qrCodeDataUrl} />
          )}
        </View>
      </View>
    </Page>
  </Document>
);
