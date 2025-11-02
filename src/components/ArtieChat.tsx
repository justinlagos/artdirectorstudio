import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

interface Message {
  id: string;
  text: string;
  sender: "user" | "artie";
  timestamp: Date;
}

export const ArtieChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm Artie, your creative assistant. How can I help you today?",
      sender: "artie",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Simulate Artie's response
    setTimeout(() => {
      const artieMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: getArtieResponse(inputValue),
        sender: "artie",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, artieMessage]);
    }, 1000);
  };

  const getArtieResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes("credit")) {
      return "Credits are used for AI operations like analysis, generation, and refinement. You can check your balance in the top-right corner or purchase more credits from your account settings.";
    }
    if (lowerInput.includes("analyze") || lowerInput.includes("upload")) {
      return "To analyze an image, go to the Studio page and upload your image. The AI will break down composition, lighting, colors, and more. Each analysis costs 1 credit.";
    }
    if (lowerInput.includes("generate")) {
      return "After analyzing an image, you can generate new variations using the refined prompt. Image generation costs 3 credits. You can adjust quality, size, and background settings.";
    }
    if (lowerInput.includes("blend")) {
      return "The Blend tool combines 2-4 images into one cohesive composition. Access it from the Tools menu in the header.";
    }
    if (lowerInput.includes("upscale")) {
      return "Upscale enhances your image resolution up to 4K with AI precision. Find it in the Tools dropdown menu.";
    }
    
    return "I can help you with credits, image analysis, generation, blending, upscaling, and general platform features. What would you like to know more about?";
  };

  return (
    <>
      {/* Chat Bubble */}
      {!isOpen && (
        <Button
          size="lg"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-strong hover:shadow-xl transition-all duration-300 z-50 p-0"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[32rem] shadow-xl z-50 flex flex-col glass-strong animate-in fade-in zoom-in-95 duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Artie</CardTitle>
                <p className="text-xs text-muted-foreground">Creative Assistant</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        message.sender === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
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
          </CardContent>
        </Card>
      )}
    </>
  );
};
