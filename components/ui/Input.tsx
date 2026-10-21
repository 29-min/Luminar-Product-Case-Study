import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, ...props }, ref) => {
        return (
            <div className="flex w-full flex-col gap-2">
                {label && (
                    <label htmlFor={props.id} className="text-sm font-bold text-[var(--color-foreground)]">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={`
            h-11 w-full rounded-[12px] 
            border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 
            text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
            disabled:cursor-not-allowed disabled:opacity-50
            ${className}
          `}
                    {...props}
                />
            </div>
        );
    }
);

Input.displayName = 'Input';
