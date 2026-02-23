import { Module } from '@nestjs/common';
import { RoomGateway } from './room.gateway';
import { RoomLogicService } from './room.logic.service';
import { RoomStateService } from './room.state.service';

@Module({
  providers: [RoomGateway, RoomLogicService, RoomStateService],
})
export class RoomModule {}
