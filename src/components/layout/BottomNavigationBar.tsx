
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, Users, PlusCircle, MessageSquare, User } from 'lucide-react'; // Removed Bell
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
// Badge and notification count logic removed as the item is gone.

const navItems = [
  { href: "/", label: "Home", icon: HomeIcon, authRequired: false },
  { href: "/communities", label: "Communities", icon: Users, authRequired: false },
  { href: "/posts/create", label: "Create", icon: PlusCircle, authRequired: true },
  { href: "/messages", label: "Messages", icon: MessageSquare, authRequired: true },
  // { href: "/notifications", label: "Alerts", icon: Bell, authRequired: true, showBadge: true }, // Removed
  { href: "/profile", label: "Profile", icon: User, authRequired: true },
];

export function BottomNavigationBar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Unread notification count logic removed as the item is gone.

  if (loading) { 
    return null;
  }

  const authPages = ['/login', '/signup', '/forgot-password', '/onboarding', '/onboarding/profile-setup'];
  const isChatDetailPage = pathname.startsWith('/messages/') && pathname.split('/').length > 2 && pathname.split('/')[2] !== 'new';

  if (authPages.includes(pathname) || isChatDetailPage) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-t-lg z-40">
      <div className="container mx-auto grid grid-cols-5 items-center h-16 px-0 sm:px-1"> {/* Grid for 5 items */}
        {navItems.map(item => {
          if (item.authRequired && !user) {
            return (
              <div key={item.label} className="flex flex-col items-center justify-center text-xs py-2 text-muted-foreground/50 cursor-not-allowed">
                 <item.icon className="h-5 w-5 sm:h-6 sm:w-6 mb-0.5" />
                <span className="text-[10px] sm:text-xs">{item.label}</span>
              </div>
            );
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
              {/* Badge logic removed */}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
