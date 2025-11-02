import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, HelpCircle, CreditCard, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface QuickTopic {
  id: string;
  title: string;
  description: string;
  icon: typeof HelpCircle;
  subject: string;
  messageTemplate: string;
  artiePrompt: string;
}

const quickTopics: QuickTopic[] = [
  {
    id: "faq",
    title: "Common Questions",
    description: "FAQs and guides",
    icon: HelpCircle,
    subject: "General Question",
    messageTemplate: "I have a question about...\n\n",
    artiePrompt: "I need help with a general question about ArtDirector Studio. Can you guide me?",
  },
  {
    id: "technical",
    title: "Technical Support",
    description: "Platform issues",
    icon: MessageSquare,
    subject: "Technical Issue",
    messageTemplate: "I'm experiencing an issue with:\n\nSteps to reproduce:\n1. \n2. \n3. \n\nExpected behavior:\n\nActual behavior:\n",
    artiePrompt: "I'm experiencing a technical issue with ArtDirector Studio. Can you help me troubleshoot?",
  },
  {
    id: "billing",
    title: "Billing Support",
    description: "Credits & payments",
    icon: CreditCard,
    subject: "Billing Inquiry",
    messageTemplate: "I have a question about my billing:\n\n",
    artiePrompt: "I need assistance with credits, billing, or payment questions. Can you help?",
  },
  {
    id: "feedback",
    title: "General Feedback",
    description: "Share your thoughts",
    icon: Mail,
    subject: "Platform Feedback",
    messageTemplate: "I'd like to share feedback about:\n\n",
    artiePrompt: "I'd like to share some feedback about ArtDirector Studio.",
  },
];

const Contact = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const topicParam = searchParams.get("topic");
    if (topicParam) {
      const topic = quickTopics.find(t => t.id === topicParam);
      if (topic) {
        setSubject(topic.subject);
        setMessage(topic.messageTemplate);
        // Note: In a real implementation, this would trigger the Artie panel
        toast.info(`Quick topic loaded: ${topic.title}`);
      }
    }
  }, [searchParams]);

  const handleTopicClick = (topic: QuickTopic) => {
    setSubject(topic.subject);
    setMessage(topic.messageTemplate);
    setSearchParams({ topic: topic.id });
    
    // Trigger Artie (in real implementation, this would open the Artie panel)
    toast.info(`Opening Artie with: ${topic.title}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Message sent! We'll get back to you soon.");
    setIsLoading(false);
    setSubject("");
    setMessage("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-12 max-w-6xl">
        <div className="space-y-8 animate-fade-in">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h1 className="text-5xl font-display font-bold tracking-tight">Contact Us</h1>
            <p className="text-lg text-muted-foreground">
              Have a question? Choose a topic below or send us a message.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Categories */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="font-semibold mb-4">Quick Topics</h2>
              {quickTopics.map((topic) => {
                const Icon = topic.icon;
                return (
                  <Card
                    key={topic.id}
                    className="glass hover:shadow-medium transition-all cursor-pointer hover-lift"
                    onClick={() => handleTopicClick(topic)}
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <Icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{topic.title}</p>
                        <p className="text-sm text-muted-foreground">{topic.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Contact Form */}
            <Card className="lg:col-span-2 glass">
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll respond within 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="Your name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="your@email.com" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="What is this about?"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us more about your inquiry..."
                      rows={6}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
