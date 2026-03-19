import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

let ktbDualLogoBase64: string | null = null;

async function loadKtbDualLogo(): Promise<string | null> {
  if (ktbDualLogoBase64) return ktbDualLogoBase64;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const { default: logoUrl } = await import("@/assets/ktb-dual-logo.png");
    return new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        ktbDualLogoBase64 = canvas.toDataURL("image/png");
        resolve(ktbDualLogoBase64);
      };
      img.onerror = () => resolve(null);
      img.src = logoUrl;
    });
  } catch {
    return null;
  }
}

export interface ReceiptData {
  receiptNo: string;
  paymentDate: string;
  numTrees: number;
  amountPaid: number;
  tripId: string;
  route: string;
  userName: string;
  userEmail: string;
  treeIds: string[];
  paymentMethod?: string;
  isReturn?: boolean;
  totalCo2?: number;
}

export async function generateReceipt(data: ReceiptData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Load logo
  const logo = await loadKtbDualLogo();
  if (logo) {
    const logoWidth = 70;
    const logoHeight = 25;
    doc.addImage(logo, "PNG", (pageWidth - logoWidth) / 2, 10, logoWidth, logoHeight);
  }

  let yPos = logo ? 42 : 20;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("TREE PLANTING RECEIPT", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  // Receipt number and date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Receipt No: ${data.receiptNo}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 5;
  doc.text(`Date: ${format(new Date(data.paymentDate), "dd MMMM yyyy, HH:mm")}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  // Divider
  doc.setDrawColor(34, 139, 34);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  // Customer details
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Received From:", 20, yPos);
  yPos += 6;
  doc.setFont("helvetica", "normal");
  doc.text(data.userName, 20, yPos);
  yPos += 5;
  doc.setTextColor(100, 100, 100);
  doc.text(data.userEmail, 20, yPos);
  yPos += 10;

  const labelX = 20;
  const valueX = 72;
  const maxValueWidth = pageWidth - valueX - 20;

  // Trip reference
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Trip Reference:", labelX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(data.tripId, valueX, yPos);
  yPos += 6;

  // Route
  doc.setFont("helvetica", "bold");
  doc.text("Route:", labelX, yPos);
  doc.setFont("helvetica", "normal");
  const tripType = data.isReturn ? "Return" : "One-way";
  const routeLine = `${data.route} (${tripType})`;
  const splitRoute = doc.splitTextToSize(routeLine, maxValueWidth);
  doc.text(splitRoute, valueX, yPos);
  yPos += splitRoute.length * 5 + 1;

  // Total CO2
  if (data.totalCo2 != null) {
    doc.setFont("helvetica", "bold");
    doc.text("Total CO2:", labelX, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.totalCo2.toFixed(1)} kg`, valueX, yPos);
    yPos += 6;
  }

  // Payment method
  doc.setFont("helvetica", "bold");
  doc.text("Payment Method:", labelX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(data.paymentMethod || "Card", valueX, yPos);
  yPos += 12;

  // Payment details table
  autoTable(doc, {
    startY: yPos,
    head: [["Description", "Quantity", "Unit Price (USD)", "Total (USD)"]],
    body: [
      [
        "Carbon Offset Tree Planting",
        `${data.numTrees} Trees`,
        `$${(data.amountPaid / data.numTrees).toFixed(2)}`,
        `$${data.amountPaid.toFixed(2)}`,
      ],
    ],
    foot: [["", "", "Total Paid", `$${data.amountPaid.toFixed(2)}`]],
    theme: "grid",
    headStyles: {
      fillColor: [34, 139, 34],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    footStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 10,
    },
    styles: { fontSize: 10, cellPadding: 5 },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 12;

  // Planting location
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Planting Location:", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.text("Mau Forest Complex, Nakuru County, Kenya", 70, yPos);
  yPos += 12;

  // Divider
  doc.setDrawColor(34, 139, 34);
  doc.setLineWidth(0.3);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 8;

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "This receipt confirms your contribution to the One Tourist One Tree (OTOT) carbon offset programme",
    pageWidth / 2,
    yPos,
    { align: "center" }
  );
  yPos += 4;
  doc.text(
    "managed by the Kenya Tourism Board. Trees are planted and monitored by certified stakeholders.",
    pageWidth / 2,
    yPos,
    { align: "center" }
  );
  yPos += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 139, 34);
  doc.text("www.magicalkenya.com | One Tourist, One Tree", pageWidth / 2, yPos, { align: "center" });

  // Save
  doc.save(`Receipt-${data.receiptNo}.pdf`);
}
