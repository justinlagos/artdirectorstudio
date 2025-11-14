import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useModalStore } from '@/store/modalStore';
import { toast } from 'sonner';

export const GlobalKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const openGenerateModal = useModalStore((state) => state.openGenerateModal);

  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'g',
        description: 'Open Generate Studio',
        category: 'Tools',
        callback: () => {
          openGenerateModal();
          toast.info('Studio opened - Press Escape to close');
        },
      },
      {
        key: 'a',
        description: 'Go to Analyze',
        category: 'Navigation',
        callback: () => {
          if (location.pathname !== '/dashboard') {
            navigate('/dashboard');
            toast.info('Opening Analysis tool');
          }
        },
      },
      {
        key: 'b',
        description: 'Go to Blend',
        category: 'Tools',
        callback: () => {
          if (location.pathname !== '/dashboard') {
            navigate('/dashboard');
          }
          toast.info('Blend tool - Use Tools menu in dashboard');
        },
      },
      {
        key: 'h',
        description: 'Go to History',
        category: 'Navigation',
        callback: () => {
          navigate('/history');
        },
      },
    ],
    enabled: true,
  });

  return null;
};
