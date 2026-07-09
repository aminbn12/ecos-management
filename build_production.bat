@echo off
echo =======================================================
echo Compilation et Fusion Frontend + Backend (Production)
echo =======================================================

echo [1/3] Nettoyage des anciens fichiers de production dans backend/public...
if exist "backend\public\assets" rd /s /q "backend\public\assets"
if exist "backend\public\index.html" del /q "backend\public\index.html"

echo [2/3] Compilation du Frontend (Vite)...
cd frontend
call npm run build
cd ..

echo [3/3] Copie des fichiers compilés dans le dossier public du Backend...
xcopy /e /i /y "frontend\dist\*" "backend\public\"

echo.
echo =======================================================
echo Fusion terminée avec succès !
echo Le dossier "backend" contient maintenant l'application complète.
echo Vous pouvez copier le dossier "backend" sur XAMPP htdocs
echo ou le compresser en .zip pour le serveur de la faculté.
echo =======================================================
pause
