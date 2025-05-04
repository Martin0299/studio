'use client';

import * as React from 'react';
import { chatWithHealthVisitor } from '@/ai/flows/health-visitor-chat-flow';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SendHorizontal, User, Bot, Loader2, MicOff } from 'lucide-react'; // Added MicOff for limit
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string | React.ReactNode; // Allow ReactNode for loading state etc.
}

const MAX_DAILY_MESSAGES = 5;
const MESSAGE_COUNT_KEY = 'chatMessageCount';
const LAST_MESSAGE_DATE_KEY = 'chatLastMessageDate';

export default function Chatbot() {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: 'initial',
      sender: 'bot',
      text: "Hello! I'm Luna, your virtual health visitor and maternity nurse. How can I help you today with questions about pregnancy, planning, or your little ones?",
    },
  ]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLimitReached, setIsLimitReached] = React.useState(false);
  const [messageCount, setMessageCount] = React.useState(0);
  const { toast } = useToast();
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);


  // Function to check and update message limit
  const checkAndUpdateLimit = React.useCallback(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const lastDate = localStorage.getItem(LAST_MESSAGE_DATE_KEY);
    let currentCount = 0;

    if (lastDate === today) {
      currentCount = parseInt(localStorage.getItem(MESSAGE_COUNT_KEY) || '0', 10);
    } else {
      // Reset count if it's a new day
      localStorage.setItem(MESSAGE_COUNT_KEY, '0');
      localStorage.setItem(LAST_MESSAGE_DATE_KEY, today);
    }

    setMessageCount(currentCount);
    setIsLimitReached(currentCount >= MAX_DAILY_MESSAGES);

    return { currentCount, today };
  }, []);


  // Check limit on mount
  React.useEffect(() => {
    checkAndUpdateLimit();
  }, [checkAndUpdateLimit]);


  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || isLimitReached) return;

    // Re-check limit before sending (in case of rapid submissions or stale state)
    const { currentCount: countBeforeSend, today } = checkAndUpdateLimit();
    if (countBeforeSend >= MAX_DAILY_MESSAGES) {
         toast({
            title: "Daily Limit Reached",
            description: `You can send up to ${MAX_DAILY_MESSAGES} messages per day. Please try again tomorrow.`,
            variant: "destructive",
         });
        return; // Stop submission
    }


    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Increment count and update localStorage
    const newCount = countBeforeSend + 1;
    localStorage.setItem(MESSAGE_COUNT_KEY, newCount.toString());
    setMessageCount(newCount);
    if (newCount >= MAX_DAILY_MESSAGES) {
        setIsLimitReached(true);
    }

    // Add a temporary loading message from the bot
    const loadingMessageId = `bot-loading-${Date.now()}`;
    setMessages((prev) => [
        ...prev,
        { id: loadingMessageId, sender: 'bot', text: <Loader2 className="h-5 w-5 animate-spin" /> }
    ]);

    try {
      const response = await chatWithHealthVisitor({ message: userMessage.text as string });
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.response,
      };
      // Replace loading message with actual response
      setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? botMessage : msg));
    } catch (error) {
      console.error('Error calling chat flow:', error);
      toast({
        title: 'Error',
        description: 'Sorry, something went wrong while getting a response.',
        variant: 'destructive',
      });
      // Replace loading message with an error message
       setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? {
           id: loadingMessageId, // Keep ID stable if needed, or generate new
           sender: 'bot',
           text: "Sorry, I couldn't get a response. Please try again later."
        } : msg));
    } finally {
      setIsLoading(false);
       // Refocus input after submission/response (if limit not reached)
       if (!isLimitReached) {
           inputRef.current?.focus();
       }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-card border rounded-lg shadow-md">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex items-start gap-3',
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.sender === 'bot' && (
                <Avatar className="h-8 w-8 border">
                  {/* Add a simple bot avatar or fallback */}
                   <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap', // Added whitespace-pre-wrap
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {message.text}
              </div>
              {message.sender === 'user' && (
                 <Avatar className="h-8 w-8 border">
                    <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                 </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder={isLimitReached ? "Daily message limit reached" : "Ask Luna a question..."}
            value={input}
            onChange={handleInputChange}
            disabled={isLoading || isLimitReached}
            className="flex-1"
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim() || isLimitReached}>
             {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isLimitReached ? <MicOff className="h-4 w-4"/> : <SendHorizontal className="h-4 w-4" />}
             <span className="sr-only">{isLimitReached ? "Limit Reached" : "Send message"}</span>
          </Button>
        </form>
         <p className="text-xs text-muted-foreground mt-2 text-center">
             {isLimitReached
                ? `Daily message limit (${MAX_DAILY_MESSAGES}) reached. Please check back tomorrow.`
                : `You have ${MAX_DAILY_MESSAGES - messageCount} messages left today. Luna is an AI assistant. Information provided is not medical advice. Consult a healthcare professional for medical concerns.`
             }
         </p>
      </div>
    </div>
  );
}
