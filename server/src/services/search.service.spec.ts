import { mapAsset } from 'src/dtos/asset-response.dto';
import { SearchDto } from 'src/dtos/search.dto';
import { SystemConfigKey } from 'src/entities/system-config.entity';
import { IAssetRepository } from 'src/interfaces/asset.interface';
import { ILoggerRepository } from 'src/interfaces/logger.interface';
import { IMachineLearningRepository } from 'src/interfaces/machine-learning.interface';
import { IMetadataRepository } from 'src/interfaces/metadata.interface';
import { IPartnerRepository } from 'src/interfaces/partner.interface';
import { IPersonRepository } from 'src/interfaces/person.interface';
import { ISearchRepository } from 'src/interfaces/search.interface';
import { ISystemConfigRepository } from 'src/interfaces/system-config.interface';
import { SearchService } from 'src/services/search.service';
import { assetStub } from 'test/fixtures/asset.stub';
import { authStub } from 'test/fixtures/auth.stub';
import { personStub } from 'test/fixtures/person.stub';
import { newAssetRepositoryMock } from 'test/repositories/asset.repository.mock';
import { newLoggerRepositoryMock } from 'test/repositories/logger.repository.mock';
import { newMachineLearningRepositoryMock } from 'test/repositories/machine-learning.repository.mock';
import { newMetadataRepositoryMock } from 'test/repositories/metadata.repository.mock';
import { newPartnerRepositoryMock } from 'test/repositories/partner.repository.mock';
import { newPersonRepositoryMock } from 'test/repositories/person.repository.mock';
import { newSearchRepositoryMock } from 'test/repositories/search.repository.mock';
import { newSystemConfigRepositoryMock } from 'test/repositories/system-config.repository.mock';
import { Mocked, vitest } from 'vitest';

vitest.useFakeTimers();

describe(SearchService.name, () => {
  let sut: SearchService;
  let assetMock: Mocked<IAssetRepository>;
  let configMock: Mocked<ISystemConfigRepository>;
  let machineMock: Mocked<IMachineLearningRepository>;
  let personMock: Mocked<IPersonRepository>;
  let searchMock: Mocked<ISearchRepository>;
  let partnerMock: Mocked<IPartnerRepository>;
  let metadataMock: Mocked<IMetadataRepository>;
  let loggerMock: Mocked<ILoggerRepository>;

  beforeEach(() => {
    assetMock = newAssetRepositoryMock();
    configMock = newSystemConfigRepositoryMock();
    machineMock = newMachineLearningRepositoryMock();
    personMock = newPersonRepositoryMock();
    searchMock = newSearchRepositoryMock();
    partnerMock = newPartnerRepositoryMock();
    metadataMock = newMetadataRepositoryMock();
    loggerMock = newLoggerRepositoryMock();

    sut = new SearchService(
      configMock,
      machineMock,
      personMock,
      searchMock,
      assetMock,
      partnerMock,
      metadataMock,
      loggerMock,
    );
  });

  it('should work', () => {
    expect(sut).toBeDefined();
  });

  describe('searchPerson', () => {
    it('should pass options to search', async () => {
      const { name } = personStub.withName;

      await sut.searchPerson(authStub.user1, { name, withHidden: false });

      expect(personMock.getByName).toHaveBeenCalledWith(authStub.user1.user.id, name, { withHidden: false });

      await sut.searchPerson(authStub.user1, { name, withHidden: true });

      expect(personMock.getByName).toHaveBeenCalledWith(authStub.user1.user.id, name, { withHidden: true });
    });
  });

  describe('getExploreData', () => {
    it('should get assets by city and tag', async () => {
      assetMock.getAssetIdByCity.mockResolvedValueOnce({
        fieldName: 'exifInfo.city',
        items: [{ value: 'Paris', data: assetStub.image.id }],
      });
      assetMock.getAssetIdByTag.mockResolvedValueOnce({
        fieldName: 'smartInfo.tags',
        items: [{ value: 'train', data: assetStub.imageFrom2015.id }],
      });
      assetMock.getByIdsWithAllRelations.mockResolvedValueOnce([assetStub.image, assetStub.imageFrom2015]);
      const expectedResponse = [
        { fieldName: 'exifInfo.city', items: [{ value: 'Paris', data: mapAsset(assetStub.image) }] },
        { fieldName: 'smartInfo.tags', items: [{ value: 'train', data: mapAsset(assetStub.imageFrom2015) }] },
      ];

      const result = await sut.getExploreData(authStub.user1);

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('search', () => {
    it('should throw an error if query is missing', async () => {
      await expect(sut.search(authStub.user1, { q: '' })).rejects.toThrow('Missing query');
    });

    it('should search by metadata if `clip` option is false', async () => {
      const dto: SearchDto = { q: 'test query', clip: false };
      assetMock.searchMetadata.mockResolvedValueOnce([assetStub.image]);
      partnerMock.getAll.mockResolvedValueOnce([]);
      const expectedResponse = {
        albums: {
          total: 0,
          count: 0,
          items: [],
          facets: [],
        },
        assets: {
          total: 1,
          count: 1,
          items: [mapAsset(assetStub.image)],
          facets: [],
          nextPage: null,
        },
      };

      const result = await sut.search(authStub.user1, dto);

      expect(result).toEqual(expectedResponse);
      expect(assetMock.searchMetadata).toHaveBeenCalledWith(dto.q, [authStub.user1.user.id], { numResults: 250 });
      expect(searchMock.searchSmart).not.toHaveBeenCalled();
    });

    it('should search archived photos if `withArchived` option is true', async () => {
      const dto: SearchDto = { q: 'test query', clip: true, withArchived: true };
      const embedding = [1, 2, 3];
      searchMock.searchSmart.mockResolvedValueOnce({ items: [assetStub.image], hasNextPage: false });
      machineMock.encodeText.mockResolvedValueOnce(embedding);
      partnerMock.getAll.mockResolvedValueOnce([]);
      const expectedResponse = {
        albums: {
          total: 0,
          count: 0,
          items: [],
          facets: [],
        },
        assets: {
          total: 1,
          count: 1,
          items: [mapAsset(assetStub.image)],
          facets: [],
          nextPage: null,
        },
      };

      const result = await sut.search(authStub.user1, dto);

      expect(result).toEqual(expectedResponse);
      expect(searchMock.searchSmart).toHaveBeenCalledWith(
        { page: 1, size: 100 },
        {
          userIds: [authStub.user1.user.id],
          embedding,
          withArchived: true,
        },
      );
      expect(assetMock.searchMetadata).not.toHaveBeenCalled();
    });

    it('should search by CLIP if `clip` option is true', async () => {
      const dto: SearchDto = { q: 'test query', clip: true };
      const embedding = [1, 2, 3];
      searchMock.searchSmart.mockResolvedValueOnce({ items: [assetStub.image], hasNextPage: false });
      machineMock.encodeText.mockResolvedValueOnce(embedding);
      partnerMock.getAll.mockResolvedValueOnce([]);
      const expectedResponse = {
        albums: {
          total: 0,
          count: 0,
          items: [],
          facets: [],
        },
        assets: {
          total: 1,
          count: 1,
          items: [mapAsset(assetStub.image)],
          facets: [],
          nextPage: null,
        },
      };

      const result = await sut.search(authStub.user1, dto);

      expect(result).toEqual(expectedResponse);
      expect(searchMock.searchSmart).toHaveBeenCalledWith(
        { page: 1, size: 100 },
        {
          userIds: [authStub.user1.user.id],
          embedding,
          withArchived: false,
        },
      );
      expect(assetMock.searchMetadata).not.toHaveBeenCalled();
    });

    it.each([
      { key: SystemConfigKey.MACHINE_LEARNING_ENABLED },
      { key: SystemConfigKey.MACHINE_LEARNING_CLIP_ENABLED },
    ])('should throw an error if clip is requested but disabled', async ({ key }) => {
      const dto: SearchDto = { q: 'test query', clip: true };
      configMock.load.mockResolvedValue([{ key, value: false }]);

      await expect(sut.search(authStub.user1, dto)).rejects.toThrow('Smart search is not enabled');
    });
  });
});
