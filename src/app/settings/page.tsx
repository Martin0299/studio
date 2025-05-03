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

export default function SettingsPage() {
    const { toast } = useToast();
    // State for settings - load defaults from local storage in useEffect
    const [avgCycleLength, setAvgCycleLength] = React.useState<number>(28);
    const [avgPeriodLength, setAvgPeriodLength] = React.useState<number>(5);
    const [periodReminder, setPeriodReminder] = React.useState<boolean>(true);
    const [fertileReminder, setFertileReminder] = React.useState<boolean>(true);
    const [appLock, setAppLock] = React.useState<boolean>(false);
    const [theme, setTheme] = React.useState<string>('system'); // 'light', 'dark', 'system'
    const [accentColor, setAccentColor] = React.useState<string>('coral'); // 'coral', 'gold'


    // TODO: Load settings from local storage on component mount
    // React.useEffect(() => { ... load settings ... }, []);

    // TODO: Save settings to local storage on change
    const handleSaveSettings = () => {
        console.log("Saving settings:", { avgCycleLength, avgPeriodLength, periodReminder, fertileReminder, appLock, theme, accentColor });
        // Save logic here
        toast({ title: "Settings Saved", description: "Your preferences have been updated." });
    };

    const handleBackup = () => {
        // TODO: Implement backup logic (create encrypted file, use share sheet)
        console.log("Backup initiated");
        toast({ title: "Backup Started", description: "Preparing your data for backup..." });
    };

    const handleExport = () => {
        // TODO: Implement export logic (CSV/PDF via share sheet)
        console.log("Export initiated");
        toast({ title: "Export Started", description: "Preparing your data for export..." });
    };

    const handleDeleteAllData = () => {
        // TODO: Implement delete logic after confirmation
        console.log("Deleting all data");
        toast({ variant: "destructive", title: "Data Deleted", description: "All your data has been permanently removed." });
        // Potentially reset app state or navigate away
    };


    return (
        <div className="container mx-auto py-6 px-4 max-w-md space-y-8">
            <h1 className="text-2xl font-semibold text-center">Settings</h1>

            {/* Cycle Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Cycle Settings</CardTitle>
                    <CardDescription>Adjust your average cycle details for more accurate predictions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 items-center">
                        <Label htmlFor="cycle-length">Average Cycle Length (days)</Label>
                        <Input
                            id="cycle-length"
                            type="number"
                            value={avgCycleLength}
                            onChange={(e) => setAvgCycleLength(parseInt(e.target.value) || 0)}
                            min="10" // Example validation
                            max="100"
                            className="w-full"
                        />
                    </div>
                     <div className="grid grid-cols-2 gap-4 items-center">
                        <Label htmlFor="period-length">Average Period Length (days)</Label>
                        <Input
                            id="period-length"
                            type="number"
                            value={avgPeriodLength}
                            onChange={(e) => setAvgPeriodLength(parseInt(e.target.value) || 0)}
                             min="1"
                             max="20"
                            className="w-full"
                        />
                    </div>
                    {/* TODO: Add option to exclude cycles */}
                </CardContent>
            </Card>

            {/* Reminders */}
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Bell className="mr-2 h-5 w-5"/>Reminders</CardTitle>
                    <CardDescription>Manage your notifications.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="period-reminder" className="flex-1">Period Start Prediction</Label>
                        <Switch
                            id="period-reminder"
                            checked={periodReminder}
                            onCheckedChange={setPeriodReminder}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="fertile-reminder" className="flex-1">Fertile Window Start</Label>
                         <Switch
                            id="fertile-reminder"
                            checked={fertileReminder}
                            onCheckedChange={setFertileReminder}
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
                     <CardDescription>Customize the look and feel of the app.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div>
                         <Label className="mb-2 block">Theme</Label>
                         <RadioGroup defaultValue={theme} onValueChange={setTheme} className="flex space-x-4">
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
                         {/* Basic example - ideally use actual color swatches */}
                         <RadioGroup defaultValue={accentColor} onValueChange={setAccentColor} className="flex space-x-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="coral" id="accent-coral" />
                                <Label htmlFor="accent-coral" style={{color: '#FF7F50'}}>Coral</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="gold" id="accent-gold" />
                                <Label htmlFor="accent-gold" style={{color: '#FFD700'}}>Gold</Label>
                            </div>
                         </RadioGroup>
                    </div>
                </CardContent>
            </Card>

             {/* Security */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Lock className="mr-2 h-5 w-5"/>Security</CardTitle>
                    <CardDescription>Protect access to your app.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center justify-between">
                        <Label htmlFor="app-lock" className="flex-1">Enable App Lock (PIN/Biometrics)</Label>
                        <Switch
                            id="app-lock"
                            checked={appLock}
                            onCheckedChange={setAppLock}
                        />
                    </div>
                    {/* TODO: Add button to set/change PIN if appLock is enabled */}
                     {appLock && <Button variant="outline" className="w-full">Set/Change PIN</Button>}
                </CardContent>
            </Card>


            {/* Data Management */}
            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">Local Data Management</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground !mt-1">
                        Your health data is stored only on this device. Backups are user-managed and encrypted.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleBackup}>
                        <FileDown className="h-4 w-4" /> Backup Data
                    </Button>
                     <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleExport}>
                        <FileDown className="h-4 w-4" /> Export Data (CSV/PDF)
                    </Button>

                    <Separator />

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" className="w-full flex items-center justify-center gap-2">
                                <Trash2 className="h-4 w-4" /> Delete All Data
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete all your cycle tracking data from this device. Type "DELETE" below to confirm.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            {/* TODO: Add input for confirmation */}
                             <Input id="delete-confirm" placeholder='Type "DELETE" to confirm' className="mt-2"/>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                {/* TODO: Disable Action until input matches "DELETE" */}
                                <AlertDialogAction
                                    onClick={handleDeleteAllData}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    // disabled={/* check input value */}
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
                    <Button variant="link" className="p-0 h-auto justify-start">FAQ</Button><br />
                    <Button variant="link" className="p-0 h-auto justify-start">Contact Support</Button><br />
                    <Button variant="link" className="p-0 h-auto justify-start">Privacy Policy</Button><br />
                    <p className="text-xs text-muted-foreground pt-2">App Version: 1.0.0</p>
                 </CardContent>
            </Card>

             <Button onClick={handleSaveSettings} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-8">
                 Save All Settings
            </Button>
        </div>
    );
}
