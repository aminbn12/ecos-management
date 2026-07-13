import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EvaluationView = ({ scanData, onBackToKiosk }) => {
  const { student, station, evaluation_form } = scanData;
  const criteriaList = evaluation_form?.criteria || [];
  
  const storageScoresKey = `ecos_scores_${student.matricule}_${station.id}`;
  const storageRemarksKey = `ecos_remarks_${student.matricule}_${station.id}`;
  const storageTimerStartedKey = `ecos_timer_started_${student.matricule}_${station.id}`;
  const storageTimeLeftKey = `ecos_time_left_${student.matricule}_${station.id}`;
  const storageLastGradedKey = `ecos_last_graded_${student.matricule}_${station.id}`;

  const [scores, setScores] = useState(() => {
    const savedScores = localStorage.getItem(storageScoresKey);
    if (savedScores) {
      try {
        return JSON.parse(savedScores);
      } catch (e) {
        console.error("Failed to parse saved scores", e);
      }
    }
    const initial = {};
    criteriaList.forEach((_, idx) => {
      initial[idx] = 0;
    });
    return initial;
  });

  const [remarks, setRemarks] = useState(() => {
    return localStorage.getItem(storageRemarksKey) || '';
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  // Track if examiner has started the test
  const [timerStarted, setTimerStarted] = useState(() => {
    if (localStorage.getItem(storageTimerStartedKey) === 'true') {
      return true;
    }
    return !!scanData?.progression?.timer_started_at;
  });
  const [startingTimer, setStartingTimer] = useState(false);

  // 5-minute countdown timer (300 seconds) - sync with timer_started_at if already started
  const [timeLeft, setTimeLeft] = useState(() => {
    const savedTime = localStorage.getItem(storageTimeLeftKey);
    if (savedTime !== null) {
      return parseInt(savedTime, 10);
    }
    if (scanData?.progression?.timer_started_at) {
      const startTime = new Date(scanData.progression.timer_started_at).getTime();
      const nowTime = new Date().getTime();
      const elapsed = Math.floor((nowTime - startTime) / 1000);
      const remaining = 300 - elapsed;
      return remaining > 0 ? remaining : 0;
    }
    return 300;
  });

  useEffect(() => {
    localStorage.setItem(storageScoresKey, JSON.stringify(scores));
  }, [scores, storageScoresKey]);

  useEffect(() => {
    localStorage.setItem(storageRemarksKey, remarks);
  }, [remarks, storageRemarksKey]);

  useEffect(() => {
    if (timerStarted) {
      localStorage.setItem(storageTimerStartedKey, 'true');
    } else {
      localStorage.removeItem(storageTimerStartedKey);
    }
  }, [timerStarted, storageTimerStartedKey]);

  useEffect(() => {
    if (timerStarted && timeLeft >= 0) {
      localStorage.setItem(storageTimeLeftKey, String(timeLeft));
    }
  }, [timeLeft, timerStarted, storageTimeLeftKey]);

  useEffect(() => {
    const lastGraded = localStorage.getItem(storageLastGradedKey);
    if (lastGraded !== null) {
      setTimeout(() => {
        const element = document.getElementById(`crit-card-${lastGraded}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-cyan-500');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-cyan-500');
          }, 2000);
        }
      }, 500);
    }
  }, [storageLastGradedKey]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (submitStatus) return;
      const message = "Une évaluation est en cours. Si vous actualisez la page, vos saisies temporaires risquent d'être perdues.";
      e.returnValue = message;
      return message;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [submitStatus]);

  const handleCancel = async () => {
    const hasScores = Object.values(scores).some(v => v > 0) || remarks.trim().length > 0;
    if (timerStarted || hasScores) {
      if (!window.confirm("Êtes-vous sûr de vouloir annuler cette évaluation ? Tous les scores saisis seront perdus.")) {
        return;
      }
    }
    
    try {
      await axios.post('/api/examiner/cancel-scan', {
        matricule: student.matricule,
        station_id: station.id
      });
    } catch (err) {
      console.warn("Failed to cancel scan on backend:", err);
    }

    localStorage.removeItem(storageScoresKey);
    localStorage.removeItem(storageRemarksKey);
    localStorage.removeItem(storageTimerStartedKey);
    localStorage.removeItem(storageTimeLeftKey);
    localStorage.removeItem(storageLastGradedKey);
    localStorage.removeItem('ecos_active_scan');
    onBackToKiosk();
  };

  useEffect(() => {
    if (!timerStarted || timeLeft <= 0 || submitting || submitStatus) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timerStarted, timeLeft, submitting, submitStatus]);

  const handleStartTimer = async () => {
    setStartingTimer(true);
    try {
      await axios.post('/api/examiner/start-timer', {
        matricule: student.matricule,
        station_id: station.id
      });
      setTimerStarted(true);
    } catch (err) {
      console.warn("Backend start-timer offline, starting local timer mock.");
      setTimerStarted(true);
    } finally {
      setStartingTimer(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const maxPossiblePoints = evaluation_form?.total_points || 20;
  
  // Custom grading system: sum of individual criteria points/weights
  const sumOfWeights = criteriaList.reduce((sum, item) => {
    const ptsFait = item.points_fait !== undefined ? parseFloat(item.points_fait) : parseFloat(item.points || 2.0);
    return sum + ptsFait;
  }, 0);

  const rawScore = criteriaList.reduce((sum, item, idx) => {
    const rating = scores[idx] !== undefined ? scores[idx] : 0;
    const ptsFait = item.points_fait !== undefined ? parseFloat(item.points_fait) : parseFloat(item.points || 2.0);
    const ptsPartiel = item.points_partiel !== undefined ? parseFloat(item.points_partiel) : ptsFait * 0.5;
    const ptsNonFait = item.points_non_fait !== undefined ? parseFloat(item.points_non_fait) : 0;

    const val = rating === 2 ? ptsFait : rating === 1 ? ptsPartiel : ptsNonFait;
    return sum + val;
  }, 0);

  // Normalize raw score to be out of maxPossiblePoints (ex: 20)
  const currentTotalScore = sumOfWeights > 0 
    ? Math.round(((rawScore / sumOfWeights) * maxPossiblePoints) * 100) / 100 
    : 0;
  
  const autoPassed = currentTotalScore >= (maxPossiblePoints / 2);
  const isPassed = autoPassed;

  const failedCriticalStep = criteriaList.some((c, idx) => c.isCritical && scores[idx] === 0);

  const handleSelectScore = (idx, val) => {
    setScores(prev => ({
      ...prev,
      [idx]: val
    }));
    localStorage.setItem(storageLastGradedKey, String(idx));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = {
      matricule: student.matricule,
      station_id: station.id,
      score: currentTotalScore,
      passed: isPassed,
      remarks: remarks,
      duration: 300 - timeLeft,
      details: criteriaList.map((crit, idx) => ({
        criterion: crit.text,
        points_max: maxPossiblePoints,
        points_awarded: scores[idx] !== undefined ? scores[idx] : 0
      }))
    };

    try {
      const response = await axios.post('/api/examiner/submit', payload);
      localStorage.removeItem(storageScoresKey);
      localStorage.removeItem(storageRemarksKey);
      localStorage.removeItem(storageTimerStartedKey);
      localStorage.removeItem(storageTimeLeftKey);
      localStorage.removeItem(storageLastGradedKey);
      localStorage.removeItem('ecos_active_scan');
      setSubmitStatus({
        type: 'success',
        message: response.data.message || 'Évaluation enregistrée.',
        next: response.data.next_station
      });
    } catch (err) {
      console.warn("Backend submit offline, executing demo progression update...", err);
      
      setTimeout(() => {
        setSubmitting(false);
        const nextStep = station.is_reserve ? station.step_number + 1 : station.step_number;
        const nextIsReserve = !station.is_reserve && !isPassed;

        localStorage.removeItem(storageScoresKey);
        localStorage.removeItem(storageRemarksKey);
        localStorage.removeItem(storageTimerStartedKey);
        localStorage.removeItem(storageTimeLeftKey);
        localStorage.removeItem(storageLastGradedKey);
        localStorage.removeItem('ecos_active_scan');

        setSubmitStatus({
          type: 'success',
          message: 'Mode Démo : Résultat enregistré avec succès !',
          next: nextStep <= 5 ? {
            step_number: nextStep,
            is_reserve: nextIsReserve,
            name: `Station ${nextStep} ` + (nextIsReserve ? 'Réserve' : 'Initiale')
          } : null
        });
      }, 1000);
    }
  };

  if (submitStatus) {
    return (
      <div className="flex flex-col items-center justify-center p-6 max-w-md mx-auto text-center gap-6" style={{ minHeight: 'calc(100vh - 60px)' }}>
        <div className="glass-card p-8 rounded-3xl w-full flex flex-col items-center gap-4 animate-scale-up" style={{ border: '1px solid var(--color-success)' }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center border-2" style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-success)' }}>
            <span className="text-4xl" style={{ color: 'var(--color-success)' }}>✓</span>
          </div>
          
          <h2 className="text-2xl font-extrabold" style={{ color: 'var(--color-success)' }}>Évaluation Validée</h2>
          <p className="text-sm t-text-secondary">{submitStatus.message}</p>
          
          <div className="w-full p-4 rounded-2xl text-left flex flex-col gap-1 t-bg" style={{ border: '1px solid var(--color-border)' }}>
            <span className="text-xs t-text-muted font-bold uppercase">Candidat</span>
            <span className="text-sm font-semibold t-text-heading">{student.name} ({student.matricule})</span>
            
            <span className="text-xs t-text-muted font-bold uppercase mt-3">Score Final</span>
            <span className="text-lg font-black t-accent">{currentTotalScore} / {maxPossiblePoints} pts ({isPassed ? 'Admis' : 'Ajourné'})</span>
          </div>

          {submitStatus.next ? (
            <div className="w-full p-4 rounded-2xl text-left" style={{ background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)' }}>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase" style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)' }}>Étape Suivante Attendue</span>
              <p className="text-sm font-bold t-text-heading mt-2">
                Étape {submitStatus.next.step_number} {submitStatus.next.is_reserve ? '(Réserve)' : '(Initiale)'}
              </p>
              <p className="text-xs t-text-secondary mt-1">L'étudiant doit se diriger vers cette étape.</p>
            </div>
          ) : (
            <div className="w-full p-4 rounded-2xl text-left" style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-accent)' }}>Examen Terminé</span>
              <p className="text-sm font-bold t-text-heading mt-2">Fin du parcours ECOS</p>
              <p className="text-xs t-text-secondary mt-1">L'étudiant a complété toutes ses étapes.</p>
            </div>
          )}

          <button 
            onClick={onBackToKiosk}
            className="w-full mt-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold rounded-xl text-sm transition duration-150"
          >
            Retour au Kiosque
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto flex flex-col gap-5 animate-fade-in relative" style={{ minHeight: 'calc(100vh - 60px)' }}>
      {/* Start Timer Overlay Modal */}
      {!timerStarted && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 rounded-3xl max-w-md w-full flex flex-col items-center gap-6 animate-scale-up text-center border" style={{ borderColor: 'var(--color-accent)' }}>
            <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
              <span className="text-4xl text-cyan-400">⏱️</span>
            </div>
            
            <div>
              <h2 className="text-xl font-extrabold t-text-heading">Prêt pour l'épreuve ?</h2>
              <p className="text-xs t-text-secondary mt-1.5 leading-relaxed">
                L'étudiant <strong>{student.name}</strong> a été identifié. Assurez-vous qu'il est bien installé et prêt avant de démarrer le chronomètre.
              </p>
            </div>
            
            <div className="w-full bg-black/20 p-4 rounded-2xl text-left flex flex-col gap-1 text-xs">
              <span className="text-[10px] t-text-muted uppercase font-bold">Candidat</span>
              <span className="font-semibold t-text-heading">{student.name} ({student.matricule})</span>
              
              <span className="text-[10px] t-text-muted uppercase font-bold mt-2">Station d'examen</span>
              <span className="font-bold t-accent">{station.name} (Étape {station.step_number})</span>
            </div>

            <div className="flex gap-3 w-full">
              <button 
                onClick={handleCancel}
                className="flex-1 py-3 border rounded-xl text-xs font-bold t-text-secondary hover:bg-white/5 transition"
                style={{ borderColor: 'var(--color-border)' }}
              >
                Annuler
              </button>
              <button 
                onClick={handleStartTimer}
                disabled={startingTimer}
                className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold rounded-xl text-xs shadow-lg transition"
              >
                {startingTimer ? 'Démarrage...' : '▶ Démarrer l\'Épreuve'}
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="glass-card p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest t-accent">Candidat Actif</span>
          <h1 className="text-xl font-extrabold t-text-heading mt-0.5">{student.name}</h1>
          <p className="text-xs t-text-secondary font-mono mt-0.5">Matricule: {student.matricule}</p>
        </div>

        {!submitStatus && (
          <div className={`px-4 py-2 rounded-xl border font-mono font-black text-lg ${
            timeLeft < 60 
              ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 animate-pulse' 
              : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
          }`}>
            ⏱️ {formatTime(timeLeft)}
          </div>
        )}

        <div className="text-left sm:text-right">
          <span className="text-xs t-text-secondary font-bold uppercase">Station Assignée</span>
          <h2 className="text-sm font-bold t-text-heading mt-0.5">{station.name}</h2>
          <div className="flex gap-1.5 items-center mt-1 sm:justify-end">
            <span className="text-xs t-text-secondary">Étape {station.step_number}</span>
            {station.is_reserve ? (
              <span className="text-[9px] px-1 rounded font-extrabold uppercase" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}>Réserve</span>
            ) : (
              <span className="text-[9px] px-1 rounded font-extrabold uppercase" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}>Initiale</span>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-col gap-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xs t-text-secondary font-bold uppercase tracking-wider">Critères Cliniques</h3>
          <span className="text-xs t-text-secondary">Total: <b className="t-accent">{currentTotalScore}</b> / {maxPossiblePoints} pts</span>
        </div>

        <div className="flex flex-col gap-3">
          {criteriaList.map((item, idx) => {
            return (
              <div 
                key={idx} 
                id={`crit-card-${idx}`}
                className="glass-card p-5 rounded-2xl flex flex-col gap-3.5 transition-all duration-200"
                style={{ 
                  borderColor: scores[idx] > 0 
                    ? 'var(--color-success)' 
                    : item.isCritical 
                      ? 'var(--color-danger)' 
                      : 'var(--color-card-border)',
                  background: scores[idx] > 0 
                    ? 'var(--color-success-bg)' 
                    : item.isCritical 
                      ? 'var(--color-danger-bg)' 
                      : 'var(--color-surface)'
                }}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold t-text-heading">
                      {item.text}
                    </span>
                    {item.isCritical && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wide mt-1" style={{ color: 'var(--color-danger)' }}>
                        🚨 Étape Critique Obligatoire
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {(() => {
                      const ptsFait = item.points_fait !== undefined ? parseFloat(item.points_fait) : parseFloat(item.points || 2.0);
                      const ptsPartiel = item.points_partiel !== undefined ? parseFloat(item.points_partiel) : ptsFait * 0.5;
                      const ptsNonFait = item.points_non_fait !== undefined ? parseFloat(item.points_non_fait) : 0;
                      const selectedPoints = scores[idx] === 2 ? ptsFait : scores[idx] === 1 ? ptsPartiel : ptsNonFait;
                      return (
                        <>
                          <span className="text-sm font-extrabold t-accent block">
                            Score : {selectedPoints} pt{selectedPoints > 1 ? 's' : ''}
                          </span>
                          <span className="text-[10px] t-text-secondary">
                            (max: {ptsFait} pts)
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  {(() => {
                    const ptsFait = item.points_fait !== undefined ? parseFloat(item.points_fait) : parseFloat(item.points || 2.0);
                    const ptsPartiel = item.points_partiel !== undefined ? parseFloat(item.points_partiel) : ptsFait * 0.5;
                    const ptsNonFait = item.points_non_fait !== undefined ? parseFloat(item.points_non_fait) : 0;
                    return [
                      { val: 0, scoreVal: ptsNonFait, label: "Non fait", bgGradient: 'linear-gradient(135deg, #EF4444, #B91C1C)' },
                      { val: 1, scoreVal: ptsPartiel, label: "Partiel", bgGradient: 'linear-gradient(135deg, #F59E0B, #B45309)' },
                      { val: 2, scoreVal: ptsFait, label: "Fait", bgGradient: 'linear-gradient(135deg, #10B981, #047857)' }
                    ].map((level) => {
                      const isSelected = scores[idx] === level.val;
                      return (
                        <button
                          key={level.val}
                          type="button"
                          onClick={() => handleSelectScore(idx, level.val)}
                          className="flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition duration-150 flex flex-col items-center justify-center gap-0.5 focus:outline-none"
                          style={{
                            background: isSelected ? level.bgGradient : 'var(--color-input-bg)',
                            borderColor: isSelected ? 'transparent' : 'var(--color-input-border)',
                            color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                            boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                          }}
                        >
                          <span className="text-sm font-black">{level.scoreVal}</span>
                          <span className="text-[9px] font-medium opacity-80">{level.label}</span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <section className="glass-card p-5 rounded-2xl flex flex-col gap-4">
        {failedCriticalStep && (
          <div className="p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
            ⚠️ Une étape critique n'a pas été validée. Le candidat risque un échec à cette station.
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs t-text-muted font-bold uppercase">Résultat Provisoire</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-lg font-black`} style={{ color: isPassed ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {isPassed ? 'Admis d\'office' : 'Ajourné d\'office'}
              </span>
              <span className="text-xs t-text-secondary">
                (Seuil à 50% : {currentTotalScore} / {maxPossiblePoints} pts)
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-xs t-text-secondary font-semibold">Observations / Remarques de l'examinateur</label>
          <textarea 
            rows="2"
            placeholder="Renseignez ici d'éventuelles remarques ou anomalies sur la prestation..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="glass-input p-3 rounded-xl text-xs"
          />
        </div>
      </section>

      <footer className="flex gap-3 mt-2">
        <button 
          onClick={handleCancel}
          className="flex-1 py-3.5 rounded-xl text-sm font-bold transition duration-150 t-text-secondary"
          style={{ background: 'transparent', border: '1px solid var(--color-border)' }}
        >
          Annuler
        </button>
        <button 
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition duration-150"
        >
          {submitting ? 'Enregistrement...' : "Soumettre l'Évaluation"}
        </button>
      </footer>
    </div>
  );
};

export default EvaluationView;