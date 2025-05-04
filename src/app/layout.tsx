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

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans', // Use CSS variable for font
});

// Define theme and accent types
type Theme = 'light' | 'dark' | 'system';
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

  // Effect to set initial theme and accent from localStorage or system preference
  React.useEffect(() => {
    const root = window.document.documentElement;
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const storedAccent = localStorage.getItem('accentColor') as AccentColor | null;

    // Apply Theme
    root.classList.remove('light', 'dark');
    let currentTheme: 'light' | 'dark';
    if (storedTheme && storedTheme !== 'system') {
      currentTheme = storedTheme;
    } else {
      currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    root.classList.add(currentTheme);

    // Apply Accent Color
    const currentAccent = (storedAccent && ['coral', 'gold'].includes(storedAccent)) ? storedAccent : 'coral';
    root.setAttribute('data-accent', currentAccent);

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
            <TopNavBar />
            <main className="flex-grow pt-16"> {/* Add padding-top to account for fixed nav bar */}
            {children}
            </main>
            <Toaster />
        </CycleDataProvider>
      </body>
    </html>
  );
}