'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, PlusCircle, BarChart3, Settings, BrainCircuit } from 'lucide-react'; // Added BrainCircuit
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/log', label: 'Log', icon: PlusCircle },
  { href: '/insights', label: 'Insights', icon: BarChart3 },
  { href: '/ai', label: 'AI', icon: BrainCircuit }, // Added AI item
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function TopNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border shadow-sm h-16">
      <div className="max-w-md mx-auto h-full flex items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname === '/' && item.href === '/calendar'); // Treat root as calendar
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center text-xs font-medium transition-colors h-full px-2',
                isActive
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
