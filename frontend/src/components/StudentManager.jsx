import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudentManager = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [matricule, setMatricule] = useState('');
  const [matriculeType, setMatriculeType] = useState('numeric'); // 'numeric' or 'alpha'
  const [level, setLevel] = useState('5ème année');
  const [group, setGroup] = useState('');
  const [gender, setGender] = useState('male');

  // Mock students for demo
  const mockStudents = [
    { id: 101, name: "Amina Laroui", email: "amina@um6ss.ma", matricule: "202988", matriculeType: "numeric", level: "5ème année", group: "Groupe A", gender: "female" },
    { id: 102, name: "Youssef Meziane", email: "youssef@um6ss.ma", matricule: "0044D12", matriculeType: "alpha", level: "6ème année", group: "Groupe B", gender: "male" },
    { id: 103, name: "Sarah Bennani", email: "sarah@um6ss.ma", matricule: "202989", matriculeType: "numeric", level: "5ème année", group: "Groupe A", gender: "female" },
    { id: 104, name: "Mehdi Sadiki", email: "mehdi@um6ss.ma", matricule: "0044D13", matriculeType: "alpha", level: "6ème année", group: "Groupe C", gender: "male" },
    { id: 105, name: "Laila Tazi", email: "laila@um6ss.ma", matricule: "202990", matriculeType: "numeric", level: "5ème année", group: "Groupe B", gender: "female" },
  ];

  useEffect(() => {
    // Try to load from API, fallback to mock
    try {
      // In real app, fetch from backend
      setStudents(mockStudents);
    } catch (err) {
      setStudents(mockStudents);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setMatricule('');
    setMatriculeType('numeric');
    setLevel('5ème année');
    setGroup('');
    setGender('male');
    setFormMode('create');
    setEditingId(null);
  };

  const handleEdit = (s) => {
    setName(s.name);
    setEmail(s.email);
    setPassword('');
    setMatricule(s.matricule);
    setMatriculeType(s.matriculeType || 'numeric');
    setLevel(s.level || '5ème année');
    setGroup(s.group || '');
    setGender(s.gender || 'male');
    setFormMode('edit');
    setEditingId(s.id);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Supprimer cet étudiant ?")) return;
    setStudents(students.filter(s => s.id !== id));
    setStatus({ type: 'success', message: 'Étudiant supprimé avec succès.' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !matricule.trim()) {
      setStatus({ type: 'error', message: 'Le nom, l\'email et le matricule sont obligatoires.' });
      return;
    }

    if (formMode === 'create') {
      const newStudent = {
        id: Date.now(),
        name: name.trim(),
        email: email.trim(),
        matricule: matricule.trim().toUpperCase(),
        matriculeType,
        level,
        group: group.trim(),
        gender,
      };
      setStudents([...students, newStudent]);
      setStatus({ type: 'success', message: `Étudiant "${name}" inscrit avec succès (Matricule: ${matricule.trim().toUpperCase()}).` });
    } else {
      setStudents(students.map(s =>
        s.id === editingId
          ? { ...s, name: name.trim(), email: email.trim(), matricule: matricule.trim().toUpperCase(), matriculeType, level, group: group.trim(), gender }
          : s
      ));
      setStatus({ type: 'success', message: `Étudiant "${name}" mis à jour.` });
    }
    resetForm();
  };

  const getMatriculePreview = () => {
    if (matriculeType === 'numeric') {
      return 'Ex: 292199, 202988, 201234';
    }
    return 'Ex: 0099D99, 0044D12, 0123A45';
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in" style={{ minHeight: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div className="glass-card p-5 rounded-2xl">
        <div>
          <h2 className="text-lg font-extrabold t-text-heading">🎓 Gestion des Étudiants</h2>
          <p className="t-text-secondary text-xs mt-0.5">Inscrire, modifier et gérer les profils des étudiants ECOS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Form */}
        <section className="lg:col-span-5">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-sm font-extrabold t-text-heading mb-4">
              {formMode === 'create' ? '➕ Nouvel Étudiant' : '✏️ Modifier l\'Étudiant'}
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Gender + Level */}
              <div className="grid grid-cols-2 gap-4">
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
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] t-text-secondary font-semibold uppercase">Niveau</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="glass-input p-2.5 rounded-xl text-xs"
                  >
                    <option value="4ème année">4ème Année</option>
                    <option value="5ème année">5ème Année</option>
                    <option value="6ème année">6ème Année</option>
                    <option value="Interne">Interne</option>
                    <option value="Résident">Résident</option>
                  </select>
                </div>
              </div>

              {/* Full Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] t-text-secondary font-semibold uppercase">Nom complet</label>
                <input
                  type="text"
                  placeholder="Ex: Amina Laroui"
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
                  placeholder="ex: amina.laroui@um6ss.ma"
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
              </div>

              {/* Matricule Type + Matricule */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] t-text-secondary font-semibold uppercase">Type Matricule</label>
                  <select
                    value={matriculeType}
                    onChange={(e) => setMatriculeType(e.target.value)}
                    className="glass-input p-2.5 rounded-xl text-xs"
                  >
                    <option value="numeric">Numérique (292199)</option>
                    <option value="alpha">Alphanumérique (0099D99)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] t-text-secondary font-semibold uppercase">Matricule</label>
                  <input
                    type="text"
                    placeholder={matriculeType === 'numeric' ? 'Ex: 292199' : 'Ex: 0099D99'}
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value)}
                    className="glass-input p-2.5 rounded-xl text-sm font-mono"
                    required
                  />
                </div>
              </div>
              <p className="text-[9px] t-text-muted -mt-2">{getMatriculePreview()}</p>

              {/* Group */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] t-text-secondary font-semibold uppercase">Groupe / Section</label>
                <input
                  type="text"
                  placeholder="Ex: Groupe A, Section 1"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="glass-input p-2.5 rounded-xl text-xs"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 mt-2">
                <button type="submit" className="flex-1 py-3 font-bold rounded-xl text-sm transition" style={{ background: 'var(--color-accent)', color: '#fff' }}>
                  {formMode === 'create' ? '🎓 Inscrire l\'Étudiant' : '💾 Enregistrer les Modifications'}
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
              📋 Étudiants Inscrits ({students.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 t-text-secondary text-sm">Chargement...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-16 t-text-muted">
                <span className="text-3xl block mb-3">🎓</span>
                <p className="text-sm font-medium">Aucun étudiant inscrit</p>
                <p className="text-xs mt-1">Utilisez le formulaire pour inscrire le premier étudiant.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {students.map(s => (
                  <div key={s.id} className="p-4 border rounded-2xl transition hover:-translate-y-0.5" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: s.gender === 'female' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(99, 102, 241, 0.15)', color: s.gender === 'female' ? '#DB2777' : '#6366F1' }}>
                          {s.gender === 'female' ? '👩' : '👨'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold t-text-heading">{s.name}</h4>
                            {s.matriculeType === 'alpha' && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>Alpha</span>
                            )}
                          </div>
                          <p className="text-[11px] t-text-secondary mt-0.5 truncate">{s.email}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-[9px] px-2 py-0.5 rounded font-bold font-mono" style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)' }}>
                              #{s.matricule}
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-text-secondary)' }}>
                              {s.level}
                            </span>
                            {s.group && (
                              <span className="text-[9px] px-2 py-0.5 rounded font-bold t-text-muted" style={{ background: 'var(--color-bg-alt)' }}>
                                {s.group}
                              </span>
                            )}
                            <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: s.gender === 'female' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: s.gender === 'female' ? '#DB2777' : '#3B82F6' }}>
                              {s.gender === 'female' ? '♀' : '♂'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => handleEdit(s)} className="w-8 h-8 rounded-lg flex items-center justify-center t-text-secondary hover:t-accent transition" style={{ border: '1px solid var(--color-border)' }} title="Modifier">✏️</button>
                        <button onClick={() => handleDelete(s.id)} className="w-8 h-8 rounded-lg flex items-center justify-center t-text-secondary hover:text-rose-500 transition" style={{ border: '1px solid var(--color-border)' }} title="Supprimer">🗑️</button>
                      </div>
                    </div>

                    {/* Reset password */}
                    <div className="mt-3 pt-3 flex justify-end" style={{ borderTop: '1px solid var(--color-border)' }}>
                      <button
                        onClick={() => {
                          handleEdit(s);
                          setPassword('');
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

export default StudentManager;