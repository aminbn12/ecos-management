import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import LogoImage from '../assets/logo.png';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const ScannerKiosk = ({ onScanSuccess }) => {
  const { activeStationId, selectStation, logout, user } = useAuth();
  const [stations, setStations] = useState([]);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanStreak, setScanStreak] = useState(false);
  const inputRef = useRef(null);

  // Camera scanner state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const html5QrCodeRef = useRef(null);
  const scannerContainerRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Fetch dynamic stations list from backend
  const fetchStations = async () => {
    try {
      const response = await axios.get('/api/admin/stations');
      setStations(response.data.stations);
    } catch (err) {
      console.warn("Backend stations lookup offline, fallback to local simulator list.");
      setStations([
        { id: 1, name: "Station 1 - Diagnostic Radiologique (Initiale)", step_number: 1, is_reserve: false, type: 'examiner_eval' },
        { id: 2, name: "Station 2 - Anesthésie Locale (Initiale)", step_number: 2, is_reserve: false, type: 'examiner_eval' },
        { id: 3, name: "Station 3 - Suture Chirurgicale (Initiale)", step_number: 3, is_reserve: false, type: 'examiner_eval' },
        { id: 4, name: "Station 4 - Préparation Cavitaire (Initiale)", step_number: 4, is_reserve: false, type: 'examiner_eval' },
        { id: 5, name: "Station 5 - Prothèse Fixe (Initiale)", step_number: 5, is_reserve: false, type: 'examiner_eval' },
        { id: 6, name: "Station 3 - QCM - Endodontie Autonome (Initiale)", step_number: 3, is_reserve: false, type: 'student_tablet' }
      ]);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const assignedStations = stations.filter(st => st.examiner_id === user?.id);

  // Auto pre-select if exactly 1 station is assigned to this examiner
  useEffect(() => {
    if (assignedStations.length === 1) {
      const assignedId = String(assignedStations[0].id);
      if (activeStationId !== assignedId) {
        selectStation(assignedId);
      }
    }
  }, [stations, user, activeStationId, selectStation, assignedStations]);

  // Intercept keyboard inputs globally to capture hardware barcode reader
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      const currentTime = Date.now();
      
      if (currentTime - lastKeyTime > 150) {
        buffer = '';
      }

      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          handleSearchMatricule(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStationId, stations]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleStationChange = (e) => {
    selectStation(e.target.value);
    setErrorMsg('');
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleSearchMatricule(manualInput.trim());
  };

  // ===== Camera Scanner Functions =====

  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        // State 2 = SCANNING, State 3 = PAUSED
        if (state === 2 || state === 3) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.warn("Error stopping camera:", err);
      }
      try {
        html5QrCodeRef.current.clear();
      } catch (err) {
        // ignore
      }
      html5QrCodeRef.current = null;
    }
    isProcessingRef.current = false;
  }, []);

  const openCamera = useCallback(async () => {
    if (!activeStationId) {
      setErrorMsg("Veuillez d'abord sélectionner votre Station d'examen.");
      return;
    }

    setCameraError('');
    setCameraOpen(true);
    isProcessingRef.current = false;

    // Small delay for DOM to render the container
    setTimeout(async () => {
      try {
        const containerId = 'camera-scanner-region';
        const containerEl = document.getElementById(containerId);
        if (!containerEl) {
          setCameraError("Impossible de trouver la zone de la caméra.");
          return;
        }

        const html5QrCode = new Html5Qrcode(containerId);
        html5QrCodeRef.current = html5QrCode;

        const qrCodeSuccessCallback = (decodedText) => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;

          // Vibrate for haptic feedback on mobile
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }

          // Close camera and process the scanned code
          closeCamera();
          handleSearchMatricule(decodedText.trim());
        };

        const config = {
          fps: 20,
          qrbox: (width, height) => {
            const minDim = Math.min(width, height);
            const size = Math.floor(minDim * 0.75);
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.ITF,
          ],
        };

        await html5QrCode.start(
          { facingMode: "environment" }, // Use rear camera
          config,
          qrCodeSuccessCallback,
          () => {} // Ignore scan failures (no barcode in frame)
        );
      } catch (err) {
        console.error("Camera error:", err);
        let msg = "Impossible d'accéder à la caméra.";
        if (err?.message?.includes('NotAllowedError') || err?.name === 'NotAllowedError') {
          msg = "Accès caméra refusé. Veuillez autoriser l'accès dans les paramètres du navigateur.";
        } else if (err?.message?.includes('NotFoundError') || err?.name === 'NotFoundError') {
          msg = "Aucune caméra détectée sur cet appareil.";
        } else if (err?.message?.includes('NotReadableError') || err?.name === 'NotReadableError') {
          msg = "La caméra est déjà utilisée par une autre application.";
        } else if (typeof err === 'string' && err.includes('secure context')) {
          msg = "La caméra nécessite une connexion HTTPS. Essayez avec Firefox Mobile.";
        }
        setCameraError(msg);
      }
    }, 300);
  }, [activeStationId]);

  const closeCamera = useCallback(async () => {
    await stopCamera();
    setCameraOpen(false);
    setCameraError('');
  }, [stopCamera]);

  // ===== End Camera Functions =====

  const handleSearchMatricule = async (matricule) => {
    if (!activeStationId) {
      setErrorMsg("Veuillez d'abord sélectionner votre Station d'examen.");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setScanStreak(false);

    try {
      const response = await axios.post('/api/examiner/scan', {
        matricule: matricule,
        station_id: parseInt(activeStationId)
      });
      
      onScanSuccess(response.data);
    } catch (err) {
      if (err.response) {
        setLoading(false);
        setErrorMsg(err.response.data.message || "Erreur de validation lors du scan.");
        return;
      }

      console.warn("Backend scanning offline, running demo mock simulation...", err);
      
      setTimeout(() => {
        setLoading(false);
        const activeStation = stations.find(s => s.id === parseInt(activeStationId));

        if (!activeStation) {
          setErrorMsg("Station configurée introuvable.");
          return;
        }

        // Demo checks
        if (matricule.toUpperCase() === 'ERROR') {
          setErrorMsg("Matricule invalide ou étudiant non répertorié.");
          return;
        }

        // Return a mock successful scan based on selected station type & config
        const mockStudent = {
          id: 42,
          name: (matricule.toUpperCase() === 'DENT-2026-042' || matricule.toUpperCase() === '002699' || matricule.toUpperCase() === 'OD0099') ? "Yassine Filali" : "Étudiant Externe (Simulé)",
          matricule: matricule.toUpperCase()
        };

        const mockForm = activeStation.evaluation_form || {
          station_id: activeStation.id,
          title: "Grille d'Évaluation Clinique " + activeStation.name,
          total_points: activeStation.type === 'student_tablet' ? 10 : 20,
          criteria: activeStation.type === 'student_tablet' ? {
            type: 'qcm',
            case_description: "Un patient de 24 ans présente une douleur intense localisée au niveau de la dent 36...",
            question_prompt: "Quel est le diagnostic le plus probable ?",
            options: [
              { text: "Parodontite apicale aiguë d'origine endodontique", points: 10, isCorrect: true },
              { text: "Pulpite irréversible", points: 0, isCorrect: false }
            ]
          } : [
            { text: "Respect des règles d'hygiène et d'asepsie", points: 5, isCritical: false },
            { text: "Qualité technique du geste clinique", points: 10, isCritical: true },
            { text: "Communication et confort du patient", points: 5, isCritical: false }
          ]
        };

        onScanSuccess({
          student: mockStudent,
          station: activeStation,
          evaluation_form: mockForm,
          progression: { id: 88, requires_jury_decision: false }
        });
      }, 600);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-8 max-w-xl mx-auto gap-6 text-center animate-fade-in" style={{ minHeight: 'calc(100vh - 60px)' }}>

      {/* Station Select */}
      <div className="w-full glass-card p-5 rounded-2xl flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-xs t-text-secondary font-semibold">Station assignée à cette tablette</label>
          {assignedStations.length === 1 ? (
            <select
              value={activeStationId}
              onChange={handleStationChange}
              disabled={true}
              className="glass-input p-3 rounded-xl text-sm opacity-80 cursor-not-allowed"
            >
              <option value={assignedStations[0].id}>
                Étape {assignedStations[0].step_number} ({assignedStations[0].is_reserve ? 'Réserve' : 'Initiale'}) - {assignedStations[0].name}
              </option>
            </select>
          ) : assignedStations.length >= 2 ? (
            <select
              value={activeStationId}
              onChange={handleStationChange}
              className="glass-input p-3 rounded-xl text-sm"
            >
              <option value="">-- Sélectionner ma Station --</option>
              {assignedStations.map(s => (
                <option key={s.id} value={s.id}>
                  Étape {s.step_number} ({s.is_reserve ? 'Réserve' : 'Initiale'}) - {s.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-4 rounded-xl text-center" style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)' }}>
              <p className="text-xs font-bold" style={{ color: 'var(--color-danger)' }}>
                ⚠️ Aucune station ne vous est assignée
              </p>
              <p className="text-[10px] mt-1 t-text-secondary">
                Veuillez contacter l'administrateur pour assigner une station à votre compte.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Scan Screen */}
      <main className={`w-full glass-card p-8 rounded-3xl border flex flex-col items-center gap-6 relative overflow-hidden transition-all duration-300 ${
        errorMsg ? 'border-rose-500/40 shadow-lg shadow-rose-500/10' : activeStationId ? 'border-cyan-500/20' : ''
      }`}>
        {activeStationId && !loading && (
          <div className="scanner-laser"></div>
        )}

        <div className="w-40 h-40 rounded-full border-4 border-cyan-500/10 flex items-center justify-center relative" style={{ background: 'var(--color-accent-bg)' }}>
          <div className="w-32 h-32 rounded-full border-2 border-cyan-500/25 flex items-center justify-center pulse-ring-slow">
            <span className="text-4xl drop-shadow">📷</span>
          </div>
          {loading && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: 'var(--color-bg)', opacity: 0.85 }}>
              <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}></div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-extrabold t-text-heading">
            {activeStationId ? 'Prêt pour le Scan' : 'Sélectionnez une station'}
          </h2>
          <p className="text-sm t-text-secondary mt-2 max-w-xs mx-auto">
            {activeStationId
              ? 'Scannez le QR code de l\'étudiant via la caméra ou saisissez le matricule manuellement.'
              : 'Veuillez attribuer une station à cette tablette ci-dessus avant de scanner.'}
          </p>
        </div>

        {/* Camera Scan Button - Main CTA */}
        {activeStationId && (
          <button
            onClick={openCamera}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl text-base shadow-lg shadow-purple-500/20 transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <span className="text-2xl">📷</span>
            Scanner par Caméra
          </button>
        )}

        {/* Manual input fallback */}
        {activeStationId && (
          <div className="w-full flex flex-col gap-2">
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }}></div>
              <span className="text-[10px] t-text-muted font-bold uppercase tracking-wider">ou saisie manuelle</span>
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }}></div>
            </div>
            <form onSubmit={handleManualSubmit} className="w-full flex gap-2 z-10">
              <input
                ref={inputRef}
                type="text"
                placeholder="Matricule (ex: 002699 - OD0099)"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-1 glass-input px-4 py-2.5 rounded-xl text-sm"
                disabled={loading}
              />
              <button
                type="submit"
                className="px-5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-sm transition duration-150"
                disabled={loading}
              >
                OK
              </button>
            </form>
          </div>
        )}

        {errorMsg && (
          <div className="w-full p-4 rounded-2xl flex flex-col gap-1 items-center animate-fade-in z-10"
            style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)' }}>
            <span className="text-lg">⚠️</span>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-danger)' }}>Scan Rejeté</span>
            <p className="text-sm mt-1 font-semibold" style={{ color: 'var(--color-danger)' }}>{errorMsg}</p>
          </div>
        )}
      </main>

      {/* ===== CAMERA SCANNER OVERLAY ===== */}
      {cameraOpen && (
        <div className="camera-overlay">
          <div className="camera-overlay-inner">
            <div className="camera-header">
              <div className="flex items-center gap-2">
                <span className="text-xl">📷</span>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Scanner QR Code</h3>
                  <p className="text-[10px] text-gray-300 opacity-80">Pointez la caméra vers le QR code de l'étudiant</p>
                </div>
              </div>
              <button
                onClick={closeCamera}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white text-lg font-bold transition-all duration-150 active:scale-90"
              >
                ✕
              </button>
            </div>

            <div className="camera-viewfinder-wrapper">
              <div id="camera-scanner-region" className="camera-viewfinder"></div>
              <div className="camera-scan-line"></div>
              <div className="camera-corner camera-corner-tl"></div>
              <div className="camera-corner camera-corner-tr"></div>
              <div className="camera-corner camera-corner-bl"></div>
              <div className="camera-corner camera-corner-br"></div>
            </div>

            {cameraError && (
              <div className="mx-4 p-4 bg-rose-950/60 border border-rose-500/30 rounded-2xl text-center">
                <span className="text-lg block mb-1">⚠️</span>
                <p className="text-sm text-rose-200 font-semibold">{cameraError}</p>
                <p className="text-xs text-rose-300/70 mt-2">
                  Essayez avec <strong>Firefox Mobile</strong> si Chrome bloque l'accès caméra sur HTTP.
                </p>
              </div>
            )}

            <div className="camera-footer">
              <p className="text-xs text-gray-300/60 text-center">
                Le scan se fait automatiquement dès qu'un QR code est détecté.
              </p>
              <button
                onClick={closeCamera}
                className="w-full py-3 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold rounded-xl text-sm transition-all duration-150 active:scale-[0.97]"
              >
                Annuler le scan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannerKiosk;

