import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { HikService } from './hik.service';

@Controller('hik')
export class HikController {
  constructor(private readonly hikService: HikService) {}

  @Get('test')
  async test() {
    return this.hikService.testConnectivity();
  }

  @Get('users')
  async getUsers() {
    return this.hikService.getUsers();
  }

  @Post('users')
  async addUser(@Body() userData: any) {
    return this.hikService.addUser(userData);
  }

  @Put('users')
  async updateUser(@Body() userData: any) {
    return this.hikService.updateUser(userData);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.hikService.deleteUser(id);
  }

  @Post('open-door')
  async openDoor() {
    return this.hikService.openDoor();
  }

  @Post('upload-face')
  async uploadFace(@Body() body: { employeeNo: string, image: string }) {
    return this.hikService.uploadFace(body.employeeNo, body.image);
  }

  @Get('attendance')
  async getAttendanceLogs(@Query('start') start?: string, @Query('end') end?: string) {
    return this.hikService.getAttendanceLogs(start, end);
  }
}
