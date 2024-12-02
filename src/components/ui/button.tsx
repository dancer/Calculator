import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        Omit<VariantProps<typeof buttonVariants>, 'disabled'> {
    icon?: JSX.Element
    label?: string
    isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, corner, icon, label, isLoading, disabled, children, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, corner, isLoading, disabled, className }))}
                ref={ref}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && (
                    <div className='!visible absolute inset-0 flex items-center justify-center'>
                        <div className="size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                    </div>
                )}
                {icon &&
                    React.cloneElement(icon, {
                        className: cn(
                            iconVariants({
                                variant,
                                size,
                                disabled: disabled,
                            }),
                        ),
                    })}
                <span className='px-[3px] empty:hidden'>{label}</span>
                {children}
            </button>
        )
    },
)
Button.displayName = 'Button'

const buttonVariants = cva(
    'relative flex-initial flex items-center justify-center px-[10px] transition-default overflow-clip',
    {
        variants: {
            variant: {
                main: 'font-medium text-zinc-900 bg-[hsl(var(--primary))] shadow-lg hover:brightness-110',
                secondary: 'bg-zinc-800 border border-zinc-700 text-zinc-100 shadow-sm hover:bg-zinc-700',
                approve: 'font-medium text-white bg-green-600 shadow-lg hover:brightness-110',
                reject: 'text-red-600 bg-zinc-800 border border-zinc-700 shadow-sm hover:border-red-500 hover:bg-zinc-700',
            },
            size: {
                small: 'h-[35px] text-sm',
                medium: 'h-[40px] text-base',
                large: 'h-[50px] text-lg px-[15px]',
            },
            corner: {
                small: 'rounded-[10px]',
                large: 'rounded-[15px]',
            },
            isLoading: {
                true: 'bg-zinc-800 border border-zinc-700 text-zinc-100 shadow-sm *:invisible pointer-events-none',
            },
            disabled: {
                true: 'text-zinc-500 bg-zinc-800 border border-zinc-700 shadow-sm pointer-events-none opacity-50',
            },
        },
        defaultVariants: {
            variant: 'main',
            size: 'medium',
            corner: 'small',
        },
    },
)

const iconVariants = cva('pr-[2px]', {
    variants: {
        variant: {
            main: 'stroke-zinc-900 stroke-[2px]',
            secondary: 'stroke-zinc-100 stroke-[1.75px]',
            approve: 'stroke-white stroke-[2px]',
            reject: 'stroke-red-600 stroke-[1.75px]',
        },
        size: {
            small: 'size-[18px]',
            medium: 'w-[20px]',
            large: 'w-[22px]',
        },
        disabled: {
            true: 'stroke-zinc-500',
        },
    },
    defaultVariants: {
        variant: 'main',
        size: 'medium',
    },
})

export { Button, buttonVariants }
