import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LEVEL_OPTIONS = [
  { value: '1', label: '1ère année' },
  { value: '2', label: '2ème année' },
  { value: '3', label: '3ème année' },
  { value: '4', label: '4ème année' },
  { value: '5', label: '5ème année' },
  { value: '6', label: '6ème année' },
  { value: 'résident', label: 'Résident' },
];

const getLevelLabel = (val) => {
  const opt = LEVEL_OPTIONS.find(o => o.value === val);
  return opt ? opt.label : val || '—';
};

const StudentManager = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [matricule, setMatricule] = useState('');
  const [gender, setGender] = useState('m');
  const [level, setLevel] = useState('5');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const loadStudents = async () => {
    try {
      const response = await axios.get('/api/admin/students');
      if (response.data.students) {
        setStudents(response.data.students);
      }
    } catch (err) {
      console.error('Erreur chargement étudiants:', err);
      setStatus({ type: 'error', message: 'Erreur lors du chargement des étudiants.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleDownloadExample = () => {
    const headers = "Nom;Email;Matricule;Sexe;Niveau\n";
    const sample = "Amina Laroui;amina@um6ss.ma;202988;f;5\nKarim Benali;karim@um6ss.ma;AB0099D12;m;résident\nSara Idrissi;sara@um6ss.ma;2029CC;f;3\n";
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "exemple_import_etudiants.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split("\n");
        if (lines.length < 2) {
          setStatus({ type: 'error', message: 'Le fichier est vide.' });
          return;
        }

        const studentsToImport = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = line.split(";").map(c => c.trim());

          const nameVal = cols[0] || '';
          const emailVal = cols[1] || '';
          const matriculeVal = cols[2] || '';
          const genderVal = cols[3] || 'm';
          const levelVal = cols[4] || '';

          if (nameVal && emailVal && matriculeVal) {
            const entry = {
              name: nameVal,
              email: emailVal,
              matricule: matriculeVal,
              gender: genderVal,
            };
            // Only include level if it's a valid value
            const validLevels = ['1', '2', '3', '4', '5', '6', 'résident', 'resident'];
            if (levelVal) {
              const normalized = levelVal.toLowerCase();
              if (normalized === 'resident' || normalized === 'résident') {
                entry.level = 'résident';
              } else if (validLevels.includes(normalized)) {
                entry.level = normalized;
              }
            }
            studentsToImport.push(entry);
          }
        }

        if (studentsToImport.length === 0) {
          setStatus({ type: 'error', message: 'Aucun candidat valide trouvé dans le fichier.' });
          return;
        }

        const response = await axios.post('/api/admin/students/import', {
          students: studentsToImport
        });

        setStatus({
          type: 'success',
          message: response.data.message
        });
        loadStudents();
      } catch (error) {
        const msg = error.response?.data?.message || 'Erreur lors de l\'importation du fichier CSV.';
        setStatus({ type: 'error', message: msg });
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setMatricule('');
    setGender('m');
    setLevel('5');
    setPassword('');
    setShowPassword(false);
    setFormMode('create');
    setEditingId(null);
  };

  const handleEdit = (s) => {
    setName(s.name);
    setEmail(s.email);
    setMatricule(s.matricule || '');
    setGender(s.gender || 'm');
    setLevel(s.level || '5');
    setPassword(''); // keep blank unless updating
    setFormMode('edit');
    setEditingId(s.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet étudiant ?")) return;
    try {
      await axios.delete(`/api/admin/students/${id}`);
      setStatus({ type: 'success', message: 'Étudiant supprimé avec succès.' });
      loadStudents();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la suppression.";
      setStatus({ type: 'error', message: msg });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !matricule.trim()) {
      setStatus({ type: 'error', message: 'Le nom, l\'email et le matricule sont obligatoires.' });
      return;
    }

    // Validate matricule is alphanumeric
    if (!/^[a-zA-Z0-9]+$/.test(matricule.trim())) {
      setStatus({ type: 'error', message: 'Le matricule ne doit contenir que des chiffres et/ou des lettres (pas d\'espaces ni de caractères spéciaux).' });
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        matricule: matricule.trim(),
        gender,
        level,
      };

      if (password) {
        payload.password = password;
      }

      if (formMode === 'edit') {
        payload.id = editingId;
      }

      const response = await axios.post('/api/admin/students', payload);

      setStatus({ type: 'success', message: response.data.message });
      resetForm();
      loadStudents();
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Erreur lors de l'enregistrement de l'étudiant.";
      setStatus({ type: 'error', message: errorMsg });
    }
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
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* CSV Import Panel */}
          <div className="glass-card p-5 rounded-2xl flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider t-accent">📥 Importation par lot</h3>
            <p className="text-[10px] t-text-secondary leading-relaxed">
              Importez une liste d'étudiants depuis un fichier CSV.<br/>
              Format : <strong>Nom;Email;Matricule;Sexe;Niveau</strong><br/>
              Niveaux acceptés : 1, 2, 3, 4, 5, 6, résident. Le mot de passe par défaut = matricule.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={handleDownloadExample}
                className="py-2 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-dashed border-gray-400 dark:border-gray-600 rounded-xl text-[10px] font-bold t-text-heading transition flex items-center justify-center gap-1.5"
              >
                📄 Exemple CSV
              </button>
              <label className="py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-center">
                📤 Importer CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportCsv}
                />
              </label>
            </div>
          </div>

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
                    <option value="m">♂️ Masculin</option>
                    <option value="f">♀️ Féminin</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] t-text-secondary font-semibold uppercase">Niveau</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="glass-input p-2.5 rounded-xl text-xs"
                  >
                    {LEVEL_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
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

              {/* Matricule */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] t-text-secondary font-semibold uppercase">Matricule</label>
                <input
                  type="text"
                  placeholder="Ex: 202988, AB00D12, 2029CC"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  className="glass-input p-2.5 rounded-xl text-sm font-mono"
                  required
                />
                <p className="text-[9px] t-text-muted mt-0.5">
                  Chiffres, lettres ou les deux.
                </p>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] t-text-secondary font-semibold uppercase">
                  {formMode === 'create' ? 'Mot de passe' : 'Modifier le mot de passe'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={formMode === 'create' ? "Par défaut : le matricule" : "Laisser vide pour ne pas modifier"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input p-2.5 pr-10 rounded-xl text-sm w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-sm focus:outline-none hover:opacity-80 active:scale-95 transition"
                    title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? "👁️" : "🙈"}
                  </button>
                </div>
                <p className="text-[9px] t-text-muted mt-0.5">
                  {formMode === 'create' 
                    ? "Si laissé vide, le matricule sera utilisé comme mot de passe." 
                    : "Laissez vide pour conserver le mot de passe actuel."}
                </p>
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
                <p className="text-xs mt-1">Utilisez le formulaire ou l'import CSV pour inscrire des étudiants.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {students.map(s => (
                  <div key={s.id} className="p-4 border rounded-2xl transition hover:-translate-y-0.5" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: s.gender === 'f' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(99, 102, 241, 0.15)', color: s.gender === 'f' ? '#DB2777' : '#6366F1' }}>
                          {s.gender === 'f' ? '👩' : '👨'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold t-text-heading">{s.name}</h4>
                          </div>
                          <p className="text-[11px] t-text-secondary mt-0.5 truncate">{s.email}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-[9px] px-2 py-0.5 rounded font-bold font-mono" style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)' }}>
                              #{s.matricule}
                            </span>
                            {s.level && (
                              <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-text-secondary)' }}>
                                📚 {getLevelLabel(s.level)}
                              </span>
                            )}
                            <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: s.gender === 'f' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: s.gender === 'f' ? '#DB2777' : '#3B82F6' }}>
                              {s.gender === 'f' ? '♀ Féminin' : '♂ Masculin'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => handleEdit(s)} className="w-8 h-8 rounded-lg flex items-center justify-center t-text-secondary hover:t-accent transition" style={{ border: '1px solid var(--color-border)' }} title="Modifier">✏️</button>
                        <button onClick={() => handleDelete(s.id)} className="w-8 h-8 rounded-lg flex items-center justify-center t-text-secondary hover:text-rose-500 transition" style={{ border: '1px solid var(--color-border)' }} title="Supprimer">🗑️</button>
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

export default StudentManager;