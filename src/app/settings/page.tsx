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

export default function SettingsPage() {
    const { toast } = useToast();
    const { deleteAllData } = useCycleData(); // Get delete function from context
    const [deleteConfirmInput, setDeleteConfirmInput] = React.useState(''); // State for delete confirmation input

    // State for settings - TODO: load/save from a dedicated settings storage (e.g., localStorage)
    const [avgCycleLength, setAvgCycleLength] = React.useState<number>(28);
    const [avgPeriodLength, setAvgPeriodLength] = React.useState<number>(5);
    const [periodReminder, setPeriodReminder] = React.useState<boolean>(true);
    const [fertileReminder, setFertileReminder] = React.useState<boolean>(true);
    const [appLock, setAppLock] = React.useState<boolean>(false);
    const [theme, setTheme] = React.useState<string>('system'); // 'light', 'dark', 'system' - TODO: Implement theme switching
    const [accentColor, setAccentColor] = React.useState<string>('coral'); // 'coral', 'gold' - TODO: Implement accent color switching


    // TODO: Load settings from a settings storage (separate from cycle logs) on component mount
    // React.useEffect(() => { ... load settings ... }, []);

    // TODO: Save settings to a settings storage on change
    const handleSaveSettings = () => {
        console.log("Saving settings:", { avgCycleLength, avgPeriodLength, periodReminder, fertileReminder, appLock, theme, accentColor });
        // Save logic here (e.g., localStorage.setItem('appSettings', JSON.stringify({...})) )
        toast({ title: "Settings Saved", description: "Your preferences have been updated." });
    };

    const handleBackup = () => {
        // TODO: Implement backup logic (create encrypted JSON/CSV of localStorage data)
        console.log("Backup initiated");
        toast({ title: "Backup Not Implemented", description: "Data backup feature is coming soon.", variant: "destructive" });
    };

    const handleExport = () => {
        // TODO: Implement export logic (CSV/PDF via share sheet)
        console.log("Export initiated");
        toast({ title: "Export Not Implemented", description: "Data export feature is coming soon.", variant: "destructive" });
    };

    const handleDeleteAllDataConfirmed = () => {
        deleteAllData(); // Call context function to delete data from storage
        toast({ variant: "destructive", title: "Data Deleted", description: "All your cycle data has been permanently removed." });
        setDeleteConfirmInput(''); // Reset input
        // Potentially reset other app state or navigate away if needed
    };

    const isDeleteDisabled = deleteConfirmInput !== 'DELETE';


    return (
        <div className="container mx-auto py-6 px-4 max-w-md space-y-8">
            <h1 className="text-2xl font-semibold text-center">Settings</h1>

            {/* Cycle Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Cycle Settings (Informational)</CardTitle>
                    <CardDescription>These averages are now calculated automatically in Insights. Manual override coming soon.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 items-center">
                        <Label htmlFor="cycle-length">Average Cycle Length (days)</Label>
                        {/* Display calculated average or placeholder */}
                        <Input
                            id="cycle-length"
                            type="number"
                            value={avgCycleLength} // TODO: Replace with calculated value from context/insights
                            readOnly // Make read-only for now
                            className="w-full bg-muted cursor-not-allowed"
                        />
                    </div>
                     <div className="grid grid-cols-2 gap-4 items-center">
                        <Label htmlFor="period-length">Average Period Length (days)</Label>
                         <Input
                            id="period-length"
                            type="number"
                            value={avgPeriodLength} // TODO: Replace with calculated value
                            readOnly
                            className="w-full bg-muted cursor-not-allowed"
                        />
                    </div>
                    {/* TODO: Add option to exclude cycles */}
                </CardContent>
            </Card>

            {/* Reminders */}
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Bell className="mr-2 h-5 w-5"/>Reminders</CardTitle>
                    <CardDescription>Manage your notifications (feature coming soon).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    {/* TODO: Add more reminder options (Ovulation, Medication, etc.) */}
                    {/* TODO: Add time customization */}
                </CardContent>
            </Card>

             {/* Appearance */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Palette className="mr-2 h-5 w-5"/>Appearance</CardTitle>
                     <CardDescription>Customize the look and feel (feature coming soon).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 opacity-50 cursor-not-allowed">
                     <div>
                         <Label className="mb-2 block">Theme</Label>
                         <RadioGroup defaultValue={theme} onValueChange={setTheme} className="flex space-x-4" disabled>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="light" id="theme-light" disabled/>
                                <Label htmlFor="theme-light">Light</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="dark" id="theme-dark" disabled/>
                                <Label htmlFor="theme-dark">Dark</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="system" id="theme-system" disabled/>
                                <Label htmlFor="theme-system">System</Label>
                            </div>
                         </RadioGroup>
                     </div>
                      <div>
                         <Label className="mb-2 block">Accent Color</Label>
                         {/* Basic example - ideally use actual color swatches */}
                         <RadioGroup defaultValue={accentColor} onValueChange={setAccentColor} className="flex space-x-4" disabled>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="coral" id="accent-coral" disabled/>
                                <Label htmlFor="accent-coral" style={{color: 'hsl(var(--accent))'}}>Coral</Label> {/* Use theme color */}
                            </div>
                            {/* <div className="flex items-center space-x-2">
                                <RadioGroupItem value="gold" id="accent-gold" disabled/>
                                <Label htmlFor="accent-gold" style={{color: '#FFD700'}}>Gold</Label>
                            </div> */}
                             {/* Add more accent options later */}
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
                    {/* TODO: Add button to set/change PIN if appLock is enabled */}
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
                    {/* TODO: Link these buttons to actual pages or modals */}
                    <Button variant="link" className="p-0 h-auto justify-start" disabled>FAQ (Soon)</Button><br />
                    <Button variant="link" className="p-0 h-auto justify-start" disabled>Contact Support (Soon)</Button><br />
                    <Button variant="link" className="p-0 h-auto justify-start" disabled>Privacy Policy (Soon)</Button><br />
                    <p className="text-xs text-muted-foreground pt-2">App Version: 1.0.0</p>
                 </CardContent>
            </Card>

             {/* Remove Save All Settings button for now as settings aren't editable */}
             {/*
             <Button onClick={handleSaveSettings} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-8">
                 Save All Settings
            </Button>
             */}
        </div>
    );
}
