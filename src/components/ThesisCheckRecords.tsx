import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import type { User } from '@supabase/supabase-js'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './ThesisCheckRecords.css'

type ThesisCheckRecord = Database['public']['Tables']['thesis_check_records']['Row']
type ThesisCheckInsert = Database['public']['Tables']['thesis_check_records']['Insert']

interface ThesisCheckRecordsProps {
  user: User | null
}

export default function ThesisCheckRecords({ user }: ThesisCheckRecordsProps) {
  const [records, setRecords] = useState<ThesisCheckRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPersonName, setSelectedPersonName] = useState<string | null>(null)
  const [personName, setPersonName] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<ThesisCheckRecord | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [personColorMap, setPersonColorMap] = useState<Record<string, string>>({})

  const isLoggedIn = !!user

  // Fetch records on component mount
  useEffect(() => {
    fetchRecords()
  }, [])

  // Build person color map from records whenever records change
  useEffect(() => {
    const colorMap: Record<string, string> = {}
    records.forEach(record => {
      // Keep the color from the most recent record for each person
      // (records are already sorted by created_at desc)
      if (!colorMap[record.person_name]) {
        colorMap[record.person_name] = record.status_color || 'red'
      }
    })
    setPersonColorMap(colorMap)
  }, [records])

  // Auto-clear toast after 3 seconds
  useEffect(() => {
    if (!toastMessage) return

    const timer = setTimeout(() => {
      setToastMessage(null)
    }, 3000)

    return () => clearTimeout(timer)
  }, [toastMessage])

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
        file_content: fileContent.trim(),
        status_color: 'red' // 默认为红色
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
      setUploadSuccess(true)
      setToastMessage('记录上传成功！')
      setToastType('success')
    } catch (error: unknown) {
      const err = error as { message: string }
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Delete record - show custom confirmation first
  const confirmDelete = (id: string) => {
    setDeleteConfirmId(id)
  }

  const executeDelete = async (id: string, fileName: string) => {
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

      setDeleteConfirmId(null)
      setToastMessage(`记录 "${fileName}" 已删除`)
      setToastType('success')
      await fetchRecords()
    } catch (error: unknown) {
      const err = error as { message: string }
      setToastMessage(`删除失败: ${err.message}`)
      setToastType('error')
      setDeleteConfirmId(null)
    } finally {
      setLoading(false)
    }
  }

  const cancelDelete = () => {
    setDeleteConfirmId(null)
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

  // Update color for a person (updates their most recent record)
  const updatePersonColor = async (personName: string, newColor: string) => {
    if (!isLoggedIn) return

    // Find the most recent record for this person
    const mostRecentRecord = records
      .filter(r => r.person_name === personName)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    if (!mostRecentRecord) {
      alert('Cannot update color: no records found for this person')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('thesis_check_records')
        .update({ status_color: newColor })
        .eq('id', mostRecentRecord.id)

      if (error) throw error

      // Update local state
      setPersonColorMap(prev => ({ ...prev, [personName]: newColor }))
      setToastMessage(`颜色已更新为 ${getColorLabel(newColor)}`)
      setToastType('success')
    } catch (error: unknown) {
      const err = error as { message: string }
      alert(`更新颜色失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Get color label in Chinese
  const getColorLabel = (color: string): string => {
    const labels: Record<string, string> = {
      'red': '红色 (严重)',
      'orange': '橙色 (延迟)',
      'blue': '蓝色 (正常)',
      'green': '绿色 (完成)'
    }
    return labels[color] || color
  }

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
          ℹ️ You are viewing in <strong>guest mode</strong>. Login to upload new records and delete records.
        </div>
      )}

      {/* Upload Form - Only for logged in users and when showUploadForm is true */}
      {isLoggedIn && showUploadForm && (
        <div className="upload-section">
          <div className="upload-section-header">
            <h3>Upload Markdown File</h3>
            <button
              className="close-upload-btn"
              onClick={() => setShowUploadForm(false)}
            >
              ← 返回记录列表
            </button>
          </div>
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
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{fileContent.substring(0, 500) + (fileContent.length > 500 ? '...' : '')}</ReactMarkdown>
              ) : (
                <span className="placeholder">No content loaded</span>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading || !fileContent}>
            {loading ? 'Uploading...' : 'Upload Record'}
          </button>
        </form>
        {uploadSuccess && (
          <div className="upload-success-actions">
            <button
              className="back-to-records-btn"
              onClick={() => {
                setUploadSuccess(false)
                setShowUploadForm(false)
              }}
            >
              ← 返回记录列表
            </button>
          </div>
        )}
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
                  <div className="person-name-row">
                    <span className="person-name-text">{name}</span>
                    {isLoggedIn && (
                      <select
                        className="color-picker"
                        value={personColorMap[name] || 'red'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updatePersonColor(name, e.target.value)}
                      >
                        <option value="red">红色</option>
                        <option value="orange">橙色</option>
                        <option value="blue">蓝色</option>
                        <option value="green">绿色</option>
                      </select>
                    )}
                    <span
                      className={`color-badge color-${personColorMap[name] || 'red'}`}
                      title={getColorLabel(personColorMap[name] || 'red')}
                    >
                      ●
                    </span>
                  </div>
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
                  {isLoggedIn && !showUploadForm && (
                    <button
                      className="show-upload-btn"
                      onClick={() => setShowUploadForm(true)}
                    >
                      + Upload New Record
                    </button>
                  )}
                </div>
                <div className="records-detail-content">
                  <div className="records-list">
                    {selectedPersonRecords.map((record) => (
                      <div
                        key={record.id}
                        className="record-item"
                      >
                        <div className="record-main">
                          <div className="record-info">
                            <span className="file-name">{record.file_name}</span>
                            <span className="date">
                              {new Date(record.created_at).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <button
                            className="expand-btn"
                            onClick={() => handleExpand(record)}
                          >
                            Expand
                          </button>
                        </div>
                        {isLoggedIn && (
                          <div className="record-footer">
                            <button
                              className="delete-btn"
                              onClick={() => confirmDelete(record.id)}
                              disabled={loading}
                            >
                              Delete Record
                            </button>
                          </div>
                        )}
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
              <div className="markdown-scroll-container">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedRecord.file_content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast toast-${toastType}`}>
          {toastMessage}
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-modal">
            <h3>确认删除</h3>
            <p>确定要删除这条记录吗？此操作无法撤销。</p>
            <div className="delete-confirm-actions">
              <button
                className="cancel-btn"
                onClick={cancelDelete}
                disabled={loading}
              >
                取消
              </button>
              <button
                className="confirm-delete-btn"
                onClick={() => {
                  const record = records.find(r => r.id === deleteConfirmId)
                  if (record) {
                    executeDelete(record.id, record.file_name)
                  }
                }}
                disabled={loading}
              >
                {loading ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
