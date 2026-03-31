<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Seance extends Model
{
    use HasFactory;

    protected $fillable = [
        'classe_id', 
        'enseignant_id', 
        'matiere_id', 
        'jour', 
        'heure_debut', 
        'heure_fin'
    ];

    //this method defines the relationship between Seance and Classe, indicating that each Seance belongs to one Classe. This allows us to easily access the Classe associated with a given Seance using Eloquent's relationship features.
    public function classe()
    {
        return $this->belongsTo(Classe::class);
    }

    // this method defines the relationship between Seance and Enseignant, indicating that each Seance belongs to one Enseignant. This allows us to easily access the Enseignant associated with a given Seance using Eloquent's relationship features.
    public function enseignant()
    {
        return $this->belongsTo(Enseignant::class);
    }

    // this method defines the relationship between Seance and Matiere, indicating that each Seance belongs to one Matiere. This allows us to easily access the Matiere associated with a given Seance using Eloquent's relationship features.
    public function matiere()
    {
        return $this->belongsTo(Matiere::class);
    }
}