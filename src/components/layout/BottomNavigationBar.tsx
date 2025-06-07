
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, Users, PlusCircle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { href: "/", label: "Home", icon: HomeIcon, authRequired: false },
  { href: "/communities", label: "Communities", icon: Users, authRequired: false },
  { href: "/posts/create", label: "Create", icon: PlusCircle, authRequired: true },
  { href: "/messages", label: "Messages", icon: MessageSquare, authRequired: true },
];

export function BottomNavigationBar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading) { // Don't render anything if auth state is still loading
    return null;
  }

  // Do not render bottom nav on auth pages or onboarding
  if (['/login', '/signup', '/forgot-password', '/onboarding', '/onboarding/profile-setup'].includes(pathname)) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-t-lg z-40">
      <div className="container mx-auto flex justify-around items-center h-16 px-1">
        {navItems.map(item => {
          if (item.authRequired && !user) {
            return (
              <div key={item.label} className="flex flex-col items-center justify-center text-xs w-1/4 py-2 text-muted-foreground/50 cursor-not-allowed">
                 <item.icon className="h-6 w-6 mb-0.5" />
                <span>{item.label}</span>
              </div>
            );
          }
          const isActive = (item.href === "/" && pathname === item.href) || 
                           (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center text-xs w-1/4 py-2 transition-colors duration-150",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-6 w-6 mb-0.5", isActive ? "text-primary" : "")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
