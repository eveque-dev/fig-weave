import { useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { RObject } from './client'

export function DragOverlay({ objects, disabled, selected, select, move }: { objects: RObject[]; disabled: boolean; selected: string; select: (id: string) => void; move: (id: string, dx: number, dy: number) => void }) {
  const { t } = useTranslation('dialogs')
  const svg = useRef<SVGSVGElement>(null)
  const gesture = useRef<{ id: string; pointerId: number; x: number; y: number; width: number; height: number } | null>(null)
  const [offset, setOffset] = useState<{ id: string; x: number; y: number } | null>(null)
  const down = (e: PointerEvent<SVGElement>, id: string) => {
    if (disabled || e.button !== 0 || gesture.current) return
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.focus()
    const rect = svg.current!.getBoundingClientRect()
    gesture.current = { id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, width: rect.width, height: rect.height }
    select(id)
  }
  return <svg ref={svg} data-r-drag-overlay viewBox="0 0 1000 1000" preserveAspectRatio="none" className="r-drag-overlay" style={{ pointerEvents: disabled ? 'none' : undefined }}>
    {objects.map((object) => {
      const c = object.coords.map((v) => v * 1000)
      const props = {
        'data-r-object': object.id, 'data-r-kind': object.kind, tabIndex: disabled ? -1 : 0,
        role: 'button', 'aria-label': t(`rStudio.drag${object.kind}`),
        className: `r-drag-object${selected === object.id ? ' selected' : ''}`,
        transform: offset?.id === object.id ? `translate(${offset.x * 1000} ${offset.y * 1000})` : undefined,
        onFocus: () => select(object.id),
        onPointerDown: (e: PointerEvent<SVGElement>) => down(e, object.id),
        onPointerMove: (e: PointerEvent) => { const g = gesture.current; if (g?.pointerId === e.pointerId) setOffset({ id: g.id, x: (e.clientX - g.x) / g.width, y: (e.clientY - g.y) / g.height }) },
        onPointerUp: (e: PointerEvent) => {
          const g = gesture.current
          if (!g || g.pointerId !== e.pointerId) return
          gesture.current = null; setOffset(null)
          if (!disabled && Math.hypot(e.clientX - g.x, e.clientY - g.y) >= 2) move(g.id, (e.clientX - g.x) / g.width, (e.clientY - g.y) / g.height)
        },
        onPointerCancel: () => { gesture.current = null; setOffset(null) },
        onLostPointerCapture: () => { gesture.current = null; setOffset(null) },
        onKeyDown: (e: React.KeyboardEvent) => {
          const step = e.shiftKey ? .02 : .005
          const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
          if (delta[e.key] && !disabled && !gesture.current) { e.preventDefault(); move(object.id, ...delta[e.key]) }
          if (e.key === 'Escape') { gesture.current = null; setOffset(null) }
        },
      }
      if (object.kind === 'point') return <ellipse key={object.id} {...props} cx={c[0]} cy={c[1]} rx="9" ry="12" />
      if (object.kind === 'curve') return <path key={object.id} {...props} d={Array.from({ length: c.length / 2 }, (_, i) => `${i === 0 || object.breaks.includes(i) ? 'M' : 'L'}${c[2 * i]},${c[2 * i + 1]}`).join(' ')} fill="none" />
      return <rect key={object.id} {...props} x={Math.min(c[0], c[2])} y={Math.min(c[1], c[3])} width={Math.max(8, Math.abs(c[2] - c[0]))} height={Math.max(8, Math.abs(c[3] - c[1]))} />
    })}
  </svg>
}
