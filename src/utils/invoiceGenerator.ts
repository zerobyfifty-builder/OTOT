import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

// We'll load the KTB logo as base64 at runtime
let ktbLogoBase64: string | null = null;

async function loadKtbLogo(): Promise<string | null> {
  if (ktbLogoBase64) return ktbLogoBase64;
  try {
    const response = await fetch('/otot-logo.png');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        ktbLogoBase64 = reader.result as string;
        resolve(ktbLogoBase64);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

interface InvoiceParams {
  ticket: any;
  agentName?: string;
  agentBusinessName?: string;
  agentEmail?: string;
  agentPhone?: string;
  organization?: any;
}

export async function generateInvoice({
  ticket,
  agentName,
  agentBusinessName,
  agentEmail,
  agentPhone,
  organization,
}: InvoiceParams) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Load and add KTB logo (top-right)
  const logo = await loadKtbLogo();
  if (logo) {
    doc.addImage(logo, "PNG", pageWidth - 55, 10, 40, 20);
  }

  // Title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice", 20, 30);

  // Invoice metadata
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice number", 20, 50);
  doc.text("Date of issue", 20, 57);
  doc.text("Date due", 20, 64);

  doc.setFont("helvetica", "normal");
  const invoiceNumber = `INV-${ticket.ticket_number}`;
  doc.text(invoiceNumber, 65, 50);
  doc.text(format(new Date(ticket.created_at), "MMMM dd, yyyy"), 65, 57);
  doc.text(format(new Date(ticket.created_at), "MMMM dd, yyyy"), 65, 64);

  // From address (Travel Agent)
  const fromY = 82;
  doc.setFont("helvetica", "bold");
  doc.text(agentBusinessName || "Travel Agent", 20, fromY);
  doc.setFont("helvetica", "normal");
  if (agentName) doc.text(agentName, 20, fromY + 7);
  if (agentEmail) doc.text(agentEmail, 20, fromY + 14);
  if (agentPhone) doc.text(agentPhone, 20, fromY + 21);

  // Bill To (Institutional Partner / KTB)
  const billToX = pageWidth / 2 + 10;
  doc.setFont("helvetica", "bold");
  doc.text("Bill to", billToX, fromY);
  doc.setFont("helvetica", "normal");

  if (organization) {
    const address = organization.address as any;
    const billToLines = [
      organization.name,
      organization.contact_person || '',
      address?.street || address?.line1 || '',
      address?.city || '',
      address?.country || '',
      organization.contact_email || '',
    ].filter(Boolean);
    billToLines.forEach((line: string, i: number) => {
      doc.text(line, billToX, fromY + 7 + i * 7);
    });
  } else {
    doc.text("Kenya Tourism Board", billToX, fromY + 7);
    doc.text("Nairobi, Kenya", billToX, fromY + 14);
  }

  // Amount due line
  const amountDueY = 130;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(
    `KES ${Number(ticket.offset_amount_paid).toLocaleString()} due ${format(new Date(ticket.created_at), "MMMM dd, yyyy")}`,
    20,
    amountDueY
  );

  // Description subtitle
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Carbon Offset - ${ticket.origin_airport} → ${ticket.destination_airport}`, 20, amountDueY + 12);

  // Table
  autoTable(doc, {
    startY: amountDueY + 22,
    head: [["Description", "Qty", "Unit price", "Amount"]],
    body: [
      [
        `Carbon offset for ${ticket.staff_name}\n${ticket.origin_airport} → ${ticket.destination_airport} (${ticket.travel_class})\nPNR: ${ticket.pnr_number} | LPO: ${ticket.lpo_number}\nCO₂: ${Math.round(Number(ticket.total_co2)).toLocaleString()} kg`,
        String(ticket.trees_needed),
        `KES ${ticket.trees_needed > 0 ? Math.round(Number(ticket.offset_amount_paid) / ticket.trees_needed).toLocaleString() : '0'}`,
        `KES ${Number(ticket.offset_amount_paid).toLocaleString()}`,
      ],
    ],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fontStyle: "bold", fillColor: [255, 255, 255], textColor: [80, 80, 80], lineWidth: { bottom: 0.5 }, lineColor: [200, 200, 200] },
    bodyStyles: { textColor: [40, 40, 40] },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { halign: "right", cellWidth: 20 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 35 },
    },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable?.finalY || amountDueY + 60;
  const totalsX = pageWidth - 20;
  const subtotalY = finalY + 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", totalsX - 50, subtotalY);
  doc.text(`KES ${Number(ticket.offset_amount_paid).toLocaleString()}`, totalsX, subtotalY, { align: "right" });

  doc.text("Total", totalsX - 50, subtotalY + 8);
  doc.text(`KES ${Number(ticket.offset_amount_paid).toLocaleString()}`, totalsX, subtotalY + 8, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.text("Amount due", totalsX - 50, subtotalY + 18);
  doc.text(`KES ${Number(ticket.offset_amount_paid).toLocaleString()}`, totalsX, subtotalY + 18, { align: "right" });

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200, 200, 200);
  doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Page 1 of 1", pageWidth - 20, pageHeight - 15, { align: "right" });

  doc.save(`invoice-${ticket.ticket_number}.pdf`);
  toast({ title: "Invoice Downloaded", description: `Invoice for ticket ${ticket.ticket_number} generated.` });
}
