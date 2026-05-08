import { Injectable, Logger } from '@nestjs/common';
import { execFileSync } from 'node:child_process';

export interface VersionInfo {
  /** Short git SHA (7 chars) when available, else "unknown". */
  commit: string;
  /** Where we got it from. "env" → injected at deploy time, "git" → live
   *  shell-out, "unknown" → neither worked. */
  source: 'env' | 'git' | 'unknown';
}

/** Resolved once at construction. The commit doesn't change while the
 *  process is alive, and shelling out per request would be wasteful. */
@Injectable()
export class VersionService {
  private readonly logger = new Logger(VersionService.name);
  private readonly cached: VersionInfo;

  constructor() {
    this.cached = this.resolve();
  }

  get(): VersionInfo {
    return this.cached;
  }

  private resolve(): VersionInfo {
    const fromEnv = process.env.GIT_COMMIT || process.env.GIT_SHA;
    if (fromEnv) {
      return { commit: fromEnv.slice(0, 7), source: 'env' };
    }
    try {
      const out = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 2000,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (out) return { commit: out, source: 'git' };
    } catch (err) {
      this.logger.debug(`git rev-parse failed: ${(err as Error).message}`);
    }
    return { commit: 'unknown', source: 'unknown' };
  }
}
