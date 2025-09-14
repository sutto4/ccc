// Test database connection and schema
const mysql = require('mysql2/promise');

async function testDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'chester_bot'
    });

    console.log('✅ Database connected successfully');

    // Check if features table exists and has the right structure
    const [features] = await connection.execute('DESCRIBE features');
    console.log('📋 Features table structure:');
    console.table(features);

    // Check if command_mappings table exists
    try {
      const [commandMappings] = await connection.execute('DESCRIBE command_mappings');
      console.log('📋 Command mappings table structure:');
      console.table(commandMappings);
    } catch (err) {
      console.log('❌ Command mappings table does not exist');
    }

    // Check if guild_commands table exists
    try {
      const [guildCommands] = await connection.execute('DESCRIBE guild_commands');
      console.log('📋 Guild commands table structure:');
      console.table(guildCommands);
    } catch (err) {
      console.log('❌ Guild commands table does not exist');
    }

    // Test a simple query
    try {
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM features');
      console.log('📊 Features count:', rows[0].count);
    } catch (err) {
      console.log('❌ Error querying features table:', err.message);
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testDatabase();
