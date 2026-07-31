<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('enseignants', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('prenom');
            
            // Link to the subject (matiere)
            $table->foreignId('matiere_id')->constrained('matieres')->onDelete('cascade'); 
            
            // Default max hours for the teacher, can be modified by the admin
            $table->integer('max_heures')->default(24); 
            
            // NOTE: 'niveaux' and 'nombre_groupes' were removed. 
            // We will use a pivot table (classe_enseignant) for exact class assignments.
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enseignants');
    }
};