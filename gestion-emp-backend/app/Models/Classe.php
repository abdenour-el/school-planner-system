<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Classe extends Model
{
    use HasFactory;

    protected $fillable = ['nom_classe', 'niveau'];

    // Define the relationship with Seance (one-to-many)
    public function seances()
    {
        return $this->hasMany(Seance::class);
    }
}