'use client'; // Make RootLayout a client component

import type {Metadata} from 'next';
import Head from 'next/head'; // Import Head for metadata in client components
import { Inter } from 'next/font/google'; // Using Inter for a clean, readable sans-serif font
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import TopNavBar from '@/components/navigation/top-nav-bar';
import { CycleDataProvider } from '@/context/CycleDataContext'; // Import the provider

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans', // Use CSS variable for font
});

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
  return (
    <html lang="en">
       {/* Metadata needs to be handled differently in client root layouts, typically in Head */}
      <Head>
        <title>LunaBloom</title>
        <meta name="description" content="Track your cycle, embrace your health." />
        {/* Add other necessary meta tags or link tags here */}
      </Head>
      <body className={`${inter.variable} font-sans antialiased flex flex-col min-h-screen bg-background`}>
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
