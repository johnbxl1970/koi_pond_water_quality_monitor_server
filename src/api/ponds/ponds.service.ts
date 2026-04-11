import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PondRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePondDto, UpdatePondDto } from './ponds.dto';

@Injectable()
export class PondsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.pond.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string, userId: string) {
    const pond = await this.prisma.pond.findFirst({
      where: { id, members: { some: { userId } } },
    });
    if (!pond) throw new NotFoundException(`Pond ${id} not found`);
    return pond;
  }

  async create(dto: CreatePondDto, userId: string) {
    return this.prisma.pond.create({
      data: {
        ...dto,
        members: {
          create: { userId, role: PondRole.OWNER },
        },
      },
    });
  }

  async update(id: string, dto: UpdatePondDto, userId: string) {
    await this.requireRole(id, userId, PondRole.OWNER);
    return this.prisma.pond.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.requireRole(id, userId, PondRole.OWNER);
    await this.prisma.pond.delete({ where: { id } });
  }

  private async requireRole(pondId: string, userId: string, role: PondRole) {
    const membership = await this.prisma.pondMember.findUnique({
      where: { pondId_userId: { pondId, userId } },
    });
    if (!membership) throw new NotFoundException(`Pond ${pondId} not found`);
    if (membership.role !== role) {
      throw new ForbiddenException(`Requires pond role ${role}`);
    }
  }
}
