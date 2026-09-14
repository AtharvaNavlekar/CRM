import postgres from 'postgres';

const sql = postgres('postgres://postgres:TheNavlekar@localhost:5432/postgres');

async function check() {
  try {
    const dbs = await sql`SELECT datname FROM pg_database WHERE datname = 'crm'`;
    if (dbs.length === 0) {
      await sql`CREATE DATABASE crm`;
      console.log('Database "crm" created successfully.');
    } else {
      console.log('Database "crm" already exists.');
    }
    process.exit(0);
  } catch (err) {
    console.error('ERROR CREATING DATABASE:');
    console.error(err);
    process.exit(1);
  }
}
check();
