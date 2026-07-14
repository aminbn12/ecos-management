import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SettingsManager = () => {
  const [settings, setSettings] = useState({
    show_student_average: '0',
    allow_exam_deletion: '0',
    admin_exam_termination_code: '2026'
  });
  const [tempCode, setTempCode] = useState('2026');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const loadSettings = async () => {
    try {
      const res = await axios.get('/api/admin/settings');
      const loaded = res.data.settings;
      setSettings(prev => ({
        ...prev,
        ...loaded
      }));
      if (loaded.admin_exam_termination_code) {
        setTempCode(loaded.admin_exam_termination_code);
      }
    } catch (err) {
      console.warn("API settings offline, running offline demo settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggle = async (key) => {
    const newValue = settings[key] === '1' ? '0' : '1';
    
    // Optimistic UI update
    setSettings(prev => ({
      ...prev,
      [key]: newValue
    }));

    setSaving(true);
    setStatus({ type: '', message: '' });

    try {
      await axios.post('/api/admin/settings', {
        key: key,
        value: newValue
      });
      setStatus({ type: 'success', message: 'Paramètre mis à jour avec succès.' });
    } catch (err) {
      console.warn("API settings offline, updated locally for demo.");
      setStatus({ type: 'success', message: 'Mode Démo : Paramètre mis à jour localement.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCode = async (e) => {
    e.preventDefault();
    if (!tempCode.trim()) {
      setStatus({ type: 'error', message: 'Le code ne peut pas être vide.' });
      return;
    }
    setSaving(true);
    setStatus({ type: '', message: '' });
    try {
      await axios.post('/api/admin/settings', {
        key: 'admin_exam_termination_code',
        value: tempCode
      });
      setSettings(prev => ({ ...prev, admin_exam_termination_code: tempCode }));
      setStatus({ type: 'success', message: 'Code de confirmation mis à jour avec succès.' });
    } catch (err) {
      console.warn("API settings offline, updated locally for demo.");
      setSettings(prev => ({ ...prev, admin_exam_termination_code: tempCode }));
      setStatus({ type: 'success', message: 'Mode Démo : Code mis à jour localement.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}></div>
          <span className="text-sm font-medium t-text-secondary">Chargement des paramètres...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto flex flex-col gap-6 animate-fade-in" style={{ minHeight: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div className="glass-card p-5 rounded-2xl">
        <h2 className="text-lg font-extrabold t-text-heading">⚙️ Paramètres Généraux</h2>
        <p className="t-text-secondary text-xs mt-0.5">Configurer les options globales de l'examen et les autorisations d'affichage pour les candidats</p>
      </div>

      {status.message && (
        <div className="p-4 rounded-xl text-xs font-semibold animate-scale-up" style={{
          background: status.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
          color: status.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          border: `1px solid ${status.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`
        }}>
          {status.message}
        </div>
      )}

      {/* Settings Grid/List */}
      <div className="glass-card p-6 rounded-2xl flex flex-col gap-5 animate-scale-up">
        {/* Option 1: Show running average */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold t-text-heading">Affichage de la note moyenne aux candidats</span>
            <p className="text-xs t-text-secondary leading-relaxed">
              Permet aux étudiants de voir en temps réel leur note moyenne cumulée sur leur profil après chaque étape validée.
            </p>
          </div>
          
          <button
            onClick={() => handleToggle('show_student_average')}
            disabled={saving}
            className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 focus:outline-none flex items-center relative ${settings.show_student_average === '1' ? 'bg-purple-600' : 'bg-gray-400 dark:bg-gray-700'}`}
            aria-label="Toggle setting"
          >
            <span
              className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 block ${settings.show_student_average === '1' ? 'translate-x-6' : 'translate-x-0'}`}
            />
          </button>
        </div>

        {/* Option 2: Allow exam deletion */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold t-text-heading">Autoriser la suppression définitive des examens</span>
            <p className="text-xs t-text-secondary leading-relaxed">
              Permet aux administrateurs de supprimer définitivement un examen et tout son historique de notes depuis l'onglet Historique & Rapports.
            </p>
          </div>
          
          <button
            onClick={() => handleToggle('allow_exam_deletion')}
            disabled={saving}
            className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 focus:outline-none flex items-center relative ${settings.allow_exam_deletion === '1' ? 'bg-purple-600' : 'bg-gray-400 dark:bg-gray-700'}`}
            aria-label="Toggle setting"
          >
            <span
              className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 block ${settings.allow_exam_deletion === '1' ? 'translate-x-6' : 'translate-x-0'}`}
            />
          </button>
        </div>

        {/* Option 3: Admin confirmation code */}
        <div className="flex flex-col gap-3 pb-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold t-text-heading">Code secret d'administration</span>
            <p className="text-xs t-text-secondary leading-relaxed">
              Code de sécurité requis pour clôturer un examen en cours ou pour supprimer définitivement les examens archivés.
            </p>
          </div>
          
          <form onSubmit={handleSaveCode} className="flex gap-2 max-w-sm mt-1">
            <input
              type="text"
              placeholder="Nouveau code"
              value={tempCode}
              onChange={(e) => setTempCode(e.target.value)}
              disabled={saving}
              className="glass-input px-3 py-1.5 rounded-xl text-xs flex-1"
              required
            />
            <button
              type="submit"
              disabled={saving || tempCode === settings.admin_exam_termination_code}
              className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl text-xs transition-opacity duration-200"
            >
              Sauvegarder
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;
