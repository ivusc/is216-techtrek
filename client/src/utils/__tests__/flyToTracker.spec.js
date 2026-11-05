import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flyFromTracker, flyToTracker, trackerIcon } from '@/utils/flyToTracker';

// jsdom has no layout or element.animate, so give the elements a size and a fake animate()
function fakeAnimate() {
  return vi.fn(() => ({ finished: Promise.resolve() }));
}

function place(element, left, top, width, height) {
  element.getBoundingClientRect = () => ({ left, top, width, height, right: left + width, bottom: top + height });
  element.getClientRects = () => [{}];
}

let card;
let icon;

beforeEach(() => {
  document.body.innerHTML = `
    <a href="/tracker" id="hidden-link"><i></i></a>
    <a href="/tracker" id="sidebar-link"><i class="bi bi-clipboard-data"></i></a>
    <div id="card" class="opp-card">Frontend Intern</div>`;
  document.getElementById('hidden-link').getClientRects = () => []; // e.g. the bottom bar on a laptop
  place(document.getElementById('sidebar-link'), 10, 200, 40, 40);
  icon = document.querySelector('#sidebar-link i');
  place(icon, 20, 210, 20, 20);
  icon.animate = fakeAnimate();
  card = document.getElementById('card');
  place(card, 600, 400, 300, 200);
  card.animate = fakeAnimate();
  Element.prototype.animate = fakeAnimate();
  window.matchMedia = vi.fn(() => ({ matches: false }));
});

afterEach(() => {
  delete Element.prototype.animate;
  document.body.innerHTML = '';
});

describe('flyToTracker', () => {
  it('finds the Tracker icon that is on screen', () => {
    expect(trackerIcon()).toBe(icon);
  });

  it('flies a copy of the card along a curve into the Tracker icon, then bumps it with a +1', async () => {
    flyToTracker(card);

    const ghost = document.querySelector('.tracker-flight');
    expect(ghost.textContent).toBe('Frontend Intern');
    expect(ghost.getAttribute('aria-hidden')).toBe('true');
    expect(ghost.style.left).toBe('600px');

    const [keyframes, options] = ghost.animate.mock.calls[0];
    // it ends on the icon's centre (30, 220) from the card's centre (750, 500), shrunk right down
    expect(keyframes.at(-1).transform).toContain('translate(-720px, -280px)');
    expect(keyframes.at(-1).transform).toContain('scale(0.06');
    // the path bulges above both ends (a curve, not a straight line)
    expect(Math.min(...keyframes.map((frame) => Number(/translate\([^,]+, (-?[\d.]+)px/.exec(frame.transform)[1])))).toBeLessThan(-280);
    expect(options.duration).toBeGreaterThan(0);

    await Promise.resolve();
    await Promise.resolve();
    // landed: the copy is gone, the icon bumps, and a "+1" pops out of it (then removes itself too)
    expect(document.querySelector('.tracker-flight')).toBeNull();
    expect(icon.animate).toHaveBeenCalled();
    const animated = Element.prototype.animate.mock.contexts;
    expect(animated.some((element) => element.classList.contains('tracker-plus-one') && element.textContent === '+1')).toBe(true);
  });

  it('skips the flight for people who turn off motion, but still bumps the icon', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }));

    flyToTracker(card);

    expect(document.querySelector('.tracker-flight')).toBeNull();
    expect(icon.animate).toHaveBeenCalled();
    expect(Element.prototype.animate).not.toHaveBeenCalled(); // no flying copy, no "+1"
  });

  it('untracking shakes the icon with a −1, then flies a copy back out of the icon into the card', async () => {
    flyFromTracker(card);

    const [shake] = icon.animate.mock.calls[0];
    expect(shake.some((frame) => frame.transform.includes('translateX(-4px)'))).toBe(true);
    const animated = Element.prototype.animate.mock.contexts;
    expect(animated.some((element) => element.classList.contains('tracker-minus-one') && element.textContent === '−1')).toBe(true);

    const ghost = document.querySelector('.tracker-flight');
    const call = Element.prototype.animate.mock.contexts.indexOf(ghost);
    const [keyframes, options] = Element.prototype.animate.mock.calls[call];
    // the same path as tracking, played backwards: from the icon (tiny) to the card (full size)
    expect(options.direction).toBe('reverse');
    expect(keyframes.at(-1).transform).toContain('translate(-720px, -280px)');
    expect(keyframes[0].transform).toContain('scale(1)');

    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelector('.tracker-flight')).toBeNull();
    expect(card.animate).toHaveBeenCalled(); // the card settles as it lands
  });
});

