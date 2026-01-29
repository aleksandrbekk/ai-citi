import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

interface PageTransitionProps {
    children: ReactNode
}

/**
 * Обёртка для плавных переходов между страницами
 */
export function PageTransition({ children }: PageTransitionProps) {
    const location = useLocation()

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                    duration: 0.2,
                    ease: "easeOut"
                }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    )
}

/**
 * Fade-only transition для модалок и overlay контента
 */
export function FadeTransition({ children }: PageTransitionProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
        >
            {children}
        </motion.div>
    )
}

/**
 * Slide-up transition для bottom sheets и панелей
 */
export function SlideUpTransition({ children }: PageTransitionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{
                type: "spring",
                damping: 25,
                stiffness: 300
            }}
        >
            {children}
        </motion.div>
    )
}

export default PageTransition
