import React, { useState, useRef, useEffect } from 'react'
import { HelpCircle, X } from 'lucide-react'

export default function HelpTooltip({ text, title, className = "" }) {
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

  return (
    <span className={`relative inline-flex items-center ${className}`} ref={tooltipRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="p-1 rounded-full text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
        aria-label="Ayuda"
        title="Ver ayuda"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      {isOpen && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 p-3.5 bg-popover text-popover-foreground text-xs leading-relaxed rounded-2xl shadow-xl border border-border/80 z-[100] animate-in fade-in zoom-in-95 duration-200"
          style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.15))' }}
        >
          {/* Arrow */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-border" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[7px] border-x-transparent border-b-[7px] border-b-popover" />

          {title && (
            <div className="font-bold text-sm text-foreground mb-1 flex items-center justify-between">
              <span>{title}</span>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-muted-foreground hover:text-foreground p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          
          <p className="text-muted-foreground font-normal leading-normal">{text}</p>
        </div>
      )}
    </span>
  )
}
