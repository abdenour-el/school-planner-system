<?php

namespace App\Http\Controllers;

use App\Models\Enseignant;
use App\Models\Matiere;
use Illuminate\Http\Request;

class EnseignantController extends Controller
{
    // 1. fetch all teachers + their hourly load (the new schedule)
    public function index()
    {
        // Fetch teachers, their subjects, and the classes they teach in the schedule
        $enseignants = Enseignant::with(['matiere', 'seances.classe'])->get();

        // calculate total hours and unique classes for each teacher
        $enseignants->transform(function ($prof) {
            $heures = 0;
            $classes = collect();

            foreach ($prof->seances as $seance) {
                $start = strtotime($seance->heure_debut);
                $end = strtotime($seance->heure_fin);
                $heures += ($end - $start) / 3600;

                if ($seance->classe) {
                    $classes->push([
                        'id' => $seance->classe->id,
                        'nom_classe' => $seance->classe->nom_classe,
                        'niveau' => $seance->classe->niveau
                    ]);
                }
            }

            $prof->heures_actuelles = $heures;
            // remove duplicate classes so each is listed only once
            $prof->classes_assignees = $classes->unique('id')->values(); 
            
            // hide seances from the JSON response
            unset($prof->seances);

            return $prof;
        });

        return response()->json($enseignants, 200);
    }

    // 2. Ajouter un nouvel enseignant
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'matiere_id' => 'required|exists:matieres,id',
            'nombre_groupes' => 'required|integer|min:1',
            'niveaux' => 'required|array', 
        ]);

        $matiere = Matiere::findOrFail($validated['matiere_id']);
        $max = (stripos($matiere->nom_matiere, 'math') !== false) ? 21 : 24;

        $enseignant = Enseignant::create([
            'nom' => $validated['nom'],
            'prenom' => $validated['prenom'],
            'matiere_id' => $validated['matiere_id'],
            'max_heures' => $max,
            'nombre_groupes' => $validated['nombre_groupes'],
            'niveaux' => $validated['niveaux'],
        ]);

        return response()->json([
            'message' => 'L\'Ostad tzad b naja7!',
            'enseignant' => Enseignant::with('matiere')->find($enseignant->id)
        ], 201);
    }

    // update a teacher
    public function update(Request $request, $id)
    {
        $enseignant = Enseignant::findOrFail($id);

        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'matiere_id' => 'required|exists:matieres,id',
            'nombre_groupes' => 'required|integer|min:1',
            'niveaux' => 'required|array',
        ]);

        $matiere = Matiere::findOrFail($validated['matiere_id']);
        $max = (stripos($matiere->nom_matiere, 'math') !== false) ? 21 : 24;

        $enseignant->update([
            'nom' => $validated['nom'],
            'prenom' => $validated['prenom'],
            'matiere_id' => $validated['matiere_id'],
            'max_heures' => $max,
            'nombre_groupes' => $validated['nombre_groupes'],
            'niveaux' => $validated['niveaux'],
        ]);

        return response()->json([
            'message' => 'L\'Ostad t-modifiya b naja7!'
        ], 200);
    }

    // 4. Supprimer un enseignant
    public function destroy($id)
    {
        $enseignant = Enseignant::findOrFail($id);
        $enseignant->delete();
        
        return response()->json(['message' => 'L\'Ostad ttmsa7 b naja7!'], 200);
    }
}