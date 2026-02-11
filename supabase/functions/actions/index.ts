/**
 * Actions API
 * 
 * Handles action batching, undo/redo, and version conflict resolution.
 * 
 * Endpoints:
 * - POST /api/v1/documents/{documentId}/actions - Apply batch of actions
 * - POST /api/v1/documents/{documentId}/undo - Undo actions
 * - POST /api/v1/documents/{documentId}/redo - Redo actions
 * - GET /api/v1/documents/{documentId}/actions - List actions
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Import action engine (simplified - in production would be shared module)
// For now, we'll implement basic validation inline

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
    const body = await req.json().catch(() => ({}));
    const { method, documentId, ...params } = body;

    if (!documentId) {
      return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Document ID required' } }, 404);
    }

    // Check access
    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('owner_id, team_id, version')
      .eq('id', documentId)
      .single();

    if (!doc) {
      return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Document not found' } }, 404);
    }

    if (doc.owner_id !== user.id && doc.team_id !== user.id) {
      return jsonResponse({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    }

    // Route handling based on method
    if (method === 'apply' || method === 'actions') {
      return handleApplyActions({ documentId, ...params }, supabaseAdmin, user.id, doc.version);
    } else if (method === 'undo') {
      return handleUndo({ documentId, ...params }, supabaseAdmin, user.id, doc.version);
    } else if (method === 'redo') {
      return handleRedo({ documentId, ...params }, supabaseAdmin, user.id, doc.version);
    } else if (method === 'list') {
      return handleListActions({ documentId, ...params }, supabaseAdmin);
    }

    return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  } catch (error) {
    console.error('Actions API error:', error);
    return jsonResponse(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      500
    );
  }
});

async function handleApplyActions(
  params: any,
  supabase: any,
  userId: string,
  serverVersion: number
) {
  const { documentId, baseVersion, clientBatchId, actions } = params;

  // Version check
  if (baseVersion !== serverVersion) {
    return jsonResponse({
      error: {
        code: 'VERSION_MISMATCH',
        message: 'Document version mismatch',
        details: { serverVersion },
      },
    }, 409);
  }

  if (!Array.isArray(actions) || actions.length === 0) {
    return jsonResponse({
      error: { code: 'VALIDATION_ERROR', message: 'Actions array required' },
    }, 400);
  }

  // Get current document
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Document not found' } }, 404);
  }

  // Apply actions (simplified - in production would use shared action engine)
  let currentDoc = document;
  const appliedActions: any[] = [];

  for (const action of actions) {
    // Validate action
    const validation = validateAction(currentDoc, action);
    if (!validation.valid) {
      return jsonResponse({
        error: { code: 'ACTION_REJECTED', message: validation.error },
      }, 400);
    }

    // Apply action (simplified - would use action engine)
    currentDoc = applyActionToDocument(currentDoc, action);
    
    // Store action
    const { data: actionRecord, error: actionError } = await supabase
      .from('actions')
      .insert({
        document_id: documentId,
        user_id: userId,
        type: action.type,
        payload: action.payload,
        inverse: action.inverse,
        client_id: action.clientId || null,
      })
      .select()
      .single();

    if (actionError) {
      return jsonResponse({
        error: { code: 'INTERNAL_ERROR', message: actionError.message },
      }, 500);
    }

    appliedActions.push({
      actionId: actionRecord.id,
      type: action.type,
      clientId: action.clientId,
    });
  }

  // Update document
  const { data: updatedDoc, error: updateError } = await supabase
    .from('documents')
    .update({
      layers: currentDoc.layers,
      selection: currentDoc.selection,
      canvas: {
        width: currentDoc.width,
        height: currentDoc.height,
        background: currentDoc.background,
      },
      version: currentDoc.version,
      history: {
        headActionId: appliedActions[appliedActions.length - 1].actionId,
        cursorActionId: appliedActions[appliedActions.length - 1].actionId,
        length: (document.history.length || 0) + appliedActions.length,
      },
    })
    .eq('id', documentId)
    .select()
    .single();

  if (updateError) {
    return jsonResponse({
      error: { code: 'INTERNAL_ERROR', message: updateError.message },
    }, 500);
  }

  return jsonResponse({
    document: transformDocument(updatedDoc),
    applied: appliedActions,
    newVersion: updatedDoc.version,
  });
}

async function handleUndo(
  params: any,
  supabase: any,
  userId: string,
  serverVersion: number
) {
  const { documentId, baseVersion, steps = 1 } = params;

  if (baseVersion !== serverVersion) {
    return jsonResponse({
      error: {
        code: 'VERSION_MISMATCH',
        message: 'Document version mismatch',
        details: { serverVersion },
      },
    }, 409);
  }

  // Get document
  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (!document || !document.history.cursorActionId) {
    return jsonResponse({
      error: { code: 'VALIDATION_ERROR', message: 'Nothing to undo' },
    }, 400);
  }

  // Get actions to undo
  const { data: actions } = await supabase
    .from('actions')
    .select('*')
    .eq('document_id', documentId)
    .eq('id', document.history.cursorActionId)
    .order('created_at', { ascending: false })
    .limit(steps);

  if (!actions || actions.length === 0) {
    return jsonResponse({
      error: { code: 'VALIDATION_ERROR', message: 'Nothing to undo' },
    }, 400);
  }

  // Apply inverses (simplified)
  let currentDoc = document;
  for (const action of actions.reverse()) {
    currentDoc = applyInverseToDocument(currentDoc, {
      type: action.type,
      payload: action.payload,
      inverse: action.inverse,
    });
  }

  // Find previous action for cursor
  const { data: prevActions } = await supabase
    .from('actions')
    .select('id')
    .eq('document_id', documentId)
    .lt('created_at', actions[0].created_at)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Update document
  const { data: updatedDoc, error } = await supabase
    .from('documents')
    .update({
      layers: currentDoc.layers,
      selection: currentDoc.selection,
      canvas: {
        width: currentDoc.width,
        height: currentDoc.height,
        background: currentDoc.background,
      },
      version: currentDoc.version,
      history: {
        headActionId: document.history.headActionId,
        cursorActionId: prevActions?.id || null,
        length: Math.max(0, (document.history.length || 0) - steps),
      },
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    return jsonResponse({ error: { code: 'INTERNAL_ERROR', message: error.message } }, 500);
  }

  return jsonResponse({
    document: transformDocument(updatedDoc),
    newVersion: updatedDoc.version,
  });
}

async function handleRedo(
  params: any,
  supabase: any,
  userId: string,
  serverVersion: number
) {
  const { documentId, baseVersion, steps = 1 } = params;

  if (baseVersion !== serverVersion) {
    return jsonResponse({
      error: {
        code: 'VERSION_MISMATCH',
        message: 'Document version mismatch',
        details: { serverVersion },
      },
    }, 409);
  }

  // Get document
  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (!document) {
    return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Document not found' } }, 404);
  }

  // Get next actions to redo
  const cursorId = document.history.cursorActionId;
  const { data: actions } = await supabase
    .from('actions')
    .select('*')
    .eq('document_id', documentId)
    .gt('created_at', cursorId ? 
      (await supabase.from('actions').select('created_at').eq('id', cursorId).single()).data?.created_at : '1970-01-01')
    .order('created_at', { ascending: true })
    .limit(steps);

  if (!actions || actions.length === 0) {
    return jsonResponse({
      error: { code: 'VALIDATION_ERROR', message: 'Nothing to redo' },
    }, 400);
  }

  // Apply actions
  let currentDoc = document;
  for (const action of actions) {
    currentDoc = applyActionToDocument(currentDoc, {
      type: action.type,
      payload: action.payload,
      inverse: action.inverse,
    });
  }

  // Update document
  const { data: updatedDoc, error } = await supabase
    .from('documents')
    .update({
      layers: currentDoc.layers,
      selection: currentDoc.selection,
      canvas: {
        width: currentDoc.width,
        height: currentDoc.height,
        background: currentDoc.background,
      },
      version: currentDoc.version,
      history: {
        headActionId: document.history.headActionId,
        cursorActionId: actions[actions.length - 1].id,
        length: (document.history.length || 0) + actions.length,
      },
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    return jsonResponse({ error: { code: 'INTERNAL_ERROR', message: error.message } }, 500);
  }

  return jsonResponse({
    document: transformDocument(updatedDoc),
    newVersion: updatedDoc.version,
  });
}

async function handleListActions(params: any, supabase: any) {
  const { documentId, limit: limitParam, cursor, fromActionId } = params;
  const limit = parseInt(limitParam ?? '50', 10);

  let query = supabase
    .from('actions')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (fromActionId) {
    const { data: fromAction } = await supabase
      .from('actions')
      .select('created_at')
      .eq('id', fromActionId)
      .single();
    
    if (fromAction) {
      query = query.lt('created_at', fromAction.created_at);
    }
  } else if (cursor) {
    query = query.lt('id', cursor);
  }

  const { data, error } = await query;

  if (error) {
    return jsonResponse({ error: { code: 'INTERNAL_ERROR', message: error.message } }, 500);
  }

  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;

  return jsonResponse({
    items: items.map((a: any) => ({
      id: a.id,
      documentId: a.document_id,
      userId: a.user_id,
      type: a.type,
      payload: a.payload,
      inverse: a.inverse,
      clientId: a.client_id,
      createdAt: a.created_at,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}

// Simplified action application (in production would use shared engine)
function applyActionToDocument(doc: any, action: any): any {
  const newDoc = { ...doc };
  const newLayers = { ...doc.layers };
  const newNodes = { ...doc.layers.nodes };

  switch (action.type) {
    case 'addLayer': {
      const { layer, index } = action.payload;
      const order = [...newLayers.order];
      if (index !== undefined) {
        order.splice(index, 0, layer.id);
      } else {
        order.push(layer.id);
      }
      newNodes[layer.id] = layer;
      newDoc.layers = { ...newLayers, order, nodes: newNodes };
      newDoc.version += 1;
      break;
    }
    case 'removeLayer': {
      const { layerId } = action.payload;
      const order = newLayers.order.filter((id: string) => id !== layerId);
      const { [layerId]: removed, ...remaining } = newNodes;
      newDoc.layers = { ...newLayers, order, nodes: remaining };
      if (doc.selection.selectedLayerId === layerId) {
        newDoc.selection = { selectedLayerId: null };
      }
      newDoc.version += 1;
      break;
    }
    case 'updateLayer': {
      const { layerId, patch } = action.payload;
      if (layerId in newNodes) {
        newNodes[layerId] = { ...newNodes[layerId], ...patch };
        newDoc.layers = { ...newLayers, nodes: newNodes };
        newDoc.version += 1;
      }
      break;
    }
    case 'selectLayer': {
      const { selectedLayerId } = action.payload;
      if (selectedLayerId === null || selectedLayerId in newNodes) {
        newDoc.selection = { selectedLayerId };
      }
      break;
    }
    // Add more action types as needed
  }

  return newDoc;
}

function applyInverseToDocument(doc: any, action: any): any {
  return applyActionToDocument(doc, {
    type: action.type,
    payload: action.inverse,
    inverse: action.payload,
  });
}

function validateAction(doc: any, action: any): { valid: boolean; error?: string } {
  if (!action.type || !action.payload || !action.inverse) {
    return { valid: false, error: 'Invalid action structure' };
  }

  switch (action.type) {
    case 'addLayer': {
      const { layer } = action.payload;
      if (!layer || !layer.id) {
        return { valid: false, error: 'Layer missing or invalid' };
      }
      if (doc.layers.nodes[layer.id]) {
        return { valid: false, error: 'Layer ID already exists' };
      }
      break;
    }
    case 'removeLayer':
    case 'updateLayer': {
      const { layerId } = action.payload;
      if (!layerId || !(layerId in doc.layers.nodes)) {
        return { valid: false, error: 'Layer not found' };
      }
      break;
    }
  }

  return { valid: true };
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
