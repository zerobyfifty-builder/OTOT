import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Mail, Phone, MessageCircle, Video, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const LodgeHelp = () => {
  const navigate = useNavigate();

  const guides = [
    { title: "How to plant your first tree", icon: FileText, description: "Step-by-step guide for tree planting" },
    { title: "Using GPS tagging", icon: FileText, description: "How to accurately capture tree locations" },
    { title: "Photo upload tips", icon: FileText, description: "Best practices for quality photos" },
    { title: "Requesting reimbursements", icon: FileText, description: "Complete reimbursement process" },
  ];

  const videos = [
    { title: "Tree planting best practices", duration: "5:23" },
    { title: "Mobile photo tips", duration: "3:45" },
    { title: "GPS accuracy tips", duration: "4:12" },
  ];

  const faqs = [
    {
      question: "What is the payment timeline?",
      answer: "Reimbursements are processed within 7-10 business days after approval. Payments are typically made on the 15th and 30th of each month."
    },
    {
      question: "How do I select the right tree species?",
      answer: "Consider the local climate, soil type, and tourist preferences. Indigenous species like Acacia are recommended for their adaptability and survival rate."
    },
    {
      question: "What are the survival rate requirements?",
      answer: "We aim for a minimum 85% survival rate. Regular watering, proper planting techniques, and timely updates help achieve this goal."
    },
    {
      question: "What are the photo requirements?",
      answer: "Photos should clearly show the tree, be well-lit, and ideally include the tourist. Maximum file size is 5MB. Multiple angles are encouraged."
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/lodge/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Help & Support</h1>
            <p className="text-gray-600">Get help with your lodge portal</p>
          </div>
        </div>

        {/* Getting Started Guides */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started Guides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {guides.map((guide, index) => (
                <button
                  key={index}
                  className="p-4 border rounded-lg hover:bg-green-50 transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <guide.icon className="w-6 h-6 text-green-600 mt-1" />
                    <div>
                      <p className="font-semibold">{guide.title}</p>
                      <p className="text-sm text-gray-600">{guide.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Video Tutorials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Video Tutorials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {videos.map((video, index) => (
                <button
                  key={index}
                  className="w-full p-4 border rounded-lg hover:bg-blue-50 transition-colors text-left flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Video className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="font-medium">{video.title}</span>
                  </div>
                  <span className="text-sm text-gray-500">{video.duration}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Mail className="w-6 h-6 text-blue-600" />
                <div className="text-center">
                  <p className="font-semibold">Email</p>
                  <p className="text-sm text-gray-600">lodge-support@otot.org</p>
                </div>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Phone className="w-6 h-6 text-green-600" />
                <div className="text-center">
                  <p className="font-semibold">Phone</p>
                  <p className="text-sm text-gray-600">+254 20 XXX XXXX</p>
                </div>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <MessageCircle className="w-6 h-6 text-green-600" />
                <div className="text-center">
                  <p className="font-semibold">WhatsApp</p>
                  <p className="text-sm text-gray-600">+254 XXX XXX XXX</p>
                </div>
              </Button>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Submit a Ticket</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="Brief description of your issue" />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Describe your issue in detail" rows={5} />
                </div>
                <Button className="w-full">Submit Ticket</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
