import React, { useState, useRef, useEffect } from 'react'
import { HelpCircle, X, Info } from 'lucide-react'

export default function HelpTooltip({ text, title, inverted = false, className = "" }) {
  const [isOpen, setIsOpen] = useState(false)
  const tooltipRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  const buttonStyle = inverted
    ? "text-primary-foreground/80 hover:text-white hover:bg-white/20 active:bg-white/30"
    : "text-muted-foreground hover:text-primary hover:bg-primary/10 dark:text-muted-foreground/80 dark:hover:text-primary dark:hover:bg-primary/10"

  return (
    <span className={`inline-flex items-center ${className}`} ref={tooltipRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={`p-1 rounded-full transition-all outline-none cursor-pointer active:scale-95 ${buttonStyle}`}
        aria-label="Ayuda"
        title="Ver ayuda"
      >
        <HelpCircle className="w-5 h-5 shrink-0" />
      </button>

      {isOpen && (
        <>
          {/* Mobile Overlay Modal (guarantees NO clipping on phones) */}
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs sm:hidden animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          >
            <div 
              className="bg-slate-900 text-slate-100 p-5 rounded-3xl shadow-2xl border border-slate-700/80 w-full max-w-xs animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
                  <Info className="w-4 h-4 text-primary" />
                  <span>{title || "Información"}</span>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">{text}</p>
            </div>
          </div>

          {/* Desktop Hover Popover */}
          <div 
            className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 p-4 bg-slate-900 text-slate-100 text-xs leading-relaxed rounded-2xl shadow-2xl border border-slate-700/80 z-[100] animate-in fade-in zoom-in-95 duration-200"
            style={{ filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.35))' }}
          >
            {/* Arrow */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-slate-700/80" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[7px] border-x-transparent border-b-[7px] border-b-slate-900" />

            {title && (
              <div className="font-bold text-sm text-slate-100 mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span>{title}</span>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="text-slate-400 hover:text-white p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            
            <p className="text-slate-300 font-normal leading-relaxed">{text}</p>
          </div>
        </>
      )}
    </span>
  )
}
