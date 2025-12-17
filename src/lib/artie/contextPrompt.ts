/**
 * Context Prompt Builder for Artie
 * 
 * Builds dynamic context prompts based on user's current state:
 * - Recent images (from memory)
 * - Active creative briefs
 * - Current tool (Studio/Edit/Blend/Upscale)
 * - User preferences (styles, colors, quality)
 * - Recent workflow actions
 */

interface ContextImage {
    url: string;
    messageId: string;
    name?: string;
    source: 'user' | 'artie' | 'link';
    timestamp: string;
}

interface ContextBrief {
    id: string;
    name: string;
    summary: string;
    keyInsights?: string[];
    targetAudience?: string;
    deliverables?: string[];
    tonalKeywords?: string[];
}

interface UserPreferences {
    preferredStyles?: string[];
    preferredColors?: string[];
    qualityPreferences?: {
        upscaleFrequency: number;
        editFrequency: number;
        blendFrequency: number;
    };
}

interface WorkflowStep {
    tool: 'studio' | 'edit' | 'blend' | 'upscale' | 'community';
    action: string;
    timestamp: string;
    imageUrl?: string;
    prompt?: string;
}

interface ContextParams {
    recentImages?: ContextImage[];
    activeBriefs?: ContextBrief[];
    userPreferences?: UserPreferences;
    currentTool?: 'studio' | 'edit' | 'blend' | 'upscale' | 'community' | 'artie';
    recentWorkflow?: WorkflowStep[];
}

/**
 * Build a context prompt to inject into the system message
 * This gives Artie awareness of the user's current creative state
 */
export function buildContextPrompt(params: ContextParams): string {
    const sections: string[] = [];

    // Recent Images Context
    if (params.recentImages && params.recentImages.length > 0) {
        const imageContext = params.recentImages
            .slice(-4) // Last 4 images
            .map((img, index) => {
                return `Image ${index + 1} (${img.source}): ${img.url}${img.name ? ` - "${img.name}"` : ''}`;
            })
            .join('\n');

        sections.push(`━━━ RECENT IMAGES ━━━\n${imageContext}`);
    }

    // Active Creative Briefs Context
    if (params.activeBriefs && params.activeBriefs.length > 0) {
        const briefContext = params.activeBriefs
            .slice(-2) // Last 2 briefs
            .map((brief) => {
                const parts = [`Brief: "${brief.name}"\nSummary: ${brief.summary}`];

                if (brief.targetAudience) {
                    parts.push(`Audience: ${brief.targetAudience}`);
                }

                if (brief.keyInsights && brief.keyInsights.length > 0) {
                    parts.push(`Key Insights: ${brief.keyInsights.slice(0, 3).join(', ')}`);
                }

                if (brief.tonalKeywords && brief.tonalKeywords.length > 0) {
                    parts.push(`Tone: ${brief.tonalKeywords.join(', ')}`);
                }

                return parts.join('\n');
            })
            .join('\n\n');

        sections.push(`━━━ ACTIVE CREATIVE BRIEFS ━━━\n${briefContext}`);
    }

    // User Preferences Context
    if (params.userPreferences) {
        const prefParts: string[] = [];

        if (params.userPreferences.preferredStyles && params.userPreferences.preferredStyles.length > 0) {
            prefParts.push(`Preferred Styles: ${params.userPreferences.preferredStyles.slice(0, 3).join(', ')}`);
        }

        if (params.userPreferences.preferredColors && params.userPreferences.preferredColors.length > 0) {
            prefParts.push(`Preferred Colors: ${params.userPreferences.preferredColors.slice(0, 3).join(', ')}`);
        }

        if (params.userPreferences.qualityPreferences) {
            const qp = params.userPreferences.qualityPreferences;
            const behaviors: string[] = [];

            if (qp.upscaleFrequency > 0.3) behaviors.push('frequently upscales images');
            if (qp.editFrequency > 0.3) behaviors.push('frequently edits images');
            if (qp.blendFrequency > 0.3) behaviors.push('frequently blends images');

            if (behaviors.length > 0) {
                prefParts.push(`User Behavior: ${behaviors.join(', ')}`);
            }
        }

        if (prefParts.length > 0) {
            sections.push(`━━━ USER PREFERENCES ━━━\n${prefParts.join('\n')}`);
        }
    }

    // Current Tool Context
    if (params.currentTool && params.currentTool !== 'artie') {
        const toolDescriptions = {
            studio: 'User is currently in Studio (image generation)',
            edit: 'User is currently in Edit Image (image refinement)',
            blend: 'User is currently in Blend (combining images)',
            upscale: 'User is currently in Upscale (enhancing resolution)',
            community: 'User is currently in Community (browsing/sharing work)',
        };

        sections.push(`━━━ CURRENT TOOL ━━━\n${toolDescriptions[params.currentTool]}`);
    }

    // Recent Workflow Context
    if (params.recentWorkflow && params.recentWorkflow.length > 0) {
        const workflowContext = params.recentWorkflow
            .slice(-5) // Last 5 workflow steps
            .map((step, index) => {
                const parts = [`${index + 1}. ${step.tool.toUpperCase()}: ${step.action}`];
                if (step.imageUrl) parts.push(`   Image: ${step.imageUrl}`);
                if (step.prompt) parts.push(`   Prompt: "${step.prompt.slice(0, 100)}..."`);
                return parts.join('\n');
            })
            .join('\n');

        sections.push(`━━━ RECENT WORKFLOW ━━━\n${workflowContext}`);
    }

    // If no context, return empty string
    if (sections.length === 0) {
        return '';
    }

    // Build final context prompt
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT MEMORY (Use this to inform your responses)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${sections.join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Remember: Use this context to provide more relevant, personalized creative direction.
Reference specific images, briefs, and preferences when appropriate.
Maintain consistency with the established creative direction.
`;
}

/**
 * Extract context from environment context object
 * (sent from frontend)
 */
export function extractContextFromEnvironment(environmentContext: any): ContextParams {
    return {
        currentTool: environmentContext?.currentTool,
        recentImages: environmentContext?.recentImages,
        activeBriefs: environmentContext?.activeBriefs,
        userPreferences: environmentContext?.userPreferences,
        recentWorkflow: environmentContext?.recentWorkflow,
    };
}
