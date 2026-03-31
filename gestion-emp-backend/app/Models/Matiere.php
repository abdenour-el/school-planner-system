<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Matiere extends Model
{
    use HasFactory;

    // cette propriété indique à Laravel quels champs peuvent être remplis en masse (mass assignment)
    protected $fillable = ['nom_matiere', 'volume_horaire'];

    // one module can be taught by many teachers (one-to-many relationship)
    public function enseignants()
    {
        return $this->hasMany(Enseignant::class);
    }

    // one module can have many seances (one-to-many relationship)
    public function seances()
    {
        return $this->hasMany(Seance::class);
    }
}