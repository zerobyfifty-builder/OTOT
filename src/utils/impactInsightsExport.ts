import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type {
  CarbonLog,
  EcosystemLog,
  CommunityLog,
  CommunityReport,
} from "@/hooks/useImpactInsights";

const KTB_GREEN: [number, number, number] = [47, 124, 73];
const TEXT_DARK: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [110, 110, 110];

export interface ExportPayload {
  organizationName: string;
  period: string;
  metrics: {
    treesPlanted: number;
    co2Estimated: number;
    co2Actual: number;
    livesTouched: number;
    avgBiodiversity: number;
    jobs: number;
    families: number;
    women: number;
    youth: number;
    nurseryIncomeKes: number;
    participants: number;
  };
  carbon: CarbonLog[];
  ecosystem: EcosystemLog[];
  community: CommunityLog[];
  reports: CommunityReport[];
}

const csvEscape = (v: any) => {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportImpactCsv = (data: ExportPayload) => {
  const lines: string[] = [];
  lines.push(`Impact Insights Export,${csvEscape(data.organizationName)},Period,${csvEscape(data.period)}`);
  lines.push("");
  lines.push("Summary Metrics");
  lines.push("Metric,Value");
  Object.entries(data.metrics).forEach(([k, v]) => lines.push(`${k},${csvEscape(v)}`));
  lines.push("");

  lines.push("Carbon Logs");
  lines.push("date,contribution_id,co2_estimated_kg,co2_actual_kg,method,recorded_by,notes");
  data.carbon.forEach((c) =>
    lines.push(
      [
        c.log_date,
        c.contribution_id,
        c.co2_offset_estimated_kg ?? "",
        c.co2_offset_actual_kg ?? "",
        c.calculation_method ?? "",
        c.recorded_by,
        c.notes ?? "",
      ].map(csvEscape).join(","),
    ),
  );
  lines.push("");

  lines.push("Ecosystem Logs");
  lines.push("date,contribution_id,biodiversity,soil,water,recorded_by,notes");
  data.ecosystem.forEach((e) =>
    lines.push(
      [
        e.log_date,
        e.contribution_id,
        e.biodiversity_index ?? "",
        e.soil_improvement ?? "",
        e.water_retention ?? "",
        e.recorded_by,
        e.ecosystem_notes ?? "",
      ].map(csvEscape).join(","),
    ),
  );
  lines.push("");

  lines.push("Community Logs");
  lines.push("date,contribution_id,jobs,families,women,youth,participants,nursery_income_kes,recorded_by,benefits");
  data.community.forEach((m) =>
    lines.push(
      [
        m.log_date,
        m.contribution_id,
        m.jobs_created ?? 0,
        m.families_supported ?? 0,
        m.women_employed ?? 0,
        m.youth_employed ?? 0,
        m.local_participants_count ?? 0,
        m.nursery_income_kes ?? 0,
        m.recorded_by,
        m.community_benefits ?? "",
      ].map(csvEscape).join(","),
    ),
  );

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `impact-insights-${format(new Date(), "yyyyMMdd-HHmm")}.csv`);
};

export const exportImpactPdf = (data: ExportPayload) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Header
  doc.setFillColor(...KTB_GREEN);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("KTB — Impact Insights Report", margin, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `${data.organizationName} • Period: ${data.period} • Generated ${format(new Date(), "dd MMM yyyy, hh:mm a")}`,
    margin,
    52,
  );

  y = 100;
  doc.setTextColor(...TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Headline Impact", margin, y);

  autoTable(doc, {
    startY: y + 8,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 4, textColor: TEXT_DARK },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 200, textColor: MUTED },
      1: { cellWidth: "auto" },
    },
    body: [
      ["Trees Planted:", String(data.metrics.treesPlanted)],
      ["CO2 Offset (estimated):", `${Math.round(data.metrics.co2Estimated).toLocaleString()} kg`],
      ["CO2 Offset (actual):", `${Math.round(data.metrics.co2Actual).toLocaleString()} kg`],
      ["Lives Touched:", String(data.metrics.livesTouched)],
      ["Average Biodiversity Index:", `${data.metrics.avgBiodiversity.toFixed(2)} / 10`],
      ["Jobs Created:", String(data.metrics.jobs)],
      ["Families Supported:", String(data.metrics.families)],
      ["Women Employed:", String(data.metrics.women)],
      ["Youth Employed:", String(data.metrics.youth)],
      ["Local Participants:", String(data.metrics.participants)],
      ["Nursery Income (KES):", Math.round(data.metrics.nurseryIncomeKes).toLocaleString()],
    ],
  });
  // @ts-expect-error
  y = (doc.lastAutoTable?.finalY ?? y) + 20;

  const section = (title: string, head: string[], body: any[][]) => {
    if (y > 720) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...TEXT_DARK);
    doc.text(title, margin, y);
    autoTable(doc, {
      startY: y + 8,
      head: [head],
      body,
      theme: "striped",
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: KTB_GREEN, textColor: 255, fontStyle: "bold" },
    });
    // @ts-expect-error
    y = (doc.lastAutoTable?.finalY ?? y) + 20;
  };

  if (data.carbon.length) {
    section(
      "Carbon Logs",
      ["Date", "Contribution", "Est. kg", "Actual kg", "Method", "By"],
      data.carbon.map((c) => [
        format(new Date(c.log_date), "dd MMM yy"),
        c.contribution_id,
        c.co2_offset_estimated_kg != null ? Math.round(Number(c.co2_offset_estimated_kg)) : "—",
        c.co2_offset_actual_kg != null ? Math.round(Number(c.co2_offset_actual_kg)) : "—",
        c.calculation_method ?? "—",
        c.recorded_by,
      ]),
    );
  }

  if (data.ecosystem.length) {
    section(
      "Ecosystem Logs",
      ["Date", "Contribution", "Biodiv.", "Soil", "Water", "By"],
      data.ecosystem.map((e) => [
        format(new Date(e.log_date), "dd MMM yy"),
        e.contribution_id,
        e.biodiversity_index != null ? Number(e.biodiversity_index).toFixed(1) : "—",
        e.soil_improvement ?? "—",
        e.water_retention ?? "—",
        e.recorded_by,
      ]),
    );
  }

  if (data.community.length) {
    section(
      "Community Logs",
      ["Date", "Contribution", "Jobs", "Families", "Women", "Youth", "By"],
      data.community.map((m) => [
        format(new Date(m.log_date), "dd MMM yy"),
        m.contribution_id,
        m.jobs_created ?? 0,
        m.families_supported ?? 0,
        m.women_employed ?? 0,
        m.youth_employed ?? 0,
        m.recorded_by,
      ]),
    );
  }

  if (data.reports.length) {
    section(
      "Periodic Community Reports",
      ["Period", "Jobs", "Families", "Women", "Youth", "Income (KES)"],
      data.reports.map((r) => [
        format(new Date(r.reporting_period), "MMM yyyy"),
        r.jobs_created ?? 0,
        r.families_supported ?? 0,
        r.women_employed ?? 0,
        r.youth_employed ?? 0,
        Math.round(r.nursery_income_kes ?? 0).toLocaleString(),
      ]),
    );
  }

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

  doc.save(`impact-insights-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
};
