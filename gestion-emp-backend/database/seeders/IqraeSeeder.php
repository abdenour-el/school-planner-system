<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Classe;
use App\Models\Matiere;
use App\Models\Enseignant;
use App\Models\Seance;
use Illuminate\Support\Facades\DB;

class IqraeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Clear existing data to start fresh
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('classe_enseignant')->truncate();
        Seance::truncate(); // If the model is imported, otherwise DB::table('seances')->truncate();
        Enseignant::truncate();
        Classe::truncate();
        Matiere::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // =========================================================================
        // 2. CREATE SUBJECTS (MATIERES) - Total: 32h
        // =========================================================================
        $matieresData = [
            ['nom_matiere' => 'ARABE', 'type' => 'assasiya', 'volume_horaire' => 6],
            ['nom_matiere' => 'FRANCAIS', 'type' => 'assasiya', 'volume_horaire' => 6],
            ['nom_matiere' => 'MATH', 'type' => 'assasiya', 'volume_horaire' => 6],
            ['nom_matiere' => 'ISLAMIC', 'type' => 'secondaire', 'volume_horaire' => 3],
            ['nom_matiere' => 'TAMAZIGHT', 'type' => 'secondaire', 'volume_horaire' => 3],
            ['nom_matiere' => 'ANGLAIS', 'type' => 'secondaire', 'volume_horaire' => 2],
            ['nom_matiere' => 'SPORT', 'type' => 'secondaire', 'volume_horaire' => 2],
            ['nom_matiere' => 'INFO', 'type' => 'secondaire', 'volume_horaire' => 2],
            ['nom_matiere' => 'ART', 'type' => 'secondaire', 'volume_horaire' => 2],
        ];

        $matieres = [];
        foreach ($matieresData as $mData) {
            $matieres[$mData['nom_matiere']] = Matiere::create($mData);
        }

        // =========================================================================
        // 3. CREATE CLASSES (Total: 34 Classes)
        // =========================================================================
        $classesSpecs = [
            3 => 8, // 8 classes for Niveau 3
            4 => 9, // 9 classes for Niveau 4
            5 => 9, // 9 classes for Niveau 5
            6 => 8, // 8 classes for Niveau 6
        ];

        $allClasses = [];
        foreach ($classesSpecs as $niveau => $count) {
            for ($i = 1; $i <= $count; $i++) {
                $allClasses[] = Classe::create([
                    'nom_classe' => "Groupe {$i} - N {$niveau}",
                    'niveau' => $niveau
                ]);
            }
        }

        // =========================================================================
        // 4. TEACHERS DATA (Extracted precisely from the provided images)
        // =========================================================================
        $teachersConfig = [
            'ARABE' => [
                ['Balouk', 'Anissa', [3]], ['Zidani', 'Meryem', [3]], ['Somaya', 'Tahiri', [3]],
                ['Qasmi', 'Wafaa', [4]], ['Amzil', 'Fatima', [3, 4]], ['Ddani', 'Zakia', [4]],
                ['Sakhsokhi', 'Mustapha', [5]], ['Talbi', 'Imane', [5]], ['Rashidi', 'Samira', [5]],
                ['Taqi', 'Zhour', [6]], ['Mhamdi', 'Ilham', [5, 6]], ['Hani', 'Ilham', [6]]
            ],
            'FRANCAIS' => [
                ['Niba', 'Hanan', [3]], ['Lghali', 'Abdelhaq', [3]], ['Fatin', 'Moussaoui', [3]],
                ['Ben Shlat', 'Nawal', [4]], ['Benshrif', 'Kenza', [4]], ['El Youssoufi', 'Touria', [4]],
                ['Jiyraoui', 'Samia', [5]], ['Fettouhi', 'Fatima Zohra', [5]], ['Ben Lhabib', 'Najia', [5]],
                ['Salhi', 'Halima', [6]], ['Amzil', 'Malika', [6]], ['Boumzough', 'Souad', [6]]
            ],
            'MATH' => [
                ['Hmidi', 'Nezha', [3]], ['Mskini', 'Abdelouahed', [3]], ['Jabran', 'Abdelaziz', [3]],
                ['El Assal', 'Othmane', [3, 4]], ['Atioui', 'Malika', [4]], ['Lmdani', 'Saida', [4]],
                ['Hdaoui', 'Naima', [5]], ['Mohtaram', 'Rachida', [5]], ['Nafia', 'Fatima', [5]],
                ['Taiki', 'Touria', [6]], ['Teghzaoui', 'Nezha', [6]], ['Abou', 'Fatima', [6]]
            ],
            'ISLAMIC' => [
                ['Karimi', 'Lahcen', [5, 6]], ['Makouri', 'Aicha', [3, 4]], ['Shibi', 'Hayat', [4, 5]],
                ['Allami', 'Karima', [6]], ['El idrissi', 'Sanae', [3]]
            ],
            'ANGLAIS' => [
                ['Bahadi', 'Sanae', [5, 6]], ['Tifaouti', 'mrm', [4, 5]], ['masyah', 'ht', [3, 4]]
            ],
            'SPORT' => [
                ['alami', 'ft', [4, 5, 6]], ['sekkouri', 'hmd', [3, 4, 5]], ['abdellaoui', 'kh', [3]]
            ],
            'TAMAZIGHT' => [
                ['jellouli', 'mk', [3, 4, 5, 6]], ['bounssir', 'kh', [3, 4, 5, 6]]
            ],
            'INFO' => [
                ['grich', 'ft', [4, 5, 6]], ['ben taleb', 'mrm', [3, 4, 5, 6]]
            ],
            'ART' => [
                ['el khoukhi', 'abde', [3, 4]], ['mesbahi', 'zk', [4, 5, 6]]
            ],
        ];

        // Create Teachers in DB and keep a reference in memory to assign classes
        $teachersMemory = [];

        foreach ($teachersConfig as $subjectName => $teachersList) {
            $matiereId = $matieres[$subjectName]->id;
            
            foreach ($teachersList as $t) {
                $enseignant = Enseignant::create([
                    'nom' => $t[0],
                    'prenom' => $t[1],
                    'matiere_id' => $matiereId,
                    'max_heures' => 24, // Standard max hours
                ]);
                
                $teachersMemory[] = [
                    'model' => $enseignant,
                    'subject_name' => $subjectName,
                    'volume' => $matieres[$subjectName]->volume_horaire,
                    'allowed_levels' => $t[2],
                    'current_hours' => 0
                ];
            }
        }

        // =========================================================================
        // 5. AUTO-ASSIGN CLASSES TO TEACHERS (Smart Load Balancing)
        // =========================================================================
        // For each class, it needs exactly one teacher per subject
        foreach ($allClasses as $classe) {
            foreach ($matieres as $subjectName => $matiere) {
                
                // Find all teachers teaching this subject, authorized for this class level,
                // and who still have enough hours capacity (< 24h)
                $eligibleTeachers = array_filter($teachersMemory, function($t) use ($subjectName, $classe) {
                    return $t['subject_name'] === $subjectName && 
                           in_array($classe->niveau, $t['allowed_levels']) &&
                           ($t['current_hours'] + $t['volume']) <= 24; 
                });

                if (!empty($eligibleTeachers)) {
                    // Sort by who has the least hours currently to balance the load
                    usort($eligibleTeachers, function($a, $b) {
                        return $a['current_hours'] <=> $b['current_hours'];
                    });

                    // Pick the most available teacher
                    $pickedTeacherRef = &$eligibleTeachers[0];
                    
                    // Attach the class to the teacher in the database (Pivot table)
                    $pickedTeacherRef['model']->classes()->attach($classe->id);
                    
                    // Update their current hours in memory
                    // We must find the original reference in $teachersMemory to update the global count
                    foreach ($teachersMemory as &$globalRef) {
                        if ($globalRef['model']->id === $pickedTeacherRef['model']->id) {
                            $globalRef['current_hours'] += $globalRef['volume'];
                            break;
                        }
                    }
                }
            }
        }
    }
}