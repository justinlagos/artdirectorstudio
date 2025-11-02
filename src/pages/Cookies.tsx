import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Calendar } from "lucide-react";

const Cookies = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <Header />
      <main className="flex-1 container mx-auto px-6 sm:px-8 py-16 max-w-4xl">
        <div className="space-y-12 animate-fade-in">
          {/* Header */}
          <div className="space-y-6 text-center">
            <h1 className="text-6xl font-display font-bold tracking-tight leading-tight">
              Cookie Policy
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
                  1. What Are Cookies
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  Cookies are small text files stored on your device when you visit websites. They help websites remember your preferences and provide a better user experience.
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  2. How We Use Cookies
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  ArtDirector Studio uses cookies for the following purposes:
                </p>

                <div className="bg-muted/30 p-6 rounded-xl space-y-4">
                  <h3 className="text-xl font-medium mt-8 mb-3">
                    2.1 Essential Cookies
                  </h3>
                  <p className="text-base leading-loose text-foreground/90">
                    These cookies are necessary for the website to function properly. They enable basic features like authentication and security.
                  </p>
                  <ul className="space-y-3 ml-6 list-disc text-base leading-loose text-foreground/90">
                    <li>Session management</li>
                    <li>Security and authentication</li>
                    <li>Load balancing</li>
                  </ul>
                </div>

                <div className="bg-muted/30 p-6 rounded-xl space-y-4">
                  <h3 className="text-xl font-medium mt-8 mb-3">
                    2.2 Performance Cookies
                  </h3>
                  <p className="text-base leading-loose text-foreground/90">
                    These cookies help us understand how visitors interact with our website by collecting anonymous information.
                  </p>
                  <ul className="space-y-3 ml-6 list-disc text-base leading-loose text-foreground/90">
                    <li>Analytics and usage statistics</li>
                    <li>Error tracking</li>
                    <li>Performance monitoring</li>
                  </ul>
                </div>

                <div className="bg-muted/30 p-6 rounded-xl space-y-4">
                  <h3 className="text-xl font-medium mt-8 mb-3">
                    2.3 Functionality Cookies
                  </h3>
                  <p className="text-base leading-loose text-foreground/90">
                    These cookies remember your preferences and choices to provide a personalized experience.
                  </p>
                  <ul className="space-y-3 ml-6 list-disc text-base leading-loose text-foreground/90">
                    <li>Theme preferences (dark/light mode)</li>
                    <li>Language settings</li>
                    <li>UI customizations</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  3. Third-Party Cookies
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  We may use third-party services that set their own cookies, including:
                </p>
                <ul className="space-y-3 ml-6 list-disc text-base leading-loose text-foreground/90">
                  <li>Analytics providers (e.g., Google Analytics)</li>
                  <li>Payment processors</li>
                  <li>Content delivery networks</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  4. Managing Cookies
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  You can control cookies through your browser settings. Most browsers allow you to:
                </p>
                <ul className="space-y-3 ml-6 list-disc text-base leading-loose text-foreground/90">
                  <li>View what cookies are stored</li>
                  <li>Delete all or specific cookies</li>
                  <li>Block cookies from specific sites</li>
                  <li>Block all third-party cookies</li>
                  <li>Clear all cookies when you close your browser</li>
                </ul>
                <p className="text-base leading-loose text-foreground/90 mt-4">
                  Note that disabling cookies may affect your ability to use certain features of our service.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  5. Cookie Duration
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  Cookies may be either "session" cookies or "persistent" cookies:
                </p>
                <ul className="space-y-3 ml-6 list-disc text-base leading-loose text-foreground/90">
                  <li>
                    <strong className="font-semibold">Session cookies:</strong> Temporary cookies that are deleted when you close your browser
                  </li>
                  <li>
                    <strong className="font-semibold">Persistent cookies:</strong> Remain on your device for a set period or until you delete them
                  </li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  6. Updates to This Policy
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  We may update this Cookie Policy to reflect changes in our practices or for legal reasons. We will notify you of significant changes.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-3xl font-semibold mt-12 mb-4">
                  7. Contact Us
                </h2>
                <p className="text-base leading-loose text-foreground/90">
                  For questions about our use of cookies, please contact us at{" "}
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

export default Cookies;
