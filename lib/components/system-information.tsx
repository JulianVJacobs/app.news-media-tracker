'use client';

import { useEffect, useState } from 'react';
import { Container, Card, Button, Alert, Row, Col } from 'react-bootstrap';
import { isElectron, getEnvironment } from '@/lib/platform';
import DatabaseStatus from '@/lib/components/database-status';
import SyncConfiguration from '@/lib/components/sync-configuration';

interface SysInfoProps {
  onBack: () => void;
}

interface HealthStatus {
  status: string;
  message: string;
  timestamp: string;
  environment: string;
  version: string;
}

export default function SysInfo({ onBack }: SysInfoProps) {
  const [environment, setEnvironment] = useState<string>('');
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnvironment(getEnvironment());
  }, []);

  const checkHealthStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setHealthStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>System Information</h2>
            <Button
              variant="outline-secondary"
              onClick={onBack}
            >
              Back to Home
            </Button>
          </div>

          <Card className="mb-4">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">API Health Status</h5>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={checkHealthStatus}
                  disabled={loading}
                >
                  {loading ? 'Checking...' : 'Check Health'}
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {error && (
                <Alert variant="danger" className="mb-3">
                  <strong>Error:</strong> {error}
                </Alert>
              )}

              {healthStatus && (
                <Alert
                  variant={healthStatus.status === 'healthy' ? 'success' : 'warning'}
                  className="mb-3"
                >
                  <div className="d-flex justify-content-between">
                    <div>
                      <strong>Status:</strong> {healthStatus.message}
                    </div>
                    <small>{healthStatus.timestamp}</small>
                  </div>
                </Alert>
              )}

              <div className="text-center">
                <h6 className="text-muted">Environment Information</h6>
                <p className="small">
                  <strong>Platform:</strong> {isElectron() ? 'Electron Desktop App' : 'Web Browser'}<br />
                  <strong>Environment:</strong> {environment}<br />
                  <strong>Build:</strong> Next.js Standalone + Electron
                </p>
              </div>
            </Card.Body>
          </Card>

          <Row className="mt-4">
            <Col md={6}>
              <DatabaseStatus />
            </Col>
            <Col md={6}>
              <SyncConfiguration />
            </Col>
          </Row>

          <Row className="mt-4">
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>Features Available</h5>
                </Card.Header>
                <Card.Body>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      Next.js App Router
                      <span className="badge bg-success">✓</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      API Routes (Server-side)
                      <span className="badge bg-success">✓</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      TypeScript Support
                      <span className="badge bg-success">✓</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      Bootstrap UI Components
                      <span className="badge bg-success">✓</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      Homicide Case Management
                      <span className="badge bg-success">✓</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      Multi-step Form Input
                      <span className="badge bg-success">✓</span>
                    </li>
                    {isElectron() && (
                      <>
                        <li className="list-group-item d-flex justify-content-between align-items-center">
                          Desktop File System Access
                          <span className="badge bg-success">✓</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-center">
                          Native Desktop Integration
                          <span className="badge bg-success">✓</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-center">
                          Offline Capability
                          <span className="badge bg-success">✓</span>
                        </li>
                      </>
                    )}
                  </ul>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>Development Workflow</h5>
                </Card.Header>
                <Card.Body>
                  <h6>Development:</h6>
                  <pre className="bg-light p-2 rounded">
                    <code>npm start</code>
                  </pre>
                  <small className="text-muted">Starts Next.js dev server + Electron</small>

                  <h6 className="mt-3">Production Build:</h6>
                  <pre className="bg-light p-2 rounded">
                    <code>npm run build:electron<br />npm run package</code>
                  </pre>
                  <small className="text-muted">Builds standalone server + packages desktop app</small>

                  <h6 className="mt-3">Web Only:</h6>
                  <pre className="bg-light p-2 rounded">
                    <code>npm run build<br />npm run start:web</code>
                  </pre>
                  <small className="text-muted">Standard Next.js web deployment</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
}
