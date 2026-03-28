import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HikService } from './hik.service';
import { HikController } from './hik.controller';

@Module({
  imports: [HttpModule],
  providers: [HikService],
  controllers: [HikController],
})
export class HikModule {}
