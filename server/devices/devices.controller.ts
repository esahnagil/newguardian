import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import type { Device, NewDevice } from '../database/schema';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  async findAll() {
    try {
      return await this.devicesService.findAll();
    } catch (error) {
      throw new HttpException(
        'Error fetching devices',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const device = await this.devicesService.findOne(parseInt(id, 10));
      if (!device) {
        throw new HttpException('Device not found', HttpStatus.NOT_FOUND);
      }
      return device;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Error fetching device',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async create(@Body() device: NewDevice) {
    try {
      return await this.devicesService.create(device);
    } catch (error) {
      throw new HttpException(
        'Error creating device',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() device: Partial<Device>) {
    try {
      const updatedDevice = await this.devicesService.update(
        parseInt(id, 10),
        device,
      );
      if (!updatedDevice) {
        throw new HttpException('Device not found', HttpStatus.NOT_FOUND);
      }
      return updatedDevice;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Error updating device',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      const deleted = await this.devicesService.delete(parseInt(id, 10));
      if (!deleted) {
        throw new HttpException('Device not found', HttpStatus.NOT_FOUND);
      }
      return { success: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Error deleting device',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
