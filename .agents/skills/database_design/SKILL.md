---
name: database_design
description: "Best practices for Database Design, particularly focusing on PostgreSQL and Supabase."
---

# Database Design Skill

This skill ensures robust, secure, and scalable database schemas.

## Guidelines
1. **Supabase & Postgres**: Assume Supabase (PostgreSQL) is the primary database unless specified otherwise.
2. **Row Level Security (RLS)**: Always define RLS policies for every table created. Do not leave tables globally accessible unless absolutely necessary.
3. **Data Types**: Use appropriate data types (e.g., `uuid` for primary keys, `timestamptz` for dates).
4. **Foreign Keys & Constraints**: Enforce data integrity at the database level using Foreign Keys, `ON DELETE CASCADE/RESTRICT`, and `CHECK` constraints.
5. **Migrations**: Track database changes using migration files or clearly defined SQL scripts rather than manual dashboard clicks, when possible.
6. **Naming Conventions**: Use `snake_case` for tables and columns.
