@echo off
echo =======================================================
echo Démarrage des serveurs ECOS-Management...
echo =======================================================

:: Start Laravel Backend on host 0.0.0.0 to allow network access
echo [1/2] Démarrage du Backend (Laravel)...
start "ECOS Backend" cmd /c "cd backend && php artisan serve --host=0.0.0.0 --port=8000"

:: Start Vite Frontend
echo [2/2] Démarrage du Frontend (Vite)...
start "ECOS Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo =======================================================
echo Les serveurs ont été lancés avec succès !
echo.
echo - Frontend (Vite) : https://localhost:5173
echo - Backend (Laravel) : http://localhost:8000
echo.
echo Vous pouvez accéder à l'application depuis d'autres
echo appareils du réseau local en utilisant l'adresse IP.
echo =======================================================
pause
