import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

const Cookies = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
        <div className="space-y-8 animate-fade-in">
          <div className="space-y-4">
            <h1 className="text-5xl font-display font-bold tracking-tight">Cookie Policy</h1>
            <p className="text-muted-foreground">Last updated: January 2025</p>
          </div>

          <Card className="glass">
            <CardContent className="p-8 prose prose-neutral dark:prose-invert max-w-none">
              <h2>1. What Are Cookies</h2>
              <p>
                Cookies are small text files stored on your device when you visit websites. They help websites remember your preferences and provide a better user experience.
              </p>

              <h2>2. How We Use Cookies</h2>
              <p>
                ArtDirector Studio uses cookies for the following purposes:
              </p>

              <h3>2.1 Essential Cookies</h3>
              <p>
                These cookies are necessary for the website to function properly. They enable basic features like authentication and security.
              </p>
              <ul>
                <li>Session management</li>
                <li>Security and authentication</li>
                <li>Load balancing</li>
              </ul>

              <h3>2.2 Performance Cookies</h3>
              <p>
                These cookies help us understand how visitors interact with our website by collecting anonymous information.
              </p>
              <ul>
                <li>Analytics and usage statistics</li>
                <li>Error tracking</li>
                <li>Performance monitoring</li>
              </ul>

              <h3>2.3 Functionality Cookies</h3>
              <p>
                These cookies remember your preferences and choices to provide a personalized experience.
              </p>
              <ul>
                <li>Theme preferences (dark/light mode)</li>
                <li>Language settings</li>
                <li>UI customizations</li>
              </ul>

              <h2>3. Third-Party Cookies</h2>
              <p>
                We may use third-party services that set their own cookies, including:
              </p>
              <ul>
                <li>Analytics providers (e.g., Google Analytics)</li>
                <li>Payment processors</li>
                <li>Content delivery networks</li>
              </ul>

              <h2>4. Managing Cookies</h2>
              <p>
                You can control cookies through your browser settings. Most browsers allow you to:
              </p>
              <ul>
                <li>View what cookies are stored</li>
                <li>Delete all or specific cookies</li>
                <li>Block cookies from specific sites</li>
                <li>Block all third-party cookies</li>
                <li>Clear all cookies when you close your browser</li>
              </ul>

              <p>
                Note that disabling cookies may affect your ability to use certain features of our service.
              </p>

              <h2>5. Cookie Duration</h2>
              <p>
                Cookies may be either "session" cookies or "persistent" cookies:
              </p>
              <ul>
                <li><strong>Session cookies:</strong> Temporary cookies that are deleted when you close your browser</li>
                <li><strong>Persistent cookies:</strong> Remain on your device for a set period or until you delete them</li>
              </ul>

              <h2>6. Updates to This Policy</h2>
              <p>
                We may update this Cookie Policy to reflect changes in our practices or for legal reasons. We will notify you of significant changes.
              </p>

              <h2>7. Contact Us</h2>
              <p>
                For questions about our use of cookies, please contact us at privacy@artdirector.app
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cookies;
