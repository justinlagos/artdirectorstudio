import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
        <div className="space-y-8 animate-fade-in">
          <div className="space-y-4">
            <h1 className="text-5xl font-display font-bold tracking-tight">Terms & Conditions</h1>
            <p className="text-muted-foreground">Last updated: January 2025</p>
          </div>

          <Card className="glass">
            <CardContent className="p-8 prose prose-neutral dark:prose-invert max-w-none">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using ArtDirector Studio, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our service.
              </p>

              <h2>2. Use of Service</h2>
              <p>
                ArtDirector Studio provides AI-powered creative analysis and generation tools. You agree to use the service only for lawful purposes and in accordance with these Terms.
              </p>

              <h3>2.1 Account Responsibilities</h3>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
              </p>

              <h3>2.2 Prohibited Uses</h3>
              <ul>
                <li>Violating any applicable laws or regulations</li>
                <li>Infringing on intellectual property rights</li>
                <li>Uploading malicious code or harmful content</li>
                <li>Attempting to circumvent security measures</li>
              </ul>

              <h2>3. Credits and Payments</h2>
              <p>
                Credits are required to use AI features. All purchases are final and non-refundable except as required by law. Credits do not expire.
              </p>

              <h2>4. Intellectual Property</h2>
              <p>
                Content you generate using our service belongs to you. However, you grant us a limited license to use your content for service improvement and marketing purposes if you make it public.
              </p>

              <h2>5. Service Availability</h2>
              <p>
                We strive to maintain service availability but do not guarantee uninterrupted access. We reserve the right to modify or discontinue features with or without notice.
              </p>

              <h2>6. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, ArtDirector Studio shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.
              </p>

              <h2>7. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
              </p>

              <h2>8. Contact</h2>
              <p>
                For questions about these Terms, please contact us at support@artdirector.app
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
