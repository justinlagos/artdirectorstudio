import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, BookOpen, Sparkles, Blend, Maximize2, CreditCard } from "lucide-react";

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = [
    {
      category: "Getting Started",
      icon: BookOpen,
      items: [
        {
          question: "How do I analyze an image?",
          answer: "Go to the Studio page, upload your image, and click 'Analyze Image'. The AI will provide detailed analysis of composition, lighting, colors, and more. Each analysis costs 1 credit."
        },
        {
          question: "What are credits and how do they work?",
          answer: "Credits are used to pay for AI operations. Analysis costs 1 credit, prompt refinement costs 2 credits, and image generation costs 3 credits. You can purchase credits from your account settings."
        }
      ]
    },
    {
      category: "Studio Features",
      icon: Sparkles,
      items: [
        {
          question: "How do I regenerate a prompt?",
          answer: "After analyzing an image, you can click 'Edit & Refine' to customize specific attributes like subject, lighting, or style. This costs 2 credits and generates a new optimized prompt."
        },
        {
          question: "Can I generate images from my prompts?",
          answer: "Yes! After analyzing or refining your prompt, click 'Generate Image'. You can adjust quality, size, and background settings. Generation costs 3 credits."
        }
      ]
    },
    {
      category: "Tools",
      icon: Blend,
      items: [
        {
          question: "What is the Blend feature?",
          answer: "Blend combines 2-4 images into one cohesive composition. Upload your images, optionally add a description, and let AI merge them seamlessly."
        },
        {
          question: "How does Upscale work?",
          answer: "Upscale enhances your image resolution up to 4K using AI. Upload an image, select your scale factor, and the AI will enhance detail and clarity while maintaining quality."
        },
        {
          question: "What is Batch processing?",
          answer: "Batch allows you to analyze multiple images at once. Upload up to 10 images and get comprehensive analysis for all of them simultaneously."
        }
      ]
    },
    {
      category: "Billing & Credits",
      icon: CreditCard,
      items: [
        {
          question: "How do I purchase more credits?",
          answer: "Click on your credit balance in the header or go to Settings > Billing. Choose a credit package that fits your needs and complete the secure checkout process."
        },
        {
          question: "Do credits expire?",
          answer: "No, purchased credits never expire. They remain in your account until you use them."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-12 max-w-5xl">
        <div className="space-y-8 animate-fade-in">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h1 className="text-5xl font-display font-bold tracking-tight">Help Center</h1>
            <p className="text-lg text-muted-foreground">
              Find answers to common questions and learn how to make the most of ArtDirector Studio
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 glass-strong text-base"
            />
          </div>

          {/* FAQ Categories */}
          <div className="space-y-8">
            {faqs.map((category) => {
              const Icon = category.icon;
              return (
                <Card key={category.category} className="glass overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h2 className="text-xl font-semibold">{category.category}</h2>
                    </div>
                    <Accordion type="single" collapsible className="w-full">
                      {category.items.map((item, index) => (
                        <AccordionItem key={index} value={`item-${index}`} className="py-2">
                          <AccordionTrigger className="text-left hover:no-underline text-base font-medium py-4">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground leading-loose text-base pt-2 pb-4">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Help;
