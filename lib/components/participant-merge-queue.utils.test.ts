import {
  buildAliasPromotionResult,
  buildMergeQueueCandidates,
  buildMergeResult,
  filterAndSortMergeQueueCandidates,
  type MergeParticipantRecord,
} from './participant-merge-queue.utils';

describe('participant merge queue utils', () => {
  it('builds queue candidates from shared primary and alias values', () => {
    const participants: MergeParticipantRecord[] = [
      {
        id: 'v1',
        role: 'victim',
        articleId: 'a1',
        primaryName: 'Jane Doe',
        alias: 'JD',
      },
      {
        id: 'v2',
        role: 'victim',
        articleId: 'a2',
        primaryName: 'JD',
        alias: null,
      },
      {
        id: 'p1',
        role: 'perpetrator',
        articleId: 'a1',
        primaryName: 'JD',
        alias: null,
      },
    ];

    const queue = buildMergeQueueCandidates(participants);

    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe('v1::v2');
    expect(queue[0].sharedValue).toBe('JD');
  });

  it('promotes alias to primary while preserving previous primary as alias', () => {
    const result = buildAliasPromotionResult(
      {
        id: 'v1',
        role: 'victim',
        articleId: 'a1',
        primaryName: 'Jane Doe',
        alias: 'J.D., Janie',
      },
      'Janie',
    );

    expect(result).toEqual({
      primaryName: 'Janie',
      alias: 'Jane Doe, J.D.',
    });
  });

  it('throws validation error when promoting non-alias value', () => {
    expect(() =>
      buildAliasPromotionResult(
        {
          id: 'v1',
          role: 'victim',
          articleId: 'a1',
          primaryName: 'Jane Doe',
          alias: 'J.D., Janie',
        },
        'Ghost',
      ),
    ).toThrow('Selected value must be an existing alias.');
  });

  it('combines names and aliases when merging two participants', () => {
    const result = buildMergeResult(
      {
        id: 'p1',
        role: 'perpetrator',
        articleId: 'a1',
        primaryName: 'John Smith',
        alias: 'Smitty',
      },
      {
        id: 'p2',
        role: 'perpetrator',
        articleId: 'a2',
        primaryName: 'Johnny',
        alias: 'Smitty, JS',
      },
    );

    expect(result).toEqual({
      primaryName: 'John Smith',
      alias: 'Smitty, JS, Johnny',
    });
  });

  it('filters and sorts queue candidates by role and search text', () => {
    const queue = buildMergeQueueCandidates([
      {
        id: 'v1',
        role: 'victim',
        articleId: 'a1',
        primaryName: 'Jane Doe',
        alias: 'JD',
      },
      {
        id: 'v2',
        role: 'victim',
        articleId: 'a2',
        primaryName: 'JD',
        alias: null,
      },
      {
        id: 'p1',
        role: 'perpetrator',
        articleId: 'a3',
        primaryName: 'John Smith',
        alias: 'JS',
      },
      {
        id: 'p2',
        role: 'perpetrator',
        articleId: 'a4',
        primaryName: 'JS',
        alias: null,
      },
    ]);

    const filtered = filterAndSortMergeQueueCandidates(queue, {
      roleFilter: 'perpetrator',
      searchText: 'john',
      sortOrder: 'shared-value-desc',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].left.role).toBe('perpetrator');
    expect(filtered[0].sharedValue).toBe('JS');
  });

  it('sorts queue candidates by shared value ascending by default behavior', () => {
    const queue = buildMergeQueueCandidates([
      {
        id: 'v1',
        role: 'victim',
        articleId: 'a1',
        primaryName: 'Zulu',
        alias: 'Echo',
      },
      {
        id: 'v2',
        role: 'victim',
        articleId: 'a2',
        primaryName: 'Echo',
        alias: null,
      },
      {
        id: 'p1',
        role: 'perpetrator',
        articleId: 'a3',
        primaryName: 'Bravo',
        alias: 'Alpha',
      },
      {
        id: 'p2',
        role: 'perpetrator',
        articleId: 'a4',
        primaryName: 'Alpha',
        alias: null,
      },
    ]);

    const sorted = filterAndSortMergeQueueCandidates(queue, {
      roleFilter: 'all',
      searchText: '',
      sortOrder: 'shared-value-asc',
    });

    expect(sorted).toHaveLength(2);
    expect(sorted.map((candidate) => candidate.sharedValue)).toEqual([
      'Alpha',
      'Echo',
    ]);
  });
});
