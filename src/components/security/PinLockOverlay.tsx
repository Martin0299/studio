// src/components/security/PinLockOverlay.tsx
'use client';

import * as React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from 'lucide-react';
import { verifyPin } from '@/lib/security';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PinLockOverlayProps {
  onUnlock: () => void;
}

export default function PinLockOverlay({ onUnlock }: PinLockOverlayProps) {
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleVerify = async () => {
    setError(null);
    setIsLoading(true);
    if (pin.length !== 4) {
      setError("PIN must be 4 digits.");
      setIsLoading(false);
      return;
    }

    const isValid = await verifyPin(pin);
    setIsLoading(false);

    if (isValid) {
      toast({ title: "Unlocked" });
      onUnlock(); // Call the unlock callback provided by the parent
    } else {
      setError("Incorrect PIN. Please try again.");
      setPin(''); // Clear the input on incorrect PIN
    }
  };

  // Allow submitting with Enter key
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleVerify();
    }
  };

  const isNumeric = (value: string) => /^\d*$/.test(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="w-full max-w-xs p-6 space-y-6 bg-card border rounded-lg shadow-xl">
        <div className="text-center space-y-2">
          <Lock className="mx-auto h-10 w-10 text-primary" />
          <h2 className="text-2xl font-semibold">Enter PIN</h2>
          <p className="text-muted-foreground text-sm">
            Enter your 4-digit PIN to unlock the app.
          </p>
        </div>

        <Input
          id="lock-pin"
          type="password"
          maxLength={4}
          value={pin}
          onChange={(e) => isNumeric(e.target.value) && setPin(e.target.value)}
          onKeyDown={handleKeyDown} // Add keydown listener
          className={cn(
            "col-span-3 text-center text-2xl tracking-[0.5em] h-12", // Center text, add letter spacing, increase height/size
            error && "border-destructive focus-visible:ring-destructive"
          )}
          autoComplete="off"
          inputMode="numeric" // Hint for numeric keyboard
          autoFocus // Focus on load
        />

        {error && <p className="text-sm text-destructive text-center pt-1">{error}</p>}

        <Button
            type="button"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={handleVerify}
            disabled={pin.length !== 4 || isLoading}
        >
            {isLoading ? 'Verifying...' : 'Unlock'}
        </Button>
      </div>
    </div>
  );
}
