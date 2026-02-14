const db = require('better-sqlite3')('sipl.db');

try {
    const info = db.prepare("PRAGMA table_info(matches)").all();
    const hasColumn = info.some(col => col.name === 'is_published');

    if (!hasColumn) {
        console.log("Adding is_published column...");
        db.prepare("ALTER TABLE matches ADD COLUMN is_published INTEGER DEFAULT 0").run();
        console.log("Column added.");
        
        // Mark existing COMPLETED matches as published to avoid hiding history
        db.prepare("UPDATE matches SET is_published = 1 WHERE status = 'COMPLETED'").run();
        console.log("Existing matches marked as published.");
    } else {
        console.log("Column already exists.");
    }
} catch (e) {
    console.error("Migration failed:", e);
}
