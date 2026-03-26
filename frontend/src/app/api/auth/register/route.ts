// ============================================================================
// REGISTRATION API ROUTE - /api/auth/register
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma, hashPassword } from '@/lib/auth/auth';
import { Prisma } from '@prisma/client';

interface RegisterBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterBody = await request.json();
    const { email, password, firstName, lastName } = body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cette adresse email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user and customer in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name: `${firstName} ${lastName}`,
        },
      });

      // Create customer profile
      const customer = await tx.customer.create({
        data: {
          userId: user.id,
          email: email.toLowerCase(),
          firstName,
          lastName,
          isVerified: false, // Email verification can be added later
        },
      });

      return { user, customer };
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Compte créé avec succès',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la création du compte' },
      { status: 500 }
    );
  }
}
