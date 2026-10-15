import { handleApiRequest } from '../../src/lib/apiHandler.ts';

export interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_DOMAIN?: string;
  ADMIN_SECRET?: string;
  BUCKET?: R2Bucket;
  R2_BUCKET?: R2Bucket;
  HTML_TEMPLATES_BUCKET?: R2Bucket;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  return handleApiRequest(context.request, context.env);
};
