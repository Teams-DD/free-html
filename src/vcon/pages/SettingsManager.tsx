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
  User,
  Image as ImageIcon,
  X,
  RefreshCw,
  Code,
} from 'lucide-react';
import { AdminUser } from '../../types.ts';
import { isValidAdminPassword } from '../../lib/authPolicy.ts';
import { getHomeSeoMetadata } from '../../lib/seo.ts';
import { normalizeScriptSnippet } from '../../lib/siteScripts.ts';
import { useAdminConfirmation } from '../components/AdminConfirmation.tsx';

const DEFAULT_SITE_NAME = 'Free HTML Templates';
const DEFAULT_SITE_DESCRIPTION = 'Browse free HTML templates and responsive website components. Preview designs, inspect source code, and download HTML snippets to customize for your project.';
const DEFAULT_HOME_SEO = getHomeSeoMetadata({
  site_name: DEFAULT_SITE_NAME,
  site_description: DEFAULT_SITE_DESCRIPTION,
  seo_title: '',
  seo_description: '',
  seo_keywords: '',
});

interface Props {
  token: string | null;
  onRefreshStatus?: () => void;
}

export const SettingsManager: React.FC<Props> = ({ token }) => {
  const requestConfirmation = useAdminConfirmation();
  const [activeSubTab, setActiveSubTab] = useState<'branding' | 'scripts' | 'admins'>('branding');

  // Site Branding State
  const [siteName, setSiteName] = useState(DEFAULT_SITE_NAME);
  const [siteDescription, setSiteDescription] = useState(DEFAULT_SITE_DESCRIPTION);
  const [seoTitle, setSeoTitle] = useState(DEFAULT_HOME_SEO.title);
  const [seoDescription, setSeoDescription] = useState(DEFAULT_HOME_SEO.description);
  const [seoKeywords, setSeoKeywords] = useState(DEFAULT_HOME_SEO.keywords);
  const [seoTitleEdited, setSeoTitleEdited] = useState(false);
  const [seoDescriptionEdited, setSeoDescriptionEdited] = useState(false);
  const [seoKeywordsEdited, setSeoKeywordsEdited] = useState(false);
  const [appLogo, setAppLogo] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [devMode, setDevMode] = useState(false);
  const [headerScripts, setHeaderScripts] = useState('');
  const [footerScripts, setFooterScripts] = useState('');

  const [savingSettings, setSavingSettings] = useState(false);
  const [savingScripts, setSavingScripts] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);
  const [brandingFeedback, setBrandingFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scriptsFeedback, setScriptsFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        const nextSiteName = data.settings.site_name || DEFAULT_SITE_NAME;
        const nextSiteDescription = data.settings.site_description || DEFAULT_SITE_DESCRIPTION;
        const defaults = getHomeSeoMetadata({
          site_name: nextSiteName,
          site_description: nextSiteDescription,
          seo_title: '',
          seo_description: '',
          seo_keywords: '',
        });
        const savedSeoTitle = String(data.settings.seo_title || '').trim();
        const savedSeoDescription = String(data.settings.seo_description || '').trim();
        const savedSeoKeywords = String(data.settings.seo_keywords || '').trim();
        setSiteName(nextSiteName);
        setSiteDescription(nextSiteDescription);
        setSeoTitle(savedSeoTitle || defaults.title);
        setSeoDescription(savedSeoDescription || defaults.description);
        setSeoKeywords(savedSeoKeywords || defaults.keywords);
        setSeoTitleEdited(Boolean(savedSeoTitle));
        setSeoDescriptionEdited(Boolean(savedSeoDescription));
        setSeoKeywordsEdited(Boolean(savedSeoKeywords));
        setAppLogo(data.settings.app_logo || '');
        setFaviconUrl(data.settings.favicon_url || '');
        setOgImage(data.settings.og_image || '');
        setDevMode(Boolean(data.settings.dev_mode));
        setHeaderScripts(data.settings.header_scripts || '');
        setFooterScripts(data.settings.footer_scripts || '');
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
      } else {
        setAdminUsers([]);
      }
    } catch {
      setAdminUsers([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchAdminUsers();
  }, [token]);

  useEffect(() => {
    const defaults = getHomeSeoMetadata({
      site_name: siteName,
      site_description: siteDescription,
      seo_title: '',
      seo_description: '',
      seo_keywords: '',
    });
    if (!seoTitleEdited) setSeoTitle(defaults.title);
    if (!seoDescriptionEdited) setSeoDescription(defaults.description);
    if (!seoKeywordsEdited) setSeoKeywords(defaults.keywords);
  }, [seoDescriptionEdited, seoKeywordsEdited, seoTitleEdited, siteDescription, siteName]);

  const handleSeoTitleChange = (value: string) => {
    if (!value.trim()) {
      setSeoTitleEdited(false);
      setSeoTitle(getHomeSeoMetadata({ site_name: siteName, site_description: siteDescription, seo_title: '', seo_description: '', seo_keywords: '' }).title);
      return;
    }
    setSeoTitleEdited(true);
    setSeoTitle(value);
  };

  const handleSeoDescriptionChange = (value: string) => {
    if (!value.trim()) {
      setSeoDescriptionEdited(false);
      setSeoDescription(getHomeSeoMetadata({ site_name: siteName, site_description: siteDescription, seo_title: '', seo_description: '', seo_keywords: '' }).description);
      return;
    }
    setSeoDescriptionEdited(true);
    setSeoDescription(value);
  };

  const handleSeoKeywordsChange = (value: string) => {
    if (!value.trim()) {
      setSeoKeywordsEdited(false);
      setSeoKeywords(getHomeSeoMetadata({ site_name: siteName, site_description: siteDescription, seo_title: '', seo_description: '', seo_keywords: '' }).keywords);
      return;
    }
    setSeoKeywordsEdited(true);
    setSeoKeywords(value);
  };

  // Handle Save Settings
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
          seo_title: seoTitle.trim() || DEFAULT_HOME_SEO.title,
          seo_description: seoDescription.trim() || DEFAULT_HOME_SEO.description,
          seo_keywords: seoKeywords.trim() || DEFAULT_HOME_SEO.keywords,
          app_logo: appLogo.trim(),
          favicon_url: faviconUrl.trim(),
          og_image: ogImage.trim(),
          dev_mode: devMode,
        }),
      });

      const data: any = await res.json();
      if (res.ok && data.success) {
        setBrandingFeedback({ type: 'success', text: 'Site settings updated successfully.' });
      } else {
        setBrandingFeedback({ type: 'error', text: data.error || 'Failed to save settings.' });
      }
    } catch (err: any) {
      setBrandingFeedback({ type: 'error', text: err?.message || 'Server error.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveScripts = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingScripts(true);
    setScriptsFeedback(null);
    const normalizedHeaderScripts = normalizeScriptSnippet(headerScripts);
    const normalizedFooterScripts = normalizeScriptSnippet(footerScripts);

    try {
      const res = await fetch('/api/vcon/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ header_scripts: normalizedHeaderScripts, footer_scripts: normalizedFooterScripts }),
      });
      const data: any = await res.json();
      if (res.ok && data.success) {
        setHeaderScripts(normalizedHeaderScripts);
        setFooterScripts(normalizedFooterScripts);
        setScriptsFeedback({ type: 'success', text: 'Header and footer scripts saved.' });
      } else {
        setScriptsFeedback({ type: 'error', text: data.error || 'Failed to save scripts.' });
      }
    } catch (error: any) {
      setScriptsFeedback({ type: 'error', text: error?.message || 'Server error.' });
    } finally {
      setSavingScripts(false);
    }
  };

  // Upload Asset (Logo, Favicon, OG)
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'favicon' | 'ogImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAsset(field);
    setBrandingFeedback(null);

    const reader = new FileReader();
    reader.onload = async (uploadEvt) => {
      const fileData = uploadEvt.target?.result as string;
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
            assetType: field,
          }),
        });

        const data: any = await res.json();
        if (res.ok && data.success && data.url) {
          if (field === 'logo') setAppLogo(data.url);
          if (field === 'favicon') setFaviconUrl(data.url);
          if (field === 'ogImage') setOgImage(data.url);
          setBrandingFeedback({ type: 'success', text: `${field.toUpperCase()} uploaded to R2 successfully.` });
        } else {
          if (field === 'logo') setAppLogo(fileData);
          if (field === 'favicon') setFaviconUrl(fileData);
          if (field === 'ogImage') setOgImage(fileData);
          setBrandingFeedback({
            type: 'success',
            text: `${field.toUpperCase()} loaded (local preview). Click Save Settings to persist.`,
          });
        }
      } catch {
        if (field === 'logo') setAppLogo(fileData);
        if (field === 'favicon') setFaviconUrl(fileData);
        if (field === 'ogImage') setOgImage(fileData);
        setBrandingFeedback({
          type: 'success',
          text: `${field.toUpperCase()} loaded (local preview). Click Save Settings to persist.`,
        });
      } finally {
        setUploadingAsset(null);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // Add Admin
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (newAdminUsername.trim().length < 3) {
      setAddError('Username must be at least 3 characters');
      return;
    }
    if (!isValidAdminPassword(newAdminPassword)) {
      setAddError('Password must be 15 to 128 characters');
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

    if (editPassword && !isValidAdminPassword(editPassword)) {
      setEditError('Password must be 15 to 128 characters');
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
    const confirmed = await requestConfirmation({
      title: 'Delete admin user?',
      message: `Delete admin user "${user.username}"?`,
      confirmLabel: 'Delete user',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/vcon/admin-users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: any = await res.json();
      if (res.ok && data.success) {
        setAdminFeedback({ type: 'success', text: 'Admin user deleted.' });
        fetchAdminUsers();
      } else {
        setAdminFeedback({ type: 'error', text: data.error || 'Failed to delete admin' });
      }
    } catch (err: any) {
      setAdminFeedback({ type: 'error', text: err?.message || 'Server error' });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#090a0c] text-xs overflow-hidden">
      {/* Top Header */}
      <div className="h-12 px-4 bg-[#0f1013] border-b border-[#1c1d22] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <Settings className="w-4 h-4 text-zinc-400" />
          <h1 className="font-semibold text-zinc-200 uppercase text-xs tracking-tight">
            Settings
          </h1>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center space-x-1 bg-[#0c0d10] border border-[#22242b] p-0.5 rounded text-[11px]">
          <button
            onClick={() => setActiveSubTab('branding')}
            className={`px-2.5 py-1 rounded transition cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === 'branding'
                ? 'bg-[#181a22] text-zinc-100 border border-[#232634] font-medium'
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
                ? 'bg-[#181a22] text-zinc-100 border border-[#232634] font-medium'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Admin Users ({adminUsers.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('scripts')}
            className={`px-2.5 py-1 rounded transition cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === 'scripts'
                ? 'bg-[#181a22] text-zinc-100 border border-[#232634] font-medium'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <Code className="w-3 h-3" />
            <span>Scripts</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#090a0c]">
        {/* TAB 1: Site Identity & Branding */}
        {activeSubTab === 'branding' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 w-full max-w-7xl mx-auto">
            {brandingFeedback && (
              <div
                className={`p-2.5 rounded text-[11px] border ${
                  brandingFeedback.type === 'success'
                    ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-900/40 text-rose-300'
                }`}
              >
                {brandingFeedback.text}
              </div>
            )}

            {/* Site Name & Description */}
            <div className="bg-[#121317] border border-[#22242b] rounded-md p-4 space-y-3">
              <span className="font-semibold text-zinc-200 uppercase text-[10px] tracking-wider block">
                Site Identity
              </span>

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                  Site Name
                </label>
                <input
                  type="text"
                  required
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Site name"
                  className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                  Meta Description
                </label>
                <textarea
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  rows={2}
                  placeholder="Meta description for search engines"
                  className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#383b47] resize-none"
                />
              </div>

              <div className="border-t border-[#1c1d22] pt-3 space-y-3">
                <span className="block text-[10px] font-semibold text-zinc-300 uppercase tracking-wider">Homepage SEO Metadata</span>
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">SEO Title</label>
                  <input
                    type="text"
                    required
                    maxLength={70}
                    value={seoTitle}
                    onChange={(event) => handleSeoTitleChange(event.target.value)}
                    placeholder="Generated from site name"
                    className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">SEO Description</label>
                  <textarea
                    required
                    value={seoDescription}
                    onChange={(event) => handleSeoDescriptionChange(event.target.value)}
                    rows={2}
                    maxLength={160}
                    placeholder="Generated from site description"
                    className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#383b47] resize-y"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">SEO Keywords (comma-separated)</label>
                  <input
                    type="text"
                    required
                    maxLength={255}
                    value={seoKeywords}
                    onChange={(event) => handleSeoKeywordsChange(event.target.value)}
                    placeholder="Generated default keywords"
                    className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">Generated metadata is prefilled. Clear a value to restore its generated default.</p>
              </div>

              <label className="flex items-center justify-between gap-4 border-t border-[#1c1d22] pt-3">
                <span>
                  <span className="block text-[11px] font-medium text-zinc-200">Public Dev Mode</span>
                  <span className="mt-0.5 block text-[10px] text-zinc-500">
                    Shows local request and browser-error diagnostics to public page visitors.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={devMode}
                  onChange={(event) => setDevMode(event.target.checked)}
                  aria-label="Enable public Dev Mode"
                  className="h-4 w-4 shrink-0 accent-zinc-300"
                />
              </label>
            </div>

            {/* Logo, Favicon & OG Image Assets */}
            <div className="bg-[#121317] border border-[#22242b] rounded-md p-4 space-y-3">
              <span className="font-semibold text-zinc-200 uppercase text-[10px] tracking-wider block">
                Branding Assets
              </span>

              {/* 1. App Logo */}
              <div className="p-3 bg-[#0c0d10] border border-[#1f2026] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#121317] border border-[#22242b] rounded flex items-center justify-center overflow-hidden shrink-0">
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
                      className="w-48 sm:w-64 px-2 py-0.5 bg-[#090a0c] border border-[#22242b] rounded text-[11px] text-zinc-300 font-mono focus:outline-none focus:border-[#383b47]"
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
                    className="px-2.5 py-1 bg-[#181a22] hover:bg-[#20222d] text-zinc-200 border border-[#232634] rounded text-[10px] font-medium transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
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
              <div className="p-3 bg-[#0c0d10] border border-[#1f2026] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#121317] border border-[#22242b] rounded flex items-center justify-center overflow-hidden shrink-0">
                    {faviconUrl ? (
                      <img src={faviconUrl} alt="Favicon" className="w-5 h-5 object-contain" />
                    ) : (
                      <Globe className="w-4 h-4 text-zinc-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-zinc-200 block text-[11px]">Favicon (.ico or .png)</span>
                    <input
                      type="text"
                      value={faviconUrl}
                      onChange={(e) => setFaviconUrl(e.target.value)}
                      placeholder="URL or upload icon"
                      className="w-48 sm:w-64 px-2 py-0.5 bg-[#090a0c] border border-[#22242b] rounded text-[11px] text-zinc-300 font-mono focus:outline-none focus:border-[#383b47]"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 self-end sm:self-center">
                  <input
                    ref={favInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadFile(e, 'favicon')}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => favInputRef.current?.click()}
                    disabled={uploadingAsset === 'favicon'}
                    className="px-2.5 py-1 bg-[#181a22] hover:bg-[#20222d] text-zinc-200 border border-[#232634] rounded text-[10px] font-medium transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
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
              <div className="p-3 bg-[#0c0d10] border border-[#1f2026] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-10 bg-[#121317] border border-[#22242b] rounded flex items-center justify-center overflow-hidden shrink-0">
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
                      className="w-48 sm:w-64 px-2 py-0.5 bg-[#090a0c] border border-[#22242b] rounded text-[11px] text-zinc-300 font-mono focus:outline-none focus:border-[#383b47]"
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
                    className="px-2.5 py-1 bg-[#181a22] hover:bg-[#20222d] text-zinc-200 border border-[#232634] rounded text-[10px] font-medium transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
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
                className="px-3.5 py-1.5 bg-[#22242c] hover:bg-[#2b2d38] text-zinc-200 border border-[#2e313c] rounded text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
                <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        )}

        {activeSubTab === 'scripts' && (
          <form onSubmit={handleSaveScripts} className="mx-auto w-full max-w-5xl space-y-4">
            {scriptsFeedback && (
              <div
                role="status"
                className={`rounded border p-2.5 text-[11px] ${
                  scriptsFeedback.type === 'success'
                    ? 'border-emerald-900/40 bg-emerald-950/30 text-emerald-300'
                    : 'border-rose-900/40 bg-rose-950/30 text-rose-300'
                }`}
              >
                {scriptsFeedback.text}
              </div>
            )}

            <div className="rounded-md border border-amber-900/40 bg-amber-950/20 p-3 text-[11px] leading-5 text-amber-200">
              Code saved here runs on every public page for every visitor. Only paste scripts and embed code from sources you trust.
            </div>

            <section className="space-y-2 rounded-md border border-[#22242b] bg-[#121317] p-4">
              <label htmlFor="header-scripts" className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-200">Header</label>
              <p className="text-[10px] text-zinc-500">Added inside the public page head. Paste the complete provider snippet, including script tags when supplied.</p>
              <textarea
                id="header-scripts"
                value={headerScripts}
                onChange={(event) => setHeaderScripts(event.target.value)}
                rows={12}
                spellCheck={false}
                aria-label="Header scripts and code"
                placeholder={'<!-- Header scripts -->\n<script>/* trusted provider code */</script>'}
                className="w-full resize-y rounded border border-[#22242b] bg-[#090a0c] p-3 font-mono text-[11px] leading-5 text-zinc-200 placeholder-zinc-600 focus:border-[#383b47] focus:outline-none"
              />
            </section>

            <section className="space-y-2 rounded-md border border-[#22242b] bg-[#121317] p-4">
              <label htmlFor="footer-scripts" className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-200">Footer</label>
              <p className="text-[10px] text-zinc-500">Added at the end of the public page body, after the app content.</p>
              <textarea
                id="footer-scripts"
                value={footerScripts}
                onChange={(event) => setFooterScripts(event.target.value)}
                rows={12}
                spellCheck={false}
                aria-label="Footer scripts and code"
                placeholder={'<!-- Footer scripts -->\n<script>/* trusted provider code */</script>'}
                className="w-full resize-y rounded border border-[#22242b] bg-[#090a0c] p-3 font-mono text-[11px] leading-5 text-zinc-200 placeholder-zinc-600 focus:border-[#383b47] focus:outline-none"
              />
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingScripts}
                className="flex items-center space-x-1.5 rounded border border-[#2e313c] bg-[#22242c] px-3.5 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-[#2b2d38] disabled:opacity-50"
              >
                <Save className="h-3 w-3" />
                <span>{savingScripts ? 'Saving...' : 'Save Scripts'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Admin Users Management */}
        {activeSubTab === 'admins' && (
          <div className="space-y-4 w-full max-w-7xl mx-auto">
            {adminFeedback && (
              <div
                className={`p-2.5 rounded text-[11px] border ${
                  adminFeedback.type === 'success'
                    ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-900/40 text-rose-300'
                }`}
              >
                {adminFeedback.text}
              </div>
            )}

            <div className="bg-[#121317] border border-[#22242b] rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1c1d22]">
                <span className="font-semibold text-zinc-200 uppercase text-[10px] tracking-wider">
                  Admin Users
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={fetchAdminUsers}
                    className="p-1 text-zinc-400 hover:text-zinc-200 rounded transition cursor-pointer"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAdmins ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => {
                      setNewAdminUsername('');
                      setNewAdminPassword('');
                      setAddError(null);
                      setAddModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-[#22242c] hover:bg-[#2b2d38] text-zinc-200 border border-[#2e313c] rounded text-[10px] font-medium flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
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
                <div className="divide-y divide-[#1c1d22]">
                  {adminUsers.map((admin) => (
                    <div key={admin.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded bg-[#0c0d10] border border-[#22242b] flex items-center justify-center text-zinc-300 font-mono text-[10px]">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
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

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(admin)}
                          className="px-2.5 py-1 bg-[#0c0d10] hover:bg-[#181a22] text-zinc-300 border border-[#22242b] rounded text-[10px] font-medium transition flex items-center space-x-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteAdmin(admin)}
                          disabled={adminUsers.length <= 1}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 disabled:opacity-20 cursor-pointer"
                          title={adminUsers.length <= 1 ? 'Cannot delete the only admin' : 'Delete admin'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Admin Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-[#121317] border border-[#22242b] rounded-md w-full max-w-sm overflow-hidden">
            <div className="px-4 py-3 bg-[#0f1013] border-b border-[#1c1d22] flex items-center justify-between">
              <span className="font-semibold text-zinc-200 text-xs">Add Admin User</span>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="p-4 space-y-3">
              {addError && (
                <div className="p-2 bg-rose-950/40 border border-rose-900/50 rounded text-rose-300 text-[11px]">
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
                  className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 focus:outline-none focus:border-[#383b47]"
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
                  className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 focus:outline-none focus:border-[#383b47]"
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
                  className="px-3 py-1 bg-[#22242c] hover:bg-[#2b2d38] text-zinc-200 border border-[#2e313c] rounded text-xs font-medium transition cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-[#121317] border border-[#22242b] rounded-md w-full max-w-sm overflow-hidden">
            <div className="px-4 py-3 bg-[#0f1013] border-b border-[#1c1d22] flex items-center justify-between">
              <span className="font-semibold text-zinc-200 text-xs">Edit Admin User</span>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleEditAdmin} className="p-4 space-y-3">
              {editError && (
                <div className="p-2 bg-rose-950/40 border border-rose-900/50 rounded text-rose-300 text-[11px]">
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
                  className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 focus:outline-none focus:border-[#383b47]"
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
                  className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 focus:outline-none focus:border-[#383b47]"
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
                  className="px-3 py-1 bg-[#22242c] hover:bg-[#2b2d38] text-zinc-200 border border-[#2e313c] rounded text-xs font-medium transition cursor-pointer disabled:opacity-50"
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
