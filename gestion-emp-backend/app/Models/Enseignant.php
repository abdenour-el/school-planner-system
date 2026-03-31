<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enseignant extends Model
{
    use HasFactory;

    // cette propriété indique à Laravel quels champs peuvent être remplis en masse (mass assignment)
    protected $fillable = [
        'nom', 
        'prenom',
        'matiere_id', 
        'max_heures', 
        'nombre_groupes', 
        'niveaux'
    ];

    // obliger Laravel à traiter le champ 'niveaux' comme un tableau JSON, ce qui facilite son utilisation dans le code
    protected $casts = [
        'niveaux' => 'array'
    ];

    // prof can teach one subject (matiere_id is a foreign key to the matieres table)
    public function matiere()
    {
        return $this->belongsTo(Matiere::class);
    }
    // prof can have many seances (one-to-many relationship)
    public function seances()
    {
        return $this->hasMany(Seance::class);
    }
}