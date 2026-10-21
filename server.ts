import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './src/server/socket-events';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
    // Be patient before declaring a client gone — a backgrounded tab or phone
    // that briefly stops sending heartbeats shouldn't be dropped mid-hand.
    pingInterval: 25000,
    pingTimeout: 60000,
    // Recover the session (same socket id, replay missed events) when a client
    // briefly drops — e.g. a backgrounded tab or a flaky network — so players
    // aren't folded out of a hand for a momentary disconnect.
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  setupSocketHandlers(io);

  httpServer.listen(port, () => {
    console.log(`> Poker server ready on http://localhost:${port}`);
    console.log(`> Socket.io server running`);
    console.log(`> Mode: ${dev ? 'development' : 'production'}`);
  });
});
