/**
 * Documents API
 * 
 * Handles CRUD operations for documents with versioning and ETag support.
 * 
 * Endpoints:
 * - POST /api/v1/documents - Create document
 * - GET /api/v1/documents/{documentId} - Get document
 * - PATCH /api/v1/documents/{documentId} - Update document metadata
 * - GET /api/v1/documents - List documents
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, if-none-match',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
};

interface DocumentRecord {
  id: string;
  owner_id: string;
  team_id: string | null;
  title: string;
  width: number;
  height: number;
  background: any;
  layers: any;
  selection: any;
  metadata: any;
  history: any;
  version: number;
  created_at: string;
  updated_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: { code: 'AUTH_REQUIRED', message: 'Authorization required' } }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: { code: 'AUTH_REQUIRED', message: 'Invalid token' } }, 401);
    }

    // Parse request body for method and params
    const body = req.method !== 'GET' ? await req.json().catch(() => ({})) : {};
    const { method, documentId, ...params } = body;

    // Route handling based on method
    if (method === 'create' || (req.method === 'POST' && !documentId)) {
      return handleCreateDocument({ ...params }, supabaseAdmin, user.id);
    } else if (method === 'get' || (req.method === 'GET' && documentId)) {
      return handleGetDocument({ documentId, ...params }, supabaseAdmin, user.id);
    } else if (method === 'update' || (req.method === 'PATCH' && documentId)) {
      return handleUpdateDocument({ documentId, ...params }, supabaseAdmin, user.id);
    } else if (method === 'list' || (req.method === 'GET' && !documentId)) {
      return handleListDocuments({ ...params }, supabaseAdmin, user.id);
    }

    return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  } catch (error) {
    console.error('Documents API error:', error);
    return jsonResponse(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      500
    );
  }
});

async function handleCreateDocument(params: any, supabase: any, userId: string) {
  const { title = 'Untitled', canvas, metadata = {} } = params;

  const defaultCanvas = {
    width: 1920,
    height: 1080,
    background: { type: 'solid', color: '#ffffff' },
  };

  const doc = {
    owner_id: userId,
    title,
    width: canvas?.width ?? defaultCanvas.width,
    height: canvas?.height ?? defaultCanvas.height,
    background: canvas?.background ?? defaultCanvas.background,
    layers: { order: [], nodes: {}, groups: {} },
    selection: { selectedLayerId: null },
    metadata: {
      brandKit: metadata.brandKit ?? {},
      stylePresets: metadata.stylePresets ?? {},
      docPrefs: metadata.docPrefs ?? { grid: false, snapping: false },
    },
    history: { headActionId: null, cursorActionId: null, length: 0 },
    version: 1,
  };

  // Use PostgreSQL function to completely bypass PostgREST schema cache
  // This function executes directly in the database, not through PostgREST
  console.log('Creating document via PostgreSQL function (bypasses PostgREST entirely)');
  
  try {
    const { data: insertedDoc, error: rpcError } = await supabase.rpc('create_document_direct', {
      p_owner_id: doc.owner_id,
      p_title: doc.title,
      p_width: doc.width,
      p_height: doc.height,
      p_background: doc.background,
      p_layers: doc.layers,
      p_selection: doc.selection,
      p_metadata: doc.metadata,
      p_history: doc.history,
      p_version: doc.version,
    });

    if (rpcError) {
      console.error('PostgreSQL function failed, falling back to direct insert:', rpcError);
      
      // Fallback: Try direct insert (might work if schema cache refreshed)
      const { data: fallbackDoc, error: fallbackError } = await supabase
        .from('documents')
        .insert(doc)
        .select()
        .single();

      if (fallbackError) {
        console.error('All methods failed:', fallbackError);
        return jsonResponse({ 
          error: { 
            code: 'INTERNAL_ERROR', 
            message: `Failed to create document: ${fallbackError.message}` 
          } 
        }, 500);
      }

      console.log('Document created via fallback method, ID:', fallbackDoc.id);
      return jsonResponse({ document: transformDocument(fallbackDoc) }, 201, {
        'ETag': `"${fallbackDoc.version}"`,
      });
    }

    // RPC returns array, get first result
    const result = Array.isArray(insertedDoc) ? insertedDoc[0] : insertedDoc;
    
    if (!result) {
      return jsonResponse({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'PostgreSQL function returned no result' 
        } 
      }, 500);
    }

    console.log('Document created successfully via PostgreSQL function, ID:', result.id);
    return jsonResponse({ document: transformDocument(result) }, 201, {
      'ETag': `"${result.version}"`,
    });
  } catch (error: any) {
    console.error('Unexpected error creating document:', error);
    return jsonResponse({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: `Failed to create document: ${error.message || 'Unknown error'}` 
      } 
    }, 500);
  }
}

async function handleGetDocument(params: any, supabase: any, userId: string) {
  const { documentId, include } = params;
  
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error || !data) {
    return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Document not found' } }, 404);
  }

  // Check access
  if (data.owner_id !== userId && data.team_id !== userId) {
    return jsonResponse({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  }

  // Handle ETag
  const etag = `"${data.version}"`;
  
  // Parse include params
  const includeList = include ? (Array.isArray(include) ? include : include.split(',')) : [];

  const response: any = { document: transformDocument(data) };

  if (includeList.includes('assetsSummary')) {
    const { data: assets } = await supabase
      .from('assets')
      .select('id, type, thumb_url, width, height')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(10);
    response.assetsSummary = assets ?? [];
  }

  if (includeList.includes('historySummary')) {
    const { data: actions } = await supabase
      .from('actions')
      .select('id, type, created_at')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(20);
    response.historySummary = actions ?? [];
  }

  return jsonResponse(response, 200, { 'ETag': etag });
}

async function handleUpdateDocument(params: any, supabase: any, userId: string) {
  const { documentId, title, metadata, canvas } = params;

  // Check access
  const { data: existing } = await supabase
    .from('documents')
    .select('owner_id, team_id')
    .eq('id', documentId)
    .single();

  if (!existing) {
    return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Document not found' } }, 404);
  }

  if (existing.owner_id !== userId && existing.team_id !== userId) {
    return jsonResponse({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  }

  // Build update (no direct layer mutations)
  const update: any = {};
  if (title !== undefined) update.title = title;
  if (metadata !== undefined) {
    // Merge metadata
    const { data: current } = await supabase
      .from('documents')
      .select('metadata')
      .eq('id', documentId)
      .single();
    
    update.metadata = { ...current.metadata, ...metadata };
  }
  if (canvas?.background !== undefined) {
    const { data: current } = await supabase
      .from('documents')
      .select('background')
      .eq('id', documentId)
      .single();
    update.background = { ...current.background, ...canvas.background };
  }
  if (canvas?.width !== undefined) update.width = canvas.width;
  if (canvas?.height !== undefined) update.height = canvas.height;

  const { data, error } = await supabase
    .from('documents')
    .update(update)
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    return jsonResponse({ error: { code: 'INTERNAL_ERROR', message: error.message } }, 500);
  }

  return jsonResponse({ document: transformDocument(data) }, 200, {
    'ETag': `"${data.version}"`,
  });
}

async function handleListDocuments(params: any, supabase: any, userId: string) {
  const limit = parseInt(params.limit ?? '20', 10);
  const cursor = params.cursor;
  const teamId = params.teamId;

  let query = supabase
    .from('documents')
    .select('id, title, updated_at, version')
    .or(`owner_id.eq.${userId}${teamId ? `,team_id.eq.${teamId}` : ''}`)
    .order('updated_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    const { data: cursorDoc } = await supabase
      .from('documents')
      .select('updated_at')
      .eq('id', cursor)
      .single();
    
    if (cursorDoc) {
      query = query.lt('updated_at', cursorDoc.updated_at);
    }
  }

  const { data, error } = await query;

  if (error) {
    return jsonResponse({ error: { code: 'INTERNAL_ERROR', message: error.message } }, 500);
  }

  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;

  // Get thumbnails (simplified - in production would join with assets)
  const itemsWithThumbs = await Promise.all(
    items.map(async (doc: any) => {
      const { data: assets } = await supabase
        .from('assets')
        .select('thumb_url')
        .eq('document_id', doc.id)
        .not('thumb_url', 'is', null)
        .limit(1)
        .single();
      return { ...doc, thumbUrl: assets?.thumb_url ?? null };
    })
  );

  return jsonResponse({
    items: itemsWithThumbs.map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      updatedAt: doc.updated_at,
      thumbUrl: doc.thumbUrl,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}

function transformDocument(dbDoc: any): any {
  return {
    id: dbDoc.id,
    ownerId: dbDoc.owner_id,
    teamId: dbDoc.team_id,
    title: dbDoc.title,
    canvas: {
      width: dbDoc.width,
      height: dbDoc.height,
      background: dbDoc.background,
    },
    layers: dbDoc.layers,
    selection: dbDoc.selection,
    metadata: dbDoc.metadata,
    history: dbDoc.history,
    version: dbDoc.version,
    createdAt: dbDoc.created_at,
    updatedAt: dbDoc.updated_at,
  };
}

function jsonResponse(data: any, status = 200, additionalHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...additionalHeaders,
    },
  });
}
