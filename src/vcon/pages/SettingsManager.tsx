import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Globe,
  Users,
  Save,
  Upload,
  Trash2,
  Plus,
  Edit2,
  Lock,
  User,
  Image as ImageIcon,
  CheckCircle2,
  X,
  RefreshCw,
} from 'lucide-react';
import { SiteSettings, AdminUser } from '../../types.ts';

interface Props {
  token: string | null;
  onRefreshStatus?: () => void;
}

export const SettingsManager: React.FC<Props> = ({ token }) => {
  const [activeSubTab, setActiveSubTab] = useState<'branding' | 'admins'>('branding');

  // Site Branding State
  const [siteName, setSiteName] = useState('HTML Snippets & Templates');
  const [siteDescription, setSiteDescription] = useState('Free responsive HTML snippets and component templates directory.');
  const [appLogo, setAppLogo] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [ogImage, setOgImage] = useState('');

  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);
  const [brandingFeedback, setBrandingFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin Users State
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Admin Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Admin Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editingLoading, setEditingLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // File Inputs
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const favInputRef = useRef<HTMLInputElement | null>(null);
  const ogInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/vcon/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: any = await res.json();
      if (res.ok && data.success && data.settings) {
        setSiteName(data.settings.site_name || 'HTML Snippets & Templates');
        setSiteDescription(data.settings.site_description || '');
        setAppLogo(data.settings.app_logo || '');
        setFaviconUrl(data.settings.favicon_url || '');
        setOgImage(data.settings.og_image || '');
      }
    } catch {
      // Keep defaults
    }
  };

  // Fetch Admin Users
  const fetchAdminUsers = async () => {
    setLoadingAdmins(true);
    try {
      const res = await fetch('/api/vcon/admin-users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: any = await res.json();
      if (res.ok && data.success && Array.isArray(data.users)) {
        setAdminUsers(data.users);
      }
    } catch {
      setAdminUsers([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSettings();
      fetchAdminUsers();
    }
  }, [token]);

  // Asset Upload Handler
  const handleUploadFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    assetType: 'logo' | 'favicon' | 'ogImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAsset(assetType);
    setBrandingFeedback(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileData = event.target?.result as string;
      if (!fileData) {
        setUploadingAsset(null);
        return;
      }

      try {
        const res = await fetch('/api/vcon/upload-asset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: file.name,
            fileData,
            assetType,
          }),
        });
        const data: any = await res.json();
        if (res.ok && data.success && data.url) {
          if (assetType === 'logo') setAppLogo(data.url);
          if (assetType === 'favicon') setFaviconUrl(data.url);
          if (assetType === 'ogImage') setOgImage(data.url);
          setBrandingFeedback({ type: 'success', text: `${assetType} uploaded.` });
        } else {
          setBrandingFeedback({ type: 'error', text: data.error || 'Upload failed' });
        }
      } catch (err: any) {
        setBrandingFeedback({ type: 'error', text: err?.message || 'Upload error' });
      } finally {
        setUploadingAsset(null);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setBrandingFeedback(null);

    try {
      const res = await fetch('/api/vcon/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          site_name: siteName.trim(),
          site_description: siteDescription.trim(),
          app_logo: appLogo.trim(),
          favicon_url: faviconUrl.trim(),
          og_image: ogImage.trim(),
        }),
      });

      const data: any = await res.json();
      if (res.ok && data.success) {
        setBrandingFeedback({ type: 'success', text: 'Settings saved.' });
        // Update document title immediately if matching
        if (siteName.trim()) {
          document.title = siteName.trim();
        }
      } else {
        setBrandingFeedback({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (err: any) {
      setBrandingFeedback({ type: 'error', text: err?.message || 'Error saving settings' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Add Admin
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (newAdminUsername.trim().length < 3) {
      setAddError('Username must be at least 3 characters');
      return;
    }
    if (newAdminPassword.length < 6) {
      setAddError('Password must be at least 6 characters');
      return;
    }

    setAddingAdmin(true);
    try {
      const res = await fetch('/api/vcon/admin-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newAdminUsername.trim(),
          password: newAdminPassword,
        }),
      });
      const data: any = await res.json();
      if (res.ok && data.success) {
        setAddModalOpen(false);
        setNewAdminUsername('');
        setNewAdminPassword('');
        setAdminFeedback({ type: 'success', text: 'Admin user created.' });
        fetchAdminUsers();
      } else {
        setAddError(data.error || 'Failed to create admin');
      }
    } catch (err: any) {
      setAddError(err?.message || 'Server error');
    } finally {
      setAddingAdmin(false);
    }
  };

  // Open Edit Admin
  const handleOpenEdit = (user: AdminUser) => {
    setEditingAdmin(user);
    setEditUsername(user.username);
    setEditPassword('');
    setEditError(null);
    setEditModalOpen(true);
  };

  // Submit Edit Admin
  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setEditError(null);

    if (editUsername.trim().length < 3) {
      setEditError('Username must be at least 3 characters');
      return;
    }

    if (editPassword && editPassword.length < 6) {
      setEditError('Password must be at least 6 characters');
      return;
    }

    setEditingLoading(true);
    try {
      const res = await fetch(`/api/vcon/admin-users/${editingAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: editUsername.trim(),
          newPassword: editPassword || undefined,
        }),
      });
      const data: any = await res.json();
      if (res.ok && data.success) {
        setEditModalOpen(false);
        setAdminFeedback({ type: 'success', text: 'Admin updated.' });
        fetchAdminUsers();
      } else {
        setEditError(data.error || 'Failed to update admin');
      }
    } catch (err: any) {
      setEditError(err?.message || 'Server error');
    } finally {
      setEditingLoading(false);
    }
  };

  // Delete Admin
  const handleDeleteAdmin = async (user: AdminUser) => {
    if (adminUsers.length <= 1) {
      setAdminFeedback({ type: 'error', text: 'Cannot delete the only admin user.' });
      return;
    }

    if (!window.confirm(`Delete admin user "${user.username}"?`)) return;

    try {
      const res = await fetch(`/api/vcon/admin-users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: any = await res.json();
      if (res.ok && data.success) {
        setAdminFeedback({ type: 'success', text: 'Admin deleted.' });
        fetchAdminUsers();
      } else {
        setAdminFeedback({ type: 'error', text: data.error || 'Failed to delete admin' });
      }
    } catch (err: any) {
      setAdminFeedback({ type: 'error', text: err?.message || 'Error deleting admin' });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-900 text-xs overflow-y-auto p-3.5 space-y-3">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4 text-zinc-400" />
          <h2 className="font-semibold text-zinc-200 uppercase text-xs tracking-tight">
            Settings
          </h2>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center space-x-1 bg-zinc-950 border border-zinc-800 p-0.5 rounded text-[11px]">
          <button
            onClick={() => setActiveSubTab('branding')}
            className={`px-2.5 py-1 rounded transition cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === 'branding'
                ? 'bg-zinc-850 text-zinc-200 border border-zinc-750/50 font-medium'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <Globe className="w-3 h-3" />
            <span>Site & Branding</span>
          </button>
          <button
            onClick={() => setActiveSubTab('admins')}
            className={`px-2.5 py-1 rounded transition cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === 'admins'
                ? 'bg-zinc-850 text-zinc-200 border border-zinc-750/50 font-medium'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Admin Users ({adminUsers.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Site Identity & Branding */}
      {activeSubTab === 'branding' && (
        <form onSubmit={handleSaveSettings} className="space-y-3">
          {brandingFeedback && (
            <div
              className={`p-2 rounded text-[11px] border ${
                brandingFeedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              {brandingFeedback.text}
            </div>
          )}

          {/* Site Name & Description */}
          <div className="bg-zinc-950 border border-zinc-800 rounded p-3 space-y-2.5">
            <span className="font-semibold text-zinc-200 uppercase text-[10px] tracking-wider block">
              Site Identity
            </span>

            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">
                Site Name
              </label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Site name"
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">
                Meta Description
              </label>
              <textarea
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                rows={2}
                placeholder="Meta description for search engines"
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none"
              />
            </div>
          </div>

          {/* Logo, Favicon & OG Image Assets */}
          <div className="bg-zinc-950 border border-zinc-800 rounded p-3 space-y-3">
            <span className="font-semibold text-zinc-200 uppercase text-[10px] tracking-wider block">
              Branding Assets
            </span>

            {/* 1. App Logo */}
            <div className="p-2.5 bg-zinc-900/60 border border-zinc-850 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center overflow-hidden shrink-0">
                  {appLogo ? (
                    <img src={appLogo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs font-bold text-zinc-500">Logo</span>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="font-medium text-zinc-200 block text-[11px]">App Logo</span>
                  <input
                    type="text"
                    value={appLogo}
                    onChange={(e) => setAppLogo(e.target.value)}
                    placeholder="URL or upload image"
                    className="w-48 sm:w-64 px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[11px] text-zinc-300 font-mono focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-1.5 self-end sm:self-center">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadFile(e, 'logo')}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingAsset === 'logo'}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/60 rounded text-[10px] font-medium transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-2.5 h-2.5" />
                  <span>{uploadingAsset === 'logo' ? 'Uploading...' : 'Upload'}</span>
                </button>
                {appLogo && (
                  <button
                    type="button"
                    onClick={() => setAppLogo('')}
                    className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Favicon */}
            <div className="p-2.5 bg-zinc-900/60 border border-zinc-850 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center overflow-hidden shrink-0">
                  {faviconUrl ? (
                    <img src={faviconUrl} alt="Favicon" className="w-5 h-5 object-contain" />
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-mono">.ico</span>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="font-medium text-zinc-200 block text-[11px]">Favicon</span>
                  <input
                    type="text"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="URL or upload .ico/.png"
                    className="w-48 sm:w-64 px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[11px] text-zinc-300 font-mono focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-1.5 self-end sm:self-center">
                <input
                  ref={favInputRef}
                  type="file"
                  accept="image/x-icon,image/png,image/svg+xml"
                  onChange={(e) => handleUploadFile(e, 'favicon')}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => favInputRef.current?.click()}
                  disabled={uploadingAsset === 'favicon'}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/60 rounded text-[10px] font-medium transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-2.5 h-2.5" />
                  <span>{uploadingAsset === 'favicon' ? 'Uploading...' : 'Upload'}</span>
                </button>
                {faviconUrl && (
                  <button
                    type="button"
                    onClick={() => setFaviconUrl('')}
                    className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* 3. OG Social Share Image */}
            <div className="p-2.5 bg-zinc-900/60 border border-zinc-850 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-10 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center overflow-hidden shrink-0">
                  {ogImage ? (
                    <img src={ogImage} alt="OG Card" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-zinc-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="font-medium text-zinc-200 block text-[11px]">Social Share Card (og:image)</span>
                  <input
                    type="text"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    placeholder="URL or upload 1200x630 image"
                    className="w-48 sm:w-64 px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[11px] text-zinc-300 font-mono focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-1.5 self-end sm:self-center">
                <input
                  ref={ogInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadFile(e, 'ogImage')}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => ogInputRef.current?.click()}
                  disabled={uploadingAsset === 'ogImage'}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/60 rounded text-[10px] font-medium transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-2.5 h-2.5" />
                  <span>{uploadingAsset === 'ogImage' ? 'Uploading...' : 'Upload'}</span>
                </button>
                {ogImage && (
                  <button
                    type="button"
                    onClick={() => setOgImage('')}
                    className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-3.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-750/60 rounded text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Admin Users Management */}
      {activeSubTab === 'admins' && (
        <div className="space-y-3">
          {adminFeedback && (
            <div
              className={`p-2 rounded text-[11px] border ${
                adminFeedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              {adminFeedback.text}
            </div>
          )}

          <div className="bg-zinc-950 border border-zinc-800 rounded p-3 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-zinc-850">
              <span className="font-semibold text-zinc-200 uppercase text-[10px] tracking-wider">
                Admin Users
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={fetchAdminUsers}
                  className="p-1 text-zinc-400 hover:text-zinc-200 rounded transition cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingAdmins ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    setNewAdminUsername('');
                    setNewAdminPassword('');
                    setAddError(null);
                    setAddModalOpen(true);
                  }}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/60 rounded text-[10px] font-medium flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>Add Admin</span>
                </button>
              </div>
            </div>

            {loadingAdmins ? (
              <div className="py-6 text-center text-zinc-500 font-mono text-[11px]">
                Loading admin users...
              </div>
            ) : adminUsers.length === 0 ? (
              <div className="py-6 text-center text-zinc-500 font-mono text-[11px]">
                No admin accounts found.
              </div>
            ) : (
              <div className="divide-y divide-zinc-850">
                {adminUsers.map((admin) => (
                  <div key={admin.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 font-mono text-[10px]">
                        <User className="w-3 h-3 text-zinc-400" />
                      </div>
                      <div>
                        <span className="font-medium text-zinc-200 block text-[11px]">
                          {admin.username}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ID: {admin.id}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEdit(admin)}
                        className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded text-[10px] font-medium transition flex items-center space-x-1 cursor-pointer"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteAdmin(admin)}
                        disabled={adminUsers.length <= 1}
                        className="p-1 text-zinc-500 hover:text-rose-400 disabled:opacity-20 cursor-pointer"
                        title={adminUsers.length <= 1 ? 'Cannot delete the only admin' : 'Delete admin'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-3.5 py-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <span className="font-semibold text-zinc-200 text-xs">Add Admin User</span>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="p-3.5 space-y-3">
              {addError && (
                <div className="p-2 bg-rose-950/40 border border-rose-800/50 rounded text-rose-300 text-[11px]">
                  {addError}
                </div>
              )}

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                  placeholder="admin_username"
                  className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-2.5 py-1 text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingAdmin}
                  className="px-3 py-1 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-750/60 rounded text-xs font-medium transition cursor-pointer disabled:opacity-50"
                >
                  {addingAdmin ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {editModalOpen && editingAdmin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-3.5 py-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <span className="font-semibold text-zinc-200 text-xs">Edit Admin User</span>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleEditAdmin} className="p-3.5 space-y-3">
              {editError && (
                <div className="p-2 bg-rose-950/40 border border-rose-800/50 rounded text-rose-300 text-[11px]">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-2.5 py-1 text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editingLoading}
                  className="px-3 py-1 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-750/60 rounded text-xs font-medium transition cursor-pointer disabled:opacity-50"
                >
                  {editingLoading ? 'Saving...' : 'Update Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
