import type { PluginHttpMethod, PluginHttpRequest } from '../../../../plugin/contracts/http';
import {
  bindHostedAuthContext,
  getHostedPluginRuntime,
} from '../../../../plugin/runtime/hosted-atom-runtime';

type RouteContext = {
  params: {
    pluginPath?: string[];
  };
};

const toPluginPath = (pluginPath?: string[]): string =>
  pluginPath && pluginPath.length > 0 ? `/${pluginPath.join('/')}` : '/';

const toQueryPayload = (request: Request): Record<string, string | undefined> => {
  const searchParams = new URL(request.url).searchParams;
  const query: Record<string, string | undefined> = {};
  for (const [key, value] of searchParams.entries()) {
    query[key] = value;
  }
  return query;
};

const parseBody = async (request: Request): Promise<unknown> => {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return undefined;
  }

  const text = await request.text();
  if (!text.trim()) return undefined;
  return JSON.parse(text) as unknown;
};

const dispatchHostedRuntime = async (
  method: PluginHttpMethod,
  request: Request,
  context: RouteContext,
): Promise<Response> => {
  try {
    const runtimeRequest: PluginHttpRequest = {
      query: toQueryPayload(request),
      body: method === 'GET' ? undefined : await parseBody(request),
      auth: bindHostedAuthContext(request),
    };
    const response = await getHostedPluginRuntime().dispatch(
      method,
      toPluginPath(context.params.pluginPath),
      runtimeRequest,
    );

    return Response.json(response.body, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'invalid_request',
            message: 'Request body must be valid JSON',
          },
        },
        { status: 400 },
      );
    }

    console.error('Hosted plugin runtime request failed:', error);
    const auth = bindHostedAuthContext(request);
    console.error('Hosted plugin runtime request context:', {
      method,
      pluginPath: toPluginPath(context.params.pluginPath),
      userId: auth.userId ?? null,
    });
    return Response.json(
      {
        success: false,
        error: {
          code: 'runtime_error',
          message: 'Hosted plugin runtime execution failed',
        },
      },
      { status: 500 },
    );
  }
};

export const GET = (request: Request, context: RouteContext): Promise<Response> =>
  dispatchHostedRuntime('GET', request, context);

export const POST = (request: Request, context: RouteContext): Promise<Response> =>
  dispatchHostedRuntime('POST', request, context);
