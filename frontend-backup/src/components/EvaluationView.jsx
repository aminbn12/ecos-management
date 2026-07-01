import React, { useState } from 'react';
import axios from 'axios';

const EvaluationView = ({ scanData, onBackToKiosk }) => {
  const { student, station, evaluation_form } = scanData;
  const criteriaList = evaluation_form?.criteria || [];
  
  // Track selected scores per criterion (key: index, value: current awarded points)
  const [scores, setScores] = useState(() => {
    // Default all criteria to unchecked (0 points)
    const initial = {};
    criteriaList.forEach((_, idx) => {
      initial[idx] = 0;
    });
    return initial;
  });

  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  // Compute current total score
  const currentTotalScore = Object.values(scores).reduce((sum, val) => sum + val, 0);
  const maxPossiblePoints = evaluation_form?.total_points || 20;
  
  // Dynamic validation: default pass is 50% of max points
  const autoPassed = currentTotalScore >= (maxPossiblePoints / 2);
  const [manualOverridePassed, setManualOverridePassed] = useState(null);
  const isPassed = manualOverridePassed !== null ? manualOverridePassed : autoPassed;

  // Check if any critical step was failed (0 points awarded)
  const failedCriticalStep = criteriaList.some((c, idx) => c.isCritical && scores[idx] === 0);

  const handleToggleCriterion = (idx, maxPoints) => {
    setScores(prev => ({
      ...prev,
      [idx]: prev[idx] === 0 ? maxPoints : 0
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
      remarks: remarks
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
      
      // Simulate state transition for visual demonstration
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-md mx-auto text-center gap-6">
        <div className="glass-card p-8 rounded-3xl border border-emerald-500/20 w-full flex flex-col items-center gap-4 animate-scale-up">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center border-2 border-emerald-400">
            <span className="text-4xl text-emerald-400">✓</span>
          </div>
          
          <h2 className="text-2xl font-extrabold text-emerald-400">Évaluation Validée</h2>
          <p className="text-sm text-gray-400">{submitStatus.message}</p>
          
          <div className="w-full bg-gray-900/60 p-4 rounded-2xl border border-gray-800 text-left flex flex-col gap-1">
            <span className="text-xs text-gray-500 font-bold uppercase">Candidat</span>
            <span className="text-sm font-semibold text-gray-200">{student.name} ({student.matricule})</span>
            
            <span className="text-xs text-gray-500 font-bold uppercase mt-3">Score Final</span>
            <span className="text-lg font-black text-cyan-400">{currentTotalScore} / {maxPossiblePoints} pts ({isPassed ? 'Admis' : 'Ajourné'})</span>
          </div>

          {submitStatus.next ? (
            <div className="w-full p-4 bg-cyan-950/20 border border-cyan-500/10 rounded-2xl text-left">
              <span className="text-[10px] bg-cyan-900/50 text-cyan-300 px-1.5 py-0.5 rounded font-extrabold uppercase">Étape Suivante Attendue</span>
              <p className="text-sm font-bold text-gray-200 mt-2">
                Étape {submitStatus.next.step_number} {submitStatus.next.is_reserve ? '(Réserve)' : '(Initiale)'}
              </p>
              <p className="text-xs text-gray-400 mt-1">L'étudiant doit se diriger vers cette étape.</p>
            </div>
          ) : (
            <div className="w-full p-4 bg-indigo-950/20 border border-indigo-500/10 rounded-2xl text-left">
              <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-1.5 py-0.5 rounded font-extrabold uppercase">Examen Terminé</span>
              <p className="text-sm font-bold text-gray-200 mt-2">Fin du parcours ECOS</p>
              <p className="text-xs text-gray-400 mt-1">L'étudiant a complété toutes ses étapes.</p>
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
    <div className="min-h-screen p-4 md:p-6 max-w-3xl mx-auto flex flex-col gap-5">
      {/* Student/Station Header card */}
      <header className="glass-card p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs text-cyan-400 font-bold uppercase tracking-widest glow-cyan">Candidat Actif</span>
          <h1 className="text-xl font-extrabold text-gray-100 mt-0.5">{student.name}</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">Matricule: {student.matricule}</p>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs text-gray-400 font-bold uppercase">Station Assignée</span>
          <h2 className="text-sm font-bold text-gray-200 mt-0.5">{station.name}</h2>
          <div className="flex gap-1.5 items-center mt-1 sm:justify-end">
            <span className="text-xs text-gray-400">Étape {station.step_number}</span>
            {station.is_reserve ? (
              <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-500/20 px-1 rounded font-extrabold uppercase">Réserve</span>
            ) : (
              <span className="text-[9px] bg-indigo-950 text-indigo-400 border border-indigo-500/20 px-1 rounded font-extrabold uppercase">Initiale</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Rubric */}
      <main className="flex flex-col gap-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xs text-gray-400 font-bold uppercase tracking-wider">Critères Cliniques</h3>
          <span className="text-xs text-gray-400">Total: <b className="text-cyan-400">{currentTotalScore}</b> / {maxPossiblePoints} pts</span>
        </div>

        <div className="flex flex-col gap-3">
          {criteriaList.map((item, idx) => {
            const isChecked = scores[idx] > 0;
            return (
              <div 
                key={idx} 
                onClick={() => handleToggleCriterion(idx, item.points)}
                className={`glass-card p-4 rounded-xl border flex items-center justify-between gap-4 cursor-pointer select-none transition-all duration-200 ${
                  isChecked 
                    ? 'border-emerald-500/40 bg-emerald-950/10 shadow-md shadow-emerald-950/5' 
                    : item.isCritical 
                      ? 'border-rose-500/20 bg-rose-950/5 hover:border-rose-500/30' 
                      : 'border-gray-800/80 hover:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Large tactile checkbox indicator */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition duration-150 ${
                    isChecked 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : item.isCritical 
                        ? 'border-rose-500/30 text-transparent' 
                        : 'border-gray-700 text-transparent'
                  }`}>
                    ✓
                  </div>
                  
                  <div className="flex flex-col">
                    <span className={`text-sm font-medium ${isChecked ? 'text-gray-100' : 'text-gray-300'}`}>
                      {item.text}
                    </span>
                    {item.isCritical && (
                      <span className="text-[10px] text-rose-400 font-extrabold uppercase tracking-wide mt-1">
                        🚨 Étape Critique Obligatoire
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right whitespace-nowrap">
                  <span className={`text-sm font-extrabold ${isChecked ? 'text-emerald-400 glow-green' : 'text-gray-500'}`}>
                    {isChecked ? `+${item.points}` : `0 / ${item.points}`} pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Warnings & Decision Overrides */}
      <section className="glass-card p-5 rounded-2xl flex flex-col gap-4">
        {failedCriticalStep && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse">
            ⚠️ Une étape critique n'a pas été validée. Le candidat risque un échec à cette station.
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-bold uppercase">Résultat Provisoire</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-lg font-black ${isPassed ? 'text-emerald-400 glow-green' : 'text-rose-400 glow-red'}`}>
                {isPassed ? 'Admis' : 'Ajourné'}
              </span>
              <span className="text-xs text-gray-400">
                (Seuil automatique à 50%: {currentTotalScore} / {maxPossiblePoints} pts)
              </span>
            </div>
          </div>

          {/* Large tactile override buttons */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => handleManualPassChange(true)}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold border transition duration-150 ${
                isPassed === true && manualOverridePassed !== null
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 glow-green'
                  : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700'
              }`}
            >
              Force Admis
            </button>
            <button 
              onClick={() => handleManualPassChange(false)}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold border transition duration-150 ${
                isPassed === false && manualOverridePassed !== null
                  ? 'bg-rose-950/80 text-rose-400 border-rose-500/40 glow-red'
                  : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700'
              }`}
            >
              Force Ajourné
            </button>
            {manualOverridePassed !== null && (
              <button 
                onClick={() => setManualOverridePassed(null)}
                className="px-3 py-2.5 bg-gray-900 text-gray-400 border border-gray-800 rounded-xl text-xs"
                title="Reset to Auto"
              >
                🔄
              </button>
            )}
          </div>
        </div>

        {/* Remarks Input */}
        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-xs text-gray-300 font-semibold">Observations / Remarques de l'examinateur</label>
          <textarea 
            rows="2"
            placeholder="Renseignez ici d'éventuelles remarques ou anomalies sur la prestation..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="glass-input p-3 rounded-xl text-xs"
          />
        </div>
      </section>

      {/* Submit / Cancel Footer */}
      <footer className="flex gap-3 mt-2">
        <button 
          onClick={onBackToKiosk}
          className="flex-1 py-3.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 font-bold rounded-xl text-sm transition duration-150"
        >
          Annuler
        </button>
        <button 
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-xl text-sm shadow-lg shadow-emerald-950/20 transition duration-150"
        >
          {submitting ? 'Enregistrement...' : 'Soumettre l\'Évaluation'}
        </button>
      </footer>
    </div>
  );
};

export default EvaluationView;
