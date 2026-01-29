import { motion } from 'framer-motion'

// Базовый скелетон с shimmer эффектом
export function Skeleton({ className = '' }: { className?: string }) {
    return (
        <motion.div
            className={`bg-gray-200 rounded-lg overflow-hidden relative ${className}`}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        >
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </motion.div>
    )
}

// Скелетон для карточки
export function CardSkeleton() {
    return (
        <div className="p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
            <Skeleton className="h-6 w-1/2 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
        </div>
    )
}

// Скелетон для списка
export function ListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                        <Skeleton className="h-4 w-1/3 mb-2" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                </div>
            ))}
        </div>
    )
}

// Скелетон для аватара
export function AvatarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16'
    }
    return <Skeleton className={`${sizeClasses[size]} rounded-full`} />
}

// Скелетон для чата
export function ChatSkeleton() {
    return (
        <div className="space-y-4 p-4">
            <div className="flex justify-start">
                <div className="flex gap-2 max-w-[80%]">
                    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div>
                        <Skeleton className="h-16 w-48 rounded-2xl mb-1" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>
            </div>
            <div className="flex justify-end">
                <div className="max-w-[80%]">
                    <Skeleton className="h-12 w-36 rounded-2xl mb-1" />
                    <Skeleton className="h-3 w-12 ml-auto" />
                </div>
            </div>
            <div className="flex justify-start">
                <div className="flex gap-2 max-w-[80%]">
                    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                    <Skeleton className="h-20 w-56 rounded-2xl" />
                </div>
            </div>
        </div>
    )
}

// Grid скелетон для карточек
export function GridSkeleton({ cols = 2, count = 4 }: { cols?: 2 | 3; count?: number }) {
    return (
        <div className={`grid gap-4 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {Array.from({ length: count }).map((_, i) => (
                <CardSkeleton key={i} />
            ))}
        </div>
    )
}
