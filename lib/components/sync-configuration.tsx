/**
 * Sync Configuration Component for Homicide Media Tracker
 *
 * This component allows users to configure remote LibSQL database
 * synchronization for when network connectivity is available.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Alert, Spinner, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';

interface SyncConfig {
  enabled: boolean;
  remoteUrl: string | null;
  conflictResolution: 'local' | 'remote' | 'manual';
  syncInterval: number;
  lastSync: string | null;
}

const SyncConfiguration: React.FC = () => {
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [remoteUrl, setRemoteUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [syncInterval, setSyncInterval] = useState(15);
  const [conflictResolution, setConflictResolution] = useState<
    'local' | 'remote' | 'manual'
  >('local');

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/sync');
      if (!response.ok) {
        throw new Error('Failed to fetch sync configuration');
      }
      const data = await response.json();

      if (data.success) {
        setConfig(data.data);
        // Update form state
        setRemoteUrl(data.data.remoteUrl || '');
        setSyncInterval(data.data.syncInterval);
        setConflictResolution(data.data.conflictResolution);
      }
    } catch (error) {
      console.error('Failed to fetch sync config:', error);
      toast.error('Failed to load sync configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          remoteUrl,
          authToken: authToken || undefined,
          syncInterval,
          conflictResolution,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Sync configuration saved successfully');
        setShowModal(false);
        await fetchConfig(); // Refresh config
      } else {
        toast.error(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Save config error:', error);
      toast.error('Failed to save sync configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableSync = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/sync', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Sync disabled successfully');
        await fetchConfig(); // Refresh config
      } else {
        toast.error(data.error || 'Failed to disable sync');
      }
    } catch (error) {
      console.error('Disable sync error:', error);
      toast.error('Failed to disable sync');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  if (loading) {
    return (
      <Card>
        <Card.Body className="d-flex align-items-center">
          <Spinner animation="border" size="sm" className="me-2" />
          Loading sync configuration...
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Card.Header>
          <h5 className="mb-0">
            <i className="bi bi-cloud-arrow-up me-2"></i>
            Remote Sync Configuration
          </h5>
        </Card.Header>
        <Card.Body>
          {config?.enabled ? (
            <div>
              <Alert variant="success">
                <strong>Sync Enabled:</strong> This database is configured to
                sync with a remote server.
              </Alert>

              <div className="row">
                <div className="col-md-8">
                  <div className="mb-2">
                    <strong>Remote URL:</strong> <code>{config.remoteUrl}</code>
                  </div>
                  <div className="mb-2">
                    <strong>Sync Interval:</strong> {config.syncInterval}{' '}
                    minutes
                  </div>
                  <div className="mb-2">
                    <strong>Conflict Resolution:</strong>{' '}
                    <span className="badge bg-info">
                      {config.conflictResolution}
                    </span>
                  </div>
                  {config.lastSync && (
                    <div className="mb-2">
                      <strong>Last Sync:</strong>{' '}
                      {new Date(config.lastSync).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="col-md-4">
                  <div className="d-grid gap-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setShowModal(true)}
                    >
                      <i className="bi bi-gear me-1"></i>
                      Configure
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={handleDisableSync}
                      disabled={saving}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Disable Sync
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <Alert variant="warning">
                <strong>Sync Disabled:</strong> This database is operating in
                local-only mode.
              </Alert>
              <p className="text-muted">
                Enable sync to connect with a remote LibSQL server for data
                sharing and backup. This is useful when network connectivity is
                available and you want to share data with other researchers or
                backup to a central server.
              </p>
              <Button variant="primary" onClick={() => setShowModal(true)}>
                <i className="bi bi-cloud-plus me-1"></i>
                Configure Remote Sync
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Configuration Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Configure Remote Sync</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveConfig}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Remote LibSQL URL *</Form.Label>
              <Form.Control
                type="url"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="libsql://your-database-url.turso.io"
                required
              />
              <Form.Text className="text-muted">
                The URL of your remote LibSQL/Turso database
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Auth Token</Form.Label>
              <Form.Control
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Optional authentication token"
              />
              <Form.Text className="text-muted">
                Leave empty if your database doesn&rsquo;t require
                authentication
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Sync Interval (minutes)</Form.Label>
              <Form.Control
                type="number"
                value={syncInterval}
                onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                min="5"
                max="1440"
              />
              <Form.Text className="text-muted">
                How often to automatically sync with the remote database
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Conflict Resolution</Form.Label>
              <Form.Select
                value={conflictResolution}
                onChange={(e) =>
                  setConflictResolution(
                    e.target.value as 'local' | 'remote' | 'manual',
                  )
                }
              >
                <option value="local">Local wins (keep local changes)</option>
                <option value="remote">
                  Remote wins (accept remote changes)
                </option>
                <option value="manual">Manual resolution required</option>
              </Form.Select>
              <Form.Text className="text-muted">
                How to handle conflicts when the same data is modified locally
                and remotely
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default SyncConfiguration;
