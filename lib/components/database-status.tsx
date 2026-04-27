/**
 * Database Status Component for Homicide Media Tracker
 *
 * This component displays the current database status, sync capabilities,
 * and provides controls for database operations like backup and sync.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';

interface DatabaseStatus {
  isInitialised: boolean;
  syncEnabled: boolean;
  localPath: string;
  remoteUrl: string | null;
  error?: string;
}

interface ElectronDatabaseAPI {
  getStatus: () => Promise<DatabaseStatus>;
  sync: () => Promise<{ success: boolean; error?: string }>;
  createBackup: () => Promise<{
    success: boolean;
    backupPath?: string;
    error?: string;
  }>;
}

const getElectronDatabase = (): ElectronDatabaseAPI | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const bridge = window.electron;
  if (
    bridge &&
    typeof bridge === 'object' &&
    'database' in bridge &&
    bridge.database
  ) {
    return bridge.database as ElectronDatabaseAPI;
  }
  return null;
};

const DatabaseStatus: React.FC = () => {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [backing, setBacking] = useState(false);

  const fetchStatus = async () => {
    try {
      // Check if we're in Electron environment
      const electronDatabase = getElectronDatabase();
      if (electronDatabase) {
        const dbStatus = await electronDatabase.getStatus();
        setStatus(dbStatus);
      } else {
        // Fallback for web environment - database is managed by API routes
        setStatus({
          isInitialised: true,
          syncEnabled: false,
          localPath: 'API Routes',
          remoteUrl: null,
        });
      }
    } catch (error) {
      console.error('Failed to fetch database status:', error);
      setStatus({
        isInitialised: false,
        syncEnabled: false,
        localPath: '',
        remoteUrl: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    const electronDatabase = getElectronDatabase();
    if (!electronDatabase) {
      toast.warn('Sync is only available in desktop mode');
      return;
    }

    setSyncing(true);
    try {
      const result = await electronDatabase.sync();
      if (result.success) {
        toast.success('Database synchronised successfully');
        await fetchStatus(); // Refresh status
      } else {
        toast.error(`Sync failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('Sync operation failed');
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleBackup = async () => {
    const electronDatabase = getElectronDatabase();
    if (!electronDatabase) {
      toast.warn('Backup is only available in desktop mode');
      return;
    }

    setBacking(true);
    try {
      const result = await electronDatabase.createBackup();
      if (result.success) {
        toast.success(`Backup created: ${result.backupPath}`);
      } else {
        toast.error(`Backup failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('Backup operation failed');
      console.error('Backup error:', error);
    } finally {
      setBacking(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <Card.Body className="d-flex align-items-center">
          <Spinner animation="border" size="sm" className="me-2" />
          Loading database status...
        </Card.Body>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <Card.Body>
          <Alert variant="danger">Failed to load database status</Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">
          <i className="bi bi-database me-2"></i>
          Database Status
        </h5>
      </Card.Header>
      <Card.Body>
        <div className="row">
          <div className="col-md-8">
            <div className="mb-3">
              <strong>Status:</strong>{' '}
              {status.isInitialised ? (
                <Badge bg="success">Initialised</Badge>
              ) : (
                <Badge bg="danger">Not Initialised</Badge>
              )}
            </div>

            <div className="mb-3">
              <strong>Local Database:</strong>{' '}
              <code className="small">{status.localPath}</code>
            </div>

            <div className="mb-3">
              <strong>Remote Sync:</strong>{' '}
              {status.syncEnabled ? (
                <>
                  <Badge bg="success">Enabled</Badge>
                  <div className="mt-1">
                    <small className="text-muted">
                      Remote: {status.remoteUrl || 'Not configured'}
                    </small>
                  </div>
                </>
              ) : (
                <Badge bg="secondary">Disabled</Badge>
              )}
            </div>

            {status.error && (
              <Alert variant="warning" className="small">
                {status.error}
              </Alert>
            )}
          </div>

          <div className="col-md-4">
            <div className="d-grid gap-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={fetchStatus}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Refresh
              </Button>

              {status.syncEnabled && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  {syncing ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-1" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cloud-arrow-up me-1"></i>
                      Sync Now
                    </>
                  )}
                </Button>
              )}

              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleBackup}
                disabled={backing || !status.isInitialised}
              >
                {backing ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-file-earmark-arrow-down me-1"></i>
                    Backup
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default DatabaseStatus;
