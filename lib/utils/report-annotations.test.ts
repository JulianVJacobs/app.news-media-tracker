import { normalizeReportAnnotationInput } from './report-annotations';

describe('normalizeReportAnnotationInput', () => {
  it('normalizes valid input and defaults relationType', () => {
    const result = normalizeReportAnnotationInput({
      sourceArticleId: ' source-1 ',
      targetArticleId: ' target-2 ',
      notes: ' possible duplicate ',
    });

    expect(result).toEqual({
      sourceArticleId: 'source-1',
      targetArticleId: 'target-2',
      relationType: 'related',
      notes: 'possible duplicate',
    });
  });

  it('throws when required article ids are missing', () => {
    expect(() =>
      normalizeReportAnnotationInput({
        sourceArticleId: '',
        targetArticleId: 'target-2',
      }),
    ).toThrow('sourceArticleId and targetArticleId are required');

    expect(() =>
      normalizeReportAnnotationInput({
        sourceArticleId: 'source-1',
        targetArticleId: '',
      }),
    ).toThrow('sourceArticleId and targetArticleId are required');
  });

  it('throws when relationType is empty after trimming', () => {
    expect(() =>
      normalizeReportAnnotationInput({
        sourceArticleId: 'source-1',
        targetArticleId: 'target-2',
        relationType: '   ',
      }),
    ).toThrow('relationType is required');
  });
});
