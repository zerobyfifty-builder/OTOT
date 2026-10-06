import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CO2_KG_PER_TREE_YEAR } from "@/lib/impact";
import { PLANTED_HERE } from "@/lib/treeStages";

const faqData = [
  {
    question: "How does tree planting offset my carbon footprint?",
    answer:
      `Trees absorb CO₂ as they grow. On average, a growing tree absorbs about ${CO2_KG_PER_TREE_YEAR} kg of CO₂ per year. Funding trees through OTOT creates a carbon sink that helps offset emissions from your travel.`,
  },
  {
    question: "Where are the trees planted in Kenya?",
    answer:
      `Every OTOT tree is planted in the ${PLANTED_HERE}, a degraded water tower the Ministry is restoring with approved planting partners. Partners keep the Ministry informed as work moves from assignment to completion.`,
  },
  {
    question: "How can I track the trees I funded?",
    answer:
      "Each donation appears on your dashboard and in My Trees with the tree mix, CO₂ offset and status. Open a donation to follow it from payment to planting: a partner is assigned, planting gets underway, the Ministry verifies the work, and your trees count as planted.",
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
