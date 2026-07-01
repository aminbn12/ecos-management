import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import LogoImage from '../assets/logo.png';

const FormBuilder = () => {
  const { logout } = useAuth();
  
  // State for exam setup and dynamic data
  const [stations, setStations] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [examSaved, setExamSaved] = useState(false);

  const [examTitle, setExamTitle] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examSaving, setExamSaving] = useState(false);

  useEffect(() => {
    if (exams.length > 0) {
      setExamTitle(exams[0].title || '');
      setExamDate(exams[0].date || '');
    }
  }, [exams]);

  // Station Form State
  const [stationId, setStationId] = useState('');
  const [stationName, setStationName] = useState('');
  const [stepNumber, setStepNumber] = useState(1);
  const [isReserve, setIsReserve] = useState(false);
  const [stationType, setStationType] = useState('examiner_eval');
  const [examiners, setExaminers] = useState([]);
  const [selectedExaminerId, setSelectedExaminerId] = useState('');
  
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
        setExamSaved(true);
      }
      if (response.data.examiners) {
        setExaminers(response.data.examiners);
      }
    } catch (err) {
      console.warn("Backend API offline, loading mock configurator...");
      // Preset Mock Examiners
      setExaminers([
        { id: 2, name: "Dr. El Alami", email: "alami@um6ss.ma" },
        { id: 3, name: "Dr. Bennani", email: "bennani@um6ss.ma" },
        { id: 4, name: "Dr. Tazi", email: "tazi@um6ss.ma" }
      ]);
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

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!examTitle.trim() || !examDate) return;
    setExamSaving(true);
    try {
      const payload = {
        id: exams[0]?.id || null,
        title: examTitle.trim(),
        date: examDate,
        status: exams[0]?.status || 'draft'
      };
      await axios.post('/api/admin/exams', payload);
      setStatus({ type: 'success', message: 'Examen enregistré avec succès. Activez-le depuis 📜 Historique & Rapports.' });
      setExamSaved(true);
      loadData();
    } catch (err) {
      setStatus({ type: 'success', message: 'Mode Démo : Examen enregistré. Activez-le depuis 📜 Historique & Rapports.' });
      const demoExam = { id: Date.now(), title: examTitle.trim(), date: examDate, status: 'draft' };
      if (exams.length > 0) {
        setExams([{ ...exams[0], title: examTitle.trim(), date: examDate }]);
      } else {
        setExams([demoExam]);
      }
      setExamSaved(true);
    } finally {
      setExamSaving(false);
    }
  };

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
      type: stationType,
      examiner_id: selectedExaminerId ? parseInt(selectedExaminerId) : null
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
        examiner_id: selectedExaminerId ? parseInt(selectedExaminerId) : null,
        examiner: examiners.find(ex => ex.id === parseInt(selectedExaminerId)) || null,
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
    setSelectedExaminerId(st.examiner_id || '');
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
    setSelectedExaminerId('');
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
    if (!newCritText.trim()) return;
    setCriteria([
      ...criteria,
      { id: Date.now(), text: newCritText.trim(), isCritical: newCritCritical }
    ]);
    setNewCritText('');
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
      compiledCriteria = criteria.map(c => ({ text: c.text, isCritical: c.isCritical }));
      // Use the total_points as the universal scale for all criteria
      finalPoints = parseFloat(totalPoints);
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in" style={{ minHeight: 'calc(100vh - 60px)' }}>
      
      {/* Sub-Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass-card p-5 rounded-2xl relative overflow-hidden">
        <div>
          <h2 className="text-lg font-extrabold t-text-heading">Configuration des Stations & Grilles</h2>
          <p className="t-text-secondary text-xs mt-0.5">Planifier les étapes d'examen et les grilles de notation dynamiques</p>
        </div>
      </div>

      {/* Exam Metadata Card */}
      <div className="glass-card p-5 rounded-2xl flex flex-col gap-4">
        <h3 className="text-sm font-extrabold t-text-heading">📅 Informations de l'Examen Actif</h3>
        <form onSubmit={handleSaveExam} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex flex-1 flex-col gap-1.5 w-full">
            <label className="text-[10px] t-text-secondary font-semibold uppercase">Nom de l'Examen</label>
            <input
              type="text"
              placeholder="Ex: Examen Clinique ECOS FMD UM6SS 2026"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="glass-input p-2.5 rounded-xl text-xs w-full"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full sm:w-48">
            <label className="text-[10px] t-text-secondary font-semibold uppercase">Date de l'Examen</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="glass-input p-2.5 rounded-xl text-xs w-full"
              required
            />
          </div>
          <button
            type="submit"
            disabled={examSaving}
            className="px-5 py-2.5 font-bold rounded-xl text-xs transition whitespace-nowrap"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            {examSaving ? 'Enregistrement...' : examSaved ? 'Mettre à jour l\'Examen' : 'Enregistrer Examen'}
          </button>
          {examSaved && (
            <span className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }}>
              ✅ Examen enregistré
            </span>
          )}
        </form>
      </div>

      {/* Main Grid: Station List / Add Station / Content Configurator */}
      {!examSaved ? (
        <div className="glass-card p-10 rounded-2xl flex flex-col items-center justify-center text-center gap-3 animate-fade-in">
          <span className="text-4xl">📋</span>
          <h3 className="text-sm font-extrabold t-text-heading">Veuillez d'abord créer un examen</h3>
          <p className="text-xs t-text-secondary max-w-md leading-relaxed">
            Remplissez le nom et la date de l'examen ci-dessus, puis cliquez sur <b style={{ color: 'var(--color-accent)' }}>"Enregistrer Examen"</b> pour pouvoir ajouter des stations et configurer les grilles d'évaluation.
          </p>
          <div className="mt-2 px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider" style={{ background: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            Stations & Grilles verrouillées
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Station Admin (4 cols) */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          {/* Station Form */}
          <div className="glass-card p-5 rounded-2xl">
            <h3 className="text-xs t-accent font-bold uppercase tracking-wider border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
              {stationId ? '📝 Modifier la Station' : '➕ Ajouter une Station'}
            </h3>
            
            <form onSubmit={handleSaveStation} className="flex flex-col gap-3.5 mt-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] t-text-secondary font-semibold uppercase">Nom de la Station</label>
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
                  <label className="text-[10px] t-text-secondary font-semibold uppercase">Numéro Étape (1-5)</label>
                  <select 
                    value={stepNumber}
                    onChange={(e) => setStepNumber(parseInt(e.target.value))}
                    className="glass-input p-2 rounded-lg text-xs"
                  >
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Étape {n}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] t-text-secondary font-semibold uppercase">Type d'Évaluation</label>
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

              <div className="flex flex-col gap-1">
                <label className="text-[10px] t-text-secondary font-semibold uppercase">Examinateur Associé</label>
                <select 
                  value={selectedExaminerId}
                  onChange={(e) => setSelectedExaminerId(e.target.value)}
                  className="glass-input p-2 rounded-lg text-xs"
                >
                  <option value="">-- Aucun examinateur --</option>
                  {examiners.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 py-1.5">
                <input 
                  type="checkbox" 
                  id="is_reserve_checkbox"
                  checked={isReserve}
                  onChange={(e) => setIsReserve(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
                />
                <label htmlFor="is_reserve_checkbox" className="text-xs t-text-secondary select-none">
                  Station de Réserve (Rattrapage)
                </label>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 font-bold rounded-lg text-xs transition" style={{ background: 'var(--color-accent)', color: '#fff' }}>
                  Enregistrer
                </button>
                {stationId && (
                  <button type="button" onClick={resetStationForm} className="px-3 bg-transparent t-text-secondary border rounded-lg text-xs" style={{ borderColor: 'var(--color-border)' }}>
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Station List */}
          <div className="glass-card p-5 rounded-2xl flex-1">
            <h3 className="text-xs font-bold uppercase tracking-wider border-b pb-2 t-accent" style={{ borderColor: 'var(--color-border)' }}>
              Stations Programmées
            </h3>
            
            <div className="flex flex-col gap-2 mt-3 max-h-[300px] overflow-y-auto pr-1">
              {stations.map(st => (
                <div key={st.id} className="p-3 border rounded-xl flex items-center justify-between gap-3 text-xs" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                  <div className="flex flex-col">
                    <span className="font-bold t-text-heading">{st.name}</span>
                    <span className="text-[9px] t-text-secondary mt-0.5">
                      Étape {st.step_number} | {st.is_reserve ? 'Réserve' : 'Initiale'} | {st.type === 'examiner_eval' ? 'Exam' : 'Auto'}
                    </span>
                    {st.examiner && (
                      <span className="text-[9px] font-semibold mt-0.5 t-accent">
                        👤 {st.examiner.name}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    <button onClick={() => handleEditStation(st)} className="t-text-secondary hover:t-accent">✏️</button>
                    <button onClick={() => handleDeleteStation(st.id)} className="t-text-secondary hover:text-rose-500">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: Grid / Questionnaire setup (8 cols) */}
        <section className="lg:col-span-8 glass-card p-6 rounded-2xl flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider t-accent">
                Configuration du Contenu d'Évaluation
              </h3>
              <p className="text-xs t-text-secondary">Configurez la grille de notation ou les questions d'examen</p>
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
            <div className="flex-1 flex flex-col items-center justify-center t-text-muted py-16 text-center">
              <span className="text-3xl">⚙️</span>
              <p className="text-xs mt-2 font-medium">Sélectionnez une station à gauche pour configurer ses critères.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitFormContents} className="flex-1 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] t-text-secondary font-bold uppercase">Titre du Questionnaire/Grille</label>
                  <input 
                    type="text" 
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="glass-input p-2.5 rounded-xl text-xs"
                    required
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] t-text-secondary font-bold uppercase">Points de Référence (Total)</label>
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
                <div className="flex flex-col gap-4 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                  <h4 className="text-xs font-bold t-text-heading uppercase">Grille Tactile - Critères de notation</h4>
                  <p className="text-[10px] t-text-secondary -mt-2">Chaque critère sera noté de <b className="t-accent">0</b> à <b className="t-accent">{totalPoints}</b> par l'examinateur.</p>
                  
                  <div className="flex flex-col sm:flex-row gap-2 p-3.5 rounded-xl items-end border" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[9px] t-text-secondary">Description du geste</label>
                      <input 
                        type="text" 
                        value={newCritText}
                        onChange={(e) => setNewCritText(e.target.value)}
                        className="glass-input p-2 rounded-lg text-xs"
                        placeholder="Ex: Réalisation de la suture..."
                      />
                    </div>
                    <div className="flex items-center gap-1.5 pb-2 text-xs t-text-secondary">
                      <input 
                        type="checkbox" 
                        id="crit_critical"
                        checked={newCritCritical}
                        onChange={(e) => setNewCritCritical(e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
                      />
                      <label htmlFor="crit_critical">Critique 🚨</label>
                    </div>
                    <button type="button" onClick={handleAddCriterion} className="px-4 py-2 text-white font-bold rounded-lg text-xs" style={{ background: 'var(--color-accent)' }}>
                      Ajouter
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {criteria.map((c, idx) => (
                      <div key={c.id || idx} className="p-3 border rounded-xl flex items-center justify-between gap-3 text-xs" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                        <span className="font-medium t-text-heading">
                          {idx + 1}. {c.text} {c.isCritical && <b className="text-rose-500 ml-1">🚨 (Critique)</b>}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] t-text-secondary">Noté sur {totalPoints}</span>
                          <button type="button" onClick={() => setCriteria(criteria.filter(cr => cr.id !== c.id))} className="t-text-muted hover:text-rose-500">❌</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                  <h4 className="text-xs font-bold t-text-heading uppercase">Questionnaire Tablette - QCM</h4>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] t-text-secondary uppercase">Mise en situation clinique (Cas)</label>
                    <textarea 
                      rows="2"
                      value={caseDescription}
                      onChange={(e) => setCaseDescription(e.target.value)}
                      className="glass-input p-3 rounded-xl text-xs"
                      placeholder="Ex: Le patient se présente avec une douleur pulpaire..."
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] t-text-secondary uppercase">Question posée</label>
                    <input 
                      type="text" 
                      value={questionPrompt}
                      onChange={(e) => setQuestionPrompt(e.target.value)}
                      className="glass-input p-3 rounded-xl text-xs"
                      placeholder="Ex: Quel diagnostic ou traitement préconisez-vous ?"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 p-3.5 rounded-xl items-end border" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[9px] t-text-secondary">Intitulé du Choix</label>
                      <input 
                        type="text" 
                        value={newOptText}
                        onChange={(e) => setNewOptText(e.target.value)}
                        className="glass-input p-2 rounded-lg text-xs"
                        placeholder="Ex: Pulpite irréversible"
                      />
                    </div>
                    <div className="w-20 flex flex-col gap-1">
                      <label className="text-[9px] t-text-secondary">Points</label>
                      <input 
                        type="number" 
                        value={newOptPoints}
                        onChange={(e) => setNewOptPoints(e.target.value)}
                        className="glass-input p-2 rounded-lg text-xs text-center"
                        placeholder="Ex: 10"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 pb-2 text-xs t-text-secondary">
                      <input 
                        type="checkbox" 
                        id="opt_correct"
                        checked={newOptCorrect}
                        onChange={(e) => setNewOptCorrect(e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
                      />
                      <label htmlFor="opt_correct">Correct ✔️</label>
                    </div>
                    <button type="button" onClick={handleAddQcmOption} className="px-4 py-2 text-white font-bold rounded-lg text-xs" style={{ background: 'var(--color-accent)' }}>
                      Ajouter
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {qcmOptions.map((opt, idx) => (
                      <div key={idx} className="p-3 border rounded-xl flex items-center justify-between gap-3 text-xs" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                        <span className="font-medium t-text-heading">
                          {idx + 1}. {opt.text} {opt.isCorrect && <b className="text-emerald-500 ml-1">✔️ (Correct)</b>}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold t-accent">{opt.points} pts</span>
                          <button type="button" onClick={() => setQcmOptions(qcmOptions.filter((_, oIdx) => oIdx !== idx))} className="t-text-muted hover:text-rose-400">❌</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full mt-4 py-3 text-white font-bold rounded-xl text-sm transition"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), #155E75)' }}
              >
                💾 Enregistrer la Grille et son Barème
              </button>

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
          )}
        </section>
      </div>
      )}
    </div>
  );
};

export default FormBuilder;

