<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ClasseController;
use App\Http\Controllers\MatiereController;
use App\Http\Controllers\EnseignantController;
use App\Http\Controllers\SeanceController;
use App\Http\Controllers\AutoGeneratorController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// 1. Routes de base (Ressources CRUD)
Route::apiResource('classes', ClasseController::class);
Route::apiResource('matieres', MatiereController::class);
Route::apiResource('enseignants', EnseignantController::class);

// 2. Routes de Génération Automatique
Route::post('/generate-emploi', [AutoGeneratorController::class, 'generate']);
Route::post('/generate-all', [AutoGeneratorController::class, 'generateAll']);

// 3. Routes de Suppression Globale (Les nouveaux boutons "Vider")
// 🚨 Mettna les routes custom AVANT 'apiResource' bash maywqe3sh conflit d-les URLs
Route::delete('/seances/clear-classe/{classe_id}', [SeanceController::class, 'clearClasse']);
Route::post('/seances/clear-niveau', [SeanceController::class, 'clearNiveau']);
Route::post('/seances/reset', [SeanceController::class, 'resetAll']); // Beddelnaha l-/seances/reset bash t-khdem m3a l-Frontend

// 4. Routes pour les Séances individuelles (CRUD classique)
// apiResource crée automatiquement index, store, show, update, destroy (Mss7na t-Tikrar)
Route::apiResource('seances', SeanceController::class);

// ==========================================
// PUBLIC ROUTES (No token required)
// ==========================================
Route::post('/login', [AuthController::class, 'login']);


// ==========================================
// PROTECTED ROUTES (Require valid token)
// ==========================================
Route::middleware('auth:sanctum')->group(function () {
    
    // User logout route
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);
});