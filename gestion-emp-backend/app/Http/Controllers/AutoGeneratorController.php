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
    public function resetAll()
    {
        Seance::truncate();
        return response()->json(['message' => 'Toutes les séances ont été supprimées avec succès.']);
    }

    public function generate(Request $request)
    {
        // Increase time and memory limits for the complex algorithm
        set_time_limit(1200); 
        ini_set('memory_limit', '1024M'); 

        try {
            $request->validate(['classe_id' => 'required|exists:classes,id']);
            $classe = Classe::findOrFail($request->classe_id);
            
            DB::beginTransaction();
            $classesSacrifiees = []; 
            
            // Start the Backtracking (Bulldozer) Engine
            $result = $this->resolveWithBulldozer($classe, 0, $classesSacrifiees);
            
            if ($result['success']) {
                DB::commit();
                $msg = 'Emploi du temps généré avec succès.';
                if (count($classesSacrifiees) > 0) {
                    $msg .= " (L'algorithme a automatiquement réorganisé " . count($classesSacrifiees) . " autre(s) classe(s) afin libérer les enseignants.)";
                }
                return response()->json(['message' => $msg], 200);
            } else {
                DB::rollBack(); // Revert database to original state on failure
                
                // Return the precise error message without the "OPERATION ANNULEE" prefix
                return response()->json(['message' => $result['message']], 422);
            }
        } catch (Throwable $e) { 
            DB::rollBack();
            return response()->json(['message' => "ERREUR SYSTÈME CRITIQUE :\n" . $e->getMessage()], 500);
        }
    }

    // ====================================================================
    // BACKTRACKING ENGINE (BULLDOZER ALGORITHM)
    // ====================================================================
    private function resolveWithBulldozer(Classe $classe, $depth = 0, &$sacrificedClasses = []) 
    {
        // 1. Delete current class sessions to start fresh
        Seance::where('classe_id', $classe->id)->delete();
        
        // 2. Try normal generation
        $result = $this->runAlgorithm($classe);
        
        if ($result['success']) {
            return ['success' => true];
        }
        
        // 3. If it fails, check depth limit (Max 4 classes to avoid infinite loops)
        if ($depth >= 4) {
            return $result; 
        }
        
        $blockingProfId = $result['blocking_prof_id'] ?? null;
        
        if ($blockingProfId) {
            // Find an older class using this blocking professor to "steal" their hours
            $seanceToSacrifice = Seance::where('enseignant_id', $blockingProfId)
                                       ->where('classe_id', '!=', $classe->id)
                                       ->whereNotIn('classe_id', $sacrificedClasses)
                                       ->inRandomOrder()
                                       ->first();
            
            if ($seanceToSacrifice) {
                $sacrificedClassId = $seanceToSacrifice->classe_id;
                $sacrificedClasses[] = $sacrificedClassId; // Add to blacklist
                
                // DESTROY THE BLOCKING CLASS
                Seance::where('classe_id', $sacrificedClassId)->delete();
                
                // Retry generating the current class (The professor is now free)
                $retryResult = $this->runAlgorithm($classe);
                
                if ($retryResult['success']) {
                    // Success! Now we must recursively rebuild the class we just destroyed
                    $classeASacrifier = Classe::find($sacrificedClassId);
                    return $this->resolveWithBulldozer($classeASacrifier, $depth + 1, $sacrificedClasses);
                } else {
                    // Failed again despite destruction
                    return $retryResult;
                }
            }
        }
        
        return $result;
    }

    // ====================================================================
    // STANDARD GENERATION ENGINE
    // ====================================================================
    private function runAlgorithm(Classe $classe)
    {
        $classeId = $classe->id;
        $matieres = Matiere::all();
        if ($matieres->sum('volume_horaire') != 32) return ['success' => false, 'message' => "Le total des heures doit être exactement de 32h."];

        // Filter valid teachers for this class level
        $enseignantsParMatiere = Enseignant::all()->filter(function($prof) use ($classe) {
            return is_array($prof->niveaux) && in_array((string)$classe->niveau, $prof->niveaux);
        })->groupBy('matiere_id');

        $suiviMatiereInitial = [];
        $holySubjects = []; 

        // Initialize tracking and check for subjects without any teachers
        foreach ($matieres as $m) {
            if (!isset($enseignantsParMatiere[$m->id]) || $enseignantsParMatiere[$m->id]->isEmpty()) {
                return ['success' => false, 'message' => "Aucun professeur qualifié n'a été trouvé pour la matière : " . strtoupper($m->nom_matiere)];
            }
            $nomMat = strtoupper($m->nom_matiere);
            $suiviMatiereInitial[$m->id] = [
                'matiere_id' => $m->id,
                'reste' => $m->volume_horaire,
                'nom' => $nomMat,
                'enseignants' => $enseignantsParMatiere[$m->id]->values()->all() 
            ];
            if (str_contains($nomMat, 'MATH') || str_contains($nomMat, 'ARAB') || str_contains($nomMat, 'FRAN')) {
                $holySubjects[] = $m->id;
            }
        }

        // Fetch existing sessions to calculate current loads
        $allSeancesDBArray = Seance::where('classe_id', '!=', $classeId)->get()->toArray();
        $profHoursByDay = [];
        $profSessions = [];
        $profTotalHours = [];

        foreach($allSeancesDBArray as $s) {
            $eId = $s['enseignant_id'];
            $jour = $s['jour'];
            $duree = (strtotime($s['heure_fin']) - strtotime($s['heure_debut'])) / 3600;

            if(!isset($profHoursByDay[$eId][$jour])) $profHoursByDay[$eId][$jour] = 0;
            $profHoursByDay[$eId][$jour] += $duree;

            if(!isset($profTotalHours[$eId])) $profTotalHours[$eId] = 0;
            $profTotalHours[$eId] += $duree;

            if(!isset($profSessions[$eId][$jour])) $profSessions[$eId][$jour] = [];
            $profSessions[$eId][$jour][] = ['debut' => strtotime($s['heure_debut']), 'fin' => strtotime($s['heure_fin'])];
        }

        // ====================================================================
        // 🔥 PRE-CHECK: DETAILED CAPACITY VERIFICATION (THE FIX) 🔥
        // Checks if teachers have enough free hours BEFORE running the algorithm
        // ====================================================================
        $capacityErrors = [];
        foreach ($suiviMatiereInitial as $mId => $data) {
            $totalAvailableHours = 0;
            $profDetails = [];
            
            foreach ($data['enseignants'] as $prof) {
                $dbHeures = $profTotalHours[$prof->id] ?? 0;
                $dispo = max(0, $prof->max_heures - $dbHeures);
                $totalAvailableHours += $dispo;
                $profDetails[] = " {$prof->nom} {$prof->prenom} (Libre: {$dispo}h / Max: {$prof->max_heures}h)";
            }
            
            if ($totalAvailableHours < $data['reste']) {
                $details = implode("\n", $profDetails);
                $capacityErrors[] = "⚠️ DÉFICIT D'HEURES POUR '{$data['nom']}' :\n   Besoin : {$data['reste']}h | Disponibilité totale des profs : {$totalAvailableHours}h\n{$details}";
            }
        }

        // Abort immediately with detailed stats if capacity is insufficient
        if (!empty($capacityErrors)) {
            return ['success' => false, 'message' => implode("\n\n", $capacityErrors)];
        }

        $maxRetries = 8000; 
        $bestScheduleState = [];
        $minReste = 999;

        // Loop engine for combinatorial attempts
        for ($retry = 0; $retry < $maxRetries; $retry++) {
            
            $isRelaxedMode = ($retry > 2000); 
            $isPanicMode = ($retry > 4000);

            $suiviMatiere = $suiviMatiereInitial;
            $seancesToCreate = [];
            $retryFailedEarly = false;

            // 1. PROFESSOR ASSIGNMENT
            foreach ($suiviMatiere as $mId => &$data) {
                $profsValides = [];
                $isHoly = in_array($mId, $holySubjects);

                foreach ($data['enseignants'] as $prof) {
                    $dbHeures = $profTotalHours[$prof->id] ?? 0;
                    if (($prof->max_heures - $dbHeures) >= $data['reste']) {
                        
                        // Prevent overloading teachers on Monday/Friday for major subjects
                        if ($isHoly) {
                            $hLundi = $profHoursByDay[$prof->id]['Lundi'] ?? 0;
                            $hVendredi = $profHoursByDay[$prof->id]['Vendredi'] ?? 0;
                            if ($hLundi >= 6 || $hVendredi >= 6) continue; 
                        }

                        $profsValides[] = ['prof' => $prof, 'dispo' => ($prof->max_heures - $dbHeures)];
                    }
                }
                
                if (empty($profsValides)) { $retryFailedEarly = true; break; }
                
                // Sort by most available
                usort($profsValides, function($a, $b) { return $b['dispo'] <=> $a['dispo']; });
                
                // Pick a suitable professor
                $poolSize = $isRelaxedMode ? count($profsValides) : max(1, ceil(count($profsValides) / 2));
                $picked = $profsValides[array_rand(array_slice($profsValides, 0, $poolSize))];
                $data['assigned_prof'] = $picked['prof']; 
            }

            if ($retryFailedEarly) continue; 

            // Time slots initialization
            $jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
            $slots = [];
            foreach ($jours as $jour) {
                $slots[] = ['jour' => $jour, 'debut' => '09:00', 'fin' => '11:00', 'duree' => 2, 'filled' => false];
                $slots[] = ['jour' => $jour, 'debut' => '11:00', 'fin' => '13:00', 'duree' => 2, 'filled' => false];
                if ($jour !== 'Mercredi') { 
                    $slots[] = ['jour' => $jour, 'debut' => '16:00', 'fin' => '18:00', 'duree' => 2, 'filled' => false];
                    $slots[] = ['jour' => $jour, 'debut' => '18:00', 'fin' => '19:00', 'duree' => 1, 'filled' => false];
                }
            }

            // Conflict and load tracking helpers
            $getLocalHeures = function($prof_id, $jour) use (&$seancesToCreate) {
                $h = 0; foreach($seancesToCreate as $s) if($s['enseignant_id'] == $prof_id && $s['jour'] == $jour) $h += $s['duree']; return $h;
            };

            $checkConflict = function($prof_id, $jour, $debut, $fin) use (&$seancesToCreate, &$profSessions) {
                $startTS = strtotime($debut); $endTS = strtotime($fin);
                if (isset($profSessions[$prof_id][$jour])) {
                    foreach ($profSessions[$prof_id][$jour] as $s) {
                        if ($startTS < $s['fin'] && $s['debut'] < $endTS) return true;
                    }
                }
                foreach ($seancesToCreate as $sLocal) {
                    if ($sLocal['enseignant_id'] == $prof_id && $sLocal['jour'] == $jour) {
                        if ($startTS < strtotime($sLocal['heure_fin']) && strtotime($sLocal['heure_debut']) < $endTS) return true;
                    }
                }
                return false;
            };

            $hasAdjacentClass = function($prof_id, $jour, $debut, $fin) use (&$profSessions, &$seancesToCreate) {
                $debutTs = strtotime($debut); $finTs = strtotime($fin);
                if (isset($profSessions[$prof_id][$jour])) {
                    foreach ($profSessions[$prof_id][$jour] as $s) {
                        if ($s['fin'] == $debutTs || $s['debut'] == $finTs) return true;
                    }
                }
                foreach ($seancesToCreate as $sLocal) {
                    if ($sLocal['enseignant_id'] == $prof_id && $sLocal['jour'] == $jour) {
                        if (strtotime($sLocal['heure_fin']) == $debutTs || strtotime($sLocal['heure_debut']) == $finTs) return true;
                    }
                }
                return false;
            };

            // HOLY TRINITY BOOKING (Math, French, Arabic Priority)
            $math1hDay = (rand(0, 1) == 0) ? 'Lundi' : 'Vendredi';

            $bookHolyTrinity = function($jourTarget) use (&$slots, &$seancesToCreate, &$suiviMatiere, $checkConflict, $holySubjects, $classeId, $getLocalHeures, $math1hDay) {
                $matieresRequises = $holySubjects;
                shuffle($matieresRequises);

                foreach ($matieresRequises as $mId) {
                    if ($suiviMatiere[$mId]['reste'] <= 0) continue;

                    $nomMatiere = $suiviMatiere[$mId]['nom'];
                    $prof_id = $suiviMatiere[$mId]['assigned_prof']->id;

                    $dureeRequise = 2;
            

                    $placed = false;
                    $slotKeys = array_keys($slots);
                    shuffle($slotKeys);

                    foreach ($slotKeys as $k) {

                        $slot = $slots[$k];
                        if ($slot['jour'] != $jourTarget || $slot['filled']) continue;

                        $localHeures = $getLocalHeures($prof_id, $jourTarget);
                        if ($localHeures >= 6) continue;

                        $dureesATester = [];
                        if ($slot['duree'] == 2) {
                            $dureesATester = [2]; //only 2 hours allowed
                        } else {
                            $dureesATester = [1];
                        }

                        foreach ($dureesATester as $dureeRequise) {
                            if ($suiviMatiere[$mId]['reste'] < $dureeRequise) continue;
                            if ($localHeures + $dureeRequise > 6) continue;

                            $heureFin = date('H:i', strtotime($slot['debut'] . " +{$dureeRequise} hour"));
                            if ($checkConflict($prof_id, $jourTarget, $slot['debut'], $heureFin)) continue;

                            if ($dureeRequise < $slot['duree']) {
                                $slots[] = ['jour' => $jourTarget, 'debut' => $heureFin, 'fin' => $slot['fin'], 'duree' => ($slot['duree'] - $dureeRequise), 'filled' => false];
                            }

                            $seancesToCreate[] = [
                                'classe_id' => $classeId, 'enseignant_id' => $prof_id, 'matiere_id' => $mId,
                                'jour' => $jourTarget, 'heure_debut' => $slot['debut'], 'heure_fin' => $heureFin, 'duree' => $dureeRequise
                            ];
                            $slots[$k]['filled'] = true;
                            $suiviMatiere[$mId]['reste'] -= $dureeRequise;
                            $placed = true;
                            break; 
                        }
                        if ($placed) break;
                    }
                    if (!$placed) return false;
                }
                return true;
            };

            // Execute priority booking
            if (!$bookHolyTrinity('Lundi') || (!$bookHolyTrinity('Vendredi'))) continue; 

            // REMAINING SUBJECTS BOOKING
            $mathOneHourUsed = false;
            $attempts = 0;
            while ($attempts < 150) {
                $keys = array_keys($suiviMatiere);
                
                usort($keys, function($a, $b) use ($suiviMatiere, $isPanicMode, $profTotalHours) {
                    if ($isPanicMode) {
                        // Prioritize teachers with lowest free time available
                        $freeA = $suiviMatiere[$a]['assigned_prof']->max_heures - ($profTotalHours[$suiviMatiere[$a]['assigned_prof']->id] ?? 0);
                        $freeB = $suiviMatiere[$b]['assigned_prof']->max_heures - ($profTotalHours[$suiviMatiere[$b]['assigned_prof']->id] ?? 0);
                        if ($freeA != $freeB) return $freeA <=> $freeB; 
                    }
                    return $suiviMatiere[$b]['reste'] <=> $suiviMatiere[$a]['reste'];
                });
                
                $progress = false;

                foreach ($keys as $mId) {
                    if ($suiviMatiere[$mId]['reste'] <= 0) continue;
                    
                    $nomMatiere = $suiviMatiere[$mId]['nom'];
                    $prof_id = $suiviMatiere[$mId]['assigned_prof']->id;

                    $joursShuffled = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']; 
                    shuffle($joursShuffled);

                    foreach ($joursShuffled as $jour) {
                        if ($suiviMatiere[$mId]['reste'] <= 0) break;
                        
                        $dejaCeJour = false;
                        foreach($seancesToCreate as $sC) { if($sC['matiere_id'] == $mId && $sC['jour'] == $jour) { $dejaCeJour = true; break; } }
                        if($dejaCeJour) continue;
                        
                        $isIslamic = str_contains($nomMatiere, 'ISLAMIC'); 

                        $is1hStrict = str_contains($nomMatiere, 'ANG') || 
                                      str_contains($nomMatiere, 'TAMAZIGHT') ||
                                      str_contains($nomMatiere, 'ART') || 
                                      str_contains($nomMatiere, 'INFO') ||
                                      str_contains($nomMatiere, 'SPORT');
                        
                        $slotKeys = array_keys($slots); 
                        
                        usort($slotKeys, function($k1, $k2) use ($slots, $is1hStrict, $prof_id, $jour, $hasAdjacentClass, $isRelaxedMode) {
                            $slotA = $slots[$k1];
                            $slotB = $slots[$k2];
                            if ($is1hStrict && $slotA['duree'] != $slotB['duree']) return $slotA['duree'] <=> $slotB['duree']; 
                            if (!$is1hStrict && $slotA['duree'] != $slotB['duree']) return $slotB['duree'] <=> $slotA['duree']; 
                            if (!$isRelaxedMode) {
                                $adjA = $hasAdjacentClass($prof_id, $jour, $slotA['debut'], $slotA['fin']) ? 1 : 0;
                                $adjB = $hasAdjacentClass($prof_id, $jour, $slotB['debut'], $slotB['fin']) ? 1 : 0;
                                if ($adjA != $adjB) return $adjB <=> $adjA;
                            }
                            return rand(-1, 1); 
                        });

                        foreach ($slotKeys as $k) {
                            $slot = $slots[$k];
                            if ($slot['filled'] || $slot['jour'] != $jour) continue;

                            $localHeures = $getLocalHeures($prof_id, $jour);
                            if ($localHeures >= 6) continue; 

                            $maxPossible = min(2, $suiviMatiere[$mId]['reste'], $slot['duree'], (6 - $localHeures));
                            if ($maxPossible <= 0) continue;
                            
                            $isMath = str_contains($nomMatiere, 'MATH');

                            $isHolyStrict = 
                                            str_contains($nomMatiere, 'ARAB') ||
                                            str_contains($nomMatiere, 'FRAN');
                                            
                            if ($isMath){
                                if ($suiviMatiere[$mId]['reste'] == 1 && !$mathOneHourUsed){
                                    $dureeA_Prendre = 1;
                                    $mathOneHourUsed = true;
                                } else {
                                    if ($maxPossible < 2 ) continue;
                                    $dureeA_Prendre = 2;
                                }
                            }
                            elseif ($isHolyStrict){
                                if(!$isPanicMode) {
                                    if ($maxPossible < 2) continue;
                                    $dureeA_Prendre = 2;
                                } else {
                                    $dureeA_Prendre = ($maxPossible >= 2 ) ? 2 :1;
                                }   
                            } elseif ($isIslamic) {
                                $reste = $suiviMatiere[$mId]['reste'];

                                if ($reste == 3) {
                                    // First time placing Islamic: MUST be 2 hours
                                    if ($slot['duree'] < 2) continue; // Skip 1h slots for the first session
                                    $dureeA_Prendre = 2;
                                } elseif ($reste == 1) {
                                    // Second time placing Islamic: MUST be 1 hour
                                    $dureeA_Prendre = 1;
                                } else {
                                    // This case handles the 2h remainder (if for some reason the 1h was placed first)
                                    if ($slot['duree'] < 2) continue;
                                    $dureeA_Prendre = 2;
                                }

                            }elseif ($is1hStrict) {
                                $dureeA_Prendre = 1;
                            }else {
                                $dureeA_Prendre = $maxPossible;
                            }

                            $heureFin = date('H:i', strtotime($slot['debut'] . " +{$dureeA_Prendre} hour"));
                            // SAFETY GUARD: Prevent overlapping the 13:00 and 19:00 limits
                            if ($slot['debut'] < '13:00' && $heureFin > '13:00') continue;
                            if ($slot['debut'] >= '16:00' && $heureFin > '19:00') continue;

                            if ($checkConflict($prof_id, $jour, $slot['debut'], $heureFin)) continue;

                            if ($dureeA_Prendre < $slot['duree']) {
                                $slots[] = ['jour' => $jour, 'debut' => $heureFin, 'fin' => $slot['fin'], 'duree' => ($slot['duree'] - $dureeA_Prendre), 'filled' => false];
                            }

                            $seancesToCreate[] = [
                                'classe_id' => $classeId, 'enseignant_id' => $prof_id, 'matiere_id' => $mId,
                                'jour' => $jour, 'heure_debut' => $slot['debut'], 'heure_fin' => $heureFin, 'duree' => $dureeA_Prendre
                            ];
                            
                            $slots[$k]['filled'] = true;
                            $suiviMatiere[$mId]['reste'] -= $dureeA_Prendre;
                            $progress = true;
                            break; 
                    }
                }
            }
                if (!$progress) break;
                $attempts++;
            }

            $remainingHours = collect($suiviMatiere)->sum('reste');
            
            // If completely successful, save to DB
            if ($remainingHours == 0) { 
                foreach ($seancesToCreate as &$s) { 
                    unset($s['duree']); 
                    Seance::create($s); 
                }
                return ['success' => true];
            }
            
            // Track the best attempt
            if ($remainingHours < $minReste) { 
                $minReste = $remainingHours; 
                $bestScheduleState = $suiviMatiere; 
            }
        }

        // Fallback if bestScheduleState is completely empty (Rare)
        if (empty($bestScheduleState)) {
            return [
                'success' => false, 
                'message' => "❌ CONFLIT D'HORAIRE COMPLEXE :\nImpossible de générer une solution valide avec les contraintes actuelles. Modifiez manuellement ou libérez plus d'espace.",
                'blocking_prof_id' => null
            ];
        }

        // IDENTIFY BLOCKING PROFESSOR FOR BULLDOZER
        $blockingProfId = null;
        $erreurs = [];
        foreach ($bestScheduleState as $mId => $data) {
            if ($data['reste'] > 0) {
                $prof = $data['assigned_prof'];
                if ($prof && !$blockingProfId) {
                    $blockingProfId = $prof->id; 
                }
                $erreurs[] = "{$data['nom']} : Le professeur " . ($prof ? $prof->nom : 'Inconnu') . " n'a pas pu être placé à cause d'un conflit d'horaire complexe avec une autre classe.";
            }
        }
        
        return ['success' => false, 'message' => implode("\n", $erreurs), 'blocking_prof_id' => $blockingProfId];
    }


    public function generateAll(Request $request)
    {
        set_time_limit(1200);
        ini_set('memory_limit', '1024M');

        $request->validate([
            'niveau' => 'required|integer'
        ]);

        $classes = Classe::where('niveau', $request->niveau)
            ->inRandomOrder()
            ->get();

        if ($classes->isEmpty()) {
            return response()->json([
                'message' => "Aucune classe trouvée pour ce niveau."
            ], 404);
        }

        $logs = [];

        try {
            foreach ($classes as $classe) {

                DB::beginTransaction();

                $classesSacrifiees = [];

                $result = $this->resolveWithBulldozer($classe, 0, $classesSacrifiees);

                if ($result['success']) {
                    DB::commit();
                    $logs[] = "✔ {$classe->nom_classe}";
                } else {
                    DB::rollBack();
                    $logs[] = "❌ {$classe->nom_classe} → " . $result['message'];
                }
            }

            return response()->json([
                'message' => "Génération terminée.",
                'details' => $logs
            ]);

        } catch (Throwable $e) {
            return response()->json([
                'message' => "Erreur système : " . $e->getMessage()
            ], 500);
        }
    }
}