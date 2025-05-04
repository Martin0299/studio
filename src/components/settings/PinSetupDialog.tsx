// src/components/settings/PinSetupDialog.tsx
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { savePin, verifyPin } from '@/lib/security'; // Import security functions

interface PinSetupDialogProps {
  isOpen: boolean;
  onClose: (success: boolean) => void;
  isPinSet: boolean; // Indicates if a PIN is already set
}

export default function PinSetupDialog({ isOpen, onClose, isPinSet }: PinSetupDialogProps) {
  const { toast } = useToast();
  const [currentPin, setCurrentPin] = React.useState('');
  const [newPin, setNewPin] = React.useState('');
  const [confirmPin, setConfirmPin] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<'current' | 'new'>(isPinSet ? 'current' : 'new'); // Start at 'current' if changing PIN

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (isOpen) {
        setError(null);
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setStep(isPinSet ? 'current' : 'new'); // Reset step based on whether PIN is set
    }
  }, [isOpen, isPinSet]);

  const handleVerifyCurrentPin = async () => {
    setError(null);
    if (currentPin.length !== 4) {
      setError("Current PIN must be 4 digits.");
      return;
    }
    const isValid = await verifyPin(currentPin);
    if (isValid) {
      setStep('new'); // Move to setting the new PIN
    } else {
      setError("Incorrect current PIN.");
    }
  };

  const handleSetNewPin = async () => {
    setError(null);
    if (newPin.length !== 4) {
      setError("New PIN must be 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("New PINs do not match.");
      return;
    }

    try {
      await savePin(newPin);
      toast({
        title: isPinSet ? "PIN Changed Successfully" : "PIN Set Successfully",
        description: "Your app lock PIN has been updated.",
      });
      onClose(true); // Indicate success
    } catch (err) {
      console.error("Error saving PIN:", err);
      setError("Failed to save PIN. Please try again.");
      toast({
        title: "Error",
        description: "Could not save your PIN.",
        variant: "destructive",
      });
      onClose(false); // Indicate failure
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
        // If closing the dialog without completing, signal cancellation (false)
        // Only signal cancellation if the user actively closed it (not on successful save)
         if (step !== 'completed') { // Add a 'completed' step or check if onClose was called with true
            onClose(false);
         }
    }
  };

  const isNumeric = (value: string) => /^\d*$/.test(value);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isPinSet ? 'Change PIN' : 'Set Up PIN'}</DialogTitle>
          <DialogDescription>
            {step === 'current'
              ? 'Enter your current 4-digit PIN to continue.'
              : 'Set a new 4-digit PIN for app lock.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          {step === 'current' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="current-pin" className="text-right col-span-1">
                Current PIN
              </Label>
              <Input
                id="current-pin"
                type="password" // Use password type
                maxLength={4}
                value={currentPin}
                onChange={(e) => isNumeric(e.target.value) && setCurrentPin(e.target.value)}
                className="col-span-3 text-center tracking-[0.5em]" // Center text, add letter spacing
                autoComplete="off"
                inputMode="numeric" // Hint for numeric keyboard
              />
            </div>
          )}

          {step === 'new' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-pin" className="text-right col-span-1">
                  New PIN
                </Label>
                <Input
                  id="new-pin"
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => isNumeric(e.target.value) && setNewPin(e.target.value)}
                  className="col-span-3 text-center tracking-[0.5em]"
                  autoComplete="new-password" // Help password managers
                  inputMode="numeric"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="confirm-pin" className="text-right col-span-1">
                  Confirm PIN
                </Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => isNumeric(e.target.value) && setConfirmPin(e.target.value)}
                  className="col-span-3 text-center tracking-[0.5em]"
                  autoComplete="new-password"
                  inputMode="numeric"
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
           <DialogClose asChild>
             {/* Wrap Button in DialogClose to ensure dialog closes on Cancel */}
             <Button type="button" variant="outline" onClick={() => onClose(false)}>Cancel</Button>
          </DialogClose>
          {step === 'current' && (
            <Button type="button" onClick={handleVerifyCurrentPin} disabled={currentPin.length !== 4}>
              Verify
            </Button>
          )}
          {step === 'new' && (
            <Button type="button" onClick={handleSetNewPin} disabled={newPin.length !== 4 || confirmPin.length !== 4}>
              {isPinSet ? 'Change PIN' : 'Set PIN'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
