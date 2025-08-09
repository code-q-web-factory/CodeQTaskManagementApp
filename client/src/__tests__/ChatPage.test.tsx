import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatPage from '../pages/ChatPage'

test('user can type and send a message', async () => {
  render(<ChatPage />)
  const input = screen.getByLabelText(/message input/i)
  await userEvent.type(input, 'Hello world')
  await userEvent.click(screen.getByRole('button', { name: /send/i }))
  expect(screen.getByText('Hello world')).toBeInTheDocument()
})


