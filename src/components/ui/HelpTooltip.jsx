import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle, Info, X } from 'lucide-react'

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
    ? "text-white/80 hover:text-white hover:bg-white/20 active:bg-white/30"
    : "text-muted-foreground hover:text-primary hover:bg-primary/10 dark:text-muted-foreground dark:hover:text-primary"

  const openModal = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
  }

  const modalContent = isOpen ? (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
      onClick={closeModal}
    >
      <div 
        className="bg-slate-900 text-slate-100 p-5 rounded-3xl shadow-2xl border border-slate-700/80 w-full max-w-xs animate-in zoom-in-95 duration-150 relative overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-primary to-indigo-500" />

        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <span>{title || "Información"}</span>
          </div>
          <button 
            type="button" 
            onClick={closeModal} 
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-normal">{text}</p>
        
        <button
          type="button"
          onClick={closeModal}
          className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors text-center"
        >
          Cerrar
        </button>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`inline-flex items-center justify-center p-1 rounded-full transition-all outline-none cursor-pointer active:scale-95 ${buttonStyle} ${className}`}
        aria-label="Ayuda"
        title="Ver información"
      >
        <HelpCircle className="w-5 h-5 shrink-0" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  )
}
