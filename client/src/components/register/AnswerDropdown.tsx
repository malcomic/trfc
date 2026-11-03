import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { AnswerOption } from '../../content/signupQuestions'

/** Opens upward when there is less room than this below the button. */
const MIN_SPACE_BELOW = 300

/**
 * A select replacement whose options wrap onto two lines on small screens.
 * Follows the WAI-ARIA "select-only combobox" keyboard pattern.
 */
export default function AnswerDropdown({
  id,
  labelId,
  placeholder,
  options,
  value,
  onChange,
}: {
  id: string
  labelId: string
  placeholder: string
  options: AnswerOption[]
  value: string
  onChange: (value: string) => void
}) {
  const items: AnswerOption[] = [{ label: placeholder, value: '' }, ...options]
  const selectedIndex = Math.max(0, items.findIndex((item) => item.value === value))
  const selected = items[selectedIndex]

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(selectedIndex)
  const [dropUp, setDropUp] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = `${id}-list`
  const optionId = (index: number) => `${id}-opt-${index}`

  const openList = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      const below = window.innerHeight - rect.bottom
      setDropUp(below < MIN_SPACE_BELOW && rect.top > below)
    }
    setActive(selectedIndex)
    setOpen(true)
  }

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }

  const choose = (index: number) => {
    onChange(items[index].value)
    close()
  }

  useEffect(() => {
    if (!open) return
    listRef.current?.focus({ preventScroll: true })
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (open) document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [id, open, active])

  const onButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      openList()
    }
  }

  const onListKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const last = items.length - 1
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActive((i) => Math.min(i + 1, last))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        e.preventDefault()
        setActive(0)
        break
      case 'End':
        e.preventDefault()
        setActive(last)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        choose(active)
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
      case 'Tab':
        close(false)
        break
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const letter = e.key.toLowerCase()
          const next = items.findIndex((item, i) => i > active && item.label.toLowerCase().startsWith(letter))
          const wrapped = next >= 0 ? next : items.findIndex((item) => item.label.toLowerCase().startsWith(letter))
          if (wrapped >= 0) setActive(wrapped)
        }
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${labelId} ${id}`}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onButtonKeyDown}
        className={`w-full min-h-12 flex items-center gap-3 text-left bg-ash light:bg-smoke-light border font-barlow text-base py-3 pl-4 pr-3 cursor-pointer clip-angled transition-colors duration-200 outline-none focus-visible:border-gold ${
          open ? 'border-gold/60' : 'border-white/10 light:border-black/10 hover:border-gold/40'
        }`}
      >
        <span className={`flex-1 min-w-0 leading-snug ${value ? 'text-chalk light:text-chalk-light' : 'text-fog light:text-fog-light'}`}>
          {selected.label}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`flex-none text-fog light:text-fog-light transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={optionId(active)}
          onKeyDown={onListKeyDown}
          className={`absolute left-0 right-0 z-30 m-0 p-1 list-none max-h-72 overflow-y-auto overscroll-contain bg-ash light:bg-white border border-gold/40 shadow-2xl outline-none ${
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {items.map((item, index) => {
            const isSelected = index === selectedIndex
            const isActive = index === active
            return (
              <li
                key={item.value || 'none'}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(index)}
                onMouseMove={() => setActive(index)}
                className={`flex items-start gap-2 px-3 py-2.5 text-sm leading-snug cursor-pointer ${
                  isActive ? 'bg-gold/15' : ''
                } ${item.value ? 'text-chalk light:text-chalk-light' : 'text-fog light:text-fog-light'} ${isSelected ? 'font-semibold' : ''}`}
              >
                <span className="flex-1 min-w-0">{item.label}</span>
                {isSelected && item.value && <Check size={14} strokeWidth={3} aria-hidden="true" className="flex-none mt-0.5 text-gold" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
