import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ktbLogo from "@/assets/ktb-logo.png";

export const AgentHelp = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Help & Support</h1>
            <p className="text-muted-foreground">Frequently asked questions about the Travel Agent Carbon Offset Portal</p>
          </div>
          <img src={ktbLogo} alt="KTB" className="h-20 object-contain" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>FAQs</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="1">
                <AccordionTrigger>How do I offset carbon for a booked ticket?</AccordionTrigger>
                <AccordionContent>
                  Go to "Calculate & Offset" from the sidebar. Enter the ticket details (Staff Name, PNR, Ticket Number, Date of Issue, LPO Number), then enter flight details. The system calculates the carbon emissions and shows how many trees are needed to offset. You can pay immediately or save for later.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="2">
                <AccordionTrigger>How do I track KTB reimbursements?</AccordionTrigger>
                <AccordionContent>
                  Go to "Reimbursements" from the sidebar to see all your offset payments grouped by KTB payment status. Use the invoice and receipt downloads from "My Tickets" to attach to your KTB reimbursement claims.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="3">
                <AccordionTrigger>How do I download invoices and receipts?</AccordionTrigger>
                <AccordionContent>
                  Go to "My Tickets", find the relevant ticket, and click the three-dot menu (⋮) on the right. You can download the invoice and payment receipt as PDF documents.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="4">
                <AccordionTrigger>What does tree status mean?</AccordionTrigger>
                <AccordionContent>
                  "Not Planted" means the offset payment has not been made yet. "Planted" means the payment has been made and trees have been allocated for planting to offset the carbon emissions.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="5">
                <AccordionTrigger>Who do I contact for support?</AccordionTrigger>
                <AccordionContent>
                  For technical support, please contact the OTOT team at support@the1campaign.com. For KTB-related queries, reach out to your KTB liaison officer.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
