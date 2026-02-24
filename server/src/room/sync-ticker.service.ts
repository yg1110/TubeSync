import { Injectable, OnModuleInit } from '@nestjs/common';
import { RoomGateway } from './room.gateway';

/**
 * 서버 기준 시각을 주기적으로 클라이언트에 브로드캐스트하는 타이머 서비스.
 * - SYNC_TICK 이벤트로 클라이언트 재생 위치 드리프트를 보정할 수 있게 한다.
 */
@Injectable()
export class SyncTickerService implements OnModuleInit {
  constructor(private readonly gateway: RoomGateway) {}

  onModuleInit() {
    setInterval(() => {
      const server = this.gateway.getServer();
      if (!server) return;
      server.emit('SYNC_TICK', { serverNowMs: Date.now() });
    }, 5000);
  }
}
