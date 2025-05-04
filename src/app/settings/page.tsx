// src/app/settings/page.tsx
'use client'; // Required for interactions like toggles and buttons

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Palette, Lock, Bell, FileDown, Trash2, CircleHelp } from 'lucide-react'; // Icons
import { useCycleData } from '@/context/CycleDataContext'; // Import context
import { cn } from '@/lib/utils'; // Import cn

// Define theme type
type Theme = 'light' | 'dark' | 'system';
type AccentColor = 'coral' | 'gold';

export default function SettingsPage() {
    const { toast } = useToast();
    const { deleteAllData, logData } = useCycleData(); // Get delete function and logData from context
    const [deleteConfirmInput, setDeleteConfirmInput] = React.useState(''); // State for delete confirmation input

    // -- Appearance State --
    // Use state that defaults to system/coral, but gets overridden by localStorage in useEffect
    const [theme, setTheme] = React.useState<Theme>('system');
    const [accentColor, setAccentColor] = React.useState<AccentColor>('coral');

    // -- Cycle State (Derived from context) --
    // Calculate averages here based on logData - reuse logic from Insights or create a helper
    // Placeholder values for now
    const [avgCycleLength, setAvgCycleLength] = React.useState<number | null>(null);
    const [avgPeriodLength, setAvgPeriodLength] = React.useState<number | null>(null);

    // TODO: State for reminders and security - load/save from a dedicated settings storage
    const [periodReminder, setPeriodReminder] = React.useState<boolean>(true);
    const [fertileReminder, setFertileReminder] = React.useState<boolean>(true);
    const [appLock, setAppLock] = React.useState<boolean>(false);


    // --- Effects for Appearance ---

    // Load Appearance settings from localStorage on mount
    React.useEffect(() => {
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        const storedAccent = localStorage.getItem('accentColor') as AccentColor | null;
        if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
            setTheme(storedTheme);
        }
        if (storedAccent && ['coral', 'gold'].includes(storedAccent)) {
            setAccentColor(storedAccent);
        }
    }, []);

    // Apply theme class to HTML element
    React.useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }
    }, [theme]);

     // Apply accent color data attribute to HTML element
     React.useEffect(() => {
        const root = window.document.documentElement;
        root.setAttribute('data-accent', accentColor);
    }, [accentColor]);


    // --- Effect for Cycle Calculations ---
     React.useEffect(() => {
         // Basic calculation - ideally share logic with Insights page
         const periodStartDates: Date[] = [];
         const periodLengths: number[] = [];
         const cycleLengths: number[] = [];

         const sortedDates = Object.keys(logData)
             .filter(dateString => { try { return !!parseISO(dateString); } catch { return false; } })
             .sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime());

          sortedDates.forEach((dateString, index) => {
              const entry = logData[dateString];
              if (!entry || !entry.date) return;

              const isPeriodDay = entry?.periodFlow && entry.periodFlow !== 'none';
              const date = parseISO(entry.date);

              const prevDay = subDays(date, 1);
              const prevDayString = format(prevDay, 'yyyy-MM-dd');
              const prevLog = logData[prevDayString];
              const isPeriodStart = isPeriodDay && (!prevLog || !prevLog.periodFlow || prevLog.periodFlow === 'none');

              if (isPeriodStart) {
                 periodStartDates.push(date);
                 if (periodStartDates.length > 1) {
                     const previousStartDate = periodStartDates[periodStartDates.length - 2];
                     const cycleLength = differenceInDays(date, previousStartDate);
                      if (cycleLength > 10 && cycleLength < 100) {
                         cycleLengths.push(cycleLength);
                     }
                 }

                  // Calculate length for the period starting now
                  let currentPeriodLength = 1;
                  let lookAheadDate = addDays(date, 1);
                  let lookAheadString = format(lookAheadDate, 'yyyy-MM-dd');
                  while(logData[lookAheadString]?.periodFlow && logData[lookAheadString]?.periodFlow !== 'none') {
                    currentPeriodLength++;
                    if (logData[lookAheadString]?.isPeriodEnd) break; // Stop if end marker found
                    lookAheadDate = addDays(lookAheadDate, 1);
                    lookAheadString = format(lookAheadDate, 'yyyy-MM-dd');
                  }
                  // Alternative: find explicit end marker if exists
                  let endDate: Date | null = null;
                  for (let d = index; d < sortedDates.length; d++) {
                       const currentDateString = sortedDates[d];
                       const currentDate = parseISO(currentDateString);
                       if (!isAfter(currentDate, date) && !isEqual(currentDate, date)) continue; // Skip past dates

                       const currentEntry = logData[currentDateString];
                        if (currentEntry?.isPeriodEnd) {
                             endDate = currentDate;
                             break;
                        }
                        // If no explicit end marker, the last flow day determines length (handled by while loop above implicitly if no end marker)
                  }

                  if (endDate) {
                      const length = differenceInDays(endDate, date) + 1;
                      if (length > 0 && length < 20) periodLengths.push(length);
                  } else if (currentPeriodLength > 0 && currentPeriodLength < 20) {
                      // Use length from consecutive flow days if no end marker found
                       periodLengths.push(currentPeriodLength);
                  }

             }
         });

         setAvgCycleLength(cycleLengths.length > 0 ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length) : null);
         setAvgPeriodLength(periodLengths.length > 0 ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length) : null);

     }, [logData]); // Recalculate when logData changes

    // --- Handlers ---

    const handleThemeChange = (newTheme: string) => {
        const validTheme = newTheme as Theme;
        setTheme(validTheme);
        localStorage.setItem('theme', validTheme);
        toast({ title: "Theme Updated", description: `Theme set to ${validTheme}.` });
    };

    const handleAccentChange = (newAccent: string) => {
        const validAccent = newAccent as AccentColor;
        setAccentColor(validAccent);
        localStorage.setItem('accentColor', validAccent);
        toast({ title: "Accent Color Updated", description: `Accent set to ${validAccent}.` });
    };


    const handleBackup = () => {
        console.log("Backup initiated");
        toast({ title: "Backup Not Implemented", description: "Data backup feature is coming soon.", variant: "destructive" });
    };

    const handleExport = () => {
        console.log("Export initiated");
        toast({ title: "Export Not Implemented", description: "Data export feature is coming soon.", variant: "destructive" });
    };

    const handleDeleteAllDataConfirmed = () => {
        deleteAllData();
        toast({ variant: "destructive", title: "Data Deleted", description: "All your cycle data has been permanently removed." });
        setDeleteConfirmInput('');
    };

    const isDeleteDisabled = deleteConfirmInput !== 'DELETE';

    // Import date-fns functions used in useEffect
    const { parseISO, format, subDays, addDays, differenceInDays, isAfter, isEqual } = require('date-fns');


    return (
        <div className="container mx-auto py-6 px-4 max-w-md space-y-8">
            <h1 className="text-2xl font-semibold text-center">Settings</h1>

            {/* Cycle Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Cycle Settings (Calculated)</CardTitle>
                    <CardDescription>Averages based on your logged data. Manual override coming soon.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 items-center">
                        <Label htmlFor="cycle-length">Average Cycle Length</Label>
                        <Input
                            id="cycle-length"
                            type="text" // Use text to display 'N/A' or number
                            value={avgCycleLength !== null ? `${avgCycleLength} days` : 'N/A'}
                            readOnly
                            className="w-full bg-muted cursor-not-allowed text-right"
                        />
                    </div>
                     <div className="grid grid-cols-2 gap-4 items-center">
                        <Label htmlFor="period-length">Average Period Length</Label>
                         <Input
                            id="period-length"
                            type="text"
                            value={avgPeriodLength !== null ? `${avgPeriodLength} days` : 'N/A'}
                            readOnly
                            className="w-full bg-muted cursor-not-allowed text-right"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Reminders */}
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Bell className="mr-2 h-5 w-5"/>Reminders</CardTitle>
                    <CardDescription>Manage your notifications (feature coming soon).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Still disabled */}
                    <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                        <Label htmlFor="period-reminder" className="flex-1">Period Start Prediction</Label>
                        <Switch
                            id="period-reminder"
                            checked={periodReminder}
                            onCheckedChange={setPeriodReminder}
                            disabled
                        />
                    </div>
                    <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                        <Label htmlFor="fertile-reminder" className="flex-1">Fertile Window Start</Label>
                         <Switch
                            id="fertile-reminder"
                            checked={fertileReminder}
                            onCheckedChange={setFertileReminder}
                            disabled
                        />
                    </div>
                </CardContent>
            </Card>

             {/* Appearance - Enabled */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Palette className="mr-2 h-5 w-5"/>Appearance</CardTitle>
                     <CardDescription>Customize the look and feel of the app.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6"> {/* Removed opacity/disabled */}
                     <div>
                         <Label className="mb-2 block">Theme</Label>
                         <RadioGroup value={theme} onValueChange={handleThemeChange} className="flex space-x-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="light" id="theme-light" />
                                <Label htmlFor="theme-light">Light</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="dark" id="theme-dark" />
                                <Label htmlFor="theme-dark">Dark</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="system" id="theme-system" />
                                <Label htmlFor="theme-system">System</Label>
                            </div>
                         </RadioGroup>
                     </div>
                      <div>
                         <Label className="mb-2 block">Accent Color</Label>
                         <RadioGroup value={accentColor} onValueChange={handleAccentChange} className="flex space-x-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="coral" id="accent-coral" />
                                {/* Apply inline style for preview, but actual color comes from CSS variables */}
                                <Label htmlFor="accent-coral" style={{ color: 'hsl(16 100% 66%)' }}>Coral</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="gold" id="accent-gold" />
                                <Label htmlFor="accent-gold" style={{ color: 'hsl(45 100% 70%)' }}>Gold</Label>
                            </div>
                         </RadioGroup>
                    </div>
                </CardContent>
            </Card>

             {/* Security */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Lock className="mr-2 h-5 w-5"/>Security</CardTitle>
                    <CardDescription>Protect access to your app (feature coming soon).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 opacity-50 cursor-not-allowed">
                     <div className="flex items-center justify-between">
                        <Label htmlFor="app-lock" className="flex-1">Enable App Lock (PIN/Biometrics)</Label>
                        <Switch
                            id="app-lock"
                            checked={appLock}
                            onCheckedChange={setAppLock}
                            disabled
                        />
                    </div>
                     {appLock && <Button variant="outline" className="w-full" disabled>Set/Change PIN</Button>}
                </CardContent>
            </Card>


            {/* Data Management */}
            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">Local Data Management</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground !mt-1">
                        Your cycle data is stored locally on this device. Backup and Export are planned features. Deleting data here is permanent.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleBackup}>
                        <FileDown className="h-4 w-4" /> Backup Data (Soon)
                    </Button>
                     <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleExport}>
                        <FileDown className="h-4 w-4" /> Export Data (Soon)
                    </Button>

                    <Separator />

                    <AlertDialog onOpenChange={(open) => !open && setDeleteConfirmInput('')}> {/* Reset input on close */}
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" className="w-full flex items-center justify-center gap-2">
                                <Trash2 className="h-4 w-4" /> Delete All Cycle Data
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete all your cycle tracking data stored in this browser. Type <strong className="text-destructive">DELETE</strong> below to confirm.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                             <Input
                                id="delete-confirm"
                                placeholder='Type "DELETE" to confirm'
                                value={deleteConfirmInput}
                                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                                className="mt-2 border-destructive focus-visible:ring-destructive"
                              />
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeleteConfirmInput('')}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDeleteAllDataConfirmed}
                                    disabled={isDeleteDisabled} // Disable action based on input
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:bg-destructive/50 disabled:cursor-not-allowed"
                                 >
                                    Delete Data
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>


             {/* Help & About */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><CircleHelp className="mr-2 h-5 w-5"/>Help &amp; About</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="link" className="p-0 h-auto justify-start" disabled>FAQ (Soon)</Button><br />
                    <Button variant="link" className="p-0 h-auto justify-start" disabled>Contact Support (Soon)</Button><br />
                    <Button variant="link" className="p-0 h-auto justify-start" disabled>Privacy Policy (Soon)</Button><br />
                    <p className="text-xs text-muted-foreground pt-2">App Version: 1.0.1</p> {/* Updated version */}
                 </CardContent>
            </Card>

             {/* No overall save button needed as settings are applied instantly */}
        </div>
    );
}