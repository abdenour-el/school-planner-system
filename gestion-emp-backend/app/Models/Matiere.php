<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Matiere extends Model
{
    use HasFactory;

    // Added 'type' (assasiya/secondaire) to the fillable array
    protected $fillable = [
        'nom_matiere', 
        'type', 
        'volume_horaire'
    ];

    /**
     * Relationship: A subject can be taught by many teachers.
     */
    public function enseignants()
    {
        return $this->hasMany(Enseignant::class);
    }

    /**
     * Relationship: A subject has many sessions.
     */
    public function seances()
    {
        return $this->hasMany(Seance::class);
    }
}