import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditConfirmationDialog } from "./CreditConfirmationDialog";
import { useCredits } from "@/hooks/useCredits";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'artie';
  timestamp: Date;
}

export const ArtieChat = () => {
  const { balance } = useCredits();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm Artie, your creative assistant. I can help you brainstorm ideas, explain features, troubleshoot issues, suggest prompt improvements, or generate images for you. What would you like to explore today?",
      sender: 'artie',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  const [pendingImagePrompt, setPendingImagePrompt] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleGenerateImage = async (prompt: string) => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to generate images.",
          variant: "destructive",
        });
        return;
      }

      // Deduct credits
      const { data: deductData, error: deductError } = await supabase.functions.invoke("deduct-credits", {
        body: { action: "generate", provider: "lovable" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (deductError || !deductData?.success) {
        toast({
          title: "Credit Error",
          description: deductError?.message?.includes("Insufficient") 
            ? "Insufficient credits. Please purchase more." 
            : "Failed to process payment.",
          variant: "destructive",
        });
        return;
      }

      // Generate image
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt, quality: "auto", size: "1024x1024", background: "auto" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || !data?.image) {
        toast({
          title: "Generation Failed",
          description: error?.message || "Failed to generate image.",
          variant: "destructive",
        });
        return;
      }

      // Add image to chat
      const imageMessage: Message = {
        id: Date.now().toString(),
        text: `Here's your generated image:\n[Generated Image]${data.image}`,
        sender: 'artie',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, imageMessage]);
      
      toast({
        title: "Success!",
        description: `Image generated. ${deductData.remaining_balance} credits remaining.`,
      });
    } catch (error) {
      console.error('Image generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (contextData?: { prompt?: string; analysis?: any; credits?: number }) => {
    if (!inputValue.trim() || isLoading) return;

    // Check if user wants to generate an image
    const generateKeywords = ['generate', 'create image', 'make image', 'show me', 'create this', 'generate this'];
    const wantsToGenerate = generateKeywords.some(keyword => inputValue.toLowerCase().includes(keyword));
    
    if (wantsToGenerate) {
      // Extract prompt or use context
      let imagePrompt = inputValue.replace(/generate|create|make|show me|create this|generate this/gi, '').trim();
      if (!imagePrompt && contextData?.prompt) {
        imagePrompt = contextData.prompt;
      }
      
      if (imagePrompt) {
        setPendingImagePrompt(imagePrompt);
        setShowCreditConfirm(true);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to use Artie.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      let contextualInput = inputValue;
      if (contextData) {
        const contextParts = [];
        if (contextData.prompt) {
          contextParts.push(`Current prompt: "${contextData.prompt.slice(0, 200)}..."`);
        }
        if (contextData.analysis) {
          contextParts.push(`Image overview: ${contextData.analysis.image_overview?.slice(0, 150)}`);
        }
        if (contextData.credits !== undefined) {
          contextParts.push(`User has ${contextData.credits} credits remaining`);
        }
        if (contextParts.length > 0) {
          contextualInput = `Context: ${contextParts.join(' | ')}\n\nUser question: ${inputValue}`;
        }
      }
      
      const { data: chatData, error: chatError } = await supabase.functions.invoke('artie-chat', {
        body: {
          messages: messages
            .filter(m => m.sender === 'user' || m.sender === 'artie')
            .slice(-10)
            .map(m => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text
            }))
            .concat([{ role: 'user', content: contextualInput }])
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (chatError) {
        throw new Error(chatError.message || 'Failed to get response from Artie');
      }

      if (chatData?.response) {
        const assistantMessageId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, {
          id: assistantMessageId,
          text: chatData.response,
          sender: 'artie',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error getting Artie response:', error);
      toast({
        title: "Connection Error",
        description: "Couldn't reach Artie. Please try again.",
        variant: "destructive",
      });
      
      setMessages(prev => prev.filter(m => m.id !== (Date.now() + 1).toString()));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <>
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-strong z-50 hover:scale-110 transition-transform"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        <CreditConfirmationDialog
          open={showCreditConfirm}
          onOpenChange={setShowCreditConfirm}
          creditsRequired={3}
          action="Generate Image"
          onConfirm={() => {
            setShowCreditConfirm(false);
            handleGenerateImage(pendingImagePrompt);
          }}
        />
      </>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[90vw] sm:w-[380px] h-[500px] max-h-[80vh] shadow-xl z-50 flex flex-col animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Artie</h3>
            <p className="text-xs text-muted-foreground">Creative Assistant</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.text.includes('[Generated Image]') ? (
                  <div className="space-y-2">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.text.split('[Generated Image]')[0]}
                    </p>
                    <img 
                      src={message.text.split('[Generated Image]')[1].trim()} 
                      alt="Generated by Artie"
                      className="rounded-lg max-w-full h-auto"
                    />
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Artie is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask Artie anything... (Try 'generate a sunset')"
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>

      <CreditConfirmationDialog
        open={showCreditConfirm}
        onOpenChange={setShowCreditConfirm}
        creditsRequired={3}
        action="Generate Image"
        onConfirm={() => {
          setShowCreditConfirm(false);
          handleGenerateImage(pendingImagePrompt);
        }}
      />
    </Card>
  );
};
