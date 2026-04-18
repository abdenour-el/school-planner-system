<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    // 1. Fetch all users
    public function index()
    {
        $users = User::orderBy('id', 'desc')->get();
        return response()->json($users, 200);
    }

    // 2. Add a new user
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            // Automatically hash the password for security
            'password' => Hash::make($request->password),
        ]);

        return response()->json([
            'message' => 'Utilisateur ajouté avec succès!',
            'user' => $user
        ], 201);
    }

    // 3. Delete a user
    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json([
            'message' => 'Utilisateur supprimé avec succès!'
        ], 200);
    }
}