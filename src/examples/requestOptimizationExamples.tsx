/**
 * Examples of using request optimization utilities
 * 
 * These examples demonstrate how to use debouncing, batching, and deduplication
 * to optimize API calls in your application.
 */

import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useBatchedRequests } from '@/hooks/useBatchedRequests';
import { useRequestDeduplication } from '@/hooks/useRequestDeduplication';
import { useDebouncedQuery } from '@/hooks/useOptimizedQuery';
import { supabase } from '@/integrations/supabase/client';

/**
 * Example 1: Debounced Search Input
 * Prevents excessive API calls while user is typing
 */
export function SearchWithDebounce() {
  const [searchTerm, setSearchTerm] = React.useState('');

  // Debounced search function - only fires after user stops typing for 500ms
  const [debouncedSearch] = useDebouncedCallback(
    async (term: string) => {
      console.log('Searching for:', term);
      // Perform search API call here
      const { data } = await supabase
        .from('shared_assets')
        .select('*')
        .ilike('asset->>prompt', `%${term}%`)
        .limit(20);
      
      console.log('Search results:', data);
    },
    500 // 500ms delay
  );

  return (
    <input
      type="text"
      placeholder="Search..."
      value={searchTerm}
      onChange={(e) => {
        setSearchTerm(e.target.value);
        debouncedSearch(e.target.value);
      }}
    />
  );
}

/**
 * Example 2: Debounced Query with React Query
 * Automatically delays query execution until user stops typing
 */
export function DebouncedSearchQuery() {
  const [searchTerm, setSearchTerm] = React.useState('');

  // Query is automatically debounced - only executes 500ms after searchTerm changes
  const { data, isLoading } = useDebouncedQuery(
    ['search', searchTerm],
    async () => {
      const { data } = await supabase
        .from('shared_assets')
        .select('*')
        .ilike('asset->>prompt', `%${searchTerm}%`)
        .limit(20);
      return data;
    },
    {
      debounceDelay: 500,
      enabled: searchTerm.length > 2, // Only search if 3+ characters
    }
  );

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {isLoading && <div>Searching...</div>}
      {data && <div>Found {data.length} results</div>}
    </div>
  );
}

/**
 * Example 3: Batched User Profile Requests
 * Combines multiple profile requests into a single API call
 */
export function UserProfilesList() {
  const { request: fetchProfile } = useBatchedRequests<string, any>(
    async (userIds) => {
      // Batch fetch all user profiles in a single query
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      
      // Convert to Map for batching system
      return new Map(data?.map(profile => [profile.id, profile]) || []);
    },
    {
      batchDelay: 50, // Wait 50ms to collect requests
      maxBatchSize: 50, // Maximum 50 profiles per batch
    }
  );

  // Later in your component, multiple calls to fetchProfile 
  // within 50ms will be batched into a single API call
  React.useEffect(() => {
    const userIds = ['user1', 'user2', 'user3'];
    
    // These 3 calls will be combined into 1 API request
    Promise.all(userIds.map(id => fetchProfile(id)))
      .then(profiles => console.log('Profiles:', profiles));
  }, []);

  return <div>User profiles...</div>;
}

/**
 * Example 4: Request Deduplication
 * Prevents duplicate concurrent requests
 */
export function DuplicateRequestPrevention() {
  const { request: fetchWithDedup } = useRequestDeduplication<any>();

  const handleMultipleClicks = async () => {
    // Even if user clicks multiple times quickly,
    // only one API call will be made
    const results = await Promise.all([
      fetchWithDedup('user-123', () => fetchUserData('123')),
      fetchWithDedup('user-123', () => fetchUserData('123')), // Reuses first request
      fetchWithDedup('user-123', () => fetchUserData('123')), // Reuses first request
    ]);

    console.log('All results point to same data:', results);
  };

  return (
    <button onClick={handleMultipleClicks}>
      Click Me Multiple Times (Only 1 API Call!)
    </button>
  );
}

// Helper function for example
async function fetchUserData(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

/**
 * Example 5: Combining Multiple Optimizations
 * Use debouncing + deduplication for autocomplete
 */
export function OptimizedAutocomplete() {
  const [query, setQuery] = React.useState('');
  const { request: fetchWithDedup } = useRequestDeduplication<any[]>();

  const [debouncedFetch] = useDebouncedCallback(
    async (searchQuery: string) => {
      // Debounced and deduplicated
      const results = await fetchWithDedup(
        `autocomplete-${searchQuery}`,
        async () => {
          const { data } = await supabase
            .from('shared_assets')
            .select('asset->>prompt')
            .ilike('asset->>prompt', `%${searchQuery}%`)
            .limit(10);
          return data || [];
        }
      );
      
      console.log('Autocomplete results:', results);
    },
    300
  );

  return (
    <input
      type="text"
      placeholder="Type to search..."
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        if (e.target.value.length > 2) {
          debouncedFetch(e.target.value);
        }
      }}
    />
  );
}

// Import React for examples
import React from 'react';
