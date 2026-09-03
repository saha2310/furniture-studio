import { forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; error?: string }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, id, className = '', ...props }, ref) => {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-2">
      {label && <label htmlFor={inputId} className="text-[11px] uppercase tracking-[0.12em] text-espresso">{label}</label>}
      <textarea ref={ref} id={inputId} className={`min-h-[130px] resize-y border bg-transparent px-4 py-3 text-sm leading-6 text-ink placeholder:text-stone transition-colors focus:border-white/45 ${error ? 'border-red-400' : 'border-white/15'} ${className}`} aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined} {...props} />
      {error && <p id={`${inputId}-error`} className="text-xs text-red-300">{error}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';
