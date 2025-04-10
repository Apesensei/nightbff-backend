import {
  RelationshipDirection,
  RelationshipType,
} from "../entities/user-relationship.entity";

export class UserProfileDto {
  id: string;
  username: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
}

export class UserRelationshipResponseDto {
  id: string;
  type: RelationshipType;
  direction: RelationshipDirection;
  createdAt: Date;
  updatedAt: Date;
  message?: string;
  user: UserProfileDto;
}

export class RelationshipPaginatedResponseDto {
  items: UserRelationshipResponseDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
