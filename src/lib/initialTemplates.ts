export interface SeedTemplate {
  id: string;
  title: string;
  slug: string;
  category: string;
  tags: string[];
  html_content: string;
}

export const INITIAL_SEEDS: SeedTemplate[] = [
  {
    id: 'minimal-button',
    title: 'Minimal Dark Button',
    slug: 'minimal-dark-button',
    category: 'Buttons',
    tags: ['Button', 'Minimal', 'Soft', 'Tailwind'],
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Minimal Dark Button</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="flex items-center justify-center min-h-screen bg-zinc-950 p-4">
  <button class="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium rounded transition-colors cursor-pointer shadow-none border-0">
    Explore Components
  </button>
</body>
</html>`
  },
  {
    id: 'counter-badge',
    title: 'Counter Badge',
    slug: 'counter-badge',
    category: 'Badges',
    tags: ['Badge', 'Counter', 'Interactive', 'Tailwind'],
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Counter Badge</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="flex items-center justify-center min-h-screen bg-zinc-950 p-4">
  <div class="flex items-center space-x-2 bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800 shadow-none">
    <span class="text-xs font-medium text-zinc-300">Notifications</span>
    <span id="count" class="bg-zinc-800 text-zinc-200 text-[10px] font-medium px-1.5 py-0.5 rounded shadow-none border-0">3</span>
    <button onclick="let c=document.getElementById('count');c.innerText=parseInt(c.innerText)+1" class="w-5 h-5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded text-xs font-medium flex items-center justify-center transition-colors cursor-pointer shadow-none border-0">+</button>
  </div>
</body>
</html>`
  },
  {
    id: 'toggle-switch',
    title: 'Toggle Switch',
    slug: 'toggle-switch',
    category: 'Forms',
    tags: ['Toggle', 'Input', 'Control', 'Tailwind'],
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Toggle Switch</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="flex items-center justify-center min-h-screen bg-zinc-950 p-4">
  <label class="relative inline-flex items-center cursor-pointer shadow-none">
    <input type="checkbox" class="sr-only peer" checked>
    <div class="w-8 h-4.5 bg-zinc-800 peer-focus:outline-none rounded-sm peer peer-checked:after:translate-x-3.5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:rounded-xs after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-zinc-650 shadow-none border-0"></div>
  </label>
</body>
</html>`
  },
  {
    id: 'sleek-loader',
    title: 'Sleek Loader',
    slug: 'sleek-loader',
    category: 'Loaders',
    tags: ['Spinner', 'Loading', 'Minimal', 'Tailwind'],
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sleek Loader</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="flex items-center justify-center min-h-screen bg-zinc-950 p-4">
  <div class="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin shadow-none"></div>
</body>
</html>`
  },
  {
    id: 'alert-badge',
    title: 'Alert Status Badge',
    slug: 'alert-status-badge',
    category: 'Badges',
    tags: ['Alert', 'Status', 'Feedback', 'Tailwind'],
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alert Badge</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="flex items-center justify-center min-h-screen bg-zinc-950 p-4">
  <div class="flex items-center space-x-1.5 bg-amber-950/25 border border-amber-800/40 px-2.5 py-1 rounded text-amber-300 text-xs font-medium shadow-none">
    <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    <span>Update Available</span>
  </div>
</body>
</html>`
  },
  {
    id: 'metric-card',
    title: 'Analytics Stat Card',
    slug: 'analytics-stat-card',
    category: 'Cards',
    tags: ['Metrics', 'Dashboard', 'Stat', 'Tailwind'],
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics Stat Card</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="flex items-center justify-center min-h-screen bg-zinc-950 p-4">
  <div class="w-64 bg-zinc-900 border border-zinc-800 rounded p-3.5 shadow-none">
    <div class="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1.5">
      <span>Daily API Calls</span>
      <span class="text-zinc-300 text-[11px] font-medium">+18.2%</span>
    </div>
    <div class="text-lg font-semibold text-zinc-200 tracking-tight">142,890</div>
    <div class="mt-2 text-[11px] text-zinc-500 font-normal">Updated 2 minutes ago</div>
  </div>
</body>
</html>`
  },
  {
    id: 'glass-modal',
    title: 'Dark Confirmation Modal',
    slug: 'dark-confirmation-modal',
    category: 'Modals',
    tags: ['Modal', 'Dialog', 'Confirm', 'Tailwind'],
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation Modal</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="flex items-center justify-center min-h-screen bg-zinc-950 p-4">
  <div class="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded p-4 shadow-none">
    <h3 class="text-xs font-semibold text-zinc-200 mb-1">Confirm Deployment</h3>
    <p class="text-[11px] text-zinc-400 mb-4">Deploy changes to production Cloudflare edge nodes?</p>
    <div class="flex items-center justify-end space-x-2">
      <button class="px-2.5 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 rounded transition cursor-pointer shadow-none border-0">Cancel</button>
      <button class="px-3 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-[11px] font-medium rounded transition cursor-pointer shadow-none border-0">Deploy</button>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'tab-navigator',
    title: 'Segmented Tab Control',
    slug: 'segmented-tab-control',
    category: 'Navigation',
    tags: ['Tabs', 'Navigation', 'Minimal', 'Tailwind'],
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Segmented Tab Control</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="flex items-center justify-center min-h-screen bg-zinc-950 p-4">
  <div class="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded space-x-1 shadow-none">
    <button class="px-3 py-1 bg-zinc-800 text-zinc-200 text-xs font-medium rounded cursor-pointer shadow-none border-0">Overview</button>
    <button class="px-3 py-1 text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded transition cursor-pointer shadow-none border-0">Logs</button>
    <button class="px-3 py-1 text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded transition cursor-pointer shadow-none border-0">Settings</button>
  </div>
</body>
</html>`
  }
];
