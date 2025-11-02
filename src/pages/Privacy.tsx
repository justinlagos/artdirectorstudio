import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
        <div className="space-y-8 animate-fade-in">
          <div className="space-y-4">
            <h1 className="text-5xl font-display font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: January 2025</p>
          </div>

          <Card className="glass">
            <CardContent className="p-8 prose prose-neutral dark:prose-invert max-w-none">
              <h2>1. Information We Collect</h2>
              <p>
                We collect information you provide directly to us, information we obtain automatically when you use our services, and information from third-party sources.
              </p>

              <h3>1.1 Account Information</h3>
              <p>
                When you create an account, we collect your email address and any other information you choose to provide.
              </p>

              <h3>1.2 Content and Usage Data</h3>
              <p>
                We collect images you upload, prompts you create, and information about how you interact with our service.
              </p>

              <h3>1.3 Payment Information</h3>
              <p>
                Payment processing is handled by secure third-party providers. We do not store complete credit card information.
              </p>

              <h2>2. How We Use Your Information</h2>
              <ul>
                <li>Providing and improving our services</li>
                <li>Processing your transactions</li>
                <li>Sending service-related communications</li>
                <li>Training and improving our AI models</li>
                <li>Ensuring platform security</li>
              </ul>

              <h2>3. Information Sharing</h2>
              <p>
                We do not sell your personal information. We may share your information with:
              </p>
              <ul>
                <li>Service providers who assist in our operations</li>
                <li>Law enforcement when required by law</li>
                <li>Other users, only for content you explicitly make public</li>
              </ul>

              <h2>4. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.
              </p>

              <h2>5. Your Rights</h2>
              <p>
                Depending on your location, you may have rights including:
              </p>
              <ul>
                <li>Access to your personal data</li>
                <li>Correction of inaccurate data</li>
                <li>Deletion of your data</li>
                <li>Data portability</li>
                <li>Objection to data processing</li>
              </ul>

              <h2>6. Data Retention</h2>
              <p>
                We retain your information for as long as your account is active or as needed to provide services. You can request deletion of your account at any time.
              </p>

              <h2>7. Children's Privacy</h2>
              <p>
                Our service is not intended for children under 13. We do not knowingly collect information from children under 13.
              </p>

              <h2>8. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
              </p>

              <h2>9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through our service.
              </p>

              <h2>10. Contact Us</h2>
              <p>
                For questions about this Privacy Policy, please contact us at privacy@artdirector.app
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
