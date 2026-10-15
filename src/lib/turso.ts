import { createClient, type Client } from '@libsql/client';
import { HtmlTemplate, Category, SiteSettings, AdminUser } from '../types.ts';
import { INITIAL_SEEDS } from './initialTemplates.ts';

let cachedClient: Client | null = null;
let cachedConfigKey = '';

export function getTursoClient(url?: string, authToken?: string): Client | null {
  const dbUrl = url || (typeof process !== 'undefined' ? process.env?.TURSO_DATABASE_URL : undefined);
  const token = authToken || (typeof process !== 'undefined' ? process.env?.TURSO_AUTH_TOKEN : undefined);

  if (!dbUrl) {
    return null;
  }

  const key = `${dbUrl}::${token || ''}`;
  if (cachedClient && cachedConfigKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient({
      url: dbUrl,
      authToken: token || undefined,
    });
    cachedConfigKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Turso Client:', err);
    return null;
  }
}

export async function initTursoSchema(client: Client): Promise<{ success: boolean; message: string }> {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL DEFAULT 'General',
        tags TEXT DEFAULT '[]',
        html_content TEXT NOT NULL,
        r2_key TEXT,
        r2_url TEXT,
        file_size INTEGER DEFAULT 0,
        downloads INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Ensure indexes
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_templates_slug ON templates(slug);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);`);

    // Auto-seed default categories if empty
    const catCheck = await client.execute('SELECT COUNT(*) as count FROM categories');
    if (Number(catCheck.rows[0]?.count || 0) === 0) {
      const defaultCategories = ['Buttons', 'Badges', 'Forms', 'Loaders', 'Alerts', 'Cards', 'Navigation', 'General'];
      const now = new Date().toISOString();
      for (const name of defaultCategories) {
        const id = `cat_${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        await client.execute({
          sql: `INSERT OR IGNORE INTO categories (id, name, slug, status, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?)`,
          args: [id, name, slug, now, now],
        });
      }
    }

    return { success: true, message: 'Database tables "templates", "admins", "settings", and "categories" verified in Turso SQLite.' };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Failed to initialize Turso schema' };
  }
}

export async function getSetting(client: Client, key: string): Promise<string | null> {
  try {
    await initTursoSchema(client);
    const res = await client.execute({
      sql: 'SELECT value FROM settings WHERE key = ? LIMIT 1',
      args: [key],
    });
    if (res.rows.length === 0) return null;
    return String(res.rows[0].value);
  } catch {
    return null;
  }
}

export async function setSetting(client: Client, key: string, value: string): Promise<void> {
  await initTursoSchema(client);
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [key, value, now],
  });
}

export async function deleteSetting(client: Client, key: string): Promise<void> {
  await initTursoSchema(client);
  await client.execute({
    sql: 'DELETE FROM settings WHERE key = ?',
    args: [key],
  });
}

export async function getCategories(client: Client): Promise<Category[]> {
  await initTursoSchema(client);
  const res = await client.execute(`
    SELECT 
      c.id,
      c.name,
      c.slug,
      c.status,
      c.created_at,
      c.updated_at,
      COUNT(t.id) as item_count
    FROM categories c
    LEFT JOIN templates t ON LOWER(t.category) = LOWER(c.name)
    GROUP BY c.id
    ORDER BY c.name ASC
  `);

  return res.rows.map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    status: (row.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
    item_count: Number(row.item_count || 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }));
}

export async function saveCategory(
  client: Client,
  data: { id?: string; name: string; slug: string; status?: 'active' | 'inactive' }
): Promise<Category> {
  await initTursoSchema(client);
  const now = new Date().toISOString();
  const cleanName = data.name.trim();
  const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
  const status = data.status || 'active';

  if (data.id) {
    await client.execute({
      sql: `UPDATE categories SET name = ?, slug = ?, status = ?, updated_at = ? WHERE id = ?`,
      args: [cleanName, cleanSlug, status, now, data.id],
    });
    return {
      id: data.id,
      name: cleanName,
      slug: cleanSlug,
      status,
      created_at: now,
      updated_at: now,
    };
  } else {
    const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await client.execute({
      sql: `INSERT INTO categories (id, name, slug, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, cleanName, cleanSlug, status, now, now],
    });
    return {
      id,
      name: cleanName,
      slug: cleanSlug,
      status,
      created_at: now,
      updated_at: now,
    };
  }
}

export async function toggleCategoryStatus(
  client: Client,
  id: string,
  status: 'active' | 'inactive'
): Promise<boolean> {
  await initTursoSchema(client);
  const now = new Date().toISOString();
  const res = await client.execute({
    sql: 'UPDATE categories SET status = ?, updated_at = ? WHERE id = ?',
    args: [status, now, id],
  });
  return res.rowsAffected > 0;
}

export async function deleteCategory(client: Client, id: string): Promise<boolean> {
  await initTursoSchema(client);
  const res = await client.execute({
    sql: 'DELETE FROM categories WHERE id = ?',
    args: [id],
  });
  return res.rowsAffected > 0;
}

export async function countAdmins(client: Client): Promise<number> {
  try {
    await initTursoSchema(client);
    const res = await client.execute('SELECT COUNT(*) as count FROM admins');
    return Number(res.rows[0]?.count || 0);
  } catch (err) {
    console.error('Error counting admins in Turso:', err);
    return 0;
  }
}

export async function getAdminByUsername(
  client: Client,
  username: string
): Promise<{ id: string; username: string; password_hash: string; salt: string } | null> {
  await initTursoSchema(client);
  const res = await client.execute({
    sql: 'SELECT * FROM admins WHERE username = ? LIMIT 1',
    args: [username.trim().toLowerCase()],
  });

  if (res.rows.length === 0) return null;
  const row: any = res.rows[0];
  return {
    id: String(row.id),
    username: String(row.username),
    password_hash: String(row.password_hash),
    salt: String(row.salt),
  };
}

export async function createAdminUser(
  client: Client,
  username: string,
  passwordHash: string,
  salt: string
): Promise<{ id: string; username: string }> {
  await initTursoSchema(client);
  const id = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const cleanUser = username.trim().toLowerCase();

  await client.execute({
    sql: `INSERT INTO admins (id, username, password_hash, salt, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, cleanUser, passwordHash, salt, now, now],
  });

  return { id, username: cleanUser };
}

export async function seedTursoDatabase(client: Client): Promise<{ seeded: number; message: string }> {
  await initTursoSchema(client);

  const existing = await client.execute('SELECT COUNT(*) as count FROM templates');
  const count = Number(existing.rows[0]?.count || 0);

  if (count > 0) {
    return { seeded: 0, message: `Database already has ${count} templates. Skipped seeding.` };
  }

  const now = new Date().toISOString();
  let inserted = 0;

  for (const item of INITIAL_SEEDS) {
    const size = new TextEncoder().encode(item.html_content).length;
    await client.execute({
      sql: `INSERT OR IGNORE INTO templates (id, title, slug, category, tags, html_content, r2_key, r2_url, file_size, downloads, views, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        item.id,
        item.title,
        item.slug,
        item.category,
        JSON.stringify(item.tags),
        item.html_content,
        `templates/${item.slug}.html`,
        null,
        size,
        Math.floor(Math.random() * 25) + 3,
        Math.floor(Math.random() * 120) + 18,
        now,
        now,
      ],
    });
    inserted++;
  }

  return { seeded: inserted, message: `Successfully seeded ${inserted} initial templates into Turso SQLite.` };
}

export async function getTemplates(
  client: Client,
  options?: { category?: string; search?: string; sort?: 'newest' | 'downloads' | 'views' }
): Promise<HtmlTemplate[]> {
  let query = 'SELECT * FROM templates';
  const conditions: string[] = [];
  const args: any[] = [];

  if (options?.category && options.category !== 'all') {
    conditions.push('LOWER(category) = LOWER(?)');
    args.push(options.category);
  }

  if (options?.search) {
    conditions.push('(title LIKE ? OR tags LIKE ? OR category LIKE ?)');
    const searchTerm = `%${options.search}%`;
    args.push(searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  if (options?.sort === 'downloads') {
    query += ' ORDER BY downloads DESC, created_at DESC';
  } else if (options?.sort === 'views') {
    query += ' ORDER BY views DESC, created_at DESC';
  } else {
    query += ' ORDER BY created_at DESC';
  }

  const res = await client.execute({ sql: query, args });

  return res.rows.map((row: any) => ({
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    category: String(row.category || 'General'),
    tags: parseTags(row.tags),
    html_content: String(row.html_content || ''),
    r2_key: row.r2_key ? String(row.r2_key) : null,
    r2_url: row.r2_url ? String(row.r2_url) : null,
    file_size: Number(row.file_size || 0),
    downloads: Number(row.downloads || 0),
    views: Number(row.views || 0),
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
  }));
}

export async function getTemplateBySlug(client: Client, slug: string): Promise<HtmlTemplate | null> {
  const res = await client.execute({
    sql: 'SELECT * FROM templates WHERE slug = ? OR id = ? LIMIT 1',
    args: [slug, slug],
  });

  if (res.rows.length === 0) return null;
  const row: any = res.rows[0];

  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    category: String(row.category || 'General'),
    tags: parseTags(row.tags),
    html_content: String(row.html_content || ''),
    r2_key: row.r2_key ? String(row.r2_key) : null,
    r2_url: row.r2_url ? String(row.r2_url) : null,
    file_size: Number(row.file_size || 0),
    downloads: Number(row.downloads || 0),
    views: Number(row.views || 0),
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
  };
}

export async function saveTemplate(
  client: Client,
  data: {
    id?: string;
    title: string;
    slug: string;
    category: string;
    tags: string[];
    html_content: string;
    r2_key?: string | null;
    r2_url?: string | null;
  }
): Promise<HtmlTemplate> {
  await initTursoSchema(client);

  const now = new Date().toISOString();
  const id = data.id || `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fileSize = new TextEncoder().encode(data.html_content).length;
  const tagsJson = JSON.stringify(data.tags || []);

  const existing = await client.execute({
    sql: 'SELECT id, downloads, views, created_at FROM templates WHERE id = ? OR slug = ? LIMIT 1',
    args: [id, data.slug],
  });

  if (existing.rows.length > 0) {
    const existingRow: any = existing.rows[0];
    const targetId = String(existingRow.id);
    await client.execute({
      sql: `UPDATE templates
            SET title = ?, slug = ?, category = ?, tags = ?, html_content = ?, r2_key = ?, r2_url = ?, file_size = ?, updated_at = ?
            WHERE id = ?`,
      args: [data.title, data.slug, data.category, tagsJson, data.html_content, data.r2_key || null, data.r2_url || null, fileSize, now, targetId],
    });

    return (await getTemplateBySlug(client, targetId))!;
  } else {
    await client.execute({
      sql: `INSERT INTO templates (id, title, slug, category, tags, html_content, r2_key, r2_url, file_size, downloads, views, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      args: [id, data.title, data.slug, data.category, tagsJson, data.html_content, data.r2_key || null, data.r2_url || null, fileSize, now, now],
    });

    return (await getTemplateBySlug(client, id))!;
  }
}

export async function deleteTemplate(client: Client, id: string): Promise<boolean> {
  const res = await client.execute({
    sql: 'DELETE FROM templates WHERE id = ? OR slug = ?',
    args: [id, id],
  });
  return res.rowsAffected > 0;
}

export async function incrementDownloads(client: Client, id: string): Promise<number> {
  await client.execute({
    sql: 'UPDATE templates SET downloads = downloads + 1 WHERE id = ? OR slug = ?',
    args: [id, id],
  });
  const res = await client.execute({
    sql: 'SELECT downloads FROM templates WHERE id = ? OR slug = ?',
    args: [id, id],
  });
  return Number(res.rows[0]?.downloads || 0);
}

export async function incrementViews(client: Client, id: string): Promise<number> {
  await client.execute({
    sql: 'UPDATE templates SET views = views + 1 WHERE id = ? OR slug = ?',
    args: [id, id],
  });
  const res = await client.execute({
    sql: 'SELECT views FROM templates WHERE id = ? OR slug = ?',
    args: [id, id],
  });
  return Number(res.rows[0]?.views || 0);
}

export async function testTursoConnection(client: Client): Promise<{ success: boolean; message: string; count: number }> {
  try {
    await initTursoSchema(client);
    const res = await client.execute('SELECT COUNT(*) as count FROM templates');
    const count = Number(res.rows[0]?.count || 0);
    return {
      success: true,
      message: `Successfully connected to Turso SQLite. Found ${count} templates.`,
      count,
    };
  } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Failed to query Turso SQLite database',
        count: 0,
      };
  }
}

export async function getR2StorageReport(client: Client): Promise<{
  totalFiles: number;
  totalBytes: number;
  totalKilobytes: number;
  totalMegabytes: number;
  totalGigabytes: number;
  formattedSize: string;
}> {
  try {
    await initTursoSchema(client);
    const res = await client.execute(`
      SELECT 
        COUNT(*) as total_files,
        COALESCE(SUM(file_size), 0) as total_bytes
      FROM templates
      WHERE r2_key IS NOT NULL
    `);

    const totalFiles = Number(res.rows[0]?.total_files || 0);
    const totalBytes = Number(res.rows[0]?.total_bytes || 0);

    const totalKilobytes = Number((totalBytes / 1024).toFixed(2));
    const totalMegabytes = Number((totalBytes / (1024 * 1024)).toFixed(3));
    const totalGigabytes = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(6));

    let formattedSize = '0 B';
    if (totalGigabytes >= 1) {
      formattedSize = `${totalGigabytes.toFixed(2)} GB`;
    } else if (totalMegabytes >= 1) {
      formattedSize = `${totalMegabytes.toFixed(2)} MB (${totalGigabytes.toFixed(4)} GB)`;
    } else if (totalKilobytes >= 1) {
      formattedSize = `${totalKilobytes.toFixed(1)} KB (${totalGigabytes.toFixed(6)} GB)`;
    } else if (totalBytes > 0) {
      formattedSize = `${totalBytes} Bytes (${totalGigabytes.toFixed(7)} GB)`;
    }

    return {
      totalFiles,
      totalBytes,
      totalKilobytes,
      totalMegabytes,
      totalGigabytes,
      formattedSize,
    };
  } catch (err) {
    console.error('Error generating storage report:', err);
    return {
      totalFiles: 0,
      totalBytes: 0,
      totalKilobytes: 0,
      totalMegabytes: 0,
      totalGigabytes: 0,
      formattedSize: '0 B',
    };
  }
}

function parseTags(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(raw).split(',').map(s => s.trim()).filter(Boolean);
  }
}

export async function getSiteSettings(client: Client): Promise<SiteSettings> {
  await initTursoSchema(client);
  const defaultSettings: SiteSettings = {
    site_name: 'HTML Snippets & Templates',
    site_description: 'Free responsive HTML snippets and component templates directory.',
    app_logo: '',
    favicon_url: '',
    og_image: '',
  };

  try {
    const res = await client.execute({
      sql: `SELECT key, value FROM settings WHERE key IN ('site_name', 'site_description', 'app_logo', 'favicon_url', 'og_image')`,
    });
    const map: Record<string, string> = {};
    for (const row of res.rows) {
      map[String(row.key)] = String(row.value);
    }
    return {
      site_name: map.site_name || defaultSettings.site_name,
      site_description: map.site_description || defaultSettings.site_description,
      app_logo: map.app_logo || defaultSettings.app_logo,
      favicon_url: map.favicon_url || defaultSettings.favicon_url,
      og_image: map.og_image || defaultSettings.og_image,
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveSiteSettings(
  client: Client,
  settings: Partial<SiteSettings>
): Promise<SiteSettings> {
  await initTursoSchema(client);
  const now = new Date().toISOString();
  const keys: (keyof SiteSettings)[] = ['site_name', 'site_description', 'app_logo', 'favicon_url', 'og_image'];

  for (const k of keys) {
    if (settings[k] !== undefined) {
      const val = String(settings[k] ?? '');
      await client.execute({
        sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: [k, val, now],
      });
    }
  }

  return getSiteSettings(client);
}

export async function getAdminUsers(client: Client): Promise<AdminUser[]> {
  await initTursoSchema(client);
  const res = await client.execute('SELECT id, username, created_at, updated_at FROM admins ORDER BY created_at ASC');
  return res.rows.map((row: any) => ({
    id: String(row.id),
    username: String(row.username),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }));
}

export async function updateAdminUser(
  client: Client,
  id: string,
  data: { username?: string; passwordHash?: string; salt?: string }
): Promise<boolean> {
  await initTursoSchema(client);
  const now = new Date().toISOString();
  if (data.username && data.passwordHash && data.salt) {
    const cleanUser = data.username.trim().toLowerCase();
    const res = await client.execute({
      sql: 'UPDATE admins SET username = ?, password_hash = ?, salt = ?, updated_at = ? WHERE id = ?',
      args: [cleanUser, data.passwordHash, data.salt, now, id],
    });
    return res.rowsAffected > 0;
  } else if (data.username) {
    const cleanUser = data.username.trim().toLowerCase();
    const res = await client.execute({
      sql: 'UPDATE admins SET username = ?, updated_at = ? WHERE id = ?',
      args: [cleanUser, now, id],
    });
    return res.rowsAffected > 0;
  } else if (data.passwordHash && data.salt) {
    const res = await client.execute({
      sql: 'UPDATE admins SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?',
      args: [data.passwordHash, data.salt, now, id],
    });
    return res.rowsAffected > 0;
  }
  return false;
}

export async function deleteAdminUser(
  client: Client,
  id: string
): Promise<{ success: boolean; error?: string }> {
  await initTursoSchema(client);
  const countRes = await client.execute('SELECT COUNT(*) as count FROM admins');
  const total = Number(countRes.rows[0]?.count || 0);
  if (total <= 1) {
    return { success: false, error: 'Cannot delete the only admin user in the system.' };
  }

  const res = await client.execute({
    sql: 'DELETE FROM admins WHERE id = ?',
    args: [id],
  });
  return { success: res.rowsAffected > 0 };
}
