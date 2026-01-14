import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTables, getTable, createTable, createTablesBulk, deleteTable, updateAttendee, type Table, type Attendee } from '../../lib/api'

export default function AdminTables() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<(Table & { attendees: Attendee[] }) | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTableName, setNewTableName] = useState('')
  const [bulkCount, setBulkCount] = useState(5)

  useEffect(() => {
    loadTables()
  }, [])

  const loadTables = async () => {
    try {
      setLoading(true)
      const data = await getTables()
      setTables(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const viewTable = async (id: string) => {
    const data = await getTable(id)
    setSelectedTable(data)
  }

  const handleCreateTable = async () => {
    if (!newTableName.trim()) return
    await createTable({ name: newTableName })
    setNewTableName('')
    setShowCreateForm(false)
    loadTables()
  }

  const handleBulkCreate = async () => {
    await createTablesBulk(bulkCount)
    loadTables()
  }

  const handleDeleteTable = async (id: string) => {
    if (!confirm('Delete this table?')) return
    try {
      await deleteTable(id)
      loadTables()
      if (selectedTable?.id === id) setSelectedTable(null)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const removeFromTable = async (attendeeId: string) => {
    await updateAttendee(attendeeId, { table_id: null as any })
    if (selectedTable) viewTable(selectedTable.id)
    loadTables()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-yckc-primary text-white py-4">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-white/80 hover:text-white">&larr; Back</Link>
            <h1 className="text-2xl font-bold">Tables</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Create Options */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary text-sm"
          >
            + Add Table
          </button>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="50"
              value={bulkCount}
              onChange={e => setBulkCount(parseInt(e.target.value) || 1)}
              className="border rounded px-2 py-1 w-16"
            />
            <button onClick={handleBulkCreate} className="text-yckc-primary hover:underline text-sm">
              Bulk Create
            </button>
          </div>
        </div>

        {showCreateForm && (
          <div className="card mb-6 max-w-sm">
            <input
              type="text"
              value={newTableName}
              onChange={e => setNewTableName(e.target.value)}
              placeholder="Table name"
              className="border rounded px-3 py-2 w-full mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleCreateTable} className="btn-primary text-sm">Create</button>
              <button onClick={() => setShowCreateForm(false)} className="text-gray-500 text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Tables List */}
          <div className="md:col-span-2">
            {loading ? (
              <div className="card text-gray-500">Loading...</div>
            ) : tables.length === 0 ? (
              <div className="card text-gray-500">No tables created yet</div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {tables.map(table => (
                  <div
                    key={table.id}
                    onClick={() => viewTable(table.id)}
                    className={`card cursor-pointer hover:shadow-md transition-shadow ${
                      selectedTable?.id === table.id ? 'ring-2 ring-yckc-primary' : ''
                    } ${table.is_reserved ? 'border-yckc-secondary border-2' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{table.name}</h3>
                        {table.is_reserved && (
                          <span className="text-xs text-yckc-secondary">Reserved</span>
                        )}
                      </div>
                      <div className={`text-lg font-bold ${
                        (table.current_count || 0) >= table.capacity ? 'text-green-600' :
                        (table.current_count || 0) > 0 ? 'text-orange-500' : 'text-gray-400'
                      }`}>
                        {table.current_count || 0}/{table.capacity}
                      </div>
                    </div>

                    {/* Visual seats */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {[...Array(table.capacity)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-4 h-4 rounded-full ${
                            i < (table.current_count || 0) ? 'bg-yckc-primary' : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Table Detail */}
          <div>
            {selectedTable ? (
              <div className="card">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold">{selectedTable.name}</h2>
                  <button
                    onClick={() => handleDeleteTable(selectedTable.id)}
                    className="text-red-500 text-sm hover:underline"
                  >
                    Delete
                  </button>
                </div>

                <div className="text-sm text-gray-500 mb-4">
                  {selectedTable.attendees.length} / {selectedTable.capacity} seats filled
                </div>

                <h3 className="font-semibold mb-2">Seated Attendees</h3>
                {selectedTable.attendees.length === 0 ? (
                  <p className="text-gray-500 text-sm">No one assigned yet</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedTable.attendees.map(a => (
                      <li key={a.id} className="flex justify-between items-center text-sm">
                        <span>{a.name || <span className="text-orange-500">(Name needed)</span>}</span>
                        <button
                          onClick={() => removeFromTable(a.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          &times;
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {selectedTable.notes && (
                  <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                    <strong>Notes:</strong> {selectedTable.notes}
                  </div>
                )}
              </div>
            ) : (
              <div className="card text-gray-500 text-center py-8">
                Select a table to view details
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
