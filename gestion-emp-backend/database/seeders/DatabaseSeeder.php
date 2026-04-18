<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Check if the admin user already exists to avoid duplicates
        if (!User::where('email', 'admin@iqrae.com')->exists()) {
            
            // 2. Create the default Admin user for anyone who clones the project
            User::create([
                'name' => 'Admin IQRAE',
                'email' => 'admin@iqrae.com',
                'password' => Hash::make('password123'),
            ]);
            
            $this->command->info('Admin user created successfully! (admin@iqrae.com / password123)');
        }
    }
}