import './AppIcon.css'

interface AppIconProps {
  size?: number
}

export function AppIcon({ size = 32 }: AppIconProps) {
  return (
    <div className="app-icon" style={{ width: size, height: size }}>
      <span className="app-icon-symbol" style={{ fontSize: size * 0.55 }}>􂷸</span>
    </div>
  )
}
