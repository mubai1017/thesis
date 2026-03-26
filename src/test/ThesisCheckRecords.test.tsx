import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
    render(<ThesisCheckRecords />)
    expect(screen.getByText('Thesis Check Records')).toBeInTheDocument()
  })

  it('shows guest notice when not logged in', () => {
    render(<ThesisCheckRecords />)
    expect(screen.getByText('guest mode')).toBeInTheDocument()
  })

  it('shows upload form when logged in', async () => {
    // Mock logged in state
    const { supabase } = require('../lib/supabase')
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: '1' } } })

    render(<ThesisCheckRecords />)

    // Should not show guest notice
    expect(screen.queryByText('guest mode')).not.toBeInTheDocument()

    // Should show upload form
    expect(screen.getByText('Upload Markdown File')).toBeInTheDocument()
  })

  it('displays error message when there is an error', async () => {
    const { supabase } = require('../lib/supabase')
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })
    supabase.from.mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({
          data: null,
          error: { message: 'Database connection failed' }
        }))
      }))
    })

    render(<ThesisCheckRecords />)

    // Should show error message
    expect(screen.getByText('Failed to load records: Database connection failed')).toBeInTheDocument()
  })
})