import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import LogoImage from '../assets/logo.png';

const ScannerKiosk = ({ onScanSuccess }) => {
  const { activeStationId, selectStation, logout } = useAuth();
  const [stations, setStations] = useState([]);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanStreak, setScanStreak] = useState(false);
  const inputRef = useRef(null);

  // Fetch dynamic stations list from backend
  const fetchStations = async () => {
    try {
      const response = await axios.get('/api/admin/stations');
      setStations(response.data.stations);
    } catch (err) {
      console.warn("Backend stations lookup offline, fallback to local simulator list.");
      setStations([
        { id: 1, name: "Station 1 - Diagnostic Radiologique (Initiale)", step_number: 1, is_reserve: false, type: 'examiner_eval' },
        { id: 2, name: "Station 2 - Anesthésie Locale (Initiale)", step_number: 2, is_reserve: false, type: 'examiner_eval' },
        { id: 3, name: "Station 3 - Suture Chirurgicale (Initiale)", step_number: 3, is_reserve: false, type: 'examiner_eval' },
        { id: 4, name: "Station 4 - Préparation Cavitaire (Initiale)", step_number: 4, is_reserve: false, type: 'examiner_eval' },
        { id: 5, name: "Station 5 - Prothèse Fixe (Initiale)", step_number: 5, is_reserve: false, type: 'examiner_eval' },
        { id: 6, name: "Station 3 - QCM - Endodontie Autonome (Initiale)", step_number: 3, is_reserve: false, type: 'student_tablet' }
      ]);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  // Intercept keyboard inputs globally to capture hardware barcode reader
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      const currentTime = Date.now();
      
      if (currentTime - lastKeyTime > 150) {
        buffer = '';
      }

      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          handleSearchMatricule(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStationId, stations]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleStationChange = (e) => {
    selectStation(e.target.value);
    setErrorMsg('');
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleSearchMatricule(manualInput.trim());
  };

  const handleSearchMatricule = async (matricule) => {
    if (!activeStationId) {
      setErrorMsg("Veuillez d'abord sélectionner votre Station d'examen.");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setScanStreak(false);

    try {
      const response = await axios.post('/api/examiner/scan', {
        matricule: matricule,
        station_id: parseInt(activeStationId)
      });
      
      onScanSuccess(response.data);
    } catch (err) {
      console.warn("Backend scanning offline, running demo mock simulation...", err);
      
      setTimeout(() => {
        setLoading(false);
        const activeStation = stations.find(s => s.id === parseInt(activeStationId));

        if (!activeStation) {
          setErrorMsg("Station configurée introuvable.");
          return;
        }

        // Demo checks
        if (matricule.toUpperCase() === 'ERROR') {
          setErrorMsg("Matricule invalide ou étudiant non répertorié.");
          return;
        }

        // Return a mock successful scan based on selected station type & config
        const mockStudent = {
          id: 42,
          name: matricule.toUpperCase() === 'DENT-2026-042' ? "Yassine Filali" : "Étudiant Externe (Simulé)",
          matricule: matricule.toUpperCase()
        };

        const mockForm = activeStation.evaluation_form || {
          station_id: activeStation.id,
          title: "Grille d'Évaluation Clinique " + activeStation.name,
          total_points: activeStation.type === 'student_tablet' ? 10 : 20,
          criteria: activeStation.type === 'student_tablet' ? {
            type: 'qcm',
            case_description: "Un patient de 24 ans présente une douleur intense localisée au niveau de la dent 36...",
            question_prompt: "Quel est le diagnostic le plus probable ?",
            options: [
              { text: "Parodontite apicale aiguë d'origine endodontique", points: 10, isCorrect: true },
              { text: "Pulpite irréversible", points: 0, isCorrect: false }
            ]
          } : [
            { text: "Respect des règles d'hygiène et d'asepsie", points: 5, isCritical: false },
            { text: "Qualité technique du geste clinique", points: 10, isCritical: true },
            { text: "Communication et confort du patient", points: 5, isCritical: false }
          ]
        };

        onScanSuccess({
          student: mockStudent,
          station: activeStation,
          evaluation_form: mockForm,
          progression: { id: 88, requires_jury_decision: false }
        });
      }, 600);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 max-w-xl mx-auto gap-6 text-center">
      
      {/* Upper Logo & Station Select */}
      <div className="w-full glass-card p-5 rounded-2xl flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3 gap-3">
          <div className="flex items-center gap-2 text-left">
            <img src={LogoImage} alt="UM6SS Logo" className="h-10 w-auto bg-white/5 p-1 rounded" />
            <div>
              <h2 className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest glow-cyan">Espace Examinateur</h2>
              <h1 className="text-sm font-extrabold text-gray-100">Kiosque de Scan</h1>
            </div>
          </div>
          <button 
            onClick={logout}
            className="px-3 py-1.5 bg-red-950/40 border border-red-500/20 text-red-300 text-xs font-semibold rounded-lg hover:bg-red-900/40 transition duration-150"
          >
            Déconnexion
          </button>
        </div>

        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-xs text-gray-400 font-semibold">Station de la Tablette</label>
          <select 
            value={activeStationId} 
            onChange={handleStationChange}
            className="glass-input p-3 rounded-xl text-sm"
          >
            <option value="">-- Sélectionner ma Station --</option>
            {stations.map(s => (
              <option key={s.id} value={s.id}>
                Étape {s.step_number} ({s.is_reserve ? 'Réserve' : 'Initiale'}) - {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Scan Screen */}
      <main className={`w-full glass-card p-8 rounded-3xl border flex flex-col items-center gap-6 relative overflow-hidden transition-all duration-300 ${
        errorMsg ? 'border-rose-500/40 shadow-lg shadow-rose-950/20 animate-shake' : activeStationId ? 'border-cyan-500/20' : 'border-gray-800'
      }`}>
        {activeStationId && !loading && (
          <div className="scanner-laser"></div>
        )}

        <div className="w-40 h-40 rounded-full border-4 border-cyan-500/10 flex items-center justify-center relative bg-cyan-950/5">
          <div className="w-32 h-32 rounded-full border-2 border-cyan-500/25 flex items-center justify-center pulse-ring-slow">
            <span className="text-4xl text-cyan-400 drop-shadow">🖨️</span>
          </div>
          {loading && (
            <div className="absolute inset-0 bg-gray-950/80 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-gray-100">
            {activeStationId ? 'Prêt pour le Scan' : 'Sélectionnez une station'}
          </h2>
          <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
            {activeStationId 
              ? 'Présentez le code-barres de l\'étudiant devant le lecteur physique.'
              : 'Veuillez attribuer une station à cette tablette ci-dessus avant de scanner.'}
          </p>
        </div>

        {activeStationId && (
          <form onSubmit={handleManualSubmit} className="w-full flex gap-2 mt-4 z-10">
            <input 
              ref={inputRef}
              type="text" 
              placeholder="Saisir matricule manuellement (ex: DENT-2026-042)" 
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="flex-1 glass-input px-4 py-2.5 rounded-xl text-sm"
              disabled={loading}
            />
            <button 
              type="submit"
              className="px-5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-sm transition duration-150"
              disabled={loading}
            >
              Scanner
            </button>
          </form>
        )}

        {errorMsg && (
          <div className="w-full p-4 bg-rose-950/40 border border-rose-500/25 rounded-2xl flex flex-col gap-1 items-center animate-fade-in z-10">
            <span className="text-lg">⚠️</span>
            <span className="text-xs text-rose-300 font-bold uppercase tracking-wider">Scan Rejeté</span>
            <p className="text-sm text-rose-200 mt-1 font-semibold">{errorMsg}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ScannerKiosk;
