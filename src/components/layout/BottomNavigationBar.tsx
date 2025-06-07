
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, Users, PlusCircle, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { href: "/", label: "Home", icon: HomeIcon, authRequired: false },
  { href: "/communities", label: "Communities", icon: Users, authRequired: false },
  { href: "/posts/create", label: "Create", icon: PlusCircle, authRequired: true },
  { href: "/messages", label: "Messages", icon: MessageSquare, authRequired: true },
  { href: "/profile", label: "Profile", icon: User, authRequired: true },
];

export function BottomNavigationBar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading) { 
    return null;
  }

  const authPages = ['/login', '/signup', '/forgot-password', '/onboarding', '/onboarding/profile-setup'];
  const isChatDetailPage = pathname.startsWith('/messages/') && pathname.split('/').length > 2 && pathname.split('/')[2] !== 'new';

  if (authPages.includes(pathname) || isChatDetailPage) {
    return null;
  }

  const itemsToRender = navItems.filter(item => !(item.authRequired && !user));
  const numCols = itemsToRender.length;

  // Explicitly map number of columns to Tailwind classes
  const gridColClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3', // Should not happen with current navItems logic
    4: 'grid-cols-4', // Should not happen
    5: 'grid-cols-5',
  }[numCols] || 'grid-cols-5'; // Fallback, though numCols should be 2 or 5

  // If after login, numCols is not 5, or if logged out numCols is not 2,
  // there's an issue with `user` state or `navItems` definition / `authRequired` logic.
  // But this explicit class mapping ensures Tailwind generates the necessary CSS.

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-t-lg z-40">
      <div className={cn(
        "container mx-auto grid items-center h-16 px-0 sm:px-1",
        gridColClass // Use the explicitly determined grid class
      )}>
        {navItems.map(item => {
          // Filter out items that shouldn't be rendered based on auth state
          if (item.authRequired && !user) {
            return null; 
          }

          const isActive = (item.href === "/" && pathname === item.href) || 
                           (item.href !== "/" && pathname.startsWith(item.href) && !(item.href === "/messages" && isChatDetailPage));
          
          return (
            <Link
              key={item.label} // Labels are unique
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center text-xs py-2 transition-colors duration-150 relative", 
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 sm:h-6 sm:w-6 mb-0.5", isActive ? "text-primary" : "")} />
              <span className="text-[10px] sm:text-xs">{item.label}</span>
            </Link>
          );
        }).filter(Boolean)} {/* Filter out any nulls if items were skipped */}
      </div>
    </nav>
  );
}
