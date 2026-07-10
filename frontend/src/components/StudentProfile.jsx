import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../context/ThemeContext';

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

const StudentProfile = () => {
  const { user: authUser } = useAuth();
  const { theme } = useTheme();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);

  const prevOccupiedRef = useRef(false);

  const playNotificationChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Note 1: D5
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.4);

      // Note 2: A5
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
      gain2.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.65);
      osc2.start(audioCtx.currentTime + 0.15);
      osc2.stop(audioCtx.currentTime + 0.65);
    } catch (e) {
      console.warn("AudioContext failed or blocked:", e);
    }
  };

  useEffect(() => {
    if (profileData?.progression?.status !== 'in_progress') return;
    const isScanned = profileData.progression.scanned_at !== null;
    if (isScanned) {
      prevOccupiedRef.current = false;
      return;
    }
    const currentlyOccupied = !!profileData.is_next_station_occupied;
    if (prevOccupiedRef.current === true && currentlyOccupied === false) {
      playNotificationChime();
    }
    prevOccupiedRef.current = currentlyOccupied;
  }, [profileData]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/student/profile');
      setProfileData(response.data);
      
      const inProgress = response.data.progression?.status === 'in_progress';
      localStorage.setItem('student_exam_in_progress', inProgress ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('student-status-changed', {
        detail: { inProgress }
      }));
    } catch (err) {
      console.warn("Backend student profile offline, loading mock simulation profile.");
      const mockData = {
        user: { name: "Yassine Filali", email: "yassine.filali@student.um6ss.ma" },
        student_profile: { matricule: "DENT-2026-042", level: "5" },
        progression: {
          status: 'in_progress',
          requires_jury_decision: false,
          scanned_at: null, // Set to null so the transition card displays in demo
          current_station: { name: "Anesthésie Locale", step_number: 2, is_reserve: false },
          results: [
            { score: 14.5, passed: true, station: { name: "Diagnostic Radiologique", step_number: 1 } }
          ]
        },
        show_average: true,
        average_score: 14.5,
        is_next_station_occupied: (Math.floor(Date.now() / 12000) % 2 === 0) // Toggles every 12 seconds in demo
      };
      setProfileData(mockData);

      const inProgress = mockData.progression?.status === 'in_progress';
      localStorage.setItem('student_exam_in_progress', inProgress ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('student-status-changed', {
        detail: { inProgress }
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // Poll profile updates every 4 seconds to sync scanner states
    const poll = setInterval(fetchProfile, 4000);
    return () => clearInterval(poll);
  }, []);

  // Station Timer sync logic
  useEffect(() => {
    if (!profileData?.progression?.scanned_at || profileData.progression.status !== 'in_progress') {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const scannedTime = new Date(profileData.progression.scanned_at).getTime();
      const nowTime = new Date().getTime();
      const elapsed = Math.floor((nowTime - scannedTime) / 1000);
      const remaining = 300 - elapsed; // 5 minutes limit
      return remaining > 0 ? remaining : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const rem = calculateTimeLeft();
      setTimeLeft(rem);
      if (rem <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [profileData]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds < 0) return '';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading && !profileData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}></div>
          <span className="text-sm font-medium t-text-secondary">Chargement de votre profil...</span>
        </div>
      </div>
    );
  }

  const student = profileData?.student_profile;
  const user = profileData?.user;
  const progression = profileData?.progression;

  return (
    <div className="p-4 md:p-8 max-w-md mx-auto flex flex-col gap-5 animate-fade-in">
      {/* User info card */}
      <div className="glass-card p-5 rounded-2xl">
        <h1 className="text-lg font-extrabold t-text-heading">{user?.name}</h1>
        <p className="text-xs t-text-muted mt-0.5">{user?.email}</p>
        {student?.level && (
          <span className="inline-block text-[9px] px-2 py-0.5 rounded font-bold mt-2" style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)' }}>
            📚 {getLevelLabel(student.level)}
          </span>
        )}
      </div>

      {/* Ticking active countdown chrono */}
      {timeLeft !== null && timeLeft > 0 && (
        <div className="glass-card p-5 rounded-2xl flex flex-col items-center gap-2 border animate-pulse text-center"
          style={{ borderColor: 'var(--color-warning)', background: 'var(--color-warning-bg)' }}>
          <span className="text-[10px] uppercase font-extrabold tracking-widest" style={{ color: 'var(--color-warning)' }}>⏱️ Épreuve en cours</span>
          <div className="text-3xl font-black font-mono" style={{ color: 'var(--color-warning)' }}>
            {formatTime(timeLeft)}
          </div>
          <span className="text-[9px] t-text-secondary">Veuillez réaliser votre geste clinique</span>
        </div>
      )}

      {/* QR Code Presentation */}
      <div className="glass-card p-6 rounded-3xl flex flex-col items-center gap-5 text-center relative overflow-hidden">
        <div className="shimmer-bg absolute inset-0 pointer-events-none opacity-10"></div>

        <div className="flex flex-col gap-1 relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider t-accent">Code d'Identification</span>
          <p className="text-xs t-text-secondary">Présentez cet écran à l'examinateur de la station.</p>
        </div>

        <div className="p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 w-full relative z-10"
          style={{ background: '#FFFFFF', border: '1px solid var(--color-card-border)' }}>
          {student?.matricule && (
            <QRCodeSVG
              value={student.matricule}
              size={200}
              level="H"
              bgColor="#ffffff"
              fgColor="#0f172a"
              includeMargin={false}
            />
          )}
          <span className="text-sm font-mono font-bold tracking-widest text-[#0f172a]">{student?.matricule}</span>
        </div>
      </div>

      {/* Progression state */}
      <div className="glass-card p-5 rounded-2xl flex flex-col gap-3">
        <h2 className="text-xs t-text-muted font-bold uppercase tracking-wider">État de Progression</h2>

        {profileData?.show_average && (
          <div className="p-3.5 rounded-xl border flex justify-between items-center text-xs animate-scale-up" 
            style={{ background: 'var(--color-accent-bg)', borderColor: 'var(--color-accent)' }}>
            <span className="font-semibold t-text-heading">📈 Note Moyenne Progressive :</span>
            <span className="font-black text-sm t-accent">
              {profileData.average_score !== null ? `${profileData.average_score} / 20` : 'Moyenne en attente'}
            </span>
          </div>
        )}

        {progression?.status === 'paused' ? (
          <div className="p-5 rounded-2xl border text-center animate-pulse flex flex-col gap-3"
            style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}>
            <span className="text-3xl">⏸️</span>
            <span className="text-sm font-black uppercase tracking-wider">Examen Suspendu Temporairement</span>
            <p className="text-xs font-bold leading-relaxed">
              Votre examen a été mis en pause par l'administration. Veuillez patienter calmement et vous rapprocher d'un encadrant si nécessaire.
            </p>
          </div>
        ) : progression?.status === 'completed' ? (
          profileData?.show_average ? (
            <div className="p-3 rounded-xl text-xs font-semibold text-center font-bold"
              style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              🎉 Félicitations ! Vous avez validé toutes les étapes de cet examen.
            </div>
          ) : (
            <div className="p-3.5 rounded-xl text-xs text-center font-bold border"
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              Examen terminé.
            </div>
          )
        ) : progression?.current_station ? (
          <div className="flex flex-col gap-3">
            {/* Warning if redirected to a reserve station */}
            {progression.current_station.is_reserve ? (
              <div className="p-3 rounded-xl text-xs font-semibold border leading-relaxed text-center"
                style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                ⚠️ Ajourné à l'étape principale. Veuillez vous diriger immédiatement vers l'étape de réserve.
              </div>
            ) : null}

            <div className="flex justify-between items-center glass-card p-3.5 rounded-xl">
              <div>
                <span className="text-[10px] t-accent font-bold uppercase">Prochaine Étape</span>
                <p className="text-sm font-semibold t-text-heading mt-0.5">{progression.current_station.name}</p>
                <div className="mt-1.5 flex gap-1">
                  {progression.current_station.is_reserve ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}>Réserve</span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}>Principale (Initiale)</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] t-text-muted block">Niveau</span>
                <span className="text-xs font-bold t-accent">Étape {progression.current_station.step_number}</span>
              </div>
            </div>
            {progression.scanned_at ? (
              <p className="text-[11px] t-text-secondary leading-relaxed text-center">
                Épreuve en cours. Effectuez vos gestes cliniques devant l'examinateur.
              </p>
            ) : profileData?.is_next_station_occupied ? (
              <div className="p-4 rounded-xl border text-center animate-pulse flex flex-col gap-1.5"
                style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}>
                <span className="text-xs font-black uppercase tracking-widest">🛑 Salle Occupée</span>
                <p className="text-xs font-bold leading-relaxed">
                  Votre collègue termine son épreuve. Veuillez patienter devant la porte de la salle en silence.
                </p>
                <span className="text-[10px] opacity-80">Un signal sonore retentira dès qu'elle sera libre.</span>
              </div>
            ) : (
              <div className="p-4 rounded-xl border text-center flex flex-col gap-1.5 animate-scale-up"
                style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}>
                <span className="text-xs font-black uppercase tracking-widest">🟢 Salle Disponible</span>
                <p className="text-xs font-bold leading-relaxed">
                  La salle est libre ! Vous pouvez entrer et présenter votre QR Code à l'examinateur.
                </p>
                <span className="text-[10px] opacity-80">Préparez-vous à entrer immédiatement.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl text-xs font-semibold text-center font-bold"
            style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)' }}>
            Examen en attente de démarrage (dirigez-vous vers la Station 1 Principale).
          </div>
        )}
      </div>

      {/* Rules Notice */}
      <footer className="text-center text-[10px] t-text-muted max-w-xs mx-auto mt-2">
        Faculté de Médecine Dentaire UM6SS. Tout déplacement entre les salles d'examen doit s'effectuer en silence.
      </footer>
    </div>
  );
};

export default StudentProfile;
