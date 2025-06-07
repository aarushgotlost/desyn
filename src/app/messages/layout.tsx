
import type { ReactNode } from 'react';

export default function MessagesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-full"> {/* Ensure layout takes full height for chat page */}
      {children}
    </div>
  );
}
