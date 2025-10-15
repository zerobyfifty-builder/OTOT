import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CalendarIcon, Download, Eye, FileText, Loader2 } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ReportType = "trees" | "trips" | "co2" | "revenue" | "summary";
type DurationType = "daily" | "weekly" | "monthly";

interface GeneratedReport {
  id: string;
  type: string;
  duration: string;
  dateRange: string;
  generatedAt: string;
  fileName: string;
}

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>("summary");
  const [durationType, setDurationType] = useState<DurationType>("monthly");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);

  // Fetch data for reports
  const { data: reportData, refetch } = useQuery({
    queryKey: ["reportData", startDate, endDate],
    queryFn: async () => {
      let query = supabase.from("trees").select("*");
      
      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }
      if (endDate) {
        query = query.lte("created_at", endDate.toISOString());
      }

      const { data: treesData } = await query;

      const { data: tripsData } = await supabase
        .from("trips")
        .select("*")
        .gte("created_at", startDate?.toISOString() || "2020-01-01")
        .lte("created_at", endDate?.toISOString() || new Date().toISOString());

      const { data: rolesData } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "tourist")
        .single();

      const { count: touristsCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role_id", rolesData?.id);

      return {
        trees: treesData || [],
        trips: tripsData || [],
        tourists: touristsCount || 0,
      };
    },
    enabled: false,
  });

  const generatePDF = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    setIsGenerating(true);
    await refetch();

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Header
      doc.setFillColor(34, 197, 94);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("OTOT Report", pageWidth / 2, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(`${format(startDate, "PP")} - ${format(endDate, "PP")}`, pageWidth / 2, 30, { align: "center" });

      doc.setTextColor(0, 0, 0);
      let yPosition = 50;

      // Report Type Title
      doc.setFontSize(18);
      const reportTitles = {
        trees: "Trees Report",
        trips: "Trips Report",
        co2: "CO₂ Emissions Report",
        revenue: "Revenue Report",
        summary: "Summary Report"
      };
      doc.text(reportTitles[reportType], 14, yPosition);
      yPosition += 10;

      if (reportType === "summary" || reportType === "trees") {
        // Trees Summary
        const totalTrees = reportData?.trees.length || 0;
        const plantedTrees = reportData?.trees.filter(t => t.status === "Planted").length || 0;
        const totalRevenue = reportData?.trees.reduce((sum, t) => sum + (Number(t.amount_paid) || 0), 0) || 0;

        doc.setFontSize(14);
        doc.text("Trees Overview", 14, yPosition);
        yPosition += 8;

        autoTable(doc, {
          startY: yPosition,
          head: [["Metric", "Value"]],
          body: [
            ["Total Trees", totalTrees.toString()],
            ["Planted Trees", plantedTrees.toString()],
            ["Revenue", `$${formatNumber(totalRevenue)}`],
          ],
          theme: "grid",
          headStyles: { fillColor: [34, 197, 94] },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      if (reportType === "summary" || reportType === "trips") {
        // Trips Summary
        const totalTrips = reportData?.trips.length || 0;
        const totalTourists = reportData?.tourists || 0;

        doc.setFontSize(14);
        doc.text("Trips Overview", 14, yPosition);
        yPosition += 8;

        autoTable(doc, {
          startY: yPosition,
          head: [["Metric", "Value"]],
          body: [
            ["Total Trips", totalTrips.toString()],
            ["Total Tourists", totalTourists.toString()],
          ],
          theme: "grid",
          headStyles: { fillColor: [34, 197, 94] },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      if (reportType === "summary" || reportType === "co2") {
        // CO2 Summary
        const totalCO2 = reportData?.trips.reduce((sum, t) => sum + (Number(t.total_co2) || 0), 0) || 0;
        const flightCO2 = reportData?.trips.reduce((sum, t) => sum + (Number(t.flight_co2) || 0), 0) || 0;
        const accommodationCO2 = reportData?.trips.reduce((sum, t) => sum + (Number(t.accommodation_co2) || 0), 0) || 0;
        const totalTrees = reportData?.trees.length || 0;
        const co2Offset = totalTrees * 25;

        doc.setFontSize(14);
        doc.text("CO₂ Emissions Overview", 14, yPosition);
        yPosition += 8;

        autoTable(doc, {
          startY: yPosition,
          head: [["Metric", "Value (kg)"]],
          body: [
            ["Total CO₂ Emissions", formatNumber(totalCO2)],
            ["Flight Emissions", formatNumber(flightCO2)],
            ["Accommodation Emissions", formatNumber(accommodationCO2)],
            ["CO₂ Offset (by trees)", formatNumber(co2Offset)],
          ],
          theme: "grid",
          headStyles: { fillColor: [34, 197, 94] },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      if (reportType === "revenue") {
        // Detailed Revenue Report
        const treeRevenue = reportData?.trees || [];
        
        doc.setFontSize(14);
        doc.text("Revenue Details", 14, yPosition);
        yPosition += 8;

        autoTable(doc, {
          startY: yPosition,
          head: [["Tree ID", "Status", "Amount", "Date"]],
          body: treeRevenue.map(tree => [
            tree.otot_id || tree.id.slice(0, 8),
            tree.status,
            `$${tree.amount_paid}`,
            format(new Date(tree.created_at), "PP"),
          ]),
          theme: "grid",
          headStyles: { fillColor: [34, 197, 94] },
        });
      }

      // Footer
      const totalPages = (doc as any).internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(128);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        );
        doc.text(
          `Generated on ${format(new Date(), "PPpp")}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }

      const fileName = `OTOT_${reportTitles[reportType].replace(" ", "_")}_${format(startDate, "yyyy-MM-dd")}_to_${format(endDate, "yyyy-MM-dd")}.pdf`;
      
      // Save PDF
      doc.save(fileName);

      // Add to generated reports list
      const newReport: GeneratedReport = {
        id: crypto.randomUUID(),
        type: reportTitles[reportType],
        duration: durationType,
        dateRange: `${format(startDate, "PP")} - ${format(endDate, "PP")}`,
        generatedAt: format(new Date(), "PPpp"),
        fileName,
      };

      setGeneratedReports(prev => [newReport, ...prev]);
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate and download comprehensive reports
        </p>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Report</CardTitle>
          <CardDescription>
            Select report type, duration, and date range to generate a PDF report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Report Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary Report</SelectItem>
                  <SelectItem value="trees">Trees Report</SelectItem>
                  <SelectItem value="trips">Trips Report</SelectItem>
                  <SelectItem value="co2">CO₂ Emissions Report</SelectItem>
                  <SelectItem value="revenue">Revenue Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration Type</label>
              <Select value={durationType} onValueChange={(value) => setDurationType(value as DurationType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button 
            onClick={generatePDF} 
            disabled={!startDate || !endDate || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate PDF Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>
            View and download previously generated reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {generatedReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No reports generated yet</p>
              <p className="text-sm">Generate your first report to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {generatedReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">{report.type}</h4>
                      <p className="text-sm text-muted-foreground">{report.dateRange}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Generated: {report.generatedAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button variant="default" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
