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
import { Palette, Lock, Bell, Download, Trash2, Upload, Pill } from 'lucide-react'; // Icons - Removed CircleHelp
import { useCycleData, LogData } from '@/context/CycleDataContext'; // Import context
import { cn } from '@/lib/utils'; // Import cn
import { format } from 'date-fns'; // Import date-fns functions
import PinSetupDialog from '@/components/settings/PinSetupDialog'; // Import the new dialog
import { setPinStatus, getPinStatus, clearPinStatus } from '@/lib/security'; // Import PIN utility functions


// Define theme type (Removed 'system')
type Theme = 'light' | 'dark';
type AccentColor = 'coral' | 'gold';


// Define helper components for Form structure (minimal versions)
const Form = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const FormField = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const FormItem = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>;
const FormControl = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const FormLabel = ({ children, htmlFor, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { htmlFor?: string }) => <label htmlFor={htmlFor} {...props}>{children}</label>;
const FormMessage = ({ children }: { children?: React.ReactNode }) => <>{children ? <p className="text-sm font-medium text-destructive">{children}</p> : null}</>;
const FormDescription = ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => <p className="text-[0.8rem] text-muted-foreground" {...props}>{children}</p>;



export default function SettingsPage() {
    const { toast } = useToast();
    const { deleteAllData, logData, refreshData } = useCycleData();
    const [deleteConfirmInput, setDeleteConfirmInput] = React.useState('');
    const [isImporting, setIsImporting] = React.useState(false);

    // -- Appearance State --
    const [theme, setTheme] = React.useState<Theme>('light');
    const [accentColor, setAccentColor] = React.useState<AccentColor>('coral');


    // -- Reminder State --
    const [periodReminder, setPeriodReminder] = React.useState<boolean>(true);
    const [fertileReminder, setFertileReminder] = React.useState<boolean>(true);
    const [pillReminder, setPillReminder] = React.useState<boolean>(false);
    const [pillReminderTime, setPillReminderTime] = React.useState<string>('09:00');


    // -- Security State --
    const [appLock, setAppLock] = React.useState<boolean>(false);
    const [pinIsSet, setPinIsSet] = React.useState<boolean>(false);
    const [showPinDialog, setShowPinDialog] = React.useState<boolean>(false);


    // --- Effects for Appearance, Reminders, Security ---

    React.useEffect(() => {
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        const storedAccent = localStorage.getItem('accentColor') as AccentColor | null;
        const storedPeriodReminder = localStorage.getItem('periodReminder');
        const storedFertileReminder = localStorage.getItem('fertileReminder');
        const storedPillReminder = localStorage.getItem('pillReminder');
        const storedPillReminderTime = localStorage.getItem('pillReminderTime');
        const storedAppLock = localStorage.getItem('appLock');


        if (storedTheme && ['light', 'dark'].includes(storedTheme)) {
            setTheme(storedTheme);
        } else {
            setTheme('light');
            localStorage.setItem('theme', 'light');
        }

        if (storedAccent && ['coral', 'gold'].includes(storedAccent)) {
            setAccentColor(storedAccent);
        } else {
            setAccentColor('coral');
            localStorage.setItem('accentColor', 'coral');
        }
        

        setPeriodReminder(storedPeriodReminder ? JSON.parse(storedPeriodReminder) : true);
        setFertileReminder(storedFertileReminder ? JSON.parse(storedFertileReminder) : true);
        setPillReminder(storedPillReminder ? JSON.parse(storedPillReminder) : false);
        setPillReminderTime(storedPillReminderTime || '09:00');

        const lockEnabled = storedAppLock ? JSON.parse(storedAppLock) : false;
        setAppLock(lockEnabled);
        const currentPinStatus = getPinStatus();
        setPinIsSet(currentPinStatus);

        if (!lockEnabled && currentPinStatus) {
            clearPinStatus();
            setPinIsSet(false);
        }
    }, []);

    React.useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

     React.useEffect(() => {
        const root = window.document.documentElement;
        root.setAttribute('data-accent', accentColor);
        localStorage.setItem('accentColor', accentColor);
    }, [accentColor]);


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
    

    const handlePeriodReminderChange = (checked: boolean) => {
        setPeriodReminder(checked);
        localStorage.setItem('periodReminder', JSON.stringify(checked));
        toast({
            title: "Reminder Updated",
            description: `Period start reminder ${checked ? 'enabled' : 'disabled'}. (Notifications not yet active)`,
        });
    };

    const handleFertileReminderChange = (checked: boolean) => {
        setFertileReminder(checked);
        localStorage.setItem('fertileReminder', JSON.stringify(checked));
        toast({
            title: "Reminder Updated",
            description: `Fertile window reminder ${checked ? 'enabled' : 'disabled'}. (Notifications not yet active)`,
        });
    };

    const handlePillReminderChange = (checked: boolean) => {
        setPillReminder(checked);
        localStorage.setItem('pillReminder', JSON.stringify(checked));
        toast({
            title: "Reminder Updated",
            description: `Contraceptive pill reminder ${checked ? 'enabled' : 'disabled'}. (Notifications not yet active)`,
        });
    };

    const handlePillReminderTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value;
        setPillReminderTime(newTime);
        localStorage.setItem('pillReminderTime', newTime);
        toast({
            title: "Reminder Time Updated",
            description: `Pill reminder time set to ${newTime}. (Notifications not yet active)`,
        });
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
             if (!pinIsSet) {
                 setShowPinDialog(true);
                 toast({
                    title: "PIN Required",
                    description: "Please set up a PIN to enable App Lock.",
                    variant: "default"
                 });
             }
        } else {
            clearPinStatus();
            setPinIsSet(false);
            console.log("App Lock disabled - PIN status cleared.");
        }
    };

    const handleOpenPinDialog = () => {
        console.log("Set/Change PIN initiated");
        setShowPinDialog(true);
    };

    const handlePinSet = (success: boolean) => {
        setShowPinDialog(false);
        if (success) {
            setPinStatus(true);
            setPinIsSet(true);
        } else {
             if (appLock && !getPinStatus()) {
                 handleAppLockChange(false); // Automatically disable app lock if PIN setup was cancelled
                 toast({
                    title: "App Lock Disabled",
                    description: "PIN setup was cancelled. App Lock has been disabled.",
                    variant: "destructive"
                 });
             }
        }
    };

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
        URL.revokeObjectURL(url);
    };


     const handleBackup = () => {
        console.log("Backup initiated");
        try {
            const backupData: Record<string, any> = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('cycleLog_') || ['theme', 'accentColor', 'periodReminder', 'fertileReminder', 'pillReminder', 'pillReminderTime', 'appLock', 'appPinStatus', 'appPinHash', 'healthTipsCache', 'babyPlanningChecklist', 'babyPlanningLifestyleInputs', 'babyPlanningLifestylePlan', 'babyPlanningMealPlanInputs', 'babyPlanningMealPlan'].includes(key))) {
                     const value = localStorage.getItem(key);
                    if (value !== null) {
                        backupData[key] = value;
                     }
                }
            }

            if (Object.keys(backupData).length === 0) {
                toast({ title: "No Data", description: "No data found to back up.", variant: "default" });
                return;
            }

            const jsonString = JSON.stringify(backupData, null, 2);
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
                .sort()
                .map(key => logData[key]);

            if (logsToExport.length === 0) {
                 toast({ title: "No Log Data", description: "No cycle log data found to export.", variant: "default" });
                 return;
            }

            const headers = ["date", "periodFlow", "isPeriodEnd", "symptoms", "mood", "sexualActivityCount", "protectionUsed", "orgasm", "tookPill", "notes"];
            const csvRows = [
                headers.join(','),
                ...logsToExport.map(log => [
                    log.date,
                    log.periodFlow ?? '',
                    log.isPeriodEnd ? 'true' : 'false',
                    `"${(log.symptoms ?? []).join('; ')}"`,
                    log.mood ?? '',
                    log.sexualActivityCount ?? 0,
                    log.protectionUsed !== undefined ? (log.protectionUsed ? 'true' : 'false') : '',
                    log.orgasm !== undefined ? (log.orgasm ? 'true' : 'false') : '',
                    log.tookPill !== undefined ? (log.tookPill ? 'true' : 'false') : '',
                    `"${(log.notes ?? '').replace(/"/g, '""')}"`,
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

    const handleImportClick = () => {
        document.getElementById('import-file-input')?.click();
    };

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

                if (typeof importedData !== 'object' || importedData === null) {
                    throw new Error("Invalid file format. Expected a JSON object.");
                }

                let importedCount = 0;
                let settingsImportedCount = 0;
                for (const key in importedData) {
                    if (Object.prototype.hasOwnProperty.call(importedData, key)) {
                        if (key.startsWith('cycleLog_') || ['theme', 'accentColor', 'periodReminder', 'fertileReminder', 'pillReminder', 'pillReminderTime', 'appLock', 'appPinStatus', 'appPinHash', 'healthTipsCache', 'babyPlanningChecklist', 'babyPlanningLifestyleInputs', 'babyPlanningLifestylePlan', 'babyPlanningMealPlanInputs', 'babyPlanningMealPlan'].includes(key))) {
                            if (key.startsWith('cycleLog_')) {
                                const entry = importedData[key];
                                if (typeof entry === 'string') {
                                    try {
                                        const parsedEntry = JSON.parse(entry);
                                        if (parsedEntry && typeof parsedEntry === 'object' && parsedEntry.date) {
                                             localStorage.setItem(key, entry);
                                             importedCount++;
                                        } else {
                                            console.warn(`Skipping invalid cycle log entry for key ${key}`);
                                        }
                                    } catch {
                                        console.warn(`Skipping non-JSON cycle log entry for key ${key}`);
                                    }
                                } else if (entry && typeof entry === 'object' && entry.date) {
                                     localStorage.setItem(key, JSON.stringify(entry));
                                     importedCount++;
                                } else {
                                    console.warn(`Skipping invalid cycle log entry format for key ${key}`);
                                }
                            } else {
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

                refreshData(); // Refresh data in context
                // Force reload to apply theme/accent and other settings from localStorage immediately
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
                event.target.value = ''; // Clear the file input
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
             event.target.value = ''; // Clear the file input
        };

        reader.readAsText(file);
    };


    const handleDeleteAllDataConfirmed = () => {
        deleteAllData();
        toast({ variant: "destructive", title: "Data Deleted", description: "All your cycle data has been permanently removed." });
        setDeleteConfirmInput('');
    };

    const isDeleteDisabled = deleteConfirmInput !== 'DELETE';


    return (
        <Form>
        <div className="container mx-auto py-6 px-4 max-w-md space-y-8">
            <h1 className="text-2xl font-semibold text-center">Settings</h1>

             <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Bell className="mr-2 h-5 w-5 text-accent"/>Reminders</CardTitle>
                     <FormDescription>Manage your cycle notifications. (Actual notifications require app setup)</FormDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel htmlFor="period-reminder-switch" className="text-base flex items-center">Period Start Prediction</FormLabel>
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
                     <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel htmlFor="pill-reminder-switch" className="text-base flex items-center">
                                <Pill className="mr-2 h-5 w-5" /> Contraceptive Pill
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
                    </FormItem>
                    {pillReminder && (
                        <FormItem className="rounded-lg border p-4">
                            <div className="flex flex-row items-center justify-between">
                                <FormLabel htmlFor="pill-reminder-time" className="text-base">Reminder Time</FormLabel>
                                <FormControl>
                                    <Input
                                        id="pill-reminder-time"
                                        type="time"
                                        value={pillReminderTime}
                                        onChange={handlePillReminderTimeChange}
                                        className="w-auto"
                                    />
                                </FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                </CardContent>
            </Card>

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

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Lock className="mr-2 h-5 w-5"/>Security</CardTitle>
                    <FormDescription>Protect access to your app with a PIN.</FormDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel htmlFor="app-lock-switch" className="text-base flex items-center">Enable App Lock</FormLabel>
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
                     <Button
                        variant="outline"
                        className="w-full"
                        disabled={!appLock}
                        onClick={handleOpenPinDialog}
                    >
                         {pinIsSet ? 'Change PIN' : 'Set PIN'}
                    </Button>
                     <PinSetupDialog
                        isOpen={showPinDialog}
                        onClose={handlePinSet}
                        isPinSet={pinIsSet}
                     />
                </CardContent>
            </Card>


            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">Local Data Management</CardTitle>
                    <FormDescription className="text-sm text-muted-foreground !mt-1">
                         Your data is stored locally. Backup creates a JSON file, Export creates a CSV file. Import replaces current data. Deleting data here is permanent.
                    </FormDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Input
                        id="import-file-input"
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleImportClick}
                        disabled={isImporting}
                    >
                         {isImporting ? (
                            <> <Upload className="animate-pulse h-4 w-4 mr-2" /> Importing...</>
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

                    <AlertDialog onOpenChange={(open) => !open && setDeleteConfirmInput('')}>
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
                                    disabled={isDeleteDisabled}
                                    className={cn(buttonVariants({ variant: "destructive" }), "disabled:bg-destructive/50 disabled:cursor-not-allowed")}
                                 >
                                    Delete Data
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
        </Form>
    );
}

