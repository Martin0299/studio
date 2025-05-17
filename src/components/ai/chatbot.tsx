
'use client';

import * as React from 'react';
import { chatWithHealthVisitor } from '@/ai/flows/health-visitor-chat-flow';
import type { ChatInput } from '@/ai/flows/health-visitor-chat-flow'; // Import type for history
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SendHorizontal, User, Bot, Loader2, MicOff, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string | React.ReactNode; // Allow ReactNode for loading state etc.
  role?: 'User' | 'Luna'; // For history, align with AI flow
}

const MAX_DAILY_MESSAGES = 8; // Changed from 5 to 8
const MESSAGE_COUNT_KEY = 'chatMessageCount';
const LAST_MESSAGE_DATE_KEY = 'chatLastMessageDate';
const CHAT_MESSAGES_KEY = 'chatMessages';

const initialMessage: Message = {
  id: 'initial',
  sender: 'bot',
  role: 'Luna',
  text: "Hello! I'm Luna, your professional, knowledgeable, and assertive virtual health visitor and maternity nurse. How can I help you today with questions about pregnancy, planning, or your little ones?",
};

export default function Chatbot() {
  const [messages, setMessages] = React.useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const storedMessages = localStorage.getItem(CHAT_MESSAGES_KEY);
      if (storedMessages) {
        try {
          const parsedMessages = JSON.parse(storedMessages) as Message[];
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
              if (parsedMessages[0]?.id !== initialMessage.id) {
                  return [initialMessage, ...parsedMessages];
              }
              return parsedMessages;
          }
        } catch (error) {
          console.error("Error parsing stored chat messages:", error);
        }
      }
    }
    return [initialMessage];
  });

  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLimitReached, setIsLimitReached] = React.useState(false);
  const [messageCount, setMessageCount] = React.useState(0);
  const { toast } = useToast();
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const checkAndUpdateLimit = React.useCallback(() => {
    if (typeof window === 'undefined') return { currentCount: 0, today: format(new Date(), 'yyyy-MM-dd'), limitReached: false };

    const today = format(new Date(), 'yyyy-MM-dd');
    const lastDate = localStorage.getItem(LAST_MESSAGE_DATE_KEY);
    let currentCount = 0;

    if (lastDate === today) {
      currentCount = parseInt(localStorage.getItem(MESSAGE_COUNT_KEY) || '0', 10);
    } else {
      localStorage.setItem(MESSAGE_COUNT_KEY, '0');
      localStorage.setItem(LAST_MESSAGE_DATE_KEY, today);
    }

    setMessageCount(currentCount);
    const limitReached = currentCount >= MAX_DAILY_MESSAGES;
    setIsLimitReached(limitReached);

    return { currentCount, today, limitReached };
  }, []);

  React.useEffect(() => {
    checkAndUpdateLimit();
  }, [checkAndUpdateLimit]);

  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        const messagesToSave = messages.filter(msg => !(typeof msg.text !== 'string' && msg.id.startsWith('bot-loading-')));
        if (messagesToSave.length === 1 && messagesToSave[0].id === initialMessage.id) {
             localStorage.removeItem(CHAT_MESSAGES_KEY);
        } else if (messagesToSave.length > 0) {
             localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messagesToSave));
        }
      } catch (error) {
        console.error("Error saving chat messages to localStorage:", error);
      }
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleClearHistory = () => {
    setMessages([initialMessage]);
     if (typeof window !== 'undefined') {
        localStorage.removeItem(CHAT_MESSAGES_KEY);
     }
     toast({
        title: "Chat Cleared",
        description: "Your conversation history has been cleared.",
     });
     inputRef.current?.focus();
  };

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || isLimitReached) return;

    const { currentCount: countBeforeSend, limitReached: updatedLimitReached } = checkAndUpdateLimit();
    if (updatedLimitReached) {
         toast({
            title: "Daily Limit Reached",
            description: `You can send up to ${MAX_DAILY_MESSAGES} messages per day. Please try again tomorrow.`,
            variant: "destructive",
         });
        return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      role: 'User',
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const newCount = countBeforeSend + 1;
    if (typeof window !== 'undefined') {
        localStorage.setItem(MESSAGE_COUNT_KEY, newCount.toString());
    }
    setMessageCount(newCount);
    if (newCount >= MAX_DAILY_MESSAGES) {
        setIsLimitReached(true);
    }

    const loadingMessageId = `bot-loading-${Date.now()}`;
    setMessages((prev) => [
        ...prev,
        { id: loadingMessageId, sender: 'bot', role: 'Luna', text: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> }
    ]);

    try {
      // Prepare history for the AI flow
      const chatHistory: ChatInput['history'] = messages
        .filter(msg => msg.id !== loadingMessageId && msg.id !== 'initial' && msg.text && typeof msg.text === 'string') // Exclude initial, loading, and non-string messages
        .map(msg => ({
          role: msg.role || (msg.sender === 'user' ? 'User' : 'Luna'), // Ensure role is set
          text: msg.text as string,
        }));
      if (messages.length > 1 && messages[0].id === initialMessage.id && typeof messages[0].text === 'string') {
        // Include initial message if it's not the only one and is a string
        // This is implicitly handled if 'initial' is filtered out above and messages[0] is string.
      }


      const response = await chatWithHealthVisitor({ message: userMessage.text as string, history: chatHistory });
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        role: 'Luna',
        text: response.response,
      };
      setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? botMessage : msg));
    } catch (error) {
      console.error('Error calling chat flow:', error);
      toast({
        title: 'Error',
        description: 'Sorry, something went wrong while getting a response.',
        variant: 'destructive',
      });
       setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? {
           id: loadingMessageId,
           sender: 'bot',
           role: 'Luna',
           text: "Sorry, I couldn't get a response. Please try again later."
        } : msg));
    } finally {
      setIsLoading(false);
       const { limitReached: finalLimitCheck } = checkAndUpdateLimit();
       if (!finalLimitCheck) {
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
                   <AvatarFallback><Bot className="h-5 w-5 text-accent" /></AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap shadow-sm',
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                 {typeof message.text !== 'string' && message.id.startsWith('bot-loading-') ? (
                    <div className="flex items-center justify-center p-1">{message.text}</div>
                 ) : (
                     message.text
                 )}
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
        <div className="flex items-center gap-2 mb-2">
             <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-2">
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
                <Button type="submit" size="icon" variant="default" className="bg-accent hover:bg-accent/90" disabled={isLoading || !input.trim() || isLimitReached}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isLimitReached ? <MicOff className="h-4 w-4"/> : <SendHorizontal className="h-4 w-4" />}
                    <span className="sr-only">{isLimitReached ? "Limit Reached" : "Send message"}</span>
                </Button>
             </form>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                     <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={messages.length <= 1}
                     >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Clear Chat History</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear Chat History?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete your current conversation. Are you sure?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearHistory} className={cn(buttonVariants({ variant: "destructive" }))}>
                            Clear History
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
             </AlertDialog>
        </div>
         <p className="text-xs text-muted-foreground mt-1 text-center">
             {isLimitReached
                ? `Daily message limit (${MAX_DAILY_MESSAGES}) reached. Please check back tomorrow.`
                : `You have ${MAX_DAILY_MESSAGES - messageCount} messages left today. Luna is an AI assistant. Information provided is not medical advice. Consult a healthcare professional for medical concerns.`
             }
         </p>
      </div>
    </div>
  );
}
