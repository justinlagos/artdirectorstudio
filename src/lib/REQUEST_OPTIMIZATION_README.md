# Request Optimization Guide

This guide explains how to use the request optimization utilities to reduce redundant network requests and improve application performance.

## Features

### 1. **Debouncing** 
Delays execution until after a period of inactivity. Perfect for search inputs and auto-save features.

```tsx
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

const [debouncedSearch, { cancel, flush }] = useDebouncedCallback(
  async (searchTerm: string) => {
    // API call here
  },
  500 // 500ms delay
);

// Use it
<input onChange={(e) => debouncedSearch(e.target.value)} />

// Cancel pending calls
cancel();

// Execute immediately
flush();
```

### 2. **Request Batching**
Combines multiple requests into a single API call within a time window.

```tsx
import { useBatchedRequests } from '@/hooks/useBatchedRequests';

const { request } = useBatchedRequests<string, User>(
  async (userIds) => {
    // Batch fetch all users
    const { data } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds);
    
    return new Map(data.map(user => [user.id, user]));
  },
  {
    batchDelay: 50,      // Wait 50ms to collect requests
    maxBatchSize: 100,   // Max items per batch
  }
);

// Multiple calls within 50ms are batched into one
const user1 = await request('user-1');
const user2 = await request('user-2'); // Combined with above
```

### 3. **Request Deduplication**
Prevents duplicate concurrent requests with the same key.

```tsx
import { useRequestDeduplication } from '@/hooks/useRequestDeduplication';

const { request } = useRequestDeduplication<User>();

// Multiple concurrent calls return the same promise
const results = await Promise.all([
  request('user-123', () => fetchUser('123')),
  request('user-123', () => fetchUser('123')), // Reuses first call
  request('user-123', () => fetchUser('123')), // Reuses first call
]);
```

### 4. **Debounced Queries**
React Query integration with automatic debouncing.

```tsx
import { useDebouncedQuery } from '@/hooks/useOptimizedQuery';

const { data } = useDebouncedQuery(
  ['search', searchTerm],
  async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .ilike('name', `%${searchTerm}%`);
    return data;
  },
  {
    debounceDelay: 500,
    enabled: searchTerm.length > 2,
  }
);
```

### 5. **Optimized Queries**
React Query with caching and deduplication built-in.

```tsx
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';

const { data } = useOptimizedQuery({
  queryKey: ['user', userId],
  queryFn: async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  },
  enableCache: true,
  cacheTTL: 60000, // 1 minute
  enableDeduplication: true,
});
```

## Performance Benefits

### Before Optimization
```tsx
// ❌ Problem: 100 API calls for 100 items
items.forEach(item => {
  fetchUser(item.userId); // Separate API call each time
});
```

### After Optimization
```tsx
// ✅ Solution: 1 API call for all items (batched)
const { request: fetchUser } = useBatchedRequests(batchFetcher);
items.forEach(item => {
  fetchUser(item.userId); // Automatically batched
});
```

### Search Input Optimization

Before:
```tsx
// ❌ Problem: API call on every keystroke
<input onChange={(e) => searchAPI(e.target.value)} />
```

After:
```tsx
// ✅ Solution: Single API call after user stops typing
const [debouncedSearch] = useDebouncedCallback(searchAPI, 500);
<input onChange={(e) => debouncedSearch(e.target.value)} />
```

## Best Practices

1. **Use debouncing for user input** (search, filters, auto-save)
2. **Use batching for list items** (user profiles, thumbnails, metadata)
3. **Use deduplication for high-traffic endpoints** (user data, settings)
4. **Combine strategies** for maximum efficiency

## Real-World Example: Gallery Page

```tsx
export function GalleryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Debounced search query
  const { data: searchResults } = useDebouncedQuery(
    ['gallery-search', searchTerm],
    async () => {
      const { data } = await supabase
        .from('shared_assets')
        .select('*')
        .ilike('asset->>prompt', `%${searchTerm}%`)
        .limit(50);
      return data;
    },
    { debounceDelay: 500 }
  );
  
  // Batched user profile fetching
  const { request: fetchProfile } = useBatchedRequests(
    async (userIds) => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      return new Map(data?.map(p => [p.id, p]) || []);
    }
  );
  
  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      
      {searchResults?.map(item => (
        <GalleryItem
          key={item.id}
          item={item}
          // Profile will be batched automatically
          fetchProfile={fetchProfile}
        />
      ))}
    </div>
  );
}
```

## Monitoring

All utilities include console logging in development mode:
- Debounce: Shows when calls are cancelled vs executed
- Batching: Logs batch sizes and timing
- Deduplication: Shows when requests are reused

Check your browser console to see optimization in action!
