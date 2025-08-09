import { useState, useCallback, type FormEvent } from 'react'

type ChatInputProps = {
  onSend: (text: string) => void
  placeholder?: string
}

export function ChatInput({ onSend, placeholder = 'Type a message' }: ChatInputProps) {
  const [text, setText] = useState('')

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      const trimmed = text.trim()
      if (trimmed.length === 0) return
      onSend(trimmed)
      setText('')
    },
    [onSend, text],
  )

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 border-t border-gray-200">
      <input
        aria-label="Message input"
        className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
        disabled={text.trim().length === 0}
      >
        Send
      </button>
    </form>
  )
}


