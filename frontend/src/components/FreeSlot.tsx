export function FreeSlot({
  top,
  height,
  label = 'Общее свободное',
}: {
  top: number
  height: number
  label?: string
}) {
  return (
    <div className="free-slot" style={{ top: `${top}%`, height: `${height}%` }}>
      <span>{label}</span>
    </div>
  )
}
