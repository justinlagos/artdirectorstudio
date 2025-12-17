/**
 * Artie Context Database Service
 * 
 * Handles persistence of Artie's context memory to Supabase:
 * - Images (user uploads, generated images, linked images)
 * - Creative briefs (uploaded documents, analyzed briefs)
 * - User preferences (styles, colors, quality settings)
 * - Workflow steps (tool usage, actions taken)
 */

import { supabase } from "@/integrations/supabase/client";

export interface ContextImage {
    url: string;
    messageId: string;
    name?: string;
    source: 'user' | 'artie' | 'link';
    timestamp: string;
}

export interface ContextBrief {
    id: string;
    name: string;
    summary: string;
    keyInsights?: string[];
    targetAudience?: string;
    deliverables?: string[];
    tonalKeywords?: string[];
    textExcerpt?: string;
    createdAt: string;
}

export interface UserPreferences {
    preferredStyles?: string[];
    preferredColors?: string[];
    qualityPreferences?: {
        upscaleFrequency: number;
        editFrequency: number;
        blendFrequency: number;
    };
}

export interface WorkflowStep {
    tool: 'studio' | 'edit' | 'blend' | 'upscale' | 'community';
    action: string;
    timestamp: string;
    imageUrl?: string;
    prompt?: string;
    metadata?: Record<string, any>;
}

/**
 * Save an image to context memory
 */
export async function saveImageToContext(
    userId: string,
    conversationId: string | null,
    image: ContextImage
): Promise<void> {
    const { error } = await supabase
        .from('artie_context_memory')
        .upsert({
            user_id: userId,
            conversation_id: conversationId,
            context_type: 'image',
            context_data: image,
        }, {
            onConflict: 'user_id,context_type,context_data',
            ignoreDuplicates: true,
        });

    if (error) {
        console.error('[ArtieContext] Error saving image:', error);
        throw error;
    }
}

/**
 * Save a creative brief to context memory
 */
export async function saveBriefToContext(
    userId: string,
    conversationId: string | null,
    brief: ContextBrief
): Promise<void> {
    const { error } = await supabase
        .from('artie_context_memory')
        .insert({
            user_id: userId,
            conversation_id: conversationId,
            context_type: 'brief',
            context_data: brief,
        });

    if (error) {
        console.error('[ArtieContext] Error saving brief:', error);
        throw error;
    }
}

/**
 * Save user preferences to context memory
 */
export async function savePreferencesToContext(
    userId: string,
    preferences: UserPreferences
): Promise<void> {
    // Delete old preferences first
    await supabase
        .from('artie_context_memory')
        .delete()
        .eq('user_id', userId)
        .eq('context_type', 'preference');

    // Insert new preferences
    const { error } = await supabase
        .from('artie_context_memory')
        .insert({
            user_id: userId,
            context_type: 'preference',
            context_data: preferences,
        });

    if (error) {
        console.error('[ArtieContext] Error saving preferences:', error);
        throw error;
    }
}

/**
 * Save a workflow step to context memory
 */
export async function saveWorkflowStepToContext(
    userId: string,
    conversationId: string | null,
    step: WorkflowStep
): Promise<void> {
    const { error } = await supabase
        .from('artie_context_memory')
        .insert({
            user_id: userId,
            conversation_id: conversationId,
            context_type: 'workflow',
            context_data: step,
            // Workflow steps expire after 24 hours
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

    if (error) {
        console.error('[ArtieContext] Error saving workflow step:', error);
        throw error;
    }
}

/**
 * Load recent images from context memory
 */
export async function loadRecentImages(
    userId: string,
    limit: number = 10
): Promise<ContextImage[]> {
    const { data, error } = await supabase
        .from('artie_context_memory')
        .select('context_data')
        .eq('user_id', userId)
        .eq('context_type', 'image')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[ArtieContext] Error loading images:', error);
        return [];
    }

    return data.map(row => row.context_data as ContextImage);
}

/**
 * Load recent creative briefs from context memory
 */
export async function loadRecentBriefs(
    userId: string,
    limit: number = 5
): Promise<ContextBrief[]> {
    const { data, error } = await supabase
        .from('artie_context_memory')
        .select('context_data')
        .eq('user_id', userId)
        .eq('context_type', 'brief')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[ArtieContext] Error loading briefs:', error);
        return [];
    }

    return data.map(row => row.context_data as ContextBrief);
}

/**
 * Load user preferences from context memory
 */
export async function loadUserPreferences(
    userId: string
): Promise<UserPreferences | null> {
    const { data, error } = await supabase
        .from('artie_context_memory')
        .select('context_data')
        .eq('user_id', userId)
        .eq('context_type', 'preference')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No preferences found
            return null;
        }
        console.error('[ArtieContext] Error loading preferences:', error);
        return null;
    }

    return data.context_data as UserPreferences;
}

/**
 * Load recent workflow steps from context memory
 */
export async function loadRecentWorkflow(
    userId: string,
    limit: number = 10
): Promise<WorkflowStep[]> {
    const { data, error } = await supabase
        .from('artie_context_memory')
        .select('context_data')
        .eq('user_id', userId)
        .eq('context_type', 'workflow')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[ArtieContext] Error loading workflow:', error);
        return [];
    }

    return data.map(row => row.context_data as WorkflowStep);
}

/**
 * Load all context for a user
 */
export async function loadAllContext(userId: string) {
    const [images, briefs, preferences, workflow] = await Promise.all([
        loadRecentImages(userId, 10),
        loadRecentBriefs(userId, 5),
        loadUserPreferences(userId),
        loadRecentWorkflow(userId, 10),
    ]);

    return {
        images,
        briefs,
        preferences,
        workflow,
    };
}

/**
 * Clear all context for a user
 */
export async function clearAllContext(userId: string): Promise<void> {
    const { error } = await supabase
        .from('artie_context_memory')
        .delete()
        .eq('user_id', userId);

    if (error) {
        console.error('[ArtieContext] Error clearing context:', error);
        throw error;
    }
}

/**
 * Clear expired context (called periodically)
 */
export async function clearExpiredContext(): Promise<void> {
    const { error } = await supabase
        .from('artie_context_memory')
        .delete()
        .not('expires_at', 'is', null)
        .lt('expires_at', new Date().toISOString());

    if (error) {
        console.error('[ArtieContext] Error clearing expired context:', error);
    }
}
