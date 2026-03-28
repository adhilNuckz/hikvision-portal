import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HikModule } from './hik/hik.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    HikModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
