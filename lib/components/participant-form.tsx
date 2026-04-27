'use client';

import React, { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, ListGroup, Row } from 'react-bootstrap';
import VictimForm, { type VictimFormValues } from './victim-form';
import PerpetratorForm, { type PerpetratorFormValues } from './perpetrator-form';
import {
  type ParticipantType,
} from '@/lib/contracts/participant-form';
import {
  type ProfileVisibilityRules,
  type RoleProfileContext,
  resolveRequiredConstraintFields,
  useRoleFieldVisibility,
} from './role-visibility';

export interface OtherParticipantFormValues {
  participantName: string;
  participantAlias: string;
  participantRole: string;
}

interface ParticipantFormProps {
  onSubmitVictim: (data: VictimFormValues) => void;
  onSubmitPerpetrator: (data: PerpetratorFormValues) => void;
  onSubmitOther: (data: OtherParticipantFormValues) => void;
  victims: VictimFormValues[];
  perpetrators: PerpetratorFormValues[];
  otherParticipants: OtherParticipantFormValues[];
  onClearVictims: () => void;
  onClearPerpetrators: () => void;
  onClearOtherParticipants: () => void;
  roleProfileContext?: RoleProfileContext;
  profileVisibilityRules?: ProfileVisibilityRules;
  victimRequiredFields?: readonly string[];
  perpetratorRequiredFields?: readonly string[];
}

const ParticipantForm: React.FC<ParticipantFormProps> = ({
  onSubmitVictim,
  onSubmitPerpetrator,
  onSubmitOther,
  victims,
  perpetrators,
  otherParticipants,
  onClearVictims,
  onClearPerpetrators,
  onClearOtherParticipants,
  roleProfileContext,
  profileVisibilityRules,
  victimRequiredFields,
  perpetratorRequiredFields,
}) => {
  const [participantType, setParticipantType] = useState<ParticipantType>('victim');
  const [otherForm, setOtherForm] = useState<OtherParticipantFormValues>({
    participantName: '',
    participantAlias: '',
    participantRole: '',
  });
  const [otherEditIndex, setOtherEditIndex] = useState<number | null>(null);

  const otherIsValid = useMemo(
    () => Boolean(otherForm.participantName.trim()),
    [otherForm.participantName],
  );
  const visibleFieldGroups = useRoleFieldVisibility(
    participantType,
    roleProfileContext,
    profileVisibilityRules,
  );
  const resolvedVictimRequiredFields = useMemo(
    () =>
      resolveRequiredConstraintFields('victim', roleProfileContext, {
        requiredFields: victimRequiredFields,
      }),
    [roleProfileContext, victimRequiredFields],
  );
  const resolvedPerpetratorRequiredFields = useMemo(
    () =>
      resolveRequiredConstraintFields('perpetrator', roleProfileContext, {
        requiredFields: perpetratorRequiredFields,
      }),
    [roleProfileContext, perpetratorRequiredFields],
  );
  const hasVictimFormFields = visibleFieldGroups.includes('deathDetails');
  const hasPerpetratorFormFields = visibleFieldGroups.includes('suspectStatus');
  const hasOtherFormFields = visibleFieldGroups.includes('coreIdentity');

  return (
    <>
      <Card className="mb-4">
        <Card.Header>
          <h4 className="mb-0">Participant Type</h4>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label>Select Participant Profile</Form.Label>
                <Form.Select
                  value={participantType}
                  onChange={(e) => setParticipantType(e.target.value as ParticipantType)}
                >
                  <option value="victim">Victim</option>
                  <option value="perpetrator">Suspect</option>
                  <option value="other">Other</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {participantType === 'victim' && !hasVictimFormFields && (
        <Alert variant="warning">
          Your role/profile visibility settings do not allow victim fields in this
          form.
        </Alert>
      )}

      {participantType === 'victim' && hasVictimFormFields && (
        <VictimForm
          onSubmit={onSubmitVictim}
          victims={victims}
          onClearVictims={onClearVictims}
          roleProfileContext={roleProfileContext}
          requiredFields={resolvedVictimRequiredFields}
          visibleFieldGroups={visibleFieldGroups}
        />
      )}

      {participantType === 'perpetrator' && !hasPerpetratorFormFields && (
        <Alert variant="warning">
          Your role/profile visibility settings do not allow perpetrator fields in
          this form.
        </Alert>
      )}

      {participantType === 'perpetrator' && hasPerpetratorFormFields && (
        <PerpetratorForm
          onSubmit={onSubmitPerpetrator}
          perpetrators={perpetrators}
          onClearPerpetrators={onClearPerpetrators}
          roleProfileContext={roleProfileContext}
          requiredFields={resolvedPerpetratorRequiredFields}
          visibleFieldGroups={visibleFieldGroups}
        />
      )}

      {participantType === 'other' && !hasOtherFormFields && (
        <Alert variant="warning">
          Your role/profile visibility settings do not allow other participant
          fields in this form.
        </Alert>
      )}

      {participantType === 'other' && hasOtherFormFields && (
        <Card className="mb-4">
          <Card.Header>
            <div className="d-flex justify-content-between align-items-center">
              <h4 className="mb-0">Other Participant Information</h4>
              {otherParticipants.length > 0 && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => {
                    onClearOtherParticipants();
                    setOtherEditIndex(null);
                    setOtherForm({
                      participantName: '',
                      participantAlias: '',
                      participantRole: '',
                    });
                  }}
                >
                  Clear All Others
                </Button>
              )}
            </div>
          </Card.Header>
          <Card.Body>
            {otherParticipants.length > 0 && (
              <Alert variant="info" className="mb-3">
                <strong>{otherParticipants.length} other participant(s) added:</strong>
                <ListGroup variant="flush" className="mt-2">
                  {otherParticipants.map((participant, index) => (
                    <ListGroup.Item
                      key={index}
                      action
                      className="px-0"
                      onClick={() => {
                        setOtherForm({
                          participantName: participant.participantName ?? '',
                          participantAlias: participant.participantAlias ?? '',
                          participantRole: participant.participantRole ?? '',
                        });
                        setOtherEditIndex(index);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <strong>{participant.participantName}</strong>
                      {participant.participantAlias
                        ? ` - ${participant.participantAlias}`
                        : ''}
                      {participant.participantRole
                        ? ` | Role: ${participant.participantRole}`
                        : ''}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Alert>
            )}

            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Participant Name *</Form.Label>
                    <Form.Control
                      type="text"
                      value={otherForm.participantName}
                      onChange={(e) =>
                        setOtherForm((prev) => ({
                          ...prev,
                          participantName: e.target.value,
                        }))
                      }
                      placeholder="Full name"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Alias</Form.Label>
                    <Form.Control
                      type="text"
                      value={otherForm.participantAlias}
                      onChange={(e) =>
                        setOtherForm((prev) => ({
                          ...prev,
                          participantAlias: e.target.value,
                        }))
                      }
                      placeholder="Known alias/nickname"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Role</Form.Label>
                    <Form.Control
                      type="text"
                      value={otherForm.participantRole}
                      onChange={(e) =>
                        setOtherForm((prev) => ({
                          ...prev,
                          participantRole: e.target.value,
                        }))
                      }
                      placeholder="Ad hoc role descriptor (e.g. Witness, Neighbour)"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex justify-content-end gap-2">
                {otherEditIndex !== null && (
                  <Button
                    variant="outline-secondary"
                    onClick={() => {
                      setOtherForm({
                        participantName: '',
                        participantAlias: '',
                        participantRole: '',
                      });
                      setOtherEditIndex(null);
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!otherIsValid) return;
                    if (otherEditIndex === null) {
                      onSubmitOther(otherForm);
                    } else {
                      const updatedParticipants = otherParticipants.map(
                        (participant, index) =>
                          index === otherEditIndex ? otherForm : participant,
                      );
                      onClearOtherParticipants();
                      updatedParticipants.forEach((participant) =>
                        onSubmitOther(participant),
                      );
                    }
                    setOtherForm({
                      participantName: '',
                      participantAlias: '',
                      participantRole: '',
                    });
                    setOtherEditIndex(null);
                  }}
                  disabled={!otherIsValid}
                >
                  {otherEditIndex === null ? 'Add Other Participant' : 'Update Participant'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}
    </>
  );
};

export default ParticipantForm;
