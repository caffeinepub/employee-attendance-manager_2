import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { useInternetIdentity } from "./useInternetIdentity";

const ACTOR_QUERY_KEY = "actor";

async function createVerifiedActor(
  options?: Parameters<typeof createActorWithConfig>[0],
): Promise<backendInterface> {
  const actor = await createActorWithConfig(options);
  // Verify the backend is reachable by calling a real endpoint
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await actor.getAllEmployees();
      return actor;
    } catch (e) {
      lastError = e;
      if (attempt < 4) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }
  throw lastError;
}

export function useActor() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const actorQuery = useQuery<backendInterface>({
    queryKey: [ACTOR_QUERY_KEY, identity?.getPrincipal().toString()],
    queryFn: async () => {
      const isAuthenticated = !!identity;

      if (!isAuthenticated) {
        return await createVerifiedActor();
      }

      return await createVerifiedActor({
        agentOptions: { identity },
      });
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: 2,
    retryDelay: 3000,
    enabled: true,
  });

  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
      queryClient.refetchQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching || actorQuery.isLoading,
  };
}
