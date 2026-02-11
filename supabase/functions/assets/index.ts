/**
 * Assets API
 * 
 * Handles asset upload URLs, finalization, and retrieval.
 * 
 * Endpoints:
 * - POST /api/v1/assets/upload-url - Get presigned upload URL
 * - POST /api/v1/assets/finalize - Finalize uploaded asset
 * - GET /api/v1/assets/{assetId} - Get asset
 * - GET /api/v1/documents/{documentId}/assets - List document assets
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
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

    // Parse request body
    const body = req.method !== 'GET' ? await req.json().catch(() => ({})) : {};
    const { method, assetId, documentId, ...params } = body;

    // Route handling based on method
    if (method === 'uploadUrl' || method === 'upload-url') {
      return handleUploadUrl({ ...params }, supabaseAdmin, user.id);
    } else if (method === 'finalize') {
      return handleFinalize({ assetId, ...params }, supabaseAdmin, user.id);
    } else if (method === 'get' || assetId) {
      return handleGetAsset(supabaseAdmin, user.id, assetId || params.assetId);
    } else if (method === 'list' || documentId) {
      return handleListDocumentAssets({ documentId, ...params }, supabaseAdmin, user.id);
    }

    return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  } catch (error) {
    console.error('Assets API error:', error);
    return jsonResponse(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      500
    );
  }
});

async function handleUploadUrl(params: any, supabase: any, userId: string) {
  const { documentId, type, mimeType, byteSize, fileName } = params;

  if (!type || !mimeType || !byteSize || !fileName) {
    return jsonResponse({
      error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' },
    }, 400);
  }

  // Validate type
  const validTypes = ['image', 'mask', 'depth', 'vector', 'upload'];
  if (!validTypes.includes(type)) {
    return jsonResponse({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid asset type' },
    }, 400);
  }

  // Generate asset ID
  const assetId = crypto.randomUUID();
  const fileExt = fileName.split('.').pop() || 'bin';
  const storagePath = `assets/${userId}/${assetId}.${fileExt}`;

  // Create presigned URL (using Supabase storage)
  const storageClient = supabase.storage.from('assets');
  const { data: uploadData, error: uploadError } = await storageClient.createSignedUploadUrl(storagePath, {
    upsert: false,
  });

  if (uploadError || !uploadData) {
    return jsonResponse({
      error: { code: 'STORAGE_ERROR', message: uploadError?.message || 'Failed to create upload URL' },
    }, 500);
  }

  // Create asset record (pending)
  const { error: insertError } = await supabase
    .from('assets')
    .insert({
      id: assetId,
      document_id: documentId || null,
      owner_id: userId,
      type: type,
      storage_url: storagePath, // Will be updated on finalize
      width: 0, // Will be set on finalize
      height: 0,
      mime_type: mimeType,
    });

  if (insertError) {
    return jsonResponse({
      error: { code: 'INTERNAL_ERROR', message: insertError.message },
    }, 500);
  }

  return jsonResponse({
    upload: {
      assetId,
      uploadUrl: uploadData.signedUrl,
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    },
  });
}

async function handleFinalize(params: any, supabase: any, userId: string) {
  const { assetId, documentId, width, height, thumb, metadata } = params;

  if (!assetId || !width || !height) {
    return jsonResponse({
      error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' },
    }, 400);
  }

  // Get asset
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .eq('owner_id', userId)
    .single();

  if (assetError || !asset) {
    return jsonResponse({
      error: { code: 'NOT_FOUND', message: 'Asset not found' },
    }, 404);
  }

  // Get public URL from storage
  const storagePath = asset.storage_url;
  const { data: urlData } = supabase.storage.from('assets').getPublicUrl(storagePath);

  // Generate thumbnail if requested
  let thumbUrl = null;
  if (thumb) {
    // In production, would generate thumbnail server-side
    // For now, use same URL
    thumbUrl = urlData.publicUrl;
  }

  // Update asset
  const { data: updatedAsset, error: updateError } = await supabase
    .from('assets')
    .update({
      document_id: documentId || asset.document_id,
      storage_url: urlData.publicUrl,
      thumb_url: thumbUrl,
      width,
      height,
      metadata: metadata || asset.metadata || {},
    })
    .eq('id', assetId)
    .select()
    .single();

  if (updateError) {
    return jsonResponse({
      error: { code: 'INTERNAL_ERROR', message: updateError.message },
    }, 500);
  }

  return jsonResponse({
    asset: transformAsset(updatedAsset),
  });
}

async function handleGetAsset(supabase: any, userId: string, assetId: string) {
  const { data: asset, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .single();

  if (error || !asset) {
    return jsonResponse({
      error: { code: 'NOT_FOUND', message: 'Asset not found' },
    }, 404);
  }

  // Check access
  if (asset.owner_id !== userId) {
    // Check if user has access via document
    if (asset.document_id) {
      const { data: doc } = await supabase
        .from('documents')
        .select('owner_id, team_id')
        .eq('id', asset.document_id)
        .single();
      
      if (!doc || (doc.owner_id !== userId && doc.team_id !== userId)) {
        return jsonResponse({
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        }, 403);
      }
    } else {
      return jsonResponse({
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      }, 403);
    }
  }

  return jsonResponse({
    asset: transformAsset(asset),
  });
}

async function handleListDocumentAssets(
  params: any,
  supabase: any,
  userId: string
) {
  const { documentId, limit: limitParam, cursor, type } = params;
  const limit = parseInt(limitParam ?? '50', 10);

  // Check document access
  const { data: doc } = await supabase
    .from('documents')
    .select('owner_id, team_id')
    .eq('id', documentId)
    .single();

  if (!doc) {
    return jsonResponse({
      error: { code: 'NOT_FOUND', message: 'Document not found' },
    }, 404);
  }

  if (doc.owner_id !== userId && doc.team_id !== userId) {
    return jsonResponse({
      error: { code: 'FORBIDDEN', message: 'Access denied' },
    }, 403);
  }

  let query = supabase
    .from('assets')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (type) {
    query = query.eq('type', type);
  }

  if (cursor) {
    const { data: cursorAsset } = await supabase
      .from('assets')
      .select('created_at')
      .eq('id', cursor)
      .single();
    
    if (cursorAsset) {
      query = query.lt('created_at', cursorAsset.created_at);
    }
  }

  const { data, error } = await query;

  if (error) {
    return jsonResponse({
      error: { code: 'INTERNAL_ERROR', message: error.message },
    }, 500);
  }

  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;

  return jsonResponse({
    items: items.map(transformAsset),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}

function transformAsset(dbAsset: any): any {
  return {
    id: dbAsset.id,
    documentId: dbAsset.document_id,
    ownerId: dbAsset.owner_id,
    type: dbAsset.type,
    storageUrl: dbAsset.storage_url,
    thumbUrl: dbAsset.thumb_url,
    width: dbAsset.width,
    height: dbAsset.height,
    mimeType: dbAsset.mime_type,
    metadata: dbAsset.metadata || {},
    createdAt: dbAsset.created_at,
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
