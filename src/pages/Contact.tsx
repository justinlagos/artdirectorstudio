import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, HelpCircle, CreditCard, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const Contact = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Message sent! We'll get back to you soon.");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-12 max-w-6xl">
        <div className="space-y-8 animate-fade-in">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h1 className="text-5xl font-display font-bold tracking-tight">Contact Us</h1>
            <p className="text-lg text-muted-foreground">
              Have a question? We're here to help. Choose a category below or send us a message.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Categories */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="font-semibold mb-4">Quick Topics</h2>
              <Card className="glass hover:shadow-medium transition-all cursor-pointer">
                <CardContent className="p-4 flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Common Questions</p>
                    <p className="text-sm text-muted-foreground">FAQs and guides</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass hover:shadow-medium transition-all cursor-pointer">
                <CardContent className="p-4 flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Technical Support</p>
                    <p className="text-sm text-muted-foreground">Platform issues</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass hover:shadow-medium transition-all cursor-pointer">
                <CardContent className="p-4 flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Billing Support</p>
                    <p className="text-sm text-muted-foreground">Credits & payments</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass hover:shadow-medium transition-all cursor-pointer">
                <CardContent className="p-4 flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">General Feedback</p>
                    <p className="text-sm text-muted-foreground">Share your thoughts</p>
                  </div>
                </CardContent>
              </Card>
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
                    <Input id="subject" placeholder="What is this about?" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us more about your inquiry..."
                      rows={6}
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
