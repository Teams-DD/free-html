import {
  getTursoClient,
  initTursoSchema,
  seedTursoDatabase,
  getTemplates,
  getPublicTemplateMetadata,
  getTemplateBySlug,
  saveTemplate,
  deleteTemplate,
  getTemplateHtmlForSync,
  getTemplateSyncJob,
  getTemplateSyncJobs,
  completeTemplateSyncJob,
  failTemplateSyncJob,
  incrementDownloads,
  incrementViews,
  testTursoConnection,
  enforceTursoPersistence,
  TursoPersistenceError,
  getPublicCategories,
  recordActivityEvent,
  getDailyActivityAggregates,
} from './turso.ts';
import {
  getR2Client,
  getR2BucketName,
  uploadTemplateToR2,
  deleteTemplateFromR2,
  testR2Connection,
  getR2ObjectUrl,
  resolveFileUrl,
  getObjectFromR2,
  getObjectNativeR2,
  listR2Objects,
  listNativeR2Objects,
} from './r2.ts';
import {
  consumeAuthAttempt,
  createAdminToken,
  isValidAdminSecret,
  verifyAdminToken,
} from './auth.ts';
import { isValidAdminPassword } from './authPolicy.ts';

const STATUS_CACHE_TTL_MS = 30_000;
let statusCache: { expiresAt: number; status: any } | null = null;
const activityRequestWindows = new Map<string, { count: number; resetsAt: number }>();

function allowActivityRequest(key: string): boolean {
  const now = Date.now();
  for (const [entryKey, entry] of activityRequestWindows) {
    if (entry.resetsAt <= now) activityRequestWindows.delete(entryKey);
  }
  let entry = activityRequestWindows.get(key);
  if (!entry) {
    if (activityRequestWindows.size >= 1000) {
      const oldestKey = activityRequestWindows.keys().next().value;
      if (oldestKey) activityRequestWindows.delete(oldestKey);
    }
    entry = { count: 0, resetsAt: now + 60_000 };
    activityRequestWindows.set(key, entry);
  }
  if (entry.count >= 60) return false;
  entry.count += 1;
  return true;
}

function json(data: any, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      ...headers,
    },
  });
}

function resolveEnv(key: string, env?: Record<string, any>): string | undefined {
  if (env && env[key]) return env[key];
  if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key];
  return undefined;
}

function decodePathSlug(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function appendAssetRevision(
  assetUrl: string | null | undefined,
  revision: string,
  requestUrl: URL
): string | null {
  if (!assetUrl) return null;
  if (assetUrl.startsWith('data:')) return assetUrl;

  const isAbsoluteUrl = /^[a-z][a-z\d+.-]*:/i.test(assetUrl);
  const resolvedUrl = new URL(assetUrl, requestUrl.origin);
  resolvedUrl.searchParams.set('v', revision);
  return isAbsoluteUrl
    ? resolvedUrl.toString()
    : `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
}

export async function handleApiRequest(req: Request, env?: Record<string, any>): Promise<Response> {
  try {
    return await handleApiRequestInternal(req, env);
  } catch (error) {
    if (error instanceof TursoPersistenceError) {
      return json({ success: false, error: 'Persistent storage is unavailable.' }, 503);
    }
    console.error('Unhandled API request failure', {
      method: req.method,
      error_type: error instanceof Error ? error.name : 'RequestError',
    });
    return json({ success: false, error: 'Internal server error.' }, 500);
  }
}

async function handleApiRequestInternal(req: Request, env?: Record<string, any>): Promise<Response> {
  const requestStartedAt = performance.now();
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();
  let r2ConfigReadDuration = 0;

  const publicReadTimingHeaders = (tursoReadDuration: number) => ({
    'Server-Timing': [
      `handler;dur=${(performance.now() - requestStartedAt).toFixed(1)}`,
      `turso_config;dur=${r2ConfigReadDuration.toFixed(1)}`,
      `turso_read;dur=${tursoReadDuration.toFixed(1)}`,
      'r2;desc="0 object operations"',
    ].join(', '),
  });

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
    });
  }

  const tursoUrl = resolveEnv('TURSO_DATABASE_URL', env);
  const tursoToken = resolveEnv('TURSO_AUTH_TOKEN', env);
  const tursoClient = getTursoClient(tursoUrl, tursoToken);
  const isDeployedRuntime = env !== undefined || resolveEnv('NODE_ENV', env) === 'production';
  const forceStatusRefresh = pathname === '/api/status' && method === 'GET' && url.searchParams.get('refresh') === '1';
  if (pathname === '/api/status' && method === 'GET' && !forceStatusRefresh && statusCache && statusCache.expiresAt > Date.now()) {
    return json({ success: true, status: statusCache.status });
  }

  const isR2FileRequest = /^\/api\/r2\/(?:file|object)(?:\/|$)/.test(pathname);
  const r2AccountId = resolveEnv('R2_ACCOUNT_ID', env);
  const r2AccessKeyId = resolveEnv('R2_ACCESS_KEY_ID', env);
  const r2SecretAccessKey = resolveEnv('R2_SECRET_ACCESS_KEY', env);
  const r2Bucket = resolveEnv('R2_BUCKET_NAME', env) || 'html-templates';
  const r2PublicDomain = resolveEnv('R2_PUBLIC_DOMAIN', env);

  // Cloudflare native R2 bucket binding support (Pages Functions env binding)
  const nativeBucket = env?.BUCKET || env?.R2_BUCKET || env?.HTML_TEMPLATES_BUCKET;

  const r2Client = getR2Client({
    accountId: r2AccountId,
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  });

  const isTursoBackedRoute = pathname === '/api/settings' ||
    pathname === '/api/categories' ||
    pathname === '/api/templates' ||
    pathname.startsWith('/api/templates/') ||
    pathname === '/api/activity' ||
    (pathname.startsWith('/api/vcon/') && pathname !== '/api/vcon/verify') ||
    (isR2FileRequest && !nativeBucket && !r2Client);
  const isMockTurso = (tursoClient as any)?.isMock === true || (tursoClient as any)?.protocol === 'mock';
  if (isDeployedRuntime && isTursoBackedRoute && isMockTurso) {
    return json({ success: false, error: 'Persistent Turso storage is not configured.' }, 503);
  }
  if (isDeployedRuntime && !isMockTurso) enforceTursoPersistence(tursoClient);

  const processTemplateSyncJob = async (job: Awaited<ReturnType<typeof getTemplateSyncJobs>>[number]) => {
    let success = false;
    let failureCode = job.action === 'delete' ? 'r2_delete_failed' : 'r2_upload_failed';

    try {
      if (job.action === 'delete') {
        if (nativeBucket) {
          const { deleteNativeR2 } = await import('./r2.ts');
          success = (await deleteNativeR2(nativeBucket, job.object_key)).success;
        } else if (r2Client && r2Bucket) {
          success = (await deleteTemplateFromR2(r2Client, r2Bucket, job.object_key)).success;
        } else {
          failureCode = 'r2_not_configured';
        }
      } else if (job.template_id) {
        const html = await getTemplateHtmlForSync(tursoClient, job.template_id);
        if (html === null) {
          failureCode = 'template_content_missing';
        } else if (nativeBucket) {
          const { uploadNativeR2 } = await import('./r2.ts');
          success = (await uploadNativeR2(nativeBucket, job.object_key, html, r2PublicDomain)).success;
        } else if (r2Client && r2Bucket) {
          success = (await uploadTemplateToR2(r2Client, r2Bucket, job.object_key, html, r2PublicDomain)).success;
        } else {
          failureCode = 'r2_not_configured';
        }
      } else {
        failureCode = 'template_reference_missing';
      }
    } catch (error) {
      if (error instanceof TursoPersistenceError) throw error;
      success = false;
    }

    if (success) {
      await completeTemplateSyncJob(tursoClient, job);
      return { status: 'synced' as const };
    }

    await failTemplateSyncJob(tursoClient, job, failureCode);
    console.warn('Template R2 sync remains pending', {
      action: job.action,
      object_key: job.object_key,
      failure_code: failureCode,
    });
    return { status: 'pending' as const, failureCode };
  };

  const processTemplateSyncKey = async (objectKey: string) => {
    const job = await getTemplateSyncJob(tursoClient, objectKey);
    if (!job) return { status: 'unavailable' as const };
    return processTemplateSyncJob(job);
  };

  // GET /api/status - check system status
  if (pathname === '/api/status' && method === 'GET') {
    const isMock = (tursoClient as any)?.isMock === true;
    const hasRealTurso = Boolean(tursoUrl && tursoToken) && !isMock;
    const status: any = {
      turso: {
        configured: Boolean(tursoUrl && tursoToken) && !isMock,
        connected: false,
        isMock,
        message: isMock
          ? 'Persistent Turso storage unavailable; in-memory data is not durable.'
          : 'Checking Turso...',
        templateCount: 0,
        url: hasRealTurso ? tursoUrl!.replace(/:\/\/.*@/, '://***@') : undefined,
      },
      r2: {
        configured: Boolean(nativeBucket || (r2AccountId && r2AccessKeyId && r2SecretAccessKey)),
        connected: false,
        message: nativeBucket
          ? 'Native Cloudflare R2 Binding detected'
          : r2AccountId
          ? 'Checking Cloudflare R2 S3...'
          : 'Cloudflare R2 credentials or bucket binding not configured',
        bucket: nativeBucket ? 'Native Cloudflare Bucket Binding' : r2Bucket,
        accountId: r2AccountId,
        accessKeyId: r2AccessKeyId,
        publicDomain: r2PublicDomain || '',
        effectiveAccessMode: r2PublicDomain ? 'Custom Public Domain' : 'API Endpoint Fallback',
        stats: {
          totalFiles: 0,
          totalBytes: 0,
          totalKilobytes: 0,
          totalMegabytes: 0,
          totalGigabytes: 0,
          formattedSize: '0 B',
        },
      },
    };

    if (tursoClient && !isMock) {
      try {
        const testRes = await testTursoConnection(tursoClient);
        status.turso.connected = testRes.success;
        status.turso.message = testRes.message;
        status.turso.templateCount = testRes.count;

        const { getR2StorageReport } = await import('./turso.ts');
        status.r2.stats = await getR2StorageReport(tursoClient);
      } catch {
        status.turso.connected = false;
        status.turso.message = 'Persistent Turso storage is unavailable.';
      }
    }

    if (nativeBucket) {
      try {
        const { testNativeR2 } = await import('./r2.ts');
        const testRes = await testNativeR2(nativeBucket);
        status.r2.connected = testRes.success;
        status.r2.message = testRes.message;
      } catch (e: any) {
        status.r2.connected = false;
        status.r2.message = e.message || 'Error connecting to Native R2';
      }
    } else if (r2Client && r2Bucket) {
      try {
        const testRes = await testR2Connection(r2Client, r2Bucket);
        status.r2.connected = testRes.success;
        status.r2.message = testRes.message;
      } catch (e: any) {
        status.r2.connected = false;
        status.r2.message = e.message || 'Error connecting to Cloudflare R2';
      }
    }

    statusCache = { expiresAt: Date.now() + STATUS_CACHE_TTL_MS, status };
    return json({ success: true, status });
  }

  // GET or HEAD /api/r2/file/* or /api/r2/object/* or /api/r2/file?key=...
  // Serves Cloudflare R2 files directly when no public domain is specified, or as a reliable fallback.
  const r2FilePrefix = '/api/r2/file/';
  const r2ObjPrefix = '/api/r2/object/';
  let r2KeyRequested: string | null = null;

  if (pathname.startsWith(r2FilePrefix)) {
    r2KeyRequested = pathname.slice(r2FilePrefix.length);
  } else if (pathname.startsWith(r2ObjPrefix)) {
    r2KeyRequested = pathname.slice(r2ObjPrefix.length);
  } else if (pathname === '/api/r2/file' || pathname === '/api/r2/object') {
    r2KeyRequested = url.searchParams.get('key');
  }

  if (r2KeyRequested && (method === 'GET' || method === 'HEAD')) {
    let cleanKey: string;
    try {
      cleanKey = decodeURIComponent(r2KeyRequested).replace(/^\/+/, '');
    } catch {
      return new Response('Invalid object key encoding.', { status: 400 });
    }

    // 1. If native Cloudflare R2 bucket is available
    if (nativeBucket) {
      try {
        const fileRes = await getObjectNativeR2(nativeBucket, cleanKey);
        if (fileRes.success && fileRes.data) {
          return new Response(method === 'HEAD' ? null : (fileRes.data as any), {
            status: 200,
            headers: {
              'Content-Type': fileRes.contentType || 'application/octet-stream',
              'Cache-Control': fileRes.cacheControl || 'public, max-age=86400, stale-while-revalidate=604800',
              'Access-Control-Allow-Origin': '*',
              'Content-Length': String(fileRes.data.length),
            },
          });
        }
      } catch (err: any) {
        console.error('Error fetching object from native R2:', err);
      }
    }

    // 2. If R2 S3 client is configured
    if (r2Client && r2Bucket) {
      try {
        const fileRes = await getObjectFromR2(r2Client, r2Bucket, cleanKey);
        if (fileRes.success && fileRes.data) {
          return new Response(method === 'HEAD' ? null : (fileRes.data as any), {
            status: 200,
            headers: {
              'Content-Type': fileRes.contentType || 'application/octet-stream',
              'Cache-Control': fileRes.cacheControl || 'public, max-age=86400, stale-while-revalidate=604800',
              'Access-Control-Allow-Origin': '*',
              'Content-Length': String(fileRes.data.length),
            },
          });
        }
      } catch (err: any) {
        console.error('Error fetching object from R2 S3:', err);
      }
    }

    // 3. Fallback: If it's a template key (templates/<slug>.html), serve from Turso DB
    if (cleanKey.startsWith('templates/') && cleanKey.endsWith('.html')) {
      if (isDeployedRuntime && isMockTurso) {
        return new Response('Persistent template storage is unavailable.', { status: 503 });
      }
      const slug = cleanKey.replace(/^templates\//, '').replace(/\.html$/, '');
      const template = await getTemplateBySlug(tursoClient, slug);
      if (template?.html_content) {
        return new Response(method === 'HEAD' ? null : template.html_content, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    return new Response(`Object "${cleanKey}" not found in R2 storage.`, {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // GET /api/settings - Public site branding and configuration
  if (pathname === '/api/settings' && method === 'GET') {
    const settingsReadStartedAt = performance.now();
    try {
      const { getSiteSettings } = await import('./turso.ts');
      const settings = await getSiteSettings(tursoClient);
      const mapped = {
        ...settings,
        app_logo: resolveFileUrl(settings.app_logo, r2PublicDomain),
        favicon_url: resolveFileUrl(settings.favicon_url, r2PublicDomain),
        og_image: resolveFileUrl(settings.og_image, r2PublicDomain),
      };
      return json(
        { success: true, settings: mapped },
        200,
        publicReadTimingHeaders(performance.now() - settingsReadStartedAt)
      );
    } catch (error) {
      if (error instanceof TursoPersistenceError) {
        return json({ success: false, error: 'Persistent storage is unavailable.' }, 503,
          publicReadTimingHeaders(performance.now() - settingsReadStartedAt));
      }
      return json({
        success: true,
        settings: {
          site_name: 'HTML Snippets & Templates',
          site_description: 'Free responsive HTML snippets and component templates directory.',
          app_logo: '',
          favicon_url: '',
          og_image: '',
        },
      }, 200, publicReadTimingHeaders(performance.now() - settingsReadStartedAt));
    }
  }

  // GET /api/categories - active categories represented in the public catalog
  if (pathname === '/api/categories' && method === 'GET') {
    try {
      const items = await getPublicCategories(tursoClient);
      return json({ success: true, count: items.length, items });
    } catch (error) {
      return json({ success: false, error: 'Failed to fetch categories.' },
        error instanceof TursoPersistenceError ? 503 : 500);
    }
  }

  // POST /api/activity - best-effort, identity-free aggregate events
  if (pathname === '/api/activity' && method === 'POST') {
    const clientKey = req.headers.get('CF-Connecting-IP')?.trim() || 'unknown';
    if (!allowActivityRequest(clientKey)) {
      return json({ success: false, error: 'Activity request limit reached.' }, 429);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: 'Invalid activity event.' }, 400);
    }

    const event = body?.event;
    const slug = body?.slug;
    if (!['category_view', 'template_open'].includes(event) ||
        typeof slug !== 'string' || !slug || slug.length > 200 || /[\/\\\u0000-\u001f]/.test(slug)) {
      return json({ success: false, error: 'Invalid activity event.' }, 400);
    }

    try {
      if (event === 'category_view') {
        const categories = await getPublicCategories(tursoClient);
        if (!categories.some((category) => category.slug === slug)) {
          return json({ success: false, error: 'Unknown category.' }, 404);
        }
      } else {
        const template = await getTemplateBySlug(tursoClient, slug);
        if (!template || template.slug !== slug) {
          return json({ success: false, error: 'Unknown template.' }, 404);
        }
      }
      await recordActivityEvent(tursoClient, event, slug);
      return json({ success: true }, 202);
    } catch (error) {
      console.warn('Activity aggregate write failed', {
        event,
        error_type: error instanceof Error ? error.name : 'ActivityError',
      });
      return json({ success: false, error: 'Activity was not recorded.' }, 202);
    }
  }

  // GET /api/templates - public list
  if (pathname === '/api/templates' && method === 'GET') {
    const templatesReadStartedAt = performance.now();
    try {
      const category = url.searchParams.get('category') || undefined;
      const search = url.searchParams.get('search') || undefined;
      const sort = (url.searchParams.get('sort') as any) || 'newest';

      const options = { category, search, sort };
      const items = url.searchParams.get('metadata') === '1'
        ? await getPublicTemplateMetadata(tursoClient, options)
        : await getTemplates(tursoClient, options);
      const mapped = items.map((item) => ({
        ...item,
        r2_url: appendAssetRevision(
          item.r2_key
            ? getR2ObjectUrl(item.r2_key, r2PublicDomain)
            : (item.r2_url ? resolveFileUrl(item.r2_url, r2PublicDomain) : null),
          item.updated_at || item.created_at || item.slug,
          url
        ),
      }));
      return json(
        { success: true, count: mapped.length, items: mapped },
        200,
        publicReadTimingHeaders(performance.now() - templatesReadStartedAt)
      );
    } catch (err: any) {
      return json(
        { success: false, error: 'Failed to fetch templates.' },
        err instanceof TursoPersistenceError ? 503 : 500,
        publicReadTimingHeaders(performance.now() - templatesReadStartedAt)
      );
    }
  }

  // GET /api/templates/:slug/raw
  const rawMatch = pathname.match(/^\/api\/templates\/([^/]+)\/raw$/);
  if (rawMatch && method === 'GET') {
    const slug = decodePathSlug(rawMatch[1]);
    if (slug === null) return new Response('Invalid template slug', { status: 400 });
    const template = await getTemplateBySlug(tursoClient, slug);
    if (!template) return new Response('Template not found', { status: 404 });

    let htmlContent = template.html_content;
    if (url.searchParams.get('hide_scrollbars') === '1') {
      const scrollbarStyle = '<style>html,body,*{scrollbar-width:none!important;-ms-overflow-style:none!important}html::-webkit-scrollbar,body::-webkit-scrollbar,*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}</style>';
      const headTag = htmlContent.match(/<head\b[^>]*>/i);
      const htmlTag = htmlContent.match(/<html\b[^>]*>/i);
      const doctype = htmlContent.match(/^\s*<!doctype[^>]*>/i);

      if (headTag?.index !== undefined) {
        const insertAt = headTag.index + headTag[0].length;
        htmlContent = `${htmlContent.slice(0, insertAt)}${scrollbarStyle}${htmlContent.slice(insertAt)}`;
      } else if (htmlTag?.index !== undefined) {
        const insertAt = htmlTag.index + htmlTag[0].length;
        htmlContent = `${htmlContent.slice(0, insertAt)}<head>${scrollbarStyle}</head>${htmlContent.slice(insertAt)}`;
      } else if (doctype?.index !== undefined) {
        const insertAt = doctype.index + doctype[0].length;
        htmlContent = `${htmlContent.slice(0, insertAt)}${scrollbarStyle}${htmlContent.slice(insertAt)}`;
      } else {
        htmlContent = `${scrollbarStyle}${htmlContent}`;
      }
    }

    return new Response(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  // POST /api/templates/:slug/download
  const downloadMatch = pathname.match(/^\/api\/templates\/([^/]+)\/download$/);
  if (downloadMatch && method === 'POST') {
    if (!tursoClient) return json({ success: false, error: 'Database not configured' }, 503);
    const slug = decodePathSlug(downloadMatch[1]);
    if (slug === null) return json({ success: false, error: 'Invalid template slug' }, 400);
    const template = await getTemplateBySlug(tursoClient, slug);
    if (!template) return json({ success: false, error: 'Template not found' }, 404);
    const count = await incrementDownloads(tursoClient, slug);
    try {
      await recordActivityEvent(tursoClient, 'download_request', template.slug);
    } catch (error) {
      console.warn('Activity aggregate write failed', {
        event: 'download_request',
        error_type: error instanceof Error ? error.name : 'ActivityError',
      });
    }
    return json({ success: true, downloads: count });
  }

  // GET /api/templates/:slug
  const singleMatch = pathname.match(/^\/api\/templates\/([^/]+)$/);
  if (singleMatch && method === 'GET') {
    const slug = decodePathSlug(singleMatch[1]);
    if (slug === null) return json({ success: false, error: 'Invalid template slug' }, 400);
    const template = await getTemplateBySlug(tursoClient, slug);
    if (!template) return json({ success: false, error: 'Template not found' }, 404);

    if (template.r2_key) {
      template.r2_url = appendAssetRevision(
        getR2ObjectUrl(template.r2_key, r2PublicDomain),
        template.updated_at || template.created_at || template.slug,
        url
      );
    } else if (template.r2_url) {
      template.r2_url = appendAssetRevision(
        resolveFileUrl(template.r2_url, r2PublicDomain),
        template.updated_at || template.created_at || template.slug,
        url
      );
    }

    // Increment view count asynchronously
    incrementViews(tursoClient, slug).catch(() => {});
    return json({ success: true, template });
  }

  // ================= ADMIN (VCON) ROUTES =================

  // GET /api/vcon/auth-status - Checks if admin account exists
  if (pathname === '/api/vcon/auth-status' && method === 'GET') {
    try {
      const { countAdmins } = await import('./turso.ts');
      const adminCount = await countAdmins(tursoClient);
      return json({
        success: true,
        dbConfigured: true,
        hasAdmin: adminCount > 0,
        adminCount,
      });
    } catch (err: any) {
      return json({
        success: false,
        dbConfigured: true,
        hasAdmin: false,
        error: err?.message || 'Error checking admin status',
      });
    }
  }

  // POST /api/vcon/register-admin - First time admin account creation
  if (pathname === '/api/vcon/register-admin' && method === 'POST') {
    try {
      const adminSecret = resolveEnv('ADMIN_SECRET', env);
      if (!isValidAdminSecret(adminSecret)) {
        return json({ success: false, error: 'Admin authentication is not configured.' }, 503);
      }
      const clientKey = req.headers.get('CF-Connecting-IP')?.trim() || 'unknown';
      const attempt = consumeAuthAttempt(`register:${clientKey}`);
      if (!attempt.allowed) {
        return json({ success: false, error: 'Too many setup attempts. Try again later.' }, 429, {
          'Retry-After': String(attempt.retryAfterSeconds),
        });
      }

      const body: any = await req.json();
      let { username, password, tursoUrl: newTursoUrl, tursoToken: newTursoToken } = body;

      // Allow configuring Turso credentials on the fly if set
      if (!isDeployedRuntime && newTursoUrl && typeof process !== 'undefined' && process.env) {
        process.env.TURSO_DATABASE_URL = newTursoUrl;
        if (newTursoToken) process.env.TURSO_AUTH_TOKEN = newTursoToken;
      }

      const activeTursoClient = isDeployedRuntime
        ? tursoClient
        : getTursoClient(newTursoUrl || tursoUrl, newTursoToken || tursoToken);

      const { countAdmins, createAdminUser } = await import('./turso.ts');
      const { hashPassword } = await import('./auth.ts');

      const adminCount = await countAdmins(activeTursoClient);
      if (adminCount > 0) {
        return json({
          success: false,
          error: 'Admin user already exists in database. Please log in with your credentials.',
        }, 403);
      }

      if (!username || typeof username !== 'string' || username.trim().length < 3) {
        return json({ success: false, error: 'Username must be at least 3 characters long.' }, 400);
      }

      if (!isValidAdminPassword(password)) {
        return json({ success: false, error: 'Password must be 15 to 128 characters long.' }, 400);
      }

      const { hash, salt } = await hashPassword(password);
      const newAdmin = await createAdminUser(activeTursoClient, username.trim(), hash, salt);

      const token = await createAdminToken(newAdmin.username, newAdmin.id, adminSecret);
      return json({
        success: true,
        token,
        user: { username: newAdmin.username },
        message: 'Admin account created successfully.',
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      return json({ success: false, error: err?.message || 'Failed to create admin user' }, 500);
    }
  }

  // POST /api/vcon/login - Authenticates against admins store
  if (pathname === '/api/vcon/login' && method === 'POST') {
    try {
      const adminSecret = resolveEnv('ADMIN_SECRET', env);
      if (!isValidAdminSecret(adminSecret)) {
        return json({ success: false, error: 'Admin authentication is not configured.' }, 503);
      }
      const clientKey = req.headers.get('CF-Connecting-IP')?.trim() || 'unknown';
      const attempt = consumeAuthAttempt(`login:${clientKey}`);
      if (!attempt.allowed) {
        return json({ success: false, error: 'Too many login attempts. Try again later.' }, 429, {
          'Retry-After': String(attempt.retryAfterSeconds),
        });
      }

      const body: any = await req.json();
      const { username, password } = body;

      if (!username || !password) {
        return json({ success: false, error: 'Username and password are required' }, 400);
      }

      const { getAdminByUsername } = await import('./turso.ts');
      const { verifyPassword } = await import('./auth.ts');

      const admin = await getAdminByUsername(tursoClient, username);
      if (!admin) {
        return json({ success: false, error: 'Invalid admin username or password' }, 401);
      }

      const isValid = await verifyPassword(password, admin.password_hash, admin.salt);
      if (!isValid) {
        return json({ success: false, error: 'Invalid admin username or password' }, 401);
      }

      const token = await createAdminToken(admin.username, admin.id, adminSecret);
      return json({ success: true, token, user: { username: admin.username } });
    } catch (err: any) {
      return json({ success: false, error: err?.message || 'Login error' }, 500);
    }
  }

  // POST /api/vcon/verify
  if (pathname === '/api/vcon/verify' && method === 'POST') {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const valid = await verifyAdminToken(token, resolveEnv('ADMIN_SECRET', env));
    return json({ success: valid });
  }

  // PROTECTED ADMIN ENDPOINTS: Check token for remaining /api/vcon routes
  if (pathname.startsWith('/api/vcon/')) {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const isValid = await verifyAdminToken(token, resolveEnv('ADMIN_SECRET', env));

    if (!isValid) {
      return json({ success: false, error: 'Unauthorized: Admin authentication required' }, 401);
    }

    // GET /api/vcon/analytics - bounded daily aggregate report
    if (pathname === '/api/vcon/analytics' && method === 'GET') {
      const toDay = url.searchParams.get('to') || new Date().toISOString().slice(0, 10);
      const defaultFrom = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const fromDay = url.searchParams.get('from') || defaultFrom;
      const isValidDay = (value: string) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
      };
      if (!isValidDay(fromDay) || !isValidDay(toDay)) {
        return json({ success: false, error: 'Dates must use YYYY-MM-DD.' }, 400);
      }
      const fromTime = Date.parse(`${fromDay}T00:00:00.000Z`);
      const toTime = Date.parse(`${toDay}T00:00:00.000Z`);
      if (fromTime > toTime || toTime - fromTime > 89 * 24 * 60 * 60 * 1000) {
        return json({ success: false, error: 'Date range must be between 1 and 90 days.' }, 400);
      }
      const items = await getDailyActivityAggregates(tursoClient, fromDay, toDay);
      return json({ success: true, from: fromDay, to: toDay, items });
    }

    // POST /api/vcon/init-db - Initialize schema
    if (pathname === '/api/vcon/init-db' && method === 'POST') {
      const res = await initTursoSchema(tursoClient);
      return json(res);
    }

    // POST /api/vcon/seed-db - Seed showcase items
    if (pathname === '/api/vcon/seed-db' && method === 'POST') {
      const res = await seedTursoDatabase(tursoClient);
      return json({ success: true, ...res });
    }

    // POST /api/vcon/test-turso - test Turso
    if (pathname === '/api/vcon/test-turso' && method === 'POST') {
      const res = await testTursoConnection(tursoClient);
      return json(res);
    }

    // POST /api/vcon/test-r2 - test R2
    if (pathname === '/api/vcon/test-r2' && method === 'POST') {
      if (nativeBucket) {
        const { testNativeR2 } = await import('./r2.ts');
        const res = await testNativeR2(nativeBucket);
        return json(res);
      }
      if (!r2Client) {
        return json({
          success: false,
          error: 'Cloudflare R2 credentials (Account ID, Keys) are missing.',
          message: 'Cloudflare R2 credentials (Account ID, Keys) are missing.',
        }, 400);
      }
      const res = await testR2Connection(r2Client, r2Bucket);
      return json({
        success: res.success,
        message: res.message,
        error: res.success ? undefined : res.message,
      });
    }

    // POST /api/vcon/templates/sync-retry - Retry durable Turso/R2 template jobs
    if (pathname === '/api/vcon/templates/sync-retry' && method === 'POST') {
      if (!tursoClient) return json({ success: false, error: 'Database not configured.' }, 503);
      try {
        const body: any = await req.json().catch(() => ({}));
        const jobs = await getTemplateSyncJobs(tursoClient, body.force === true, 20);
        const results = [];
        for (const job of jobs) {
          results.push(await processTemplateSyncJob(job));
        }
        const synced = results.filter((result) => result.status === 'synced').length;
        return json({
          success: true,
          attempted: results.length,
          synced,
          pending: results.length - synced,
          remaining: (await getTemplateSyncJobs(tursoClient, false, 20)).length,
        });
      } catch {
        return json({ success: false, error: 'Failed to process template sync jobs.' }, 500);
      }
    }

    // R2 credentials must be configured in deployment environment secrets.
    if (pathname === '/api/vcon/r2-config' && method === 'POST') {
      return json({
        success: false,
        error: 'R2 credentials must be configured as deployment environment secrets; application storage is disabled.',
      }, 409);
    }

    // DELETE /api/vcon/r2-config - Remove R2 configuration from database
    if (pathname === '/api/vcon/r2-config' && method === 'DELETE') {
      if (!tursoClient) {
        return json({ success: false, error: 'Turso SQLite database not configured.' }, 503);
      }
      const { deleteSetting } = await import('./turso.ts');
      await deleteSetting(tursoClient, 'r2_config');
      return json({ success: true, message: 'Cloudflare R2 configuration removed from database.' });
    }

    // GET /api/vcon/r2-stats - Get storage report
    if (pathname === '/api/vcon/r2-stats' && method === 'GET') {
      if (!tursoClient) {
        return json({ success: false, error: 'Turso SQLite database not configured.' }, 503);
      }
      const { getR2StorageReport } = await import('./turso.ts');
      const stats = await getR2StorageReport(tursoClient);
      return json({ success: true, stats });
    }

    // GET /api/vcon/r2-files - List files in R2 bucket
    if (pathname === '/api/vcon/r2-files' && method === 'GET') {
      const prefix = url.searchParams.get('prefix') || '';
      if (nativeBucket) {
        const { listNativeR2Objects } = await import('./r2.ts');
        const res = await listNativeR2Objects(nativeBucket, prefix, 100, r2PublicDomain);
        return json(res);
      }
      if (r2Client && r2Bucket) {
        const { listR2Objects } = await import('./r2.ts');
        const res = await listR2Objects(r2Client, r2Bucket, prefix, 100, r2PublicDomain);
        return json(res);
      }
      return json({ success: false, error: 'Cloudflare R2 is not configured or connected.' }, 400);
    }

    // GET /api/vcon/categories - List all categories
    if (pathname === '/api/vcon/categories' && method === 'GET') {
      if (!tursoClient) return json({ success: false, error: 'Database not configured.' }, 503);
      const { getCategories } = await import('./turso.ts');
      const items = await getCategories(tursoClient);
      return json({ success: true, count: items.length, items });
    }

    // POST /api/vcon/categories - Create or update category
    if (pathname === '/api/vcon/categories' && method === 'POST') {
      if (!tursoClient) return json({ success: false, error: 'Database not configured.' }, 503);
      const body: any = await req.json();
      const { id, name, slug, status } = body;
      if (!name || !name.trim()) return json({ success: false, error: 'Category name is required' }, 400);
      const { saveCategory } = await import('./turso.ts');
      const cleanSlug = (slug || name).trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
      const item = await saveCategory(tursoClient, { id, name: name.trim(), slug: cleanSlug, status });
      return json({ success: true, item });
    }

    // PATCH /api/vcon/categories/:id/status - Toggle active/inactive
    const catStatusMatch = pathname.match(/^\/api\/vcon\/categories\/([^/]+)\/status$/);
    if (catStatusMatch && method === 'PATCH') {
      if (!tursoClient) return json({ success: false, error: 'Database not configured.' }, 503);
      const catId = catStatusMatch[1];
      const body: any = await req.json();
      const { status } = body;
      const { toggleCategoryStatus } = await import('./turso.ts');
      const ok = await toggleCategoryStatus(tursoClient, catId, status === 'inactive' ? 'inactive' : 'active');
      return json({ success: ok });
    }

    // DELETE /api/vcon/categories/:id - Delete category
    const catDeleteMatch = pathname.match(/^\/api\/vcon\/categories\/([^/]+)$/);
    if (catDeleteMatch && method === 'DELETE') {
      if (!tursoClient) return json({ success: false, error: 'Database not configured.' }, 503);
      const catId = catDeleteMatch[1];
      const { deleteCategory } = await import('./turso.ts');
      const ok = await deleteCategory(tursoClient, catId);
      return json({ success: ok });
    }

    // POST /api/vcon/templates/bulk-upload - Bulk HTML files upload
    if (pathname === '/api/vcon/templates/bulk-upload' && method === 'POST') {
      if (!tursoClient) return json({ success: false, error: 'Database not configured.' }, 503);
      try {
        const body: any = await req.json();
        const files: Array<{ title: string; slug?: string; category?: string; tags?: string[]; html_content: string }> = body.files || [];
        if (!Array.isArray(files) || files.length === 0) {
          return json({ success: false, error: 'No files provided for upload.' }, 400);
        }

        const results: any[] = [];
        let successCount = 0;
        let failCount = 0;
        let syncPendingCount = 0;

        for (const item of files) {
          if (!item.title || !item.html_content) {
            failCount++;
            continue;
          }

          const rawSlug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          const slug = `${rawSlug}-${Date.now().toString().slice(-4)}`;

          const r2Key = `templates/${slug}.html`;

          try {
            const saved = await saveTemplate(tursoClient, {
              title: item.title.trim(),
              slug,
              category: item.category?.trim() || 'General',
              tags: Array.isArray(item.tags) ? item.tags : [],
              html_content: item.html_content,
              r2_key: r2Key,
              r2_url: getR2ObjectUrl(r2Key, r2PublicDomain),
            }, r2Key);
            const sync = await processTemplateSyncKey(r2Key);
            if (sync.status !== 'synced') syncPendingCount++;
            results.push(saved);
            successCount++;
          } catch {
            failCount++;
          }
        }

        return json({
          success: true,
          uploaded: successCount,
          failed: failCount,
          sync_pending: syncPendingCount,
          items: results,
        });
      } catch (err: any) {
        return json({ success: false, error: err?.message || 'Bulk upload error' }, 500);
      }
    }

    // POST /api/vcon/templates - Save (Create / Update) template + R2 upload
    if (pathname === '/api/vcon/templates' && method === 'POST') {
      if (!tursoClient) {
        return json({ success: false, error: 'Turso SQLite database not configured.' }, 503);
      }

      try {
        const body: any = await req.json();
        const { id, title, slug, category, tags, description, html_content } = body;

        if (!title || !slug || !html_content) {
          return json({ success: false, error: 'Title, slug, and html_content are required.' }, 400);
        }

        const normalizedSlug = slug.trim().toLowerCase();
        const r2Key = `templates/${normalizedSlug}.html`;

        const saved = await saveTemplate(tursoClient, {
          id,
          title: title.trim(),
          slug: normalizedSlug,
          category: category?.trim() || 'General',
          tags: Array.isArray(tags) ? tags : [],
          description: typeof description === 'string' ? description.trim() : undefined,
          html_content,
          r2_key: r2Key,
          r2_url: getR2ObjectUrl(r2Key, r2PublicDomain),
        }, r2Key);
        const sync = await processTemplateSyncKey(r2Key);

        return json({
          success: true,
          template: saved,
          r2Uploaded: sync.status === 'synced',
          r2SyncStatus: sync.status,
          r2Warning: sync.status === 'pending' ? sync.failureCode : undefined,
        });
      } catch (err: any) {
        return json({ success: false, error: err?.message || 'Failed to save template' }, 500);
      }
    }

    // DELETE /api/vcon/templates/:id
    const deleteMatch = pathname.match(/^\/api\/vcon\/templates\/([^/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      if (!tursoClient) {
        return json({ success: false, error: 'Turso SQLite database not configured.' }, 503);
      }
      const targetId = deleteMatch[1];
      const template = await getTemplateBySlug(tursoClient, targetId);

      const deleted = await deleteTemplate(tursoClient, targetId, template?.r2_key || undefined);
      const sync = deleted && template?.r2_key
        ? await processTemplateSyncKey(template.r2_key)
        : { status: 'not_required' as const };
      return json({
        success: deleted,
        r2_key: template?.r2_key || null,
        r2_sync_status: sync.status,
      });
    }

    // GET /api/vcon/settings - Get current site settings
    if (pathname === '/api/vcon/settings' && method === 'GET') {
      if (!tursoClient) return json({ success: false, error: 'Database not configured.' }, 503);
      const { getSiteSettings } = await import('./turso.ts');
      const settings = await getSiteSettings(tursoClient);
      const mapped = {
        ...settings,
        app_logo: resolveFileUrl(settings.app_logo, r2PublicDomain),
        favicon_url: resolveFileUrl(settings.favicon_url, r2PublicDomain),
        og_image: resolveFileUrl(settings.og_image, r2PublicDomain),
      };
      return json({ success: true, settings: mapped });
    }

    // POST /api/vcon/settings - Save site settings
    if (pathname === '/api/vcon/settings' && method === 'POST') {
      if (!tursoClient) return json({ success: false, error: 'Database not configured.' }, 503);
      try {
        const body: any = await req.json();
        const { saveSiteSettings } = await import('./turso.ts');
        const settings = await saveSiteSettings(tursoClient, {
          site_name: body.site_name,
          site_description: body.site_description,
          app_logo: body.app_logo,
          favicon_url: body.favicon_url,
          og_image: body.og_image,
          dev_mode: body.dev_mode,
        });
        const mapped = {
          ...settings,
          app_logo: resolveFileUrl(settings.app_logo, r2PublicDomain),
          favicon_url: resolveFileUrl(settings.favicon_url, r2PublicDomain),
          og_image: resolveFileUrl(settings.og_image, r2PublicDomain),
        };
        return json({ success: true, settings: mapped, message: 'Settings saved successfully.' });
      } catch (err: any) {
        return json({ success: false, error: err?.message || 'Failed to save settings' }, 500);
      }
    }

    // POST /api/vcon/upload-asset - Upload logo, favicon, or OG image
    if (pathname === '/api/vcon/upload-asset' && method === 'POST') {
      try {
        const body: any = await req.json();
        const { filename, fileData, assetType } = body;
        if (!fileData || typeof fileData !== 'string') {
          return json({ success: false, error: 'No image data provided' }, 400);
        }

        const extMatch = fileData.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
        const ext = extMatch ? extMatch[1].replace('svg+xml', 'svg') : 'png';
        const contentType = extMatch ? extMatch[0].replace(/^data:/, '').replace(/;base64,$/, '') : 'image/png';
        const rawBase64 = fileData.replace(/^data:[^;]+;base64,/, '');
        const binary = Uint8Array.from(atob(rawBase64), (c) => c.charCodeAt(0));
        const cleanName = (filename || `${assetType || 'asset'}-${Date.now()}.${ext}`).replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `branding/${cleanName}`;

        let assetUrl = fileData; // Fallback to data URI if R2 not connected
        if (nativeBucket) {
          const { uploadNativeR2 } = await import('./r2.ts');
          const uploadRes = await uploadNativeR2(nativeBucket, key, binary, r2PublicDomain, contentType);
          if (uploadRes.success && uploadRes.url) {
            assetUrl = uploadRes.url;
          }
        } else if (r2Client && r2Bucket) {
          const { uploadTemplateToR2 } = await import('./r2.ts');
          const uploadRes = await uploadTemplateToR2(r2Client, r2Bucket, key, binary, r2PublicDomain, contentType);
          if (uploadRes.success && uploadRes.url) {
            assetUrl = uploadRes.url;
          }
        }

        return json({
          success: true,
          url: appendAssetRevision(assetUrl, crypto.randomUUID(), url),
          key,
        });
      } catch (err: any) {
        return json({ success: false, error: err?.message || 'Failed to upload asset' }, 500);
      }
    }

    // GET /api/vcon/admin-users - List all admin accounts
    if (pathname === '/api/vcon/admin-users' && method === 'GET') {
      if (!tursoClient) return json({ success: false, error: 'Database not configured.' }, 503);
      const { getAdminUsers } = await import('./turso.ts');
      const users = await getAdminUsers(tursoClient);
      return json({ success: true, users });
    }

    // POST /api/vcon/admin-users - Create an additional admin user
    if (pathname === '/api/vcon/admin-users' && method === 'POST') {
      if (!tursoClient) return json({ success: false, error: 'Database not configured.' }, 503);
      try {
        const body: any = await req.json();
        const { username, password } = body;
        if (!username || username.trim().length < 3) {
          return json({ success: false, error: 'Username must be at least 3 characters' }, 400);
        }
        if (!isValidAdminPassword(password)) {
          return json({ success: false, error: 'Password must be 15 to 128 characters long.' }, 400);
        }

        const { createAdminUser, getAdminByUsername } = await import('./turso.ts');
        const { hashPassword } = await import('./auth.ts');

        const existing = await getAdminByUsername(tursoClient, username);
        if (existing) {
          return json({ success: false, error: 'Username already in use' }, 400);
        }

        const { hash, salt } = await hashPassword(password);
        const newUser = await createAdminUser(tursoClient, username.trim(), hash, salt);
        return json({ success: true, user: newUser, message: 'Admin user created successfully.' });
      } catch (err: any) {
        return json({ success: false, error: err?.message || 'Failed to create admin user' }, 500);
      }
    }

    // PUT /api/vcon/admin-users/:id - Update admin username and/or password
    const adminUserMatch = pathname.match(/^\/api\/vcon\/admin-users\/([^/]+)$/);
    if (adminUserMatch && (method === 'PUT' || method === 'POST')) {
      if (!tursoClient) return json({ success: false, error: 'Database not configured.' }, 503);
      const adminId = adminUserMatch[1];
      try {
        const body: any = await req.json();
        const { username, newPassword } = body;

        const { updateAdminUser } = await import('./turso.ts');
        const updateData: { username?: string; passwordHash?: string; salt?: string } = {};

        if (username && username.trim().length >= 3) {
          updateData.username = username.trim();
        }

        if (newPassword !== undefined && newPassword !== null && newPassword !== '') {
          if (!isValidAdminPassword(newPassword)) {
            return json({ success: false, error: 'New password must be 15 to 128 characters long.' }, 400);
          }
          const { hashPassword } = await import('./auth.ts');
          const { hash, salt } = await hashPassword(newPassword);
          updateData.passwordHash = hash;
          updateData.salt = salt;
        }

        const ok = await updateAdminUser(tursoClient, adminId, updateData);
        if (!ok) {
          return json({ success: false, error: 'Admin user not found or unchanged' }, 400);
        }

        return json({ success: true, message: 'Admin user updated successfully.' });
      } catch (err: any) {
        return json({ success: false, error: err?.message || 'Failed to update admin user' }, 500);
      }
    }

    // DELETE /api/vcon/admin-users/:id - Delete admin user
    if (adminUserMatch && method === 'DELETE') {
      if (!tursoClient) return json({ success: false, error: 'Database not configured.' }, 503);
      const adminId = adminUserMatch[1];
      const { deleteAdminUser } = await import('./turso.ts');
      const res = await deleteAdminUser(tursoClient, adminId);
      if (!res.success) {
        return json({ success: false, error: res.error || 'Failed to delete admin user' }, 400);
      }
      return json({ success: true, message: 'Admin user deleted successfully.' });
    }

    // Runtime environment variables are immutable from the deployed application.
    if (pathname === '/api/vcon/save-env' && method === 'POST') {
      return json({
        success: false,
        error: 'Runtime credentials cannot be changed by the application; configure deployment environment variables.',
      }, 409);
    }
  }

  return json({ error: 'Endpoint not found' }, 404);
}
