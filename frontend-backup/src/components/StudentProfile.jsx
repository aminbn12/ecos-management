import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const StudentProfile = () => {
  const { logout } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Generate mock barcode lines
  const generateBarcodeLines = (seed) => {
    // Simple pseudo-random array of widths for barcode representation
    const widths = [2, 1, 3, 2, 4, 1, 2, 3, 1, 2, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 1, 3, 4, 1, 2];
    return widths;
  };

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/student/profile');
      setProfileData(response.data);
    } catch (err) {
      console.warn("Backend student profile offline, loading mock simulation profile.");
      // Simulated response for presentation
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
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-cyan-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Chargement de votre profil...</span>
        </div>
      </div>
    );
  }

  const student = profileData?.student_profile;
  const user = profileData?.user;
  const progression = profileData?.progression;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-md mx-auto flex flex-col gap-5 justify-between">
      {/* Upper Section */}
      <div className="flex flex-col gap-5">
        <header className="flex justify-between items-center glass-card p-5 rounded-2xl">
          <div>
            <h1 className="text-lg font-extrabold text-gray-100">{user?.name}</h1>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
          <button 
            onClick={logout}
            className="px-3 py-1.5 bg-red-950/40 border border-red-500/20 text-red-300 text-xs font-semibold rounded-lg hover:bg-red-900/40 transition duration-150"
          >
            Sortir
          </button>
        </header>

        {/* Barcode Presentation Box */}
        <main className="glass-card p-6 rounded-3xl border border-cyan-500/10 flex flex-col items-center gap-5 text-center relative overflow-hidden">
          <div className="shimmer-bg absolute inset-0 pointer-events-none opacity-10"></div>
          
          <div className="flex flex-col gap-1">
            <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider glow-cyan">Code d'Identification</span>
            <p className="text-xs text-gray-400">Présentez cet écran à l'examinateur de chaque station.</p>
          </div>

          {/* SVG Vector Barcode Rendering */}
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3 w-full">
            <svg className="w-full max-w-[280px]" height="75" viewBox="0 0 100 70" preserveAspectRatio="none">
              <g fill="#000000">
                {generateBarcodeLines().map((width, idx) => {
                  // Calculate offsets to spread lines across SVG
                  const xOffset = idx * 3.1;
                  return (
                    <rect 
                      key={idx} 
                      x={xOffset} 
                      y="5" 
                      width={width * 0.4} 
                      height="60" 
                    />
                  );
                })}
              </g>
            </svg>
            <span className="text-sm font-mono font-bold text-gray-900 tracking-widest">{student?.matricule}</span>
          </div>
        </main>

        {/* Real-time progression state card */}
        <section className="glass-card p-5 rounded-2xl flex flex-col gap-3">
          <h2 className="text-xs text-gray-400 font-bold uppercase tracking-wider">État de Progression</h2>
          
          {progression?.status === 'completed' ? (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold text-center">
              🎉 Félicitations ! Vous avez validé toutes les étapes de cet examen.
            </div>
          ) : progression?.current_station ? (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                <div>
                  <span className="text-[10px] text-cyan-400 font-bold uppercase">Prochaine Étape</span>
                  <p className="text-sm font-semibold text-gray-200 mt-0.5">{progression.current_station.name}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block">Niveau</span>
                  <span className="text-xs font-bold text-cyan-400">Étape {progression.current_station.step_number}</span>
                </div>
              </div>
              
              {/* Basic guide text */}
              <p className="text-[11px] text-gray-400 leading-relaxed mt-1 text-center">
                Veuillez vous diriger calmement vers la salle correspondante et attendre l'autorisation de l'examinateur avant d'entrer.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs font-semibold text-center">
              Examen en attente de démarrage (dirigez-vous vers la Station 1).
            </div>
          )}
        </section>
      </div>

      {/* Rules Notice */}
      <footer className="text-center text-[10px] text-gray-500 max-w-xs mx-auto mt-4">
        Faculté de Médecine Dentaire UM6SS. Tout déplacement entre les salles d'examen doit s'effectuer en silence. Tout usage de téléphone portable est prohibé.
      </footer>
    </div>
  );
};

export default StudentProfile;
