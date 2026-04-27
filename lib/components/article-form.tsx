'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Form, Button, Row, Col } from 'react-bootstrap';
import type { NewArticle } from '@/lib/db/schema';

type ArticleFieldKeys = Extract<
  keyof NewArticle,
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

type ArticleFormValues = {
  [K in ArticleFieldKeys]: NonNullable<NewArticle[K]> | '';
};

interface ArticleFormProps {
  onSubmit: (data: ArticleFormValues) => void;
  initialData?: Partial<ArticleFormValues> | null;
}

// Intentionally includes every paragraph text value from docs/news-outlets-and-platforms-list.xml.
const NEWS_OUTLET_SEED_OPTIONS = [
  '100punt6',
  'AFRIKANER',
  'ALBERTON RECORD',
  'ALGOA FM',
  'ALLAFRICA',
  'BARBERTON TIMES',
  'BEDFORDVIEW EDENVALE NEWS',
  'BEELD',
  'BEELD NAWEEK',
  'BENONI CITY TIMES',
  'BIZCOMMUNITY',
  'BLOEMFONTEIN COURANT',
  'BOKSBURG ADVERTISER',
  'BOLAND GAZETTE / KLEINMOND GAZETTE',
  'BOSVELD REVIEW',
  'BURGER (DIE BURGER)',
  'BUSINESS DAY',
  'CAPE ARGUS',
  'CAPE TIMES',
  'CARLETONVILLE HERALD',
  'CAXTON NEWS SERVICE',
  'CHANNEL24',
  'CHATSWORTH RISING SUN',
  'CITIZEN',
  'CITIZEN SATURDAY',
  'CITY PRESS',
  'COSMOPOLITAN',
  'CX PRESS',
  'DAILY DISPATCH (also: Dispatch)',
  'DAILY MAVERICK',
  'DAILY NEWS',
  'DAILY SUN',
  'DAILY VOICE',
  'DAILY VOX',
  'DESTINY',
  'DESTINY CONNECT',
  'DIAMOND FIELDS ADVERTISER',
  'DIE HOORN',
  'DIE POS',
  'DIE SON',
  'DRUM',
  'EASTERN CAPE TODAY',
  'EAST COAST RADIO',
  'EDGE COMMUNITY NEWS',
  'ENCA',
  'EP HERALD',
  'EWN',
  'EXPRESS',
  'FAR NORTH BULLETIN',
  'FARMER\'S WEEKLY',
  'FINWEEK',
  'FREE STATE TIMES',
  'GEORGE HERALD',
  'GROCOTTS',
  'GROUNDUP',
  'HEARTFM',
  'HERALD',
  'HOEVELDER/HIGHVELDER',
  'HUISGENOOT',
  'IAFRICA',
  'IKAMVA',
  'INDEPENDENT ON SATURDAY',
  'IOL',
  'ISIZULU24',
  'ISOLEZWE',
  'IZINDABA24',
  'JACARANDA FM',
  'JBAY NEWS',
  'KATHU GAZETTE',
  'KEMPTON EXPRESS',
  'KERKBODE',
  'KFM',
  'KNYSNA PLETT HERALD',
  'KOUGA EXPRESS',
  'KROON NUUS',
  'KRUGERSDORP NEWS',
  'LADYSMITH GAZETTE',
  'LAEVELD BULLETIN',
  'LANDBOUWEEKBLAD',
  'LEADERSHIP',
  'LENASIA NEWS',
  'LIMPOPO MIRROR',
  'LOOK LOCAL',
  'LOWVELDER',
  'MAIL & GUARDIAN',
  'MAHALA',
  'MAMBA GIRL',
  'MAMBA ONLINE',
  'MARIE CLAIRE ONLINE',
  'MERCURY (Natal Mercury)',
  'METRO NEWSPAPER',
  'MIDDELBURG OBSERVER',
  'MOPANI HERALD',
  'MOSSEL BAY ADVERTISER',
  'MPUMALANGA NEWS',
  'MTHATHA EXPRESS',
  'MWEB',
  'NATAL WITNESS (Witness)',
  'NETWERK24',
  'NEWS24',
  'NORTHERN NEWS',
  'OFM',
  'OPPIDAN PRESS',
  'OUDTSHOORN COURANT',
  'OVERSTRAND HERALD',
  'PARYS GAZETTE',
  'PE EXPRESS',
  'PE EXPRESS INDABA',
  'PEOPLE MAGAZINE',
  'PEOPLE\'S POST',
  'PEOPLE\'S POST ATHLONE',
  'PEOPLE\'S POST WOODSTOCK',
  'PERDEBY',
  'PLATINUM WEEKLY',
  'POLOKWANE OBSERVER',
  'POST',
  'POTCHEFSTROOM HERALD',
  'PRETORIA NEWS',
  'PRETORIA NEWS WEEKEND',
  'R NEWS',
  'RANDFONTEIN HERALD',
  'RAPPORT',
  'REKORD MOOT',
  'REKORD PRETORIA NORTH',
  'RIDGE TIMES',
  'RISING SUN CHATSWORTH',
  'ROSEBANK KILLARNEY GAZETTE',
  'SABC',
  'SANDTON CHRONICLE',
  'SARIE',
  'SATURDAY ARGUS',
  'SATURDAY INDEPENDENT',
  'SATURDAY STAR',
  'SATURDAY VOLKSBLAD',
  'SEDIBENG STAR/STER',
  'SERVAMUS',
  'SOMERSET BUDGET',
  'SOUTH COAST HERALD',
  'SOUTHERN COURIER',
  'SOUTHLAND SUN',
  'SOWETAN',
  'SPRINGS ADVERTISER',
  'STAR (THE STAR)',
  'STEELBURGER',
  'SUNDAY ARGUS',
  'SUNDAY INDEPENDENT',
  'SUNDAY TIMES',
  'SUNDAY TRIBUNE',
  'SUNDAY WORLD',
  'THE BEAT',
  'THE NEW AGE (TNA)',
  'TIMES (THE TIMES)',
  'TLOKWE NEWS',
  'TNA FREE STATE',
  'TRIBUNE',
  'TYGERBURGER',
  'VAALWEEKBLAD',
  'VISTA NEWS',
  'VOCFM',
  'VOLKSBLAD',
  'VROUEKEUR',
  'VRYSTAAT',
  'VUTHA NEWS',
  'WOMEN24',
  'WEEKEND ARGUS',
  'WEEKEND POST',
  'WESLANDER',
  'WEST CAPE NEWS (WCN)',
  'WINTERVELDT NEWS',
  'WITBANK NEWS',
  'WITNESS',
  'WITS VUVUZELA',
  'WORCESTER STANDARD',
  'YOU',
  'ZOUTNET',
  'ZOUTPANSBURGER',
  'ZULULAND OBSERVER',
] as const;

const AUTHOR_OTHER_OPTIONS = ['Undisclosed', 'Anonymous', 'Unknown'] as const;
type AuthorOtherOption = (typeof AUTHOR_OTHER_OPTIONS)[number];

const buildAuthorState = (value?: string | null) => {
  const normalized = value?.trim() ?? '';
  const matchedOtherOption = AUTHOR_OTHER_OPTIONS.find(
    (option) => option === normalized,
  );
  if (matchedOtherOption) {
    return {
      authorValues: [''],
      isAuthorOther: true,
      authorOtherValue: matchedOtherOption,
    };
  }

  const authorValues = normalized
    ? normalized
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    : [''];

  return {
    authorValues,
    isAuthorOther: false,
    authorOtherValue: AUTHOR_OTHER_OPTIONS[0],
  };
};

const buildInitialState = (
  initialData?: Partial<ArticleFormValues> | null,
): ArticleFormValues => ({
  newsReportUrl: initialData?.newsReportUrl ?? '',
  newsReportHeadline: initialData?.newsReportHeadline ?? '',
  dateOfPublication: initialData?.dateOfPublication ?? '',
  author: initialData?.author ?? '',
  wireService: initialData?.wireService ?? '',
  language: initialData?.language ?? '',
  typeOfSource: initialData?.typeOfSource ?? '',
  newsReportPlatform: initialData?.newsReportPlatform ?? '',
  notes: initialData?.notes ?? '',
});

const ArticleForm: React.FC<ArticleFormProps> = ({ onSubmit, initialData }) => {
  const initialAuthorState = buildAuthorState(initialData?.author);
  const [formData, setFormData] = useState<ArticleFormValues>(
    buildInitialState(initialData),
  );

  const [isValid, setIsValid] = useState(false);
  const [outletOptions, setOutletOptions] = useState<string[]>(
    () => [...NEWS_OUTLET_SEED_OPTIONS],
  );
  const [outletLoading, setOutletLoading] = useState(false);
  const [outletSaving, setOutletSaving] = useState(false);
  const [authorValues, setAuthorValues] = useState<string[]>(
    initialAuthorState.authorValues,
  );
  const [isAuthorOther, setIsAuthorOther] = useState<boolean>(
    initialAuthorState.isAuthorOther,
  );
  const [authorOtherValue, setAuthorOtherValue] = useState<AuthorOtherOption>(
    initialAuthorState.authorOtherValue,
  );
  const serializedAuthors = useMemo(
    () =>
      authorValues
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .join(', '),
    [authorValues],
  );

  useEffect(() => {
    // Validate required fields
    const required = [
      'newsReportUrl',
      'newsReportHeadline',
      'dateOfPublication',
      'newsReportPlatform',
    ];
    const allRequiredFilled = required.every((field) => {
      const value = formData[field as keyof ArticleFormValues];
      return (
        (typeof value === 'string' ? value : (value ?? ''))
          .toString()
          .trim() !== ''
      );
    });
    const authorIsValid =
      isAuthorOther ||
      authorValues.some((value) => value.trim().length > 0);
    setIsValid(allRequiredFilled && authorIsValid);
  }, [formData, authorValues, isAuthorOther]);

  useEffect(() => {
    setFormData(buildInitialState(initialData));
    const authorState = buildAuthorState(initialData?.author);
    setAuthorValues(authorState.authorValues);
    setIsAuthorOther(authorState.isAuthorOther);
    setAuthorOtherValue(authorState.authorOtherValue);
  }, [initialData]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      author: isAuthorOther ? authorOtherValue : serializedAuthors,
    }));
  }, [isAuthorOther, authorOtherValue, serializedAuthors]);

  useEffect(() => {
    let ignore = false;

    const loadOutlets = async () => {
      try {
        setOutletLoading(true);
        const params = new URLSearchParams({
          query: formData.newsReportPlatform ?? '',
          limit: '12',
        });
        const response = await fetch(`/api/articles/outlets?${params.toString()}`);
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          success?: boolean;
          data?: unknown;
        };
        if (!ignore && payload.success && Array.isArray(payload.data)) {
          const options = payload.data.filter(
            (item): item is string => typeof item === 'string' && item.trim().length > 0,
          );
          setOutletOptions(
            options.length > 0 ? options : [...NEWS_OUTLET_SEED_OPTIONS],
          );
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to fetch outlet suggestions', error);
        }
      } finally {
        if (!ignore) {
          setOutletLoading(false);
        }
      }
    };

    const timeout = setTimeout(loadOutlets, 180);
    return () => {
      ignore = true;
      clearTimeout(timeout);
    };
  }, [formData.newsReportPlatform]);

  const handleChange = (field: keyof ArticleFormValues, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const handleAuthorValueChange = (index: number, value: string) => {
    setAuthorValues((prev) =>
      prev.map((entry, entryIndex) => (entryIndex === index ? value : entry)),
    );
  };
  const handleAddAuthor = () => {
    setAuthorValues((prev) => [...prev, '']);
  };
  const handleRemoveAuthor = (index: number) => {
    setAuthorValues((prev) => {
      const next = prev.filter((_, entryIndex) => entryIndex !== index);
      return next.length > 0 ? next : [''];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      const payload: ArticleFormValues = {
        ...formData,
        notes: formData.notes?.trim() || '',
      };
      onSubmit(payload);
    }
  };

  const normalizedOutletValue = useMemo(
    () => formData.newsReportPlatform.trim(),
    [formData.newsReportPlatform],
  );
  const hasExactOutletMatch = useMemo(
    () =>
      outletOptions.some(
        (option) => option.toLowerCase() === normalizedOutletValue.toLowerCase(),
      ),
    [outletOptions, normalizedOutletValue],
  );

  const handleAddNewOutlet = async () => {
    if (!normalizedOutletValue || hasExactOutletMatch) {
      return;
    }

    try {
      setOutletSaving(true);
      const response = await fetch('/api/articles/outlets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outlet: normalizedOutletValue }),
      });

      if (!response.ok) {
        return;
      }

      setOutletOptions((prev) => {
        const next = [...prev, normalizedOutletValue];
        return next
          .filter((value, index, arr) => {
            const key = value.toLowerCase();
            return arr.findIndex((item) => item.toLowerCase() === key) === index;
          })
          .sort((left, right) => left.localeCompare(right));
      });
      handleChange('newsReportPlatform', normalizedOutletValue);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to add outlet option', error);
      }
    } finally {
      setOutletSaving(false);
    }
  };

  const sourceTypeOptions = [
    { value: '', label: 'Select Source Type' },
    { value: 'newspaper', label: 'Newspaper' },
    { value: 'online', label: 'Online News' },
    { value: 'television', label: 'Television' },
    { value: 'radio', label: 'Radio' },
    { value: 'magazine', label: 'Magazine' },
    { value: 'blog', label: 'Blog' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'other', label: 'Other' },
  ];

  const languageOptions = [
    { value: '', label: 'Select Language' },
    { value: 'english', label: 'English' },
    { value: 'afrikaans', label: 'Afrikaans' },
    { value: 'zulu', label: 'Zulu' },
    { value: 'xhosa', label: 'Xhosa' },
    { value: 'sotho', label: 'Sotho' },
    { value: 'tswana', label: 'Tswana' },
    { value: 'pedi', label: 'Pedi' },
    { value: 'venda', label: 'Venda' },
    { value: 'tsonga', label: 'Tsonga' },
    { value: 'ndebele', label: 'Ndebele' },
    { value: 'swati', label: 'Swati' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <Card className="mb-4">
      <Card.Header>
        <h4 className="mb-0">Article Information</h4>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>News Report URL *</Form.Label>
                <Form.Control
                  type="url"
                  value={formData.newsReportUrl}
                  onChange={(e) =>
                    handleChange('newsReportUrl', e.target.value)
                  }
                  placeholder="https://..."
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>News Report Headline *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.newsReportHeadline}
                  onChange={(e) =>
                    handleChange('newsReportHeadline', e.target.value)
                  }
                  placeholder="Enter the headline of the news report"
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Date of Publication *</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.dateOfPublication}
                  onChange={(e) =>
                    handleChange('dateOfPublication', e.target.value)
                  }
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>News Report Platform *</Form.Label>
                <Form.Control
                  type="text"
                  list="news-outlet-options"
                  value={formData.newsReportPlatform}
                  onChange={(e) =>
                    handleChange('newsReportPlatform', e.target.value)
                  }
                  placeholder="e.g., News24, IOL, TimesLIVE"
                  required
                />
                <datalist id="news-outlet-options">
                  {outletOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                <div className="d-flex justify-content-between mt-2">
                  <Form.Text className="text-muted">
                    {outletLoading
                      ? 'Loading outlet matches…'
                      : 'Search existing outlets or enter a new one.'}
                  </Form.Text>
                  {normalizedOutletValue && !hasExactOutletMatch && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      type="button"
                      onClick={handleAddNewOutlet}
                      disabled={outletSaving}
                    >
                      {outletSaving
                        ? 'Adding...'
                        : `Add "${normalizedOutletValue}"`}
                    </Button>
                  )}
                </div>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Authors</Form.Label>
                {authorValues.map((authorValue, index) => (
                  <div key={`author-${index}`} className="d-flex gap-2 mb-2">
                    <Form.Control
                      type="text"
                      value={authorValue}
                      onChange={(e) =>
                        handleAuthorValueChange(index, e.target.value)
                      }
                      placeholder="Author name"
                      disabled={isAuthorOther}
                    />
                    {index > 0 && (
                      <Button
                        variant="outline-danger"
                        type="button"
                        onClick={() => handleRemoveAuthor(index)}
                        aria-label={`Remove author ${index + 1}`}
                        disabled={isAuthorOther}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  type="button"
                  onClick={handleAddAuthor}
                  disabled={isAuthorOther}
                >
                  + Add Author
                </Button>
                <Form.Check
                  type="checkbox"
                  id="author-other-checkbox"
                  className="mt-3"
                  label="Other"
                  checked={isAuthorOther}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsAuthorOther(checked);
                    if (checked) {
                      setAuthorOtherValue(AUTHOR_OTHER_OPTIONS[0]);
                    }
                  }}
                />
                {isAuthorOther && (
                  <Form.Select
                    className="mt-2"
                    value={authorOtherValue}
                    onChange={(e) =>
                      setAuthorOtherValue(e.target.value as AuthorOtherOption)
                    }
                  >
                    {AUTHOR_OTHER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Form.Select>
                )}
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Wire Service</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.wireService}
                  onChange={(e) => handleChange('wireService', e.target.value)}
                  placeholder="e.g., SAPA, Reuters, AP"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Language</Form.Label>
                <Form.Select
                  value={formData.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Source Type</Form.Label>
                <Form.Select
                  value={formData.typeOfSource}
                  onChange={(e) => handleChange('typeOfSource', e.target.value)}
                >
                  {sourceTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex justify-content-end">
            <Button type="submit" variant="primary" disabled={!isValid}>
              Save Article Information
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ArticleForm;

export type { ArticleFormValues };
