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
    id: 'neon-button',
    title: 'Minimal Dark Button',
    slug: 'minimal-dark-button',
    category: 'Buttons',
    tags: ['Button', 'Minimal', 'Smooth', 'Tailwind'],
    html_content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Minimal Dark Button</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="flex items-center justify-center min-h-screen bg-zinc-950 p-4">
  <button class="relative px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-xs font-medium rounded-md border border-zinc-700/70 shadow-xs hover:border-zinc-600 active:scale-95 transition-all duration-150 cursor-pointer">
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
  <div class="flex items-center space-x-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 shadow-sm">
    <span class="text-xs font-medium text-zinc-300">Notifications</span>
    <span id="count" class="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">3</span>
    <button onclick="let c=document.getElementById('count');c.innerText=parseInt(c.innerText)+1" class="ml-1 w-5 h-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-bold flex items-center justify-center transition cursor-pointer">+</button>
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
  <label class="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" class="sr-only peer" checked>
    <div class="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 border border-zinc-700"></div>
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
  <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
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
  <div class="flex items-center space-x-1.5 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded text-amber-300 text-xs font-medium">
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
  <div class="w-64 bg-zinc-900 border border-zinc-800 rounded-lg p-3.5 shadow-sm">
    <div class="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1.5">
      <span>Daily API Calls</span>
      <span class="text-emerald-400 text-[11px] font-semibold">+18.2%</span>
    </div>
    <div class="text-xl font-bold text-zinc-100 tracking-tight">142,890</div>
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
  <div class="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow-xl">
    <h3 class="text-xs font-bold text-zinc-100 mb-1">Confirm Deployment</h3>
    <p class="text-[11px] text-zinc-400 mb-4">Deploy changes to production Cloudflare edge nodes?</p>
    <div class="flex items-center justify-end space-x-2">
      <button class="px-2.5 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 rounded transition cursor-pointer">Cancel</button>
      <button class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium rounded transition cursor-pointer">Deploy</button>
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
  <div class="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-lg space-x-1">
    <button class="px-3 py-1 bg-zinc-800 text-white text-xs font-medium rounded shadow-xs cursor-pointer">Overview</button>
    <button class="px-3 py-1 text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded transition cursor-pointer">Logs</button>
    <button class="px-3 py-1 text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded transition cursor-pointer">Settings</button>
  </div>
</body>
</html>`
  }
];
