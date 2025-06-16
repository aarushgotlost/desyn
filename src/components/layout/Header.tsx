
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings, PlusCircle, HomeIcon, Bell, MessageSquare, Bot, Compass, Video } from 'lucide-react'; // Added Video
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NotificationIcon } from '@/components/notifications/NotificationIcon'; 
import { getInitials } from '@/lib/utils';

export default function Header() {
  const { user, userProfile, logout, loading } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Home", icon: HomeIcon, authRequired: false },
    { href: "/communities", label: "Discover", icon: Compass, authRequired: false },
    { href: "/meetings", label: "Meetings", icon: Video, authRequired: true }, // Added Meetings link
    { href: "/posts/create", label: "Create Post", icon: PlusCircle, authRequired: true },
    { href: "/messages", label: "Messages", icon: MessageSquare, authRequired: true },
  ];

  const authRestrictedPages = ['/login', '/signup', '/forgot-password', '/onboarding', '/onboarding/profile-setup'];
  
  // Hide header on active Jitsi meeting page
  if (pathname.startsWith('/meetings/') && pathname.split('/').length > 2) {
    return null;
  }


  if (authRestrictedPages.includes(pathname)) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Desyn App Logo" width={30} height={30} data-ai-hint="application logo D C small" />
          <span className="font-bold text-xl font-headline">Desyn</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navLinks.map(link => {
            if (link.authRequired && !user) return null;
            const isActive = (link.href === "/" && pathname === link.href) || 
                             (link.href !== "/" && pathname.startsWith(link.href) && 
                              !(link.href === "/messages" && pathname.includes("/messages/")) &&
                              !(link.href === "/meetings" && pathname.includes("/meetings/")) 
                             );

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-primary flex items-center",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <link.icon className="inline-block w-4 h-4 mr-1.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center space-x-1 md:space-x-3">
          {loading ? (
            <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
          ) : user ? (
            <>
              <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full" aria-label="Open DevBot">
                <Link href="/chatbot">
                  <Bot className="h-5 w-5" />
                </Link>
              </Button>
              <NotificationIcon /> 
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full" aria-label="User menu">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userProfile?.photoURL || user.photoURL || undefined} alt={userProfile?.displayName || user.displayName || "User avatar"} />
                        <AvatarFallback>{getInitials(userProfile?.displayName || user.displayName)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userProfile?.displayName || user.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile"><User className="mr-2 h-4 w-4" /> Profile</Link>
                    </DropdownMenuItem>
                     <DropdownMenuItem asChild>
                       <Link href="/notifications"><Bell className="mr-2 h-4 w-4" /> Notifications</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="md:hidden">
                <Button variant="ghost" size="icon" asChild aria-label="Open settings" className="h-8 w-8 rounded-full">
                  <Link href="/settings">
                    <Settings className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="hidden md:flex space-x-2">
              <Button asChild variant="ghost">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
