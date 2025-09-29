import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqData = [
  {
    question: "How does tree planting offset my carbon footprint?",
    answer: "Trees absorb CO2 from the atmosphere as they grow. On average, a tree can absorb 22kg of CO2 per year. By planting trees, you're creating a natural carbon sink that removes greenhouse gases from the atmosphere, effectively offsetting the emissions from your travel and daily activities."
  },
  {
    question: "Where are the trees planted in Kenya?",
    answer: "Our trees are planted in carefully selected sites across Kenya in partnership with local communities and conservation organizations. We focus on areas that have been deforested or degraded, working with local lodges and environmental groups to ensure the trees are properly maintained and contribute to local ecosystems."
  },
  {
    question: "How can I track my planted trees?",
    answer: "Each tree you sponsor receives a unique OTOT ID that allows you to track its progress. You'll receive regular updates including planting confirmation, growth photos, and GPS coordinates. You can view all your trees in the 'My Trees' section of your dashboard."
  },
  {
    question: "What is the Responsible Traveler Pledge?",
    answer: "The Responsible Traveler Pledge is our commitment to sustainable tourism practices. It includes 10 principles focused on respecting nature, supporting local communities, and minimizing environmental impact. Taking the pledge demonstrates your commitment to responsible travel and environmental stewardship."
  },
  {
    question: "How much does it cost to plant a tree?",
    answer: "The cost varies depending on the species and location, but typically ranges from $3-10 per tree. This includes the seedling, planting, initial care, and monitoring. We work with local partners to ensure fair pricing and maximum impact for your investment in reforestation."
  }
];

export const FAQAccordion: React.FC = () => {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqData.map((faq, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};