<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Matiere;
use App\Models\Enseignant;
use App\Models\Classe;
use App\Models\Seance;
use Illuminate\Support\Facades\DB;

class StressTestSeeder extends Seeder
{
    public function run()
    {
        //
        \Carbon\Carbon::setTestNow('2026-01-01 12:00:00');
        //
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Seance::truncate();
        Enseignant::truncate();
        Classe::truncate();
        Matiere::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $mawat = [
            ['nom' => 'Arabe', 'vol' => 8],         
            ['nom' => 'Français', 'vol' => 8],      
            ['nom' => 'Mathématiques', 'vol' => 7], 
            ['nom' => 'Islamic', 'vol' => 3],       
            ['nom' => 'Anglais', 'vol' => 2],       
            ['nom' => 'Tamazight', 'vol' => 1],      
            ['nom' => 'Art', 'vol' => 1],           
            ['nom' => 'Informatique', 'vol' => 1],  
            ['nom' => 'Sport', 'vol' => 1],         
        ];

        $matieresModels = [];
        foreach ($mawat as $m) {
            $matieresModels[] = Matiere::create(['nom_matiere' => $m['nom'], 'volume_horaire' => $m['vol']]);
        }

        $totalClasses = 32;
        $niveauxActifs = [3, 4, 5, 6]; 
        foreach ($niveauxActifs as $niv) {
            for ($groupe = 1; $groupe <= 8; $groupe++) { 
                Classe::create(['nom_classe' => "Groupe $groupe", 'niveau' => $niv]);
            }
        }

        $noms = ['Amari', 'El Omari', 'Alami', 'Benani', 'Idrissi', 'Tazi', 'Mansouri', 'Chraibi', 'Zaki', 'Fassi', 'Naciri', 'Alaoui', 'Berrada', 'Guessous', 'Filali', 'Tahiri', 'Kettani', 'Bouzidi', 'Sbai', 'Lahlou'];
        $prenoms = ['Abdenour', 'Ahmed', 'Fatima', 'Yassine', 'Sanaa', 'Omar', 'Khadija', 'Hassan', 'Laila', 'Mustapha', 'Karim', 'Salma', 'Nadia', 'Hamza', 'Hicham', 'Mouna', 'Tarik', 'Ilyas', 'Amina', 'Youssef'];
        
        $profCount = 1; 

        foreach ($matieresModels as $matiere) {
            $nomMat = strtolower($matiere->nom_matiere);
            $isMath = (strpos($nomMat, 'math') !== false);
            // 21h pour Math, 24h pour le reste
            $maxHeuresProf = $isMath ? 21 : 24;
            
            $groupesParProf = intdiv($maxHeuresProf, $matiere->volume_horaire); 
            // Arrondi supérieur strict = Le minimum de profs possible pour ne pas gaspiller d'argent
            $nombreProfsNecessaires = ceil($totalClasses / $groupesParProf);

            for ($i = 0; $i < $nombreProfsNecessaires; $i++) {
                Enseignant::create([
                    'nom' => $noms[array_rand($noms)],
                    'prenom' => $prenoms[array_rand($prenoms)] . " (P" . $profCount . ")",
                    'matiere_id' => $matiere->id,
                    'max_heures' => $maxHeuresProf,
                    'nombre_groupes' => $groupesParProf, 
                    'niveaux' => ["3", "4", "5", "6"] 
                ]);
                $profCount++;
            }
        }
    }
}