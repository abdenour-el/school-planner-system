<?php

namespace App\Http\Controllers;

use App\Models\Seance;
use Illuminate\Http\Request;

class SeanceController extends Controller
{
    // =========================================================================
    // 1. AFFICHER LES SÉANCES D'UNE CLASSE
    // =========================================================================
    public function index(Request $request)
    {
        $query = Seance::with(['matiere', 'enseignant', 'classe']);
        
        if ($request->has('classe_id')) {
            $query->where('classe_id', $request->classe_id);
        }
        
        // Optionnel : filtrer aussi par enseignant_id pour voir les séances d'un prof spécifique
        if ($request->has('enseignant_id')) {
            $query->where('enseignant_id', $request->enseignant_id);
        }
        
        return response()->json($query->get());
    }

    // =========================================================================
    // 2. AJOUTER UNE SÉANCE MANUELLEMENT (AVEC SCANNER DE CONFLITS)
    // =========================================================================
    public function store(Request $request)
    {
        $request->validate([
            'classe_id' => 'required|exists:classes,id',
            'enseignant_id' => 'required|exists:enseignants,id',
            'matiere_id' => 'required|exists:matieres,id',
            'jour' => 'required|string',
            'heure_debut' => 'required',
            'heure_fin' => 'required|after:heure_debut',
        ]);

        // SCAN 1 : Vérifier si la CLASSE étudie déjà une autre matière à cette heure
        $conflitClasse = Seance::with('enseignant')
            ->where('classe_id', $request->classe_id)
            ->where('jour', $request->jour)
            ->where(function($q) use ($request) {
                $q->where('heure_debut', '<', $request->heure_fin)
                  ->where('heure_fin', '>', $request->heure_debut);
            })->first();

        if ($conflitClasse) {
            $nomProf = $conflitClasse->enseignant ? $conflitClasse->enseignant->nom : 'un autre prof';
            $hDebut = substr($conflitClasse->heure_debut, 0, 5);
            $hFin = substr($conflitClasse->heure_fin, 0, 5);
            return response()->json(['message' => "❌ Impossible : Cette classe étudie déjà avec l'Ostad {$nomProf} de {$hDebut} à {$hFin}."], 422);
        }

        // SCAN 2 : Vérifier si le PROFESSEUR est déjà dans une autre classe à cette heure
        $conflitProf = Seance::with('classe')
            ->where('enseignant_id', $request->enseignant_id)
            ->where('jour', $request->jour)
            ->where(function($q) use ($request) {
                $q->where('heure_debut', '<', $request->heure_fin)
                  ->where('heure_fin', '>', $request->heure_debut);
            })->first();

        if ($conflitProf) {
            $nomClasse = $conflitProf->classe ? $conflitProf->classe->nom_classe : 'une autre classe';
            $hDebut = substr($conflitProf->heure_debut, 0, 5);
            $hFin = substr($conflitProf->heure_fin, 0, 5);
            return response()->json(['message' => "❌ Impossible : L'Ostad est déjà occupé avec {$nomClasse} de {$hDebut} à {$hFin}."], 422);
        }

        // Si tout est propre, on ajoute la séance
        $seance = Seance::create($request->all());
        return response()->json($seance, 201);
    }

    // =========================================================================
    // 3. AFFICHER UNE SÉANCE SPÉCIFIQUE
    // =========================================================================
    public function show($id)
    {
        return Seance::with(['matiere', 'enseignant', 'classe'])->findOrFail($id);
    }

    // =========================================================================
    // 4. MODIFIER UNE SÉANCE EXISTANTE (AVEC SCANNER DE CONFLITS)
    // =========================================================================
    public function update(Request $request, $id)
    {
        $seance = Seance::findOrFail($id);

        $request->validate([
            'enseignant_id' => 'required|exists:enseignants,id',
            'matiere_id' => 'required|exists:matieres,id',
            'jour' => 'required|string',
            'heure_debut' => 'required',
            'heure_fin' => 'required|after:heure_debut',
        ]);

        // SCAN 1 : Vérifier la CLASSE (en ignorant l'ID de la séance qu'on est en train de modifier)
        $conflitClasse = Seance::with('enseignant')
            ->where('id', '!=', $id)
            ->where('classe_id', $seance->classe_id)
            ->where('jour', $request->jour)
            ->where(function($q) use ($request) {
                $q->where('heure_debut', '<', $request->heure_fin)
                  ->where('heure_fin', '>', $request->heure_debut);
            })->first();

        if ($conflitClasse) {
            $nomProf = $conflitClasse->enseignant ? $conflitClasse->enseignant->nom : 'un autre prof';
            $hDebut = substr($conflitClasse->heure_debut, 0, 5);
            $hFin = substr($conflitClasse->heure_fin, 0, 5);
            return response()->json(['message' => "❌ Impossible : Cette classe étudie déjà avec l'Ostad {$nomProf} de {$hDebut} à {$hFin}."], 422);
        }

        // SCAN 2 : Vérifier le PROFESSEUR (en ignorant l'ID de la séance qu'on est en train de modifier)
        $conflitProf = Seance::with('classe')
            ->where('id', '!=', $id)
            ->where('enseignant_id', $request->enseignant_id)
            ->where('jour', $request->jour)
            ->where(function($q) use ($request) {
                $q->where('heure_debut', '<', $request->heure_fin)
                  ->where('heure_fin', '>', $request->heure_debut);
            })->first();

        if ($conflitProf) {
            $nomClasse = $conflitProf->classe ? $conflitProf->classe->nom_classe : 'une autre classe';
            $hDebut = substr($conflitProf->heure_debut, 0, 5);
            $hFin = substr($conflitProf->heure_fin, 0, 5);
            return response()->json(['message' => "❌ Impossible : L'Ostad est déjà occupé avec {$nomClasse} de {$hDebut} à {$hFin}."], 422);
        }

        // Si tout est propre, on met à jour
        $seance->update($request->all());
        return response()->json($seance, 200);
    }

    // =========================================================================
    // 5. SUPPRIMER UNE SÉANCE
    // =========================================================================
    public function destroy($id)
    {
        Seance::destroy($id);
        return response()->json(['message' => 'Séance supprimée avec succès.']);
    }
}