import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeviceDto, UpdateDeviceDto } from './devices.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  list(pondId?: string) {
    return this.prisma.device.findMany({
      where: pondId ? { pondId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const d = await this.prisma.device.findUnique({ where: { id } });
    if (!d) throw new NotFoundException(`Device ${id} not found`);
    return d;
  }

  create(dto: CreateDeviceDto) {
    return this.prisma.device.create({ data: dto });
  }

  async update(id: string, dto: UpdateDeviceDto) {
    await this.get(id);
    return this.prisma.device.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.device.delete({ where: { id } });
  }
}
