
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import AuthGuard from '@/components/layout/AuthGuard';
import Header from '@/components/layout/Header';
import { BottomNavigationBar } from '@/components/layout/BottomNavigationBar';
import { ConditionalFooter } from '@/components/layout/ConditionalFooter'; // Import ConditionalFooter

export const metadata: Metadata = {
  title: 'Desyn - Creative Collaboration Platform',
  description: 'Connect, share, and grow with fellow creators, developers, animators, and artists on Desyn.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AuthGuard>
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-grow container mx-auto px-4 py-8 pb-20 md:pb-8">
                 {children}
                </main>
                <BottomNavigationBar />
                <ConditionalFooter /> {/* Use ConditionalFooter here */}
              </div>
            </AuthGuard>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
