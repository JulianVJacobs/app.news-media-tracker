'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import { SCHEMA_PROFILE_DEFAULT } from '../contracts/schema-profile';

interface SchemaProfileAdminProps {
  onBack: () => void;
}

type SchemaProfileRow = {
  id: string;
  name: string;
  entityLevel: string;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type ApiResponse = {
  success: boolean;
  data?: SchemaProfileRow[] | SchemaProfileRow | { id: string };
  error?: string;
  details?: string[];
};

const SchemaProfileAdmin: React.FC<SchemaProfileAdminProps> = ({ onBack }) => {
  const [profiles, setProfiles] = useState<SchemaProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [entityLevel, setEntityLevel] = useState('event');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setEntityLevel('event');
    setDescription('');
  };

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/schema-profiles', {
        cache: 'no-store',
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.success) {
        setError(payload.error ?? 'Failed to load schema profiles');
        setProfiles([]);
        return;
      }
      const rows = Array.isArray(payload.data) ? payload.data : [];
      setProfiles(rows);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Failed to load schema profiles');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfiles();
  }, [fetchProfiles]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const body = {
        id: editingId ?? undefined,
        name,
        entityLevel,
        description,
      };
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch('/api/schema-profiles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.success) {
        const detailMessage = payload.details?.join(', ');
        setError(detailMessage ?? payload.error ?? 'Failed to save schema profile');
        return;
      }

      resetForm();
      await fetchProfiles();
    } catch (submitError) {
      console.error(submitError);
      setError('Failed to save schema profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (profile: SchemaProfileRow) => {
    setEditingId(profile.id);
    setName(profile.name);
    setEntityLevel(profile.entityLevel);
    setDescription(profile.description ?? '');
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      'Delete this profile? This action cannot be undone.',
    );
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/schema-profiles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.success) {
        const detailMessage = payload.details?.join(', ');
        setError(detailMessage ?? payload.error ?? 'Failed to delete schema profile');
        return;
      }
      if (editingId === id) {
        resetForm();
      }
      await fetchProfiles();
    } catch (deleteError) {
      console.error(deleteError);
      setError('Failed to delete schema profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Card className="shadow-sm mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h2 className="h4 mb-0">Schema Profile Administration</h2>
          <Button variant="outline-secondary" onClick={onBack}>
            Back to Home
          </Button>
        </Card.Header>
        <Card.Body>
          <p className="text-muted mb-0">
            Create, edit, and delete schema profiles used by profile-aware forms.
          </p>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      <Card className="shadow-sm mb-4">
        <Card.Header>
          {editingId ? `Edit Profile: ${editingId}` : 'Create New Profile'}
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row className="g-3">
              <Col md={5}>
                <Form.Group controlId="schema-profile-name">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    disabled={submitting}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="schema-profile-entity-level">
                  <Form.Label>Entity Level</Form.Label>
                  <Form.Control
                    value={entityLevel}
                    onChange={(event) => setEntityLevel(event.target.value)}
                    required
                    disabled={submitting}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="schema-profile-description">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={submitting}
                  />
                </Form.Group>
              </Col>
            </Row>
            <div className="mt-3 d-flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <Spinner size="sm" className="me-2" />}
                {editingId ? 'Save Changes' : 'Create Profile'}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>Profiles</span>
          <Badge bg="secondary">{profiles.length}</Badge>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="p-4 text-center">
              <Spinner animation="border" size="sm" className="me-2" />
              Loading profiles...
            </div>
          ) : profiles.length === 0 ? (
            <div className="p-4 text-muted">No schema profiles found.</div>
          ) : (
            <Table hover responsive className="mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Entity Level</th>
                  <th>Description</th>
                  <th style={{ width: '180px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td>{profile.id}</td>
                    <td>{profile.name}</td>
                    <td>{profile.entityLevel}</td>
                    <td>{profile.description ?? '-'}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleEdit(profile)}
                          disabled={submitting}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDelete(profile.id)}
                          disabled={
                            submitting || profile.id === SCHEMA_PROFILE_DEFAULT
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default SchemaProfileAdmin;
