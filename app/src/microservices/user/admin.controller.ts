import { Controller, Get, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

interface DbStatRow {
  state: string;
  count: number;
}

interface DbStats {
  total: number;
  active: number;
  idle: number;
  idle_in_transaction: number;
  [key: string]: number;
}

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('db-stats')
  @Roles(UserRole.ADMIN)
  async getDbStats(): Promise<DbStats> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const results: DbStatRow[] = await queryRunner.query(
        "SELECT state, count(*)::int FROM pg_stat_activity GROUP BY state",
      );

      const stats = results.reduce(
        (acc: DbStats, row: DbStatRow) => {
          const stateKey = row.state.replace(/ /g, '_');
          acc[stateKey] = row.count;
          acc.total += row.count;
          return acc;
        },
        { total: 0, active: 0, idle: 0, idle_in_transaction: 0 },
      );

      return stats;
    } finally {
      await queryRunner.release();
    }
  }
} 