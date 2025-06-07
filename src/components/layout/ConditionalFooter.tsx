
"use client";
import { usePathname } from 'next/navigation';

export function ConditionalFooter() {
  const pathname = usePathname();

  // Paths where the footer should be hidden
  const hiddenFooterPaths = [
    '/login',
    '/signup',
    '/forgot-password',
    '/onboarding', // Main onboarding slides
    // '/onboarding/profile-setup', // Footer can be shown here or not, depending on preference
  ];

  // Hide if it's a specific chat detail page (e.g., /messages/xxxx), but not on /messages or /messages/new
  const isChatDetailPage = pathname.startsWith('/messages/') && pathname.split('/').length > 2 && pathname.split('/')[2] !== 'new';

  if (hiddenFooterPaths.includes(pathname) || isChatDetailPage) {
    return null;
  }

  return (
    <footer className="py-6 text-center text-sm text-muted-foreground md:mb-0 mb-16">
      © {new Date().getFullYear()} Desyn. All rights reserved.
    </footer>
  );
}
