import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminManager = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState('create'); // 'create' or 'edit'
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('admin');

  // Load admins list
  const loadAdmins = async () => {
    try {
      const response = await axios.get('/api/admin/administrators');
      if (response.data.admins) {
        setAdmins(response.data.admins);
      }
    } catch (err) {
      console.warn("API offline or error loading administrators");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setRole('admin');
    setFormMode('create');
    setEditingId(null);
  };

  const handleEdit = (adm) => {
    setName(adm.name);
    setEmail(adm.email);
    setPassword('');
    setRole(adm.role || 'admin');
    setFormMode('edit');
    setEditingId(adm.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet administrateur ?")) return;
    try {
      await axios.delete(`/api/admin/administrators/${id}`);
      setStatus({ type: 'success', message: 'Administrateur supprimé avec succès.' });
      loadAdmins();
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Erreur lors de la suppression.";
      setStatus({ type: 'error', message: errorMsg });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setStatus({ type: 'error', message: 'Le nom et l\'email sont obligatoires.' });
      return;
    }

    const payload = {
      id: formMode === 'edit' ? editingId : null,
      name: name.trim(),
      email: email.trim(),
      role
    };

    if (password) {
      payload.password = password;
    }

    try {
      const res = await axios.post('/api/admin/administrators', payload);
      setStatus({ type: 'success', message: res.data.message });
      loadAdmins();
      resetForm();
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Erreur lors de l'enregistrement.";
      setStatus({ type: 'error', message: errorMsg });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in" style={{ minHeight: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div className="glass-card p-5 rounded-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-extrabold t-text-heading">🔑 Gestion des Administrateurs</h2>
            <p className="t-text-secondary text-xs mt-0.5">Créer, modifier et attribuer des rôles administratifs ECOS</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Form */}
        <section className="lg:col-span-5">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-sm font-extrabold t-text-heading mb-4">
              {formMode === 'create' ? '➕ Nouvel Administrateur' : '✏️ Modifier l\'Administrateur'}
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Full Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] t-text-secondary font-semibold uppercase">Nom complet</label>
                <input
                  type="text"
                  placeholder="Ex: Pr. Sofia Alami"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input p-2.5 rounded-xl text-sm"
                  required
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] t-text-secondary font-semibold uppercase">Email académique</label>
                <input
                  type="email"
                  placeholder="ex: sofia.alami@um6ss.ma"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input p-2.5 rounded-xl text-sm"
                  required
                />
              </div>

              {/* Role select */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] t-text-secondary font-semibold uppercase">Rôle administratif</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="glass-input p-2.5 rounded-xl text-xs"
                >
                  <option value="admin">Administrateur Secondaire (admin)</option>
                  <option value="super_admin">Super Administrateur (super_admin)</option>
                </select>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] t-text-secondary font-semibold uppercase">
                  {formMode === 'create' ? 'Mot de passe' : 'Nouveau mot de passe (laisser vide pour conserver)'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={formMode === 'create' ? '••••••••' : 'Laisser vide pour conserver'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input p-2.5 pr-10 rounded-xl text-sm w-full"
                    required={formMode === 'create'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition focus:outline-none flex items-center justify-center"
                    title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M21 21l-18-18m18 18L3 3m18 18l-3-3m-9.75-9.75a3 3 0 003 3m5.176-5.176A10.478 10.478 0 0122.066 12c-1.292 4.337-5.31 7.5-10.066 7.5-1.258 0-2.468-.223-3.586-.63" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 mt-2">
                <button type="submit" className="flex-1 py-3 font-bold rounded-xl text-sm transition" style={{ background: 'var(--color-accent)', color: '#fff' }}>
                  {formMode === 'create' ? '🔑 Créer l\'Administrateur' : '💾 Enregistrer'}
                </button>
                {formMode === 'edit' && (
                  <button type="button" onClick={resetForm} className="px-5 border rounded-xl text-xs font-bold t-text-secondary transition" style={{ borderColor: 'var(--color-border)' }}>
                    Annuler
                  </button>
                )}
              </div>

              {status.message && (
                <div className="p-3 rounded-lg text-xs font-semibold" style={{
                  background: status.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                  color: status.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
                  border: `1px solid ${status.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`
                }}>
                  {status.message}
                </div>
              )}
            </form>
          </div>
        </section>

        {/* Right: List */}
        <section className="lg:col-span-7">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-sm font-extrabold t-text-heading mb-4">
              📋 Administrateurs ({admins.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 t-text-secondary text-sm">Chargement...</div>
            ) : (
              <div className="flex flex-col gap-3">
                {admins.map(adm => (
                  <div key={adm.id} className="p-4 border rounded-2xl transition hover:-translate-y-0.5" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)' }}>
                          🛡️
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold t-text-heading">{adm.name}</h4>
                            <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: adm.role === 'super_admin' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: adm.role === 'super_admin' ? '#DB2777' : '#3B82F6' }}>
                              {adm.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                            </span>
                          </div>
                          <p className="text-[11px] t-text-secondary mt-0.5">{adm.email}</p>
                        </div>
                      </div>

                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(adm)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center t-text-secondary hover:t-accent transition"
                          style={{ border: '1px solid var(--color-border)' }}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(adm.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center t-text-secondary hover:text-rose-500 transition"
                          style={{ border: '1px solid var(--color-border)' }}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminManager;
