import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { NavigationBar } from "@/components/navigation-bar";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  HelpCircle, 
  MessageSquare, 
  FileText, 
  Video, 
  Mail, 
  Send, 
  CheckCircle,
  Clock,
  AlertCircle,
  Book,
  Lightbulb,
  Settings
} from "lucide-react";

const supportTicketSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(20, "Message must be at least 20 characters"),
  category: z.enum(["bug", "feature", "account", "billing", "general"]),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

const faqData = [
  {
    category: "Getting Started",
    icon: Book,
    questions: [
      {
        question: "How do I upload my first PDF?",
        answer: "Click the 'Upload' button in the navigation bar, then drag and drop your PDF file or click to browse. Select your study preferences (subject, difficulty, AI model) and click 'Generate Flashcards' to start processing."
      },
      {
        question: "What file types are supported?",
        answer: "Currently, we support PDF files up to 50MB in size. We can process both text-based PDFs and scanned documents using OCR technology."
      },
      {
        question: "How long does processing take?",
        answer: "Processing time depends on the PDF size and complexity. Most documents are processed within 2-5 minutes. Larger documents or those requiring OCR may take longer."
      },
      {
        question: "Can I process scanned documents?",
        answer: "Yes! Our OCR technology can extract text from scanned PDFs. However, the quality of text extraction depends on the clarity of the scanned document."
      }
    ]
  },
  {
    category: "Study Features",
    icon: Lightbulb,
    questions: [
      {
        question: "How does spaced repetition work?",
        answer: "Our spaced repetition algorithm automatically schedules card reviews based on your performance. Cards you find difficult appear more frequently, while mastered cards are shown less often."
      },
      {
        question: "Can I edit my flashcards?",
        answer: "Yes! You can edit any flashcard by clicking the edit button in the study interface or from your history page. Changes are saved automatically."
      },
      {
        question: "What export formats are available?",
        answer: "You can export your flashcards to Anki (.apkg), CSV, JSON, and Quizlet-compatible formats. All formats maintain your card content and metadata."
      },
      {
        question: "How accurate is the AI generation?",
        answer: "Our AI models achieve high accuracy by analyzing document context and structure. We use advanced models like GPT-4o for premium users to ensure high-quality flashcard generation."
      }
    ]
  },
  {
    category: "Account & Billing",
    icon: Settings,
    questions: [
      {
        question: "What's included in the Pro plan?",
        answer: "Pro plan includes 100 PDF uploads per month, access to advanced AI models (GPT-4o), unlimited page processing, priority support, and early access to new features."
      },
      {
        question: "How do upload limits work?",
        answer: "Free users get 3 PDF uploads per month, while Pro users get 100. Limits reset on the first of each month. You can reprocess existing PDFs with different settings without using additional uploads."
      },
      {
        question: "Can I cancel my subscription?",
        answer: "Yes, you can cancel anytime from your subscription management page. You'll retain Pro features until the end of your billing period."
      },
      {
        question: "Do you offer refunds?",
        answer: "We offer refunds within 7 days of purchase if you're not satisfied with the service. Contact our support team for assistance."
      }
    ]
  },
  {
    category: "Troubleshooting",
    icon: AlertCircle,
    questions: [
      {
        question: "My PDF failed to process",
        answer: "Common causes include corrupted files, password-protected PDFs, or files exceeding size limits. Try uploading a different file or contact support with the error message."
      },
      {
        question: "Flashcards are not displaying correctly",
        answer: "Try refreshing the page or clearing your browser cache. If the issue persists, check your internet connection and contact support."
      },
      {
        question: "I can't log in to my account",
        answer: "Ensure you're using the correct email and password. Try the 'Forgot Password' link to reset your password. If you signed up with Google, use the Google sign-in option."
      },
      {
        question: "Export downloads are not working",
        answer: "Check your browser's download settings and ensure pop-ups are allowed for our site. Files are temporarily generated and expire after 1 hour."
      }
    ]
  }
];

export default function Support() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("faq");

  // Fetch user's support tickets
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['/api/support/tickets'],
    enabled: !!user,
  });

  // Support ticket form
  const form = useForm({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      subject: "",
      message: "",
      category: "general" as const,
      priority: "medium" as const,
    },
  });

  // Submit support ticket mutation
  const submitTicketMutation = useMutation({
    mutationFn: async (data: z.infer<typeof supportTicketSchema>) => {
      return apiRequest('POST', '/api/support/tickets', data);
    },
    onSuccess: () => {
      toast({ title: "Support ticket submitted successfully" });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
      setActiveTab("tickets");
    },
    onError: (error: any) => {
      toast({ title: "Failed to submit ticket", description: error.message, variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container-section py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Help & Support</h1>
            <p className="text-muted-foreground">Find answers to common questions or get personalized help</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="faq" className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                FAQ
              </TabsTrigger>
              <TabsTrigger value="guides" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Guides
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Contact
              </TabsTrigger>
              <TabsTrigger value="tickets" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                My Tickets
              </TabsTrigger>
            </TabsList>

            <TabsContent value="faq">
              <div className="space-y-6">
                {faqData.map((category, categoryIndex) => (
                  <Card key={categoryIndex}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <category.icon className="w-5 h-5" />
                        {category.category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {category.questions.map((faq, index) => (
                          <AccordionItem key={index} value={`item-${categoryIndex}-${index}`}>
                            <AccordionTrigger className="text-left">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="guides">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Video className="w-5 h-5 text-blue-500" />
                      <CardTitle className="text-lg">Quick Start Video</CardTitle>
                    </div>
                    <CardDescription>5-minute walkthrough of creating your first flashcards</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">Watch Guide</Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-green-500" />
                      <CardTitle className="text-lg">Study Best Practices</CardTitle>
                    </div>
                    <CardDescription>Tips for effective spaced repetition learning</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">Read Guide</Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="w-5 h-5 text-purple-500" />
                      <CardTitle className="text-lg">Advanced Features</CardTitle>
                    </div>
                    <CardDescription>Maximize your learning with pro features</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">Explore Features</Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-orange-500" />
                      <CardTitle className="text-lg">Export Guide</CardTitle>
                    </div>
                    <CardDescription>How to export and use flashcards in other apps</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">View Guide</Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      <CardTitle className="text-lg">Troubleshooting</CardTitle>
                    </div>
                    <CardDescription>Common issues and how to solve them</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">Get Help</Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Book className="w-5 h-5 text-indigo-500" />
                      <CardTitle className="text-lg">API Documentation</CardTitle>
                    </div>
                    <CardDescription>For developers wanting to integrate with our platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">View Docs</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="contact">
              <div className="max-w-2xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Submit a Support Ticket</CardTitle>
                    <CardDescription>
                      Can't find what you're looking for? Send us a message and we'll get back to you within 24 hours.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit((data) => submitTicketMutation.mutate(data))} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="bug">Bug Report</SelectItem>
                                  <SelectItem value="feature">Feature Request</SelectItem>
                                  <SelectItem value="account">Account Issue</SelectItem>
                                  <SelectItem value="billing">Billing Question</SelectItem>
                                  <SelectItem value="general">General Question</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subject</FormLabel>
                              <FormControl>
                                <Input placeholder="Brief description of your issue" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Please provide as much detail as possible about your issue or question"
                                  className="min-h-[120px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Include any error messages, steps to reproduce, or relevant details
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button type="submit" disabled={submitTicketMutation.isPending} className="w-full">
                          {submitTicketMutation.isPending ? (
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          {submitTicketMutation.isPending ? "Submitting..." : "Submit Ticket"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                {/* Quick Contact Options */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Mail className="w-8 h-8 mx-auto mb-4 text-blue-500" />
                      <h3 className="font-semibold mb-2">Email Support</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Get help via email within 24 hours
                      </p>
                      <Button variant="outline" onClick={() => window.open("mailto:support@kardu.io")}>
                        Email Us
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6 text-center">
                      <MessageSquare className="w-8 h-8 mx-auto mb-4 text-green-500" />
                      <h3 className="font-semibold mb-2">Live Chat</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Chat with us during business hours
                      </p>
                      <Button variant="outline" disabled>
                        Coming Soon
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tickets">
              <Card>
                <CardHeader>
                  <CardTitle>Your Support Tickets</CardTitle>
                  <CardDescription>Track the status of your submitted tickets</CardDescription>
                </CardHeader>
                <CardContent>
                  {ticketsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Clock className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (tickets as any)?.length > 0 ? (
                    <div className="space-y-4">
                      {(tickets as any).map((ticket: any) => (
                        <div key={ticket.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{ticket.subject}</h4>
                              <p className="text-sm text-muted-foreground">
                                Created {new Date(ticket.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Badge className={getPriorityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                              <Badge className={getStatusColor(ticket.status)}>
                                {ticket.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {ticket.message.substring(0, 200)}...
                          </p>
                          {ticket.adminResponse && (
                            <div className="bg-muted p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm font-medium">Support Response</span>
                              </div>
                              <p className="text-sm">{ticket.adminResponse}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-medium mb-2">No support tickets</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        You haven't submitted any support tickets yet.
                      </p>
                      <Button onClick={() => setActiveTab("contact")}>
                        Submit Your First Ticket
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}