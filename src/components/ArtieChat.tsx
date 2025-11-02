import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'artie';
  timestamp: Date;
}

export const ArtieChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm Artie, your creative assistant. How can I help you today?",
      sender: 'artie',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    // Simulate Artie's response
    setTimeout(() => {
      const artieResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getArtieResponse(inputValue),
        sender: 'artie',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, artieResponse]);
    }, 1000);
  };

  const getArtieResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('credit')) {
      return "Credits are used for AI operations. Analysis costs 1 credit, prompt refinement costs 2 credits, and image generation costs 3 credits. You can purchase more credits from the Settings page.";
    } else if (lowerInput.includes('analyze') || lowerInput.includes('analysis')) {
      return "To analyze an image, go to the Studio page, upload your image, and click 'Analyze Image'. The AI will provide detailed analysis of composition, lighting, colors, and more!";
    } else if (lowerInput.includes('generate')) {
      return "After analyzing an image or creating a prompt, you can generate new images by clicking the 'Generate Image' button. You can customize quality, size, and background settings.";
    } else if (lowerInput.includes('blend')) {
      return "The Blend feature allows you to combine 2-4 images into one cohesive composition. Upload your images and optionally add a description to guide the blending process.";
    } else if (lowerInput.includes('upscale')) {
      return "Upscale enhances your image resolution up to 4K using AI. Simply upload an image, select your scale factor, and the AI will enhance detail and clarity.";
    } else {
      return "I can help you with image analysis, generation, blending, upscaling, and more. What would you like to know about?";
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-strong z-50 hover:scale-110 transition-transform"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
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
                <p className="text-sm leading-relaxed">{message.text}</p>
              </div>
            </div>
          ))}
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
            placeholder="Ask Artie anything..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
};
