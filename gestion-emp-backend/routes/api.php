<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ClasseController;
use App\Http\Controllers\MatiereController;
use App\Http\Controllers\EnseignantController;
use App\Http\Controllers\SeanceController;
use App\Http\Controllers\AutoGeneratorController;
// API Routes for managing classes, subjects, teachers, and seances
Route::apiResource('classes', ClasseController::class);
Route::apiResource('matieres', MatiereController::class);
Route::apiResource('enseignants', EnseignantController::class);
Route::post('/generate-emploi', [AutoGeneratorController::class, 'generate']);
// Route::post('/generate-emploi-all', [\App\Http\Controllers\AutoGeneratorController::class, 'generateAll']);
Route::post('/generate-all', [AutoGeneratorController::class, 'generateAll']);

Route::apiResource('seances', SeanceController::class);
// Routes for managing seances (GET, POST, PUT, DELETE)
Route::get('/seances', [SeanceController::class, 'index']);
Route::post('/seances', [SeanceController::class, 'store']);
Route::put('/seances/{id}', [SeanceController::class, 'update']);
Route::delete('/seances/{id}', [SeanceController::class, 'destroy']);
Route::post('/reset-emplois', [App\Http\Controllers\AutoGeneratorController::class, 'resetAll']);