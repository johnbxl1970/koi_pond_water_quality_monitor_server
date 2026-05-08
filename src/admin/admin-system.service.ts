import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const exec = promisify(execFile);

interface CpuInfo {
  model: string;
  cores: number;
  loadavg1: number;
  loadavg5: number;
  loadavg15: number;
  /** Estimated normalized utilization, 0..1. loadavg1 / cores, capped at 1. */
  loadPercent: number;
}

interface MemoryInfo {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPercent: number;
}

interface DiskInfo {
  /** The path we measured (the server's CWD). */
  path: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPercent: number;
}

interface GpuInfo {
  index: number;
  name: string;
  memoryTotalMb: number;
  memoryUsedMb: number;
  utilizationGpuPercent: number;
  utilizationMemPercent: number;
  temperatureC: number | null;
}

export interface SystemStats {
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  uptimeSec: number;
  processUptimeSec: number;
  cpu: CpuInfo;
  memory: MemoryInfo;
  disk: DiskInfo;
  /** Empty array means no GPUs detected (or nvidia-smi missing). */
  gpus: GpuInfo[];
  gpuQueryError: string | null;
}

@Injectable()
export class AdminSystemService {
  private readonly logger = new Logger(AdminSystemService.name);

  async getStats(): Promise<SystemStats> {
    const [disk, gpuResult] = await Promise.all([this.disk(), this.gpus()]);
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptimeSec: Math.floor(os.uptime()),
      processUptimeSec: Math.floor(process.uptime()),
      cpu: this.cpu(),
      memory: this.memory(),
      disk,
      gpus: gpuResult.gpus,
      gpuQueryError: gpuResult.error,
    };
  }

  private cpu(): CpuInfo {
    const cpus = os.cpus();
    const cores = cpus.length;
    const [l1, l5, l15] = os.loadavg();
    const loadPercent = cores > 0 ? Math.min(1, l1 / cores) : 0;
    return {
      model: cpus[0]?.model.trim() ?? 'unknown',
      cores,
      loadavg1: round(l1, 2),
      loadavg5: round(l5, 2),
      loadavg15: round(l15, 2),
      loadPercent: round(loadPercent, 4),
    };
  }

  private memory(): MemoryInfo {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    return {
      totalBytes: total,
      freeBytes: free,
      usedBytes: used,
      usedPercent: total > 0 ? round(used / total, 4) : 0,
    };
  }

  private async disk(): Promise<DiskInfo> {
    // Measure the volume the server runs from. statfs reports cgroup-aware
    // numbers when the process is in a container.
    const target = path.resolve(process.cwd());
    return new Promise((resolve) => {
      fs.statfs(target, (err, stats) => {
        if (err) {
          this.logger.warn(`statfs(${target}) failed: ${err.message}`);
          resolve({
            path: target,
            totalBytes: 0,
            freeBytes: 0,
            usedBytes: 0,
            usedPercent: 0,
          });
          return;
        }
        const total = Number(stats.blocks) * Number(stats.bsize);
        const free = Number(stats.bavail) * Number(stats.bsize);
        const used = total - free;
        resolve({
          path: target,
          totalBytes: total,
          freeBytes: free,
          usedBytes: used,
          usedPercent: total > 0 ? round(used / total, 4) : 0,
        });
      });
    });
  }

  private async gpus(): Promise<{ gpus: GpuInfo[]; error: string | null }> {
    // Best-effort. If nvidia-smi isn't on PATH (Mac dev box, AMD/Intel host,
    // or container without GPU passthrough) we just report no GPUs.
    try {
      const { stdout } = await exec(
        'nvidia-smi',
        [
          '--query-gpu=index,name,memory.total,memory.used,utilization.gpu,utilization.memory,temperature.gpu',
          '--format=csv,noheader,nounits',
        ],
        { timeout: 2000 },
      );
      const gpus: GpuInfo[] = [];
      for (const line of stdout.split('\n').map((l) => l.trim()).filter(Boolean)) {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length < 7) continue;
        gpus.push({
          index: parseInt(parts[0], 10),
          name: parts[1],
          memoryTotalMb: parseInt(parts[2], 10),
          memoryUsedMb: parseInt(parts[3], 10),
          utilizationGpuPercent: parseInt(parts[4], 10),
          utilizationMemPercent: parseInt(parts[5], 10),
          temperatureC: parts[6] === '[N/A]' ? null : parseInt(parts[6], 10),
        });
      }
      return { gpus, error: null };
    } catch (err) {
      const msg = (err as { code?: string; message: string }).code === 'ENOENT'
        ? 'nvidia-smi not found'
        : (err as Error).message;
      return { gpus: [], error: msg };
    }
  }
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
