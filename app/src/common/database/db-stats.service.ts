import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

interface DbStats {
  total: number;
  active: number;
  idle: number;
}

@Injectable()
export class DbStatsService {
  constructor(private readonly dataSource: DataSource) {}

  async getStats(): Promise<DbStats> {
    // Aggregates connection counts from pg_stat_activity
    const result = await this.dataSource.query(
      `SELECT
         COUNT(*)                        AS total,
         COUNT(*) FILTER (WHERE state = 'active') AS active,
         COUNT(*) FILTER (WHERE state = 'idle')   AS idle
       FROM pg_stat_activity;`,
    );

    const row = result?.[0] ?? { total: 0, active: 0, idle: 0 };
    return {
      total: Number(row.total ?? 0),
      active: Number(row.active ?? 0),
      idle: Number(row.idle ?? 0),
    };
  }
} 