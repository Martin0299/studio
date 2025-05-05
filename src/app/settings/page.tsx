

// src/app/settings/page.tsx
'use client'; // Required for interactions like toggles and buttons

import * as React from 'react';
import { Button, buttonVariants } from "@/components/ui/button"; // Import buttonVariants
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Palette, Lock, Bell, Download, Trash2, CircleHelp, Languages } from 'lucide-react'; // Icons - Changed FileDown to Download, Added Languages
import { useCycleData, LogData } from '@/context/CycleDataContext'; // Import context
import { cn } from '@/lib/utils'; // Import cn
import { parseISO, format, subDays, addDays, differenceInDays, isAfter, isEqual, isValid, isBefore } from 'date-fns'; // Import date-fns functions
import PinSetupDialog from '@/components/settings/PinSetupDialog'; // Import the new dialog
import { setPinStatus, getPinStatus, clearPinStatus } from '@/lib/security'; // Import PIN utility functions

// Define theme type (Removed 'system')
type Theme = 'light' | 'dark';
type AccentColor = 'coral' | 'gold';
type Language = 'en' | 'hu' | 'de'; // Define available languages

// Define helper components for Form structure (minimal versions)
// In a real app, these would likely come from a UI library or be more robust
const Form = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const FormField = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const FormItem = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>;
const FormControl = ({ children }: { children: React.ReactNode }) => <>{children}</>;
// Update FormLabel to accept htmlFor
const FormLabel = ({ children, htmlFor, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { htmlFor?: string }) => <label htmlFor={htmlFor} {...props}>{children}</label>;
const FormMessage = ({ children }: { children?: React.ReactNode }) => <>{children ? <p className="text-sm font-medium text-destructive">{children}</p> : null}</>;
const FormDescription = ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => <p className="text-[0.8rem] text-muted-foreground" {...props}>{children}</p>;



export default function SettingsPage() {
    const { toast } = useToast();
    const { deleteAllData, logData, isLoading: isCycleDataLoading } = useCycleData(); // Get delete function and logData from context
    const [deleteConfirmInput, setDeleteConfirmInput] = React.useState(''); // State for delete confirmation input

    // -- Appearance State --
    const [theme, setTheme] = React.useState<Theme>('light');
    const [accentColor, setAccentColor] = React.useState<AccentColor>('coral');

    // -- Language State --
    const [language, setLanguage] = React.useState<Language>('en'); // Default to English

    // -- Cycle State (Derived from context) --
    const [avgCycleLength, setAvgCycleLength] = React.useState<number | null>(null);
    const [avgPeriodLength, setAvgPeriodLength] = React.useState<number | null>(null);

    // -- Reminder State --
    const [periodReminder, setPeriodReminder] = React.useState<boolean>(true);
    const [fertileReminder, setFertileReminder] = React.useState<boolean>(true);

    // -- Security State --
    const [appLock, setAppLock] = React.useState<boolean>(false);
    const [pinIsSet, setPinIsSet] = React.useState<boolean>(false); // State to track if PIN is set
    const [showPinDialog, setShowPinDialog] = React.useState<boolean>(false); // State for PIN dialog visibility

    // --- Effects for Appearance, Reminders, Security, and Language ---

    // Load settings from localStorage on mount
    React.useEffect(() => {
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        const storedAccent = localStorage.getItem('accentColor') as AccentColor | null;
        const storedPeriodReminder = localStorage.getItem('periodReminder');
        const storedFertileReminder = localStorage.getItem('fertileReminder');
        const storedAppLock = localStorage.getItem('appLock');
        const storedLanguage = localStorage.getItem('language') as Language | null;


        // Set theme
        if (storedTheme && ['light', 'dark'].includes(storedTheme)) {
            setTheme(storedTheme);
        } else {
            setTheme('light');
            localStorage.setItem('theme', 'light');
        }

        // Set accent
        if (storedAccent && ['coral', 'gold'].includes(storedAccent)) {
            setAccentColor(storedAccent);
        } else {
            setAccentColor('coral');
            localStorage.setItem('accentColor', 'coral');
        }

        // Set language
        if (storedLanguage && ['en', 'hu', 'de'].includes(storedLanguage)) {
            setLanguage(storedLanguage);
        } else {
            setLanguage('en'); // Default to English
            localStorage.setItem('language', 'en');
        }

        // Set reminders
        setPeriodReminder(storedPeriodReminder ? JSON.parse(storedPeriodReminder) : true);
        setFertileReminder(storedFertileReminder ? JSON.parse(storedFertileReminder) : true);

        // Set app lock and check PIN status
        const lockEnabled = storedAppLock ? JSON.parse(storedAppLock) : false;
        setAppLock(lockEnabled);
        const currentPinStatus = getPinStatus();
        setPinIsSet(currentPinStatus);

        // If lock is disabled but PIN was set, clear PIN status
        if (!lockEnabled && currentPinStatus) {
            clearPinStatus();
            setPinIsSet(false);
        }

    }, []);

    // Apply theme class to HTML element
    React.useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme); // Save theme change to localStorage
    }, [theme]); // Run only when theme changes

     // Apply accent color data attribute to HTML element
     React.useEffect(() => {
        const root = window.document.documentElement;
        root.setAttribute('data-accent', accentColor);
        localStorage.setItem('accentColor', accentColor); // Save accent change to localStorage
    }, [accentColor]); // Run only when accentColor changes

    // Apply language attribute to HTML element
     React.useEffect(() => {
        const root = window.document.documentElement;
        root.setAttribute('lang', language);
        localStorage.setItem('language', language); // Save language change to localStorage
        // TODO: Integrate with an i18n library here to actually change UI text
    }, [language]); // Run only when language changes


    // --- Effect for Cycle Calculations ---
     React.useEffect(() => {
         if (isCycleDataLoading || !logData) return; // Don't calculate if loading or no data

         const periodStartDates: Date[] = [];
         const periodLengths: number[] = [];
         const cycleLengths: number[] = [];

         const sortedDates = Object.keys(logData)
             .filter(dateString => {
                 try {
                     return isValid(parseISO(dateString));
                 } catch {
                     return false; // Filter out invalid date strings safely
                 }
             })
             .sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime());

          sortedDates.forEach((dateString) => {
              const entry = logData[dateString];
              if (!entry || !entry.date) return;

              const isPeriodDay = entry?.periodFlow && entry.periodFlow !== 'none';
              const date = parseISO(entry.date);
              if (!isValid(date)) return; // Skip invalid dates

              const prevDay = subDays(date, 1);
              const prevDayString = format(prevDay, 'yyyy-MM-dd');
              const prevLog = logData[prevDayString];
              const isPeriodStart = isPeriodDay && (!prevLog || !prevLog.periodFlow || prevLog.periodFlow === 'none');

              if (isPeriodStart) {
                 periodStartDates.push(date);
                 if (periodStartDates.length > 1) {
                     const previousStartDate = periodStartDates[periodStartDates.length - 2];
                     const cycleLength = differenceInDays(date, previousStartDate);
                      if (cycleLength > 10 && cycleLength < 100) { // Basic validation
                         cycleLengths.push(cycleLength);
                     }
                 }

                 // --- Calculate Period Length for the period starting 'date' ---
                  let endDate: Date | null = null;
                  let lastFlowDate = date; // Initialize with the start date
                  let foundExplicitEnd = false;

                  // Iterate forwards from the start date within the sorted log entries
                   const startIndex = sortedDates.indexOf(dateString);
                   for (let i = startIndex; i < sortedDates.length; i++) {
                        const currentDateString = sortedDates[i];
                        if (!currentDateString) continue;
                        const currentDate = parseISO(currentDateString);
                         if (!isValid(currentDate)) continue; // Skip invalid dates

                        const currentEntry = logData[currentDateString];

                        // Check if we've gone past a reasonable period duration or into the next cycle
                        if (differenceInDays(currentDate, date) > 20) break; // Limit search
                         // Check if we found the next period start date
                         const nextPeriodIndex = periodStartDates.findIndex(startDate => isEqual(startDate, currentDate));
                         if (nextPeriodIndex > periodStartDates.length - cycleLengths.length - 1) break; // Stop if next cycle start is found

                        // Found explicit end marker
                        if (currentEntry?.isPeriodEnd) {
                            endDate = currentDate;
                            foundExplicitEnd = true;
                            break;
                        }

                        // Track last day with flow if no explicit end marker found yet
                        if (!foundExplicitEnd && currentEntry?.periodFlow && currentEntry.periodFlow !== 'none') {
                             if (isAfter(currentDate, lastFlowDate)) {
                                lastFlowDate = currentDate;
                             }
                        }
                   }


                  // Determine the final end date
                  // If explicit end found, use it. Otherwise, use the last flow date unless it's the same as the start date (and start date wasn't marked as end), then assume 1 day.
                   const finalEndDate = endDate ?? (isAfter(lastFlowDate, date) ? lastFlowDate : date);

                  // Calculate length only if finalEndDate is valid and after or equal to start date
                   if (isValid(finalEndDate) && !isBefore(finalEndDate, date)) {
                     const length = differenceInDays(finalEndDate, date) + 1;
                     if (length > 0 && length < 20) { // Basic validation
                         periodLengths.push(length);
                     }
                   }
                 // --- End Period Length Calculation ---
             }
         });

         setAvgCycleLength(cycleLengths.length > 0 ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length) : null);
         setAvgPeriodLength(periodLengths.length > 0 ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length) : null);

     }, [logData, isCycleDataLoading]); // Recalculate when logData or loading state changes

    // --- Handlers ---

    const handleThemeChange = (newTheme: string) => {
        const validTheme = newTheme as Theme;
        setTheme(validTheme);
        // localStorage handled by useEffect
        toast({ title: "Theme Updated", description: `Theme set to ${validTheme}.` });
    };

    const handleAccentChange = (newAccent: string) => {
        const validAccent = newAccent as AccentColor;
        setAccentColor(validAccent);
        // localStorage handled by useEffect
        toast({ title: "Accent Color Updated", description: `Accent set to ${validAccent}.` });
    };

     const handleLanguageChange = (newLanguage: string) => {
        const validLanguage = newLanguage as Language;
        setLanguage(validLanguage);
        // localStorage handled by useEffect
        toast({ title: "Language Updated", description: `Language set to ${validLanguage.toUpperCase()}. UI text update requires full i18n setup.` });
        // TODO: Call i18n library function here
    };


    const handlePeriodReminderChange = (checked: boolean) => {
        setPeriodReminder(checked);
        localStorage.setItem('periodReminder', JSON.stringify(checked));
        toast({
            title: "Reminder Updated",
            description: `Period start reminder ${checked ? 'enabled' : 'disabled'}. (Notifications not yet active)`,
        });
        // TODO: Implement actual notification scheduling/cancelling logic here or in a service worker
    };

    const handleFertileReminderChange = (checked: boolean) => {
        setFertileReminder(checked);
        localStorage.setItem('fertileReminder', JSON.stringify(checked));
        toast({
            title: "Reminder Updated",
            description: `Fertile window reminder ${checked ? 'enabled' : 'disabled'}. (Notifications not yet active)`,
        });
        // TODO: Implement actual notification scheduling/cancelling logic here or in a service worker
    };

    const handleAppLockChange = (checked: boolean) => {
        setAppLock(checked);
        localStorage.setItem('appLock', JSON.stringify(checked));
        toast({
            title: "Security Setting Updated",
            description: `App Lock ${checked ? 'enabled' : 'disabled'}.`,
             variant: "default"
        });
        if (checked) {
             // If enabling lock and PIN isn't set, prompt user to set it
             if (!pinIsSet) {
                 setShowPinDialog(true); // Open the dialog immediately
                 toast({
                    title: "PIN Required",
                    description: "Please set up a PIN to enable App Lock.",
                    variant: "default"
                 });
             }
        } else {
            // If disabling lock, clear the stored PIN status
            clearPinStatus();
            setPinIsSet(false);
            console.log("App Lock disabled - PIN status cleared.");
        }
    };

    // Renamed handler to avoid conflict
    const handleOpenPinDialog = () => {
        console.log("Set/Change PIN initiated");
        setShowPinDialog(true); // Open the PIN setup dialog
    };

    // Handler for when PIN is successfully set in the dialog
    const handlePinSet = (success: boolean) => {
        setShowPinDialog(false); // Close the dialog
        if (success) {
            setPinStatus(true); // Update storage flag
            setPinIsSet(true); // Update local state
            // Toast is handled within the PinSetupDialog for success/change
        } else {
            // Optional: Handle cancellation or failure if needed
            console.log("PIN setup cancelled or failed.");
             // If the user cancelled setting a PIN while enabling lock, disable the lock again
             if (appLock && !getPinStatus()) {
                 handleAppLockChange(false); // Toggle lock off
                 toast({
                    title: "App Lock Disabled",
                    description: "PIN setup was cancelled. App Lock has been disabled.",
                    variant: "destructive"
                 });
             }
        }
    };

    // Function to create a downloadable file
    const downloadFile = (filename: string, text: string, mimeType: string) => {
        const element = document.createElement('a');
        element.setAttribute('href', `${mimeType};charset=utf-8,${encodeURIComponent(text)}`);
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };


     const handleBackup = () => {
        console.log("Backup initiated");
        try {
            const backupData: Record<string, any> = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                // Only back up cycle logs and relevant settings
                if (key && (key.startsWith('cycleLog_') || ['theme', 'accentColor', 'language', 'periodReminder', 'fertileReminder', 'appLock', 'appPinStatus'].includes(key))) {
                     const value = localStorage.getItem(key);
                    if (value !== null) { // Ensure value is not null
                        backupData[key] = value;
                     }
                }
            }

            if (Object.keys(backupData).length === 0) {
                toast({ title: "No Data", description: "No data found to back up.", variant: "default" });
                return;
            }

            const jsonString = JSON.stringify(backupData, null, 2); // Pretty print JSON
            const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
            downloadFile(`lunabloom_backup_${timestamp}.json`, jsonString, 'data:application/json');
            toast({ title: "Backup Successful", description: "Your data backup has been downloaded." });
        } catch (error) {
            console.error("Backup failed:", error);
            toast({ title: "Backup Failed", description: "An error occurred during backup.", variant: "destructive" });
        }
    };

    const handleExport = () => {
        console.log("Export initiated");
        try {
            const logsToExport: LogData[] = Object.keys(logData)
                .sort() // Sort by date string
                .map(key => logData[key]);

            if (logsToExport.length === 0) {
                 toast({ title: "No Log Data", description: "No cycle log data found to export.", variant: "default" });
                 return;
            }

            // Basic CSV structure
            const headers = ["date", "periodFlow", "isPeriodEnd", "symptoms", "mood", "sexualActivityCount", "protectionUsed", "orgasm", "notes"];
            const csvRows = [
                headers.join(','), // Header row
                ...logsToExport.map(log => [
                    log.date,
                    log.periodFlow ?? '',
                    log.isPeriodEnd ? 'true' : 'false',
                    `"${(log.symptoms ?? []).join('; ')}"`, // Join symptoms, quote for safety
                    log.mood ?? '',
                    log.sexualActivityCount ?? 0,
                    log.protectionUsed !== undefined ? (log.protectionUsed ? 'true' : 'false') : '',
                    log.orgasm !== undefined ? (log.orgasm ? 'true' : 'false') : '',
                    `"${(log.notes ?? '').replace(/"/g, '""')}"` // Quote notes, escape double quotes
                ].join(','))
            ];
            const csvString = csvRows.join('\n');
            const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
            downloadFile(`lunabloom_export_${timestamp}.csv`, csvString, 'data:text/csv');
            toast({ title: "Export Successful", description: "Your cycle log data has been downloaded as CSV." });

        } catch (error) {
             console.error("Export failed:", error);
             toast({ title: "Export Failed", description: "An error occurred during export.", variant: "destructive" });
        }
    };


    const handleDeleteAllDataConfirmed = () => {
        deleteAllData();
        toast({ variant: "destructive", title: "Data Deleted", description: "All your cycle data has been permanently removed." });
        setDeleteConfirmInput('');
    };

    const isDeleteDisabled = deleteConfirmInput !== 'DELETE';

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

            {/* Reminders - Enabled */}
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Bell className="mr-2 h-5 w-5 text-accent"/>Reminders</CardTitle>
                     <CardDescription>Manage your cycle notifications. (Actual notifications require app setup)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel htmlFor="period-reminder-switch" className="text-base flex items-center">Period Start Prediction</FormLabel>
                             {/* No FormMessage needed here unless there's an error state */}
                        </div>
                         <FormControl>
                            <Switch
                                id="period-reminder-switch"
                                checked={periodReminder}
                                onCheckedChange={handlePeriodReminderChange}
                                aria-label="Toggle period start prediction reminder"
                            />
                        </FormControl>
                    </FormItem>
                     <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                         <div className="space-y-0.5">
                            <FormLabel htmlFor="fertile-reminder-switch" className="text-base flex items-center">Fertile Window Start</FormLabel>
                         </div>
                         <FormControl>
                             <Switch
                                id="fertile-reminder-switch"
                                checked={fertileReminder}
                                onCheckedChange={handleFertileReminderChange}
                                aria-label="Toggle fertile window start reminder"
                            />
                        </FormControl>
                    </FormItem>
                </CardContent>
            </Card>

             {/* Appearance - Enabled */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Palette className="mr-2 h-5 w-5 text-accent"/>Appearance</CardTitle>
                     <CardDescription>Customize the look and feel of the app.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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
                         </RadioGroup>
                     </div>
                      <div>
                         <Label className="mb-2 block">Accent Color</Label>
                         <RadioGroup value={accentColor} onValueChange={handleAccentChange} className="flex space-x-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="coral" id="accent-coral" />
                                <Label htmlFor="accent-coral" style={{ color: 'hsl(var(--accent-coral))' }}>Coral</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="gold" id="accent-gold" />
                                <Label htmlFor="accent-gold" style={{ color: 'hsl(var(--accent-gold))' }}>Gold</Label>
                            </div>
                         </RadioGroup>
                    </div>
                </CardContent>
            </Card>

             {/* Security - Enabled */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Lock className="mr-2 h-5 w-5"/>Security</CardTitle>
                    <CardDescription>Protect access to your app with a PIN.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel htmlFor="app-lock-switch" className="text-base flex items-center">Enable App Lock</FormLabel>
                             {/* No FormMessage needed here */}
                        </div>
                         <FormControl>
                            <Switch
                                id="app-lock-switch"
                                checked={appLock}
                                onCheckedChange={handleAppLockChange}
                                aria-label="Toggle app lock"
                            />
                        </FormControl>
                    </FormItem>
                     {/* Button to Set/Change PIN */}
                     <Button
                        variant="outline"
                        className="w-full"
                        disabled={!appLock} // Enable button only when app lock is toggled on
                        onClick={handleOpenPinDialog} // Use the new handler
                    >
                         {pinIsSet ? 'Change PIN' : 'Set PIN'}
                    </Button>
                     <PinSetupDialog
                        isOpen={showPinDialog}
                        onClose={handlePinSet} // Pass handler to get result from dialog
                        isPinSet={pinIsSet} // Pass current PIN status
                     />
                </CardContent>
            </Card>


            {/* Data Management */}
            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">Local Data Management</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground !mt-1">
                         Your data is stored locally. Backup creates a JSON file, Export creates a CSV file. Deleting data here is permanent.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleBackup}>
                        <Download className="h-4 w-4" /> Backup Data (JSON)
                    </Button>
                     <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleExport}>
                        <Download className="h-4 w-4" /> Export Data (CSV)
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
                                    className={cn(buttonVariants({ variant: "destructive" }), "disabled:bg-destructive/50 disabled:cursor-not-allowed")} // Use cn and buttonVariants
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

// Export helpers if they aren't already exported by another component file
// Removed export { Form, FormField, FormItem, FormControl, FormLabel, FormMessage, FormDescription };
// as they are defined locally for structure.


