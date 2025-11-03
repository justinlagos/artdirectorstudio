-- Create beta_waitlist table
CREATE TABLE IF NOT EXISTS public.beta_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  consent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'active', 'rejected')),
  invite_sent_at TIMESTAMP WITH TIME ZONE,
  activated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'landing_page',
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create beta_invites table
CREATE TABLE IF NOT EXISTS public.beta_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  waitlist_id UUID REFERENCES public.beta_waitlist(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create testimonials table
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  avatar_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  source TEXT DEFAULT 'landing_page',
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create funnel_metrics table for tracking
CREATE TABLE IF NOT EXISTS public.funnel_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('signup', 'activation', 'first_image', 'first_analysis', 'first_share')),
  email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beta_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for beta_waitlist (public insert, admin view all)
CREATE POLICY "Anyone can sign up for waitlist"
  ON public.beta_waitlist FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all waitlist entries"
  ON public.beta_waitlist FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update waitlist entries"
  ON public.beta_waitlist FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for beta_invites
CREATE POLICY "Admins can manage invites"
  ON public.beta_invites FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for testimonials (public read, admin write)
CREATE POLICY "Anyone can view featured testimonials"
  ON public.testimonials FOR SELECT
  USING (featured = true);

CREATE POLICY "Admins can manage testimonials"
  ON public.testimonials FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for newsletter_subscribers
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all subscribers"
  ON public.newsletter_subscribers FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update subscribers"
  ON public.newsletter_subscribers FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for funnel_metrics
CREATE POLICY "Anyone can insert metrics"
  ON public.funnel_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all metrics"
  ON public.funnel_metrics FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_beta_waitlist_email ON public.beta_waitlist(email);
CREATE INDEX idx_beta_waitlist_status ON public.beta_waitlist(status);
CREATE INDEX idx_beta_waitlist_created_at ON public.beta_waitlist(created_at DESC);
CREATE INDEX idx_beta_invites_code ON public.beta_invites(code);
CREATE INDEX idx_beta_invites_email ON public.beta_invites(email);
CREATE INDEX idx_testimonials_featured ON public.testimonials(featured, display_order);
CREATE INDEX idx_newsletter_status ON public.newsletter_subscribers(status);
CREATE INDEX idx_funnel_metrics_event ON public.funnel_metrics(event_type, created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_beta_waitlist_updated_at
  BEFORE UPDATE ON public.beta_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial testimonials
INSERT INTO public.testimonials (name, role, content, featured, display_order) VALUES
('Alex Chen', 'Digital Artist', 'TryArtie helped me understand what makes great design work. The AI breakdowns are insanely detailed and the generation is fire.', true, 1),
('Jordan Taylor', 'Content Creator', 'I used to struggle with art direction. Now I just upload references, get the breakdown, and create variations in seconds. Game changer.', true, 2),
('Sam Rivera', 'Design Student', 'Learning by doing! The analysis feature is like having an art director mentor 24/7. Best tool for leveling up my skills.', true, 3);