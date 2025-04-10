import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { SupabaseProvider } from "@/common/database/supabase.provider";
import { User } from "../entities/user.entity";

@Injectable()
export class AuthRepository {
  constructor(private readonly supabaseProvider: SupabaseProvider) {}

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
      const supabase = this.supabaseProvider.getClient();

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new NotFoundException(`User with ID ${userId} not found`);
        }
        throw new InternalServerErrorException(
          `Error fetching user: ${error.message}`,
        );
      }

      return data as User;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to fetch user");
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const supabase = this.supabaseProvider.getClient();

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw new InternalServerErrorException(
          `Error fetching user: ${error.message}`,
        );
      }

      return data as User;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException("Failed to fetch user by email");
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
