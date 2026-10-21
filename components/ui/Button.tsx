import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost';
    fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', fullWidth, children, ...props }, ref) => {

        let variantStyles = '';

        switch (variant) {
            case 'primary':
                variantStyles = 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90';
                break;
            case 'outline':
                variantStyles = 'bg-transparent border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-surface)]';
                break;
            case 'ghost':
                variantStyles = 'bg-transparent text-[var(--color-foreground)] hover:opacity-70';
                break;
        }

        return (
            <button
                ref={ref}
                className={`
          flex h-11 items-center justify-center rounded-[12px] 
          px-6 font-medium transition-colors
          disabled:cursor-not-allowed disabled:opacity-50
          ${fullWidth ? 'w-full' : 'w-fit'}
          ${variantStyles}
          ${className}
        `}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
