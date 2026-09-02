import { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, className = '', children, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm text-espresso">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={`rounded border bg-canvas px-3.5 py-2.5 text-[15px] text-ink ${
            error ? 'border-red-600' : 'border-stone'
          } ${className}`}
          aria-invalid={!!error}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
