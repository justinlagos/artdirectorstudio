/**
 * @deprecated Legacy ToolsModal context.
 * Workspace now uses workspaceStore.activeTool + Inspector drawers.
 * Kept because community pages (Header, BottomNav, ArtieChat, etc.) still import it.
 * Remove once those pages are migrated.
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export type ToolType = 'blend' | 'upscale' | 'batch' | 'generate';
export type ToolState = 'idle' | 'loading' | 'success' | 'error';

export interface GenerateInput {
  prompt: string;
  referenceImage?: string;
  analysisData?: any;
  mode?: 'generate' | 'variation';
}

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
  generate?: GenerateInput;
}

interface ToolsModalContextType {
  isOpen: boolean;
  activeTool: ToolType | null;
  toolState: ToolState;
  errorMessage: string | null;
  inputs: ToolInputs;
  scrollPosition: number;
  generatePrompt: string | null;
  openTool: (tool: ToolType, preloadData?: any) => void;
  closeTool: () => void;
  setToolState: (state: ToolState) => void;
  setErrorMessage: (message: string | null) => void;
  updateInputs: (tool: ToolType, data: any) => void;
  clearInputs: (tool: ToolType) => void;
  openGenerateDialog: (input: string | GenerateInput) => void;
}

const ToolsModalContext = createContext<ToolsModalContextType | undefined>(undefined);

export const ToolsModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [toolState, setToolState] = useState<ToolState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inputs, setInputs] = useState<ToolInputs>({});
  const [scrollPosition, setScrollPosition] = useState(0);
  const [generatePrompt, setGeneratePrompt] = useState<string | null>(null);

  const openTool = (tool: ToolType, preloadData?: any) => {
    // Check if user is authenticated by checking localStorage
    const hasSession = localStorage.getItem('sb-vsbjxktlrbfxfhxiqzlr-auth-token');
    
    if (!hasSession) {
      toast.error('Please sign in to use tools');
      return;
    }
    
    // Save scroll position to sessionStorage for reliable restoration
    const scrollY = window.scrollY;
    sessionStorage.setItem('toolModalScroll', scrollY.toString());
    setScrollPosition(scrollY);
    
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
    
    // Restore scroll position after modal closes
    setTimeout(() => {
      const savedScroll = sessionStorage.getItem('toolModalScroll');
      if (savedScroll) {
        window.scrollTo({ top: parseInt(savedScroll), behavior: 'auto' });
        sessionStorage.removeItem('toolModalScroll');
      } else {
        // Fallback to state
        window.scrollTo({ top: scrollPosition, behavior: 'auto' });
      }
    }, 150);
    
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

  const openGenerateDialog = (input: string | GenerateInput) => {
    // Support both string (legacy) and GenerateInput object
    const generateData: GenerateInput = typeof input === 'string' 
      ? { prompt: input, mode: 'generate' }
      : input;
    
    setGeneratePrompt(generateData.prompt);
    
    // Store full generate data in inputs
    setInputs(prev => ({
      ...prev,
      generate: generateData
    }));
    
    // Close current tool modal if open
    if (isOpen) {
      closeTool();
    }
    // Small delay to ensure smooth transition
    setTimeout(() => {
      setActiveTool('generate');
      setIsOpen(true);
    }, isOpen ? 200 : 0);
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
        generatePrompt,
        openTool,
        closeTool,
        setToolState,
        setErrorMessage,
        updateInputs,
        clearInputs,
        openGenerateDialog,
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
