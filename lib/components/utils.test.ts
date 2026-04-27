import { detectDuplicates, groupArticlesByEvent } from './utils';

describe('detectDuplicates', () => {
  it('returns explainability fields for URL matches', () => {
    const matches = detectDuplicates(
      {
        newsReportUrl: 'https://example.com/report-1',
        newsReportHeadline: 'Story A',
      },
      [
        {
          id: 'article-1',
          newsReportUrl: 'https://example.com/report-1',
          newsReportHeadline: 'Story B',
        },
      ],
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      id: 'article-1',
      matchType: 'url',
      matchReason: 'exact_url_match',
      matchedFields: ['newsReportUrl'],
    });
    expect(matches[0].explainability).toBe(
      'The newsReportUrl values are an exact match.',
    );
    expect(matches[0].scoring.summaryRationale).toContain('Primary url signal');
    expect(matches[0].scoring.whyMatched).toContain(
      'Matched fields: newsReportUrl',
    );
    expect(matches[0].scoring.weightedContributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signal: 'url',
          weight: 0.6,
          rawScore: 1,
          weightedScore: 0.6,
        }),
      ]),
    );
  });

  it('matches primary name against aliases and returns reason fields', () => {
    const matches = detectDuplicates(
      {
        newsReportHeadline: 'Unrelated headline',
        primaryName: 'Nomvula Mthembu',
      },
      [
        {
          id: 'article-2',
          newsReportHeadline: 'Different headline',
          primaryName: 'Unknown',
          aliases: ['Nomvula Mthembu', 'Nomz'],
        },
      ],
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      id: 'article-2',
      matchType: 'name',
      matchReason: 'name_alias_overlap',
    });
    expect(matches[0].matchedFields).toEqual(
      expect.arrayContaining(['primaryName', 'aliases']),
    );
    expect(matches[0].explainability).toContain('primaryName');
    expect(matches[0].scoring.summaryRationale).toContain('Primary name signal');
    expect(matches[0].scoring.whyMatched).toContain('Reason code: name');
  });

  it('keeps title matching behavior with explainability details', () => {
    const matches = detectDuplicates(
      {
        newsReportHeadline: 'Johannesburg homicide investigation expands',
      },
      [
        {
          id: 'article-3',
          newsReportHeadline: 'Johannesburg homicide investigation expands now',
        },
      ],
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      id: 'article-3',
      matchType: 'title',
      matchReason: 'headline_similarity',
      matchedFields: ['newsReportHeadline'],
    });
    expect(matches[0].explainability).toContain('similar');
    expect(matches[0].scoring.totalWeightedScore).toBeGreaterThan(0);
    expect(matches[0].scoring.weightedContributions).toHaveLength(4);
  });

  it('matches event-level duplicates for victim name and overlapping death dates', () => {
    const matches = detectDuplicates(
      {
        newsReportUrl: 'https://example.com/source-a',
        newsReportHeadline: 'Incident story from outlet A',
        author: 'Reporter A',
        victims: [
          {
            victimName: 'Nomusa Dlamini',
            dateOfDeath: '2026-01-10',
          },
        ],
      },
      [
        {
          id: 'article-4',
          newsReportUrl: 'https://example.com/source-b',
          newsReportHeadline: 'Different outlet text',
          author: 'Reporter B',
          victims: [
            {
              victimName: 'nomusa dlamini',
              dateOfDeath: '2026-01-10 to 2026-01-12',
            },
          ],
        },
      ],
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      id: 'article-4',
      matchType: 'name',
      confidence: 'high',
      matchReason: 'victim_name_and_date_overlap',
    });
    expect(matches[0].matchedFields).toEqual(
      expect.arrayContaining(['victimName', 'dateOfDeath']),
    );
  });

  it('matches medium-confidence duplicates for victim name and death location', () => {
    const matches = detectDuplicates(
      {
        newsReportUrl: 'https://example.com/a',
        newsReportHeadline: 'Story from outlet A',
        victims: [
          {
            victimName: 'Ayanda Nkosi',
            placeOfDeathProvince: 'Gauteng',
            placeOfDeathTown: 'Soweto',
          },
        ],
      },
      [
        {
          id: 'article-5',
          newsReportUrl: 'https://example.com/b',
          newsReportHeadline: 'Story from outlet B',
          victims: [
            {
              victimName: 'ayanda nkosi',
              placeOfDeathProvince: 'gauteng',
              placeOfDeathTown: 'soweto',
            },
          ],
        },
      ],
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      id: 'article-5',
      matchType: 'name',
      confidence: 'medium',
      matchReason: 'victim_name_and_location_match',
    });
  });

  it('matches medium-confidence duplicates for suspect and victim name overlap', () => {
    const matches = detectDuplicates(
      {
        newsReportUrl: 'https://example.com/alpha',
        newsReportHeadline: 'Outlet alpha version',
        victims: [{ victimName: 'Thabo Mokoena' }],
        perpetrators: [{ perpetratorName: 'Sipho Ndlovu' }],
      },
      [
        {
          id: 'article-6',
          newsReportUrl: 'https://example.com/bravo',
          newsReportHeadline: 'Outlet bravo version',
          victims: [{ victimName: 'thabo mokoena' }],
          perpetrators: [{ perpetratorName: 'sipho ndlovu' }],
        },
      ],
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      id: 'article-6',
      matchType: 'name',
      confidence: 'medium',
      matchReason: 'victim_and_suspect_name_match',
    });
  });
});

describe('groupArticlesByEvent', () => {
  it('groups articles that share victim and approximate event identity', () => {
    const groups = groupArticlesByEvent(
      [
        { id: 'article-1' },
        { id: 'article-2' },
        { id: 'article-3' },
      ],
      [
        {
          articleId: 'article-1',
          victimName: 'Nomsa Khumalo',
          dateOfDeath: '2026-02-14',
          placeOfDeathProvince: 'Gauteng',
          placeOfDeathTown: 'Johannesburg',
        },
        {
          articleId: 'article-2',
          victimName: 'nomsa khumalo',
          dateOfDeath: '2026-02-14',
          placeOfDeathProvince: 'gauteng',
          placeOfDeathTown: 'johannesburg',
        },
        {
          articleId: 'article-3',
          victimName: 'Different Victim',
          dateOfDeath: '2026-02-14',
          placeOfDeathProvince: 'Gauteng',
          placeOfDeathTown: 'Johannesburg',
        },
      ],
      [],
    );

    expect(groups).toHaveLength(2);
    const groupedPair = groups.find((group) => group.articles.length === 2);
    expect(groupedPair).toBeDefined();
    expect(groupedPair?.articles.map((article) => article.id)).toEqual(
      expect.arrayContaining(['article-1', 'article-2']),
    );
  });
});
