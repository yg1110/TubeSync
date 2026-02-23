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
import { RoomLogicService } from './room.logic.service';
import { RoomStateService } from './room.state.service';
import { ChatMessage } from './room.types';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly logic: RoomLogicService,
    private readonly state: RoomStateService,
  ) {}

  handleConnection(socket: Socket) {
    socket.emit('SERVER_HELLO', { socketId: socket.id });
  }

  handleDisconnect(socket: Socket) {
    this.logic.leave(socket.id);
    this.server.emit('MEMBERS_UPDATE', {
      leaderId: this.state.leaderId,
      members: this.state.members,
    });
  }

  @SubscribeMessage('JOIN')
  onJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { nickname: string },
  ) {
    const res = this.logic.join(socket.id, body?.nickname);

    if (!res.ok) {
      socket.emit('JOIN_REJECTED', { reason: res.reason });
      return;
    }

    socket.emit('JOIN_ACCEPTED', {});
    socket.emit('ROOM_STATE', { state: this.state.toView() });

    this.server.emit('MEMBERS_UPDATE', {
      leaderId: this.state.leaderId,
      members: this.state.members,
    });
  }

  @SubscribeMessage('CHAT_SEND')
  onChatSend(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { text: string },
  ) {
    const res = this.logic.addChat(socket.id, body?.text);
    if (!res.ok) return;

    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      nickname: res.nickname,
      text: res.text,
      tsMs: Date.now(),
    };

    this.state.pushChat(msg);

    this.server.emit('CHAT_BROADCAST', { message: msg });
  }

  @SubscribeMessage('QUEUE_ADD')
  onQueueAdd(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { youtubeUrl: string },
  ) {
    const res = this.logic.addQueue(socket.id, body?.youtubeUrl);

    if (!res.ok) {
      socket.emit('QUEUE_ADD_REJECTED', { reason: res.reason });
      return;
    }

    this.server.emit('QUEUE_UPDATE', { queue: this.state.queue });
  }
}
