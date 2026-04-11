import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PondRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeviceDto, UpdateDeviceDto } from './devices.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, pondId?: string) {
    if (pondId) {
      await this.requireMember(pondId, userId);
      return this.prisma.device.findMany({
        where: { pondId },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prisma.device.findMany({
      where: { pond: { members: { some: { userId } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string, userId: string) {
    const d = await this.prisma.device.findFirst({
      where: { id, pond: { members: { some: { userId } } } },
    });
    if (!d) throw new NotFoundException(`Device ${id} not found`);
    return d;
  }

  async create(dto: CreateDeviceDto, userId: string) {
    await this.requireRole(dto.pondId, userId, PondRole.OWNER);
    return this.prisma.device.create({ data: dto });
  }

  async update(id: string, dto: UpdateDeviceDto, userId: string) {
    const device = await this.get(id, userId);
    await this.requireRole(device.pondId, userId, PondRole.OWNER);
    return this.prisma.device.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    const device = await this.get(id, userId);
    await this.requireRole(device.pondId, userId, PondRole.OWNER);
    await this.prisma.device.delete({ where: { id } });
  }

  private async requireMember(pondId: string, userId: string) {
    const m = await this.prisma.pondMember.findUnique({
      where: { pondId_userId: { pondId, userId } },
    });
    if (!m) throw new NotFoundException(`Pond ${pondId} not found`);
  }

  private async requireRole(pondId: string, userId: string, role: PondRole) {
    const m = await this.prisma.pondMember.findUnique({
      where: { pondId_userId: { pondId, userId } },
    });
    if (!m) throw new NotFoundException(`Pond ${pondId} not found`);
    if (m.role !== role) throw new ForbiddenException(`Requires pond role ${role}`);
  }
}
