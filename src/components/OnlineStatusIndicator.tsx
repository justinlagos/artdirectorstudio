import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { isOnline, setupOnlineStatusListener } from '@/lib/serviceWorker';
import { toast } from 'sonner';

export const OnlineStatusIndicator = () => {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const cleanup = setupOnlineStatusListener(
      () => {
        setOnline(true);
        toast.success('Back online! Your changes will sync automatically.', {
          duration: 3000,
        });
      },
      () => {
        setOnline(false);
        toast.warning('You are offline. Some features may be limited.', {
          duration: 5000,
        });
      }
    );

    return cleanup;
  }, []);

  if (online) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-slide-up">
      <div className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg shadow-lg">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">Offline Mode</span>
      </div>
    </div>
  );
};
