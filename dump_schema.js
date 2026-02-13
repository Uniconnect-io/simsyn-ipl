const db = require('better-sqlite3')('sipl.db');
const fs = require('fs');

function getColumns(table) {
    try {
        return db.prepare(`PRAGMA table_info(${table})`).all();
    } catch (e) {
        return [];
    }
}

const tables = ['teams', 'captains', 'players', 'auctions', 'bids', 'matches', 'battle_ideas', 'case_studies'];
const schema = {};

tables.forEach(t => {
    schema[t] = getColumns(t);
});

fs.writeFileSync('schema_dump.json', JSON.stringify(schema, null, 2));
console.log('Schema dumped to schema_dump.json');
