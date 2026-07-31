<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enseignant extends Model
{
    use HasFactory;

    // Fields that can be filled in the database
    protected $fillable = [
        'nom', 
        'prenom', 
        'matiere_id', 
        'max_heures' // We kept this as requested
    ];

    /**
     * Relationship: A teacher belongs to one subject (Matiere).
     */
    public function matiere()
    {
        return $this->belongsTo(Matiere::class);
    }

    /**
     * Relationship: A teacher can teach many specific classes.
     * This uses the new pivot table 'classe_enseignant'.
     */
    public function classes()
    {
        return $this->belongsToMany(Classe::class, 'classe_enseignant')->withTimestamps();
    }

    /**
     * Relationship: A teacher has many sessions (Seances).
     */
    public function seances()
    {
        return $this->hasMany(Seance::class);
    }
}