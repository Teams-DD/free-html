import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
	state = { hasError: false };

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
		console.error('Application render failed', error.name);
	}

	render() {
		if (this.state.hasError) {
			return (
				<main className="min-h-screen bg-[#090a0c] text-zinc-300 flex flex-col items-center justify-center gap-3 p-6 text-center">
					<h1 className="text-sm font-semibold text-zinc-200">App temporarily unavailable</h1>
					<p className="text-xs text-zinc-400">Reload the page to try again.</p>
					<button
						type="button"
						onClick={() => window.location.reload()}
						className="px-2.5 py-1 bg-zinc-800 text-zinc-200 rounded text-[11px] font-medium"
					>
						Reload
					</button>
				</main>
			);
		}
		return this.props.children;
	}
}

createRoot(document.getElementById('root')!).render(
	<AppErrorBoundary>
		<App />
	</AppErrorBoundary>
);
