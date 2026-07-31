<?php

namespace App\Http\Controllers;

use App\Models\Classe;
use App\Models\Matiere;
use App\Models\Enseignant;
use App\Models\Seance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class AutoGeneratorController extends Controller
{
    private $forcedSplitClasses = [];
    private $conflictTracker = []; 

    public function resetAll()
    {
        Seance::truncate();
        return response()->json(['message' => 'Toutes les séances ont été supprimées avec succès.']);
    }

    public function generate(Request $request)
    {
        set_time_limit(3600); 
        ini_set('memory_limit', '2048M');

        try {
            $request->validate(['classe_id' => 'required|exists:classes,id']);
            $classe = Classe::findOrFail($request->classe_id);

            $this->forcedSplitClasses = []; 

            DB::beginTransaction();

            // 🔥 RADAR PRE-CHECK
            $matieres = Matiere::all();
            $enseignantsParMatiere = Enseignant::whereHas('classes', function ($q) use ($classe) {
                $q->where('classes.id', $classe->id);
            })->get()->groupBy('matiere_id');

            foreach ($matieres as $m) {
                $profCollection = $enseignantsParMatiere->get($m->id);
                if (!$profCollection || $profCollection->isEmpty()) {
                    DB::rollBack();
                    return response()->json([
                        'message' => "⚠️ ERREUR D'AFFECTATION : Impossible de générer l'emploi pour {$classe->nom_classe}. Aucun professeur de " . strtoupper($m->nom_matiere) . " n'y est affecté !"
                    ], 422);
                }
            }

            $classesSacrifiees = [];
            $result = $this->resolveWithCascadingBulldozer($classe, 0, $classesSacrifiees);

            if ($result['success']) {
                DB::commit();
                $msg = 'Emploi du temps généré avec succès.';
                if (count($classesSacrifiees) > 0) {
                    $msg .= " (Le système a réorganisé " . count($classesSacrifiees) . " classe(s) conflictuelle(s) en cascade).";
                }
                return response()->json(['message' => $msg], 200);
            }

            DB::rollBack();
            $errMsg = $result['message'] ?? "Erreur de placement insurmontable.";
            return response()->json(['message' => $errMsg], 422);

        } catch (Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => "ERREUR CRITIQUE :\n" . $e->getMessage()], 500);
        }
    }

    public function generateAll(Request $request)
    {
        set_time_limit(3600);
        ini_set('memory_limit', '2048M');

        $request->validate(['niveau' => 'required|integer']);

        $classes = Classe::where('niveau', $request->niveau)->inRandomOrder()->get();

        if ($classes->isEmpty()) {
            return response()->json(['message' => "Aucune classe trouvée pour ce niveau."], 404);
        }

        Seance::whereIn('classe_id', $classes->pluck('id'))->delete();

        // 🔥 Proactive Split (2 7ta 3 classes)
        $this->forcedSplitClasses = [];
        $numToSplit = rand(2, 3); 
        $classesToSplit = $classes->random(min($numToSplit, $classes->count()));
        
        foreach ($classesToSplit as $c) {
            $this->forcedSplitClasses[$c->id] = (rand(0, 1) == 0) ? 'ARAB' : 'FRAN';
        }

        $logs = [];
        $failedClasses = [];
        $hasErrors = false;
        $matieres = Matiere::all(); 

        try {
            foreach ($classes as $classe) {
                DB::beginTransaction();

                // 🔥 RADAR PRE-CHECK
                $enseignantsParMatiere = Enseignant::whereHas('classes', function ($q) use ($classe) {
                    $q->where('classes.id', $classe->id);
                })->get()->groupBy('matiere_id');

                $missingSubject = null;
                foreach ($matieres as $m) {
                    $profCollection = $enseignantsParMatiere->get($m->id);
                    if (!$profCollection || $profCollection->isEmpty()) {
                        $missingSubject = strtoupper($m->nom_matiere);
                        break;
                    }
                }

                if ($missingSubject) {
                    DB::rollBack();
                    $hasErrors = true;
                    $logs[] = "❌ {$classe->nom_classe}";
                    $failedClasses[] = "⛔ {$classe->nom_classe} :\n⚠️ ERREUR D'AFFECTATION : Aucun professeur de {$missingSubject} n'est affecté à ce groupe !";
                    continue; 
                }

                $classesSacrifiees = [];
                $result = $this->resolveWithCascadingBulldozer($classe, 0, $classesSacrifiees);

                if ($result['success']) {
                    DB::commit();
                    $splitMsg = isset($this->forcedSplitClasses[$classe->id]) ? " (Split Anticipé : " . $this->forcedSplitClasses[$classe->id] . ")" : "";
                    $logs[] = "✔ {$classe->nom_classe}" . $splitMsg;
                } else {
                    DB::rollBack();
                    $hasErrors = true;
                    $logs[] = "❌ {$classe->nom_classe}";
                    $errMsg = $result['message'] ?? 'Erreur inconnue de placement.';
                    $failedClasses[] = "⛔ {$classe->nom_classe} :\n" . $errMsg;
                }
            }

            if ($hasErrors) {
                return response()->json([
                    'message' => "Génération incomplète ! Classes en échec :\n\n" . implode("\n\n", $failedClasses),
                    'details' => $logs
                ], 422);
            }

            return response()->json([
                'message' => "Génération terminée avec succès sans conflits.",
                'details' => $logs
            ]);

        } catch (Throwable $e) {
            return response()->json(['message' => 'Erreur système : ' . $e->getMessage()], 500);
        }
    }

    private function tryNormalAndSplit(Classe $classe, ?int $targetProfId = null, ?string $forcedSplit = null): array
    {
        // 🔥 L-FIX L-WA3ER (Random Restarts): N-jerbou 3 mrat b-toroq mkhtalfa bash i-koun Sreee3 w may-w7elsh!
        for ($attempt = 0; $attempt < 3; $attempt++) {
            
            if ($forcedSplit) {
                $res = $this->runBacktrackingEngine($classe, $forcedSplit, $targetProfId, $attempt);
                if ($res['success'] || !empty($res['missing_prof'])) return $res;
                
                $other = ($forcedSplit === 'ARAB') ? 'FRAN' : 'ARAB';
                $res = $this->runBacktrackingEngine($classe, $other, $targetProfId, $attempt);
                if ($res['success'] || !empty($res['missing_prof'])) return $res;

                $res = $this->runBacktrackingEngine($classe, null, $targetProfId, $attempt);
                if ($res['success'] || !empty($res['missing_prof'])) return $res;
                continue;
            }

            $res = $this->runBacktrackingEngine($classe, null, $targetProfId, $attempt);
            if ($res['success'] || !empty($res['missing_prof'])) return $res;

            $jokerSubjects = ['ARAB', 'FRAN'];
            shuffle($jokerSubjects); 
            
            $res = $this->runBacktrackingEngine($classe, $jokerSubjects[0], $targetProfId, $attempt);
            if ($res['success'] || !empty($res['missing_prof'])) return $res;

            $res = $this->runBacktrackingEngine($classe, $jokerSubjects[1], $targetProfId, $attempt);
            if ($res['success'] || !empty($res['missing_prof'])) return $res;
        }

        // Ila fshlou ga3 L-Mou7awalat, rje3 L-Erreur L-Khera
        return $res ?? ['success' => false];
    }

    // ====================================================================
    // CASCADING BULLDOZER — L-QNSS L-MOWAJJAH 🎯
    // ====================================================================
    private function resolveWithCascadingBulldozer(Classe $classe, int $depth = 0, array &$sacrificedClasses = []): array
    {
        Seance::where('classe_id', $classe->id)->delete();

        // "Smart Relaxation" (Tarkhiyya)
        $forcedSplit = ($depth === 0) ? ($this->forcedSplitClasses[$classe->id] ?? null) : null;

        $res = $this->tryNormalAndSplit($classe, null, $forcedSplit);
        if ($res['success']) return ['success' => true];
        
        if (!empty($res['missing_prof'])) return $res;

        $blockingProfId = $res['blocking_prof_id'] ?? null;
        $conflictingClasses = $res['conflicting_classes'] ?? [];

        if ($blockingProfId && $depth < 8) { 
            
            $toSacrifice = $conflictingClasses;

            if (empty($toSacrifice)) {
                $toSacrifice = Seance::select('classe_id')
                    ->where('enseignant_id', $blockingProfId)
                    ->where('classe_id', '!=', $classe->id)
                    ->whereNotIn('classe_id', $sacrificedClasses)
                    ->groupBy('classe_id')
                    ->pluck('classe_id')
                    ->toArray();
                shuffle($toSacrifice); 
            }

            $toSacrifice = array_slice($toSacrifice, 0, 4);

            foreach ($toSacrifice as $sacrificedClassId) {
                if (in_array($sacrificedClassId, $sacrificedClasses)) continue; 

                DB::beginTransaction(); 
                try {
                    // PHASE 1: SURGICAL STRIKE
                    Seance::where('enseignant_id', $blockingProfId)
                        ->where('classe_id', $sacrificedClassId)
                        ->delete();
                    
                    $retryRes = $this->tryNormalAndSplit($classe, null, $forcedSplit);

                    if ($retryRes['success']) {
                        $brokenClass = Classe::find($sacrificedClassId);
                        $fixRes = $this->tryNormalAndSplit($brokenClass, $blockingProfId, null);
                        
                        if ($fixRes['success']) {
                            DB::commit(); 
                            return ['success' => true];
                        }
                    }
                    DB::rollBack();
                } catch (\Exception $e) {
                    DB::rollBack();
                }

                // PHASE 2: HEAVY BULLDOZER
                DB::beginTransaction(); 
                try {
                    Seance::where('classe_id', $sacrificedClassId)->delete();
                    
                    $retryRes = $this->tryNormalAndSplit($classe, null, $forcedSplit);

                    if ($retryRes['success']) {
                        $sacrificedClasses[] = $sacrificedClassId;
                        $brokenClass = Classe::find($sacrificedClassId);
                        
                        $fixRes = $this->resolveWithCascadingBulldozer($brokenClass, $depth + 1, $sacrificedClasses);
                        
                        if ($fixRes['success']) {
                            DB::commit(); 
                            return ['success' => true];
                        }
                        array_pop($sacrificedClasses);
                    }
                    DB::rollBack();
                } catch (\Exception $e) {
                    DB::rollBack();
                }
            }
        }

        $profName = 'INCONNU';
        if ($blockingProfId) {
            $prof = Enseignant::find($blockingProfId);
            if ($prof) $profName = strtoupper("{$prof->nom} {$prof->prenom}");
        }
        return [
            'success' => false,
            'message' => "⚠️ BLOCAGE DANS LA CLASSE : {$classe->nom_classe}\nLe professeur {$profName} est saturé.\n💡 L'algorithme a ciblé les classes exactes qui ont causé le conflit en même temps, mais la grille est totalement bloquée.",
            'blocking_prof_id' => $blockingProfId
        ];
    }

    // ====================================================================
    // MOKHE L-BACKTRACKING (AI HEURISTICS)
    // ====================================================================
    private $profFailCounts = [];
    private $iterations = 0;
    private $maxIterations = 50000; // 🔥 N9essna L-Iteratons 7it dnay L-Restarts bzaaf (Sree3 bzaaf db!)

    private function runBacktrackingEngine(Classe $classe, ?string $splitSubject, ?int $targetProfId = null, int $attempt = 0): array
    {
        $classeId = $classe->id;
        $matieres = Matiere::all();

        $enseignantsParMatiere = Enseignant::whereHas('classes', function ($q) use ($classeId) {
            $q->where('classes.id', $classeId);
        })->get()->groupBy('matiere_id');

        $blocksToPlace = [];
        
        foreach ($matieres as $m) {
            $profCollection = $enseignantsParMatiere->get($m->id);
            $prof = $profCollection ? $profCollection->first() : null;

            if (!$prof) {
                return [
                    'success' => false,
                    'message' => "⚠️ ERREUR D'AFFECTATION : Impossible de générer l'emploi pour {$classe->nom_classe}. Aucun professeur de " . strtoupper($m->nom_matiere) . " n'y est affecté !",
                    'blocking_prof_id' => null,
                    'conflicting_classes' => [],
                    'missing_prof' => true
                ];
            }
            
            if ($targetProfId && $prof->id != $targetProfId) continue;
            
            $nom = strtoupper($m->nom_matiere);
            $vol = (int) $m->volume_horaire;
            
            $isAssasiya = str_contains($nom, 'ARAB') || str_contains($nom, 'FRAN') || str_contains($nom, 'MATH');
            $mBlocks = [];
            
            if (str_contains($nom, 'ARAB') || str_contains($nom, 'FRAN')) {
                if ($splitSubject && str_contains($nom, $splitSubject) && $vol >= 4) {
                    $num2h = intval($vol / 2) - 1; 
                    for ($i = 0; $i < $num2h; $i++) $mBlocks[] = 2;
                    $mBlocks[] = 1; 
                    $mBlocks[] = 1; 
                    if ($vol % 2 !== 0) $mBlocks[] = 1; 
                } else {
                    for ($i = 0; $i < intval($vol / 2); $i++) $mBlocks[] = 2;
                    if ($vol % 2 !== 0) $mBlocks[] = 1;
                }
            } elseif (str_contains($nom, 'MATH')) {
                for ($i = 0; $i < intval($vol / 2); $i++) $mBlocks[] = 2;
                if ($vol % 2 !== 0) $mBlocks[] = 1;
                shuffle($mBlocks); 
            } elseif (str_contains($nom, 'ISLAMIC') || str_contains($nom, 'ISLAM')) {
                $mBlocks = [2, 1];
            } elseif (str_contains($nom, 'ANG')) {
                $mBlocks = [1, 1];
                for ($i = 0; $i < $vol - 2; $i++) $mBlocks[] = 1;
            } else {
                while ($vol >= 2) { $mBlocks[] = 2; $vol -= 2; }
                if ($vol == 1) $mBlocks[] = 1;
            }

            $mCount2h = 0;
            $mCountMath = 0;

            foreach ($mBlocks as $duree) {
                $mandatory = null;
                $forbid = [];
                
                if (str_contains($nom, 'ARAB') || str_contains($nom, 'FRAN')) {
                    if ($duree == 2) {
                        if ($mCount2h == 0) $mandatory = 'Lundi';
                        elseif ($mCount2h == 1) $mandatory = 'Vendredi';
                        $mCount2h++;
                    } 
                    elseif ($duree == 1) {
                        $forbid = ['Lundi', 'Vendredi'];
                    }
                } 
                elseif (str_contains($nom, 'MATH')) {
                    if ($mCountMath == 0) $mandatory = 'Lundi';
                    elseif ($mCountMath == 1) $mandatory = 'Vendredi';
                    $mCountMath++;
                }

                $blocksToPlace[] = [
                    'matiere_id' => $m->id,
                    'prof_id'    => $prof->id,
                    'duree'      => $duree,
                    'isAssasiya' => $isAssasiya,
                    'mandatory'  => $mandatory,
                    'forbidden'  => $forbid,
                    'nom'        => $nom
                ];
            }
        }

        $allSeancesDB = Seance::where('classe_id', '!=', $classeId)->get();
        $profGrid = [];
        $profDailyLoad = [];
        $profTotalLoad = []; 

        foreach ($allSeancesDB as $s) {
            $eId = $s->enseignant_id;
            $jour = $s->jour;
            $hStart = (int) substr($s->heure_debut, 0, 2);
            $duree = (int) substr($s->heure_fin, 0, 2) - $hStart;
            $cId = $s->classe_id; 

            for ($i = 0; $i < $duree; $i++) {
                $profGrid[$eId][$jour][$hStart + $i] = $cId; 
            }
            $profDailyLoad[$eId][$jour] = ($profDailyLoad[$eId][$jour] ?? 0) + $duree;
            $profTotalLoad[$eId] = ($profTotalLoad[$eId] ?? 0) + $duree;
        }

        // 🔥 DAKA2 T-TARTIB: Khellet T-Tartib b z-zher 3la 7ssab L-Attempt bash my-w7elsh f nfs triq!
        usort($blocksToPlace, function ($a, $b) use ($profTotalLoad, $attempt) {
            $loadA = $profTotalLoad[$a['prof_id']] ?? 0;
            $loadB = $profTotalLoad[$b['prof_id']] ?? 0;

            if ($loadA >= 22 && $loadB < 22) return -1;
            if ($loadB >= 22 && $loadA < 22) return 1;

            if ($a['mandatory'] && !$b['mandatory']) return -1;
            if (!$a['mandatory'] && $b['mandatory']) return 1;
            
            if ($loadA !== $loadB) return $loadB <=> $loadA; 
            if ($a['duree'] !== $b['duree']) return $b['duree'] <=> $a['duree'];
            
            // Hna l-qaleb: khelet l-Mawad l-mtshabhin bash L-Code i-jreb triq jdida f kola attempt
            return rand(-1, 1); 
        });

        $grid = [];
        $classSubjectsDay = ['Lundi' => [], 'Mardi' => [], 'Mercredi' => [], 'Jeudi' => [], 'Vendredi' => []];
        $classProfsDay    = ['Lundi' => [], 'Mardi' => [], 'Mercredi' => [], 'Jeudi' => [], 'Vendredi' => []];

        if ($targetProfId) {
            $existingClassSeances = Seance::where('classe_id', $classeId)
                ->where('enseignant_id', '!=', $targetProfId)
                ->get();

            foreach ($existingClassSeances as $s) {
                $jour = $s->jour;
                $hStart = (int) substr($s->heure_debut, 0, 2);
                $duree = (int) substr($s->heure_fin, 0, 2) - $hStart;
                
                for ($i = 0; $i < $duree; $i++) {
                    $grid[$jour][$hStart + $i] = true; 
                }
                $classSubjectsDay[$jour][] = $s->matiere_id;
                $classProfsDay[$jour][] = $s->enseignant_id;
            }
        }
        
        $this->profFailCounts = [];
        $this->conflictTracker = []; 
        $this->iterations = 0;

        if ($this->backtrackRec($blocksToPlace, 0, $grid, $profGrid, $profDailyLoad, $classSubjectsDay, $classProfsDay)) {
            $seancesToInsert = [];
            $now = now();
            foreach (['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'] as $jour) {
                if (!isset($grid[$jour])) continue;
                $h = 9;
                while ($h <= 18) {
                    if (isset($grid[$jour][$h]) && is_array($grid[$jour][$h])) {
                        $block = $grid[$jour][$h];
                        $seancesToInsert[] = [
                            'classe_id'     => $classeId,
                            'enseignant_id' => $block['prof_id'],
                            'matiere_id'    => $block['matiere_id'],
                            'jour'          => $jour,
                            'heure_debut'   => str_pad($h, 2, '0', STR_PAD_LEFT) . ':00:00',
                            'heure_fin'     => str_pad($h + $block['duree'], 2, '0', STR_PAD_LEFT) . ':00:00',
                            'created_at'    => $now,
                            'updated_at'    => $now,
                        ];
                        $h += $block['duree'];
                    } else {
                        $h++;
                    }
                }
            }
            Seance::insert($seancesToInsert);
            return ['success' => true];
        }

        $blockingProfId = null;
        $conflictingClasses = [];
        if (!empty($this->profFailCounts)) {
            arsort($this->profFailCounts);
            $blockingProfId = array_key_first($this->profFailCounts);
            
            if (isset($this->conflictTracker[$blockingProfId])) {
                arsort($this->conflictTracker[$blockingProfId]);
                $conflictingClasses = array_keys($this->conflictTracker[$blockingProfId]);
            }
        } else {
            $blockingProfId = $blocksToPlace[0]['prof_id'] ?? null;
        }

        return [
            'success' => false,
            'blocking_prof_id' => $blockingProfId,
            'conflicting_classes' => $conflictingClasses
        ];
    }

    private function backtrackRec(array &$blocks, int $idx, array &$grid, array &$profGrid, array &$profDailyLoad, array &$classSubjectsDay, array &$classProfsDay): bool
    {
        if ($idx == count($blocks)) return true;

        if (++$this->iterations > $this->maxIterations) {
            $this->profFailCounts[$blocks[$idx]['prof_id']] = ($this->profFailCounts[$blocks[$idx]['prof_id']] ?? 0) + 100;
            return false;
        }

        $block = $blocks[$idx];
        $prof_id = $block['prof_id'];
        $duree = $block['duree'];

        $jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
        if ($block['mandatory']) {
            $jours = [$block['mandatory']];
        } else {
            // 🔥 FIX L-SOR3A (asort f blast usort): Hadi kat-sre3 L-Code 100 mra!
            $loads = [];
            foreach ($jours as $j) {
                $loads[$j] = $profDailyLoad[$prof_id][$j] ?? 0;
            }
            asort($loads); // Rttb L-Ayam mn L-khawi l-L3amer b-sor3a
            $jours = array_keys($loads);
        }

        $placed = false;

        foreach ($jours as $jour) {
            if (in_array($jour, $block['forbidden'])) continue;
            
            if (in_array($block['matiere_id'], $classSubjectsDay[$jour])) continue;
            if (in_array($prof_id, $classProfsDay[$jour])) continue;

            $profMax = $block['isAssasiya'] ? 6 : 7;
            if ($jour == 'Mercredi') $profMax = min($profMax, 4);
            if (($profDailyLoad[$prof_id][$jour] ?? 0) + $duree > $profMax) continue;

            $heures = [];
            if ($duree == 2) {
                $heures = ($jour == 'Mercredi') ? [9, 11] : [9, 11, 16, 17];
                shuffle($heures);
            } else {
                $heuresNormal = ($jour == 'Mercredi') ? [9, 10, 11, 12] : [9, 10, 11, 12, 18];
                shuffle($heuresNormal);
                $heuresPrio = ($jour == 'Mercredi') ? [] : [16, 17]; 
                shuffle($heuresPrio);
                $heures = array_merge($heuresPrio, $heuresNormal);
            }

            foreach ($heures as $h) {
                $conflict = false;
                for ($i = 0; $i < $duree; $i++) {
                    if (isset($grid[$jour][$h + $i])) {
                        $conflict = true; break;
                    }
                    if (isset($profGrid[$prof_id][$jour][$h + $i])) {
                        $conflict = true; 
                        $conflictingClassId = $profGrid[$prof_id][$jour][$h + $i];
                        if (is_numeric($conflictingClassId)) {
                            $this->conflictTracker[$prof_id][$conflictingClassId] = ($this->conflictTracker[$prof_id][$conflictingClassId] ?? 0) + 1;
                        }
                        break;
                    }
                }
                if ($conflict) continue;

                for ($i = 0; $i < $duree; $i++) {
                    $grid[$jour][$h + $i] = $block;
                    $profGrid[$prof_id][$jour][$h + $i] = true;
                }
                $profDailyLoad[$prof_id][$jour] = ($profDailyLoad[$prof_id][$jour] ?? 0) + $duree;
                $classSubjectsDay[$jour][] = $block['matiere_id'];
                $classProfsDay[$jour][] = $prof_id;

                if ($this->backtrackRec($blocks, $idx + 1, $grid, $profGrid, $profDailyLoad, $classSubjectsDay, $classProfsDay)) {
                    return true;
                }

                for ($i = 0; $i < $duree; $i++) {
                    unset($grid[$jour][$h + $i]); 
                    unset($profGrid[$prof_id][$jour][$h + $i]);
                }
                $profDailyLoad[$prof_id][$jour] -= $duree;
                array_pop($classSubjectsDay[$jour]);
                array_pop($classProfsDay[$jour]);
            }
        }

        if (!$placed) {
            $this->profFailCounts[$prof_id] = ($this->profFailCounts[$prof_id] ?? 0) + 1;
        }

        return false;
    }
}