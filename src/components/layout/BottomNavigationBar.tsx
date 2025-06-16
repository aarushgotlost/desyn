
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, PlusCircle, MessageSquare, User as UserIcon, Compass, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from '@/lib/utils';

const navItems = [
  { href: "/", label: "Home", icon: HomeIcon, authRequired: false },
  { href: "/communities", label: "Discover", icon: Compass, authRequired: false },
  { href: "/meetings", label: "Meetings", icon: Video, authRequired: true },
  { href: "/posts/create", label: "Create", icon: PlusCircle, authRequired: true },
  { href: "/messages", label: "Messages", icon: MessageSquare, authRequired: true },
  { href: "/profile", label: "Profile", icon: UserIcon, authRequired: true, isProfile: true }, 
];

export function BottomNavigationBar() {
  const pathname = usePathname();
  const { user, userProfile, loading } = useAuth();

  if (loading) { 
    return null;
  }

  const authPages = ['/login', '/signup', '/forgot-password', '/onboarding', '/onboarding/profile-setup'];
  const isChatDetailPage = pathname.startsWith('/messages/') && pathname.split('/').length > 2 && pathname.split('/')[2] !== 'new';
  const isChatBotPage = pathname === '/chatbot';
  const isMeetingDetailPage = pathname.startsWith('/meetings/') && pathname.split('/').length > 2;


  if (authPages.includes(pathname) || isChatDetailPage || isChatBotPage || isMeetingDetailPage) { 
    return null;
  }

  const itemsToRender = navItems.filter(item => !(item.authRequired && !user));
  const numCols = itemsToRender.length;

  const gridColClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  }[numCols] || `grid-cols-${numCols}`; 


  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-t-lg z-40">
      <div className={cn(
        "container mx-auto grid items-center h-16 px-0 sm:px-1",
        gridColClass
      )}>
        {itemsToRender.map(item => { 
          const isActive = (item.href === "/" && pathname === item.href) || 
                           (item.href !== "/" && pathname.startsWith(item.href) && 
                            !(item.href === "/messages" && isChatDetailPage) &&
                            !(item.href === "/meetings" && isMeetingDetailPage)
                           );
          
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center text-xs py-2 transition-colors duration-150 relative", 
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.isProfile && user && userProfile ? (
                <Avatar className={cn("h-6 w-6 sm:h-7 sm:w-7 mb-0.5 border-2", isActive ? "border-primary" : "border-transparent")}>
                  <AvatarImage src={userProfile.photoURL || undefined} alt={userProfile.displayName || "User"} />
                  <AvatarFallback className="text-xs">{getInitials(userProfile.displayName)}</AvatarFallback>
                </Avatar>
              ) : (
                <item.icon className={cn("h-5 w-5 sm:h-6 sm:w-6 mb-0.5", isActive ? "text-primary" : "")} />
              )}
              <span className="text-[10px] sm:text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
