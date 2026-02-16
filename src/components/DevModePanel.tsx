import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';

interface LastReserveResponse {
  timestamp: number;
  body: unknown;
  status: number;
}

const lastReserveResponseGlobal: { current: LastReserveResponse | null } = { current: null };

export function setLastReserveResponse(status: number, body: unknown) {
  lastReserveResponseGlobal.current = {
    timestamp: Date.now(),
    body,
    status,
  };
}

export function getLastReserveResponse() {
  return lastReserveResponseGlobal.current;
}

export const DevModePanel: React.FC = () => {
  const { user } = useAuth();
  const { balance, pendingCount, isUnlimited, tier } = useCredits();
  const [lastResponse, setLastResponse] = useState<LastReserveResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    const interval = setInterval(() => {
      const resp = getLastReserveResponse();
      if (resp && resp.timestamp > lastUpdate) {
        setLastResponse(resp);
        setLastUpdate(resp.timestamp);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  if (!import.meta.env.DEV) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 bg-purple-600 text-white text-xs px-3 py-1.5 rounded shadow-lg hover:bg-purple-500"
        style={{ opacity: 0.7 }}
      >
        DEV
      </button>
      
      {isOpen && (
        <div className="fixed bottom-12 right-4 z-50 bg-neutral-900 border border-neutral-700 rounded-lg p-4 w-80 text-xs font-mono shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-purple-400 font-bold">DEV MODE</span>
            <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-white">✕</button>
          </div>
          
          <div className="space-y-2">
            <div className="border-b border-neutral-700 pb-2">
              <div className="text-neutral-400 mb-1">User</div>
              <div className="text-white break-all">{user?.email || 'Not logged in'}</div>
              <div className="text-neutral-500 break-all">{user?.id}</div>
            </div>
            
            <div className="border-b border-neutral-700 pb-2">
              <div className="text-neutral-400 mb-1">Credits</div>
              <div className="flex gap-4">
                <div>
                  <span className="text-neutral-500">Balance:</span>{' '}
                  <span className={isUnlimited ? 'text-green-400' : 'text-white'}>
                    {isUnlimited ? '∞' : balance}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Pending:</span>{' '}
                  <span className="text-yellow-400">{pendingCount}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Tier:</span>{' '}
                  <span className="text-blue-400">{tier}</span>
                </div>
              </div>
            </div>
            
            {lastResponse && (
              <div>
                <div className="text-neutral-400 mb-1">
                  Last reserve-credits ({new Date(lastResponse.timestamp).toLocaleTimeString()})
                </div>
                <div className={`mb-1 ${lastResponse.status >= 400 ? 'text-red-400' : 'text-green-400'}`}>
                  Status: {lastResponse.status}
                </div>
                <pre className="bg-neutral-800 p-2 rounded overflow-x-auto max-h-32 text-neutral-300">
                  {JSON.stringify(lastResponse.body, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
