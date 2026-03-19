import { Server, Socket } from 'socket.io';
import { RoomManager, RoomConfig } from './room-manager';

export function setupSocketHandlers(io: Server): void {
  const manager = new RoomManager(io);

  // Cleanup empty rooms every 5 minutes
  setInterval(() => manager.cleanup(), 5 * 60 * 1000);

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

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
      handleLeave(socket, manager, io);
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
