const { supabase } = require('./supabase');

async function run() {
    const sql = `
drop function if exists get_table_columns();

create or replace function get_table_columns()
returns jsonb
language sql
security definer
as $$
    select jsonb_object_agg(table_name, columns)
    from (
        select 
            t.relname::text as table_name,
            jsonb_agg(a.attname::text) as columns
        from pg_catalog.pg_class t
        join pg_catalog.pg_attribute a on a.attrelid = t.oid
        join pg_catalog.pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public'
          and t.relkind in ('r', 'v', 'm', 'f')
          and a.attnum > 0
          and not a.attisdropped
        group by t.relname
    ) sub;
$$;
    `.trim();

    console.log("Dropping and recreating get_table_columns RPC as JSONB...");
    const { error } = await supabase.rpc('update_products_home', { sql });

    if (error) {
        console.error("❌ Error:", error);
    } else {
        console.log("✅ get_table_columns updated successfully");
    }
}

run();
