
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

  // Filter out authRequired items if user is not logged in for the purpose of grid calculation
  const visibleNavItems = navItems.filter(item => !(item.authRequired && !user));


  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-t-lg z-40">
      <div className={cn(
        "container mx-auto grid items-center h-16 px-0 sm:px-1",
        `grid-cols-${visibleNavItems.length}` // Dynamically set grid columns
      )}>
        {navItems.map(item => {
          if (item.authRequired && !user) {
            // Render a disabled-like placeholder if auth is required but user not logged in
            // This ensures the grid column count reflects potentially visible items for layout,
            // but this specific item won't be interactive. Or, filter them out before mapping.
            // For simplicity, we'll filter them from the count and not render them if auth fails.
            return null; 
          }
          const isActive = (item.href === "/" && pathname === item.href) || 
                           (item.href !== "/" && pathname.startsWith(item.href) && !(item.href === "/messages" && isChatDetailPage));
          return (
            <Link
              key={item.label}
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
        }).filter(Boolean)} {/* Filter out nulls if any items were skipped */}
      </div>
    </nav>
  );
}
