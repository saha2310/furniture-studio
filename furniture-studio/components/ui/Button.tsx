import Link from 'next/link';
import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const base =
  'inline-flex items-center justify-center gap-2 rounded font-sans font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-canvas hover:bg-espresso',
  secondary: 'bg-transparent text-ink border border-ink hover:bg-ink hover:text-canvas',
  ghost: 'bg-transparent text-ink hover:bg-surface',
  danger: 'bg-transparent text-red-700 border border-red-700 hover:bg-red-700 hover:text-white',
};

const sizes: Record<Size, string> = {
  md: 'px-6 py-3 text-[15px]',
  sm: 'px-4 py-2 text-sm',
};

interface ButtonOwnProps {
  variant?: Variant;
  size?: Size;
}

type ButtonProps = ButtonOwnProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', ...props }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
);
Button.displayName = 'Button';

type ButtonLinkProps = ButtonOwnProps & React.ComponentProps<typeof Link>;

export function ButtonLink({ variant = 'primary', size = 'md', className = '', ...props }: ButtonLinkProps) {
  return <Link className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}
