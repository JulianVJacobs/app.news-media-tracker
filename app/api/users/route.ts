import { NextRequest, NextResponse } from 'next/server';
import { eq, like, and, SQL, sql } from 'drizzle-orm';
import { dbm, DatabaseManagerServer } from '../../../lib/db/server';
import { generateUserId, sanitiseData } from '../../../lib/components/utils';
import * as schema from '../../../lib/db/schema';

/**
 * Validate user data
 */
function validateUserData(user: Partial<schema.User>) {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!user.username || user.username.trim() === '') {
    errors.push('Username is required');
  }

  if (!user.email || user.email.trim() === '') {
    warnings.push('Email is recommended for user identification');
  }

  // Email validation
  if (user.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      errors.push('Invalid email format');
    }
  }

  // Role validation
  const validRoles = ['admin', 'researcher', 'editor', 'viewer'];
  if (user.role && !validRoles.includes(user.role)) {
    errors.push(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * GET /api/users - Retrieve all users
 */
export async function GET(request: NextRequest) {
  try {
    if (!(dbm instanceof DatabaseManagerServer))
      throw new TypeError(
        'Online API called with local database manager. This endpoint must run in a server context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();

    // Get query parameters for filtering
    const url = new URL(request.url);
    const parsedLimit = Number.parseInt(
      url.searchParams.get('limit') || '50',
      10,
    );
    const parsedOffset = Number.parseInt(
      url.searchParams.get('offset') || '0',
      10,
    );
    const limit = Number.isNaN(parsedLimit) ? 50 : parsedLimit;
    const offset = Number.isNaN(parsedOffset) ? 0 : parsedOffset;
    const search = url.searchParams.get('search') || '';
    const role = url.searchParams.get('role') || '';
    const active = url.searchParams.get('active') || '';

    // Build query with filters
    let users: schema.User[] = [];
    let total = 0;

    // Build where conditions
    const whereConditions: SQL[] = [];

    if (search) {
      const searchConditions = [
        like(schema.users.username, `%${search}%`),
        like(schema.users.userId, `%${search}%`),
        like(schema.users.email, `%${search}%`),
      ].filter((condition): condition is SQL => condition !== undefined);

      if (searchConditions.length > 0) {
        const [firstCondition, ...remainingConditions] = searchConditions;
        const combinedCondition = remainingConditions.reduce<SQL>(
          (accumulator, condition) => sql`${accumulator} OR ${condition}`,
          firstCondition,
        );
        whereConditions.push(combinedCondition);
      }
    }

    if (role) {
      whereConditions.push(eq(schema.users.role, role));
    }

    if (active !== '') {
      whereConditions.push(eq(schema.users.isActive, active === 'true'));
    }

    // Execute query
    const condition = (() => {
      if (whereConditions.length === 0) return undefined;
      if (whereConditions.length === 1) return whereConditions[0];
      return and(...whereConditions);
    })();

    const baseQuery = db.select().from(schema.users);
    users = condition
      ? await baseQuery.where(condition).limit(limit).offset(offset)
      : await baseQuery.limit(limit).offset(offset);

    const countColumn = sql<number>`count(*)`.as('count');
    const totalResult = condition
      ? await db
          .select({ count: countColumn })
          .from(schema.users)
          .where(condition)
      : await db.select({ count: countColumn }).from(schema.users);
    total = totalResult[0]?.count ?? 0;

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve users',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/users - Create new user
 */
export async function POST(request: NextRequest) {
  try {
    const userData = (await request.json()) as
      | (Partial<schema.User> & Record<string, unknown>)
      | undefined;

    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'Invalid request payload' },
        { status: 400 },
      );
    }

    // Validate user data
    const validation = validateUserData(userData);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 },
      );
    }

    // Sanitize data
    const sanitisedData = sanitiseData(userData);
    if (!(dbm instanceof DatabaseManagerServer))
      throw new TypeError(
        'Online API called with local database manager. This endpoint must run in a server context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();

    // Generate unique user ID
    const userId = generateUserId();

    const username =
      typeof sanitisedData.username === 'string'
        ? sanitisedData.username.trim()
        : '';
    if (!username) {
      return NextResponse.json(
        {
          success: false,
          error: 'Username is required',
        },
        { status: 400 },
      );
    }

    const email =
      typeof sanitisedData.email === 'string'
        ? sanitisedData.email.trim() || null
        : null;

    const roleValue =
      typeof sanitisedData.role === 'string' && sanitisedData.role.trim() !== ''
        ? sanitisedData.role
        : 'researcher';

    const isActiveValue =
      typeof sanitisedData.isActive === 'boolean'
        ? sanitisedData.isActive
        : sanitisedData.isActive !== undefined
          ? Boolean(sanitisedData.isActive)
          : true;

    const newUserValues = {
      userId,
      username,
      email,
      role: roleValue,
      isActive: isActiveValue,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    } satisfies schema.NewUser;

    // Create user record
    const newUser = await db
      .insert(schema.users)
      .values(newUserValues)
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: newUser[0],
        message: 'User created successfully',
        warnings: validation.warnings,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create user:', error);

    // Type-safe error handling
    const isConstraintError =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'SQLITE_CONSTRAINT_UNIQUE';

    if (isConstraintError) {
      return NextResponse.json(
        {
          success: false,
          error: 'User with this username or email already exists',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/users - Update existing user
 */
export async function PUT(request: NextRequest) {
  try {
    const payload = (await request.json()) as
      | ({ id?: number } & Partial<schema.User> & Record<string, unknown>)
      | undefined;

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid request payload' },
        { status: 400 },
      );
    }

    const { id, ...userData } = payload;

    const numericId = Number(id);
    if (!Number.isInteger(numericId)) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 },
      );
    }

    // Validate user data
    const validation = validateUserData(userData);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 },
      );
    }

    // Sanitize data
    const sanitisedData = sanitiseData(userData);
    if (!(dbm instanceof DatabaseManagerServer))
      throw new TypeError(
        'Online API called with local database manager. This endpoint must run in a server context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();

    const updateValues: Partial<schema.NewUser> = {};

    if (typeof sanitisedData.username === 'string') {
      const trimmedUsername = sanitisedData.username.trim();
      if (!trimmedUsername) {
        return NextResponse.json(
          { success: false, error: 'Username is required' },
          { status: 400 },
        );
      }
      updateValues.username = trimmedUsername;
    }

    if ('email' in sanitisedData) {
      updateValues.email =
        typeof sanitisedData.email === 'string'
          ? sanitisedData.email.trim() || null
          : null;
    }

    if (typeof sanitisedData.role === 'string' && sanitisedData.role.trim()) {
      updateValues.role = sanitisedData.role.trim();
    }

    if (sanitisedData.isActive !== undefined) {
      updateValues.isActive =
        typeof sanitisedData.isActive === 'boolean'
          ? sanitisedData.isActive
          : Boolean(sanitisedData.isActive);
    }

    // Update user record
    const updatedUser = await db
      .update(schema.users)
      .set(updateValues)
      .where(eq(schema.users.id, numericId))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedUser[0],
      message: 'User updated successfully',
      warnings: validation.warnings,
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/users - Delete or deactivate user
 */
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const permanent = url.searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 },
      );
    }
    if (!(dbm instanceof DatabaseManagerServer))
      throw new TypeError(
        'Online API called with local database manager. This endpoint must run in a server context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();

    if (permanent) {
      // Permanently delete user record
      const deletedUser = await db
        .delete(schema.users)
        .where(eq(schema.users.id, Number.parseInt(id, 10)))
        .returning();

      if (deletedUser.length === 0) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        message: 'User permanently deleted',
      });
    } else {
      // Soft delete - deactivate user
      const deactivatedUser = await db
        .update(schema.users)
        .set({ isActive: false })
        .where(eq(schema.users.id, Number.parseInt(id, 10)))
        .returning();

      if (deactivatedUser.length === 0) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        message: 'User deactivated successfully',
        data: deactivatedUser[0],
      });
    }
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 },
    );
  }
}
