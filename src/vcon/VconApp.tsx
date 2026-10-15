import React, { useState, useEffect, useCallback } from 'react';
import { VconSidebar, VconTab } from './components/VconSidebar.tsx';
import { VconLogin } from './components/VconLogin.tsx';
import { VconSetupAdmin } from './components/VconSetupAdmin.tsx';
import { TemplateManager } from './pages/TemplateManager.tsx';
import { TemplateCreateEdit } from './pages/TemplateCreateEdit.tsx';
import { CategoryManager } from './pages/CategoryManager.tsx';
import { TursoManager } from './pages/TursoManager.tsx';
import { R2Manager } from './pages/R2Manager.tsx';
import { SettingsManager } from './pages/SettingsManager.tsx';
import { DeploymentDocs } from './pages/DeploymentDocs.tsx';
import { HtmlTemplate, Category, SystemStatus } from '../types.ts';
import { X, Download, Copy, Check, Eye } from 'lucide-react';

export const VconApp: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('vcon_admin_token'));
  const [verifying, setVerifying] = useState(true);
  const [activeTab, setActiveTab] = useState<VconTab>('templates');
  const [editingTemplate, setEditingTemplate] = useState<HtmlTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<HtmlTemplate | null>(null);

  const [hasAdminUser, setHasAdminUser] = useState<boolean | null>(null);
  const [dbConfigured, setDbConfigured] = useState<boolean>(false);
  const [forceSetupMode, setForceSetupMode] = useState(false);

  const [templates, setTemplates] = useState<HtmlTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    turso: { configured: false, connected: false, message: 'Checking...' },
    r2: { configured: false, connected: false, message: 'Checking...' },
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Verify authentication token and check if admin exists in database
  useEffect(() => {
    async function checkAuthAndAdminStatus() {
      const stored = localStorage.getItem('vcon_admin_token');

      // Check auth status from Turso SQLite database
      try {
        const statusRes = await fetch('/api/vcon/auth-status');
        const statusData: any = await statusRes.json();
        if (statusRes.ok && statusData.success) {
          setHasAdminUser(statusData.hasAdmin);
          setDbConfigured(Boolean(statusData.dbConfigured));
        } else {
          setHasAdminUser(false);
          setDbConfigured(false);
        }
      } catch {
        setHasAdminUser(false);
        setDbConfigured(false);
      }

      if (stored) {
        try {
          const res = await fetch('/api/vcon/verify', {
            method: 'POST',
            headers: { Authorization: `Bearer ${stored}` },
          });
          const data: any = await res.json();
          if (data.success) {
            setToken(stored);
          } else {
            localStorage.removeItem('vcon_admin_token');
            setToken(null);
          }
        } catch {
          setToken(null);
        }
      } else {
        setToken(null);
      }

      setVerifying(false);
    }

    checkAuthAndAdminStatus();
  }, []);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const data: any = await res.json();
      if (data.success && data.status) {
        setSystemStatus(data.status);
      }
    } catch (err) {
      console.error('Failed to fetch system status', err);
    }
  }, []);

  // Fetch templates from real database
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/templates');
      const data: any = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setTemplates(data.items);
      } else {
        setTemplates([]);
      }
    } catch (err) {
      console.error('Failed to fetch templates', err);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // Fetch categories from real database
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch('/api/vcon/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: any = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setCategories(data.items);
      } else {
        setCategories([]);
      }
    } catch {
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchStatus();
      fetchTemplates();
      fetchCategories();
    }
  }, [token, fetchStatus, fetchTemplates, fetchCategories]);

  const handleLogout = () => {
    localStorage.removeItem('vcon_admin_token');
    setToken(null);
  };

  const handleSaveCategory = async (data: {
    id?: string;
    name: string;
    slug: string;
    status?: 'active' | 'inactive';
  }) => {
    const res = await fetch('/api/vcon/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const resData: any = await res.json();
    if (resData.success) {
      showToast(data.id ? 'Category updated' : 'Category created');
      fetchCategories();
      return { success: true };
    }
    return { success: false, error: resData.error };
  };

  const handleToggleCategoryStatus = async (id: string, status: 'active' | 'inactive') => {
    const res = await fetch(`/api/vcon/categories/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const resData: any = await res.json();
    if (resData.success) {
      showToast(`Category ${status === 'active' ? 'activated' : 'deactivated'}`);
      fetchCategories();
      return true;
    }
    return false;
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Delete this category?')) return false;
    const res = await fetch(`/api/vcon/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const resData: any = await res.json();
    if (resData.success) {
      showToast('Category deleted');
      fetchCategories();
      return true;
    }
    return false;
  };

  const handleBulkUpload = async (
    files: Array<{ title: string; slug?: string; category?: string; tags?: string[]; html_content: string }>
  ) => {
    const res = await fetch('/api/vcon/templates/bulk-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ files }),
    });
    const data: any = await res.json();
    if (data.success) {
      showToast(`Uploaded ${data.uploaded} templates`);
      fetchTemplates();
      fetchStatus();
      return { success: true, uploaded: data.uploaded, failed: data.failed };
    }
    return { success: false, error: data.error };
  };

  const handleSaveTemplate = async (payload: {
    id?: string;
    title: string;
    slug: string;
    category: string;
    tags: string[];
    html_content: string;
  }) => {
    const res = await fetch('/api/vcon/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data: any = await res.json();
    if (data.success) {
      showToast(payload.id ? 'Template updated' : 'Template created & published');
      await fetchTemplates();
      setActiveTab('templates');
      setEditingTemplate(null);
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Delete this template permanently from Turso & R2?')) return;

    try {
      const res = await fetch(`/api/vcon/templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: any = await res.json();
      if (data.success) {
        showToast('Template deleted');
        fetchTemplates();
      } else {
        showToast(`Delete failed: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err?.message}`);
    }
  };

  const handleInitSchema = async (): Promise<{ success: boolean; message: string }> => {
    const res = await fetch('/api/vcon/init-db', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return (await res.json()) as any;
  };

  const handleSeedDb = async (): Promise<{ success: boolean; message: string; seeded?: number }> => {
    const res = await fetch('/api/vcon/seed-db', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data: any = await res.json();
    if (data.success) {
      fetchTemplates();
    }
    return data;
  };

  const handleTestTurso = async (): Promise<{ success: boolean; message: string; count?: number }> => {
    const res = await fetch('/api/vcon/test-turso', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return (await res.json()) as any;
  };

  const handleTestR2 = async (): Promise<{ success: boolean; message: string }> => {
    const res = await fetch('/api/vcon/test-r2', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return (await res.json()) as any;
  };

  const handleSaveR2Config = async (config: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicDomain?: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> => {
    const res = await fetch('/api/vcon/r2-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    });
    const data: any = await res.json();
    if (data.success) {
      await fetchStatus();
    }
    return data;
  };

  const handleDeleteR2Config = async (): Promise<boolean> => {
    const res = await fetch('/api/vcon/r2-config', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data: any = await res.json();
    if (data.success) {
      await fetchStatus();
    }
    return Boolean(data.success);
  };

  const handleSaveRuntimeEnv = async (creds: Record<string, string | undefined>) => {
    const res = await fetch('/api/vcon/save-env', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(creds),
    });
    const data: any = await res.json();
    return Boolean(data.success);
  };

  if (verifying) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center text-xs text-zinc-500 font-mono">
        Verifying admin session...
      </div>
    );
  }

  if (!token) {
    if (forceSetupMode || hasAdminUser === false) {
      return (
        <VconSetupAdmin
          dbConfigured={dbConfigured}
          onSuccess={(tok) => {
            setToken(tok);
            setHasAdminUser(true);
            setForceSetupMode(false);
          }}
          onSwitchToLogin={() => setForceSetupMode(false)}
        />
      );
    }

    return (
      <VconLogin
        onLoginSuccess={(tok) => setToken(tok)}
        onSwitchToSetup={() => setForceSetupMode(true)}
      />
    );
  }

  return (
    <div className="h-screen w-full bg-zinc-950 flex overflow-hidden antialiased">
      {/* Sidebar */}
      <VconSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'add') setEditingTemplate(null);
          setActiveTab(tab);
        }}
        onLogout={handleLogout}
        tursoConnected={systemStatus.turso.connected}
        r2Connected={systemStatus.r2.connected}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeTab === 'templates' && (
          <TemplateManager
            templates={templates}
            loading={loadingTemplates}
            onRefresh={() => {
              fetchTemplates();
              fetchStatus();
            }}
            onAddNew={() => {
              setEditingTemplate(null);
              setActiveTab('add');
            }}
            onEdit={(tmpl) => {
              setEditingTemplate(tmpl);
              setActiveTab('add');
            }}
            onDelete={handleDeleteTemplate}
            onPreview={(tmpl) => setPreviewTemplate(tmpl)}
            tursoConnected={systemStatus.turso.connected}
            onSeedDb={async () => {
              await handleSeedDb();
              fetchTemplates();
            }}
          />
        )}

        {activeTab === 'categories' && (
          <CategoryManager
            categories={categories}
            loading={loadingCategories}
            onRefresh={fetchCategories}
            onSaveCategory={handleSaveCategory}
            onToggleStatus={handleToggleCategoryStatus}
            onDeleteCategory={handleDeleteCategory}
          />
        )}

        {activeTab === 'add' && (
          <TemplateCreateEdit
            initialTemplate={editingTemplate}
            categories={categories}
            onSave={handleSaveTemplate}
            onBulkUpload={handleBulkUpload}
            onCancel={() => {
              setEditingTemplate(null);
              setActiveTab('templates');
            }}
            r2Connected={systemStatus.r2.connected}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsManager
            token={token}
            onRefreshStatus={fetchStatus}
          />
        )}

        {activeTab === 'turso' && (
          <TursoManager
            status={systemStatus.turso}
            onRefresh={fetchStatus}
            onInitSchema={handleInitSchema}
            onSeedDb={handleSeedDb}
            onTestConnection={handleTestTurso}
            onSaveCredentials={(creds) =>
              handleSaveRuntimeEnv({
                TURSO_DATABASE_URL: creds.url,
                TURSO_AUTH_TOKEN: creds.token,
              })
            }
          />
        )}

        {activeTab === 'r2' && (
          <R2Manager
            status={systemStatus.r2}
            onRefresh={fetchStatus}
            onTestConnection={handleTestR2}
            onSaveR2Config={handleSaveR2Config}
            onDeleteR2Config={handleDeleteR2Config}
          />
        )}

        {activeTab === 'deploy' && <DeploymentDocs />}
      </main>

      {/* Admin Quick Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="h-10 px-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <span className="font-semibold text-zinc-200 text-xs truncate">
                {previewTemplate.title}
              </span>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 bg-white relative">
              <iframe
                title="Preview"
                srcDoc={previewTemplate.html_content}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-3 right-3 bg-zinc-900 border border-zinc-700 text-zinc-100 text-[11px] px-3 py-1.5 rounded shadow-xl z-50 font-medium">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
