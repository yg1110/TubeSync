import { Injectable, OnModuleInit } from '@nestjs/common';
import { RoomGateway } from './room.gateway';

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
