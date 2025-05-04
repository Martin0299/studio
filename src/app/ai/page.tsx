// src/app/ai/page.tsx
'use client';

import Chatbot from "@/components/ai/chatbot";
import { BrainCircuit } from "lucide-react";

export default function AiPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-lg h-full"> {/* Adjusted max-width and added h-full */}
      <h1 className="text-2xl font-semibold text-center mb-4 flex items-center justify-center">
        <BrainCircuit className="mr-2 h-6 w-6 text-accent" />
        AI Health Assistant
      </h1>
      <Chatbot />
    </div>
  );
}
