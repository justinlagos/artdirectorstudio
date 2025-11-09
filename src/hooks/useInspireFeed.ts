import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { InspireProject } from "@/types/inspire";
import {
  detachRealtimeChannel,
  fetchInspireProjectById,
  fetchInspireProjects,
  matchesInspireFilter,
  sortInspireProjects,
  subscribeToInspireTable,
  type InspireFilter,
} from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseInspireFeedOptions {
  filter?: InspireFilter;
  pageSize?: number;
  realtimeKey?: string;
}

interface UseInspireFeedResult {
  projects: InspireProject[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setProjects: Dispatch<SetStateAction<InspireProject[]>>;
}

const DEFAULT_PAGE_SIZE = 24;

export const useInspireFeed = ({
  filter = "all",
  pageSize = DEFAULT_PAGE_SIZE,
  realtimeKey = "inspire-feed",
}: UseInspireFeedOptions = {}): UseInspireFeedResult => {
  const [projects, setProjects] = useState<InspireProject[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const resetAbortController = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    return controller.signal;
  }, []);

  const dedupeProjects = useCallback((items: InspireProject[]) => {
    const map = new Map<string, InspireProject>();
    items.forEach((item) => {
      map.set(item.id, item);
    });
    return Array.from(map.values());
  }, []);

  const fetchPage = useCallback(
    async (page: number, append = false) => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const signal = resetAbortController();

      const { data, count, error: fetchError } = await fetchInspireProjects({
        filter,
        from,
        to,
        abortSignal: signal,
      });

      if (fetchError) {
        console.error('[useInspireFeed] Fetch error:', fetchError);
        setError("Unable to load Inspire projects. Please try again.");
        throw fetchError;
      }

      setError(null);
      const dataArray = Array.isArray(data) ? data : [];
      setProjects((prev) => {
        const combined = append ? [...prev, ...dataArray] : dataArray;
        return sortInspireProjects(dedupeProjects(combined));
      });

      if (typeof count === "number") {
        setHasMore((from + dataArray.length) < count);
      } else {
        setHasMore(dataArray.length === pageSize);
      }
    },
    [dedupeProjects, filter, pageSize, resetAbortController]
  );

  const refresh = useCallback(async () => {
    pageRef.current = 0;
    setIsInitialLoading(true);
    try {
      await fetchPage(0, false);
    } finally {
      setIsInitialLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      await fetchPage(nextPage, true);
      pageRef.current = nextPage;
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchPage, hasMore, isLoadingMore]);

  useEffect(() => {
    refresh();

    return () => {
      pageRef.current = 0;
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [filter, pageSize, refresh]);

  useEffect(() => {
    if (channelRef.current) {
      detachRealtimeChannel(channelRef.current);
    }

    const channel = subscribeToInspireTable(realtimeKey, async (payload) => {
      const newRow = payload.new as InspireProject | null;
      const oldRow = payload.old as InspireProject | null;

      if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
        const targetId = newRow?.id;
        if (!targetId) return;

        try {
          const fresh = await fetchInspireProjectById(targetId);
          if (fresh && matchesInspireFilter(fresh, filter)) {
            setProjects((prev) => {
              const filtered = prev.filter((item) => item.id !== fresh.id);
              return sortInspireProjects([...filtered, fresh]);
            });
          } else if (fresh === null) {
            setProjects((prev) => prev.filter((item) => item.id !== targetId));
          } else if (!matchesInspireFilter(fresh, filter)) {
            setProjects((prev) => prev.filter((item) => item.id !== targetId));
          }
        } catch (err) {
          console.error("Realtime sync failed", err);
        }
        return;
      }

      if (payload.eventType === "DELETE") {
        const deletedId = oldRow?.id ?? payload.old?.id;
        if (deletedId) {
          setProjects((prev) => prev.filter((item) => item.id !== deletedId));
        }
      }
    });

    channelRef.current = channel;

    return () => {
      detachRealtimeChannel(channel);
    };
  }, [filter, realtimeKey]);

  const memoisedProjects = useMemo(() => sortInspireProjects(projects), [projects]);

  return {
    projects: memoisedProjects,
    isInitialLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    setProjects,
  };
};

