import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import LogoImage from '../assets/logo.png';

const TabletTaskView = () => {
  const { logout } = useAuth();
  
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes default
  const [justification, setJustification] = useState('');
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(null);
  const [scanned, setScanned] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Fetch active student profile and task criteria
  const loadActiveTask = async () => {
    try {
      const response = await axios.get('/api/student/profile');
      setProfileData(response.data);
      
      const progression = response.data?.progression;
      const isScanned = progression?.scanned_at !== null;
      setScanned(isScanned);
      
      // If student has already answered or completed, reflect it
      if (progression && progression.current_station?.type === 'student_tablet') {
        const form = progression.current_station.evaluation_form;
        if (form) {
          // Preset time limit if needed
          setTimeLeft(300);
        }
      }
    } catch (err) {
      console.warn("Backend student profile offline, loading mock QCM task simulation.");
      // Preset local simulator data
      setProfileData({
        user: { name: "Yassine Filali" },
        student_profile: { matricule: "DENT-2026-042" },
        progression: {
          status: 'in_progress',
          current_station: {
            id: 3,
            name: "Endodontie - Station Clinique Autonome",
            step_number: 3,
            type: "student_tablet",
            is_reserve: false,
            evaluation_form: {
              title: "Évaluation Endodontique QCM",
              total_points: 10,
              criteria: {
                type: 'qcm',
                case_description: "Un patient de 24 ans présente une douleur intense localisée au niveau de la dent 36. L'examen radiologique révèle une image radio-claire diffuse au niveau de l'apex de la racine distale, associée à une perte de la continuité de la lamina dura.",
                question_prompt: "Quel est le diagnostic le plus probable à poser ?",
                options: [
                  { text: "Parodontite apicale aiguë d'origine endodontique", points: 10, isCorrect: true },
                  { text: "Kyste dentigère en phase de latence", points: 0, isCorrect: false },
                  { text: "Pulpite irréversible sans lyse osseuse", points: 0, isCorrect: false },
                  { text: "Améloblastome multiloculaire débutant", points: 0, isCorrect: false }
                ]
              }
            }
          }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveTask();
  }, []);

  // Polling for scan detection
  useEffect(() => {
    const progression = profileData?.progression;
    const currentStation = progression?.current_station;
    const isTabletStation = currentStation && currentStation.type === 'student_tablet';

    if (loading || !isTabletStation || scanned || submitted) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get('/api/student/check-scan');
        if (res.data.scanned) {
          setScanned(true);
          if (res.data.station) {
            setProfileData(prev => ({
              ...prev,
              progression: {
                ...prev.progression,
                current_station: res.data.station
              }
            }));
          }
        }
      } catch (err) {
        console.warn("Error polling student scan status:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [loading, profileData, scanned, submitted]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || submitted || loading) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted, loading]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleOptionSelect = (idx) => {
    if (submitted) return;
    setSelectedOptionIdx(idx);
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (selectedOptionIdx === null || submitted) return;

    setSubmitting(true);

    const student = profileData.student_profile;
    const currentStation = profileData.progression.current_station;
    const form = currentStation.evaluation_form;
    const qcm = form?.criteria || {};
    const selectedOption = qcm.options?.[selectedOptionIdx] || {};

    const payload = {
      matricule: student.matricule,
      station_id: currentStation.id,
      score: parseFloat(selectedOption.points || 0),
      passed: !!selectedOption.isCorrect,
      remarks: justification
    };

    try {
      const response = await axios.post('/api/examiner/submit', payload);
      setSubmitted(true);
      setSubmitResult({
        next: response.data.next_station
      });
    } catch (err) {
      console.warn("Backend submission offline, completing demo transition...", err);
      
      // Local demo transition logic
      setTimeout(() => {
        setSubmitting(false);
        setSubmitted(true);
        const nextStep = currentStation.step_number + 1;
        setSubmitResult({
          next: nextStep <= 5 ? {
            step_number: nextStep,
            is_reserve: false,
            name: `Station ${nextStep} Initiale`
          } : null
        });
      }, 800);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-cyan-500" style={{ background: 'var(--color-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}></div>
          <span className="text-sm font-medium t-text-heading">Chargement du questionnaire...</span>
        </div>
      </div>
    );
  }

  const progression = profileData?.progression;
  const currentStation = progression?.current_station;
  
  // Verify if they are indeed at a student tablet station
  const isTabletStation = currentStation && currentStation.type === 'student_tablet';
  const form = currentStation?.evaluation_form;
  const qcm = form?.criteria || {};
  const options = qcm.options || [];

  if (isTabletStation && !scanned) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-md mx-auto text-center gap-6" style={{ background: 'var(--color-bg)' }}>
        <div className="glass-card p-8 rounded-3xl w-full flex flex-col items-center gap-5 animate-scale-up" style={{ border: '1px solid var(--color-accent)' }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 pulse-ring" style={{ background: 'var(--color-accent-bg)', borderColor: 'var(--color-accent)' }}>
            <span className="text-4xl animate-pulse t-accent">📡</span>
          </div>
          
          <h2 className="text-xl font-bold t-text-heading">En attente du scan...</h2>
          <p className="text-xs t-text-secondary leading-relaxed max-w-xs">
            Veuillez présenter votre QR Code à l'examinateur de la station. Dès que l'examinateur aura validé votre scan, votre examen commencera automatiquement.
          </p>

          <div className="w-full p-4 rounded-2xl text-left flex flex-col gap-1.5 mt-2" style={{ background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)' }}>
            <span className="text-xs t-text-muted font-bold uppercase">Candidat</span>
            <span className="text-sm font-semibold t-text-heading">{profileData?.user?.name}</span>
            <span className="text-xs t-text-secondary font-mono">Matricule: {profileData?.student_profile?.matricule}</span>

            <span className="text-[10px] t-accent font-bold uppercase tracking-wider mt-2">Station Autonome Attendue</span>
            <span className="text-xs font-bold t-text-heading">{currentStation.name} (Étape {currentStation.step_number})</span>
          </div>

          <div className="flex flex-col items-center gap-2 w-full mt-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-ping" style={{ background: 'var(--color-accent)' }}></div>
              <span className="text-[10px] font-bold uppercase tracking-wider t-accent">Recherche de scan active...</span>
            </div>
            
            <button 
              type="button"
              onClick={() => {
                setScanned(true);
                setProfileData(prev => ({
                  ...prev,
                  progression: {
                    ...prev.progression,
                    current_station: {
                      ...prev.progression.current_station,
                      evaluation_form: prev.progression.current_station.evaluation_form || {
                        title: "Évaluation Endodontique QCM",
                        total_points: 10,
                        criteria: {
                          type: 'qcm',
                          case_description: "Un patient de 24 ans présente une douleur intense localisée au niveau de la dent 36. L'examen radiologique révèle une image radio-claire diffuse au niveau de l'apex de la racine distale, associée à une perte de la continuité de la lamina dura.",
                          question_prompt: "Quel est le diagnostic le plus probable à poser ?",
                          options: [
                            { text: "Parodontite apicale aiguë d'origine endodontique", points: 10, isCorrect: true },
                            { text: "Kyste dentigère en phase de latence", points: 0, isCorrect: false },
                            { text: "Pulpite irréversible sans lyse osseuse", points: 0, isCorrect: false }
                          ]
                        }
                      }
                    }
                  }
                }));
              }}
              className="mt-3 text-[9px] font-bold py-1.5 px-3 rounded-lg transition t-text-secondary"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-card-border)' }}
            >
              Simuler le Scan (Mode Démo)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto flex flex-col gap-6 justify-between animate-fade-in" style={{ minHeight: 'calc(100vh - 60px)' }}>
      
      {/* Sub-Header */}
      <header className="glass-card p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-extrabold uppercase tracking-wide">
            Station Autonome
          </span>
          <h1 className="text-sm font-bold t-text-heading mt-1">
            {isTabletStation ? form?.title || currentStation.name : "Salle d'attente"}
          </h1>
        </div>

        {isTabletStation && !submitted && (
          <div className={`px-4 py-2 rounded-xl border font-mono font-black text-lg ${
            timeLeft < 60 
              ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 animate-pulse' 
              : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
          }`}>
            ⏱️ {formatTime(timeLeft)}
          </div>
        )}
      </header>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col justify-center">
        {!isTabletStation ? (
          <div className="glass-card p-8 rounded-3xl text-center flex flex-col items-center gap-4">
            <span className="text-4xl">🪪</span>
            <h2 className="text-xl font-bold t-text-heading">Aucune station autonome active</h2>
            <p className="text-xs t-text-secondary max-w-sm">
              Votre station actuelle nécessite la présence physique d'un examinateur ou vous n'avez pas commencé l'examen.
            </p>
            <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20 mt-2">
              Présentez votre QR Code à l'examinateur de votre station actuelle.
            </p>
          </div>
        ) : submitted ? (
          <div className="glass-card p-8 rounded-3xl border border-emerald-500/20 text-center flex flex-col items-center gap-5 animate-scale-up">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
              <span className="text-3xl text-emerald-500">✓</span>
            </div>
            
            <h2 className="text-xl font-bold text-emerald-500">Réponse Enregistrée</h2>
            <p className="text-xs t-text-secondary max-w-sm leading-relaxed">
              Votre réponse au questionnaire a été enregistrée avec succès. Votre progression a été mise à jour.
            </p>
            
            {submitResult?.next ? (
              <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-300 rounded-xl text-xs font-semibold w-full text-left">
                🚩 <b>Étape suivante :</b> Dirigez-vous vers la station <b>{submitResult.next.name}</b> (Étape {submitResult.next.step_number}).
              </div>
            ) : (
              <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-semibold w-full text-left">
                🎉 Vous avez terminé toutes les étapes de votre parcours ECOS !
              </div>
            )}
            
            <p className="text-[10px] t-text-muted border-t pt-3 w-full" style={{ borderColor: 'var(--color-border)' }}>
              Attendez le signal sonore avant de changer de salle.
            </p>
          </div>
        ) : (
          <div className="glass-card p-6 md:p-8 rounded-3xl flex flex-col gap-5">
            {/* Case file */}
            {qcm.case_description && (
              <div className="bg-indigo-500/5 border border-indigo-500/15 p-5 rounded-2xl">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Dossier Clinique</span>
                <p className="text-sm t-text-secondary mt-2 leading-relaxed font-medium">
                  {qcm.case_description}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold t-text-heading">
                {qcm.question_prompt || "Répondez au cas ci-dessus :"}
              </p>
              
              {/* Option checkboxes */}
              <div className="flex flex-col gap-2.5 mt-4">
                {options.map((option, idx) => {
                  const isSelected = selectedOptionIdx === idx;
                  return (
                    <div 
                      key={idx}
                      onClick={() => handleOptionSelect(idx)}
                      className="p-4 rounded-xl border flex items-center gap-3 cursor-pointer select-none transition-all duration-150"
                      style={{
                        background: isSelected ? 'var(--color-accent-bg)' : 'transparent',
                        borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150"
                        style={{
                          borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                        }}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--color-accent)' }}></div>}
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 't-text-heading' : 't-text-secondary'}`}>{option.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs t-text-secondary font-semibold">Observations additionnelles (facultatif)</label>
              <textarea 
                rows="2"
                placeholder="Rédigez brièvement vos arguments ou observations..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="glass-input p-3 rounded-xl text-xs"
              />
            </div>

            <button
              onClick={handleSubmitAnswer}
              disabled={submitting || selectedOptionIdx === null}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold rounded-xl text-sm transition"
            >
              {submitting ? 'Validation...' : 'Valider ma Réponse'}
            </button>
          </div>
        )}
      </main>

      <footer className="flex justify-between items-center text-[10px] t-text-muted mt-4 px-2">
        <span>ID Tablette: TAB-08</span>
      </footer>
    </div>
  );
};

export default TabletTaskView;

