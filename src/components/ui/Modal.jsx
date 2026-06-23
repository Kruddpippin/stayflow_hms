import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div className="absolute inset-0 bg-ink-950/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div role="dialog" aria-modal="true"
            className={`relative w-full ${widths[size]} rounded-xl border border-ink-200 bg-white shadow-md max-h-[90vh] overflow-y-auto scrollbar-thin`}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15, ease: [.16, 1, .3, 1] }}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-200 bg-white px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors"><X size={16} /></button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
