import { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; error?: string }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, id, className = '', children, ...props }, ref) => {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-2">
      {label && <label htmlFor={inputId} className="text-[11px] uppercase tracking-[0.12em] text-espresso">{label}</label>}
      <select ref={ref} id={inputId} className={`h-12 border bg-surface px-4 text-sm text-ink transition-colors focus:border-ink/45 ${error ? 'border-red-400' : 'border-ink/15'} ${className}`} aria-invalid={!!error} {...props}>{children}</select>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
});
Select.displayName = 'Select';
