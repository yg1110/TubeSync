import { Module } from '@nestjs/common';
import { RoomGateway } from './room.gateway';
import { RoomLogicService } from './room.logic.service';
import { RoomStateService } from './room.state.service';
import { SyncTickerService } from './sync-ticker.service';

@Module({
  providers: [
    RoomGateway,
    RoomLogicService,
    RoomStateService,
    SyncTickerService,
  ],
})
export class RoomModule {}
