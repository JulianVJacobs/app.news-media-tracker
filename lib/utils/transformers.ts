import type {
  ArticleValidation,
  ArticleInput,
  VictimInput,
  PerpetratorInput,
} from '../components/utils';
import {
  sanitiseData,
  normaliseData,
  validateArticleData,
  validateVictimData,
  validatePerpetratorData,
} from '../components/utils';

const ensureRecord = (payload: unknown): Record<string, unknown> => {
  if (payload && typeof payload === 'object') {
    return { ...(payload as Record<string, unknown>) };
  }
  return {};
};

interface PreparedResult<T> {
  data: T;
  validation: ArticleValidation;
}

export const prepareArticlePayload = (
  payload: unknown,
): PreparedResult<ArticleInput> => {
  const base = ensureRecord(payload);
  const sanitised = sanitiseData(base) as ArticleInput;
  const normalised = normaliseData<ArticleInput>(sanitised);
  const validation = validateArticleData(normalised);

  return {
    data: normalised,
    validation,
  };
};

export const prepareVictimPayload = (
  payload: unknown,
): PreparedResult<VictimInput> => {
  const base = ensureRecord(payload);
  const sanitised = sanitiseData(base) as VictimInput;
  const normalised = normaliseData<VictimInput>(sanitised);
  const validation = validateVictimData(normalised);

  return {
    data: normalised,
    validation,
  };
};

export const preparePerpetratorPayload = (
  payload: unknown,
): PreparedResult<PerpetratorInput> => {
  const base = ensureRecord(payload);
  const sanitised = sanitiseData(base) as PerpetratorInput;
  const normalised = normaliseData<PerpetratorInput>(sanitised);
  const validation = validatePerpetratorData(normalised);

  return {
    data: normalised,
    validation,
  };
};
