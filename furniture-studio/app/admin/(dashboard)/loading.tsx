function Block({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-ink/[0.04] ${className}`} />;
}

export default function AdminLoading() {
  return <div className="max-w-5xl space-y-5">
    <div><Block className="h-3 w-24" /><Block className="mt-3 h-8 w-48" /><Block className="mt-2 h-4 w-80 max-w-full" /></div>
    <div className="space-y-3"><Block className="h-16 w-full border border-ink/10" /><Block className="h-16 w-full border border-ink/10" /><Block className="h-16 w-full border border-ink/10" /><Block className="h-16 w-full border border-ink/10" /></div>
  </div>;
}
