// Type definitions for ArtieChat component and subcomponents

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'artie';
  timestamp: Date;
  attachment?: MessageAttachment;
  actionChips?: ActionChip[];
  error?: boolean;
  retryPayload?: RetryPayload;
}

export interface MessageAttachment {
  type: 'image' | 'document';
  url: string;
  name: string;
  data?: string;
  analysis?: BriefAnalysis;
  excerpt?: string;
}

export interface BriefAnalysis {
  summary: string;
  keyInsights: string[];
  targetAudience?: string;
  deliverables?: string[];
  tonalKeywords?: string[];
  suggestedActions?: string[];
  enhancedAnalysis?: {
    summary: string;
    keyInsights: string[];
    targetAudience?: string;
    deliverables?: string[];
    tonalKeywords?: string[];
    brandTone?: string;
    visualDirection?: string[];
    colorPalette?: string[];
    styleKeywords?: string[];
    moodboardDirections?: string[];
    conceptIdeas?: string[];
    firstPostDrafts?: string[];
    brandStories?: string[];
    visualReferences?: string[];
    constraints?: string[];
    goals?: string[];
  };
}

export interface ActionChip {
  label: string;
  action: string;
}

export interface RetryPayload {
  prompt?: string;
  analysis?: ImageAnalysis;
  credits?: number;
}

export interface ImageAnalysis {
  image_overview?: string;
  [key: string]: unknown;
}

export interface ContextImage {
  url: string;
  messageId: string;
  timestamp: string;
  name?: string;
  source: 'user' | 'artie' | 'link';
}

export interface ContextDocument {
  id: string;
  name: string;
  summary: string;
  keyInsights: string[];
  targetAudience?: string;
  deliverables?: string[];
  tonalKeywords?: string[];
  textExcerpt?: string;
  createdAt: string;
}

export interface ContextMemory {
  images: ContextImage[];
  documents: ContextDocument[];
  briefSummary?: string;
}

export interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  prompt: string;
}

export interface PendingAction {
  type: string;
  data: Record<string, unknown>;
}

export interface GenerationOptions {
  quality?: string;
  size?: string;
  background?: string;
  [key: string]: unknown;
}

export interface ChatAttachment {
  type: 'image' | 'document';
  url: string;
  name: string;
  data?: string;
  analysis?: BriefAnalysis;
  excerpt?: string;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolCallDelta {
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
  index?: number;
}

export interface StreamDelta {
  content?: string;
  tool_calls?: ToolCallDelta[];
}

export interface StreamChoice {
  delta: StreamDelta;
}

export interface StreamResponse {
  choices?: StreamChoice[];
}

export interface GenerateImageResponse {
  success: boolean;
  image: string;
  assetId?: string;
  error?: string;
}

export interface EditImageResponse {
  success: boolean;
  image: string;
  assetId?: string;
  error?: string;
}

