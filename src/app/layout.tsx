
'use client'; // Make RootLayout a client component

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
type Theme = 'light' | 'dark';
type AccentColor = 'coral' | 'gold';

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
    const currentTheme = (storedTheme === 'dark') ? 'dark' : 'light';
    root.classList.add(currentTheme);
    if (storedTheme !== 'light' && storedTheme !== 'dark') {
      localStorage.setItem('theme', 'light');
    }

    // Apply Accent Color - Default to 'coral' if invalid or not set
    const currentAccent = (storedAccent === 'gold') ? 'gold' : 'coral';
    root.setAttribute('data-accent', currentAccent);
    if (storedAccent !== 'coral' && storedAccent !== 'gold') {
       localStorage.setItem('accentColor', 'coral');
    }
  }, []);


  return (
    <html lang="en" suppressHydrationWarning>
      <Head>
        <title>LunaBloom</title>
        <meta name="description" content="📱 Luna Bloom – Creative Inspiration for the Modern Woman" />
        <link rel="manifest" href="/manifest.json" /> {/* Local manifest */}
        <meta name="theme-color" content="#FFFFFF"/>
        {/* iOS PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LunaBloom" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

      </Head>
      <body className={cn(
          inter.variable,
          "font-sans antialiased flex flex-col min-h-screen bg-background"
        )}
      >
        <CycleDataProvider>
            {isCheckingPin ? (
                 <div className="flex items-center justify-center min-h-screen">Loading security state...</div>
            ) : isLocked ? (
                 <PinLockOverlay onUnlock={handleUnlock} />
            ) : (
                 <>
                    <TopNavBar />
                    <main className="flex-grow pt-16">
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
