import React, { useState, useEffect } from 'react'
import { HelpCircle, X, Info } from 'lucide-react'

export default function HelpTooltip({ text, title, inverted = false, className = "" }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const buttonStyle = inverted
    ? "text-primary-foreground/80 hover:text-white hover:bg-white/20 active:bg-white/30"
    : "text-muted-foreground hover:text-primary hover:bg-primary/10 dark:text-muted-foreground/80 dark:hover:text-primary dark:hover:bg-primary/10"

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-center p-1 rounded-full transition-all outline-none cursor-pointer active:scale-95 ${buttonStyle} ${className}`}
        aria-label="Ayuda"
        title="Ver información"
      >
        <HelpCircle className="w-5 h-5 shrink-0" />
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-slate-900 text-slate-100 p-6 rounded-3xl shadow-2xl border border-slate-700/80 w-full max-w-sm animate-in zoom-in-95 duration-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-primary to-indigo-500" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2.5 font-bold text-base text-slate-100">
                <div className="p-1.5 rounded-full bg-primary/20 text-primary">
                  <Info className="w-4 h-4" />
                </div>
                <span>{title || "Información del Módulo"}</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-normal">{text}</p>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
