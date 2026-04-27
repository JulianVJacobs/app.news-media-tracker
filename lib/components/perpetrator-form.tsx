'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  Form,
  Button,
  Row,
  Col,
  Alert,
  ListGroup,
} from 'react-bootstrap';
import type { NewPerpetrator } from '@/lib/db/schema';
import {
  type RoleProfileContext,
  useConstraintEvaluation,
} from './role-visibility';
import {
  buildVisibleFieldSet,
  filterRequiredFieldsByVisibility,
} from './participant-field-visibility';
import {
  type ChargeEntry,
  buildSentenceFromCharge,
  createDefaultChargeEntry,
  mapConvictionFromCharge,
  pluralizeTermUnit,
  serializeAliases,
} from './perpetrator-form-utils';

interface PerpetratorFormProps {
  onSubmit: (data: PerpetratorFormValues) => void;
  perpetrators: PerpetratorFormValues[];
  onClearPerpetrators: () => void;
  requiredFields?: readonly string[];
  roleProfileContext?: RoleProfileContext;
  visibleFieldGroups?: readonly string[];
}

type PerpetratorFieldKeys = Extract<
  keyof NewPerpetrator,
  | 'perpetratorName'
  | 'perpetratorAlias'
  | 'perpetratorRelationshipToVictim'
  | 'suspectIdentified'
  | 'suspectArrested'
  | 'suspectCharged'
  | 'conviction'
  | 'sentence'
>;

type PerpetratorFormValues = Pick<NewPerpetrator, PerpetratorFieldKeys> & {
  articleId?: string | null;
  charges?: string;
};

const UNKNOWN_NAME = 'Unknown';

const PerpetratorForm: React.FC<PerpetratorFormProps> = ({
  onSubmit,
  perpetrators = [],
  onClearPerpetrators,
  requiredFields,
  roleProfileContext,
  visibleFieldGroups,
}) => {
  // Default data for dev/testing
  const RESET_DATA: PerpetratorFormValues = {
    perpetratorName: '',
    perpetratorAlias: '',
    perpetratorRelationshipToVictim: '',
    suspectIdentified: '',
    suspectArrested: '',
    suspectCharged: '',
    conviction: '',
    sentence: '',
    charges: '[]',
  };
  const [currentPerpetrator, setCurrentPerpetrator] =
    useState<PerpetratorFormValues>(RESET_DATA);
  const [isUnknownName, setIsUnknownName] = useState(false);
  const [aliases, setAliases] = useState<string[]>(['']);
  const [charges, setCharges] = useState<ChargeEntry[]>([createDefaultChargeEntry()]);

  const groupVisibility = useMemo(
    () => ({
      coreIdentity:
        !visibleFieldGroups || visibleFieldGroups.includes('coreIdentity'),
      relationship:
        !visibleFieldGroups || visibleFieldGroups.includes('relationship'),
      suspectStatus:
        !visibleFieldGroups || visibleFieldGroups.includes('suspectStatus'),
      conviction:
        !visibleFieldGroups || visibleFieldGroups.includes('conviction'),
    }),
    [visibleFieldGroups],
  );

  const visibleFields = useMemo(
    () =>
      buildVisibleFieldSet(groupVisibility, {
        coreIdentity: ['perpetratorName', 'perpetratorAlias'],
        relationship: ['perpetratorRelationshipToVictim'],
        suspectStatus: ['suspectIdentified', 'suspectArrested', 'suspectCharged'],
        conviction: ['conviction', 'sentence', 'charges'],
      }),
    [groupVisibility],
  );

  const effectiveRequiredFields = useMemo(
    () => filterRequiredFieldsByVisibility(requiredFields, visibleFields),
    [requiredFields, visibleFields],
  );

  const constraintState = useConstraintEvaluation(
    currentPerpetrator as Record<string, unknown>,
    'perpetrator',
    roleProfileContext,
    { requiredFields: effectiveRequiredFields },
  );
  const hasValidName =
    isUnknownName || Boolean((currentPerpetrator.perpetratorName ?? '').trim());
  const isValid = constraintState.isValid && hasValidName;

  const handleChange = <K extends keyof PerpetratorFormValues>(
    field: K,
    value: PerpetratorFormValues[K],
  ) => {
    if (field === 'suspectIdentified') {
      const nextValue = value as string;
      setCurrentPerpetrator((prev) => ({
        ...prev,
        suspectIdentified: nextValue,
        suspectArrested: nextValue === 'Yes' ? prev.suspectArrested : '',
        suspectCharged:
          nextValue === 'Yes' && prev.suspectArrested === 'Yes'
            ? prev.suspectCharged
            : '',
      }));
      if (nextValue !== 'Yes') {
        setCharges([createDefaultChargeEntry()]);
      }
      return;
    }

    if (field === 'suspectArrested') {
      const nextValue = value as string;
      setCurrentPerpetrator((prev) => ({
        ...prev,
        suspectArrested: nextValue,
        suspectCharged: nextValue === 'Yes' ? prev.suspectCharged : '',
      }));
      if (nextValue !== 'Yes') {
        setCharges([createDefaultChargeEntry()]);
      }
      return;
    }

    if (field === 'suspectCharged') {
      const nextValue = value as string;
      setCurrentPerpetrator((prev) => ({ ...prev, suspectCharged: nextValue }));
      if (nextValue !== 'Yes') {
        setCharges([createDefaultChargeEntry()]);
      }
      return;
    }

    setCurrentPerpetrator((prev) => ({ ...prev, [field]: value }));
  };

  const handleUnknownNameToggle = (checked: boolean) => {
    setIsUnknownName(checked);
    if (checked) {
      handleChange('perpetratorName', UNKNOWN_NAME);
      return;
    }
    if ((currentPerpetrator.perpetratorName ?? '').trim() === UNKNOWN_NAME) {
      handleChange('perpetratorName', '');
    }
  };

  const updateCharge = (index: number, update: (charge: ChargeEntry) => ChargeEntry) => {
    setCharges((prev) => prev.map((charge, i) => (i === index ? update(charge) : charge)));
  };

  const handleAddPerpetrator = () => {
    if (isValid) {
      const preparedCharges = currentPerpetrator.suspectCharged === 'Yes' ? charges : [];
      const firstCharge = preparedCharges[0];
      const perpetratorToSubmit: PerpetratorFormValues = {
        ...currentPerpetrator,
        perpetratorName: isUnknownName
          ? UNKNOWN_NAME
          : (currentPerpetrator.perpetratorName ?? '').trim(),
        perpetratorAlias: serializeAliases(aliases),
        charges: JSON.stringify(preparedCharges),
        conviction: mapConvictionFromCharge(firstCharge),
        sentence: buildSentenceFromCharge(firstCharge),
      };
      onSubmit(perpetratorToSubmit);

      // Reset form
      setCurrentPerpetrator(RESET_DATA);
      setIsUnknownName(false);
      setAliases(['']);
      setCharges([createDefaultChargeEntry()]);
    }
  };

  const relationshipOptions = [
    { value: '', label: 'Select Relationship' },
    { value: 'Spouse/Partner', label: 'Spouse/Partner' },
    { value: 'Ex-Spouse/Ex-Partner', label: 'Ex-Spouse/Ex-Partner' },
    { value: 'Family Member', label: 'Family Member' },
    { value: 'Friend', label: 'Friend' },
    { value: 'Acquaintance', label: 'Acquaintance' },
    { value: 'Stranger', label: 'Stranger' },
    { value: 'Unknown', label: 'Unknown' },
    { value: 'Other', label: 'Other' },
  ];

  const yesNoOptions = [
    { value: '', label: 'Select' },
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' },
    { value: 'Unknown', label: 'Unknown' },
  ];

  const chargeOptions = [
    { value: 'Unknown', label: 'Unknown' },
    { value: 'Murder', label: 'Murder' },
    { value: 'Attempted Murder', label: 'Attempted Murder' },
    { value: 'Culpable Homicide', label: 'Culpable Homicide' },
    { value: 'Assault', label: 'Assault' },
    { value: 'Robbery', label: 'Robbery' },
    { value: 'Other', label: 'Other' },
  ];

  const convictedOptions = [
    { value: 'Unknown', label: 'Unknown' },
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' },
  ];

  const sentenceTypeOptions = [
    { value: 'Unknown', label: 'Unknown' },
    { value: 'Imprisonment', label: 'Imprisonment' },
    { value: 'Correctional supervision', label: 'Correctional supervision' },
    { value: 'Suspended sentence', label: 'Suspended sentence' },
    { value: 'Fine', label: 'Fine' },
    { value: 'Capital punishment', label: 'Capital punishment' },
    { value: 'Other', label: 'Other' },
  ];

  const imprisonmentUnitOptions: Array<'Life term' | 'Year' | 'Month'> = [
    'Life term',
    'Year',
    'Month',
  ];

  const correctionalUnitOptions: Array<'Year' | 'Month'> = ['Year', 'Month'];

  const currencyOptions = [
    { value: 'ZAR', label: 'ZAR' },
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
    { value: 'GBP', label: 'GBP' },
  ];

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Suspect Information</h4>
          {Array.isArray(perpetrators) && perpetrators.length > 0 && (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={onClearPerpetrators}
            >
              Clear All Suspects
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Body>
        {Array.isArray(perpetrators) && perpetrators.length > 0 && (
          <Alert variant="info" className="mb-3">
            <strong>{perpetrators.length} suspect(s) added:</strong>
            <ListGroup variant="flush" className="mt-2">
              {perpetrators.map((perpetrator, index) => (
                <ListGroup.Item key={index} className="px-0">
                  <strong>{perpetrator.perpetratorName}</strong>
                  {perpetrator.perpetratorRelationshipToVictim &&
                    ` - ${perpetrator.perpetratorRelationshipToVictim}`}
                  {perpetrator.suspectArrested &&
                    ` | Arrested: ${perpetrator.suspectArrested}`}
                  {perpetrator.conviction &&
                    ` | Conviction: ${perpetrator.conviction}`}
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
                  <Form.Label className="d-flex justify-content-between align-items-center">
                    <span>Suspect Name *</span>
                    <Form.Check
                      type="checkbox"
                      label="Unknown"
                      checked={isUnknownName}
                      onChange={(event) =>
                        handleUnknownNameToggle(event.target.checked)
                      }
                    />
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={currentPerpetrator.perpetratorName ?? ''}
                    onChange={(e) =>
                      handleChange('perpetratorName', e.target.value)
                    }
                    placeholder="Full name of suspect"
                    disabled={isUnknownName}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Aliases</Form.Label>
                  {aliases.map((alias, index) => (
                    <div key={`alias-${index}`} className="d-flex align-items-center gap-2 mb-2">
                      <Form.Control
                        type="text"
                        value={alias}
                        onChange={(event) => {
                          const nextAliases = [...aliases];
                          nextAliases[index] = event.target.value;
                          setAliases(nextAliases);
                        }}
                        placeholder={`Alias ${index + 1}`}
                      />
                      <Button
                        variant="outline-danger"
                        type="button"
                        onClick={() => {
                          setAliases((prev) => {
                            const next = prev.filter((_, aliasIndex) => aliasIndex !== index);
                            return next.length > 0 ? next : [''];
                          });
                        }}
                        aria-label={`Remove alias ${index + 1}`}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    type="button"
                    onClick={() => setAliases((prev) => [...prev, ''])}
                  >
                    + Add Alias
                  </Button>
                </Form.Group>
              </Col>
            </Row>
          )}

          {groupVisibility.relationship && (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Relationship to Victim</Form.Label>
                  <Form.Select
                    value={
                      currentPerpetrator.perpetratorRelationshipToVictim ?? ''
                    }
                    onChange={(e) =>
                      handleChange(
                        'perpetratorRelationshipToVictim',
                        e.target.value,
                      )
                    }
                  >
                    {relationshipOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          )}

          {groupVisibility.suspectStatus && (
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Suspect Identified</Form.Label>
                  <Form.Select
                    value={currentPerpetrator.suspectIdentified ?? ''}
                    onChange={(e) =>
                      handleChange('suspectIdentified', e.target.value)
                    }
                  >
                    {yesNoOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              {currentPerpetrator.suspectIdentified === 'Yes' && (
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Suspect Arrested</Form.Label>
                    <Form.Select
                      value={currentPerpetrator.suspectArrested ?? ''}
                      onChange={(e) =>
                        handleChange('suspectArrested', e.target.value)
                      }
                    >
                      {yesNoOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              )}
              {currentPerpetrator.suspectIdentified === 'Yes' &&
                currentPerpetrator.suspectArrested === 'Yes' && (
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Suspect Charged</Form.Label>
                      <Form.Select
                        value={currentPerpetrator.suspectCharged ?? ''}
                        onChange={(e) =>
                          handleChange('suspectCharged', e.target.value)
                        }
                      >
                        {yesNoOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                )}
            </Row>
          )}

          {groupVisibility.conviction &&
            currentPerpetrator.suspectCharged === 'Yes' && (
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Form.Label className="mb-0">Charges</Form.Label>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    type="button"
                    onClick={() =>
                      setCharges((prev) => [...prev, createDefaultChargeEntry()])
                    }
                  >
                    + Add Charge
                  </Button>
                </div>

                {charges.map((charge, index) => (
                  <Card key={`charge-${index}`} className="mb-3">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <strong>Charge {index + 1}</strong>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          type="button"
                          onClick={() => {
                            setCharges((prev) => {
                              const next = prev.filter((_, i) => i !== index);
                              return next.length > 0
                                ? next
                                : [createDefaultChargeEntry()];
                            });
                          }}
                          aria-label={`Remove charge ${index + 1}`}
                        >
                          ×
                        </Button>
                      </div>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Charge</Form.Label>
                            <Form.Select
                              value={charge.charge}
                              onChange={(event) => {
                                const nextCharge = event.target.value;
                                updateCharge(index, (current) => ({
                                  ...current,
                                  charge: nextCharge,
                                  chargeOther: nextCharge === 'Other' ? current.chargeOther : '',
                                }));
                              }}
                            >
                              {chargeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Convicted?</Form.Label>
                            <Form.Select
                              value={charge.convicted}
                              onChange={(event) => {
                                const convicted = event.target.value as ChargeEntry['convicted'];
                                updateCharge(index, (current) => ({
                                  ...current,
                                  convicted,
                                  sentenceType:
                                    convicted === 'Yes' ? current.sentenceType : 'Unknown',
                                }));
                              }}
                            >
                              {convictedOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>

                      {charge.charge === 'Other' && (
                        <Form.Group className="mb-3">
                          <Form.Label>Other Charge</Form.Label>
                          <Form.Control
                            type="text"
                            value={charge.chargeOther}
                            onChange={(event) =>
                              updateCharge(index, (current) => ({
                                ...current,
                                chargeOther: event.target.value,
                              }))
                            }
                            placeholder="Enter charge"
                          />
                        </Form.Group>
                      )}

                      {charge.convicted === 'Yes' && (
                        <>
                          <Form.Group className="mb-3">
                            <Form.Label>Sentence Type</Form.Label>
                            <Form.Select
                              value={charge.sentenceType}
                              onChange={(event) => {
                                const sentenceType =
                                  event.target.value as ChargeEntry['sentenceType'];
                                updateCharge(index, (current) => ({
                                  ...current,
                                  sentenceType,
                                }));
                              }}
                            >
                              {sentenceTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>

                          {charge.sentenceType === 'Imprisonment' && (
                            <Row>
                              <Col md={4}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Term Quantity</Form.Label>
                                  <Form.Control
                                    type="number"
                                    min={1}
                                    value={charge.imprisonmentQuantity}
                                    onChange={(event) => {
                                      const parsed = Number(event.target.value);
                                      updateCharge(index, (current) => ({
                                        ...current,
                                        imprisonmentQuantity:
                                          Number.isNaN(parsed) || parsed < 1 ? 1 : parsed,
                                      }));
                                    }}
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={8}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Term Unit</Form.Label>
                                  <Form.Select
                                    value={charge.imprisonmentUnit}
                                    onChange={(event) =>
                                      updateCharge(index, (current) => ({
                                        ...current,
                                        imprisonmentUnit:
                                          event.target.value as ChargeEntry['imprisonmentUnit'],
                                      }))
                                    }
                                  >
                                    {imprisonmentUnitOptions.map((option) => (
                                      <option key={option} value={option}>
                                        {pluralizeTermUnit(option, charge.imprisonmentQuantity)}
                                      </option>
                                    ))}
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                            </Row>
                          )}

                          {charge.sentenceType === 'Correctional supervision' && (
                            <>
                              <Row>
                                <Col md={4}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>Term Quantity</Form.Label>
                                    <Form.Control
                                      type="number"
                                      min={1}
                                      value={charge.correctionalQuantity}
                                      onChange={(event) => {
                                        const parsed = Number(event.target.value);
                                        updateCharge(index, (current) => ({
                                          ...current,
                                          correctionalQuantity:
                                            Number.isNaN(parsed) || parsed < 1 ? 1 : parsed,
                                        }));
                                      }}
                                    />
                                  </Form.Group>
                                </Col>
                                <Col md={8}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>Term Unit</Form.Label>
                                    <Form.Select
                                      value={charge.correctionalUnit}
                                      onChange={(event) =>
                                        updateCharge(index, (current) => ({
                                          ...current,
                                          correctionalUnit:
                                            event.target.value as ChargeEntry['correctionalUnit'],
                                        }))
                                      }
                                    >
                                      {correctionalUnitOptions.map((option) => (
                                        <option key={option} value={option}>
                                          {pluralizeTermUnit(
                                            option,
                                            charge.correctionalQuantity,
                                          )}
                                        </option>
                                      ))}
                                    </Form.Select>
                                  </Form.Group>
                                </Col>
                              </Row>
                              <Form.Group className="mb-3">
                                <Form.Label>Details (Optional)</Form.Label>
                                <Form.Control
                                  type="text"
                                  value={charge.correctionalDetails}
                                  onChange={(event) =>
                                    updateCharge(index, (current) => ({
                                      ...current,
                                      correctionalDetails: event.target.value,
                                    }))
                                  }
                                  placeholder="Additional details"
                                />
                              </Form.Group>
                            </>
                          )}

                          {charge.sentenceType === 'Fine' && (
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Amount</Form.Label>
                                  <Form.Control
                                    type="number"
                                    min={0}
                                    value={charge.fineAmount ?? ''}
                                    onChange={(event) => {
                                      const raw = event.target.value;
                                      const parsed = raw === '' ? null : Number(raw);
                                      updateCharge(index, (current) => ({
                                        ...current,
                                        fineAmount:
                                          parsed === null || Number.isNaN(parsed)
                                            ? null
                                            : parsed,
                                      }));
                                    }}
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Currency</Form.Label>
                                  <Form.Select
                                    value={charge.fineCurrency}
                                    onChange={(event) =>
                                      updateCharge(index, (current) => ({
                                        ...current,
                                        fineCurrency: event.target.value,
                                      }))
                                    }
                                  >
                                    {currencyOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                            </Row>
                          )}

                          {charge.sentenceType === 'Other' && (
                            <Form.Group className="mb-3">
                              <Form.Label>Other Sentencing</Form.Label>
                              <Form.Control
                                type="text"
                                value={charge.sentenceOther}
                                onChange={(event) =>
                                  updateCharge(index, (current) => ({
                                    ...current,
                                    sentenceOther: event.target.value,
                                  }))
                                }
                                placeholder="Describe sentencing"
                              />
                            </Form.Group>
                          )}
                        </>
                      )}
                    </Card.Body>
                  </Card>
                ))}
              </div>
          )}

          <div className="d-flex justify-content-end">
            <Button
              variant="primary"
              onClick={handleAddPerpetrator}
              disabled={!isValid}
            >
              Add Suspect
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default PerpetratorForm;

export type { PerpetratorFormValues };
