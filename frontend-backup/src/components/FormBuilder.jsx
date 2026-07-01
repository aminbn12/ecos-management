import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import LogoImage from '../assets/logo.png';

const FormBuilder = () => {
  const { logout } = useAuth();
  
  // State for exam setup and dynamic data
  const [stations, setStations] = useState([]);
  const [exams, setExams] = useState([{ id: 1, title: "Examen ECOS Principal" }]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Station Form State
  const [stationId, setStationId] = useState('');
  const [stationName, setStationName] = useState('');
  const [stepNumber, setStepNumber] = useState(1);
  const [isReserve, setIsReserve] = useState(false);
  const [stationType, setStationType] = useState('examiner_eval');
  
  // Grid / Question Form State
  const [selectedStationId, setSelectedStationId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [totalPoints, setTotalPoints] = useState(20);
  
  // Criteria (for examiner station)
  const [criteria, setCriteria] = useState([]);
  const [newCritText, setNewCritText] = useState('');
  const [newCritPoints, setNewCritPoints] = useState('');
  const [newCritCritical, setNewCritCritical] = useState(false);

  // QCM / Case (for student autonomous station)
  const [caseDescription, setCaseDescription] = useState('');
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [qcmOptions, setQcmOptions] = useState([]);
  const [newOptText, setNewOptText] = useState('');
  const [newOptPoints, setNewOptPoints] = useState('');
  const [newOptCorrect, setNewOptCorrect] = useState(false);

  // Load configuration from API or mock fallbacks
  const loadData = async () => {
    try {
      const response = await axios.get('/api/admin/stations');
      setStations(response.data.stations);
      if (response.data.exams.length > 0) {
        setExams(response.data.exams);
      }
    } catch (err) {
      console.warn("Backend API offline, loading mock configurator...");
      // Preset Mock Stations
      setStations([
        {
          id: 1,
          name: "Diagnostic Radiologique",
          step_number: 1,
          is_reserve: false,
          type: "examiner_eval",
          evaluation_form: {
            title: "Grille Technique de Diagnostic",
            total_points: 20,
            criteria: [
              { text: "Asepsie et lavage des mains", points: 5, isCritical: false },
              { text: "Identification de la lésion apicale", points: 15, isCritical: true }
            ]
          }
        },
        {
          id: 2,
          name: "Suture Chirurgicale",
          step_number: 2,
          is_reserve: false,
          type: "examiner_eval",
          evaluation_form: null
        },
        {
          id: 3,
          name: "QCM - Endodontie Autonome",
          step_number: 3,
          is_reserve: false,
          type: "student_tablet",
          evaluation_form: {
            title: "Questionnaire Endodontie",
            total_points: 10,
            criteria: {
              type: 'qcm',
              case_description: "Un patient se présente avec une douleur vive...",
              question_prompt: "Quel est le diagnostic le plus probable ?",
              options: [
                { text: "Pulpite aiguë", points: 10, isCorrect: true },
                { text: "Nécrose pulpaire", points: 0, isCorrect: false }
              ]
            }
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Station metadata
  const handleSaveStation = async (e) => {
    e.preventDefault();
    if (!stationName.trim()) return;

    const payload = {
      id: stationId ? parseInt(stationId) : null,
      exam_id: exams[0].id, // Default to first active exam
      name: stationName,
      step_number: parseInt(stepNumber),
      is_reserve: isReserve,
      type: stationType
    };

    try {
      const res = await axios.post('/api/admin/stations', payload);
      setStatus({ type: 'success', message: 'Station configurée avec succès.' });
      loadData();
      resetStationForm();
    } catch (err) {
      // Demo mock save
      const mockNewStation = {
        id: stationId ? parseInt(stationId) : Date.now(),
        name: stationName,
        step_number: parseInt(stepNumber),
        is_reserve: isReserve,
        type: stationType,
        evaluation_form: null
      };

      if (stationId) {
        setStations(stations.map(s => s.id === parseInt(stationId) ? mockNewStation : s));
      } else {
        setStations([...stations, mockNewStation]);
      }

      setStatus({ type: 'success', message: 'Mode Démo : Station enregistrée localement.' });
      resetStationForm();
    }
  };

  const handleEditStation = (st) => {
    setStationId(st.id);
    setStationName(st.name);
    setStepNumber(st.step_number);
    setIsReserve(st.is_reserve);
    setStationType(st.type);
  };

  const handleDeleteStation = async (id) => {
    if (!window.confirm("Supprimer cette station ?")) return;

    try {
      await axios.delete(`/api/admin/stations/${id}`);
      setStatus({ type: 'success', message: 'Station supprimée.' });
      loadData();
    } catch (err) {
      setStations(stations.filter(s => s.id !== id));
      setStatus({ type: 'success', message: 'Mode Démo : Station retirée.' });
    }
  };

  const resetStationForm = () => {
    setStationId('');
    setStationName('');
    setStepNumber(1);
    setIsReserve(false);
    setStationType('examiner_eval');
  };

  // Load selected station form for configuration
  const handleSelectStationForForm = (stId) => {
    setSelectedStationId(stId);
    setStatus({ type: '', message: '' });
    
    const st = stations.find(s => s.id === parseInt(stId));
    if (!st) return;

    if (st.evaluation_form) {
      setFormTitle(st.evaluation_form.title);
      setTotalPoints(st.evaluation_form.total_points);
      
      if (st.type === 'examiner_eval') {
        setCriteria(st.evaluation_form.criteria || []);
      } else {
        // QCM style structure
        const qcm = st.evaluation_form.criteria || {};
        setCaseDescription(qcm.case_description || '');
        setQuestionPrompt(qcm.question_prompt || '');
        setQcmOptions(qcm.options || []);
      }
    } else {
      // Clear form settings
      setFormTitle(`Grille - ${st.name}`);
      setTotalPoints(st.type === 'examiner_eval' ? 20 : 10);
      setCriteria([]);
      setCaseDescription('');
      setQuestionPrompt('');
      setQcmOptions([]);
    }
  };

  // Examiner Criteria CRUD
  const handleAddCriterion = (e) => {
    e.preventDefault();
    if (!newCritText.trim() || !newCritPoints) return;
    setCriteria([
      ...criteria,
      { id: Date.now(), text: newCritText.trim(), points: parseFloat(newCritPoints), isCritical: newCritCritical }
    ]);
    setNewCritText('');
    setNewCritPoints('');
    setNewCritCritical(false);
  };

  // Student QCM Options CRUD
  const handleAddQcmOption = (e) => {
    e.preventDefault();
    if (!newOptText.trim()) return;
    setQcmOptions([
      ...qcmOptions,
      { text: newOptText.trim(), points: parseFloat(newOptPoints || 0), isCorrect: newOptCorrect }
    ]);
    setNewOptText('');
    setNewOptPoints('');
    setNewOptCorrect(false);
  };

  // Submit Grid/QCM contents to server
  const handleSubmitFormContents = async (e) => {
    e.preventDefault();
    if (!selectedStationId) return;

    const currentStation = stations.find(s => s.id === parseInt(selectedStationId));
    
    let compiledCriteria = null;
    let finalPoints = parseFloat(totalPoints);

    if (currentStation.type === 'examiner_eval') {
      compiledCriteria = criteria.map(c => ({ text: c.text, points: c.points, isCritical: c.isCritical }));
      // Sum check
      const sum = criteria.reduce((acc, c) => acc + c.points, 0);
      finalPoints = sum;
    } else {
      compiledCriteria = {
        type: 'qcm',
        case_description: caseDescription,
        question_prompt: questionPrompt,
        options: qcmOptions
      };
      // Find max possible QCM points
      const maxOpt = qcmOptions.reduce((max, o) => o.points > max ? o.points : max, 0);
      finalPoints = maxOpt || finalPoints;
    }

    const payload = {
      station_id: parseInt(selectedStationId),
      title: formTitle,
      total_points: finalPoints,
      criteria: compiledCriteria
    };

    try {
      await axios.post('/api/admin/forms', payload);
      setStatus({ type: 'success', message: 'Configuration de l\'évaluation enregistrée avec succès.' });
      loadData();
    } catch (err) {
      // Mock local update
      const st = stations.find(s => s.id === parseInt(selectedStationId));
      st.evaluation_form = {
        title: formTitle,
        total_points: finalPoints,
        criteria: compiledCriteria
      };
      setStatus({ type: 'success', message: 'Mode Démo : Contenu sauvegardé pour la station.' });
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Dynamic Header with UM6SS Logo */}
      <header className="flex flex-col sm:flex-row justify-between items-center glass-card p-6 rounded-2xl gap-4">
        <div className="flex items-center gap-4">
          <img src={LogoImage} alt="UM6SS Logo" className="h-14 w-auto object-contain bg-white/5 p-1 rounded-lg" />
          <div>
            <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              UM6SS - Panneau de Configuration ECOS
            </h1>
            <p className="text-gray-400 text-xs">Planifier les étapes d'examen et les grilles de notation dynamiques</p>
          </div>
        </div>
        <button onClick={logout} className="px-4 py-2 bg-red-950/40 hover:bg-red-900/40 border border-red-500/20 text-red-300 text-xs font-semibold rounded-xl">
          Déconnexion
        </button>
      </header>

      {/* Main Grid: Station List / Add Station / Content Configurator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Station Admin (4 cols) */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          {/* Station Form */}
          <div className="glass-card p-5 rounded-2xl border border-gray-800">
            <h3 className="text-xs text-teal-400 font-bold uppercase tracking-wider border-b border-gray-800 pb-2">
              {stationId ? '📝 Modifier la Station' : '➕ Ajouter une Station'}
            </h3>
            
            <form onSubmit={handleSaveStation} className="flex flex-col gap-3.5 mt-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-semibold uppercase">Nom de la Station</label>
                <input 
                  type="text" 
                  placeholder="Ex: Sutures et Asepsie"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  className="glass-input p-2 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-400 font-semibold uppercase">Numéro Étape (1-5)</label>
                  <select 
                    value={stepNumber}
                    onChange={(e) => setStepNumber(parseInt(e.target.value))}
                    className="glass-input p-2 rounded-lg text-xs"
                  >
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Étape {n}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-400 font-semibold uppercase">Type d'Évaluation</label>
                  <select 
                    value={stationType}
                    onChange={(e) => setStationType(e.target.value)}
                    className="glass-input p-2 rounded-lg text-xs"
                  >
                    <option value="examiner_eval">Examinateur</option>
                    <option value="student_tablet">Tablette Étudiant</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 py-1.5">
                <input 
                  type="checkbox" 
                  id="is_reserve_checkbox"
                  checked={isReserve}
                  onChange={(e) => setIsReserve(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-teal-500"
                />
                <label htmlFor="is_reserve_checkbox" className="text-xs text-gray-300 select-none">
                  Station de Réserve (Rattrapage)
                </label>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition">
                  Enregistrer
                </button>
                {stationId && (
                  <button type="button" onClick={resetStationForm} className="px-3 bg-gray-900 text-gray-400 border border-gray-800 rounded-lg text-xs">
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Station List */}
          <div className="glass-card p-5 rounded-2xl border border-gray-800 flex-1">
            <h3 className="text-xs text-cyan-400 font-bold uppercase tracking-wider border-b border-gray-800 pb-2">
              Stations Programmées
            </h3>
            
            <div className="flex flex-col gap-2 mt-3 max-h-[300px] overflow-y-auto pr-1">
              {stations.map(st => (
                <div key={st.id} className="p-3 bg-gray-900/40 border border-gray-800/80 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-200">{st.name}</span>
                    <span className="text-[9px] text-gray-400 mt-0.5">
                      Étape {st.step_number} | {st.is_reserve ? 'Réserve' : 'Initiale'} | {st.type === 'examiner_eval' ? 'Exam' : 'Auto'}
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    <button onClick={() => handleEditStation(st)} className="text-gray-400 hover:text-cyan-400">✏️</button>
                    <button onClick={() => handleDeleteStation(st.id)} className="text-gray-400 hover:text-rose-400">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: Grid / Questionnaire setup (8 cols) */}
        <section className="lg:col-span-8 glass-card p-6 rounded-2xl border border-gray-800 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800 pb-3">
            <div>
              <h3 className="text-xs text-indigo-400 font-bold uppercase tracking-wider">
                Configuration du Contenu d'Évaluation
              </h3>
              <p className="text-xs text-gray-400">Configurez la grille de notation ou les questions d'examen</p>
            </div>
            
            <select
              value={selectedStationId}
              onChange={(e) => handleSelectStationForForm(e.target.value)}
              className="glass-input p-2 rounded-xl text-xs w-full sm:w-64"
            >
              <option value="">-- Choisir une Station à Programmer --</option>
              {stations.map(s => (
                <option key={s.id} value={s.id}>
                  Étape {s.step_number} ({s.is_reserve ? 'Réserve' : 'Initiale'}) - {s.name}
                </option>
              ))}
            </select>
          </div>

          {!selectedStationId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-16 text-center">
              <span className="text-3xl">⚙️</span>
              <p className="text-xs mt-2 font-medium">Sélectionnez une station à droite pour configurer ses critères.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitFormContents} className="flex-1 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase">Titre du Questionnaire/Grille</label>
                  <input 
                    type="text" 
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="glass-input p-2.5 rounded-xl text-xs"
                    required
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase">Points de Référence (Total)</label>
                  <input 
                    type="number" 
                    value={totalPoints}
                    onChange={(e) => setTotalPoints(parseFloat(e.target.value))}
                    className="glass-input p-2.5 rounded-xl text-xs"
                    required
                  />
                </div>
              </div>

              {/* DYNAMIC FORM VIEW: EXAMINER RATING CHECKLIST */}
              {stations.find(s => s.id === parseInt(selectedStationId))?.type === 'examiner_eval' ? (
                <div className="flex flex-col gap-4 border-t border-gray-800/80 pt-4">
                  <h4 className="text-xs font-bold text-gray-300 uppercase">Grille Tactile - Critères de notation</h4>
                  
                  {/* Dynamic Criterion Adder */}
                  <div className="flex flex-col sm:flex-row gap-2 bg-gray-900/40 p-3.5 rounded-xl items-end border border-gray-800/50">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[9px] text-gray-400">Description du geste</label>
                      <input 
                        type="text" 
                        value={newCritText}
                        onChange={(e) => setNewCritText(e.target.value)}
                        className="glass-input p-2 rounded-lg text-xs"
                        placeholder="Ex: Réalisation de la suture..."
                      />
                    </div>
                    <div className="w-20 flex flex-col gap-1">
                      <label className="text-[9px] text-gray-400">Barème</label>
                      <input 
                        type="number" 
                        step="0.5"
                        value={newCritPoints}
                        onChange={(e) => setNewCritPoints(e.target.value)}
                        className="glass-input p-2 rounded-lg text-xs text-center"
                        placeholder="Ex: 5"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 pb-2 text-xs text-gray-400">
                      <input 
                        type="checkbox" 
                        id="crit_critical"
                        checked={newCritCritical}
                        onChange={(e) => setNewCritCritical(e.target.checked)}
                        className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-teal-500"
                      />
                      <label htmlFor="crit_critical">Critique 🚨</label>
                    </div>
                    <button type="button" onClick={handleAddCriterion} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg text-xs">
                      Ajouter
                    </button>
                  </div>

                  {/* List */}
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {criteria.map((c, idx) => (
                      <div key={c.id || idx} className="p-3 bg-gray-900/20 border border-gray-800/60 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-gray-200">
                          {idx + 1}. {c.text} {c.isCritical && <b className="text-rose-400 ml-1">🚨 (Critique)</b>}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-cyan-400">{c.points} pts</span>
                          <button type="button" onClick={() => setCriteria(criteria.filter(cr => cr.id !== c.id))} className="text-gray-500 hover:text-rose-400">❌</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // DYNAMIC FORM VIEW: STUDENT TABLET MCQ
                <div className="flex flex-col gap-4 border-t border-gray-800/80 pt-4">
                  <h4 className="text-xs font-bold text-gray-300 uppercase">Questionnaire Tablette - QCM</h4>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-gray-400 uppercase">Mise en situation clinique (Cas)</label>
                    <textarea 
                      rows="2"
                      value={caseDescription}
                      onChange={(e) => setCaseDescription(e.target.value)}
                      className="glass-input p-3 rounded-xl text-xs"
                      placeholder="Ex: Le patient se présente avec une douleur pulpaire..."
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-gray-400 uppercase">Question posée</label>
                    <input 
                      type="text" 
                      value={questionPrompt}
                      onChange={(e) => setQuestionPrompt(e.target.value)}
                      className="glass-input p-3 rounded-xl text-xs"
                      placeholder="Ex: Quel diagnostic ou traitement préconisez-vous ?"
                    />
                  </div>

                  {/* QCM Option Builder */}
                  <div className="flex flex-col sm:flex-row gap-2 bg-gray-900/40 p-3.5 rounded-xl items-end border border-gray-800/50">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[9px] text-gray-400">Intitulé du Choix</label>
                      <input 
                        type="text" 
                        value={newOptText}
                        onChange={(e) => setNewOptText(e.target.value)}
                        className="glass-input p-2 rounded-lg text-xs"
                        placeholder="Ex: Pulpite irréversible"
                      />
                    </div>
                    <div className="w-20 flex flex-col gap-1">
                      <label className="text-[9px] text-gray-400">Points</label>
                      <input 
                        type="number" 
                        value={newOptPoints}
                        onChange={(e) => setNewOptPoints(e.target.value)}
                        className="glass-input p-2 rounded-lg text-xs text-center"
                        placeholder="Ex: 10"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 pb-2 text-xs text-gray-400">
                      <input 
                        type="checkbox" 
                        id="opt_correct"
                        checked={newOptCorrect}
                        onChange={(e) => setNewOptCorrect(e.target.checked)}
                        className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-teal-500"
                      />
                      <label htmlFor="opt_correct">Correct ✔️</label>
                    </div>
                    <button type="button" onClick={handleAddQcmOption} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg text-xs">
                      Ajouter
                    </button>
                  </div>

                  {/* Options List */}
                  <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {qcmOptions.map((opt, idx) => (
                      <div key={idx} className="p-3 bg-gray-900/20 border border-gray-800/60 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-gray-200">
                          {idx + 1}. {opt.text} {opt.isCorrect && <b className="text-emerald-400 ml-1">✔️ (Correct)</b>}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-cyan-400">{opt.points} pts</span>
                          <button type="button" onClick={() => setQcmOptions(qcmOptions.filter((_, oIdx) => oIdx !== idx))} className="text-gray-500 hover:text-rose-400">❌</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit evaluation form button */}
              <button 
                type="submit" 
                className="w-full mt-4 py-3 bg-gradient-to-r from-teal-500 to-indigo-500 text-white font-bold rounded-xl text-sm transition"
              >
                💾 Enregistrer la Grille et son Barème
              </button>

              {status.message && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${
                  status.type === 'success' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' : 'bg-rose-950/40 text-rose-400 border border-rose-500/20'
                }`}>
                  {status.message}
                </div>
              )}
            </form>
          )}
        </section>
      </div>
    </div>
  );
};

export default FormBuilder;
