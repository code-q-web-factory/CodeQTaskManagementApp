import type { ChatMessage } from '../types/chat'
import { ChatMessage as ChatMessageBubble } from './ChatMessage'

type ChatWindowProps = {
  messages: ChatMessage[]
}

export function ChatWindow({ messages }: ChatWindowProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
      {messages.length === 0 ? (
        <div className="h-full w-full flex items-center justify-center text-gray-500 text-sm">
          Start the conversation by sending a message.
        </div>
      ) : (
        messages.map((m) => <ChatMessageBubble key={m.id} message={m} />)
      )}
    </div>
  )
}


