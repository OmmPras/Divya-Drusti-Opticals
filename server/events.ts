import type { Response } from 'express';

interface SseClient {
  id: string;
  userId: number;
  role: string;
  res: Response;
}

const clients = new Map<string, SseClient>();

export function addSseClient(client: SseClient) {
  clients.set(client.id, client);
}

export function removeSseClient(clientId: string) {
  clients.delete(clientId);
}

export function broadcastClinicEvent(eventType: string, payload: Record<string, unknown>) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify({
    type: eventType,
    timestamp: new Date().toISOString(),
    ...payload,
  })}\n\n`;

  for (const [id, client] of clients.entries()) {
    try {
      client.res.write(message);
    } catch {
      clients.delete(id);
    }
  }
}
