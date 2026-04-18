<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // Handle the user login process
    public function login(Request $request)
    {
        // 1. Validate incoming request data
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // 2. Find the user by their email address
        $user = User::where('email', $request->email)->first();

        // 3. Check if user exists and if the provided password matches the database
        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials. Please check your email and password.'
            ], 401);
        }

        // 4. Generate a new Sanctum authentication token for the user
        $token = $user->createToken('auth_token')->plainTextToken;

        // 5. Return success response along with the generated token
        return response()->json([
            'message' => 'Login successful',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user
        ]);
    }

    // Handle the user logout process
    public function logout(Request $request)
    {
        // 1. Delete the current access token to revoke authentication
        $request->user()->currentAccessToken()->delete();

        // 2. Return success response
        return response()->json([
            'message' => 'Logout successful'
        ]);
    }
}