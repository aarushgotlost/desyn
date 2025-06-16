
"use client";
import { usePathname } from 'next/navigation';

export function ConditionalFooter() {
  const pathname = usePathname();

  const hiddenFooterPaths = [
    '/login',
    '/signup',
    '/forgot-password',
    '/onboarding', 
  ];

  const isChatDetailPage = pathname.startsWith('/messages/') && pathname.split('/').length > 2 && pathname.split('/')[2] !== 'new';
  const isMeetingDetailPage = pathname.startsWith('/meetings/') && pathname.split('/').length > 2;

  if (hiddenFooterPaths.includes(pathname) || isChatDetailPage || isMeetingDetailPage) {
    return null;
  }

  return (
    <footer className="py-6 text-center text-sm text-muted-foreground md:mb-0 mb-16">
      © {new Date().getFullYear()} Desyn. All rights reserved.
    </footer>
  );
}
