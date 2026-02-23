import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  handleConnection(socket: Socket) {
    console.log('[socket] connected:', socket.id);
    socket.emit('SERVER_HELLO', { socketId: socket.id });
  }

  handleDisconnect(socket: Socket) {
    console.log('[socket] disconnected:', socket.id);
  }

  @SubscribeMessage('PING')
  onPing(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { t?: number },
  ) {
    socket.emit('PONG', { t: body?.t ?? Date.now(), serverNowMs: Date.now() });
  }
}
