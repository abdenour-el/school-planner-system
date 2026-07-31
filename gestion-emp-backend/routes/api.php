<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ClasseController;
use App\Http\Controllers\MatiereController;
use App\Http\Controllers\EnseignantController;
use App\Http\Controllers\SeanceController;
use App\Http\Controllers\AutoGeneratorController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application.
|
*/

// ==========================================
// 1. BASIC CRUD RESOURCES
// ==========================================
// Automatically generates index, store, show, update, and destroy routes
Route::apiResource('classes', ClasseController::class);
Route::apiResource('matieres', MatiereController::class);
Route::apiResource('enseignants', EnseignantController::class);

// ==========================================
// 2. AUTO-GENERATOR ROUTES
// ==========================================
Route::post('/generate-emploi', [AutoGeneratorController::class, 'generate']);
Route::post('/generate-all', [AutoGeneratorController::class, 'generateAll']);

// ==========================================
// 3. CUSTOM SEANCE ROUTES (CLEAR & RESET)
// ==========================================
// IMPORTANT: Custom endpoints must be defined BEFORE the apiResource 
// to prevent route parameter conflicts with {seance}
Route::delete('/seances/clear-classe/{classe_id}', [SeanceController::class, 'clearClasse']);
Route::post('/seances/clear-niveau', [SeanceController::class, 'clearNiveau']);
Route::post('/seances/reset', [AutoGeneratorController::class, 'resetAll']); 

// ==========================================
// 4. SEANCES CRUD
// ==========================================
Route::apiResource('seances', SeanceController::class);