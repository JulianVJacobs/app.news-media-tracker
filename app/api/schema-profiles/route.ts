import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { dbm, DatabaseManagerServer } from '../../../lib/db/server';
import {
  actors,
  schemaConstraints,
  schemaFields,
  schemaProfiles,
} from '../../../lib/db/schema';
import { SCHEMA_PROFILE_DEFAULT } from '../../../lib/contracts/schema-profile';
import {
  parseProfileCreateDto,
  parseProfileDeleteDto,
  parseProfileUpdateDto,
} from '../../../lib/contracts/schema-profile-admin-dto';

const ensureServerDatabase = async () => {
  if (!(dbm instanceof DatabaseManagerServer)) {
    throw new TypeError(
      'Online API called with local database manager. This endpoint must run in a server context.',
    );
  }
  await dbm.ensureDatabaseInitialised();
  return dbm.getLocal();
};

export async function GET() {
  try {
    const db = await ensureServerDatabase();
    const profiles = await db.select().from(schemaProfiles);
    return NextResponse.json({ success: true, data: profiles });
  } catch (error) {
    console.error('Failed to fetch schema profiles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve schema profiles' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = await ensureServerDatabase();
    const payload = await request.json();
    const parsed = parseProfileCreateDto(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parsed.errors,
        },
        { status: 400 },
      );
    }

    const id = parsed.data.id ?? uuidv4();
    const [existing] = await db
      .select()
      .from(schemaProfiles)
      .where(eq(schemaProfiles.id, id))
      .limit(1);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Profile with this ID already exists' },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const [created] = await db
      .insert(schemaProfiles)
      .values({
        id,
        name: parsed.data.name,
        entityLevel: parsed.data.entityLevel,
        description: parsed.data.description,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: created ?? {
          id,
          name: parsed.data.name,
          entityLevel: parsed.data.entityLevel,
          description: parsed.data.description,
          createdAt: now,
          updatedAt: now,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create schema profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create schema profile' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const db = await ensureServerDatabase();
    const payload = await request.json();
    const parsed = parseProfileUpdateDto(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parsed.errors,
        },
        { status: 400 },
      );
    }

    const [current] = await db
      .select()
      .from(schemaProfiles)
      .where(eq(schemaProfiles.id, parsed.data.id))
      .limit(1);
    if (!current) {
      return NextResponse.json(
        { success: false, error: 'Schema profile not found' },
        { status: 404 },
      );
    }

    const now = new Date().toISOString();
    const [updated] = await db
      .update(schemaProfiles)
      .set({
        name: parsed.data.name ?? current.name,
        entityLevel: parsed.data.entityLevel ?? current.entityLevel,
        description: parsed.data.description ?? current.description,
        updatedAt: now,
      })
      .where(eq(schemaProfiles.id, parsed.data.id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated ?? current,
    });
  } catch (error) {
    console.error('Failed to update schema profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update schema profile' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const db = await ensureServerDatabase();
    const payload = await request.json();
    const parsed = parseProfileDeleteDto(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parsed.errors,
        },
        { status: 400 },
      );
    }

    if (parsed.data.id === SCHEMA_PROFILE_DEFAULT) {
      return NextResponse.json(
        { success: false, error: 'Default schema profile cannot be deleted' },
        { status: 400 },
      );
    }

    const [current] = await db
      .select()
      .from(schemaProfiles)
      .where(eq(schemaProfiles.id, parsed.data.id))
      .limit(1);
    if (!current) {
      return NextResponse.json(
        { success: false, error: 'Schema profile not found' },
        { status: 404 },
      );
    }

    const [linkedActor] = await db
      .select()
      .from(actors)
      .where(eq(actors.schemaProfileId, parsed.data.id))
      .limit(1);
    if (linkedActor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Schema profile is in use by actors and cannot be deleted',
        },
        { status: 409 },
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(schemaConstraints)
        .where(eq(schemaConstraints.profileId, parsed.data.id));
      await tx.delete(schemaFields).where(eq(schemaFields.profileId, parsed.data.id));
      await tx.delete(schemaProfiles).where(eq(schemaProfiles.id, parsed.data.id));
    });

    return NextResponse.json({ success: true, data: { id: parsed.data.id } });
  } catch (error) {
    console.error('Failed to delete schema profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete schema profile' },
      { status: 500 },
    );
  }
}
