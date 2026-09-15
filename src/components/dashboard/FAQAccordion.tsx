import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqData = [
  {
    question: "How does tree planting offset my carbon footprint?",
    answer:
      "Trees absorb CO2 as they grow. On average, a tree can absorb 22 kg of CO2 per year. Funding trees through OTOT creates a carbon sink that helps offset emissions from your travel.",
  },
  {
    question: "Where are the trees planted in Kenya?",
    answer:
      "Trees are planted with ministry-approved plantation partners in selected sites across Kenya. Partners focus on degraded land and keep the ministry informed as planting work moves from assignment to completion.",
  },
  {
    question: "How can I track the trees I funded?",
    answer:
      "Each paid donation appears on your dashboard with the tree mix, carbon target, and status. Open a donation to see payment details and the plantation request as the ministry assigns a partner.",
  },
  {
    question: "What is the Responsible Traveler Pledge?",
    answer:
      "The pledge is a commitment to 10 principles of responsible tourism: respect nature and wildlife, leave no waste, support reforestation, reduce your footprint, honor local cultures, use resources wisely, and share Kenya's conservation story.",
  },
  {
    question: "How much does it cost to plant a tree?",
    answer:
      "The amount is the plantation cost for the species you choose. Use the carbon calculator to estimate travel emissions, then donate to fund a matching tree mix.",
  },
];

export function FAQAccordion() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqData.map((faq, index) => (
        <AccordionItem key={faq.question} value={`item-${index}`}>
          <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
