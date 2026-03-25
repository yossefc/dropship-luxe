const { Client } = require('pg');

async function testConnection(password) {
  const client = new Client({
    user: 'postgres',
    password: password,
    host: 'localhost',
    port: 5432,
    database: 'postgres',
  });
  try {
    await client.connect();
    console.log(`Success with password: ${password}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`Failed with password: ${password} - ${err.message}`);
    return false;
  }
}

async function run() {
  await testConnection('postgres');
  await testConnection('admin');
  await testConnection('root');
  await testConnection('elish26');
  await testConnection('');
}

run();
