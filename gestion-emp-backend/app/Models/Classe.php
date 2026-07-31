<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Classe extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom_classe', 
        'niveau'
    ];

    /**
     * Relationship: A class can have many teachers.
     * This uses the pivot table 'classe_enseignant'.
     */
    public function enseignants()
    {
        return $this->belongsToMany(Enseignant::class, 'classe_enseignant')->withTimestamps();
    }

    /**
     * Relationship: A class has many sessions.
     */
    public function seances()
    {
        return $this->hasMany(Seance::class);
    }
}