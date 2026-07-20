import { Module } from '@nestjs/common';
import { SkusService } from './skus.service';
import { SkusController } from './skus.controller';

@Module({
  controllers: [SkusController],
  providers: [SkusService],
})
export class SkusModule {}
