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
      passwordHash: 'password123', // In a real app, this would be a proper hash. Entity listener handles it.
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
} 