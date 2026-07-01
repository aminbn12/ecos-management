import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../context/ThemeContext';

const StudentProfile = () => {
  const { user: authUser } = useAuth();
  const { theme } = useTheme();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/student/profile');
      setProfileData(response.data);
    } catch (err) {
      console.warn("Backend student profile offline, loading mock simulation profile.");
      setTimeout(() => {
        setProfileData({
          user: { name: "Yassine Filali", email: "yassine.filali@student.um6ss.ma" },
          student_profile: { matricule: "DENT-2026-042" },
          progression: {
            status: 'in_progress',
            requires_jury_decision: false,
            current_station: { name: "Anesthésie Locale", step_number: 2, is_reserve: false },
            results: [
              { score: 14.5, passed: true, station: { name: "Diagnostic Radiologique", step_number: 1 } }
            ]
          }
        });
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
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
      </div>

      {/* QR Code Presentation */}
      <div className="glass-card p-6 rounded-3xl flex flex-col items-center gap-5 text-center relative overflow-hidden">
        <div className="shimmer-bg absolute inset-0 pointer-events-none opacity-10"></div>

        <div className="flex flex-col gap-1 relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider t-accent glow-cyan">Code d'Identification</span>
          <p className="text-xs t-text-secondary">Présentez cet écran à l'examinateur de chaque station.</p>
        </div>

        <div className="p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 w-full relative z-10"
          style={{ background: theme === 'light' ? '#F8FAFC' : '#FFFFFF', border: '1px solid var(--color-card-border)' }}>
          {student?.matricule && (
            <QRCodeSVG
              value={student.matricule}
              size={200}
              level="H"
              bgColor={theme === 'light' ? '#F8FAFC' : '#ffffff'}
              fgColor={theme === 'light' ? '#0f172a' : '#0f172a'}
              includeMargin={false}
            />
          )}
          <span className="text-sm font-mono font-bold tracking-widest" style={{ color: '#0f172a' }}>{student?.matricule}</span>
        </div>
      </div>

      {/* Progression state */}
      <div className="glass-card p-5 rounded-2xl flex flex-col gap-3">
        <h2 className="text-xs t-text-muted font-bold uppercase tracking-wider">État de Progression</h2>

        {progression?.status === 'completed' ? (
          <div className="p-3 rounded-xl text-xs font-semibold text-center"
            style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            🎉 Félicitations ! Vous avez validé toutes les étapes de cet examen.
          </div>
        ) : progression?.current_station ? (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center glass-card p-3 rounded-xl">
              <div>
                <span className="text-[10px] t-accent font-bold uppercase">Prochaine Étape</span>
                <p className="text-sm font-semibold t-text-heading mt-0.5">{progression.current_station.name}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] t-text-muted block">Niveau</span>
                <span className="text-xs font-bold t-accent">Étape {progression.current_station.step_number}</span>
              </div>
            </div>
            <p className="text-[11px] t-text-secondary leading-relaxed mt-1 text-center">
              Veuillez vous diriger calmement vers la salle correspondante et attendre l'autorisation de l'examinateur avant d'entrer.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-xl text-xs font-semibold text-center"
            style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent)' }}>
            Examen en attente de démarrage (dirigez-vous vers la Station 1).
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
