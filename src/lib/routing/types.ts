import type { DestinationId, RoutePayload } from "@/types";

export interface RouteResult {
  destination: DestinationId;
  ok: boolean;
  message: string;
}

export type Router = (payload: RoutePayload) => Promise<RouteResult>;
