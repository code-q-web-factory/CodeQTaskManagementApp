import { useCallback, useMemo, useState } from 'react'
import type { ChatMessage } from '../types/chat'
import { ChatWindow } from '../components/ChatWindow'
import { ChatInput } from '../components/ChatInput'

function createMessage(text: string, sender: ChatMessage['sender']): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text,
    sender,
    timestamp: Date.now(),
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const handleSend = useCallback((text: string) => {
    setMessages((prev) => [...prev, createMessage(text, 'user')])
  }, [])

  const header = useMemo(
    () => (
      <div className="border-b border-gray-200 px-4 py-3 bg-white">
        <h1 className="text-base font-semibold text-gray-900">Chat</h1>
        <p className="text-xs text-gray-500">Client-side only demo</p>
      </div>
    ),
    [],
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex h-screen max-w-2xl flex-col rounded-none sm:rounded-lg border border-gray-200 shadow-sm bg-white">
        {header}
        <ChatWindow messages={messages} />
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  )
}


