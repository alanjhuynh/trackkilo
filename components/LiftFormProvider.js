import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import LiftFormModal from './LiftFormModal';
import { repeatPrefill } from '../lib/liftForm';

const LiftFormContext = createContext(null);

const isTyping = (element) =>
  element && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName));

// Owns the single add/edit lift modal so any component can open it
function LiftFormProvider({ children }) {
  const [form, setForm] = useState(null);
  const [show, setShow] = useState(false);
  const openCount = useRef(0);

  const open = useCallback((options) => {
    openCount.current += 1;
    setForm({ ...options, key: openCount.current });
    setShow(true);
  }, []);

  const value = useMemo(() => ({
    openNew: (prefill) => open({ mode: 'new', prefill }),
    openEdit: (lift) => open({ mode: 'edit', lift }),
    openRepeat: (lift) => open({ mode: 'new', prefill: repeatPrefill(lift) }),
  }), [open]);

  // "n" opens a new lift from anywhere
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'n' || e.metaKey || e.ctrlKey || e.altKey || show) return;
      if (isTyping(document.activeElement) || document.querySelector('.modal.show')) return;
      e.preventDefault();
      value.openNew();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [show, value]);

  return (
    <LiftFormContext.Provider value={value}>
      {children}
      <LiftFormModal
        form={form}
        show={show}
        onHide={() => setShow(false)}
        onExited={() => setForm(null)}
      />
    </LiftFormContext.Provider>
  );
}

const useLiftForm = () => useContext(LiftFormContext);

export { LiftFormProvider, useLiftForm };
