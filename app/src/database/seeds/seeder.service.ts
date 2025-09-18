import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole, UserStatus } from '../../microservices/auth/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed() {
    this.logger.log('🌱 Starting seeding process...');
    await this.seedAdminUser();
    await this.seedTestUser();
    this.logger.log('✅ Seeding complete.');
  }

  private async seedAdminUser() {
    const adminEmail = 'admin-loadtest@nightbff.dev';
    let existingAdmin = null;
    try {
        existingAdmin = await this.userRepository.findOne({ where: { email: adminEmail } });
    } catch (e) {
        this.logger.error('Error finding user. This may be expected if migrations just ran.');
        this.logger.error(e.message);
    }


    if (existingAdmin) {
      this.logger.log('Admin user already exists. Skipping creation.');
      return;
    }

    this.logger.log('Creating admin user for performance testing...');
    const admin = this.userRepository.create({
      email: adminEmail,
      username: 'admin_loadtest',
      displayName: 'Admin Load Test User',
      passwordHash: 'password123', // Will be automatically hashed by User entity @BeforeInsert decorator
      roles: [UserRole.ADMIN, UserRole.USER],
      isVerified: true,
      isAgeVerified: true,
      status: UserStatus.ACTIVE
    });

    try {
        await this.userRepository.save(admin);
        this.logger.log('Admin user created successfully.');
    } catch (e) {
        this.logger.error('Could not save admin user');
        this.logger.error(e.message)
    }

  }

  private async seedTestUser() {
    const testEmail = 'test@example.com';
    let existingTestUser = null;
    try {
        existingTestUser = await this.userRepository.findOne({ where: { email: testEmail } });
    } catch (e) {
        this.logger.error('Error finding test user. This may be expected if migrations just ran.');
        this.logger.error(e.message);
    }

    if (existingTestUser) {
      this.logger.log('Test user already exists. Skipping creation.');
      return;
    }

    this.logger.log('Creating test user for Cypress E2E tests...');
    const testUser = this.userRepository.create({
      email: testEmail,
      username: 'testuser',
      displayName: 'Test User',
      passwordHash: 'password123', // Will be automatically hashed by User entity @BeforeInsert decorator
      roles: [UserRole.USER],
      isVerified: true,
      isAgeVerified: true,
      status: UserStatus.ACTIVE
    });

    try {
        await this.userRepository.save(testUser);
        this.logger.log('Test user created successfully.');
    } catch (e) {
        this.logger.error('Could not save test user');
        this.logger.error(e.message)
    }
  }
} 