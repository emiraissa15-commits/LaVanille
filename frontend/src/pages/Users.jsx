import React, { useState, useEffect } from 'react'
import api from '../api'
import { UserPlus, Shield, Ban, RotateCcw } from 'lucide-react'

const emptyUser = {
  username: '', email: '', password: '', first_name: '', last_name: '', phone: '',
  role: 'INTERNAL_AUDITOR', access_level: 'Total', language: 'Francais', account_expiration: '',
}

const roleLabel = (r) => ({
  ADMIN: 'Administrateur',
  COORDINATOR_SCI: 'Coordinateur SCI',
  INTERNAL_AUDITOR: 'Auditeur interne',
  COLLECTION_MANAGER: 'Responsable collecte',
  TRANSFORMATION_MANAGER: 'Responsable transformation',
  STOCK_MANAGER: 'Responsable stock',
  EXTERNAL_AUDITOR: 'Auditeur externe',
}[r] || r)

const accessBadge = (a) => ({
  Total: 'bg-green-100 text-green-700',
  Limite: 'bg-amber-100 text-amber-700',
  'Lecture seule': 'bg-gray-100 text-gray-700',
}[a] || 'bg-gray-100 text-gray-700')

const Users = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyUser)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api.get('/users/?include_inactive=true')
      setUsers(res.data)
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyUser)
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditingId(u.id)
    setForm({
      username: u.username, email: u.email, password: '', first_name: u.first_name || '', last_name: u.last_name || '',
      phone: u.phone || '', role: u.role, access_level: u.access_level, language: u.language,
      account_expiration: u.account_expiration ? u.account_expiration.slice(0, 10) : '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        const payload = {
          email: form.email, role: form.role, first_name: form.first_name, last_name: form.last_name,
          phone: form.phone, access_level: form.access_level, language: form.language,
          account_expiration: form.account_expiration || null,
        }
        if (form.password) payload.password = form.password
        await api.put(`/users/${editingId}`, payload)
      } else {
        await api.post('/users/', {
          username: form.username, email: form.email, password: form.password,
          first_name: form.first_name, last_name: form.last_name, phone: form.phone,
          role: form.role, access_level: form.access_level, language: form.language,
          account_expiration: form.account_expiration || null,
        })
      }
      setShowModal(false)
      setForm(emptyUser)
      fetchData()
    } catch (error) {
      alert("Erreur : " + (error.response?.data?.detail || 'vérifiez les champs.'))
    }
  }

  const toggleActive = async (u) => {
    if (u.id === currentUser.id) { alert('Vous ne pouvez pas désactiver votre propre compte.'); return }
    try {
      await api.put(`/users/${u.id}/${u.is_active ? 'deactivate' : 'reactivate'}`)
      fetchData()
    } catch (error) {
      alert("Erreur : " + (error.response?.data?.detail || ''))
    }
  }

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">17. Utilisateurs &amp; Droits</h2>
          <p className="text-gray-500">Comptes, rôles et niveaux d'accès (réservé aux administrateurs)</p>
        </div>
        <button onClick={openCreate} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg shadow-primary-100">
          <UserPlus size={20} /><span>Nouvel utilisateur</span>
        </button>
      </header>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-gray-800">{editingId ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input type="text" className="w-full border rounded-lg p-2" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input type="text" className="w-full border rounded-lg p-2" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur *</label>
                  <input type="text" required disabled={!!editingId} className="w-full border rounded-lg p-2 disabled:bg-gray-100" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" required className="w-full border rounded-lg p-2" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input type="text" className="w-full border rounded-lg p-2" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{editingId ? 'Nouveau mot de passe' : 'Mot de passe *'}</label>
                  <input type="password" required={!editingId} placeholder={editingId ? 'Laisser vide pour ne pas changer' : ''} className="w-full border rounded-lg p-2" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
                <select required className="w-full border rounded-lg p-2" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="ADMIN">Administrateur</option>
                  <option value="COORDINATOR_SCI">Coordinateur SCI</option>
                  <option value="INTERNAL_AUDITOR">Auditeur interne</option>
                  <option value="COLLECTION_MANAGER">Responsable collecte</option>
                  <option value="TRANSFORMATION_MANAGER">Responsable transformation</option>
                  <option value="STOCK_MANAGER">Responsable stock</option>
                  <option value="EXTERNAL_AUDITOR">Auditeur externe</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Niveau d'accès</label>
                  <select className="w-full border rounded-lg p-2" value={form.access_level} onChange={e => setForm({ ...form, access_level: e.target.value })}>
                    <option value="Total">Total</option>
                    <option value="Limite">Limité</option>
                    <option value="Lecture seule">Lecture seule</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
                  <select className="w-full border rounded-lg p-2" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
                    <option value="Francais">Français</option>
                    <option value="Anglais">Anglais</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration du compte</label>
                <input type="date" className="w-full border rounded-lg p-2" value={form.account_expiration} onChange={e => setForm({ ...form, account_expiration: e.target.value })} />
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-600">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">{editingId ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">Code</th>
              <th className="px-6 py-3">Nom</th>
              <th className="px-6 py-3">Rôle</th>
              <th className="px-6 py-3">Accès</th>
              <th className="px-6 py-3">Dernière connexion</th>
              <th className="px-6 py-3">Statut</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Chargement...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Aucun utilisateur.</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-xs text-primary-600 font-bold">{u.code}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => openEdit(u)} className="text-left hover:underline">
                      <div className="font-bold text-gray-800">{u.first_name} {u.last_name}</div>
                      <div className="text-xs text-gray-500">{u.username} · {u.email}</div>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm flex items-center"><Shield size={14} className="mr-1 text-gray-400" />{roleLabel(u.role)}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${accessBadge(u.access_level)}`}>{u.access_level}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.last_login ? new Date(u.last_login).toLocaleString() : 'Jamais'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.is_active ? 'Actif' : 'Désactivé'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActive(u)} className={`flex items-center space-x-1 text-sm font-bold ${u.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}>
                      {u.is_active ? <><Ban size={14} /><span>Désactiver</span></> : <><RotateCcw size={14} /><span>Réactiver</span></>}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Users
