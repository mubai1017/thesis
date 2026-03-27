import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { User } from '@supabase/supabase-js'
import ThesisCheckRecords from '../components/ThesisCheckRecords'

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ unsubscribe: vi.fn() }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }
}))

describe('ThesisCheckRecords', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
  })

  it('renders the title', () => {
    render(<ThesisCheckRecords user={null} />)
    expect(screen.getByText('Thesis Check Records')).toBeInTheDocument()
  })

  it('shows guest notice when not logged in', () => {
    render(<ThesisCheckRecords user={null} />)
    expect(screen.getByText('guest mode')).toBeInTheDocument()
  })

  it('shows upload form when logged in', async () => {
    const mockUser: User = { id: '1', email: 'test@test.com' } as User

    render(<ThesisCheckRecords user={mockUser} />)

    // Should not show guest notice
    expect(screen.queryByText('guest mode')).not.toBeInTheDocument()

    // Should show upload form
    expect(screen.getByText('Upload Markdown File')).toBeInTheDocument()
  })

  it('displays error message when there is an error', async () => {
    const { supabase } = await import('../lib/supabase')
    ;(supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({
          data: null,
          error: { message: 'Database connection failed' }
        }))
      }))
    })

    render(<ThesisCheckRecords user={null} />)

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load records:/)).toBeInTheDocument()
    })
  })
})