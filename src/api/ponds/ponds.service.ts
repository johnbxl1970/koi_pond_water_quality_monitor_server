import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePondDto, UpdatePondDto } from './ponds.dto';

@Injectable()
export class PondsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.pond.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const pond = await this.prisma.pond.findUnique({ where: { id } });
    if (!pond) throw new NotFoundException(`Pond ${id} not found`);
    return pond;
  }

  create(dto: CreatePondDto) {
    return this.prisma.pond.create({ data: dto });
  }

  async update(id: string, dto: UpdatePondDto) {
    await this.get(id);
    return this.prisma.pond.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.pond.delete({ where: { id } });
  }
}
