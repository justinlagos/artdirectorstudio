import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ToolType = 'blend' | 'upscale' | 'batch';
export type ToolState = 'idle' | 'loading' | 'success' | 'error';

interface ToolInputs {
  blend?: {
    image1?: File;
    image2?: File;
    ratio?: number;
    mode?: string;
  };
  upscale?: {
    image?: File;
    scaleFactor?: string;
    quality?: string;
  };
  batch?: {
    images?: FileList;
    operation?: string;
    prompt?: string;
  };
}

interface ToolsModalContextType {
  isOpen: boolean;
  activeTool: ToolType | null;
  toolState: ToolState;
  errorMessage: string | null;
  inputs: ToolInputs;
  scrollPosition: number;
  openTool: (tool: ToolType, preloadData?: any) => void;
  closeTool: () => void;
  setToolState: (state: ToolState) => void;
  setErrorMessage: (message: string | null) => void;
  updateInputs: (tool: ToolType, data: any) => void;
  clearInputs: (tool: ToolType) => void;
}

const ToolsModalContext = createContext<ToolsModalContextType | undefined>(undefined);

export const ToolsModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [toolState, setToolState] = useState<ToolState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inputs, setInputs] = useState<ToolInputs>({});
  const [scrollPosition, setScrollPosition] = useState(0);

  const openTool = (tool: ToolType, preloadData?: any) => {
    setScrollPosition(window.scrollY);
    setActiveTool(tool);
    setIsOpen(true);
    setToolState('idle');
    setErrorMessage(null);
    
    // Preload data if provided (e.g., from active Studio image)
    if (preloadData) {
      setInputs(prev => ({
        ...prev,
        [tool]: { ...prev[tool], ...preloadData }
      }));
    }
  };

  const closeTool = () => {
    setIsOpen(false);
    // Restore scroll position
    setTimeout(() => {
      window.scrollTo({ top: scrollPosition, behavior: 'auto' });
    }, 100);
    
    // Reset state after animation
    setTimeout(() => {
      if (toolState === 'success') {
        // Clear inputs on success
        if (activeTool) {
          setInputs(prev => ({ ...prev, [activeTool]: {} }));
        }
      }
      setActiveTool(null);
      setToolState('idle');
      setErrorMessage(null);
    }, 300);
  };

  const updateInputs = (tool: ToolType, data: any) => {
    setInputs(prev => ({
      ...prev,
      [tool]: { ...prev[tool], ...data }
    }));
  };

  const clearInputs = (tool: ToolType) => {
    setInputs(prev => ({ ...prev, [tool]: {} }));
  };

  return (
    <ToolsModalContext.Provider
      value={{
        isOpen,
        activeTool,
        toolState,
        errorMessage,
        inputs,
        scrollPosition,
        openTool,
        closeTool,
        setToolState,
        setErrorMessage,
        updateInputs,
        clearInputs,
      }}
    >
      {children}
    </ToolsModalContext.Provider>
  );
};

export const useToolsModal = () => {
  const context = useContext(ToolsModalContext);
  if (!context) {
    throw new Error('useToolsModal must be used within ToolsModalProvider');
  }
  return context;
};
