import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getUsers,
  inviteUser,
  updateUserRole,
  deleteUser,
  resetUserPassword,
  type UserListItem,
} from '../../lib/api'

export default function AdminUsers() {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteRole, setInviteRole] = useState<'edit' | 'view'>('view')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await getUsers()
      setUsers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await inviteUser(inviteEmail, invitePassword, inviteRole)
      setShowInvite(false)
      setInviteEmail('')
      setInvitePassword('')
      setInviteRole('view')
      loadUsers()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'edit' | 'view') => {
    try {
      await updateUserRole(userId, newRole)
      loadUsers()
    } catch (err: any) {
      alert('Failed: ' + err.message)
    }
  }

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return
    try {
      await deleteUser(userId)
      loadUsers()
    } catch (err: any) {
      alert('Failed: ' + err.message)
    }
  }

  const handleResetPassword = async (userId: string, email: string) => {
    const newPassword = prompt(`Enter new temporary password for ${email}:`)
    if (!newPassword) return
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }
    try {
      await resetUserPassword(userId, newPassword)
      alert('Password reset. User will be prompted to change it on next login.')
    } catch (err: any) {
      alert('Failed: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-yckc-primary text-white py-4">
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-white/80 hover:text-white">&larr; Back</Link>
            <h1 className="text-2xl font-bold">User Management</h1>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium"
          >
            + Invite User
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Invite Modal */}
        {showInvite && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Invite New User</h2>
              <form onSubmit={handleInvite} className="space-y-4">
                {error && (
                  <div className="bg-red-100 text-red-700 px-4 py-2 rounded">{error}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temporary Password
                  </label>
                  <input
                    type="text"
                    value={invitePassword}
                    onChange={e => setInvitePassword(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    minLength={8}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    User will be prompted to change this on first login
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as 'edit' | 'view')}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="view">View Only - Can view and download, cannot edit</option>
                    <option value="edit">Editor - Full access to all features</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInvite(false)}
                    className="flex-1 border border-gray-300 rounded-lg py-2 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-yckc-primary text-white rounded-lg py-2 font-medium disabled:opacity-50"
                  >
                    {saving ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="card">
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : users.length === 0 ? (
            <div className="text-gray-500">No users found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b">
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Last Login</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{user.email}</td>
                    <td className="py-3">
                      <select
                        value={user.role}
                        onChange={e => handleRoleChange(user.id, e.target.value as 'edit' | 'view')}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                      </select>
                    </td>
                    <td className="py-3">
                      {user.must_change_password ? (
                        <span className="text-orange-600 text-sm">Must change password</span>
                      ) : (
                        <span className="text-green-600 text-sm">Active</span>
                      )}
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleResetPassword(user.id, user.email)}
                        className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                      >
                        Reset PW
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.email)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <h3 className="font-medium text-gray-700 mb-2">Role Permissions:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Edit:</strong> Full access - can manage orders, attendees, tables, users, and all settings</li>
            <li><strong>View:</strong> Read-only - can view all data and download reports, but cannot make changes</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
