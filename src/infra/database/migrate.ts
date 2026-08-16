import { DatabaseService } from './connection.js';
import { MIGRATION_SQL } from './schema.sql.js';

const database = DatabaseService.getInstance();
database.db.exec(MIGRATION_SQL);
console.log('Migration complete');
database.close();
