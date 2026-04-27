import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { GET, POST } from './[[...pluginPath]]/route';
import { __resetHostedPluginRuntimeForTesting } from '../../../plugin/runtime/hosted-atom-runtime';

const createRequest = (
  url: string,
  options: { headers?: Record<string, string>; body?: unknown } = {},
): Request =>
  ({
    url,
    headers: {
      get: (name: string) => {
        const key = name.toLowerCase();
        const headers = options.headers ?? {};
        for (const [headerName, value] of Object.entries(headers)) {
          if (headerName.toLowerCase() === key) {
            return value;
          }
        }
        return null;
      },
    },
    text: async () =>
      typeof options.body === 'string' ? options.body : JSON.stringify(options.body ?? ''),
  }) as unknown as Request;

describe('hosted plugin runtime route binding', () => {
  const originalResponse = global.Response;

  beforeAll(() => {
    // Minimal Response.json test double for this route only. It intentionally
    // omits most Response fields/methods, so it should not be reused where a
    // complete fetch Response shape is required.
    global.Response = class {
      static json(body: unknown, init?: ResponseInit) {
        return {
          status: init?.status ?? 200,
          json: async () => body,
        };
      }
    } as unknown as typeof Response;
  });

  afterEach(() => {
    __resetHostedPluginRuntimeForTesting();
  });

  afterAll(() => {
    global.Response = originalResponse;
  });

  it('exposes plugin health through the hosted workbench path', async () => {
    const response = await GET(createRequest('http://localhost/api/workbench'), {
      params: {},
    });
    const payload = (await response.json()) as {
      success: boolean;
      data: { registered: boolean; pluginId: string };
    };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.registered).toBe(true);
    expect(payload.data.pluginId).toBe('access-homicide-tracker');
  });

  it('binds hosted auth headers to ACL checks and route execution', async () => {
    const unauthorized = await GET(
      createRequest('http://localhost/api/workbench/actors?limit=5', {
        headers: { 'x-atom-user-id': 'user-1' },
      }),
      { params: { pluginPath: ['actors'] } },
    );
    expect(unauthorized.status).toBe(403);

    const administrator = await GET(
      createRequest('http://localhost/api/workbench/actors?limit=5', {
        headers: {
          'x-atom-user-id': 'admin-1',
          'x-atom-user-roles': 'administrator',
        },
      }),
      { params: { pluginPath: ['actors'] } },
    );

    expect(administrator.status).toBe(200);
    await expect(administrator.json()).resolves.toMatchObject({
      success: true,
      data: { items: [], total: 0 },
    });
  });

  it('serves core contract endpoints through hosted route execution path', async () => {
    const created = await POST(
      createRequest('http://localhost/api/workbench/actors', {
        headers: {
          'content-type': 'application/json',
          'x-atom-user-id': 'editor-1',
          'x-atom-user-permissions': 'actors:create',
        },
        body: {
          canonicalLabel: 'Hosted Actor',
          actorKind: 'person',
          aliases: ['H. Actor'],
        },
      }),
      { params: { pluginPath: ['actors'] } },
    );
    expect(created.status).toBe(201);

    const listed = await GET(
      createRequest('http://localhost/api/workbench/actors?search=Hosted', {
        headers: {
          'x-atom-user-id': 'editor-1',
          'x-atom-user-permissions': 'actors:read',
        },
      }),
      { params: { pluginPath: ['actors'] } },
    );

    expect(listed.status).toBe(200);
    await expect(listed.json()).resolves.toMatchObject({
      success: true,
      data: {
        total: 1,
        items: [
          expect.objectContaining({
            canonicalLabel: 'Hosted Actor',
          }),
        ],
      },
    });
  });
});
