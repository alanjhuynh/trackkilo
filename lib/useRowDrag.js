import { useEffect, useRef, useState } from 'react';

const EDGE = 40; // px from the scroll container's edge where dragging starts scrolling it
const SCROLL_STEP = 10; // px per frame

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function scrollParent(el) {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
}

/*
 * Pointer-driven reordering for a vertical list of equal-height rows. Works with
 * mouse, touch and pen. The dragged row follows the pointer, the rows it passes
 * slide out of its way, and `onMove(from, to)` runs once, on release. Dragging
 * near the top or bottom of the scroll container scrolls it.
 *
 * Rows need `data-drag-row`; spread `handleProps(index)` on each row's handle
 * and `style={rowStyle(index)}` on each row.
 */
export default function useRowDrag({ count, onMove }) {
  const [drag, setDrag] = useState(null); // { from, to, offset, slot }
  const session = useRef(null);

  useEffect(() => () => cancelAnimationFrame(session.current?.frame), []);

  const update = () => {
    const s = session.current;
    const scrolled = s.scroller ? s.scroller.scrollTop - s.startScroll : 0;
    // Keep the row inside the list so it can't stretch the scroll area
    const offset = clamp(s.y - s.startY + scrolled, -s.from * s.slot, (count - 1 - s.from) * s.slot);
    s.to = clamp(s.from + Math.round(offset / s.slot), 0, count - 1);
    setDrag({ from: s.from, to: s.to, offset, slot: s.slot });
  };

  const autoScroll = () => {
    const s = session.current;
    if (!s) return;
    const rect = s.scroller.getBoundingClientRect();
    let delta = 0;
    if (s.y < rect.top + EDGE) delta = -SCROLL_STEP;
    else if (s.y > rect.bottom - EDGE) delta = SCROLL_STEP;
    if (delta) {
      const before = s.scroller.scrollTop;
      s.scroller.scrollTop += delta;
      if (s.scroller.scrollTop !== before) update();
    }
    s.frame = requestAnimationFrame(autoScroll);
  };

  const finish = (commit) => () => {
    const s = session.current;
    if (!s) return;
    cancelAnimationFrame(s.frame);
    session.current = null;
    setDrag(null);
    if (commit && s.to !== s.from) onMove(s.from, s.to);
  };

  const handleProps = (index) => ({
    onPointerDown: (e) => {
      if (count < 2 || e.button !== 0 || session.current) return;
      const row = e.currentTarget.closest('[data-drag-row]');
      const rows = row.parentElement.querySelectorAll('[data-drag-row]');
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const scroller = scrollParent(row);
      session.current = {
        from: index,
        to: index,
        startY: e.clientY,
        y: e.clientY,
        slot: rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : row.offsetHeight,
        scroller,
        startScroll: scroller?.scrollTop || 0,
        frame: null,
      };
      if (scroller) session.current.frame = requestAnimationFrame(autoScroll);
      setDrag({ from: index, to: index, offset: 0, slot: session.current.slot });
    },
    onPointerMove: (e) => {
      if (!session.current) return;
      session.current.y = e.clientY;
      update();
    },
    onPointerUp: finish(true),
    onPointerCancel: finish(false),
    onLostPointerCapture: finish(true),
  });

  const rowStyle = (index) => {
    if (!drag) return undefined;
    const { from, to, offset, slot } = drag;
    if (index === from) return { transform: `translateY(${offset}px)` };
    if (from < index && index <= to) return { transform: `translateY(${-slot}px)` };
    if (to <= index && index < from) return { transform: `translateY(${slot}px)` };
    return undefined;
  };

  return { dragging: drag?.from ?? null, handleProps, rowStyle };
}
