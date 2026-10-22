export function reactionFor(result) {
  const hands = result.gestures || [];
  const names = hands.map(h => h[0]?.score >= .75 ? h[0].categoryName : 'None');
  if (names.length === 2) {
    if (names.every(n => n === 'Thumb_Down')) return 'rain';
    if (names.every(n => n === 'Thumb_Up')) return 'fireworks';
    if (names.every(n => n === 'Victory')) return 'confetti';
    // Heart heuristic: two index tips and two thumb tips meet, with a gap between pairs.
    const [a,b] = result.landmarks || [];
    if (a && b) {
      const d = (p,q) => Math.hypot(p.x-q.x,p.y-q.y);
      const scale = (d(a[0],a[9])+d(b[0],b[9]))/2;
      if (scale > .04 && d(a[8],b[8]) < scale*.45 && d(a[4],b[4]) < scale*.45 && d(a[8],a[4]) > scale*.45 && d(b[8],b[4]) > scale*.45) return 'hearts';
    }
  }
  if (names.includes('Thumb_Up')) return 'thumbs';
  if (names.includes('Victory')) return 'balloons';
  return null;
}
export class GestureGate {
  constructor() { this.reset(); this.last = -Infinity; }
  reset() { this.candidate = null; this.since = 0; this.latched = false; }
  update(name, now) {
    if (name !== this.candidate) { this.candidate = name; this.since = now; this.latched = false; }
    if (!name || this.latched || now-this.since < 800 || now-this.last < 3000) return null;
    this.last = now; this.latched = true; return name;
  }
}
