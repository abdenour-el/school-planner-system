<?php

namespace App\Http\Controllers;

use App\Models\Classe;
use Illuminate\Http\Request;

class ClasseController extends Controller
{
    // =========================================================================
    // FETCH ALL CLASSES
    // =========================================================================
    public function index()
    {
        return response()->json(Classe::all(), 200);
    }

    // =========================================================================
    // CREATE A NEW CLASS
    // =========================================================================
    public function store(Request $request)
    {
        // Validate incoming data (Level between 1 and 10 to match the frontend)
        $validated = $request->validate([
            'nom_classe' => 'required|string|max:255', 
            'niveau' => 'required|integer|min:1|max:10', 
        ]);

        // Create the new class in the database
        $classe = Classe::create($validated);

        return response()->json([
            'message' => 'Classe ajoutée avec succès !',
            'classe' => $classe
        ], 201);
    }

    // =========================================================================
    // UPDATE AN EXISTING CLASS (THE MISSING METHOD 🔥)
    // =========================================================================
    public function update(Request $request, $id)
    {
        // Validate incoming data
        $validated = $request->validate([
            'nom_classe' => 'required|string|max:255',
            'niveau' => 'required|integer|min:1|max:10',
        ]);

        // Find the class by ID or fail, then update it
        $classe = Classe::findOrFail($id);
        $classe->update($validated);

        return response()->json([
            'message' => 'Classe modifiée avec succès !',
            'classe' => $classe
        ], 200);
    }

    // =========================================================================
    // DELETE A CLASS
    // =========================================================================
    public function destroy($id)
    {
        // Find the class by ID and delete it
        Classe::findOrFail($id)->delete();
        
        return response()->json([
            'message' => 'Classe supprimée avec succès !'
        ], 200);
    }
}