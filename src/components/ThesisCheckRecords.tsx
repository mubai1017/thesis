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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [personName, setPersonName] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check auth status
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

  // Fetch all records, ordered by created_at desc
  const fetchRecords = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('thesis_check_records')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRecords(data || [])
    } catch (error: unknown) {
      const err = error as { message: string }
      alert(`Error fetching records: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

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

      await fetchRecords()
      if (expandedId === id) {
        setExpandedId(null)
      }
    } catch (error: unknown) {
      const err = error as { message: string }
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Group records by person_name
  const groupedRecords = records.reduce((acc, record) => {
    const name = record.person_name
    if (!acc[name]) {
      acc[name] = []
    }
    acc[name].push(record)
    return acc
  }, {} as Record<string, ThesisCheckRecord[]>)

  // Sort each group by created_at desc (already sorted globally, but ensuring)
  Object.keys(groupedRecords).forEach(name => {
    groupedRecords[name].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  })

  return (
    <div className="thesis-check-records">
      <h2>Thesis Check Records</h2>

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

      {/* Records List */}
      <div className="records-section">
        <h3>Records ({records.length} total)</h3>
        {loading && records.length === 0 ? (
          <p>Loading...</p>
        ) : records.length === 0 ? (
          <p className="empty-message">
            {isLoggedIn
              ? 'No records yet. Upload a markdown file to get started.'
              : 'No records available.'}
          </p>
        ) : (
          <div className="records-list">
            {Object.entries(groupedRecords).map(([personName, personRecords]) => (
              <div key={personName} className="person-group">
                <h4 className="person-name">{personName}</h4>
                <div className="records">
                  {personRecords.map((record, idx) => (
                    <div
                      key={record.id}
                      className={`record-item ${expandedId === record.id ? 'expanded' : ''}`}
                    >
                      <div
                        className="record-header"
                        onClick={() => setExpandedId(expandedId === record.id ? null : record.id!)}
                      >
                        <div className="record-info">
                          <span className="file-name">{record.file_name}</span>
                          <span className="date">
                            {new Date(record.created_at).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <div className="record-actions">
                          <button
                            className="expand-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedId(expandedId === record.id ? null : record.id!)
                            }}
                          >
                            {expandedId === record.id ? 'Collapse' : 'Expand'}
                          </button>
                          {isLoggedIn && (
                            <button
                              className="delete-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(record.id, record.file_name)
                              }}
                              disabled={loading}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {expandedId === record.id && (
                        <div className="record-content">
                          <ReactMarkdown>{record.file_content}</ReactMarkdown>
                        </div>
                      )}

                      {idx < personRecords.length - 1 && <div className="record-divider" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
