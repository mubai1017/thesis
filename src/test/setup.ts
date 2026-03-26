// Test setup file
import { vi } from 'vitest'

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: () => null
}))

// Mock CSS modules
vi.mock('../components/ThesisCheckRecords.css', () => ({}))
