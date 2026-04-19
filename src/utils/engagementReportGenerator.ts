import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface EngagementReportData {
  contribution_id: string;
  customer_id?: string;
  contributor_name: string;
  contributor_type: string;
  contributor_email?: string | null;
  trip_id?: string | null;
  total_trees: number;
  total_amount: number;
  currency?: string | null;
  payment_date?: string | null;
  planting_status_label: string;
  anniversary_date?: string | null;
  photos_count: number;
  geotag?: { latitude: number; longitude: number } | null;
  status_timeline: Array<{
    status: string;
    label: string;
    date: string;
    actor?: string | null;
  }>;
  activity_log: Array<{
    type: string;
    description: string;
    timestamp: string;
    actor: string;
  }>;
  generated_by: string;
}

const KTB_GREEN: [number, number, number] = [47, 124, 73];
const TEXT_DARK: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [110, 110, 110];

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd MMM yyyy");
  } catch {
    return iso;
  }
};

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd MMM yyyy, hh:mm a");
  } catch {
    return iso;
  }
};

export const generateEngagementReport = async (
  data: EngagementReportData,
): Promise<Blob> => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Header bar
  doc.setFillColor(...KTB_GREEN);
  doc.rect(0, 0, pageWidth, 70, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("KTB — Tree Order Engagement Report", margin, 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")} by ${data.generated_by}`,
    margin,
    52,
  );

  y = 100;

  // Order Info
  doc.setTextColor(...TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Order Information", margin, y);
  y += 8;

  autoTable(doc, {
    startY: y + 4,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 4, textColor: TEXT_DARK },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 150, textColor: MUTED },
      1: { cellWidth: "auto" },
    },
    body: [
      ["Contribution ID:", data.contribution_id],
      ["Customer ID:", data.customer_id || "—"],
      ["Contributor:", `${data.contributor_name} (${data.contributor_type})`],
      ["Contributor Email:", data.contributor_email || "—"],
      ["Trip ID:", data.trip_id || "—"],
      ["Trees Ordered:", String(data.total_trees)],
      [
        "Amount Paid:",
        `${data.currency || "USD"} ${Number(data.total_amount).toLocaleString()}`,
      ],
      ["Payment Date:", fmtDate(data.payment_date)],
      ["Current Status:", data.planting_status_label],
      ["Anniversary Date:", fmtDate(data.anniversary_date)],
      ["Photos Captured:", String(data.photos_count)],
      [
        "Group Geotag:",
        data.geotag
          ? `${data.geotag.latitude.toFixed(6)}, ${data.geotag.longitude.toFixed(6)}`
          : "Not captured",
      ],
    ],
  });

  // @ts-expect-error jspdf-autotable adds lastAutoTable
  y = (doc.lastAutoTable?.finalY ?? y) + 24;

  // Status Timeline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Planting Status Timeline", margin, y);
  y += 8;

  if (data.status_timeline.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text("No status transitions recorded.", margin, y + 16);
    y += 30;
  } else {
    autoTable(doc, {
      startY: y + 4,
      head: [["Status", "Date", "Recorded By"]],
      body: data.status_timeline.map((s) => [
        s.label,
        fmtDateTime(s.date),
        s.actor || "—",
      ]),
      theme: "striped",
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: KTB_GREEN, textColor: 255, fontStyle: "bold" },
    });
    // @ts-expect-error
    y = (doc.lastAutoTable?.finalY ?? y) + 24;
  }

  // Activity Log
  if (y > 700) {
    doc.addPage();
    y = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Engagement Activity Log", margin, y);
  y += 8;

  if (data.activity_log.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text("No engagement actions recorded yet.", margin, y + 16);
  } else {
    autoTable(doc, {
      startY: y + 4,
      head: [["Type", "Description", "Date", "Actor"]],
      body: data.activity_log.map((l) => [
        l.type.replace(/_/g, " "),
        l.description,
        fmtDateTime(l.timestamp),
        l.actor,
      ]),
      theme: "striped",
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: KTB_GREEN, textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 110 },
        2: { cellWidth: 110 },
        3: { cellWidth: 110 },
      },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `KTB — One Tourist One Tree • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }

  return doc.output("blob");
};
