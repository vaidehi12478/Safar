import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const ToastContext = createContext(null)

const TOAST_ICONS = {
  success: '✅',
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  ride: '🚗',
}

const TOAST_COLORS = {
  success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
  info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  warning: { bg: '#fefce8', border: '#fde68a', text: '#854d0e' },
  error:   { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
  ride:    { bg: '#f0f9ff', border: '#7dd3fc', text: '#0c4a6e' },
}

function ToastItem({ toast, onDismiss }) {
  const colors = TOAST_COLORS[toast.variant] || TOAST_COLORS.info
  const icon = TOAST_ICONS[toast.variant] || TOAST_ICONS.info

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        borderRadius: '12px',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        boxShadow: '0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.06)',
        minWidth: '320px',
        maxWidth: '420px',
        animation: 'toastSlideIn 0.35s ease-out',
        cursor: 'pointer',
        position: 'relative',
      }}
      onClick={() => onDismiss(toast.id)}
      role="alert"
    >
      <span style={{ fontSize: '1.3rem', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.15rem' }}>
            {toast.title}
          </div>
        )}
        <div style={{ fontSize: '0.85rem', opacity: 0.9, lineHeight: 1.4 }}>
          {toast.message}
        </div>
      </div>
      <span
        style={{ fontSize: '1.1rem', opacity: 0.5, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id) }}
      >
        ✕
      </span>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id])
      delete timersRef.current[id]
    }
  }, [])

  const addToast = useCallback(({ title, message, variant = 'info', duration = 5000 }) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, title, message, variant }])

    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => {
        dismiss(id)
      }, duration)
    }

    return id
  }, [dismiss])

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout)
    }
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, dismiss }}>
      {children}

      {/* Toast container — fixed top-right */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: '1.25rem',
            right: '1.25rem',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
