interface Env {
  PAGES_ORIGIN: string;
}

interface CacheExecutionContext extends ExecutionContext {
  cache: CacheContext;
}

const CACHE_TTL_SECONDS = 60;
const SETTINGS_TAG = 'public-settings';
const TEMPLATES_TAG = 'public-templates';
const R2_ASSETS_TAG = 'public-r2-assets';

interface InvalidationPlan {
  tags: string[];
  r2Keys?: string[];
}

interface MutationPayload {
  success?: boolean;
  key?: string;
  r2_key?: string | null;
  template?: { r2_key?: string | null };
  items?: Array<{ r2_key?: string | null }>;
}

const getInvalidationPlan = (
  request: Request,
  pathname: string,
  payload: MutationPayload
): InvalidationPlan | null => {
  const method = request.method.toUpperCase();

  if (method === 'POST' && pathname === '/api/vcon/settings') {
    return { tags: [SETTINGS_TAG] };
  }

  if (method === 'POST' && pathname === '/api/vcon/templates') {
    return { tags: [TEMPLATES_TAG], r2Keys: [payload.template?.r2_key].filter((key): key is string => Boolean(key)) };
  }

  if (method === 'POST' && pathname === '/api/vcon/templates/bulk-upload') {
    const r2Keys = (payload.items || [])
      .map((item) => item.r2_key)
      .filter((key): key is string => Boolean(key));
    return { tags: [TEMPLATES_TAG], r2Keys };
  }

  if (method === 'DELETE' && /^\/api\/vcon\/templates\/[^/]+$/.test(pathname)) {
    return { tags: [TEMPLATES_TAG], r2Keys: payload.r2_key ? [payload.r2_key] : [] };
  }

  if (method === 'POST' && pathname === '/api/vcon/seed-db') {
    return { tags: [TEMPLATES_TAG] };
  }

  if (method === 'POST' && pathname === '/api/vcon/upload-asset') {
    return { tags: [], r2Keys: payload.key ? [payload.key] : [] };
  }

  if (
    (method === 'POST' && ['/api/vcon/r2-config', '/api/vcon/save-env'].includes(pathname)) ||
    (method === 'DELETE' && pathname === '/api/vcon/r2-config')
  ) {
    return { tags: [SETTINGS_TAG, TEMPLATES_TAG, R2_ASSETS_TAG] };
  }

  return null;
};

const getR2AssetKey = (url: URL): string | null => {
  const keyQuery = url.searchParams.get('key');
  if (keyQuery) return keyQuery.replace(/^\/+/, '');

  const prefix = url.pathname.startsWith('/api/r2/file/')
    ? '/api/r2/file/'
    : url.pathname.startsWith('/api/r2/object/')
    ? '/api/r2/object/'
    : null;
  if (!prefix) return null;

  try {
    return decodeURIComponent(url.pathname.slice(prefix.length)).replace(/^\/+/, '');
  } catch {
    return null;
  }
};

const getR2ObjectTag = async (key: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  const suffix = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `r2-object-${suffix}`;
};

const withResponseHeaders = (response: Response, values: Record<string, string>): Response => {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(values)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const getSuccessfulJsonBody = async (response: Response): Promise<MutationPayload | null> => {
  try {
    const body = await response.clone().json() as { success?: boolean };
    return body.success === true ? body as MutationPayload : null;
  } catch {
    return null;
  }
};

export default {
  async fetch(request: Request, env: Env, context: CacheExecutionContext): Promise<Response> {
    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, env.PAGES_ORIGIN);
    const upstreamRequest = new Request(upstreamUrl, request);
    const upstreamResponse = await fetch(upstreamRequest);
    const pathname = incomingUrl.pathname;
    const isPublicSettings = request.method === 'GET' && pathname === '/api/settings';
    const isTemplateList = request.method === 'GET' && pathname === '/api/templates';
    const isRawTemplate = request.method === 'GET' && /^\/api\/templates\/[^/]+\/raw$/.test(pathname);
    const isR2Asset = ['GET', 'HEAD'].includes(request.method) && /^\/api\/r2\/(?:file|object)(?:\/|$)/.test(pathname);

    if (isPublicSettings || isTemplateList) {
      return withResponseHeaders(upstreamResponse, {
        'Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
        'Cache-Tag': isPublicSettings ? SETTINGS_TAG : TEMPLATES_TAG,
      });
    }

    if (isRawTemplate) {
      return withResponseHeaders(upstreamResponse, { 'Cloudflare-CDN-Cache-Control': 'no-store' });
    }

    if (isR2Asset) {
      const r2Key = getR2AssetKey(incomingUrl);
      if (!upstreamResponse.ok || !r2Key) {
        return withResponseHeaders(upstreamResponse, {
          'Cache-Control': 'no-store',
          'Cloudflare-CDN-Cache-Control': 'no-store',
        });
      }
      return withResponseHeaders(upstreamResponse, {
        'Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
        'Cache-Tag': `${R2_ASSETS_TAG},${await getR2ObjectTag(r2Key)}`,
      });
    }

    if (request.method === 'GET' && /^\/api\/templates\/[^/]+$/.test(pathname)) {
      return withResponseHeaders(upstreamResponse, { 'Cloudflare-CDN-Cache-Control': 'no-store' });
    }

    const mutationPayload = upstreamResponse.ok ? await getSuccessfulJsonBody(upstreamResponse) : null;
    const invalidationPlan = mutationPayload
      ? getInvalidationPlan(request, pathname, mutationPayload)
      : null;
    if (invalidationPlan) {
      try {
        const r2ObjectTags = await Promise.all((invalidationPlan.r2Keys || []).map(getR2ObjectTag));
        const tags = Array.from(new Set([...invalidationPlan.tags, ...r2ObjectTags]));
        if (tags.length > 0) {
          const result = await context.cache.purge({ tags });
          if (!result.success) {
            console.error('Workers Cache tag purge failed', {
              pathname,
              errors: result.errors.map(({ code }) => code),
            });
            return withResponseHeaders(upstreamResponse, { 'X-Cache-Invalidation': 'failed' });
          }
        }
      } catch (error) {
        console.error('Workers Cache tag purge threw', {
          pathname,
          error: error instanceof Error ? error.name : 'CachePurgeError',
        });
        return withResponseHeaders(upstreamResponse, { 'X-Cache-Invalidation': 'failed' });
      }
    }

    return upstreamResponse;
  },
} satisfies ExportedHandler<Env>;