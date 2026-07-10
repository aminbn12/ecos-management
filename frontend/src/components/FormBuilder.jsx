import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import LogoImage from '../assets/logo.png';

const FormBuilder = () => {
  const { logout } = useAuth();
  const location = useLocation();
  
  // State for exam setup and dynamic data
  const [stations, setStations] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [examSaved, setExamSaved] = useState(false);

  const [examTitle, setExamTitle] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examSaving, setExamSaving] = useState(false);

  // Read initial examId from navigation state on mount
  useEffect(() => {
    const initialExamId = location.state?.examId;
    if (initialExamId) {
      setSelectedExamId(initialExamId);
      loadData(initialExamId);
    } else {
      loadData();
    }
  }, [location.state?.examId]);

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
  const [newCritPointsNonFait, setNewCritPointsNonFait] = useState('0');
  const [newCritPointsPartiel, setNewCritPointsPartiel] = useState('');
  const [newCritPointsFait, setNewCritPointsFait] = useState('');
  const [newCritCritical, setNewCritCritical] = useState(false);

  // QCM / Case (for student autonomous station)
  const [caseDescription, setCaseDescription] = useState('');
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [qcmOptions, setQcmOptions] = useState([]);
  const [newOptText, setNewOptText] = useState('');
  const [newOptPoints, setNewOptPoints] = useState('');
  const [newOptCorrect, setNewOptCorrect] = useState(false);

  // Track if criteria or options have been modified
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Load configuration from API or mock fallbacks
  const loadData = async (examIdToSelect = null) => {
    try {
      const examId = examIdToSelect !== null ? examIdToSelect : selectedExamId;
      const url = examId ? `/api/admin/stations?exam_id=${examId}` : '/api/admin/stations';
      
      const response = await axios.get(url);
      setStations(response.data.stations);
      
      const fetchedExams = response.data.exams || [];
      setExams(fetchedExams);
      
      if (fetchedExams.length > 0) {
        const activeExamId = examId || fetchedExams[0].id;
        const current = fetchedExams.find(e => e.id === parseInt(activeExamId));
        if (current) {
          setSelectedExamId(current.id);
          setExamTitle(current.title || '');
          setExamDate(current.date || '');
          setExamSaved(true);
        }
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

  const handleSelectExam = (id) => {
    if (id === 'new') {
      setSelectedExamId('');
      setExamTitle('');
      setExamDate('');
      setExamSaved(false);
      setStations([]);
    } else {
      const exam = exams.find(e => e.id === parseInt(id));
      if (exam) {
        setSelectedExamId(exam.id);
        setExamTitle(exam.title);
        setExamDate(exam.date);
        setExamSaved(true);
        loadData(exam.id);
      }
    }
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!examTitle.trim() || !examDate) return;
    setExamSaving(true);
    try {
      const isUpdate = !!selectedExamId;
      const currentStatus = isUpdate ? (exams.find(e => e.id === selectedExamId)?.status || 'draft') : 'draft';
      const payload = {
        id: selectedExamId || null,
        title: examTitle.trim(),
        date: examDate,
        status: currentStatus
      };
      const response = await axios.post('/api/admin/exams', payload);
      const savedExam = response.data.exam;
      setStatus({ type: 'success', message: isUpdate ? 'Examen mis à jour avec succès.' : 'Nouvel examen créé avec succès.' });
      setExamSaved(true);
      if (!isUpdate) {
        setSelectedExamId(savedExam.id);
      }
      loadData(savedExam.id);
    } catch (err) {
      setStatus({ type: 'success', message: 'Mode Démo : Examen enregistré.' });
      const demoId = selectedExamId || Date.now();
      const demoExam = { id: demoId, title: examTitle.trim(), date: examDate, status: 'draft' };
      if (selectedExamId) {
        setExams(exams.map(e => e.id === selectedExamId ? demoExam : e));
      } else {
        setExams([demoExam, ...exams]);
        setSelectedExamId(demoId);
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
      exam_id: selectedExamId,
      name: stationName,
      step_number: parseInt(stepNumber),
      is_reserve: isReserve,
      type: stationType,
      examiner_id: selectedExaminerId ? parseInt(selectedExaminerId) : null
    };

    try {
      const res = await axios.post('/api/admin/stations', payload);
      setStatus({ type: 'success', message: res.data.message || 'Station configurée avec succès.' });
      loadData(selectedExamId);
      resetStationForm();
    } catch (err) {
      // Show backend validation error (e.g. duplicate step_number + is_reserve)
      if (err.response?.data?.message) {
        setStatus({ type: 'error', message: err.response.data.message });
        return;
      }

      // Demo mock save fallback (only when API is offline)
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
      loadData(selectedExamId);
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
    setIsFormDirty(false);
    
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
    const ptsFait = parseFloat(newCritPointsFait) || 2.0;
    const ptsPartiel = newCritPointsPartiel !== '' ? parseFloat(newCritPointsPartiel) : ptsFait * 0.5;
    const ptsNonFait = parseFloat(newCritPointsNonFait) || 0;
    
    setCriteria([
      ...criteria,
      { 
        id: Date.now(), 
        text: newCritText.trim(), 
        points_non_fait: ptsNonFait,
        points_partiel: ptsPartiel,
        points_fait: ptsFait,
        isCritical: newCritCritical 
      }
    ]);
    setNewCritText('');
    setNewCritPointsNonFait('0');
    setNewCritPointsPartiel('');
    setNewCritPointsFait('');
    setNewCritCritical(false);
    setIsFormDirty(true);
  };

  // Download example CSV for criteria import
  const handleDownloadCriteriaExample = () => {
    const headers = "Description du geste;Non fait;Partiel;Fait;Critique\n";
    const sample = "Lavage des mains et asepsie;0;1;2;oui\nIdentification correcte du patient;0;1.5;3;non\nRéalisation de la suture avec technique appropriée;0;2.5;5;oui\nExplication au patient des suites opératoires;0;0.5;1;non\nVérification de l'hémostase;0;1;2;ok\n";
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'exemple_grille_criteres.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import criteria from CSV file
  const handleImportCriteriaCsv = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n');
        if (lines.length < 2) {
          setStatus({ type: 'error', message: 'Le fichier est vide.' });
          return;
        }

        const importedCriteria = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Support both semicolon and comma separators
          const separator = line.includes(';') ? ';' : ',';
          const cols = line.split(separator).map(c => c.trim());

          const description = cols[0] || '';
          const ptsNonFaitRaw = cols[1] || '0';
          const ptsPartielRaw = cols[2] || '';
          const ptsFaitRaw = cols[3] || '2';
          const critiqueRaw = (cols[4] || '').toLowerCase().trim();

          if (description) {
            const ptsFait = parseFloat(ptsFaitRaw.replace(',', '.')) || 2.0;
            const ptsPartiel = ptsPartielRaw !== '' ? parseFloat(ptsPartielRaw.replace(',', '.')) : ptsFait * 0.5;
            const ptsNonFait = parseFloat(ptsNonFaitRaw.replace(',', '.')) || 0;
            const isCritical = ['oui', 'ok', 'yes', 'true', '1'].includes(critiqueRaw);
            
            importedCriteria.push({
              id: Date.now() + i,
              text: description,
              points_non_fait: ptsNonFait,
              points_partiel: ptsPartiel,
              points_fait: ptsFait,
              isCritical: isCritical
            });
          }
        }

        if (importedCriteria.length === 0) {
          setStatus({ type: 'error', message: 'Aucun critère valide trouvé dans le fichier.' });
          return;
        }

        setCriteria(prev => [...prev, ...importedCriteria]);
        setIsFormDirty(true);
        setStatus({
          type: 'success',
          message: `${importedCriteria.length} critère(s) importé(s) avec succès (${importedCriteria.filter(c => c.isCritical).length} critique(s)).`
        });
      } catch (error) {
        setStatus({ type: 'error', message: 'Erreur lors de la lecture du fichier CSV.' });
      }
    };
    reader.readAsText(file);
    e.target.value = null;
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
    setIsFormDirty(true);
  };

  // Submit Grid/QCM contents to server
  const handleSubmitFormContents = async (e) => {
    e.preventDefault();
    if (!selectedStationId) return;

    const currentStation = stations.find(s => s.id === parseInt(selectedStationId));
    
    let compiledCriteria = null;
    let finalPoints = parseFloat(totalPoints);

    if (currentStation.type === 'examiner_eval') {
      compiledCriteria = criteria.map(c => ({
        text: c.text,
        points_non_fait: parseFloat(c.points_non_fait !== undefined ? c.points_non_fait : 0),
        points_partiel: parseFloat(c.points_partiel !== undefined ? c.points_partiel : (c.points || 2.0) * 0.5),
        points_fait: parseFloat(c.points_fait !== undefined ? c.points_fait : (c.points || 2.0)),
        isCritical: c.isCritical
      }));
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
      setIsFormDirty(false);
      loadData(selectedExamId);
    } catch (err) {
      // Mock local update
      const st = stations.find(s => s.id === parseInt(selectedStationId));
      st.evaluation_form = {
        title: formTitle,
        total_points: finalPoints,
        criteria: compiledCriteria
      };
      setStatus({ type: 'success', message: 'Mode Démo : Contenu sauvegardé pour la station.' });
      setIsFormDirty(false);
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-extrabold t-text-heading">📅 Informations de l'Examen</h3>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] t-text-secondary font-bold uppercase whitespace-nowrap">Session :</span>
            <select
              value={selectedExamId}
              onChange={(e) => handleSelectExam(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-xl text-xs w-full sm:w-64"
            >
              <option value="new">+ Créer un nouvel examen</option>
              {exams.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.status === 'active' ? '🟢 Actif' : ex.status === 'completed' ? '📦 Archivé' : '⏸️ Brouillon'})
                </option>
              ))}
            </select>
          </div>
        </div>

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
                    {st.type === 'examiner_eval' && (!st.evaluation_form || !st.evaluation_form.criteria || st.evaluation_form.criteria.length === 0) && (
                      <span className="inline-block text-[9px] font-bold text-rose-500 mt-1 animate-pulse">
                        ⚠️ Grille vide (Aucun geste configuré)
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
              {stations.find(s => s.id === parseInt(selectedStationId))?.type === 'examiner_eval' && criteria.length === 0 && (
                <div className="p-3.5 rounded-xl border text-xs leading-relaxed animate-pulse"
                  style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}>
                  ⚠️ <b>Attention :</b> Aucun critère d'évaluation (Description du geste) n'a été configuré pour cette station clinique. Veuillez en ajouter ci-dessous ou importer un fichier CSV.
                </div>
              )}
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
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h4 className="text-xs font-bold t-text-heading uppercase">Grille Tactile - Critères de notation</h4>
                      <p className="text-[10px] t-text-secondary">Chaque critère aura son propre barème et sera noté sur <b className="t-accent">0 - 1 - 2</b>.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadCriteriaExample}
                        className="px-3 py-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-dashed border-gray-400 dark:border-gray-600 rounded-lg text-[10px] font-bold t-text-heading transition flex items-center gap-1"
                      >
                        📄 Exemple CSV
                      </button>
                      <label className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer">
                        📤 Importer CSV
                        <input
                          type="file"
                          accept=".csv,.txt"
                          className="hidden"
                          onChange={handleImportCriteriaCsv}
                        />
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 p-3.5 rounded-xl items-end border" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                    <div className="flex-1 flex flex-col gap-1 min-w-[180px]">
                      <label className="text-[9px] t-text-secondary">Description du geste</label>
                      <input 
                        type="text" 
                        value={newCritText}
                        onChange={(e) => setNewCritText(e.target.value)}
                        className="glass-input p-2 rounded-lg text-xs"
                        placeholder="Ex: Réalisation de la suture..."
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="w-16 flex flex-col gap-1">
                        <label className="text-[9px] t-text-secondary">Non fait</label>
                        <input 
                          type="number" 
                          step="0.25"
                          min="0"
                          placeholder="0"
                          value={newCritPointsNonFait}
                          onChange={(e) => setNewCritPointsNonFait(e.target.value)}
                          className="glass-input p-2 rounded-lg text-xs"
                        />
                      </div>
                      <div className="w-16 flex flex-col gap-1">
                        <label className="text-[9px] t-text-secondary">Partiel</label>
                        <input 
                          type="number" 
                          step="0.25"
                          min="0"
                          placeholder="ex: 1.5"
                          value={newCritPointsPartiel}
                          onChange={(e) => setNewCritPointsPartiel(e.target.value)}
                          className="glass-input p-2 rounded-lg text-xs"
                        />
                      </div>
                      <div className="w-16 flex flex-col gap-1">
                        <label className="text-[9px] t-text-secondary">Fait</label>
                        <input 
                          type="number" 
                          step="0.25"
                          min="0"
                          placeholder="ex: 3"
                          value={newCritPointsFait}
                          onChange={(e) => setNewCritPointsFait(e.target.value)}
                          className="glass-input p-2 rounded-lg text-xs"
                        />
                      </div>
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

                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                    {criteria.map((c, idx) => {
                      const ptsFait = c.points_fait !== undefined ? c.points_fait : (c.points || 2.0);
                      const ptsPartiel = c.points_partiel !== undefined ? c.points_partiel : ptsFait * 0.5;
                      const ptsNonFait = c.points_non_fait !== undefined ? c.points_non_fait : 0;
                      return (
                        <div key={c.id || idx} className="p-3 border rounded-xl flex items-center justify-between gap-3 text-xs" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                          <span className="font-medium t-text-heading">
                            {idx + 1}. {c.text} {c.isCritical && <b className="text-rose-500 ml-1">🚨 (Critique)</b>}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                              Barème : {ptsNonFait} | {ptsPartiel} | {ptsFait} pts
                            </span>
                            <button type="button" onClick={() => { setCriteria(criteria.filter(cr => cr.id !== c.id)); setIsFormDirty(true); }} className="t-text-muted hover:text-rose-500">❌</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {criteria.length > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-xl border text-[11px] gap-2 mt-1"
                      style={{ background: 'var(--color-bg-alt)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      <div>
                        Cumul des barèmes (Fait) : <strong className="t-accent text-xs">
                          {criteria.reduce((sum, c) => sum + parseFloat(c.points_fait !== undefined ? c.points_fait : (c.points || 0)), 0)} pts
                        </strong>
                      </div>
                      <div className="text-[10px] t-text-muted italic">
                        💡 Normalisation automatique sur {totalPoints} pts lors de l'évaluation.
                      </div>
                    </div>
                  )}
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
                          <button type="button" onClick={() => { setQcmOptions(qcmOptions.filter((_, oIdx) => oIdx !== idx)); setIsFormDirty(true); }} className="t-text-muted hover:text-rose-400">❌</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isFormDirty && (
                <button 
                  type="submit" 
                  className="w-full mt-4 py-3 text-white font-bold rounded-xl text-sm transition"
                  style={{ background: 'linear-gradient(135deg, var(--color-accent), #155E75)' }}
                >
                  💾 Enregistrer la Grille et son Barème
                </button>
              )}

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

