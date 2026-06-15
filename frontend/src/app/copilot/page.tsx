"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

type Message = {
  role: "user" | "model";
  content: string;
};

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Hello! I'm the Eluno AI Inventory Copilot. I have real-time access to our lens inventory and forecast data. How can I assist you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch(api('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(1) // skip the initial greeting
        })
      });

      if (!res.ok) throw new Error("Failed to communicate with AI");
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: "model", content: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "model", 
        content: "I'm currently unable to reach the live database. Please check if the backend service is running." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedPrompts = [
    "What lens powers are running low?",
    "Which inventory should we restock?",
    "Show highest demand lens powers.",
    "Which lens type moves fastest?"
  ];

  return (
    <div className="flex flex-col h-screen p-6 animate-in fade-in duration-500">
      <div className="mb-6 shrink-0">
        <h2 className="text-3xl font-black tracking-tight text-primary flex items-center drop-shadow-[0_0_15px_rgba(0,255,255,0.3)]">
          <Sparkles className="mr-3 h-8 w-8 animate-pulse" />
          AI Inventory Copilot
        </h2>
        <p className="text-muted-foreground mt-2 text-lg">Your intelligent assistant for supply chain optimization</p>
      </div>

      <Card className="flex flex-col flex-1 min-h-0 bg-white/5 dark:bg-black/20 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.3)] border border-white/10 rounded-3xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth z-10" id="chat-container">
          <AnimatePresence>
            {messages.map((msg, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                  "flex w-full gap-4",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "model" && (
                  <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className={cn(
                  "px-5 py-4 rounded-3xl max-w-[80%] shadow-lg relative overflow-hidden",
                  msg.role === "user" 
                    ? "bg-gradient-to-br from-primary to-blue-600 text-white rounded-tr-sm border border-primary/50" 
                    : "bg-black/40 backdrop-blur-md text-foreground rounded-tl-sm border border-white/10"
                )}>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    components={{
                      strong: ({node, ...props}) => <span className="font-bold" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-4 my-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-4 my-2" {...props} />,
                      li: ({node, ...props}) => <li className="mb-1" {...props} />,
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
                {msg.role === "user" && (
                  <div className="h-10 w-10 rounded-full bg-secondary border border-white/10 flex items-center justify-center shrink-0 shadow-md">
                    <User className="h-6 w-6 text-secondary-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
            
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full gap-4 justify-start"
              >
                <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div className="px-5 py-4 rounded-3xl bg-black/40 backdrop-blur-md text-foreground rounded-tl-sm border border-white/10 shadow-lg flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium text-primary/80">Analyzing inventory data...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="px-6 py-4 border-t border-white/10 bg-black/40 backdrop-blur-xl z-10">
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestedPrompts.map((prompt, i) => (
              <motion.div
                key={prompt}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Badge 
                  variant="outline" 
                  className="cursor-pointer bg-white/5 hover:bg-primary hover:text-white border-white/20 transition-all py-1.5 px-4 rounded-full text-sm font-medium hover:shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:scale-105"
                  onClick={() => setInput(prompt)}
                >
                  {prompt}
                </Badge>
              </motion.div>
            ))}
          </div>
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-3 relative"
          >
            <div className="relative flex-1 group">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur group-focus-within:bg-primary/40 transition-all duration-500" />
              <Input 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask anything about your inventory..." 
                className="relative bg-black/50 border-white/20 text-foreground rounded-full px-6 py-7 text-lg shadow-inner focus-visible:ring-primary focus-visible:border-primary transition-all"
                disabled={isLoading}
              />
            </div>
            <Button 
              type="submit" 
              className="h-14 rounded-full px-8 shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:shadow-[0_0_25px_rgba(0,255,255,0.6)] text-md font-bold transition-all duration-300"
              disabled={isLoading || !input.trim()}
            >
              <Send className="h-5 w-5 mr-2" />
              Send
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
