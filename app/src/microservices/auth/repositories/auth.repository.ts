import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { SupabaseProvider } from "@/common/database/supabase.provider";
import { User } from "../entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
// import { AuthProvider } from "../enums/auth-provider.enum"; // This is likely not needed here either, but keeping commented for now

@Injectable()
export class AuthRepository {
  constructor(
    private readonly supabaseProvider: SupabaseProvider,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(user: Partial<User>): Promise<User> {
    try {
      const supabase = this.supabaseProvider.getClient();

      const { data, error } = await supabase
        .from("users")
        .insert(user)
        .select()
        .single();

      if (error) {
        throw new InternalServerErrorException(
          `Error creating user: ${error.message}`,
        );
      }

      return data as User;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to create user");
    }
  }

  async getUserById(userId?: string): Promise<User | null> {
    if (!userId) {
      return null;
    }

    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        return null;
      }
      return user;
    } catch (error) {
      console.error(
        `AuthRepository Error in getUserById for ${userId}:`,
        error,
      );
      throw new InternalServerErrorException(
        `Failed to fetch user by ID: ${error.message}`,
      );
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({ where: { email } });
      return user;
    } catch (error) {
      console.error(
        `AuthRepository Error in getUserByEmail for ${email}:`,
        error,
      );
      // Only throw InternalServerErrorException for actual database errors
      // Not for "user not found" scenarios which should return null
      if (error.code === '23505' || error.code === '23503') {
        // Unique constraint violation or foreign key violation
        throw new InternalServerErrorException(
          `Database constraint error: ${error.message}`,
        );
      }
      // For other database errors, still throw InternalServerErrorException
      throw new InternalServerErrorException(
        `Failed to fetch user by email: ${error.message}`,
      );
    }
  }

  // Alias method for consistency with other repositories
  async findById(userId: string): Promise<User | null> {
    return this.getUserById(userId);
  }

  async updateAgeVerificationStatus(
    userId: string,
    isVerified: boolean,
  ): Promise<User> {
    try {
      const supabase = this.supabaseProvider.getClient();

      const { data, error } = await supabase
        .from("users")
        .update({ is_age_verified: isVerified })
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        throw new InternalServerErrorException(
          `Error updating user verification: ${error.message}`,
        );
      }

      return data as User;
    } catch {
      throw new InternalServerErrorException(
        "Failed to update user age verification status",
      );
    }
  }

  async updateProfile(
    userId: string,
    profileData: Partial<User>,
  ): Promise<User> {
    try {
      const supabase = this.supabaseProvider.getClient();

      const { data, error } = await supabase
        .from("users")
        .update(profileData)
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        throw new InternalServerErrorException(
          `Error updating user profile: ${error.message}`,
        );
      }

      return data as User;
    } catch {
      throw new InternalServerErrorException("Failed to update user profile");
    }
  }

  async updatePhotoUrl(userId: string, photoURL: string | null): Promise<User> {
    try {
      const supabase = this.supabaseProvider.getClient();

      const { data, error } = await supabase
        .from("users")
        .update({ photo_url: photoURL })
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        throw new InternalServerErrorException(
          `Error updating user photo: ${error.message}`,
        );
      }

      return data as User;
    } catch {
      throw new InternalServerErrorException("Failed to update user photo");
    }
  }
}
