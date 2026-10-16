import Navbar from "./Navbar";

/**
 * Layout for signed-in screens: skip link, header, and a single <main>
 * landmark. The skip link lets keyboard users jump past the header.
 */
export default function AppShell({ children }) {
    return (
        <div className="min-h-screen bg-slate-50">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-800 focus:shadow-overlay"
            >
                Skip to main content
            </a>
            <Navbar />
            <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-6 focus:outline-none sm:px-6 sm:py-8">
                {children}
            </main>
        </div>
    );
}
