export interface HtmlTemplate {
  id: string;
  title: string;
  slug: string;
  category: string;
  tags: string[];
  html_content: string;
  r2_key?: string | null;
  r2_url?: string | null;
  file_size: number;
  downloads: number;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  item_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TursoConfig {
  url: string;
  authToken: string;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain?: string;
}

export interface SystemStatus {
  turso: {
    configured: boolean;
    connected: boolean;
    message: string;
    templateCount?: number;
    url?: string;
  };
  r2: {
    configured: boolean;
    connected: boolean;
    message: string;
    bucket?: string;
    accountId?: string;
    accessKeyId?: string;
    publicDomain?: string;
    stats?: {
      totalFiles: number;
      totalBytes: number;
      totalKilobytes: number;
      totalMegabytes: number;
      totalGigabytes: number;
      formattedSize: string;
    };
  };
}

export interface SiteSettings {
  site_name: string;
  site_description: string;
  app_logo: string;
  favicon_url: string;
  og_image: string;
}

export interface AdminUser {
  id: string;
  username: string;
  created_at: string;
  updated_at: string;
}
