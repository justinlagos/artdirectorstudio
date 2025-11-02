import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Calendar } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <Header />
      <main className="flex-1 container mx-auto px-6 sm:px-8 py-16 max-w-4xl">
        <div className="space-y-12 animate-fade-in">
          {/* Header */}
          <div className="space-y-6 text-center">
            <h1 className="text-6xl font-display font-bold tracking-tight leading-tight">
              Terms & Conditions
            </h1>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <p className="text-base">Last updated: January 2025</p>
            </div>
          </div>

          {/* Content Card */}
          <Card className="glass-strong rounded-2xl shadow-subtle ring-1 ring-border/5">
            <div className="p-8 sm:p-12 space-y-12">
              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4 first:mt-0">
                  1. Acceptance of Terms
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  By accessing and using ArtDirector Studio, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our service.
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  2. Use of Service
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  ArtDirector Studio provides AI-powered creative analysis and generation tools. You agree to use the service only for lawful purposes and in accordance with these Terms.
                </p>

                <div className="bg-muted/30 p-6 rounded-xl space-y-4">
                  <h3 className="text-xl font-medium mt-8 mb-3">
                    2.1 Account Responsibilities
                  </h3>
                  <p className="text-base leading-loose text-foreground/90">
                    You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                  </p>
                </div>

                <div className="bg-muted/30 p-6 rounded-xl space-y-4">
                  <h3 className="text-xl font-medium mt-8 mb-3">
                    2.2 Prohibited Uses
                  </h3>
                  <ul className="space-y-3 ml-6 list-disc text-base leading-loose text-foreground/90">
                    <li>Violating any applicable laws or regulations</li>
                    <li>Infringing on intellectual property rights</li>
                    <li>Uploading malicious code or harmful content</li>
                    <li>Attempting to circumvent security measures</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  3. Credits and Payments
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  Credits are required to use AI features. All purchases are final and non-refundable except as required by law. Credits do not expire.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  4. Intellectual Property
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  Content you generate using our service belongs to you. However, you grant us a limited license to use your content for service improvement and marketing purposes if you make it public.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  5. Service Availability
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  We strive to maintain service availability but do not guarantee uninterrupted access. We reserve the right to modify or discontinue features with or without notice.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  6. Limitation of Liability
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  To the maximum extent permitted by law, ArtDirector Studio shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  7. Changes to Terms
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  8. Contact
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  For questions about these Terms, please contact us at{" "}
                  <a href="mailto:support@artdirector.app" className="text-primary hover:underline">
                    support@artdirector.app
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

export default Terms;
