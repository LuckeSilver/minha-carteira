SET @table_name = (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'Category'
    ) THEN 'Category'
    ELSE 'category'
  END
);

SET @statement = CONCAT(
  'ALTER TABLE `',
  @table_name,
  '` ADD COLUMN `icon` VARCHAR(191) NOT NULL DEFAULT ''receipt'';'
);

PREPARE migration_stmt FROM @statement;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;
