import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  Repository,
  LessThan,
  MoreThanOrEqual,
  UpdateResult,
  DeleteResult,
} from "typeorm";
import { ProfileViewRepository } from "../../repositories/profile-view.repository";
import { ProfileView } from "../../entities/profile-view.entity";

describe("ProfileViewRepository", () => {
  let profileViewRepository: ProfileViewRepository;
  let typeOrmRepository: Repository<ProfileView>;

  const mockProfileViewRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfileViewRepository,
        {
          provide: getRepositoryToken(ProfileView),
          useFactory: mockProfileViewRepository,
        },
      ],
    }).compile();

    profileViewRepository = moduleRef.get<ProfileViewRepository>(
      ProfileViewRepository,
    );
    typeOrmRepository = moduleRef.get<Repository<ProfileView>>(
      getRepositoryToken(ProfileView),
    );
  });

  describe("trackView", () => {
    it("should create and save a new profile view", async () => {
      const mockProfileView = new ProfileView();
      mockProfileView.id = "pv-1";
      mockProfileView.viewerId = "viewer-id";
      mockProfileView.viewedId = "viewed-id";
      mockProfileView.anonymous = true;
      mockProfileView.isNotified = false;

      jest.spyOn(typeOrmRepository, "create").mockReturnValue(mockProfileView);
      jest.spyOn(typeOrmRepository, "save").mockResolvedValue(mockProfileView);

      const result = await profileViewRepository.trackView(
        "viewer-id",
        "viewed-id",
        true,
      );

      expect(result).toEqual(mockProfileView);
      expect(typeOrmRepository.create).toHaveBeenCalledWith({
        viewerId: "viewer-id",
        viewedId: "viewed-id",
        anonymous: true,
        isNotified: false,
      });
      expect(typeOrmRepository.save).toHaveBeenCalledWith(mockProfileView);
    });
  });

  describe("findById", () => {
    it("should find a profile view by id", async () => {
      const mockProfileView = new ProfileView();
      mockProfileView.id = "pv-1";

      jest
        .spyOn(typeOrmRepository, "findOne")
        .mockResolvedValue(mockProfileView);

      const result = await profileViewRepository.findById("pv-1");

      expect(result).toEqual(mockProfileView);
      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: "pv-1" },
      });
    });

    it("should return null if profile view not found", async () => {
      jest.spyOn(typeOrmRepository, "findOne").mockResolvedValue(null);

      const result = await profileViewRepository.findById("non-existent-id");

      expect(result).toBeNull();
    });
  });

  describe("getViewsForUser", () => {
    it("should return views for a user with pagination", async () => {
      const mockViews: ProfileView[] = [
        {
          id: "pv-1",
          viewerId: "viewer-1",
          viewedId: "user-1",
          anonymous: false,
          isNotified: false,
          createdAt: new Date(),
          viewer: null as any,
          viewed: null as any,
        },
        {
          id: "pv-2",
          viewerId: "viewer-2",
          viewedId: "user-1",
          anonymous: true,
          isNotified: false,
          createdAt: new Date(),
          viewer: null as any,
          viewed: null as any,
        },
      ];

      jest
        .spyOn(typeOrmRepository, "findAndCount")
        .mockResolvedValue([mockViews, mockViews.length]);

      const [views, count] = await profileViewRepository.getViewsForUser(
        "user-1",
        1,
        10,
      );

      expect(views).toEqual(mockViews);
      expect(count).toBe(mockViews.length);
      expect(typeOrmRepository.findAndCount).toHaveBeenCalledWith({
        where: { viewedId: "user-1" },
        relations: ["viewer"],
        order: { createdAt: "DESC" },
        skip: 0,
        take: 10,
      });
    });
  });

  describe("countRecentViews", () => {
    it("should count views within a specific timeframe", async () => {
      jest.spyOn(typeOrmRepository, "count").mockResolvedValue(5);

      const result = await profileViewRepository.countRecentViews("user-1", 24);

      expect(result).toBe(5);
      expect(typeOrmRepository.count).toHaveBeenCalledWith({
        where: {
          viewedId: "user-1",
          createdAt: MoreThanOrEqual(expect.any(Date)),
        },
      });
    });
  });

  describe("countUniqueViewersForUser", () => {
    it("should count unique viewers for a user", async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: "3" }),
      };

      jest
        .spyOn(typeOrmRepository, "createQueryBuilder")
        .mockReturnValue(mockQueryBuilder as any);

      const result =
        await profileViewRepository.countUniqueViewersForUser("user-1");

      expect(result).toBe(3);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        "COUNT(DISTINCT view.viewerId)",
        "count",
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "view.viewedId = :viewedId",
        {
          viewedId: "user-1",
        },
      );
    });
  });

  describe("hasUserViewedProfileWithinTimeframe", () => {
    it("should return true if user viewed profile within timeframe", async () => {
      jest.spyOn(typeOrmRepository, "count").mockResolvedValue(1);

      const result =
        await profileViewRepository.hasUserViewedProfileWithinTimeframe(
          "viewer-1",
          "viewed-1",
          24,
        );

      expect(result).toBe(true);
      expect(typeOrmRepository.count).toHaveBeenCalledWith({
        where: {
          viewerId: "viewer-1",
          viewedId: "viewed-1",
          createdAt: MoreThanOrEqual(expect.any(Date)),
        },
      });
    });

    it("should return false if user has not viewed profile within timeframe", async () => {
      jest.spyOn(typeOrmRepository, "count").mockResolvedValue(0);

      const result =
        await profileViewRepository.hasUserViewedProfileWithinTimeframe(
          "viewer-1",
          "viewed-1",
          24,
        );

      expect(result).toBe(false);
    });
  });

  describe("markAsNotified", () => {
    it("should mark a profile view as notified", async () => {
      const mockUpdateResult: UpdateResult = {
        affected: 1,
        raw: [],
        generatedMaps: [],
      };
      jest
        .spyOn(typeOrmRepository, "update")
        .mockResolvedValue(mockUpdateResult);

      await profileViewRepository.markAsNotified("pv-1");

      expect(typeOrmRepository.update).toHaveBeenCalledWith("pv-1", {
        isNotified: true,
      });
    });
  });

  describe("purgeOldViews", () => {
    it("should delete views older than specified days", async () => {
      const mockDeleteResult: DeleteResult = { affected: 1, raw: [] };
      jest
        .spyOn(typeOrmRepository, "delete")
        .mockResolvedValue(mockDeleteResult);

      await profileViewRepository.purgeOldViews(30);

      expect(typeOrmRepository.delete).toHaveBeenCalledWith({
        createdAt: LessThan(expect.any(Date)),
      });
    });
  });
});
