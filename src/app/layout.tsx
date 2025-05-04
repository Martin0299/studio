
'use client'; // Make RootLayout a client component

import type {Metadata} from 'next';
import Head from 'next/head'; // Import Head for metadata in client components
import * as React from 'react'; // Import React for useEffect
import { Inter } from 'next/font/google'; // Using Inter for a clean, readable sans-serif font
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import TopNavBar from '@/components/navigation/top-nav-bar';
import { CycleDataProvider } from '@/context/CycleDataContext'; // Import the provider
import { cn } from '@/lib/utils'; // Import cn
import PinLockOverlay from '@/components/security/PinLockOverlay'; // Import the overlay
import { getPinStatus } from '@/lib/security'; // Import PIN status check

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans', // Use CSS variable for font
});

// Define theme and accent types
type Theme = 'light' | 'dark'; // Removed 'system'
type AccentColor = 'coral' | 'gold';

// Metadata export is not allowed in Client Components.
// export const metadata: Metadata = {
//   title: 'LunaBloom', // Updated app name
//   description: 'Track your cycle, embrace your health.', // Updated description
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const [isLocked, setIsLocked] = React.useState<boolean>(true); // Initially assume locked if enabled
  const [isCheckingPin, setIsCheckingPin] = React.useState<boolean>(true); // Track initial check

   // Check PIN status on initial mount
   React.useEffect(() => {
       const lockEnabled = localStorage.getItem('appLock') === 'true';
       const pinIsSet = getPinStatus(); // Check if PIN exists and is marked as set

       if (lockEnabled && pinIsSet) {
           setIsLocked(true); // Keep it locked if enabled and PIN is set
       } else {
           setIsLocked(false); // Unlock if lock is disabled or no PIN is set
       }
       setIsCheckingPin(false); // Finished initial check
   }, []);

   // Handle unlocking the app
   const handleUnlock = () => {
       setIsLocked(false);
   };


  // Effect to set initial theme and accent from localStorage
  React.useEffect(() => {
    const root = window.document.documentElement;
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const storedAccent = localStorage.getItem('accentColor') as AccentColor | null;

    // Apply Theme - Default to 'light' if invalid or not set
    root.classList.remove('light', 'dark');
    // Use stored value, default to 'light' if it's not 'dark'
    const currentTheme = (storedTheme === 'dark') ? 'dark' : 'light';
    root.classList.add(currentTheme);
    // Ensure localStorage has a valid default if it was missing/invalid
    if (storedTheme !== 'light' && storedTheme !== 'dark') {
      localStorage.setItem('theme', 'light');
    }

    // Apply Accent Color - Default to 'coral' if invalid or not set
    // Use stored value, default to 'coral' if it's not 'gold'
    const currentAccent = (storedAccent === 'gold') ? 'gold' : 'coral';
    root.setAttribute('data-accent', currentAccent);
     // Ensure localStorage has a valid default if it was missing/invalid
    if (storedAccent !== 'coral' && storedAccent !== 'gold') {
       localStorage.setItem('accentColor', 'coral');
    }


  }, []); // Run only once on mount


  return (
    // Add suppressHydrationWarning to html tag to avoid warning from theme/accent application
    <html lang="en" suppressHydrationWarning>
       {/* Metadata needs to be handled differently in client root layouts, typically in Head */}
      <Head>
        <title>LunaBloom</title>
        <meta name="description" content="Track your cycle, embrace your health." />
        {/* Add other necessary meta tags or link tags here */}
      </Head>
      <body className={cn(
          inter.variable,
          "font-sans antialiased flex flex-col min-h-screen bg-background"
        )}
      >
         {/* Wrap the main content area and navbar with the provider */}
        <CycleDataProvider>
            {/* Conditional Rendering based on lock state */}
            {isCheckingPin ? (
                 <div className="flex items-center justify-center min-h-screen">Loading security state...</div> // Or a proper loader
            ) : isLocked ? (
                 <PinLockOverlay onUnlock={handleUnlock} />
            ) : (
                 <>
                    <TopNavBar />
                    <main className="flex-grow pt-16"> {/* Add padding-top to account for fixed nav bar */}
                        {children}
                    </main>
                    <Toaster />
                </>
            )}
        </CycleDataProvider>
      </body>
    </html>
  );
}

