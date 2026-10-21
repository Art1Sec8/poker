import { Server, Socket } from 'socket.io';
import { RoomManager, RoomConfig } from './room-manager';

// How long to keep a disconnected player in their seat before folding/removing
// them, giving brief drops (backgrounded tab, flaky wifi) time to recover.
// This MUST be >= server.ts connectionStateRecovery.maxDisconnectionDuration,
// otherwise the grace timer fires first and evicts the player (removing them
// from room.players) before connectionStateRecovery can resync them — capping
// the advertised recovery window and leaving "recovered" sockets seatless.
const DISCONNECT_GRACE_MS = 2 * 60 * 1000;

export function setupSocketHandlers(io: Server): void {
  const manager = new RoomManager(io);
  // socketId -> pending removal timer for a player who just disconnected.
  const disconnectTimers = new Map<string, NodeJS.Timeout>();

  // Cleanup empty rooms every 5 minutes
  setInterval(() => manager.cleanup(), 5 * 60 * 1000);

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}${socket.recovered ? ' (recovered)' : ''}`);

    // If this socket recovered a prior session (same id), cancel its pending
    // removal — the player never really left.
    const pending = disconnectTimers.get(socket.id);
    if (pending) {
      clearTimeout(pending);
      disconnectTimers.delete(socket.id);
    }
    // Re-send current room/game state so a recovered client resyncs instantly.
    if (socket.recovered) {
      manager.findRoomBySocket(socket.id)?.resyncPlayer(socket.id);
    }

    socket.on('create-room', (config: RoomConfig, name: string) => {
      const room = manager.createRoom(config, socket.id);
      const result = room.join(socket.id, name);
      if ('error' in result) {
        socket.emit('error', result.error);
        return;
      }
      socket.join(room.id);
      socket.emit('room-created', { code: room.id });
      io.to(room.id).emit('room-state', room.getRoomState());
    });

    socket.on('join-room', (code: string, name: string) => {
      const room = manager.getRoom(code);
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      const result = room.join(socket.id, name);
      if ('error' in result) {
        socket.emit('error', result.error);
        return;
      }

      socket.join(room.id);
      socket.emit('room-joined', { code: room.id, seatIndex: result.seatIndex });
      io.to(room.id).emit('room-state', room.getRoomState());
      io.to(room.id).emit('chat', {
        sender: 'System',
        text: `${name} joined the room`,
        timestamp: Date.now(),
      });
    });

    socket.on('leave-room', () => {
      handleLeave(socket, manager, io);
    });

    socket.on('toggle-ready', () => {
      const room = manager.findRoomBySocket(socket.id);
      if (!room) return;
      room.toggleReady(socket.id);
      io.to(room.id).emit('room-state', room.getRoomState());
    });

    socket.on('start-game', () => {
      const room = manager.findRoomBySocket(socket.id);
      if (!room) return;
      if (socket.id !== room.hostSocketId) {
        socket.emit('error', 'Only the host can start the game');
        return;
      }
      const result = room.startHand();
      if (result.error) {
        socket.emit('error', result.error);
      }
    });

    socket.on('start-hand', () => {
      const room = manager.findRoomBySocket(socket.id);
      if (!room) return;
      if (socket.id !== room.hostSocketId) {
        socket.emit('error', 'Only the host can deal');
        return;
      }
      const result = room.startHand();
      if (result.error) {
        socket.emit('error', result.error);
      }
    });

    socket.on('player-action', (data: { type: string; amount?: number }) => {
      const room = manager.findRoomBySocket(socket.id);
      if (!room) return;
      const result = room.handleAction(
        socket.id,
        data.type as any,
        data.amount ?? 0,
      );
      if (result.error) {
        socket.emit('error', result.error);
      }
    });

    socket.on('chat-message', (text: string) => {
      const room = manager.findRoomBySocket(socket.id);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (!player) return;
      room.addChat(player.name, text);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      // Don't remove immediately — give the client a grace period to recover
      // (connectionStateRecovery reuses the same socket id). If they don't come
      // back in time, fold and remove them then.
      if (disconnectTimers.has(socket.id)) return;
      const timer = setTimeout(() => {
        disconnectTimers.delete(socket.id);
        handleLeave(socket, manager, io);
      }, DISCONNECT_GRACE_MS);
      disconnectTimers.set(socket.id, timer);
    });
  });
}

function handleLeave(socket: Socket, manager: RoomManager, io: Server): void {
  const room = manager.findRoomBySocket(socket.id);
  if (!room) return;

  const player = room.players.get(socket.id);
  const name = player?.name ?? 'Unknown';

  room.leave(socket.id);
  socket.leave(room.id);

  if (room.playerCount === 0) {
    manager.deleteRoom(room.id);
  } else {
    io.to(room.id).emit('room-state', room.getRoomState());
    io.to(room.id).emit('chat', {
      sender: 'System',
      text: `${name} left the room`,
      timestamp: Date.now(),
    });
  }
}
