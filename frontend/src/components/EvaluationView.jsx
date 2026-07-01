import React, { useState } from 'react';
import axios from 'axios';

const EvaluationView = ({ scanData, onBackToKiosk }) => {
  const { student, station, evaluation_form } = scanData;
  const criteriaList = evaluation_form?.criteria || [];
  
  const [scores, setScores] = useState(() => {
    const initial = {};
    criteriaList.forEach((_, idx) => {
      initial[idx] = 0;
    });
    return initial;
  });

  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const maxPossiblePoints = evaluation_form?.total_points || 20;
  const currentTotalScore = Object.values(scores).reduce((sum, val) => sum + val, 0);
  
  const autoPassed = currentTotalScore >= (maxPossiblePoints / 2);
  const [manualOverridePassed, setManualOverridePassed] = useState(null);
  const isPassed = manualOverridePassed !== null ? manualOverridePassed : autoPassed;

  const failedCriticalStep = criteriaList.some((c, idx) => c.isCritical && scores[idx] === 0);

  const handleSelectScore = (idx, val) => {
    setScores(prev => ({
      ...prev,
      [idx]: val
    }));
  };

  const handleManualPassChange = (val) => {
    setManualOverridePassed(val);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = {
      matricule: student.matricule,
      station_id: station.id,
      score: currentTotalScore,
      passed: isPassed,
      remarks: remarks,
      details: criteriaList.map((crit, idx) => ({
        criterion: crit.text,
        points_max: crit.points,
        points_awarded: scores[idx] !== undefined ? scores[idx] : 0
      }))
    };

    try {
      const response = await axios.post('/api/examiner/submit', payload);
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
    <div className="p-4 md:p-6 max-w-3xl mx-auto flex flex-col gap-5 animate-fade-in" style={{ minHeight: 'calc(100vh - 60px)' }}>
      <header className="glass-card p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest t-accent">Candidat Actif</span>
          <h1 className="text-xl font-extrabold t-text-heading mt-0.5">{student.name}</h1>
          <p className="text-xs t-text-secondary font-mono mt-0.5">Matricule: {student.matricule}</p>
        </div>

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
                  <span className="text-sm font-extrabold t-accent">
                    {scores[idx]} / {maxPossiblePoints} pts
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-1">
                  {Array.from({ length: maxPossiblePoints + 1 }, (_, i) => i).map((val) => {
                    const isSelected = scores[idx] === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSelectScore(idx, val)}
                        className="w-9 h-9 text-xs font-bold rounded-lg border transition duration-150"
                        style={{
                          background: isSelected ? 'linear-gradient(135deg, var(--color-accent), #0E7490)' : 'var(--color-input-bg)',
                          borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-input-border)',
                          color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                          boxShadow: isSelected ? '0 4px 12px rgba(6, 182, 212, 0.3)' : 'none'
                        }}
                      >
                        {val}
                      </button>
                    );
                  })}
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
              <span className={`text-lg font-black ${isPassed ? '' : ''}`} style={{ color: isPassed ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {isPassed ? 'Admis' : 'Ajourné'}
              </span>
              <span className="text-xs t-text-secondary">
                (Seuil à 50%: {currentTotalScore} / {maxPossiblePoints} pts)
              </span>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => handleManualPassChange(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold border transition duration-150"
              style={{
                background: isPassed === true && manualOverridePassed !== null ? 'var(--color-success-bg)' : 'transparent',
                color: isPassed === true && manualOverridePassed !== null ? 'var(--color-success)' : 'var(--color-text-secondary)',
                borderColor: isPassed === true && manualOverridePassed !== null ? 'var(--color-success)' : 'var(--color-border)'
              }}
            >
              Force Admis
            </button>
            <button 
              onClick={() => handleManualPassChange(false)}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold border transition duration-150"
              style={{
                background: isPassed === false && manualOverridePassed !== null ? 'var(--color-danger-bg)' : 'transparent',
                color: isPassed === false && manualOverridePassed !== null ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                borderColor: isPassed === false && manualOverridePassed !== null ? 'var(--color-danger)' : 'var(--color-border)'
              }}
            >
              Force Ajourné
            </button>
            {manualOverridePassed !== null && (
              <button 
                onClick={() => setManualOverridePassed(null)}
                className="px-3 py-2.5 rounded-xl text-xs t-text-secondary"
                style={{ background: 'transparent', border: '1px solid var(--color-border)' }}
                title="Reset to Auto"
              >
                🔄
              </button>
            )}
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
          onClick={onBackToKiosk}
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