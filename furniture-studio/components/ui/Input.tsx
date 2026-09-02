import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm text-espresso">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`rounded border bg-canvas px-3.5 py-2.5 text-[15px] text-ink placeholder:text-stone ${
            error ? 'border-red-600' : 'border-stone'
          } ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
