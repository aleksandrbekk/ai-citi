// Apple-style SVG Icons
// Beautiful, minimal icons for the application

interface IconProps {
    className?: string
    size?: number
}

// Home icon - minimal house
export function HomeIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <path
                d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

// Carousel icon - slides
export function CarouselIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M2 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M22 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        </svg>
    )
}

// User/Profile icon
export function UserIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
            <path
                d="M4 21C4 17.134 7.58172 14 12 14C16.4183 14 20 17.134 20 21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    )
}

// School/Graduation icon
export function SchoolIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <path
                d="M12 3L2 9L12 15L22 9L12 3Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <path
                d="M6 12V17C6 17 8 20 12 20C16 20 18 17 18 17V12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M22 9V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

// Shop/Store icon
export function ShopIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <path
                d="M3 6L5 3H19L21 6M3 6V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V6M3 6H21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <path
                d="M9 10C9 11.6569 10.3431 13 12 13C13.6569 13 15 11.6569 15 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    )
}

// Mission/Target icon
export function MissionIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <path d="M12 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 17V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M3 12H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M17 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

// AI Bot icon
export function BotIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <rect x="4" y="8" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="9" cy="14" r="1.5" fill="currentColor" />
            <circle cx="15" cy="14" r="1.5" fill="currentColor" />
            <path d="M12 4V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="3" r="1" fill="currentColor" />
            <path d="M1 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 12H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

// Back arrow icon
export function BackIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <path
                d="M15 19L8 12L15 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

// Check icon
export function CheckIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <path
                d="M5 12L10 17L19 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

// Sparkle/Magic icon
export function SparkleIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <path
                d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <path d="M18 14L19 17L22 18L19 19L18 22L17 19L14 18L17 17L18 14Z" fill="currentColor" />
        </svg>
    )
}

// Calendar icon
export function CalendarIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M3 9H21" stroke="currentColor" strokeWidth="2" />
            <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="8" cy="14" r="1" fill="currentColor" />
            <circle cx="12" cy="14" r="1" fill="currentColor" />
            <circle cx="16" cy="14" r="1" fill="currentColor" />
        </svg>
    )
}

// Image/Photo icon
export function ImageIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
            <path
                d="M21 15L16.5 10.5C15.8 9.8 14.7 9.8 14 10.5L5 19.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    )
}

// Send/Arrow right icon
export function SendIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <path
                d="M5 12H19M19 12L13 6M19 12L13 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

// Loader/Spinner icon
export function LoaderIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={`animate-spin ${className}`}
        >
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                strokeOpacity="0.25"
            />
            <path
                d="M12 2C6.47715 2 2 6.47715 2 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    )
}

// Settings/Gear icon
export function SettingsIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            <path
                d="M12 1V4M12 20V23M4.22 4.22L6.34 6.34M17.66 17.66L19.78 19.78M1 12H4M20 12H23M4.22 19.78L6.34 17.66M17.66 6.34L19.78 4.22"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    )
}

// Plus icon
export function PlusIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <path
                d="M12 5V19M5 12H19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    )
}

// City/Building icon (for НЕЙРОГОРОД)
export function CityIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <path d="M3 21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <rect x="5" y="9" width="6" height="12" stroke="currentColor" strokeWidth="2" />
            <rect x="13" y="3" width="6" height="18" stroke="currentColor" strokeWidth="2" />
            <path d="M7 13H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M7 17H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M15 7H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M15 11H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M15 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

// Lock icon (for restricted access)
export function LockIcon({ className = '', size = 24 }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={className}
        >
            <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1.5" fill="currentColor" />
        </svg>
    )
}
