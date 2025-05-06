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
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Palette, Lock, Bell, Download, Trash2, CircleHelp, Upload, Pill, Languages } from 'lucide-react'; // Icons - Added Upload, Pill, Languages
import { useCycleData, LogData } from '@/context/CycleDataContext'; // Import context
import { cn } from '@/lib/utils'; // Import cn
import { format } from 'date-fns'; // Import date-fns functions
import PinSetupDialog from '@/components/settings/PinSetupDialog'; // Import the new dialog
import { setPinStatus, getPinStatus, clearPinStatus } from '@/lib/security'; // Import PIN utility functions
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


// Define theme type (Removed 'system')
type Theme = 'light' | 'dark';
type AccentColor = 'coral' | 'gold';
type Language = 'en' | 'hu' | 'de';


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
    const { deleteAllData, logData, refreshData } = useCycleData(); // Get delete/refresh function and logData from context
    const [deleteConfirmInput, setDeleteConfirmInput] = React.useState(''); // State for delete confirmation input
    const [isImporting, setIsImporting] = React.useState(false); // State for import loading

    // -- Appearance State --
    const [theme, setTheme] = React.useState<Theme>('light');
    const [accentColor, setAccentColor] = React.useState<AccentColor>('coral');
    const [language, setLanguage] = React.useState<Language>('en');


    // -- Reminder State --
    const [periodReminder, setPeriodReminder] = React.useState<boolean>(true);
    const [fertileReminder, setFertileReminder] = React.useState<boolean>(true);
    const [pillReminder, setPillReminder] = React.useState<boolean>(false);
    const [pillReminderTime, setPillReminderTime] = React.useState<string>('08:00');

    // -- Security State --
    const [appLock, setAppLock] = React.useState<boolean>(false);
    const [pinIsSet, setPinIsSet] = React.useState<boolean>(false); // State to track if PIN is set
    const [showPinDialog, setShowPinDialog] = React.useState<boolean>(false); // State for PIN dialog visibility


    // --- Effects for Appearance, Reminders, Security ---

    // Load settings from localStorage on mount
    React.useEffect(() => {
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        const storedAccent = localStorage.getItem('accentColor') as AccentColor | null;
        const storedLanguage = localStorage.getItem('language') as Language | null;
        const storedPeriodReminder = localStorage.getItem('periodReminder');
        const storedFertileReminder = localStorage.getItem('fertileReminder');
        const storedPillReminder = localStorage.getItem('pillReminder');
        const storedPillReminderTime = localStorage.getItem('pillReminderTime');
        const storedAppLock = localStorage.getItem('appLock');


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
        setPillReminder(storedPillReminder ? JSON.parse(storedPillReminder) : false);
        setPillReminderTime(storedPillReminderTime || '08:00');


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
        document.documentElement.lang = language;
        localStorage.setItem('language', language);
        // Here you would also trigger your i18n library to change the language
        // For example: i18n.changeLanguage(language);
        // This example doesn't include a full i18n setup, just sets the lang attribute.
    }, [language]);


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
        toast({ title: "Language Updated", description: `Language set to ${validLanguage}. UI text will update after full i18n setup.` });
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

    const handlePillReminderChange = (checked: boolean) => {
        setPillReminder(checked);
        localStorage.setItem('pillReminder', JSON.stringify(checked));
        toast({
            title: "Reminder Updated",
            description: `Pill reminder ${checked ? `enabled for ${pillReminderTime}` : 'disabled'}. (Notifications not yet active)`,
        });
    };

    const handlePillReminderTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = event.target.value;
        setPillReminderTime(newTime);
        localStorage.setItem('pillReminderTime', newTime);
        if (pillReminder) { // Only toast if reminder is active
            toast({
                title: "Reminder Time Updated",
                description: `Pill reminder time set to ${newTime}. (Notifications not yet active)`,
            });
        }
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
        const blob = new Blob([text], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const element = document.createElement('a');
        element.setAttribute('href', url);
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        URL.revokeObjectURL(url); // Clean up the object URL
    };


     const handleBackup = () => {
        console.log("Backup initiated");
        try {
            const backupData: Record<string, any> = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                // Only back up cycle logs and relevant settings
                if (key && (key.startsWith('cycleLog_') || ['theme', 'accentColor', 'periodReminder', 'fertileReminder', 'pillReminder', 'pillReminderTime', 'appLock', 'appPinStatus', 'appPinHash', 'language', 'healthTipsCache'].includes(key))) {
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
            downloadFile(`lunabloom_backup_${timestamp}.json`, jsonString, 'application/json');
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
            downloadFile(`lunabloom_export_${timestamp}.csv`, csvString, 'text/csv');
            toast({ title: "Export Successful", description: "Your cycle log data has been downloaded as CSV." });

        } catch (error) {
             console.error("Export failed:", error);
             toast({ title: "Export Failed", description: "An error occurred during export.", variant: "destructive" });
        }
    };

    // Handler for the Import button click
    const handleImportClick = () => {
        // Trigger the hidden file input
        document.getElementById('import-file-input')?.click();
    };

     // Handler for file selection
     const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                if (!text) {
                    throw new Error("File is empty or could not be read.");
                }
                const importedData = JSON.parse(text);

                // Validate the structure (basic check)
                if (typeof importedData !== 'object' || importedData === null) {
                    throw new Error("Invalid file format. Expected a JSON object.");
                }

                // Clear existing data before importing (optional, consider user choice)
                // deleteAllData(); // You might want to confirm this with the user first

                // Import the data into localStorage
                let importedCount = 0;
                let settingsImportedCount = 0;
                for (const key in importedData) {
                    if (Object.prototype.hasOwnProperty.call(importedData, key)) {
                        // Only import keys that match the expected format/types
                        if (key.startsWith('cycleLog_') || ['theme', 'accentColor', 'periodReminder', 'fertileReminder', 'pillReminder', 'pillReminderTime', 'appLock', 'appPinStatus', 'appPinHash', 'language', 'healthTipsCache'].includes(key)) {
                            // Basic validation for cycleLog entries
                            if (key.startsWith('cycleLog_')) {
                                const entry = importedData[key];
                                if (typeof entry === 'string') { // Assume stringified JSON
                                    try {
                                        const parsedEntry = JSON.parse(entry);
                                        if (parsedEntry && typeof parsedEntry === 'object' && parsedEntry.date) {
                                             localStorage.setItem(key, entry); // Store original stringified entry
                                             importedCount++;
                                        } else {
                                            console.warn(`Skipping invalid cycle log entry for key ${key}`);
                                        }
                                    } catch {
                                        console.warn(`Skipping non-JSON cycle log entry for key ${key}`);
                                    }
                                } else if (entry && typeof entry === 'object' && entry.date) {
                                     localStorage.setItem(key, JSON.stringify(entry)); // Stringify object entries
                                     importedCount++;
                                } else {
                                    console.warn(`Skipping invalid cycle log entry format for key ${key}`);
                                }
                            } else {
                                // Simple validation for settings
                                const value = importedData[key];
                                if (typeof value === 'string' || typeof value === 'boolean') {
                                    localStorage.setItem(key, typeof value === 'boolean' ? JSON.stringify(value) : value);
                                    settingsImportedCount++;
                                } else {
                                    console.warn(`Skipping invalid setting format for key ${key}`);
                                }
                            }
                        } else {
                            console.warn(`Skipping unrecognized key during import: ${key}`);
                        }
                    }
                }

                toast({
                    title: "Import Successful",
                    description: `Imported ${importedCount} log entries and ${settingsImportedCount} settings. Please refresh the app if changes aren't reflected immediately.`,
                });

                // Refresh the data in the context to reflect imported logs
                refreshData();

                // Reload the page to apply imported settings (theme, accent, lock etc.)
                window.location.reload();

            } catch (error: any) {
                console.error("Import failed:", error);
                toast({
                    title: "Import Failed",
                    description: error.message || "An error occurred during import. Please ensure the file is a valid JSON backup.",
                    variant: "destructive",
                });
            } finally {
                setIsImporting(false);
                // Reset file input value to allow importing the same file again if needed
                event.target.value = '';
            }
        };

        reader.onerror = () => {
             console.error("Error reading file:", reader.error);
             toast({
                title: "Import Failed",
                description: "Could not read the selected file.",
                variant: "destructive",
             });
             setIsImporting(false);
             event.target.value = '';
        };

        reader.readAsText(file);
    };


    const handleDeleteAllDataConfirmed = () => {
        deleteAllData();
        toast({ variant: "destructive", title: "Data Deleted", description: "All your cycle data has been permanently removed." });
        setDeleteConfirmInput('');
    };

    const isDeleteDisabled = deleteConfirmInput !== 'DELETE';
    const appVersion = process.env.APP_VERSION || '0.0.0'; // Get version from env


    return (
        <Form> {/* Wrap entire content in Form for context, if Form components are used outside FormField */}
        <div className="container mx-auto py-6 px-4 max-w-md space-y-8">
            <h1 className="text-2xl font-semibold text-center">Settings</h1>

            {/* Reminders - Enabled */}
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Bell className="mr-2 h-5 w-5 text-accent"/>Reminders</CardTitle>
                     <FormDescription>Manage your cycle notifications. (Actual notifications require app setup)</FormDescription>
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
                     <FormItem className="rounded-lg border p-4">
                        <div className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                                <FormLabel htmlFor="pill-reminder-switch" className="text-base flex items-center">
                                    <Pill className="mr-2 h-5 w-5 text-blue-500"/>Contraceptive Pill
                                </FormLabel>
                                <FormDescription className="text-xs">
                                    Daily reminder for your pill.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    id="pill-reminder-switch"
                                    checked={pillReminder}
                                    onCheckedChange={handlePillReminderChange}
                                    aria-label="Toggle contraceptive pill reminder"
                                />
                            </FormControl>
                        </div>
                        {pillReminder && (
                            <div className="mt-3">
                                <Label htmlFor="pill-time" className="text-sm">Reminder Time</Label>
                                <Input
                                    id="pill-time"
                                    type="time"
                                    value={pillReminderTime}
                                    onChange={handlePillReminderTimeChange}
                                    className="mt-1 w-full"
                                />
                            </div>
                        )}
                    </FormItem>
                </CardContent>
            </Card>

             {/* Appearance - Enabled */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Palette className="mr-2 h-5 w-5 text-accent"/>Appearance</CardTitle>
                     <FormDescription>Customize the look and feel of the app.</FormDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div>
                         <Label className="mb-2 block">Theme</Label>
                         <RadioGroup value={theme} onValueChange={handleThemeChange} className="flex space-x-4">
                            <FormItem className="flex items-center space-x-2">
                                <RadioGroupItem value="light" id="theme-light" />
                                <Label htmlFor="theme-light">Light</Label>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2">
                                <RadioGroupItem value="dark" id="theme-dark" />
                                <Label htmlFor="theme-dark">Dark</Label>
                            </FormItem>
                         </RadioGroup>
                     </div>
                      <div>
                         <Label className="mb-2 block">Accent Color</Label>
                         <RadioGroup value={accentColor} onValueChange={handleAccentChange} className="flex space-x-4">
                            <FormItem className="flex items-center space-x-2">
                                <RadioGroupItem value="coral" id="accent-coral" />
                                <Label htmlFor="accent-coral" style={{ color: 'hsl(var(--accent-coral))' }}>Coral</Label>
                            </FormItem>
                             <FormItem className="flex items-center space-x-2">
                                <RadioGroupItem value="gold" id="accent-gold" />
                                <Label htmlFor="accent-gold" style={{ color: 'hsl(var(--accent-gold))' }}>Gold</Label>
                            </FormItem>
                         </RadioGroup>
                    </div>
                </CardContent>
            </Card>

             {/* Security - Enabled */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Lock className="mr-2 h-5 w-5"/>Security</CardTitle>
                    <FormDescription>Protect access to your app with a PIN.</FormDescription>
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
                    <FormDescription className="text-sm text-muted-foreground !mt-1">
                         Your data is stored locally. Backup creates a JSON file, Export creates a CSV file. Import replaces current data. Deleting data here is permanent.
                    </FormDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Hidden file input for import */}
                     <Input
                        id="import-file-input"
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    {/* Import Button */}
                    <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleImportClick}
                        disabled={isImporting}
                    >
                         {isImporting ? (
                            <><CircleHelp className="animate-spin h-4 w-4 mr-2" /> Importing...</>
                         ) : (
                             <><Upload className="h-4 w-4" /> Import Data (JSON)</>
                         )}
                    </Button>

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


             {/* About Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><CircleHelp className="mr-2 h-5 w-5"/>About</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">App Version: {appVersion}</p>
                 </CardContent>
            </Card>

             {/* No overall save button needed as settings are applied instantly */}
        </div>
        </Form>
    );
}

