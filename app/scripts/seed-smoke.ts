import { DataSource } from 'typeorm';
import { AppDataSource } from '../src/data-source.cli';
import { User } from '../src/microservices/auth/entities/user.entity';
import { Plan } from '../src/microservices/plan/entities/plan.entity';
import { v4 as uuid } from 'uuid';

(async () => {
  try {
    const ds: DataSource = await AppDataSource.initialize();

    const admin = ds.getRepository(User).create({
      id: uuid(),
      email: 'admin-loadtest@nightbff.dev',
      username: 'admin_loadtest',
      displayName: 'Admin Smoke User',
      passwordHash: '$2b$10$Bl3XIpaA9mxbWbklPTgRO.hGKKkzEn3orNdhXXLJfvzqitsgkp1q2', // "password123"
      roles: ['ADMIN'],
      isVerified: true,
      isAgeVerified: true,
    } as any);

    const regular = ds.getRepository(User).create({
      id: uuid(),
      email: 'smoke@nightbff.dev',
      username: 'smoke_user',
      displayName: 'Smoke Test User',
      passwordHash: '$2b$10$Bl3XIpaA9mxbWbklPTgRO.hGKKkzEn3orNdhXXLJfvzqitsgkp1q2',
      roles: ['USER'],
      isVerified: true,
      isAgeVerified: true,
    } as any);

    await ds.getRepository(User).save(admin);
    await ds.getRepository(User).save(regular);

    const plan = ds.getRepository(Plan).create({
      id: uuid(),
      ownerId: (regular as any).id,
      destination: 'San Francisco, CA',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await ds.getRepository(Plan).save(plan);

    console.log('✅ Smoke seed inserted');
    await ds.destroy();
    process.exit(0);
  } catch (e) {
    console.error('❌ Smoke seeding failed', e);
    process.exit(1);
  }
})(); 