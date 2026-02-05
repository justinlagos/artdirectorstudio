import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts';
import { KeyboardShortcutsOverlay } from './KeyboardShortcutsOverlay';

/**
 * Provider component that initializes global keyboard shortcuts
 * and manages the shortcuts overlay
 */
export function KeyboardShortcutsProvider() {
  const { showShortcutsOverlay, setShowShortcutsOverlay } = useGlobalKeyboardShortcuts();

  return (
    <KeyboardShortcutsOverlay
      open={showShortcutsOverlay}
      onOpenChange={setShowShortcutsOverlay}
    />
  );
}
