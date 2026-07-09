import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ExaminerManager = () => {
  const [examiners, setExaminers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState('create'); // 'create' or 'edit'
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('Dr');
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('');
  const [specialty, setSpecialty] = useState('');

  // Mock examiners for demo
  const mockExaminers = [];

  const loadExaminers = async () => {
    try {
      const response = await axios.get('/api/admin/stations');
      if (response.data.examiners) {
        setExaminers(response.data.examiners);
      } else {
        setExaminers(mockExaminers);
      }
    } catch (err) {
      console.warn("API offline, loading mock examiners");
      setExaminers(mockExaminers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExaminers();
  }, []);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setTitle('Dr');
    setGender('male');
    setAge('');
    setSpecialty('');
    setFormMode('create');
    setEditingId(null);
  };

  const handleEdit = (ex) => {
    setName(ex.name);
    setEmail(ex.email);
    setPassword('');
    setTitle(ex.title || 'Dr');
    setGender(ex.gender || 'male');
    setAge(ex.age ? String(ex.age) : '');
    setSpecialty(ex.specialty || '');
    setFormMode('edit');
    setEditingId(ex.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet examinateur ?")) return;
    try {
      await axios.delete(`/api/admin/examiners/${id}`);
      setStatus({ type: 'success', message: 'Examinateur supprimé avec succès.' });
      loadExaminers();
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
      title,
      gender,
      age: age ? parseInt(age) : null,
      specialty: specialty.trim(),
    };

    if (password) {
      payload.password = password;
    }

    try {
      const res = await axios.post('/api/admin/examiners', payload);
      setStatus({ type: 'success', message: res.data.message });
      loadExaminers();
      resetForm();
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Erreur lors de l'enregistrement de l'examinateur.";
      setStatus({ type: 'error', message: errorMsg });
    }
  };

  const getTitleLabel = (t) => {
    switch(t) {
      case 'Pr': return 'Professeur';
      case 'Dr': return 'Docteur';
      case 'Mme': return 'Madame';
      case 'Mr': return 'Monsieur';
      default: return t;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in" style={{ minHeight: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div className="glass-card p-5 rounded-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-extrabold t-text-heading">👥 Gestion des Examinateurs</h2>
            <p className="t-text-secondary text-xs mt-0.5">Créer, modifier et gérer les profils des examinateurs ECOS</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Form */}
        <section className="lg:col-span-5">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-sm font-extrabold t-text-heading mb-4">
              {formMode === 'create' ? '➕ Nouvel Examinateur' : '✏️ Modifier l\'Examinateur'}
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Title */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] t-text-secondary font-semibold uppercase">Titre</label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="glass-input p-2.5 rounded-xl text-xs"
                  >
                    <option value="Pr">Professeur (Pr)</option>
                    <option value="Dr">Docteur (Dr)</option>
                    <option value="Mme">Madame (Mme)</option>
                    <option value="Mr">Monsieur (Mr)</option>
                  </select>
                </div>

                {/* Gender */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] t-text-secondary font-semibold uppercase">Sexe</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="glass-input p-2.5 rounded-xl text-xs"
                  >
                    <option value="male">♂️ Masculin</option>
                    <option value="female">♀️ Féminin</option>
                  </select>
                </div>
              </div>

              {/* Full Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] t-text-secondary font-semibold uppercase">Nom complet</label>
                <input
                  type="text"
                  placeholder="Ex: Pr. Amine Bensaid"
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
                  placeholder="ex: amine.bensaid@um6ss.ma"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input p-2.5 rounded-xl text-sm"
                  required
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] t-text-secondary font-semibold uppercase">
                  {formMode === 'create' ? 'Mot de passe' : 'Nouveau mot de passe (laisser vide pour conserver)'}
                </label>
                <input
                  type="password"
                  placeholder={formMode === 'create' ? '••••••••' : 'Laisser vide pour conserver'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input p-2.5 rounded-xl text-sm"
                  required={formMode === 'create'}
                />
                {formMode === 'edit' && (
                  <span className="text-[9px] t-text-muted mt-0.5">Laissez vide pour ne pas modifier le mot de passe</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Age */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] t-text-secondary font-semibold uppercase">Âge</label>
                  <input
                    type="number"
                    min="25"
                    max="80"
                    placeholder="Ex: 42"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="glass-input p-2.5 rounded-xl text-xs"
                  />
                </div>

                {/* Specialty */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] t-text-secondary font-semibold uppercase">Spécialité</label>
                  <input
                    type="text"
                    placeholder="Ex: Endodontie"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="glass-input p-2.5 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 mt-2">
                <button type="submit" className="flex-1 py-3 font-bold rounded-xl text-sm transition" style={{ background: 'var(--color-accent)', color: '#fff' }}>
                  {formMode === 'create' ? '👤 Créer l\'Examinateur' : '💾 Enregistrer les Modifications'}
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
              📋 Examinateurs ({examiners.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 t-text-secondary text-sm">Chargement...</div>
            ) : examiners.length === 0 ? (
              <div className="text-center py-16 t-text-muted">
                <span className="text-3xl block mb-3">👥</span>
                <p className="text-sm font-medium">Aucun examinateur pour le moment</p>
                <p className="text-xs mt-1">Utilisez le formulaire pour créer le premier profil.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {examiners.map(ex => (
                  <div key={ex.id} className="p-4 border rounded-2xl transition hover:-translate-y-0.5" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: ex.gender === 'female' ? 'rgba(236, 72, 153, 0.15)' : 'var(--color-accent-bg)', color: ex.gender === 'female' ? '#DB2777' : 'var(--color-accent)' }}>
                          {ex.gender === 'female' ? '👩' : '👨'}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold t-text-heading">{getTitleLabel(ex.title)} {ex.name}</h4>
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold" style={{ background: '#0E7490', color: '#fff' }}>E</span>
                          </div>
                          <p className="text-[11px] t-text-secondary mt-0.5">{ex.email}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {ex.title && (
                              <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-text-secondary)' }}>
                                {getTitleLabel(ex.title)}
                              </span>
                            )}
                            {ex.specialty && (
                              <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)' }}>
                                {ex.specialty}
                              </span>
                            )}
                            {ex.age && (
                              <span className="text-[9px] px-2 py-0.5 rounded font-bold t-text-muted" style={{ background: 'var(--color-bg-alt)' }}>
                                {ex.age} ans
                              </span>
                            )}
                            <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: ex.gender === 'female' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: ex.gender === 'female' ? '#DB2777' : '#3B82F6' }}>
                              {ex.gender === 'female' ? '♀ Féminin' : '♂ Masculin'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(ex)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center t-text-secondary hover:t-accent transition"
                          style={{ border: '1px solid var(--color-border)' }}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(ex.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center t-text-secondary hover:text-rose-500 transition"
                          style={{ border: '1px solid var(--color-border)' }}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Reset password action */}
                    <div className="mt-3 pt-3 flex justify-end" style={{ borderTop: '1px solid var(--color-border)' }}>
                      <button
                        onClick={() => {
                          setEditingId(ex.id);
                          setEmail(ex.email);
                          setPassword('');
                          setFormMode('edit');
                          setStatus({ type: '', message: '' });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition t-text-secondary"
                        style={{ border: '1px solid var(--color-border)' }}
                      >
                        🔑 Réinitialiser le mot de passe
                      </button>
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

export default ExaminerManager;