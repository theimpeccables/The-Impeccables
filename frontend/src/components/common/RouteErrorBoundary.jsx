import React from 'react';
import { useNavigate, useRouteError } from 'react-router-dom';
import { AlertTriangle, RotateCw } from 'lucide-react';

const RouteErrorBoundary = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  const developmentMessage = import.meta.env.DEV && error instanceof Error ? error.message : '';

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#050505] px-5 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[.04] p-7 text-center shadow-[0_20px_80px_rgba(0,0,0,.45)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-300">
          <AlertTriangle size={22} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-bold">This page couldn’t load</h1>
        <p className="mt-2 text-sm leading-6 text-gray-400">Try reloading the page. If the problem continues, return home and try again.</p>
        {developmentMessage && <pre className="mt-4 overflow-auto rounded-lg bg-black/40 p-3 text-left text-xs text-red-200">{developmentMessage}</pre>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold transition hover:bg-red-500">
            <RotateCw size={15} aria-hidden="true" /> Reload page
          </button>
          <button type="button" onClick={() => navigate('/')} className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-white/5">
            Go to home
          </button>
        </div>
      </section>
    </main>
  );
};

export default RouteErrorBoundary;
