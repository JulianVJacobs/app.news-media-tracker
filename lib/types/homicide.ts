// Shared homicide types derived from the database schema

import type {
  Article,
  Victim,
  Perpetrator,
  NewArticle,
  NewVictim,
  NewPerpetrator,
} from '@/lib/db/schema';

export type ArticleData = Pick<
  NewArticle,
  | 'newsReportUrl'
  | 'newsReportHeadline'
  | 'dateOfPublication'
  | 'author'
  | 'wireService'
  | 'language'
  | 'typeOfSource'
  | 'newsReportPlatform'
  | 'notes'
>;

export type VictimData = Pick<
  NewVictim,
  | 'victimName'
  | 'victimAlias'
  | 'dateOfDeath'
  | 'placeOfDeathProvince'
  | 'placeOfDeathTown'
  | 'typeOfLocation'
  | 'sexualAssault'
  | 'genderOfVictim'
  | 'raceOfVictim'
  | 'ageOfVictim'
  | 'ageRangeOfVictim'
  | 'modeOfDeathSpecific'
  | 'modeOfDeathGeneral'
  | 'policeStation'
  | 'typeOfMurder'
> & { articleId?: string | null };

export type PerpetratorData = Pick<
  NewPerpetrator,
  | 'perpetratorName'
  | 'perpetratorAlias'
  | 'perpetratorRelationshipToVictim'
  | 'suspectIdentified'
  | 'suspectArrested'
  | 'suspectCharged'
  | 'conviction'
  | 'sentence'
> & { articleId?: string | null };

export interface HomicideCase {
  id?: string;
  articleData: Article;
  victims: Victim[];
  perpetrators: Perpetrator[];
  typeOfMurder: string;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: string;
  failureCount?: number;
  lastError?: string;
}

export interface TownsByProvince {
  [province: string]: string[];
}

export interface FormSubmissionHandlers {
  onSubmitArticleForm: (data: ArticleData) => void;
  onSubmitVictimForm: (data: VictimData) => void;
  onSubmitPerpetratorForm: (data: PerpetratorData) => void;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface HomicideListResponse {
  cases: HomicideCase[];
  total: number;
  page: number;
  limit: number;
}
