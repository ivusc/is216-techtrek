// "Add to cart" for the tracker, both ways:
// - Track: a copy of the opportunity flies in a curve into the Tracker icon (the sidebar on laptops,
//   the bottom bar on phones), the icon gives a bump and a "+1" floats up.
// - Untrack: the icon gives a little shake, a "−1" floats up, and a copy pops out of the icon and flies
//   back along the same curve into the card, which settles as it lands.
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

// a little "+1" or "−1" that floats up from the icon and fades
function popBadge(icon, text, className) {
  const box = icon.getBoundingClientRect()
  const badge = document.createElement('span')
  badge.textContent = text
  badge.className = className
  badge.setAttribute('aria-hidden', 'true')
  Object.assign(badge.style, { left: box.left + box.width / 2 + 'px', top: box.top + 'px' })
  document.body.appendChild(badge)
  badge
    .animate(
      [
        { transform: 'translate(-50%, 0) scale(0.6)', opacity: 0 },
        { transform: 'translate(-50%, -14px) scale(1.1)', opacity: 1, offset: 0.3 },
        { transform: 'translate(-50%, -30px) scale(1)', opacity: 0 }
      ],
      { duration: 900, easing: 'ease-out' }
    )
    .finished.then(() => badge.remove())
}

// tracked: the icon bumps and a "+1" floats up from it
export function bumpTracker() {
  const icon = trackerIcon()
  if (!icon?.animate) return
  icon.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.45) rotate(-8deg)' }, { transform: 'scale(0.9)' }, { transform: 'scale(1)' }],
    { duration: 450, easing: 'ease-out' }
  )
  if (!reducedMotion()) popBadge(icon, '+1', 'tracker-plus-one')
}

// untracked: the icon gives a little "no" shake and a "−1" floats up from it
export function shakeTracker() {
  const icon = trackerIcon()
  if (!icon?.animate) return
  icon.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-4px) rotate(-6deg)' },
      { transform: 'translateX(4px) rotate(6deg)' },
      { transform: 'translateX(-2px)' },
      { transform: 'translateX(0)' }
    ],
    { duration: 400, easing: 'ease-in-out' }
  )
  if (!reducedMotion()) popBadge(icon, '−1', 'tracker-plus-one tracker-minus-one')
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

// a copy of the card, laid over the card in the same place and size
function makeGhost(card) {
  const box = card.getBoundingClientRect()
  const ghost = card.cloneNode(true)
  ghost.setAttribute('aria-hidden', 'true')
  ghost.classList.add('tracker-flight')
  // !important because the card's own classes (Bootstrap's h-100 is "height: 100% !important")
  // would otherwise stretch the copy
  for (const [name, value] of [['left', box.left], ['top', box.top], ['width', box.width], ['height', box.height]]) {
    ghost.style.setProperty(name, value + 'px', 'important')
  }
  document.body.appendChild(ghost)
  return { ghost, box }
}

// the flight from the card into the icon: the copy's centre follows the curve and it shrinks to a dot.
// Played backwards, it is the trip from the icon back into the card.
function flightKeyframes(cardBox, iconBox) {
  const start = { x: cardBox.left + cardBox.width / 2, y: cardBox.top + cardBox.height / 2 }
  const end = { x: iconBox.left + iconBox.width / 2, y: iconBox.top + iconBox.height / 2 }
  const keyframes = arc(start, end, 10).map((point) => ({
    transform: `translate(${point.x - start.x}px, ${point.y - start.y}px) scale(${1 - point.t * 0.94}) rotate(${point.t * -12}deg)`,
    opacity: point.t < 0.85 ? 1 : 0.6,
    borderRadius: 12 + point.t * 40 + 'px',
    offset: point.t
  }))
  // a little "lift off" first, like picking the card up
  keyframes.splice(1, 0, { transform: 'translate(0, -6px) scale(1.04)', opacity: 1, borderRadius: '12px', offset: 0.06 })
  return keyframes
}

function canFly(card, icon) {
  return Boolean(card && icon && card.animate) && !reducedMotion()
}

// Track: a copy of the card (or row, or panel) flies into the Tracker icon
export function flyToTracker(card) {
  const icon = trackerIcon()
  if (!canFly(card, icon)) {
    bumpTracker()
    return
  }
  const { ghost, box } = makeGhost(card)
  ghost
    .animate(flightKeyframes(box, icon.getBoundingClientRect()), { duration: FLIGHT_MS, easing: 'cubic-bezier(0.5, 0, 0.75, 0.5)' })
    .finished.then(() => {
      ghost.remove()
      bumpTracker()
    })
}

// Untrack: the icon shakes, then a copy pops out of it and flies back along the same curve into the card
export function flyFromTracker(card) {
  const icon = trackerIcon()
  shakeTracker()
  if (!canFly(card, icon)) return

  const { ghost, box } = makeGhost(card)
  ghost
    .animate(flightKeyframes(box, icon.getBoundingClientRect()), {
      duration: FLIGHT_MS,
      delay: 150, // after the shake has started
      direction: 'reverse', // icon -> card
      easing: 'cubic-bezier(0.25, 0.5, 0.5, 1)',
      fill: 'backwards' // sit at the icon (tiny) during the delay, not over the card
    })
    .finished.then(() => {
      ghost.remove()
      // the card settles as the copy lands back in it
      card.animate([{ transform: 'scale(0.97)' }, { transform: 'scale(1.01)' }, { transform: 'scale(1)' }], {
        duration: 300,
        easing: 'ease-out'
      })
    })
}
