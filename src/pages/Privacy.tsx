import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Calendar } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <Header />
      <main className="flex-1 container mx-auto px-6 sm:px-8 py-16 max-w-4xl">
        <div className="space-y-12 animate-fade-in">
          {/* Header */}
          <div className="space-y-6 text-center">
            <h1 className="text-6xl font-display font-bold tracking-tight leading-tight">
              Privacy Policy
            </h1>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <p className="text-base">Last updated: January 2025</p>
            </div>
          </div>

          {/* Content Card */}
          <Card className="glass-strong rounded-2xl shadow-subtle ring-1 ring-border/5">
            <div className="p-8 sm:p-12 space-y-12">
              <section className="space-y-6">
                <h2 className="text-3xl font-semibold mt-12 mb-4 first:mt-0">
                  1. Information We Collect
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  We collect information you provide directly to us, information we obtain automatically when you use our services, and information from third-party sources.
                </p>

                <div className="bg-muted/30 p-6 rounded-xl space-y-4">
                  <h3 className="text-xl font-medium mt-8 mb-3">
                    1.1 Account Information
                  </h3>
                  <p className="text-base leading-loose text-foreground/90">
                    When you create an account, we collect your email address and any other information you choose to provide.
                  </p>
                </div>

                <div className="bg-muted/30 p-6 rounded-xl space-y-4">
                  <h3 className="text-xl font-medium mt-8 mb-3">
                    1.2 Content and Usage Data
                  </h3>
                  <p className="text-base leading-loose text-foreground/90">
                    We collect images you upload, prompts you create, and information about how you interact with our service.
                  </p>
                </div>

                <div className="bg-muted/30 p-6 rounded-xl space-y-4">
                  <h3 className="text-xl font-medium mt-8 mb-3">
                    1.3 Payment Information
                  </h3>
                  <p className="text-base leading-loose text-foreground/90">
                    Payment processing is handled by secure third-party providers. We do not store complete credit card information.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  2. How We Use Your Information
                </h2>
                <ul className="space-y-3 ml-6 list-disc text-base leading-loose text-foreground/90">
                  <li>Providing and improving our services</li>
                  <li>Processing your transactions</li>
                  <li>Sending service-related communications</li>
                  <li>Training and improving our AI models</li>
                  <li>Ensuring platform security</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  3. Information Sharing
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  We do not sell your personal information. We may share your information with:
                </p>
                <ul className="space-y-3 ml-6 list-disc text-base leading-loose text-foreground/90">
                  <li>Service providers who assist in our operations</li>
                  <li>Law enforcement when required by law</li>
                  <li>Other users, only for content you explicitly make public</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  4. Data Security
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  5. Your Rights
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  Depending on your location, you may have rights including:
                </p>
                <ul className="space-y-3 ml-6 list-disc text-base leading-loose text-foreground/90">
                  <li>Access to your personal data</li>
                  <li>Correction of inaccurate data</li>
                  <li>Deletion of your data</li>
                  <li>Data portability</li>
                  <li>Objection to data processing</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  6. Data Retention
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  We retain your information for as long as your account is active or as needed to provide services. You can request deletion of your account at any time.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  7. Children's Privacy
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  Our service is not intended for children under 13. We do not knowingly collect information from children under 13.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  8. International Data Transfers
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  9. Changes to This Policy
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through our service.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  10. Contact Us
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  For questions about this Privacy Policy, please contact us at{" "}
                  <a href="mailto:privacy@artdirector.app" className="text-primary hover:underline">
                    privacy@artdirector.app
                  </a>
                </p>
              </section>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
