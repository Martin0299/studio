
// src/app/settings/page.tsx
'use client';

import * as React from 'react';
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Palette, Lock, Download, Trash2, Upload, Settings as SettingsIcon, Info as InfoIcon } from 'lucide-react';
import { useCycleData, type LogData } from '@/context/CycleDataContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import PinSetupDialog from '@/components/settings/PinSetupDialog';
import { setPinStatus, getPinStatus, clearPinStatus, savePin, verifyPin, clearPin } from '@/lib/security';

// Define theme type
type Theme = 'light' | 'dark';
type AccentColor = 'coral' | 'gold';

// Define helper components for Form structure (minimal versions)
const Form = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const FormItem = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>;
const FormControl = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const FormLabel = ({ children, htmlFor, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { htmlFor?: string }) => <label htmlFor={htmlFor} {...props}>{children}</label>;
const FormDescription = ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => <p className="text-[0.8rem] text-muted-foreground" {...props}>{children}</p>;


export default function SettingsPage() {
    const { toast } = useToast();
    const { deleteAllData, logData, refreshData } = useCycleData();
    const [deleteConfirmInput, setDeleteConfirmInput] = React.useState('');
    const [isImporting, setIsImporting] = React.useState(false);

    // -- Appearance State --
    const [theme, setTheme] = React.useState<Theme>('light');
    const [accentColor, setAccentColor] = React.useState<AccentColor>('coral');

    // -- Security State --
    const [appLock, setAppLock] = React.useState<boolean>(false);
    const [pinIsSet, setPinIsSet] = React.useState<boolean>(false);
    const [showPinDialog, setShowPinDialog] = React.useState<boolean>(false);

    // App Version
    const [appVersion, setAppVersion] = React.useState<string>('');

    // Valid keys for settings import (excluding cycleLog_ which is handled by prefix)
    const validImportKeys = [
        'theme', 'accentColor', 'appLock', 'appPinStatus', 'appPinHash', 'healthTipsCache',
        'babyPlanningChecklist', 'babyPlanningLifestyleInputs',
        'babyPlanningLifestylePlan', 'babyPlanningMealPlanInputs', 'babyPlanningMealPlan'
    ];


    // --- Effects for Appearance, Security, and App Version ---
    React.useEffect(() => {
        const root = window.document.documentElement;
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        const storedAccent = localStorage.getItem('accentColor') as AccentColor | null;
        const storedAppLock = localStorage.getItem('appLock');

        if (storedTheme && ['light', 'dark'].includes(storedTheme)) {
            setTheme(storedTheme);
            root.classList.remove('light', 'dark');
            root.classList.add(storedTheme);
        } else {
            setTheme('light'); // Default to light
            localStorage.setItem('theme', 'light');
            root.classList.add('light');
        }

        if (storedAccent && ['coral', 'gold'].includes(storedAccent)) {
            setAccentColor(storedAccent);
            root.setAttribute('data-accent', storedAccent);
        } else {
            setAccentColor('coral'); // Default to coral
            localStorage.setItem('accentColor', 'coral');
            root.setAttribute('data-accent', 'coral');
        }

        const lockEnabled = storedAppLock ? JSON.parse(storedAppLock) : false;
        setAppLock(lockEnabled);
        const currentPinStatus = getPinStatus();
        setPinIsSet(currentPinStatus);

        if (!lockEnabled && currentPinStatus) {
            clearPin(); // Clears hash and status
            setPinIsSet(false);
        }

        // Load app version from environment variable (set at build time)
        setAppVersion(process.env.NEXT_PUBLIC_APP_VERSION || 'N/A');
    }, []);

    const handleThemeChange = (newTheme: string) => {
        const validTheme = newTheme as Theme;
        setTheme(validTheme);
        localStorage.setItem('theme', validTheme);
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(validTheme);
        toast({ title: "Theme Updated", description: "Theme set to " + validTheme + "." });
    };

    const handleAccentChange = (newAccent: string) => {
        const validAccent = newAccent as AccentColor;
        setAccentColor(validAccent);
        localStorage.setItem('accentColor', validAccent);
        const root = window.document.documentElement;
        root.setAttribute('data-accent', validAccent);
        toast({ title: "Accent Color Updated", description: "Accent set to " + validAccent + "." });
    };

    const handleAppLockChange = (checked: boolean) => {
        setAppLock(checked);
        localStorage.setItem('appLock', JSON.stringify(checked));
        toast({
            title: "Security Setting Updated",
            description: "App Lock " + (checked ? 'enabled' : 'disabled') + ".",
            variant: "default"
        });
        if (checked) {
            if (!pinIsSet) {
                setShowPinDialog(true);
            }
        } else {
            clearPin(); // Clears hash and status
            setPinIsSet(false);
        }
    };

    const handleOpenPinDialog = () => {
        setShowPinDialog(true);
    };

    const handlePinSet = (success: boolean) => {
        setShowPinDialog(false);
        if (success) {
            setPinStatus(true);
            setPinIsSet(true);
            if (!appLock) {
                setAppLock(true);
                localStorage.setItem('appLock', JSON.stringify(true));
                 toast({
                    title: "App Lock Enabled",
                    description: "App Lock automatically enabled after PIN setup.",
                 });
            }
        } else {
            if (appLock && !getPinStatus()) {
                setAppLock(false);
                localStorage.setItem('appLock', JSON.stringify(false));
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
        try {
            const backupData: Record<string, any> = {};
            const keysToBackup = [...validImportKeys];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('cycleLog_') || keysToBackup.includes(key))) {
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
            downloadFile("lunabloom_backup_" + timestamp + ".json", jsonString, 'application/json');
            toast({ title: "Backup Successful", description: "Your data backup has been downloaded." });
        } catch (error) {
            console.error("Backup failed:", error);
            toast({ title: "Backup Failed", description: "An error occurred during backup.", variant: "destructive" });
        }
    };

    const handleExport = () => {
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
                    '"' + (log.symptoms ?? []).join('; ') + '"',
                    log.mood ?? '',
                    log.sexualActivityCount ?? 0,
                    log.protectionUsed !== undefined ? (log.protectionUsed ? 'true' : 'false') : '',
                    log.orgasm !== undefined ? (log.orgasm ? 'true' : 'false') : '',
                    log.tookPill !== undefined ? (log.tookPill ? 'true' : 'false') : '',
                    '"' + (log.notes ?? '').replace(/"/g, '""') + '"',
                ].join(','))
            ];
            const csvString = csvRows.join('\n');
            const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
            downloadFile("lunabloom_export_" + timestamp + ".csv", csvString, 'text/csv');
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
                         if (key.startsWith('cycleLog_') || validImportKeys.includes(key)) {
                            if (key.startsWith('cycleLog_')) {
                                const entryValue = importedData[key];
                                if (typeof entryValue === 'string') {
                                    try {
                                        const parsedEntry = JSON.parse(entryValue);
                                        if (parsedEntry && typeof parsedEntry === 'object' && parsedEntry.date) {
                                            localStorage.setItem(key, entryValue);
                                            importedCount++;
                                        } else {
                                            console.warn('Skipping invalid cycle log entry for key ' + key);
                                        }
                                    } catch {
                                        console.warn('Skipping non-JSON cycle log entry for key ' + key);
                                    }
                                } else {
                                     if (entryValue && typeof entryValue === 'object' && entryValue.date) {
                                        localStorage.setItem(key, JSON.stringify(entryValue));
                                        importedCount++;
                                     } else {
                                        console.warn('Skipping invalid cycle log entry format for key ' + key);
                                     }
                                }
                            } else {
                                const value = importedData[key];
                                if (typeof value === 'string') {
                                     localStorage.setItem(key, value);
                                     settingsImportedCount++;
                                } else {
                                     console.warn('Skipping setting for key ' + key + ' due to invalid value type (expected string): ' + (typeof value));
                                }
                            }
                        } else {
                            console.warn('Skipping unrecognized key during import: ' + key);
                        }
                    }
                }

                toast({
                    title: "Import Successful",
                    description: "Imported " + importedCount + " log entries and " + settingsImportedCount + " settings. Please refresh the app if changes aren't reflected immediately.",
                });

                refreshData();
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
                if (event.target) {
                    event.target.value = '';
                }
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
            if (event.target) {
                event.target.value = '';
            }
        };

        reader.readAsText(file);
    };

    const handleDeleteAllDataConfirmed = () => {
        deleteAllData();
        toast({ variant: "destructive", title: "Data Deleted", description: "All your cycle data has been permanently removed." });
        setDeleteConfirmInput('');
        clearPin();
        setPinIsSet(false);
        setAppLock(false);
        localStorage.removeItem('appLock');
        localStorage.removeItem('theme');
        localStorage.removeItem('accentColor');
        localStorage.removeItem('healthTipsCache');
        localStorage.removeItem('babyPlanningChecklist');
        localStorage.removeItem('babyPlanningLifestyleInputs');
        localStorage.removeItem('babyPlanningLifestylePlan');
        localStorage.removeItem('babyPlanningMealPlanInputs');
        localStorage.removeItem('babyPlanningMealPlan');
        window.location.reload();
    };

    const isDeleteDisabled = deleteConfirmInput !== 'DELETE';

    return (
        <Form>
            <div className="container mx-auto py-6 px-4 max-w-md space-y-8">
                <h1 className="text-2xl font-semibold text-center flex items-center justify-center">
                    <SettingsIcon className="mr-2 h-6 w-6 text-accent" /> Settings
                </h1>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center"><Palette className="mr-2 h-5 w-5 text-accent" />Appearance</CardTitle>
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
                        <CardTitle className="text-lg flex items-center"><Lock className="mr-2 h-5 w-5 text-accent" />Security</CardTitle>
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
                            disabled={!appLock && !pinIsSet}
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
                        <CardTitle className="text-lg flex items-center"><Download className="mr-2 h-5 w-5 text-accent" />Local Data Management</CardTitle>
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
                                    <Trash2 className="h-4 w-4" /> Delete All App Data
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete ALL your app data (logs, settings, PIN) stored in this browser. Type <strong className="text-destructive">DELETE</strong> below to confirm.
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
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center"><InfoIcon className="mr-2 h-5 w-5 text-accent" />About</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">LunaBloom App Version: {appVersion}</p>
                    </CardContent>
                </Card>
            </div>
        </Form>
    );
}

