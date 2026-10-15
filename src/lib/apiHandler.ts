import {
  getTursoClient,
  initTursoSchema,
  seedTursoDatabase,
  getTemplates,
  getTemplateBySlug,
  saveTemplate,
  deleteTemplate,
  incrementDownloads,
  incrementViews,
  testTursoConnection,
} from './turso.ts';
import {
  getR2Client,
  getR2BucketName,
  uploadTemplateToR2,
  deleteTemplateFromR2,
  testR2Connection,
} from './r2.ts';
import { createAdminToken, verifyAdminToken } from './auth.ts';

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

export async function handleApiRequest(req: Request, env?: Record<string, any>): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

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

  // Load database-stored R2 credentials from Turso settings table if present
  let dbR2Config: any = null;
  if (tursoClient) {
    try {
      const { getSetting } = await import('./turso.ts');
      const savedJson = await getSetting(tursoClient, 'r2_config');
      if (savedJson) {
        dbR2Config = JSON.parse(savedJson);
      }
    } catch {}
  }

  const r2AccountId = dbR2Config?.accountId || resolveEnv('R2_ACCOUNT_ID', env);
  const r2AccessKeyId = dbR2Config?.accessKeyId || resolveEnv('R2_ACCESS_KEY_ID', env);
  const r2SecretAccessKey = dbR2Config?.secretAccessKey || resolveEnv('R2_SECRET_ACCESS_KEY', env);
  const r2Bucket = dbR2Config?.bucketName || resolveEnv('R2_BUCKET_NAME', env) || 'html-templates';
  const r2PublicDomain = dbR2Config?.publicDomain || resolveEnv('R2_PUBLIC_DOMAIN', env);

  // Cloudflare native R2 bucket binding support (Pages Functions env binding)
  const nativeBucket = env?.BUCKET || env?.R2_BUCKET || env?.HTML_TEMPLATES_BUCKET;

  const r2Client = getR2Client({
    accountId: r2AccountId,
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  });

  // GET /api/status - check system status
  if (pathname === '/api/status' && method === 'GET') {
    const isMock = (tursoClient as any)?.isMock === true;
    const hasRealTurso = Boolean(tursoUrl && tursoToken) && !isMock;
    const status: any = {
      turso: {
        configured: true,
        connected: false,
        isMock,
        message: isMock
          ? 'In-memory SQLite store active (mocked for preview)'
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
        publicDomain: r2PublicDomain,
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

    if (tursoClient) {
      try {
        const testRes = await testTursoConnection(tursoClient);
        status.turso.connected = testRes.success;
        status.turso.message = testRes.message;
        status.turso.templateCount = testRes.count;

        const { getR2StorageReport } = await import('./turso.ts');
        status.r2.stats = await getR2StorageReport(tursoClient);
      } catch (e: any) {
        status.turso.connected = false;
        status.turso.message = e.message || 'Error connecting to Turso SQLite';
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

    return json({ success: true, status });
  }

  // GET /api/settings - Public site branding and configuration
  if (pathname === '/api/settings' && method === 'GET') {
    try {
      const { getSiteSettings } = await import('./turso.ts');
      const settings = await getSiteSettings(tursoClient);
      return json({ success: true, settings });
    } catch {
      return json({
        success: true,
        settings: {
          site_name: 'HTML Snippets & Templates',
          site_description: 'Free responsive HTML snippets and component templates directory.',
          app_logo: '',
          favicon_url: '',
          og_image: '',
        },
      });
    }
  }

  // GET /api/templates - public list
  if (pathname === '/api/templates' && method === 'GET') {
    try {
      const category = url.searchParams.get('category') || undefined;
      const search = url.searchParams.get('search') || undefined;
      const sort = (url.searchParams.get('sort') as any) || 'newest';

      const items = await getTemplates(tursoClient, { category, search, sort });
      return json({ success: true, count: items.length, items });
    } catch (err: any) {
      return json({ success: false, error: err?.message || 'Failed to fetch templates' }, 500);
    }
  }

  // GET /api/templates/:slug/raw
  const rawMatch = pathname.match(/^\/api\/templates\/([^/]+)\/raw$/);
  if (rawMatch && method === 'GET') {
    const slug = rawMatch[1];
    const template = await getTemplateBySlug(tursoClient, slug);
    if (!template) return new Response('Template not found', { status: 404 });

    return new Response(template.html_content, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // POST /api/templates/:slug/download
  const downloadMatch = pathname.match(/^\/api\/templates\/([^/]+)\/download$/);
  if (downloadMatch && method === 'POST') {
    if (!tursoClient) return json({ success: false, error: 'Database not configured' }, 503);
    const slug = downloadMatch[1];
    const count = await incrementDownloads(tursoClient, slug);
    return json({ success: true, downloads: count });
  }

  // GET /api/templates/:slug
  const singleMatch = pathname.match(/^\/api\/templates\/([^/]+)$/);
  if (singleMatch && method === 'GET') {
    const slug = singleMatch[1];
    const template = await getTemplateBySlug(tursoClient, slug);
    if (!template) return json({ success: false, error: 'Template not found' }, 404);

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
      const body: any = await req.json();
      let { username, password, tursoUrl: newTursoUrl, tursoToken: newTursoToken } = body;

      // Allow configuring Turso credentials on the fly if set
      if (newTursoUrl && typeof process !== 'undefined' && process.env) {
        process.env.TURSO_DATABASE_URL = newTursoUrl;
        if (newTursoToken) process.env.TURSO_AUTH_TOKEN = newTursoToken;
      }

      const activeTursoClient = getTursoClient(newTursoUrl || tursoUrl, newTursoToken || tursoToken);

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

      if (!password || typeof password !== 'string' || password.length < 6) {
        return json({ success: false, error: 'Password must be at least 6 characters long.' }, 400);
      }

      const { hash, salt } = await hashPassword(password);
      const newAdmin = await createAdminUser(activeTursoClient, username.trim(), hash, salt);

      const token = await createAdminToken(newAdmin.username, newAdmin.id);
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

      const token = await createAdminToken(admin.username, admin.id);
      return json({ success: true, token, user: { username: admin.username } });
    } catch (err: any) {
      return json({ success: false, error: err?.message || 'Login error' }, 500);
    }
  }

  // POST /api/vcon/verify
  if (pathname === '/api/vcon/verify' && method === 'POST') {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const valid = await verifyAdminToken(token);
    return json({ success: valid });
  }

  // PROTECTED ADMIN ENDPOINTS: Check token for remaining /api/vcon routes
  if (pathname.startsWith('/api/vcon/')) {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const isValid = await verifyAdminToken(token);

    if (!isValid) {
      return json({ success: false, error: 'Unauthorized: Admin authentication required' }, 401);
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

    // POST /api/vcon/r2-config - Save R2 credentials into Turso database settings
    if (pathname === '/api/vcon/r2-config' && method === 'POST') {
      if (!tursoClient) {
        return json({ success: false, error: 'Turso SQLite database is not configured.' }, 503);
      }

      try {
        const body: any = await req.json();
        const { accountId, accessKeyId, secretAccessKey, bucketName, publicDomain } = body;

        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
          return json(
            { success: false, error: 'Account ID, Access Key ID, Secret Access Key, and Bucket Name are required.' },
            400
          );
        }

        // Test credentials first before storing
        const { getR2Client, testR2Connection } = await import('./r2.ts');
        const testClient = getR2Client({
          accountId: accountId.trim(),
          accessKeyId: accessKeyId.trim(),
          secretAccessKey: secretAccessKey.trim(),
        });

        if (!testClient) {
          return json({ success: false, error: 'Failed to create R2 S3 client with provided credentials.' }, 400);
        }

        const testRes = await testR2Connection(testClient, bucketName.trim());
        if (!testRes.success) {
          return json({ success: false, error: `Connection test failed: ${testRes.message}` }, 400);
        }

        // Save into Turso settings table
        const { setSetting } = await import('./turso.ts');
        await setSetting(
          tursoClient,
          'r2_config',
          JSON.stringify({
            accountId: accountId.trim(),
            accessKeyId: accessKeyId.trim(),
            secretAccessKey: secretAccessKey.trim(),
            bucketName: bucketName.trim(),
            publicDomain: publicDomain ? publicDomain.trim() : '',
          })
        );

        return json({
          success: true,
          message: `Cloudflare R2 bucket "${bucketName.trim()}" successfully verified and saved to database.`,
        });
      } catch (err: any) {
        return json({ success: false, error: err?.message || 'Failed to save R2 configuration.' }, 500);
      }
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

        for (const item of files) {
          if (!item.title || !item.html_content) {
            failCount++;
            continue;
          }

          const rawSlug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          const slug = `${rawSlug}-${Date.now().toString().slice(-4)}`;

          let r2Key: string | null = null;
          let r2Url: string | null = null;

          if (nativeBucket) {
            const { uploadNativeR2 } = await import('./r2.ts');
            const key = `templates/${slug}.html`;
            const uploadRes = await uploadNativeR2(nativeBucket, key, item.html_content, r2PublicDomain);
            if (uploadRes.success) {
              r2Key = uploadRes.key;
              r2Url = uploadRes.url;
            }
          } else if (r2Client && r2Bucket) {
            const key = `templates/${slug}.html`;
            const uploadRes = await uploadTemplateToR2(r2Client, r2Bucket, key, item.html_content, r2PublicDomain);
            if (uploadRes.success) {
              r2Key = uploadRes.key;
              r2Url = uploadRes.url;
            }
          }

          try {
            const saved = await saveTemplate(tursoClient, {
              title: item.title.trim(),
              slug,
              category: item.category?.trim() || 'General',
              tags: Array.isArray(item.tags) ? item.tags : [],
              html_content: item.html_content,
              r2_key: r2Key,
              r2_url: r2Url,
            });
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
        const { id, title, slug, category, tags, html_content } = body;

        if (!title || !slug || !html_content) {
          return json({ success: false, error: 'Title, slug, and html_content are required.' }, 400);
        }

        let r2Key: string | null = null;
        let r2Url: string | null = null;
        let r2UploadError: string | undefined = undefined;

        // If Cloudflare native R2 bucket is bound, use native edge storage
        if (nativeBucket) {
          const { uploadNativeR2 } = await import('./r2.ts');
          const key = `templates/${slug.trim().toLowerCase()}.html`;
          const uploadRes = await uploadNativeR2(nativeBucket, key, html_content, r2PublicDomain);
          if (uploadRes.success) {
            r2Key = uploadRes.key;
            r2Url = uploadRes.url;
          } else {
            r2UploadError = uploadRes.error;
          }
        } else if (r2Client && r2Bucket) {
          // If R2 S3 is configured, upload via S3 API
          const key = `templates/${slug.trim().toLowerCase()}.html`;
          const uploadRes = await uploadTemplateToR2(
            r2Client,
            r2Bucket,
            key,
            html_content,
            r2PublicDomain
          );
          if (uploadRes.success) {
            r2Key = uploadRes.key;
            r2Url = uploadRes.url;
          } else {
            r2UploadError = uploadRes.error;
          }
        }

        const saved = await saveTemplate(tursoClient, {
          id,
          title: title.trim(),
          slug: slug.trim().toLowerCase(),
          category: category?.trim() || 'General',
          tags: Array.isArray(tags) ? tags : [],
          html_content,
          r2_key: r2Key,
          r2_url: r2Url,
        });

        return json({
          success: true,
          template: saved,
          r2Uploaded: Boolean(r2Key),
          r2Warning: r2UploadError,
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

      if (template?.r2_key) {
        if (nativeBucket) {
          const { deleteNativeR2 } = await import('./r2.ts');
          await deleteNativeR2(nativeBucket, template.r2_key).catch(() => {});
        } else if (r2Client && r2Bucket) {
          await deleteTemplateFromR2(r2Client, r2Bucket, template.r2_key).catch(() => {});
        }
      }

      const deleted = await deleteTemplate(tursoClient, targetId);
      return json({ success: deleted });
    }

    // GET /api/vcon/settings - Get current site settings
    if (pathname === '/api/vcon/settings' && method === 'GET') {
      if (!tursoClient) return json({ success: false, error: 'Database not configured.' }, 503);
      const { getSiteSettings } = await import('./turso.ts');
      const settings = await getSiteSettings(tursoClient);
      return json({ success: true, settings });
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
        });
        return json({ success: true, settings, message: 'Settings saved successfully.' });
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

        return json({ success: true, url: assetUrl, key });
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
        if (!password || password.length < 6) {
          return json({ success: false, error: 'Password must be at least 6 characters' }, 400);
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

        if (newPassword) {
          if (newPassword.length < 6) {
            return json({ success: false, error: 'New password must be at least 6 characters' }, 400);
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

    // POST /api/vcon/save-env (Allows setting runtime Turso & R2 credentials in admin panel)
    if (pathname === '/api/vcon/save-env' && method === 'POST') {
      try {
        const body: any = await req.json();
        if (typeof process !== 'undefined' && process.env) {
          if (body.TURSO_DATABASE_URL) process.env.TURSO_DATABASE_URL = body.TURSO_DATABASE_URL;
          if (body.TURSO_AUTH_TOKEN) process.env.TURSO_AUTH_TOKEN = body.TURSO_AUTH_TOKEN;
          if (body.R2_ACCOUNT_ID) process.env.R2_ACCOUNT_ID = body.R2_ACCOUNT_ID;
          if (body.R2_ACCESS_KEY_ID) process.env.R2_ACCESS_KEY_ID = body.R2_ACCESS_KEY_ID;
          if (body.R2_SECRET_ACCESS_KEY) process.env.R2_SECRET_ACCESS_KEY = body.R2_SECRET_ACCESS_KEY;
          if (body.R2_BUCKET_NAME) process.env.R2_BUCKET_NAME = body.R2_BUCKET_NAME;
          if (body.R2_PUBLIC_DOMAIN) process.env.R2_PUBLIC_DOMAIN = body.R2_PUBLIC_DOMAIN;
        }

        return json({ success: true, message: 'Runtime configuration updated successfully.' });
      } catch (err: any) {
        return json({ success: false, error: err?.message || 'Failed to update credentials' }, 500);
      }
    }
  }

  return json({ error: 'Endpoint not found' }, 404);
}
