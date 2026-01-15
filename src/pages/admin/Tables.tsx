import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTables, getTable, createTable, createTablesBulk, deleteTable, updateAttendee, getUnassignedAttendees, assignAttendeesToTable, type Table, type Attendee } from '../../lib/api'

// Table layout based on floor plan - tables numbered by proximity to stage
// Row 1 (closest to stage): 3, 1, 2, 4
// Row 2: 5, 6, 7, 8
// etc.
const TABLE_LAYOUT = [
  { row: 1, tables: [3, 1, 2, 4], label: 'Front Row (VIP)' },
  { row: 2, tables: [5, 6, 7, 8], label: '' },
  { row: 3, tables: [9, 10, 11, 12], label: '' },
  { row: 4, tables: [13, 14, 15, 16], label: '' },
  { row: 5, tables: [17, 18, 19, 20], label: '' },
  { row: 6, tables: [21, 22, 23, 24], label: '' },
  { row: 7, tables: [25, 26, 27, 28], label: 'Back Row' },
]

export default function AdminTables() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<(Table & { attendees: Attendee[] }) | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTableName, setNewTableName] = useState('')
  const [bulkCount, setBulkCount] = useState(5)
  const [viewMode, setViewMode] = useState<'floor' | 'list'>('floor')

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [unassignedAttendees, setUnassignedAttendees] = useState<Attendee[]>([])
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<Set<string>>(new Set())
  const [loadingUnassigned, setLoadingUnassigned] = useState(false)

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

  const openAssignModal = async () => {
    setLoadingUnassigned(true)
    setShowAssignModal(true)
    setSelectedAttendeeIds(new Set())
    try {
      const attendees = await getUnassignedAttendees()
      setUnassignedAttendees(attendees)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingUnassigned(false)
    }
  }

  const toggleAttendeeSelection = (id: string) => {
    setSelectedAttendeeIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAssign = async () => {
    if (!selectedTable || selectedAttendeeIds.size === 0) return
    try {
      await assignAttendeesToTable(selectedTable.id, Array.from(selectedAttendeeIds))
      setShowAssignModal(false)
      viewTable(selectedTable.id)
      loadTables()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const availableSeats = selectedTable
    ? selectedTable.capacity - selectedTable.attendees.length
    : 0

  // Find table by number for floor plan view
  const getTableByNumber = (num: number): Table | undefined => {
    return tables.find(t => t.name === `Table ${num}`)
  }

  // Get fill color based on capacity
  const getTableColor = (table: Table | undefined) => {
    if (!table) return 'bg-gray-200 border-gray-300'
    const fillPercent = (table.current_count || 0) / table.capacity
    if (fillPercent >= 1) return 'bg-green-500 border-green-600 text-white'
    if (fillPercent > 0) return 'bg-amber-400 border-amber-500'
    return 'bg-white border-gray-300'
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-yckc-primary text-white py-4">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-white/80 hover:text-white">&larr; Back</Link>
            <h1 className="text-2xl font-bold">Tables</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('floor')}
              className={`px-3 py-1 rounded ${viewMode === 'floor' ? 'bg-white text-yckc-primary' : 'bg-white/20'}`}
            >
              Floor Plan
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-white text-yckc-primary' : 'bg-white/20'}`}
            >
              List View
            </button>
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

        {loading ? (
          <div className="card text-gray-500">Loading...</div>
        ) : viewMode === 'floor' ? (
          /* Floor Plan View */
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="card">
                {/* Stage/Risers */}
                <div className="bg-yckc-primary text-white text-center py-4 rounded-lg mb-8 font-semibold">
                  STAGE / RISERS
                </div>

                {/* Table rows */}
                <div className="space-y-6">
                  {TABLE_LAYOUT.map(row => (
                    <div key={row.row}>
                      {row.label && (
                        <div className="text-xs text-gray-500 text-center mb-2">{row.label}</div>
                      )}
                      <div className="flex justify-center gap-4">
                        {row.tables.map(num => {
                          const table = getTableByNumber(num)
                          return (
                            <button
                              key={num}
                              onClick={() => table && viewTable(table.id)}
                              className={`w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center transition-all hover:scale-105 ${getTableColor(table)} ${
                                selectedTable?.name === `Table ${num}` ? 'ring-4 ring-yckc-primary ring-offset-2' : ''
                              }`}
                              disabled={!table}
                            >
                              <span className="font-bold text-lg">{num}</span>
                              {table && (
                                <span className="text-xs">
                                  {table.current_count || 0}/{table.capacity}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-8 pt-4 border-t flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-300"></div>
                    <span>Empty</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-amber-500"></div>
                    <span>Partial</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-600"></div>
                    <span>Full</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-200 border-2 border-gray-300"></div>
                    <span>Not Created</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Detail Sidebar */}
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

                  {selectedTable.is_reserved && (
                    <div className="text-xs text-yckc-gold bg-yckc-gold/10 px-2 py-1 rounded mb-4 inline-block">
                      Reserved Table
                    </div>
                  )}

                  {availableSeats > 0 && (
                    <button
                      onClick={openAssignModal}
                      className="w-full mb-4 py-2 bg-gala-gold text-gala-navy rounded-lg font-medium hover:bg-gala-goldLight transition-colors"
                    >
                      + Assign Attendees ({availableSeats} seats available)
                    </button>
                  )}

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
        ) : (
          /* List View */
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {tables.length === 0 ? (
                <div className="card text-gray-500">No tables created yet</div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  {tables.map(table => (
                    <div
                      key={table.id}
                      onClick={() => viewTable(table.id)}
                      className={`card cursor-pointer hover:shadow-md transition-shadow ${
                        selectedTable?.id === table.id ? 'ring-2 ring-yckc-primary' : ''
                      } ${table.is_reserved ? 'border-yckc-gold border-2' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{table.name}</h3>
                          {table.is_reserved && (
                            <span className="text-xs text-yckc-gold">Reserved</span>
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

                  {availableSeats > 0 && (
                    <button
                      onClick={openAssignModal}
                      className="w-full mb-4 py-2 bg-gala-gold text-gala-navy rounded-lg font-medium hover:bg-gala-goldLight transition-colors"
                    >
                      + Assign Attendees ({availableSeats} seats available)
                    </button>
                  )}

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
        )}
      </main>

      {/* Assignment Modal */}
      {showAssignModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">Assign to {selectedTable.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {availableSeats} seat{availableSeats !== 1 ? 's' : ''} available
                  </p>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {loadingUnassigned ? (
                <p className="text-gray-500 text-center py-8">Loading unassigned attendees...</p>
              ) : unassignedAttendees.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No unassigned attendees</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-4">
                    Select attendees to assign ({selectedAttendeeIds.size} selected, max {availableSeats})
                  </p>
                  {unassignedAttendees.map(attendee => (
                    <label
                      key={attendee.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAttendeeIds.has(attendee.id)
                          ? 'border-yckc-primary bg-yckc-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${
                        selectedAttendeeIds.size >= availableSeats && !selectedAttendeeIds.has(attendee.id)
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAttendeeIds.has(attendee.id)}
                        onChange={() => toggleAttendeeSelection(attendee.id)}
                        disabled={selectedAttendeeIds.size >= availableSeats && !selectedAttendeeIds.has(attendee.id)}
                        className="rounded text-yckc-primary focus:ring-yckc-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {attendee.name || <span className="text-orange-500">(Name not provided)</span>}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          Order: {attendee.order_name || attendee.order_email}
                        </div>
                        {attendee.dietary_restrictions && (
                          <div className="text-xs text-amber-600">
                            Dietary: {attendee.dietary_restrictions}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={selectedAttendeeIds.size === 0}
                className="flex-1 py-2 px-4 bg-yckc-primary text-white rounded-lg hover:bg-yckc-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign {selectedAttendeeIds.size > 0 ? `(${selectedAttendeeIds.size})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
