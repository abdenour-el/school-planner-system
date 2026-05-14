<?php

namespace App\Http\Controllers;

use App\Models\Enseignant;
use App\Models\Matiere;
use Illuminate\Http\Request;

class EnseignantController extends Controller
{
    // 1. Fetch all teachers + their hourly load and exact assigned classes
    public function index()
    {
        // Fetch teachers, their subjects, the exact classes they teach (pivot table), and their schedule sessions
        $enseignants = Enseignant::with(['matiere', 'classes', 'seances'])->get();

        // Calculate total scheduled hours and count assigned classes for each teacher
        $enseignants->transform(function ($prof) {
            $heures = 0;
            
            // Calculate hours from actual scheduled sessions
            foreach ($prof->seances as $seance) {
                $start = strtotime($seance->heure_debut);
                $end = strtotime($seance->heure_fin);
                $heures += ($end - $start) / 3600;
            }

            $prof->heures_actuelles = $heures;
            
            // Count the exact number of classes assigned to this teacher
            $prof->nombre_classes = $prof->classes->count(); 
            
            // Hide seances from the JSON response to keep the payload clean and fast
            unset($prof->seances);

            return $prof;
        });

        return response()->json($enseignants, 200);
    }

    // 2. Add a new teacher (Ajouter un nouvel enseignant)
    public function store(Request $request)
    {
        // Validate incoming data based on the new logic
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'matiere_id' => 'required|exists:matieres,id',
            'max_heures' => 'required|integer|min:1', // Now comes directly from the frontend form
            'classes_ids' => 'required|array', // Array of exact class IDs selected by the admin
            'classes_ids.*' => 'exists:classes,id' // Ensure every selected class actually exists in the DB
        ]);

        // Create the teacher profile
        $enseignant = Enseignant::create([
            'nom' => $validated['nom'],
            'prenom' => $validated['prenom'],
            'matiere_id' => $validated['matiere_id'],
            'max_heures' => $validated['max_heures'],
        ]);

        // Attach the exact selected classes to the teacher using the pivot table (classe_enseignant)
        $enseignant->classes()->attach($validated['classes_ids']);

        // Load relations so the React frontend gets the complete object immediately
        $enseignant->load('matiere', 'classes');

        return response()->json([
            'message' => 'L\'Ostad tzad b naja7!',
            'enseignant' => $enseignant
        ], 201);
    }

    // 3. Update an existing teacher
    // Note: Added 'int' before $id to fix the Intelephense warning!
    public function update(Request $request, int $id) 
    {
        $enseignant = Enseignant::findOrFail($id);

        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'matiere_id' => 'required|exists:matieres,id',
            'max_heures' => 'required|integer|min:1',
            'classes_ids' => 'required|array',
            'classes_ids.*' => 'exists:classes,id'
        ]);

        // Update basic teacher info
        $enseignant->update([
            'nom' => $validated['nom'],
            'prenom' => $validated['prenom'],
            'matiere_id' => $validated['matiere_id'],
            'max_heures' => $validated['max_heures'],
        ]);

        // Sync the classes in the pivot table 
        // Sync automatically removes unselected classes and adds newly selected ones
        $enseignant->classes()->sync($validated['classes_ids']);

        return response()->json([
            'message' => 'L\'Ostad t-modifiya b naja7!'
        ], 200);
    }

    // 4. Delete a teacher
    // Note: Added 'int' before $id to fix the Intelephense warning!
    public function destroy(int $id)
    {
        $enseignant = Enseignant::findOrFail($id);
        $enseignant->delete(); // Automatically deletes pivot records because of 'onDelete cascade' in migration
        
        return response()->json(['message' => 'L\'Ostad ttmsa7 b naja7!'], 200);
    }
}