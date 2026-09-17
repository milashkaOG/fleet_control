require('dotenv').config();

const { Client } = require('pg');

async function seedDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();

    await client.query(`
        INSERT INTO vehicles (
            brand,
            model,
            registration_number,
            production_year,
            availability_status
        )
        VALUES
            ('Kia', 'K5', 'A123BC77', 2022, 'AVAILABLE'),
            ('Toyota', 'Camry', 'B456DE77', 2021, 'REPAIR'),
            ('Chery', 'Arrizo 8', 'C789FG77', 2023, 'AVAILABLE')
        ON CONFLICT (registration_number) DO NOTHING;
    `);
    
    await client.query(`
        INSERT INTO drivers (
            full_name,
            license_number,
            status
        )
        VALUES
            ('Иван Петров', '77AA123456', 'ACTIVE'),
            ('Алексей Смирнов', '77BB654321', 'ACTIVE'),
            ('Михаил Соколов', '77CC987654', 'INACTIVE')
        ON CONFLICT (license_number) DO NOTHING;
    `);

    console.log('Seed data added successfully.');
  } finally {
    await client.end();
  }
}

seedDatabase().catch((error) => {
  console.error('Seed failed:');
  console.error(error);
  process.exit(1);
});