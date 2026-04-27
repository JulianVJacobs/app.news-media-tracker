'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Form,
  Button,
  Row,
  Col,
  Alert,
  ListGroup,
} from 'react-bootstrap';
import type { NewVictim } from '@/lib/db/schema';
import { townsByProvince } from '@/lib/data/towns-by-province';
import {
  type RoleProfileContext,
  useConstraintEvaluation,
} from './role-visibility';
import {
  buildVisibleFieldSet,
  filterRequiredFieldsByVisibility,
} from './participant-field-visibility';

interface VictimFormProps {
  onSubmit: (data: VictimFormValues) => void;
  victims: VictimFormValues[];
  onClearVictims: () => void;
  requiredFields?: readonly string[];
  roleProfileContext?: RoleProfileContext;
  visibleFieldGroups?: readonly string[];
}

type VictimFieldKeys = Extract<
  keyof NewVictim,
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
>;

type VictimFormValues = Pick<NewVictim, VictimFieldKeys> & {
  articleId?: string | null;
  victimAliases?: string | null;
  nationalityOfVictim?: string | null;
  ageDescriptor?: string | null;
  dateOfDeathMode?: 'exact' | 'approximate' | 'unknown' | null;
  dateOfDeathEnd?: string | null;
};

const deriveAgeRange = (age: number | null, isUnknown: boolean): string => {
  if (isUnknown) {
    return 'Unknown';
  }

  if (age === null || Number.isNaN(age)) {
    return '';
  }

  if (age <= 10) return '0-10';
  if (age <= 17) return '11-17';
  if (age <= 25) return '18-25';
  if (age <= 35) return '26-35';
  if (age <= 45) return '36-45';
  if (age <= 55) return '46-55';
  if (age <= 65) return '56-65';
  return '66+';
};

const LOCATION_TYPE_PRESETS = [
  'Residential',
  'Street',
  'Business',
  'School',
  'Park',
  'Rural',
  'Other',
];

const NATIONALITIES = [
  'Afghan',
  'Albanian',
  'Algerian',
  'American',
  'Andorran',
  'Angolan',
  'Antiguan and Barbudan',
  'Argentine',
  'Armenian',
  'Australian',
  'Austrian',
  'Azerbaijani',
  'Bahamian',
  'Bahraini',
  'Bangladeshi',
  'Barbadian',
  'Belarusian',
  'Belgian',
  'Belizean',
  'Beninese',
  'Bhutanese',
  'Bolivian',
  'Bosnian and Herzegovinian',
  'Botswanan',
  'Brazilian',
  'British',
  'Bruneian',
  'Bulgarian',
  'Burkinabé',
  'Burundian',
  'Cambodian',
  'Cameroonian',
  'Canadian',
  'Cape Verdean',
  'Central African',
  'Chadian',
  'Chilean',
  'Chinese',
  'Colombian',
  'Comorian',
  'Congolese',
  'Costa Rican',
  'Croatian',
  'Cuban',
  'Cypriot',
  'Czech',
  'Danish',
  'Djiboutian',
  'Dominican',
  'Dutch',
  'East Timorese',
  'Ecuadorean',
  'Egyptian',
  'Emirati',
  'Equatorial Guinean',
  'Eritrean',
  'Estonian',
  'Eswatini',
  'Ethiopian',
  'Fijian',
  'Filipino',
  'Finnish',
  'French',
  'Gabonese',
  'Gambian',
  'Georgian',
  'German',
  'Ghanaian',
  'Greek',
  'Grenadian',
  'Guatemalan',
  'Guinean',
  'Guinea-Bissauan',
  'Guyanese',
  'Haitian',
  'Honduran',
  'Hungarian',
  'Icelandic',
  'Indian',
  'Indonesian',
  'Iranian',
  'Iraqi',
  'Irish',
  'Israeli',
  'Italian',
  'Ivorian',
  'Jamaican',
  'Japanese',
  'Jordanian',
  'Kazakh',
  'Kenyan',
  'Kiribati',
  'Kuwaiti',
  'Kyrgyz',
  'Laotian',
  'Latvian',
  'Lebanese',
  'Liberian',
  'Libyan',
  'Liechtensteiner',
  'Lithuanian',
  'Luxembourgish',
  'Malagasy',
  'Malawian',
  'Malaysian',
  'Maldivian',
  'Malian',
  'Maltese',
  'Marshallese',
  'Mauritanian',
  'Mauritian',
  'Mexican',
  'Micronesian',
  'Moldovan',
  'Monégasque',
  'Mongolian',
  'Montenegrin',
  'Moroccan',
  'Mozambican',
  'Myanmar',
  'Namibian',
  'Nauruan',
  'Nepalese',
  'New Zealander',
  'Nicaraguan',
  'Nigerian',
  'Nigerien',
  'North Korean',
  'North Macedonian',
  'Norwegian',
  'Omani',
  'Pakistani',
  'Palauan',
  'Panamanian',
  'Papua New Guinean',
  'Paraguayan',
  'Peruvian',
  'Polish',
  'Portuguese',
  'Qatari',
  'Romanian',
  'Russian',
  'Rwandan',
  'Saint Kitts and Nevis',
  'Saint Lucian',
  'Saint Vincent and the Grenadines',
  'Samoan',
  'San Marinese',
  'São Toméan',
  'Saudi',
  'Senegalese',
  'Serbian',
  'Seychellois',
  'Sierra Leonean',
  'Singaporean',
  'Slovak',
  'Slovenian',
  'Solomon Islander',
  'Somali',
  'South African',
  'South Korean',
  'South Sudanese',
  'Spanish',
  'Sri Lankan',
  'Sudanese',
  'Surinamese',
  'Swedish',
  'Swiss',
  'Syrian',
  'Taiwanese',
  'Tajik',
  'Tanzanian',
  'Thai',
  'Togolese',
  'Tongan',
  'Trinidadian and Tobagonian',
  'Tunisian',
  'Turkish',
  'Turkmen',
  'Tuvaluan',
  'Ugandan',
  'Ukrainian',
  'Uruguayan',
  'Uzbek',
  'Vanuatuan',
  'Venezuelan',
  'Vietnamese',
  'Yemeni',
  'Zambian',
  'Zimbabwean',
];

const VictimForm: React.FC<VictimFormProps> = ({
  onSubmit,
  victims = [],
  onClearVictims,
  requiredFields,
  roleProfileContext,
  visibleFieldGroups,
}) => {
  const RESET_DATA: VictimFormValues = {
    victimName: '',
    victimAlias: '',
    victimAliases: null,
    dateOfDeath: '',
    dateOfDeathMode: 'exact',
    dateOfDeathEnd: '',
    placeOfDeathProvince: '',
    placeOfDeathTown: '',
    typeOfLocation: '',
    sexualAssault: '',
    genderOfVictim: '',
    raceOfVictim: '',
    nationalityOfVictim: 'Unknown',
    ageOfVictim: null,
    ageRangeOfVictim: '',
    ageDescriptor: 'Unknown',
    modeOfDeathSpecific: '',
    modeOfDeathGeneral: '',
    policeStation: '',
    typeOfMurder: '',
  };

  const [currentVictim, setCurrentVictim] =
    useState<VictimFormValues>(RESET_DATA);
  const [availableTowns, setAvailableTowns] = useState<string[]>([]);
  const [customTown, setCustomTown] = useState('');
  const [isNameUnknown, setIsNameUnknown] = useState(false);
  const [isAgeUnknown, setIsAgeUnknown] = useState(false);
  const [isDateUnknown, setIsDateUnknown] = useState(false);
  const [dateMode, setDateMode] = useState<'exact' | 'approximate'>('exact');
  const [aliasInputs, setAliasInputs] = useState<string[]>(['']);
  const [raceOther, setRaceOther] = useState('');
  const [nationalityOther, setNationalityOther] = useState('');
  const [locationTypeOptions, setLocationTypeOptions] = useState<string[]>(
    LOCATION_TYPE_PRESETS,
  );

  useEffect(() => {
    if (
      currentVictim.placeOfDeathProvince &&
      townsByProvince[currentVictim.placeOfDeathProvince]
    ) {
      setAvailableTowns(townsByProvince[currentVictim.placeOfDeathProvince]);
    } else {
      setAvailableTowns([]);
    }
  }, [currentVictim.placeOfDeathProvince]);

  const groupVisibility = useMemo(
    () => ({
      coreIdentity:
        !visibleFieldGroups || visibleFieldGroups.includes('coreIdentity'),
      demographics:
        !visibleFieldGroups || visibleFieldGroups.includes('demographics'),
      deathDetails:
        !visibleFieldGroups || visibleFieldGroups.includes('deathDetails'),
      location: !visibleFieldGroups || visibleFieldGroups.includes('location'),
    }),
    [visibleFieldGroups],
  );

  const visibleFields = useMemo(
    () =>
      buildVisibleFieldSet(groupVisibility, {
        coreIdentity: ['victimName', 'victimAlias', 'victimAliases'],
        deathDetails: [
          'dateOfDeath',
          'dateOfDeathMode',
          'dateOfDeathEnd',
          'sexualAssault',
          'modeOfDeathGeneral',
          'modeOfDeathSpecific',
        ],
        location: [
          'placeOfDeathProvince',
          'placeOfDeathTown',
          'typeOfLocation',
          'policeStation',
        ],
        demographics: [
          'genderOfVictim',
          'raceOfVictim',
          'nationalityOfVictim',
          'ageOfVictim',
          'ageDescriptor',
          'ageRangeOfVictim',
        ],
      }),
    [groupVisibility],
  );

  const effectiveRequiredFields = useMemo(
    () => filterRequiredFieldsByVisibility(requiredFields, visibleFields),
    [requiredFields, visibleFields],
  );

  const effectiveRequiredFieldsForConstraint = useMemo(
    () =>
      effectiveRequiredFields?.filter((field) => {
        if (field === 'victimName' && isNameUnknown) {
          return false;
        }

        if (field === 'ageOfVictim' && isAgeUnknown) {
          return false;
        }

        if ((field === 'dateOfDeath' || field === 'dateOfDeathEnd') && isDateUnknown) {
          return false;
        }

        return true;
      }),
    [effectiveRequiredFields, isAgeUnknown, isDateUnknown, isNameUnknown],
  );

  const constraintState = useConstraintEvaluation(
    currentVictim as Record<string, unknown>,
    'victim',
    roleProfileContext,
    { requiredFields: effectiveRequiredFieldsForConstraint },
  );

  const hasValidName = isNameUnknown || Boolean(currentVictim.victimName?.trim());
  const hasValidAge = isAgeUnknown || currentVictim.ageOfVictim !== null;
  const hasValidDate =
    isDateUnknown ||
    (Boolean(currentVictim.dateOfDeath) &&
      (dateMode === 'exact' ||
        (Boolean(currentVictim.dateOfDeathEnd) &&
          new Date(currentVictim.dateOfDeath ?? '').getTime() <=
            new Date(currentVictim.dateOfDeathEnd ?? '').getTime())));

  const isValid = constraintState.isValid && hasValidName && hasValidAge && hasValidDate;

  const handleChange = <K extends keyof VictimFormValues>(
    field: K,
    value: VictimFormValues[K],
  ) => {
    setCurrentVictim((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddLocationType = () => {
    const nextValue = (currentVictim.typeOfLocation ?? '').trim();
    if (!nextValue) {
      return;
    }

    const exists = locationTypeOptions.some(
      (option) => option.toLowerCase() === nextValue.toLowerCase(),
    );

    if (!exists) {
      setLocationTypeOptions((prev) => [...prev, nextValue]);
    }

    handleChange('typeOfLocation', nextValue);
  };

  const handleAddVictim = () => {
    if (isValid) {
      const cleanAliases = aliasInputs
        .map((alias) => alias.trim())
        .filter((alias) => alias.length > 0);

      const resolvedRace =
        currentVictim.raceOfVictim === 'Other'
          ? raceOther.trim() || 'Other'
          : currentVictim.raceOfVictim;

      const resolvedNationality =
        currentVictim.nationalityOfVictim === 'Other'
          ? nationalityOther.trim() || 'Other'
          : currentVictim.nationalityOfVictim;

      const victimToAdd: VictimFormValues = {
        ...currentVictim,
        victimName: isNameUnknown
          ? 'Unknown'
          : (currentVictim.victimName ?? '').trim(),
        victimAlias: cleanAliases[0] ?? '',
        victimAliases: JSON.stringify(cleanAliases),
        raceOfVictim: resolvedRace,
        nationalityOfVictim: resolvedNationality,
        ageOfVictim: isAgeUnknown ? null : currentVictim.ageOfVictim,
        ageRangeOfVictim: deriveAgeRange(currentVictim.ageOfVictim, isAgeUnknown),
        dateOfDeathMode: isDateUnknown ? 'unknown' : dateMode,
        dateOfDeath: isDateUnknown ? '' : currentVictim.dateOfDeath,
        dateOfDeathEnd:
          !isDateUnknown && dateMode === 'approximate'
            ? currentVictim.dateOfDeathEnd
            : '',
        placeOfDeathTown:
          currentVictim.placeOfDeathTown === 'Other' && customTown.trim()
            ? customTown.trim()
            : currentVictim.placeOfDeathTown,
      };

      onSubmit(victimToAdd);
      setCurrentVictim(RESET_DATA);
      setCustomTown('');
      setIsNameUnknown(false);
      setIsAgeUnknown(false);
      setIsDateUnknown(false);
      setDateMode('exact');
      setAliasInputs(['']);
      setRaceOther('');
      setNationalityOther('');
    }
  };

  const provinceOptions = [
    { value: '', label: 'Select Province' },
    { value: 'Eastern Cape', label: 'Eastern Cape' },
    { value: 'Free State', label: 'Free State' },
    { value: 'Gauteng', label: 'Gauteng' },
    { value: 'KwaZulu-Natal', label: 'KwaZulu-Natal' },
    { value: 'Limpopo', label: 'Limpopo' },
    { value: 'Mpumalanga', label: 'Mpumalanga' },
    { value: 'Northern Cape', label: 'Northern Cape' },
    { value: 'North West', label: 'North West' },
    { value: 'Western Cape', label: 'Western Cape' },
  ];

  const genderOptions = [
    { value: '', label: 'Select Gender' },
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Non-binary', label: 'Non-binary' },
    { value: 'Unknown', label: 'Unknown' },
  ];

  const raceOptions = [
    { value: '', label: 'Select Race' },
    { value: 'Black South African', label: 'Black South African' },
    { value: 'Coloured', label: 'Coloured' },
    { value: 'White South African', label: 'White South African' },
    { value: 'Indian', label: 'Indian' },
    { value: 'Asian', label: 'Asian' },
    { value: 'Black Other African', label: 'Black Other African' },
    { value: 'White Non-South African', label: 'White Non-South African' },
    { value: 'Unknown', label: 'Unknown' },
    { value: 'Other', label: 'Other' },
  ];

  const ageDescriptorOptions = [
    { value: 'Neonate or abandonment', label: 'Neonate or abandonment' },
    { value: 'Baby or infant', label: 'Baby or infant' },
    { value: 'Child', label: 'Child' },
    { value: 'Teenager', label: 'Teenager' },
    { value: 'Elderly', label: 'Elderly' },
    { value: 'Unknown', label: 'Unknown' },
  ];

  const yesNoOptions = [
    { value: '', label: 'Select' },
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' },
    { value: 'Unknown', label: 'Unknown' },
  ];

  const sortedNationalities = useMemo(
    () => [...NATIONALITIES].sort((left, right) => left.localeCompare(right)),
    [],
  );

  const normalizedLocationType = (currentVictim.typeOfLocation ?? '').trim();
  const hasLocationTypeMatch = locationTypeOptions.some(
    (option) => option.toLowerCase() === normalizedLocationType.toLowerCase(),
  );

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Victim Information</h4>
          {Array.isArray(victims) && victims.length > 0 && (
            <Button variant="outline-danger" size="sm" onClick={onClearVictims}>
              Clear All Victims
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Body>
        {Array.isArray(victims) && victims.length > 0 && (
          <Alert variant="info" className="mb-3">
            <strong>{victims.length} victim(s) added:</strong>
            <ListGroup variant="flush" className="mt-2">
              {victims.map((victim, index) => (
                <ListGroup.Item key={index} className="px-0">
                  <strong>{victim.victimName}</strong> - {victim.genderOfVictim},
                  Age: {victim.ageOfVictim ?? victim.ageRangeOfVictim},{' '}
                  {victim.placeOfDeathProvince}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Alert>
        )}

        <Form>
          {groupVisibility.coreIdentity && (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <Form.Label className="mb-0">Victim Name *</Form.Label>
                    <Form.Check
                      type="checkbox"
                      id="victim-name-unknown"
                      label="Unknown"
                      checked={isNameUnknown}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setIsNameUnknown(next);
                        handleChange('victimName', next ? 'Unknown' : '');
                      }}
                    />
                  </div>
                  <Form.Control
                    type="text"
                    aria-label="Victim Name"
                    value={isNameUnknown ? 'Unknown' : (currentVictim.victimName ?? '')}
                    onChange={(e) => handleChange('victimName', e.target.value)}
                    disabled={isNameUnknown}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Aliases</Form.Label>
                  {aliasInputs.map((alias, index) => (
                    <div key={`alias-${index}`} className="d-flex mb-2 gap-2">
                      <Form.Control
                        type="text"
                        value={alias}
                        aria-label={`Alias ${index + 1}`}
                        onChange={(e) => {
                          const nextAliases = [...aliasInputs];
                          nextAliases[index] = e.target.value;
                          setAliasInputs(nextAliases);
                        }}
                      />
                      {aliasInputs.length > 1 && (
                        <Button
                          variant="outline-danger"
                          type="button"
                          onClick={() =>
                            setAliasInputs((prev) =>
                              prev.filter((_, aliasIndex) => aliasIndex !== index),
                            )
                          }
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
                    onClick={() => setAliasInputs((prev) => [...prev, ''])}
                  >
                    + Add Alias
                  </Button>
                </Form.Group>
              </Col>
            </Row>
          )}

          {groupVisibility.deathDetails && (
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Form.Label className="mb-0">Date of Death *</Form.Label>
                    <Form.Check
                      type="checkbox"
                      id="date-of-death-unknown"
                      label="Unknown"
                      checked={isDateUnknown}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setIsDateUnknown(next);
                        if (next) {
                          handleChange('dateOfDeath', '');
                          handleChange('dateOfDeathEnd', '');
                          handleChange('dateOfDeathMode', 'unknown');
                        } else {
                          handleChange('dateOfDeathMode', dateMode);
                        }
                      }}
                    />
                  </div>

                  <Form.Check
                    type="switch"
                    id="date-of-death-mode"
                    label={dateMode === 'approximate' ? 'Approximate' : 'Exact'}
                    checked={dateMode === 'approximate'}
                    disabled={isDateUnknown}
                    onChange={(e) => {
                      const nextMode = e.target.checked ? 'approximate' : 'exact';
                      setDateMode(nextMode);
                      handleChange('dateOfDeathMode', nextMode);
                      if (nextMode === 'exact') {
                        handleChange('dateOfDeathEnd', '');
                      }
                    }}
                    className="mb-3"
                  />

                  {dateMode === 'exact' ? (
                    <Form.Control
                      type="date"
                      aria-label="Date of death"
                      value={currentVictim.dateOfDeath ?? ''}
                      onChange={(e) => handleChange('dateOfDeath', e.target.value)}
                      disabled={isDateUnknown}
                      required
                    />
                  ) : (
                    <Row>
                      <Col md={6}>
                        <Form.Label>Start Date</Form.Label>
                        <Form.Control
                          type="date"
                          aria-label="Date of death start"
                          value={currentVictim.dateOfDeath ?? ''}
                          onChange={(e) =>
                            handleChange('dateOfDeath', e.target.value)
                          }
                          disabled={isDateUnknown}
                          required
                        />
                      </Col>
                      <Col md={6}>
                        <Form.Label>End Date</Form.Label>
                        <Form.Control
                          type="date"
                          aria-label="Date of death end"
                          value={currentVictim.dateOfDeathEnd ?? ''}
                          onChange={(e) =>
                            handleChange('dateOfDeathEnd', e.target.value)
                          }
                          disabled={isDateUnknown}
                          required
                        />
                      </Col>
                    </Row>
                  )}
                </Form.Group>
              </Col>
            </Row>
          )}

          {groupVisibility.location && (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Province *</Form.Label>
                  <Form.Select
                    value={currentVictim.placeOfDeathProvince ?? ''}
                    onChange={(e) =>
                      handleChange('placeOfDeathProvince', e.target.value)
                    }
                    required
                  >
                    {provinceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Town</Form.Label>
                  <Form.Select
                    value={currentVictim.placeOfDeathTown ?? ''}
                    onChange={(e) =>
                      handleChange('placeOfDeathTown', e.target.value)
                    }
                    disabled={!currentVictim.placeOfDeathProvince}
                  >
                    <option value="">Select Town</option>
                    {availableTowns.map((town) => (
                      <option key={town} value={town}>
                        {town}
                      </option>
                    ))}
                  </Form.Select>
                  {currentVictim.placeOfDeathTown === 'Other' && (
                    <Form.Control
                      type="text"
                      className="mt-2"
                      value={customTown}
                      onChange={(e) => setCustomTown(e.target.value)}
                      placeholder="Enter custom town name"
                    />
                  )}
                </Form.Group>
              </Col>
            </Row>
          )}

          {groupVisibility.demographics && (
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Gender *</Form.Label>
                  <Form.Select
                    value={currentVictim.genderOfVictim ?? ''}
                    onChange={(e) => handleChange('genderOfVictim', e.target.value)}
                    required
                  >
                    {genderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Race</Form.Label>
                  <Form.Select
                    aria-label="Race"
                    value={currentVictim.raceOfVictim ?? ''}
                    onChange={(e) => handleChange('raceOfVictim', e.target.value)}
                  >
                    {raceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                  {currentVictim.raceOfVictim === 'Other' && (
                    <Form.Control
                      type="text"
                      className="mt-2"
                      value={raceOther}
                      onChange={(e) => setRaceOther(e.target.value)}
                      placeholder="Specify race"
                    />
                  )}
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Nationality</Form.Label>
                  <Form.Select
                    aria-label="Nationality"
                    value={currentVictim.nationalityOfVictim ?? 'Unknown'}
                    onChange={(e) =>
                      handleChange('nationalityOfVictim', e.target.value)
                    }
                  >
                    <option value="Unknown">Unknown</option>
                    {sortedNationalities.map((nationality) => (
                      <option key={nationality} value={nationality}>
                        {nationality}
                      </option>
                    ))}
                    <option value="Other">Other</option>
                  </Form.Select>
                  {currentVictim.nationalityOfVictim === 'Other' && (
                    <Form.Control
                      type="text"
                      className="mt-2"
                      value={nationalityOther}
                      onChange={(e) => setNationalityOther(e.target.value)}
                      placeholder="Specify nationality"
                    />
                  )}
                </Form.Group>
              </Col>
            </Row>
          )}

          {groupVisibility.demographics && (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <Form.Label className="mb-0">Age</Form.Label>
                    <Form.Check
                      type="checkbox"
                      id="age-unknown"
                      label="Unknown"
                      checked={isAgeUnknown}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setIsAgeUnknown(next);
                        if (next) {
                          handleChange('ageOfVictim', null);
                        }
                      }}
                    />
                  </div>
                  <Form.Control
                    type="number"
                    aria-label="Age"
                    value={
                      !isAgeUnknown && currentVictim.ageOfVictim !== null
                        ? currentVictim.ageOfVictim
                        : ''
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed = raw === '' ? null : Number(raw);
                      const nextValue = Number.isNaN(parsed) ? null : parsed;
                      handleChange(
                        'ageOfVictim',
                        nextValue as VictimFormValues['ageOfVictim'],
                      );
                    }}
                    disabled={isAgeUnknown}
                    min="0"
                    max="120"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Age Descriptor</Form.Label>
                  <Form.Select
                    aria-label="Age Descriptor"
                    value={currentVictim.ageDescriptor ?? 'Unknown'}
                    onChange={(e) => handleChange('ageDescriptor', e.target.value)}
                  >
                    {ageDescriptorOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          )}

          {groupVisibility.location && (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Location Type</Form.Label>
                  <Form.Control
                    type="text"
                    aria-label="Location Type"
                    list="location-type-options"
                    value={currentVictim.typeOfLocation ?? ''}
                    onChange={(e) => handleChange('typeOfLocation', e.target.value)}
                    placeholder="Select or enter location type"
                  />
                  <datalist id="location-type-options">
                    {locationTypeOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                  <div className="d-flex justify-content-end mt-2">
                    {normalizedLocationType && !hasLocationTypeMatch && (
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        type="button"
                        onClick={handleAddLocationType}
                      >
                        Add &quot;{normalizedLocationType}&quot;
                      </Button>
                    )}
                  </div>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Police Station</Form.Label>
                  <Form.Control
                    type="text"
                    value={currentVictim.policeStation ?? ''}
                    onChange={(e) => handleChange('policeStation', e.target.value)}
                    placeholder="Name of police station"
                  />
                </Form.Group>
              </Col>
            </Row>
          )}

          {groupVisibility.deathDetails && (
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Sexual Assault</Form.Label>
                  <Form.Select
                    value={currentVictim.sexualAssault ?? ''}
                    onChange={(e) => handleChange('sexualAssault', e.target.value)}
                  >
                    {yesNoOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Mode of Death (General)</Form.Label>
                  <Form.Control
                    type="text"
                    value={currentVictim.modeOfDeathGeneral ?? ''}
                    onChange={(e) =>
                      handleChange('modeOfDeathGeneral', e.target.value)
                    }
                    placeholder="e.g., Gunshot, Stabbing"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Mode of Death (Specific)</Form.Label>
                  <Form.Control
                    type="text"
                    value={currentVictim.modeOfDeathSpecific ?? ''}
                    onChange={(e) =>
                      handleChange('modeOfDeathSpecific', e.target.value)
                    }
                    placeholder="Specific details"
                  />
                </Form.Group>
              </Col>
            </Row>
          )}

          <div className="d-flex justify-content-end">
            <Button variant="primary" onClick={handleAddVictim} disabled={!isValid}>
              Add Victim
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default VictimForm;

export type { VictimFormValues };
