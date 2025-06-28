export const createMockQueryBuilder = () => {
  const chainable = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
    getRawAndEntities: jest.fn(),
    getCount: jest.fn(),
  } as any;
  return chainable;
};

export const createMockRepository = () => ({
  createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
});
