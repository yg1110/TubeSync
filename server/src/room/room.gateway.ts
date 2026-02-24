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

  getServer(): Server | null {
    return this.server ?? null;
  }

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
    socket.emit('ROOM_STATE', {
      state: this.state.toView(),
      serverNowMs: Date.now(),
    });

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

    // 큐 업데이트 먼저
    this.server.emit('QUEUE_UPDATE', { queue: this.state.queue });

    // 현재 재생이 없으면 즉시 시작
    if (!this.state.playback.currentVideoId) {
      const beforeChatLen = this.state.chat.length;
      this.logic.startNext('QUEUE_FILLED');

      // 큐가 pop되었을 수도 있으니 한번 더 갱신
      this.server.emit('QUEUE_UPDATE', { queue: this.state.queue });

      // playback 브로드캐스트 (서버 시각 포함해 클라이언트 동기화용)
      this.server.emit('PLAYBACK_UPDATE', {
        playback: this.state.playback,
        serverNowMs: Date.now(),
      });

      // (지금은 투표 없음) skipVote는 null로 브로드캐스트하지 않아도 됨

      // SYSTEM 메시지 등 chat 변화분 브로드캐스트
      for (let i = beforeChatLen; i < this.state.chat.length; i++) {
        this.server.emit('CHAT_BROADCAST', { message: this.state.chat[i] });
      }
    }
  }

  @SubscribeMessage('PLAY_PAUSE_TOGGLE')
  onPlayPauseToggle(@ConnectedSocket() socket: Socket) {
    if (!this.logic.playPauseToggle(socket.id)) return;
    this.server.emit('PLAYBACK_UPDATE', {
      playback: this.state.playback,
      serverNowMs: Date.now(),
    });
  }

  @SubscribeMessage('PLAY_SEEK')
  onPlaySeek(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { positionSec: number },
  ) {
    const positionSec = Number(body?.positionSec);
    if (Number.isNaN(positionSec) || positionSec < 0) return;
    if (!this.logic.seek(socket.id, positionSec)) return;
    this.server.emit('PLAYBACK_UPDATE', {
      playback: this.state.playback,
      serverNowMs: Date.now(),
    });
  }

  @SubscribeMessage('VOTE_SKIP')
  onVoteSkip(@ConnectedSocket() socket: Socket) {
    const res = this.logic.voteSkip(socket.id);
    if (!res.ok) return;

    if (res.reached) {
      const beforeChatLen = this.state.chat.length;
      this.logic.startNext('VOTE_SKIP');

      this.server.emit('QUEUE_UPDATE', { queue: this.state.queue });
      this.server.emit('PLAYBACK_UPDATE', {
        playback: this.state.playback,
        serverNowMs: Date.now(),
      });
      this.server.emit('SKIP_VOTE_UPDATE', {
        skipVote: this.state.skipVote,
      });

      for (let i = beforeChatLen; i < this.state.chat.length; i++) {
        this.server.emit('CHAT_BROADCAST', {
          message: this.state.chat[i],
        });
      }
    } else {
      this.server.emit('SKIP_VOTE_UPDATE', {
        skipVote: this.state.skipVote,
      });
    }
  }

  @SubscribeMessage('VIDEO_ENDED')
  onVideoEnded(@ConnectedSocket() socket: Socket) {
    // 리더만 영상 종료를 트리거할 수 있게 제한
    if (!this.state.leaderId || socket.id !== this.state.leaderId) return;

    const beforeChatLen = this.state.chat.length;
    this.logic.startNext('VIDEO_ENDED');

    // 큐 및 재생 상태 브로드캐스트
    this.server.emit('QUEUE_UPDATE', { queue: this.state.queue });
    this.server.emit('PLAYBACK_UPDATE', {
      playback: this.state.playback,
      serverNowMs: Date.now(),
    });

    // SYSTEM 메시지 등 chat 변화분 브로드캐스트
    for (let i = beforeChatLen; i < this.state.chat.length; i++) {
      this.server.emit('CHAT_BROADCAST', {
        message: this.state.chat[i],
      });
    }
  }
}
