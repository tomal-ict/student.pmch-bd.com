<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DataSyncController extends Controller
{
    private const SKIP_TABLES = [
        'cache',
        'cache_locks',
        'jobs',
        'job_batches',
        'failed_jobs',
        'sessions',
    ];

    private function getBackupDir(): string
    {
        $rootDir = realpath(base_path('..')) ?: dirname(base_path());
        $backupDir = $rootDir . DIRECTORY_SEPARATOR . 'backup';

        if (!is_dir($backupDir)) {
            @mkdir($backupDir, 0755, true);
        }

        // Protect backup directory from direct public HTTP access
        $htaccessPath = $backupDir . DIRECTORY_SEPARATOR . '.htaccess';
        if (!file_exists($htaccessPath)) {
            $rules = "<IfModule mod_authz_core.c>\n    Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n    Order deny,allow\n    Deny from all\n</IfModule>\n";
            @file_put_contents($htaccessPath, $rules);
        }

        return $backupDir;
    }

    private function getSyncFilePath(): string
    {
        return $this->getBackupDir() . DIRECTORY_SEPARATOR . 'latest_database_sync.json';
    }

    /**
     * Get current backup status, available SQL backups, and live DB summary.
     */
    public function status(): JsonResponse
    {
        $backupDir = $this->getBackupDir();
        $syncFile = $this->getSyncFilePath();

        $syncMeta = null;
        if (file_exists($syncFile)) {
            $raw = @file_get_contents($syncFile);
            $decoded = $raw ? json_decode($raw, true) : null;
            if (is_array($decoded) && isset($decoded['meta'])) {
                $syncMeta = $decoded['meta'];
                $syncMeta['file_size'] = filesize($syncFile);
            }
        }

        // List .sql backup files in backup/
        $sqlFiles = [];
        foreach (glob($backupDir . DIRECTORY_SEPARATOR . '*.sql') ?: [] as $file) {
            $sqlFiles[] = [
                'name' => basename($file),
                'size' => filesize($file),
                'modified_at' => date('Y-m-d H:i:s', filemtime($file)),
            ];
        }
        usort($sqlFiles, fn ($a, $b) => strcmp($b['modified_at'], $a['modified_at']));

        // Current live DB summary
        $liveTables = [];
        $liveTotalRows = 0;
        foreach ($this->getDatabaseTables() as $table) {
            if (in_array($table, self::SKIP_TABLES, true)) {
                continue;
            }
            $count = (int) DB::table($table)->count();
            $liveTables[$table] = $count;
            $liveTotalRows += $count;
        }

        return response()->json([
            'success' => true,
            'backup_exists' => file_exists($syncFile),
            'backup_dir_display' => 'backup/',
            'sync_meta' => $syncMeta,
            'sql_files' => $sqlFiles,
            'live_db' => [
                'database_name' => config('database.connections.' . config('database.default') . '.database'),
                'table_count' => count($liveTables),
                'total_rows' => $liveTotalRows,
                'tables' => $liveTables,
            ],
        ]);
    }

    /**
     * Create a complete schema + data backup inside the project's /backup folder.
     */
    public function backup(): JsonResponse
    {
        $backupDir = $this->getBackupDir();
        $syncFile = $this->getSyncFilePath();

        $tables = $this->getDatabaseTables();
        $schema = [];
        $data = [];
        $totalRows = 0;
        $tableCounts = [];

        $sqlDump = "-- Popular Medical College Portal - Database Backup\n";
        $sqlDump .= "-- Generated at: " . now()->toDateTimeString() . "\n";
        $sqlDump .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

        foreach ($tables as $table) {
            if (in_array($table, self::SKIP_TABLES, true)) {
                continue;
            }

            // 1. Get SHOW CREATE TABLE
            $createRow = DB::select("SHOW CREATE TABLE `{$table}`");
            $createSql = '';
            if (!empty($createRow)) {
                $arr = (array) $createRow[0];
                $createSql = $arr['Create Table'] ?? ($arr['Create View'] ?? '');
                $createSql = preg_replace('/^CREATE TABLE\s+/i', 'CREATE TABLE IF NOT EXISTS ', $createSql);
            }

            // 2. Get SHOW COLUMNS
            $colsRaw = DB::select("SHOW COLUMNS FROM `{$table}`");
            $columns = array_map(fn ($c) => (array) $c, $colsRaw);

            $schema[$table] = [
                'create_sql' => $createSql,
                'columns' => $columns,
            ];

            // 3. Get table rows
            $rows = DB::table($table)->get()->map(fn ($r) => (array) $r)->toArray();
            $data[$table] = $rows;
            $rowCount = count($rows);
            $totalRows += $rowCount;
            $tableCounts[$table] = $rowCount;

            // Append to SQL dump
            $sqlDump .= "-- Table: `{$table}` ({$rowCount} rows)\n";
            if ($createSql) {
                $sqlDump .= $createSql . ";\n\n";
            }

            if ($rowCount > 0) {
                $colNames = array_keys($rows[0]);
                $colList = '`' . implode('`, `', $colNames) . '`';
                $pdo = DB::getPdo();

                foreach (array_chunk($rows, 100) as $chunk) {
                    $valueGroups = [];
                    foreach ($chunk as $row) {
                        $vals = [];
                        foreach ($colNames as $colName) {
                            $v = $row[$colName] ?? null;
                            $vals[] = $v === null ? 'NULL' : $pdo->quote((string) $v);
                        }
                        $valueGroups[] = '(' . implode(', ', $vals) . ')';
                    }
                    $sqlDump .= "INSERT IGNORE INTO `{$table}` ({$colList}) VALUES\n" . implode(",\n", $valueGroups) . ";\n\n";
                }
            }
        }

        $sqlDump .= "SET FOREIGN_KEY_CHECKS=1;\n";

        $meta = [
            'generated_at' => now()->toDateTimeString(),
            'source_app_url' => config('app.url'),
            'database_name' => config('database.connections.' . config('database.default') . '.database'),
            'table_count' => count($schema),
            'total_rows' => $totalRows,
            'table_counts' => $tableCounts,
        ];

        $payload = [
            'meta' => $meta,
            'schema' => $schema,
            'data' => $data,
        ];

        // Delete all old backup files (.sql and old sync JSON) so ONLY the new backup remains
        foreach (glob($backupDir . DIRECTORY_SEPARATOR . '*.sql') ?: [] as $oldSql) {
            if (is_file($oldSql)) {
                @unlink($oldSql);
            }
        }
        if (file_exists($syncFile)) {
            @unlink($syncFile);
        }

        $jsonWritten = @file_put_contents(
            $syncFile,
            json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );

        if ($jsonWritten === false) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to write backup file into backup/ folder. Please check folder permissions.',
            ], 500);
        }

        $sqlFilename = 'database_backup_' . date('Y-m-d_H-i-s') . '.sql';
        @file_put_contents($backupDir . DIRECTORY_SEPARATOR . $sqlFilename, $sqlDump);

        return response()->json([
            'success' => true,
            'message' => 'ডাটাবেজ সফলভাবে backup/ ফোল্ডারে ব্যাকআপ সম্পন্ন হয়েছে!',
            'meta' => $meta,
            'sql_file' => $sqlFilename,
        ]);
    }

    /**
     * Synchronize & Merge missing tables, missing columns, and missing data
     * from backup/latest_database_sync.json into the current live database.
     */
    public function synchronize(): JsonResponse
    {
        $syncFile = $this->getSyncFilePath();

        if (!file_exists($syncFile)) {
            return response()->json([
                'success' => false,
                'message' => 'backup/ ফোল্ডারে কোনো ব্যাকআপ ফাইল (latest_database_sync.json) পাওয়া যায়নি। প্রথমে সোর্স ডাটাবেজ থেকে ব্যাকআপ নিন।',
            ], 404);
        }

        $raw = @file_get_contents($syncFile);
        $sync = $raw ? json_decode($raw, true) : null;

        if (!is_array($sync) || !isset($sync['schema'], $sync['data'])) {
            return response()->json([
                'success' => false,
                'message' => 'ব্যাকআপ ফাইলটি সঠিক ফরম্যাটে নেই বা ক্ষতিগ্রস্ত হয়েছে।',
            ], 422);
        }

        $report = [
            'tables_created' => [],
            'columns_added' => [],
            'tables_synced' => [],
            'total_rows_inserted' => 0,
            'total_rows_skipped' => 0,
            'errors' => [],
        ];

        $pdo = DB::getPdo();

        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');

            // 1. Create missing tables & add missing columns
            foreach ($sync['schema'] as $table => $tableMeta) {
                if (in_array($table, self::SKIP_TABLES, true)) {
                    continue;
                }

                if (!Schema::hasTable($table)) {
                    if (!empty($tableMeta['create_sql'])) {
                        try {
                            $createSql = preg_replace('/^CREATE TABLE\s+/i', 'CREATE TABLE IF NOT EXISTS ', $tableMeta['create_sql']);
                            DB::statement($createSql);
                            $report['tables_created'][] = $table;
                        } catch (\Throwable $e) {
                            $report['errors'][] = "Table {$table} create error: " . $e->getMessage();
                        }
                    }
                    continue;
                }

                // Table exists -> check for any missing columns
                $existingColsRaw = DB::select("SHOW COLUMNS FROM `{$table}`");
                $existingCols = [];
                foreach ($existingColsRaw as $ec) {
                    $existingCols[$ec->Field] = true;
                }

                $prevCol = null;
                foreach ($tableMeta['columns'] ?? [] as $col) {
                    $colName = $col['Field'] ?? '';
                    if (!$colName) continue;

                    if (!isset($existingCols[$colName])) {
                        try {
                            $type = $col['Type'] ?? 'TEXT';
                            $isNull = ($col['Null'] ?? 'YES') === 'YES';
                            $defaultVal = $col['Default'] ?? null;

                            // When adding a NOT NULL column with no default to an existing populated table,
                            // use NULL safely so MySQL strict mode doesn't reject ALTER TABLE
                            if (!$isNull && $defaultVal === null) {
                                $nullSql = 'NULL';
                                $defaultSql = 'DEFAULT NULL';
                            } else {
                                $nullSql = $isNull ? 'NULL' : 'NOT NULL';
                                if ($defaultVal !== null) {
                                    $lowerDef = strtolower((string) $defaultVal);
                                    if (str_contains($lowerDef, 'current_timestamp')) {
                                        $defaultSql = 'DEFAULT CURRENT_TIMESTAMP';
                                    } else {
                                        $defaultSql = 'DEFAULT ' . $pdo->quote((string) $defaultVal);
                                    }
                                } else {
                                    $defaultSql = $isNull ? 'DEFAULT NULL' : '';
                                }
                            }

                            $afterSql = ($prevCol && isset($existingCols[$prevCol])) ? "AFTER `{$prevCol}`" : '';
                            $alterSql = trim("ALTER TABLE `{$table}` ADD COLUMN `{$colName}` {$type} {$nullSql} {$defaultSql} {$afterSql}");
                            DB::statement($alterSql);

                            $existingCols[$colName] = true;
                            $report['columns_added'][] = "{$table}.{$colName}";
                        } catch (\Throwable $e) {
                            $report['errors'][] = "Column {$table}.{$colName} add error: " . $e->getMessage();
                        }
                    }

                    $prevCol = $colName;
                }
            }

            // 2. Merge missing rows (INSERT IGNORE preserves existing target rows & merges missing ones)
            foreach ($sync['data'] as $table => $rows) {
                if (in_array($table, self::SKIP_TABLES, true) || empty($rows) || !Schema::hasTable($table)) {
                    continue;
                }

                // Filter columns to only those currently present on the target table
                $targetColsRaw = DB::select("SHOW COLUMNS FROM `{$table}`");
                $targetColNames = array_map(fn ($c) => $c->Field, $targetColsRaw);
                $targetColSet = array_flip($targetColNames);

                $insertedForTable = 0;
                $totalForTable = count($rows);

                foreach (array_chunk($rows, 100) as $chunk) {
                    $sanitizedChunk = [];
                    foreach ($chunk as $row) {
                        $filteredRow = [];
                        foreach ($row as $k => $v) {
                            if (isset($targetColSet[$k])) {
                                $filteredRow[$k] = $v;
                            }
                        }
                        if (!empty($filteredRow)) {
                            $sanitizedChunk[] = $filteredRow;
                        }
                    }

                    if (!empty($sanitizedChunk)) {
                        try {
                            $inserted = DB::table($table)->insertOrIgnore($sanitizedChunk);
                            $insertedForTable += (int) $inserted;
                        } catch (\Throwable $e) {
                            $report['errors'][] = "Data merge error in {$table}: " . $e->getMessage();
                        }
                    }
                }

                $skippedForTable = max(0, $totalForTable - $insertedForTable);
                $report['total_rows_inserted'] += $insertedForTable;
                $report['total_rows_skipped'] += $skippedForTable;

                $report['tables_synced'][$table] = [
                    'total_in_backup' => $totalForTable,
                    'inserted' => $insertedForTable,
                    'skipped' => $skippedForTable,
                ];
            }
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }

        return response()->json([
            'success' => true,
            'message' => 'ডাটাবেজ সফলভাবে সিঙ্ক্রোনাইজ ও মার্জ সম্পন্ন হয়েছে!',
            'source_meta' => $sync['meta'] ?? null,
            'report' => $report,
        ]);
    }

    /**
     * Download a .sql backup file from the backup/ directory.
     */
    public function downloadSql(string $filename)
    {
        $cleanName = basename($filename);
        if (!str_ends_with(strtolower($cleanName), '.sql')) {
            return response()->json(['success' => false, 'message' => 'Invalid file type.'], 400);
        }

        $fullPath = $this->getBackupDir() . DIRECTORY_SEPARATOR . $cleanName;
        if (!file_exists($fullPath) || !is_file($fullPath)) {
            return response()->json(['success' => false, 'message' => 'Backup file not found.'], 404);
        }

        return response()->download($fullPath, $cleanName);
    }

    private function getDatabaseTables(): array
    {
        $rows = DB::select('SHOW TABLES');
        $tables = [];
        foreach ($rows as $row) {
            $arr = array_values((array) $row);
            if (!empty($arr[0])) {
                $tables[] = (string) $arr[0];
            }
        }
        return $tables;
    }
}
