export interface InterestData {
  id: string;
  name: string;
  icon: string;
  description?: string;
  isIconEmoji: boolean;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface InterestDisplayProps {
  name: string;
  useEmoji: boolean;
  displayIcon: string;
  size: "small" | "medium" | "large";
}

export enum InterestDisplayContext {
  PROFILE = "PROFILE",
  POST = "POST",
  PLAN = "PLAN",
  EXPLORE = "EXPLORE",
  SELECTION = "SELECTION",
}

export interface InterestStatsData {
  usageCount: number;
  relatedInterests?: string[];
  popularityScore?: number;
}

export interface InterestPopularityRecord {
  id: string;
  count: number;
}

export interface InterestAnalyticsData {
  topInterests: InterestPopularityRecord[];
  totalUsageCount: number;
  updatedAt: Date;
}
