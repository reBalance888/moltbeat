/**
 * WebSocket Room Management
 * Utilities for managing WebSocket rooms and subscriptions
 */

export interface Room {
  name: string;
  subscribers: number;
  createdAt: number;
}

export class RoomManager {
  private rooms: Map<string, Set<string>> = new Map();

  /**
   * Add client to room
   */
  addToRoom(clientId: string, room: string): void {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(clientId);
  }

  /**
   * Remove client from room
   */
  removeFromRoom(clientId: string, room: string): void {
    this.rooms.get(room)?.delete(clientId);

    if (this.rooms.get(room)?.size === 0) {
      this.rooms.delete(room);
    }
  }

  /**
   * Remove client from all rooms
   */
  removeFromAllRooms(clientId: string): void {
    for (const [room, clients] of this.rooms.entries()) {
      clients.delete(clientId);

      if (clients.size === 0) {
        this.rooms.delete(room);
      }
    }
  }

  /**
   * Get all rooms for client
   */
  getClientRooms(clientId: string): string[] {
    const rooms: string[] = [];

    for (const [room, clients] of this.rooms.entries()) {
      if (clients.has(clientId)) {
        rooms.push(room);
      }
    }

    return rooms;
  }

  /**
   * Get all clients in room
   */
  getRoomClients(room: string): string[] {
    return Array.from(this.rooms.get(room) || []);
  }

  /**
   * Get room statistics
   */
  getRoomStats(): Room[] {
    return Array.from(this.rooms.entries()).map(([name, subscribers]) => ({
      name,
      subscribers: subscribers.size,
      createdAt: Date.now(),
    }));
  }

  /**
   * Get total subscribers across all rooms
   */
  getTotalSubscribers(): number {
    return Array.from(this.rooms.values()).reduce((sum, clients) => sum + clients.size, 0);
  }

  /**
   * Check if room exists
   */
  hasRoom(room: string): boolean {
    return this.rooms.has(room);
  }

  /**
   * Get room count
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Clear all rooms
   */
  clear(): void {
    this.rooms.clear();
  }
}
