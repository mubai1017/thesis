import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import ReactMarkdown from 'react-markdown'
import './ThesisCheckRecords.css'

type ThesisCheckRecord = Database['public']['Tables']['thesis_check_records']['Row']
type ThesisCheckInsert = Database['public']['Tables']['thesis_check_records']['Insert']

export default function ThesisCheckRecords() {
  const [records, setRecords] = useState<ThesisCheckRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPersonName, setSelectedPersonName] = useState<string | null>(null)
  const [personName, setPersonName] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<ThesisCheckRecord | null>(null)
  const [showModal, setShowModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check auth status and fetch records
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session?.user)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Fetch records on component mount
  useEffect(() => {
    fetchRecords()
  }, [])

  // Fetch all records, ordered by created_at desc
  const fetchRecords = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('thesis_check_records')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecords(data || [])
      // Auto-select first person after data loads
      if (data && data.length > 0) {
        const firstPerson = data[0].person_name
        setSelectedPersonName(firstPerson)
      }
    } catch (error: unknown) {
      const err = error as { message: string }
      setError(`Failed to load records: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Parse filename to extract person name (格式: 姓名_论文检查_日期.md)
  const parseFileName = (name: string): string => {
    const match = name.match(/^([^_]+)_论文检查_/)
    return match ? match[1] : name
  }

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Only accept .md files
    if (!file.name.endsWith('.md')) {
      alert('Please select a .md file')
      return
    }

    setSelectedFile(file)
    setFileName(file.name)
    setPersonName(parseFileName(file.name))

    // Read file content
    const text = await file.text()
    setFileContent(text)
  }

  // Upload record
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileName.trim() || !fileContent.trim()) {
      alert('Please select a file and ensure it has content')
      return
    }

    setLoading(true)
    try {
      const newRecord: ThesisCheckInsert = {
        person_name: personName.trim(),
        file_name: fileName.trim(),
        file_content: fileContent.trim()
      }

      const { error } = await supabase
        .from('thesis_check_records')
        .insert(newRecord)

      if (error) {
        if (error.code === '23505') {
          alert('A record with this filename already exists')
          return
        }
        throw error
      }

      // Reset form
      setFileName('')
      setPersonName('')
      setFileContent('')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      await fetchRecords()
      alert('Record uploaded successfully!')
    } catch (error: unknown) {
      const err = error as { message: string }
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Delete record
  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`Delete record: ${fileName}?`)) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('thesis_check_records')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Close modal if the deleted record is currently displayed
      if (selectedRecord?.id === id) {
        handleCloseModal()
      }

      await fetchRecords()
    } catch (error: unknown) {
      const err = error as { message: string }
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle expand - open modal with record content
  const handleExpand = (record: ThesisCheckRecord) => {
    setSelectedRecord(record)
    setShowModal(true)
  }

  // Handle close modal
  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedRecord(null)
  }

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        handleCloseModal()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showModal])

  // Get unique person names list (sorted alphabetically)
  const personNames = [...new Set(records.map(r => r.person_name))].sort()

  // Get records for selected person
  const selectedPersonRecords = selectedPersonName
    ? records.filter(r => r.person_name === selectedPersonName)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : []

  return (
    <div className="thesis-check-records">
      <h2>Thesis Check Records</h2>

      {/* Error display */}
      {error && (
        <div className="error-message" style={{
          background: '#fee',
          border: '1px solid #fca5a5',
          color: '#b91c1c',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem'
        }}>
          <strong>Error:</strong> {error}
          <br />
          <small>Please check your Supabase configuration in .env file</small>
        </div>
      )}

      {/* Guest notice */}
      {!isLoggedIn && (
        <div className="guest-notice">
          ℹ️ You are viewing in <strong>guest mode</strong>. Login to upload new records.
        </div>
      )}

      {/* Upload Form - Only for logged in users */}
      {isLoggedIn && (
        <div className="upload-section">
          <h3>Upload Markdown File</h3>
          <form onSubmit={handleUpload} className="upload-form">
          <div className="form-group">
            <label htmlFor="file-input">Select .md file</label>
            <input
              ref={fileInputRef}
              type="file"
              id="file-input"
              accept=".md"
              onChange={handleFileSelect}
              required
            />
            {selectedFile && (
              <div className="file-info">
                <strong>Selected:</strong> {selectedFile.name}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="person-name">Person Name (auto-filled from filename)</label>
            <input
              type="text"
              id="person-name"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="e.g., 陈钢"
              required
            />
            <small>Filename format: {`姓名_论文检查_日期.md`} (e.g., 陈钢_论文检查_20260324.md)</small>
          </div>

          <div className="form-group">
            <label>Preview Content</label>
            <div className="content-preview">
              {fileContent ? (
                <ReactMarkdown>{fileContent.substring(0, 500) + (fileContent.length > 500 ? '...' : '')}</ReactMarkdown>
              ) : (
                <span className="placeholder">No content loaded</span>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading || !fileContent}>
            {loading ? 'Uploading...' : 'Upload Record'}
          </button>
        </form>
      </div>
      )}

      {/* Two-column Layout */}
      {loading && records.length === 0 ? (
        <div className="empty-message">
          <p>Loading...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="empty-message">
          <p>
            {isLoggedIn
              ? 'No records yet. Upload a markdown file to get started.'
              : 'No records available.'}
          </p>
        </div>
      ) : (
        <div className="records-container">
          {/* Left: Person List */}
          <div className="person-list">
            <div className="person-list-header">
              <h3>People ({personNames.length})</h3>
            </div>
            <div className="person-list-items">
              {personNames.map(name => (
                <div
                  key={name}
                  className={`person-list-item ${selectedPersonName === name ? 'active' : ''}`}
                  onClick={() => setSelectedPersonName(name)}
                >
                  <span className="person-name-text">{name}</span>
                  <span className="person-count">
                    {records.filter(r => r.person_name === name).length}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Records Detail */}
          <div className="records-detail">
            {selectedPersonName ? (
              <>
                <div className="records-detail-header">
                  <h3>{selectedPersonName}'s Records ({selectedPersonRecords.length})</h3>
                </div>
                <div className="records-detail-content">
                  <div className="records-list">
                    {selectedPersonRecords.map((record) => (
                      <div
                        key={record.id}
                        className="record-item"
                      >
                        <div className="record-header">
                          <div className="record-info">
                            <span className="file-name">{record.file_name}</span>
                            <span className="date">
                              {new Date(record.created_at).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <div className="record-actions">
                            <button
                              className="expand-btn"
                              onClick={() => handleExpand(record)}
                            >
                              Expand
                            </button>
                            {isLoggedIn && (
                              <button
                                className="delete-btn"
                                onClick={() => handleDelete(record.id, record.file_name)}
                                disabled={loading}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-message">
                <p>Select a person from the left to view their records</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for displaying full content */}
      {showModal && selectedRecord && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedRecord.file_name}</h2>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <ReactMarkdown>{selectedRecord.file_content}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
