const { supabase } = require('./supabase');

/**
 * --------------------------------------------------------------------------
 *  ADMIN RPC IMPLEMENTATION SCRIPT
 * --------------------------------------------------------------------------
 *  This script installs dynamic PostgreSQL RPC functions into Supabase.
 *
 *  These RPCs allow:
 *   - Reading full product records dynamically
 *   - Updating products dynamically
 *   - Deleting products dynamically
 *   - Creating products dynamically
 *
 *  All operations work across ANY table by introspecting schema metadata.
 * --------------------------------------------------------------------------
 */

async function run() {

    /**
     * Raw SQL payload that will be executed remotely.
     * We use the existing update_products_home RPC as a SQL executor.
     */
    const sql = `

-- ==========================================================================
-- GET FULL PRODUCT RECORD DYNAMICALLY
-- ==========================================================================
-- Returns an entire row as JSONB from any table.
-- Automatically detects the ID column.
-- --------------------------------------------------------------------------
create or replace function admin_product_full(
    p_table text,
    p_id bigint
)
returns jsonb
language plpgsql
security definer
as $$
declare
    result jsonb;
    v_id_col text;
begin

    -- Detect the table's ID column dynamically
    select attname::text into v_id_col
    from pg_attribute a
    join pg_class c on a.attrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = p_table
      and a.attname ilike 'id'
      and a.attnum > 0
      and not a.attisdropped
    limit 1;

    -- Abort if table has no ID column
    if v_id_col is null then
        return null;
    end if;

    -- Build and execute dynamic SELECT query
    execute format(
        'select to_jsonb(t) from public.%I t where %I = %L',
        p_table,
        v_id_col,
        p_id
    )
    into result;

    return result;
end;
$$;

-- ==========================================================================
-- UPDATE PRODUCT RECORD DYNAMICALLY
-- ==========================================================================
-- Updates any table using JSONB key/value pairs.
-- Ignores protected/internal fields.
-- --------------------------------------------------------------------------
create or replace function admin_update_product(
    p_table text,
    p_id bigint,
    p_data jsonb
)
returns void
language plpgsql
security definer
as $$
declare
    v_query text;
    v_key text;
    v_value jsonb;

    -- Array of generated SET statements
    v_sets text[] := array[]::text[];

    v_id_col text;
begin

    -- Detect ID column
    select attname::text into v_id_col
    from pg_attribute a
    join pg_class c on a.attrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = p_table
      and a.attname ilike 'id'
      and a.attnum > 0
      and not a.attisdropped
    limit 1;

    if v_id_col is null then
        raise exception 'Table % does not have an ID column', p_table;
    end if;

    -- Convert JSON fields into SQL SET expressions
    for v_key, v_value in
        select * from jsonb_each(p_data)
    loop

        -- Prevent modification of protected fields
        if lower(v_key) not in ('id', 'created_at', 'table_name', 'data') then
            v_sets := v_sets || format(
                '%I = %L',
                v_key,
                v_value #>> '{}'
            );
        end if;
    end loop;

    -- Execute UPDATE only if at least one field exists
    if array_length(v_sets, 1) > 0 then

        v_query := format(
            'update public.%I set %s where %I = %L',
            p_table,
            array_to_string(v_sets, ', '),
            v_id_col,
            p_id
        );

        execute v_query;
    end if;
end;
$$;

-- ==========================================================================
-- DELETE PRODUCT RECORD DYNAMICALLY
-- ==========================================================================
-- Deletes a row from any table.
-- --------------------------------------------------------------------------
create or replace function admin_delete_product(
    p_table text,
    p_id bigint
)
returns void
language plpgsql
security definer
as $$
declare
    v_id_col text;
    v_query text;
begin

    -- Detect ID column
    select attname::text into v_id_col
    from pg_attribute a
    join pg_class c on a.attrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = p_table
      and a.attname ilike 'id'
      and a.attnum > 0
      and not a.attisdropped
    limit 1;

    if v_id_col is null then
        raise exception 'Table % does not have an ID column', p_table;
    end if;

    -- Build dynamic DELETE query
    v_query := format(
        'delete from public.%I where %I = %L',
        p_table,
        v_id_col,
        p_id
    );

    execute v_query;
end;
$$;

-- ==========================================================================
-- CREATE PRODUCT RECORD DYNAMICALLY
-- ==========================================================================
-- Inserts a new row dynamically using JSONB.
-- Returns the newly created ID.
-- --------------------------------------------------------------------------
create or replace function admin_create_product(
    p_table text,
    p_data jsonb
)
returns text
language plpgsql
security definer
as $$
declare

    -- Dynamic column/value arrays
    v_cols text[] := array[]::text[];
    v_vals text[] := array[]::text[];

    v_key text;
    v_value jsonb;

    v_new_id text;
    v_query text;
begin

    -- Convert JSON fields into INSERT columns/values
    for v_key, v_value in
        select * from jsonb_each(p_data)
    loop

        -- Ignore protected/internal fields
        if lower(v_key) not in ('id', 'created_at', 'table_name', 'data') then

            v_cols := v_cols || format('%I', v_key);

            v_vals := v_vals || format(
                '%L',
                v_value #>> '{}'
            );
        end if;
    end loop;

    -- If no values provided -> insert default row
    if array_length(v_cols, 1) = 0 then

         v_query := format(
             'insert into public.%I default values returning id::text',
             p_table
         );

    else

         -- Build dynamic INSERT query
         v_query := format(
             'insert into public.%I (%s) values (%s) returning id::text',
             p_table,
             array_to_string(v_cols, ', '),
             array_to_string(v_vals, ', ')
         );
    end if;

    -- Execute insert and capture new ID
    execute v_query into v_new_id;

    return v_new_id;
end;
$$;
    `.trim();

    console.log("Implementing Comprehensive Admin RPCs...");

    /**
     * Execute SQL remotely through Supabase RPC.
     */
    const { error } = await supabase.rpc(
        'update_products_home',
        { sql }
    );

    if (error) {
        console.error("❌ Error:", error);
    } else {
        console.log(
            "✅ admin_product_full, admin_update_product, " +
            "admin_delete_product, and admin_create_product implemented"
        );
    }
}

/**
 * Script entrypoint
 */
run();