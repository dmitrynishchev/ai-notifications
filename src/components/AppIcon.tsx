import './AppIcon.css'

interface AppIconProps {
  size?: number
}

export function AppIcon({ size = 32 }: AppIconProps) {
  return (
    <div className="app-icon" style={{ width: size, height: size }}>
      <svg
        className="app-icon-symbol"
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 0L13.5 10.5L24 12L13.5 13.5L12 24L10.5 13.5L0 12L10.5 10.5Z" />
      </svg>
    </div>
  )
}
