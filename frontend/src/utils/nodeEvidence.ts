import type { SplunkEvidence } from "../api";

export const NODE_EVIDENCE_KEYS: Record<string, string[]> = {
  "deployment:deployment-v4-2": ["deployment v4.2", "deployment"],
  "service:authentication-service": ["authentication service", "authentication"],
  "event:latency-spike": ["latency", "320%"],
  "event:login-failure": ["login failure", "login errors"],
  "event:ticket": ["ticket", "240%"],
  "event:complaint": ["complaint", "complaints"],
};

export function eventMatchesNode(nodeId: string | null, event: SplunkEvidence): boolean {
  if (!nodeId) return false;
  const keys = NODE_EVIDENCE_KEYS[nodeId] ?? [];
  const hay = event.message.toLowerCase();
  return keys.some((key) => hay.includes(key));
}

export function eventMatchesNodeLoose(nodeId: string, event: SplunkEvidence): number {
  const keys = NODE_EVIDENCE_KEYS[nodeId] ?? [];
  const hay = event.message.toLowerCase();
  return keys.filter((key) => hay.includes(key)).length;
}

export function shortEventLabel(message: string): string {
  if (message.length <= 48) return message;
  return `${message.slice(0, 46)}…`;
}
