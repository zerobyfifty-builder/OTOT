import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 24,
  },
  border: {
    border: '3px solid #4ade80',
    borderRadius: 4,
    padding: 28,
    height: '100%',
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ktbLogo: {
    width: 140,
    height: 55,
    objectFit: 'contain',
  },
  kfsLogo: {
    width: 60,
    height: 65,
    objectFit: 'contain',
  },
  certificateOfCommitment: {
    fontSize: 16,
    color: '#2f7c49',
    textAlign: 'center',
    marginBottom: 4,
    marginTop: 6,
  },
  title: {
    fontSize: 28,
    color: '#1a1a1a',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  presentedTo: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2f7c49',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  pledgeDate: {
    fontSize: 11,
    color: '#555',
    textAlign: 'center',
    marginBottom: 16,
  },
  iPledgeTo: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 2,
  },
  pledgeItem: {
    fontSize: 10.5,
    color: '#333',
    textAlign: 'center',
    marginBottom: 3,
    lineHeight: 1.5,
    fontWeight: 'bold',
  },
  tilde: {
    fontSize: 10,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 3,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 14,
    borderTop: '1px solid #ddd',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  footerText: {
    fontSize: 8,
    color: '#777',
    marginBottom: 2,
  },
  qrCode: {
    width: 55,
    height: 55,
  },
  qrContainer: {
    alignItems: 'center',
  },
});

const pledgePoints = [
  "Respect nature by following marked paths and\nprotecting natural surroundings",
  "Leave no waste behind by disposing of trash properly and\nkeeping natural areas clean",
  "Support reforestation to fight climate change through\ntree planting",
  "Reduce my carbon footprint by choosing eco-friendly\ntravel options",
  "Respect wildlife by observing animals without\ndisturbing their habitats",
  "Respect local cultures by honouring traditions and\nsupporting communities",
  "Use resources wisely by conserving water and\nminimising waste",
  "Camp responsibly in designated areas with\neco-friendly practices",
  "Learn and share about Kenya's conservation efforts",
  "Care for our global environment through responsible tourism",
];

interface PledgeCertificateProps {
  userName: string;
  date: string;
  certificateId: string;
  ototId?: string;
  qrCodeDataUrl?: string;
  ktbLogoDataUrl?: string;
  kfsLogoDataUrl?: string;
}

export const PledgeCertificate = ({
  userName,
  date,
  certificateId,
  ototId,
  qrCodeDataUrl,
  ktbLogoDataUrl,
  kfsLogoDataUrl,
}: PledgeCertificateProps) => (
  <Document>
    <Page size="A4" style={styles.page} orientation="portrait">
      <View style={styles.border}>
        {/* Header with logos */}
        <View style={styles.headerRow}>
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

        {/* Certificate of Commitment */}
        <Text style={styles.certificateOfCommitment}>Certificate of Commitment</Text>
        <Text style={styles.title}>I am a Responsible Traveler</Text>

        <Text style={styles.presentedTo}>This certificate is presented to</Text>
        <Text style={styles.userName}>{userName}</Text>

        <Text style={styles.pledgeDate}>
          for taking the Responsible Traveler Pledge on {date}
        </Text>

        <Text style={styles.iPledgeTo}>I PLEDGE TO</Text>

        {/* Pledge items */}
        <View>
          {pledgePoints.map((point, index) => (
            <View key={index}>
              <Text style={styles.pledgeItem}>{point}</Text>
              {index < pledgePoints.length - 1 && <Text style={styles.tilde}>~ ~</Text>}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerText}>Certificate ID: {certificateId}</Text>
              {ototId && <Text style={styles.footerText}>OTOT ID: {ototId}</Text>}
            </View>
            {qrCodeDataUrl && (
              <View style={styles.qrContainer}>
                <Image style={styles.qrCode} src={qrCodeDataUrl} />
              </View>
            )}
            <View style={styles.footerRight}>
              <Text style={styles.footerText}>Date: {date}</Text>
            </View>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);
