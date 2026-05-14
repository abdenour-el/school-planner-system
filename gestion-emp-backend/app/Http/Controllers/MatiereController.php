<?php

namespace App\Http\Controllers;

use App\Models\Matiere;
use Illuminate\Http\Request;

class MatiereController extends Controller
{
    // =========================================================================
    // FETCH ALL SUBJECTS
    // =========================================================================
    public function index()
    {
        return response()->json(Matiere::all(), 200);
    }

    // =========================================================================
    // CREATE A NEW SUBJECT
    // =========================================================================
    public function store(Request $request)
    {
        // Validate incoming data (Added 'type' to distinguish primary/secondary subjects)
        $validated = $request->validate([
            'nom_matiere' => 'required|string|max:255',
            'type' => 'required|string|in:assasiya,secondaire', // Validation for the new field
            'volume_horaire' => 'required|integer|min:1|max:20', 
        ]);

        // Create the new subject in the database
        $matiere = Matiere::create($validated);

        return response()->json([
            'message' => 'Matière ajoutée avec succès !',
            'matiere' => $matiere
        ], 201);
    }

    // =========================================================================
    // UPDATE AN EXISTING SUBJECT
    // =========================================================================
    // Note: Added 'int' before $id to fix any Intelephense warning!
    public function update(Request $request, int $id)
    {
        // Validate incoming data
        $validated = $request->validate([
            'nom_matiere' => 'required|string|max:255',
            'type' => 'required|string|in:assasiya,secondaire', // Validation for the new field
            'volume_horaire' => 'required|integer|min:1|max:20',
        ]);

        // Find the subject by ID or fail, then update it
        $matiere = Matiere::findOrFail($id);
        $matiere->update($validated);

        return response()->json([
            'message' => 'Matière modifiée avec succès !',
            'matiere' => $matiere
        ], 200);
    }

    // =========================================================================
    // DELETE A SUBJECT
    // =========================================================================
    // Note: Added 'int' before $id to fix any Intelephense warning!
    public function destroy(int $id)
    {
        // Find the subject by ID and delete it
        Matiere::findOrFail($id)->delete();
        
        return response()->json([
            'message' => 'Matière supprimée avec succès !'
        ], 200);
    }
}