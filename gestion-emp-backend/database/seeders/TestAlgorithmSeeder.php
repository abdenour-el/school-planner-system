<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Matiere;
use App\Models\Enseignant;
use App\Models\Classe;
use Illuminate\Support\Facades\DB;

class TestAlgorithmSeeder extends Seeder
{
    public function run()
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Matiere::truncate();
        Enseignant::truncate();
        Classe::truncate();
        DB::table('seances')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // ====================================================================
        // 1. CRÉATION DES MATIÈRES
        // ====================================================================
        $matieres = [
            ['nom_matiere' => 'ARABE', 'volume_horaire' => 8, 'type' => 'Pricipale'],
            ['nom_matiere' => 'FRANCAIS', 'volume_horaire' => 8, 'type' => 'Pricipale'],
            ['nom_matiere' => 'MATH', 'volume_horaire' => 7, 'type' => 'Pricipale'],
            ['nom_matiere' => 'ISLAMIC', 'volume_horaire' => 3, 'type' => 'Secondaire'],
            ['nom_matiere' => 'ANGLAIS', 'volume_horaire' => 2, 'type' => 'Secondaire'],
            ['nom_matiere' => 'SPORT', 'volume_horaire' => 1, 'type' => 'Secondaire'],
            ['nom_matiere' => 'TAMAZIGHT', 'volume_horaire' => 1, 'type' => 'Secondaire'],
            ['nom_matiere' => 'INFO', 'volume_horaire' => 1, 'type' => 'Secondaire'],
            ['nom_matiere' => 'ART', 'volume_horaire' => 1, 'type' => 'Secondaire'],
        ];

        $matiereModels = [];
        foreach ($matieres as $m) {
            $matiereModels[$m['nom_matiere']] = Matiere::create([
                'nom_matiere' => $m['nom_matiere'],
                'volume_horaire' => $m['volume_horaire']
            ]);
        }

        // ====================================================================
        // 2. CRÉATION DES 37 CLASSES
        // ====================================================================
        $distributionClasses = ['3' => 10, '4' => 9, '5' => 9, '6' => 9];
        
        foreach ($distributionClasses as $niveau => $nombreGroupes) {
            for ($groupe = 1; $groupe <= $nombreGroupes; $groupe++) {
                Classe::create([
                    'nom_classe' => "Groupe $groupe", 
                    'niveau' => $niveau
                ]);
            }
        }

        // ====================================================================
        // 3. CRÉATION DES ENSEIGNANTS (NOMS RÉELS & HEURES STRICTES)
        // ====================================================================

        // --- FRANÇAIS (12 Profs) - Max Heures: 24h
        $françaisNames = [
            ['Hanan', 'Niba', '3'], ['Abdelhaq', 'Lghali', '3'], ['Prof', 'Fr_N3_Extra', '3'],
            ['Nawal', 'Ben Shlat', '4'], ['Kenza', 'Benshrif', '4'], ['Touria', 'El Youssoufi', '4'],
            ['Samia', 'Jiyraoui', '5'], ['Fatima Zohra', 'Fettouhi', '5'], ['Najia', 'Ben Lhabib', '5'],
            ['Halima', 'Salhi', '6'], ['Malika', 'Amzil', '6'], ['Souad', 'Boumzough', '6'],
        ];
        foreach ($françaisNames as $nom) {
            Enseignant::create([
                'nom' => $nom[1], 'prenom' => $nom[0], 'matiere_id' => $matiereModels['FRANCAIS']->id,
                'niveaux' => [$nom[2]],
                'max_heures' => 24, 
            ]);
        }

        // --- ARABE (13 Profs) - Max Heures: 24h
        $arabeNames = [
            ['Anissa', 'Balouk', '3'], ['Meryem', 'Zidani', '3'], ['ProfA', 'Arabe_N3_1', '3'], ['ProfB', 'Arabe_N3_2', '3'],
            ['Wafaa', 'Qasmi', '4'], ['Fatima', 'Amzil', '4'], ['Zakia', 'Ddani', '4'],
            ['Mustapha', 'Sakhsokhi', '5'], ['Imane', 'Talbi', '5'], ['Samira', 'Rashidi', '5'],
            ['Zhour', 'Taqi', '6'], ['Ilham', 'Mhamdi', '6'], ['Ilham', 'Hami', '6'],
        ];
        foreach ($arabeNames as $nom) {
            Enseignant::create([
                'nom' => $nom[1], 'prenom' => $nom[0], 'matiere_id' => $matiereModels['ARABE']->id,
                'niveaux' => [$nom[2]], 'max_heures' => 24,
            ]);
        }

        // --- MATH (12 Profs) - Max Heures: 21h
        $mathNames = [
            ['Nezha', 'Hmidi', '3'], ['Abdelouahed', 'Mskini', '3'], ['Prof', 'Math_N3_Extra', '3'],
            ['Othmane', 'El Assal', '4'], ['Malika', 'Atioui', '4'], ['Saida', 'Lmdani', '4'],
            ['Naima', 'Hdaoui', '5'], ['Rachida', 'Mohtaram', '5'], ['Fatima', 'Nafia', '5'],
            ['Touria', 'Taiki', '6'], ['Nezha', 'Teghzaoui', '6'], ['Fatima', 'Abou', '6'],
        ];
        foreach ($mathNames as $nom) {
            Enseignant::create([
                'nom' => $nom[1], 'prenom' => $nom[0], 'matiere_id' => $matiereModels['MATH']->id,
                'niveaux' => [$nom[2]], 'max_heures' => 21,
            ]);
        }

        // --- ISLAMIC (5 Profs) - Max Heures: 24h
        $islamicNames = [['Lahcen', 'Karimi'], ['Aicha', 'Makouri'], ['Hayat', 'Shibi'], ['Karima', 'Allami'], ['Youssef', 'Naciri']];
        foreach ($islamicNames as $nom) {
            Enseignant::create([
                'nom' => $nom[1], 'prenom' => $nom[0], 'matiere_id' => $matiereModels['ISLAMIC']->id,
                'niveaux' => ['3', '4', '5', '6'], 'max_heures' => 24,
            ]);
        }

        // --- ANGLAIS (3 Profs) - Max Heures: 24h
        $englishNames = [['Hassan', 'El Amrani'], ['Sara', 'Alaoui'], ['Yassine', 'Tazi']];
        foreach ($englishNames as $nom) {
            Enseignant::create([
                'nom' => $nom[1], 'prenom' => $nom[0], 'matiere_id' => $matiereModels['ANGLAIS']->id,
                'niveaux' => ['3', '4', '5', '6'], 'max_heures' => 24, 
            ]);
        }

        // --- AUTRES MATIÈRES (INFO, SPORT, ART, TAMAZIGHT) - Max Heures: 24h
        $autresProfs = [
            'SPORT' => [['Kamal', 'Bennani'], ['Tariq', 'Mourad'], ['Hicham', 'Fassi']],
            'ART' => [['Mounia', 'Radi'], ['Salma', 'Joundi'], ['Leila', 'Mansouri']],
            'INFO' => [['Youssef', 'Berrada'], ['Hajar', 'Touzani']],
            'TAMAZIGHT' => [['Idir', 'Ameziane'], ['Fatima', 'Oufkir']]
        ];

        foreach ($autresProfs as $mat => $profs) {
            foreach ($profs as $nom) {
                Enseignant::create([
                    'nom' => $nom[1], 'prenom' => $nom[0], 'matiere_id' => $matiereModels[$mat]->id,
                    'niveaux' => ['3', '4', '5', '6'], 'max_heures' => 24,
                ]);
            }
        }
    }
}