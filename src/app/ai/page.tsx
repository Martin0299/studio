// src/app/ai/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";

export default function AiPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-md space-y-6">
      <h1 className="text-2xl font-semibold text-center mb-6">AI Insights</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <BrainCircuit className="mr-2 h-5 w-5 text-accent" />
            AI Features
          </CardTitle>
          <CardDescription>
            Explore AI-powered features to enhance your cycle tracking experience. (Coming Soon!)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This section will provide AI-driven predictions, pattern analysis, and personalized insights based on your logged data. Stay tuned for updates!
          </p>
          {/* Placeholder for future AI components */}
        </CardContent>
      </Card>
    </div>
  );
}
