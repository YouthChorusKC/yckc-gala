import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAttendees, getMissingNames, updateAttendee, getTables, type Attendee, type Table } from '../../lib/api'

export default function AdminAttendees() {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [showMissingOnly, setShowMissingOnly] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', dietary_restrictions: '', table_id: '' })

  useEffect(() => {
    loadData()
  }, [showMissingOnly])

  const loadData = async () => {
    try {
      setLoading(true)
      const [attendeeData, tableData] = await Promise.all([
        showMissingOnly ? getMissingNames() : getAttendees(),
        getTables()
      ])
      setAttendees(attendeeData)
      setTables(tableData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (attendee: Attendee) => {
    setEditingId(attendee.id)
    setEditForm({
      name: attendee.name || '',
      dietary_restrictions: attendee.dietary_restrictions || '',
      table_id: attendee.table_id || ''
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    await updateAttendee(editingId, editForm)
    setEditingId(null)
    loadData()
  }

  const missingCount = attendees.filter(a => !a.name).length

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-yckc-primary text-white py-4">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-white/80 hover:text-white">&larr; Back</Link>
            <h1 className="text-2xl font-bold">Attendees</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-6 flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showMissingOnly}
              onChange={e => setShowMissingOnly(e.target.checked)}
              className="rounded"
            />
            <span>Show only missing names</span>
          </label>

          {missingCount > 0 && (
            <span className="text-orange-600">
              {missingCount} names still needed
            </span>
          )}
        </div>

        <div className="card">
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : attendees.length === 0 ? (
            <div className="text-gray-500">
              {showMissingOnly ? 'All names collected!' : 'No attendees yet'}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Dietary</th>
                  <th className="pb-2">Table</th>
                  <th className="pb-2">Order Contact</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {attendees.map(attendee => (
                  <tr key={attendee.id} className="border-b last:border-0">
                    {editingId === attendee.id ? (
                      <>
                        <td className="py-2">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="border rounded px-2 py-1 w-full"
                            placeholder="Attendee name"
                            autoFocus
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            value={editForm.dietary_restrictions}
                            onChange={e => setEditForm({ ...editForm, dietary_restrictions: e.target.value })}
                            className="border rounded px-2 py-1 w-full"
                            placeholder="None"
                          />
                        </td>
                        <td className="py-2">
                          <select
                            value={editForm.table_id}
                            onChange={e => setEditForm({ ...editForm, table_id: e.target.value })}
                            className="border rounded px-2 py-1"
                          >
                            <option value="">Unassigned</option>
                            {tables.map(table => (
                              <option key={table.id} value={table.id}>
                                {table.name} ({table.current_count}/{table.capacity})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 text-sm text-gray-500">
                          {attendee.order_email}
                        </td>
                        <td className="py-2">
                          <button onClick={saveEdit} className="text-green-600 mr-2">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={`py-2 ${!attendee.name ? 'text-orange-600' : ''}`}>
                          {attendee.name || '(Name needed)'}
                        </td>
                        <td className="py-2 text-sm text-gray-600">
                          {attendee.dietary_restrictions || '-'}
                        </td>
                        <td className="py-2 text-sm">
                          {attendee.table_name || <span className="text-gray-400">Unassigned</span>}
                        </td>
                        <td className="py-2 text-sm text-gray-500">
                          {attendee.order_name && <div>{attendee.order_name}</div>}
                          <div>{attendee.order_email}</div>
                        </td>
                        <td className="py-2">
                          <button onClick={() => startEdit(attendee)} className="text-yckc-primary hover:underline text-sm">
                            Edit
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
