<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\StudentProfile;
use App\Models\Exam;
use App\Models\Station;
use App\Models\EvaluationForm;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Super Admin
        User::create([
            'name' => 'Admin UM6SS',
            'email' => 'admin@um6ss.ma',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
        ]);

        // 2. Create Examiners
        $examiners = [
            ['name' => 'Dr. El Alami', 'email' => 'alami@um6ss.ma', 'title' => 'Pr', 'gender' => 'male', 'age' => 45, 'specialty' => 'Parodontologie'],
            ['name' => 'Dr. Bennani', 'email' => 'bennani@um6ss.ma', 'title' => 'Dr', 'gender' => 'male', 'age' => 38, 'specialty' => 'Endodontie'],
            ['name' => 'Dr. Tazi', 'email' => 'tazi@um6ss.ma', 'title' => 'Pr', 'gender' => 'female', 'age' => 52, 'specialty' => 'Chirurgie Buccale'],
        ];

        $examinerUsers = [];
        foreach ($examiners as $ex) {
            $examinerUsers[] = User::create([
                'name' => $ex['name'],
                'email' => $ex['email'],
                'password' => Hash::make('password'),
                'role' => 'admin_examiner',
                'title' => $ex['title'],
                'gender' => $ex['gender'],
                'age' => $ex['age'],
                'specialty' => $ex['specialty'],
            ]);
        }

        // 3. Create Students
        $students = [
            ['name' => 'Amina Laroui', 'email' => 'amina@um6ss.ma', 'matricule' => '202988'],
            ['name' => 'Youssef Meziane', 'email' => 'youssef@um6ss.ma', 'matricule' => '0044D12'],
            ['name' => 'Sarah Bennani', 'email' => 'sarah@um6ss.ma', 'matricule' => '202989'],
            ['name' => 'Mehdi Sadiki', 'email' => 'mehdi@um6ss.ma', 'matricule' => '0044D13'],
            ['name' => 'Laila Tazi', 'email' => 'laila@um6ss.ma', 'matricule' => '202990'],
        ];

        foreach ($students as $stud) {
            $user = User::create([
                'name' => $stud['name'],
                'email' => $stud['email'],
                'password' => Hash::make('password'),
                'role' => 'student',
            ]);

            StudentProfile::create([
                'user_id' => $user->id,
                'matricule' => $stud['matricule'],
            ]);
        }

        // 4. Create Active Exam
        $exam = Exam::create([
            'title' => 'Examen Clinique ECOS FMD UM6SS 2026',
            'date' => '2026-06-30',
            'status' => 'active',
        ]);

        // 5. Create Stations (5 Initial & 5 Reserve)
        $stationTemplates = [
            // Initial stations
            [
                'name' => 'Prothèse Fixe',
                'step_number' => 1,
                'is_reserve' => false,
                'type' => 'examiner_eval',
                'criteria' => [
                    ['text' => 'Préparation de la dent pilier (forme, limites, dépouilles)', 'points' => 6],
                    ['text' => 'Prise d\'empreinte de précision (matériaux, nettoyage, intégrité)', 'points' => 5],
                    ['text' => 'Confection de la prothèse provisoire (adaptation, occlusion)', 'points' => 5],
                    ['text' => 'Hygiène, ergonomie et relation praticien-patient', 'points' => 4],
                ]
            ],
            [
                'name' => 'Endodontie',
                'step_number' => 2,
                'is_reserve' => false,
                'type' => 'examiner_eval',
                'criteria' => [
                    ['text' => 'Cavité d\'accès endodontique (forme de contour, visibilité)', 'points' => 5],
                    ['text' => 'Détermination de la longueur de travail (cathétérisme)', 'points' => 5],
                    ['text' => 'Mise en forme canalaire et irrigation (protocoles)', 'points' => 5],
                    ['text' => 'Obturation canalaire (adaptation du maître cône, étanchéité)', 'points' => 5],
                ]
            ],
            [
                'name' => 'Parodontologie',
                'step_number' => 3,
                'is_reserve' => false,
                'type' => 'examiner_eval',
                'criteria' => [
                    ['text' => 'Relevé du charting parodontal (profondeurs de poche, saignements)', 'points' => 5],
                    ['text' => 'Détartrage et surfaçage radiculaire (choix et tenue des instruments)', 'points' => 6],
                    ['text' => 'Instructions d\'hygiène bucco-dentaire personnalisées', 'points' => 4],
                    ['text' => 'Plan de traitement parodontal global', 'points' => 5],
                ]
            ],
            [
                'name' => 'Odontologie Conservatrice (QCM)',
                'step_number' => 4,
                'is_reserve' => false,
                'type' => 'student_tablet',
                'criteria' => [
                    ['text' => 'Question 1: Quel est le temps d\'acides de mordançage recommandé sur la dentine ?', 'points' => 5],
                    ['text' => 'Question 2: Citez deux causes majeures de sensibilité post-opératoire après une restauration au composite.', 'points' => 5],
                    ['text' => 'Question 3: Quel est le rôle principal de la couche hybride lors de l\'adhésion ?', 'points' => 5],
                    ['text' => 'Question 4: Indiquer l\'indication principale d\'un coiffage pulpaire direct.', 'points' => 5],
                ]
            ],
            [
                'name' => 'Chirurgie Buccale',
                'step_number' => 5,
                'is_reserve' => false,
                'type' => 'examiner_eval',
                'criteria' => [
                    ['text' => 'Anesthésie locale (choix de la technique, repères anatomiques)', 'points' => 5],
                    ['text' => 'Syndesmotonie et luxation dentaire (utilisation correcte des élévateurs)', 'points' => 6],
                    ['text' => 'Extraction proprement dite (mouvements, préservation de l\'alvéole)', 'points' => 5],
                    ['text' => 'Suture et recommandations post-opératoires au patient', 'points' => 4],
                ]
            ],

            // Reserve stations
            [
                'name' => 'Réserve - Prothèse Fixe',
                'step_number' => 1,
                'is_reserve' => true,
                'type' => 'examiner_eval',
                'criteria' => [
                    ['text' => 'Revue du protocole de taille périphérique de couronne', 'points' => 6],
                    ['text' => 'Sélection de la teinte et essayage d\'armature', 'points' => 5],
                    ['text' => 'Critères de scellement définitif d\'un bridge', 'points' => 5],
                    ['text' => 'Relation de travail avec le laboratoire de prothèse', 'points' => 4],
                ]
            ],
            [
                'name' => 'Réserve - Endodontie',
                'step_number' => 2,
                'is_reserve' => true,
                'type' => 'examiner_eval',
                'criteria' => [
                    ['text' => 'Identification des erreurs de préparation (butées, perforations)', 'points' => 5],
                    ['text' => 'Gestion de l\'urgence douloureuse en endodontie', 'points' => 5],
                    ['text' => 'Interprétation radiographique pré et post-opératoire', 'points' => 5],
                    ['text' => 'Critères de succès clinique à long terme d\'un traitement', 'points' => 5],
                ]
            ],
            [
                'name' => 'Réserve - Parodontologie',
                'step_number' => 3,
                'is_reserve' => true,
                'type' => 'examiner_eval',
                'criteria' => [
                    ['text' => 'Diagnostic différentiel gingivite vs parodontite', 'points' => 5],
                    ['text' => 'Utilisation des curettes de Gracey spécifiques', 'points' => 6],
                    ['text' => 'Prescriptions de bains de bouche et antibiothérapie', 'points' => 4],
                    ['text' => 'Reconnaissance des facteurs de risque systémiques', 'points' => 5],
                ]
            ],
            [
                'name' => 'Réserve - Odontologie Conservatrice (QCM)',
                'step_number' => 4,
                'is_reserve' => true,
                'type' => 'student_tablet',
                'criteria' => [
                    ['text' => 'Question 1: Quel agent chimique est couramment utilisé pour l\'hémostase lors d\'un coiffage pulpaire ?', 'points' => 5],
                    ['text' => 'Question 2: Quelle classe de ciment verre ionomère est indiquée pour la base sous composite ?', 'points' => 5],
                    ['text' => 'Question 3: Définir le facteur C (de configuration) et son importance.', 'points' => 5],
                    ['text' => 'Question 4: Expliquer le principe du mordançage sélectif de l\'émail.', 'points' => 5],
                ]
            ],
            [
                'name' => 'Réserve - Chirurgie Buccale',
                'step_number' => 5,
                'is_reserve' => true,
                'type' => 'examiner_eval',
                'criteria' => [
                    ['text' => 'Gestion d\'une complication post-extractionnelle immédiate (hémorragie)', 'points' => 5],
                    ['text' => 'Sutures en O et points simples de rapprochement', 'points' => 5],
                    ['text' => 'Prescription médicale post-extractionnelle type', 'points' => 5],
                    ['text' => 'Comportement d\'urgence face à un malaise vagal au fauteuil', 'points' => 5],
                ]
            ],
        ];

        $examinerCount = count($examinerUsers);
        foreach ($stationTemplates as $idx => $t) {
            $examiner = $examinerUsers[$idx % $examinerCount];

            $station = Station::create([
                'exam_id' => $exam->id,
                'name' => $t['name'],
                'step_number' => $t['step_number'],
                'is_reserve' => $t['is_reserve'],
                'type' => $t['type'],
                'examiner_id' => $examiner->id,
            ]);

            EvaluationForm::create([
                'station_id' => $station->id,
                'title' => "Fiche d'Évaluation : " . $t['name'],
                'total_points' => 20,
                'criteria' => $t['criteria'],
            ]);
        }
    }
}
