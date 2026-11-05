// "Add to cart" for the tracker: a copy of the opportunity flies in a curve into the Tracker icon
// (the sidebar on laptops, the bottom bar on phones), the icon gives a bump and a "+1" floats up.
// Built with element.animate() (the browser's Web Animations API), the same way the Quick pick deck did it.

const FLIGHT_MS = 700

// the Tracker link's icon; only the sidebar or the bottom bar is on screen at a time
export function trackerIcon() {
  const link = [...document.querySelectorAll('a[href="/tracker"]')].find((a) => a.getClientRects().length > 0)
  return link?.querySelector('i') ?? link ?? null
}

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

// the icon bumps, and a "+1" floats up from it and fades
export function bumpTracker() {
  const icon = trackerIcon()
  if (!icon?.animate) return
  icon.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.45) rotate(-8deg)' }, { transform: 'scale(0.9)' }, { transform: 'scale(1)' }],
    { duration: 450, easing: 'ease-out' }
  )
  if (reducedMotion()) return

  const box = icon.getBoundingClientRect()
  const plusOne = document.createElement('span')
  plusOne.textContent = '+1'
  plusOne.className = 'tracker-plus-one'
  plusOne.setAttribute('aria-hidden', 'true')
  Object.assign(plusOne.style, { left: box.left + box.width / 2 + 'px', top: box.top + 'px' })
  document.body.appendChild(plusOne)
  plusOne
    .animate(
      [
        { transform: 'translate(-50%, 0) scale(0.6)', opacity: 0 },
        { transform: 'translate(-50%, -14px) scale(1.1)', opacity: 1, offset: 0.3 },
        { transform: 'translate(-50%, -30px) scale(1)', opacity: 0 }
      ],
      { duration: 900, easing: 'ease-out' }
    )
    .finished.then(() => plusOne.remove())
}

// the points along a curve from `from` to `to` that bulges upwards, for the flight path
function arc(from, to, steps) {
  const lift = Math.min(160, Math.abs(to.x - from.x) * 0.35 + 60)
  const control = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift }
  const points = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    // a quadratic curve: start, bend towards `control`, end
    points.push({
      x: (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * control.x + t * t * to.x,
      y: (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * control.y + t * t * to.y,
      t
    })
  }
  return points
}

// source: the card (or row, or panel) being tracked. A copy of it flies to the Tracker icon.
export function flyToTracker(source) {
  const target = trackerIcon()
  if (!source || !target || !source.animate || reducedMotion()) {
    bumpTracker()
    return
  }

  const from = source.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  const ghost = source.cloneNode(true)
  ghost.setAttribute('aria-hidden', 'true')
  ghost.classList.add('tracker-flight')
  // the same place and size as the original. !important because the card's own classes
  // (Bootstrap's h-100 is "height: 100% !important") would otherwise stretch the copy
  for (const [name, value] of [['left', from.left], ['top', from.top], ['width', from.width], ['height', from.height]]) {
    ghost.style.setProperty(name, value + 'px', 'important')
  }
  document.body.appendChild(ghost)

  // move the copy's centre along the curve, shrinking it to a dot as it reaches the icon
  const start = { x: from.left + from.width / 2, y: from.top + from.height / 2 }
  const end = { x: to.left + to.width / 2, y: to.top + to.height / 2 }
  const keyframes = arc(start, end, 10).map((point) => ({
    transform: `translate(${point.x - start.x}px, ${point.y - start.y}px) scale(${1 - point.t * 0.94}) rotate(${point.t * -12}deg)`,
    opacity: point.t < 0.85 ? 1 : 0.6,
    borderRadius: 12 + point.t * 40 + 'px',
    offset: point.t
  }))
  // a little "lift off" first, like picking the card up
  keyframes.splice(1, 0, { transform: 'translate(0, -6px) scale(1.04)', opacity: 1, borderRadius: '12px', offset: 0.06 })

  ghost.animate(keyframes, { duration: FLIGHT_MS, easing: 'cubic-bezier(0.5, 0, 0.75, 0.5)' }).finished.then(() => {
    ghost.remove()
    bumpTracker()
  })
}
