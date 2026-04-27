export interface NormalizedReportAnnotationInput {
  sourceArticleId: string;
  targetArticleId: string;
  relationType: string;
  notes?: string;
}

export function normalizeReportAnnotationInput(
  input: Record<string, unknown>,
): NormalizedReportAnnotationInput {
  const sourceArticleId = String(input.sourceArticleId ?? '').trim();
  const targetArticleId = String(input.targetArticleId ?? '').trim();
  const relationType = String(input.relationType ?? 'related').trim();
  const notes = input.notes ? String(input.notes).trim() : undefined;

  if (!sourceArticleId || !targetArticleId) {
    throw new Error('sourceArticleId and targetArticleId are required');
  }

  if (!relationType) {
    throw new Error('relationType is required');
  }

  return {
    sourceArticleId,
    targetArticleId,
    relationType,
    ...(notes ? { notes } : {}),
  };
}
