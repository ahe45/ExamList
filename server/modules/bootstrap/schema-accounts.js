async function ensureAdminAccountColumns(
  connection,
  { dropIndexIfExists, ensureColumn, ensureIndex, hasColumn },
) {
  const hasLegacyUsername = await hasColumn(connection, {
    columnName: "username",
    tableName: "admin_accounts",
  });
  const hasUserId = await hasColumn(connection, {
    columnName: "user_id",
    tableName: "admin_accounts",
  });

  if (hasLegacyUsername && !hasUserId) {
    await connection.query(
      `
        ALTER TABLE \`admin_accounts\`
        CHANGE COLUMN \`username\` \`user_id\` VARCHAR(100) NOT NULL COMMENT '로그인 ID'
      `,
    );
  } else {
    await ensureColumn(connection, {
      columnName: "user_id",
      definition: "user_id VARCHAR(100) NOT NULL COMMENT '로그인 ID' AFTER id",
      tableName: "admin_accounts",
    });
  }

  const hasLegacyDisplayName = await hasColumn(connection, {
    columnName: "display_name",
    tableName: "admin_accounts",
  });
  const hasUserName = await hasColumn(connection, {
    columnName: "user_name",
    tableName: "admin_accounts",
  });

  if (hasLegacyDisplayName && !hasUserName) {
    await connection.query(
      `
        ALTER TABLE \`admin_accounts\`
        CHANGE COLUMN \`display_name\` \`user_name\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '계정 표시명'
      `,
    );
  } else {
    await ensureColumn(connection, {
      columnName: "user_name",
      definition: "user_name VARCHAR(120) NOT NULL DEFAULT '' COMMENT '계정 표시명' AFTER user_id",
      tableName: "admin_accounts",
    });
  }

  await connection.query(
    `
      ALTER TABLE \`admin_accounts\`
      MODIFY COLUMN \`user_id\` VARCHAR(100) NOT NULL COMMENT '로그인 ID',
      MODIFY COLUMN \`user_name\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '계정 표시명'
    `,
  );

  await ensureColumn(connection, {
    columnName: "role",
    definition: "role ENUM('super_admin', 'admin', 'user') NOT NULL DEFAULT 'user' COMMENT '계정 권한' AFTER password_hash",
    tableName: "admin_accounts",
  });
  await connection.query(
    `
      ALTER TABLE \`admin_accounts\`
      MODIFY COLUMN \`role\` VARCHAR(32) NOT NULL DEFAULT 'user' COMMENT '계정 권한'
    `,
  );
  await connection.query(
    `
      UPDATE \`admin_accounts\`
      SET \`role\` = CASE LOWER(\`role\`)
        WHEN 'super_admin' THEN 'super_admin'
        WHEN 'admission_admin' THEN 'admin'
        WHEN 'template_manager' THEN 'admin'
        WHEN 'pdf_generator' THEN 'user'
        WHEN 'viewer' THEN 'user'
        WHEN 'admin' THEN 'admin'
        WHEN 'user' THEN 'user'
        ELSE 'user'
      END
    `,
  );
  await connection.query(
    `
      ALTER TABLE \`admin_accounts\`
      MODIFY COLUMN \`role\` ENUM('super_admin', 'admin', 'user') NOT NULL DEFAULT 'user' COMMENT '계정 권한'
    `,
  );

  await ensureIndex(connection, {
    definition: "UNIQUE KEY uniq_admin_accounts_user_id (user_id)",
    indexName: "uniq_admin_accounts_user_id",
    tableName: "admin_accounts",
  });
  await ensureIndex(connection, {
    definition: "KEY idx_admin_accounts_role_active (role, is_active)",
    indexName: "idx_admin_accounts_role_active",
    tableName: "admin_accounts",
  });
  await dropIndexIfExists(connection, {
    indexName: "uniq_admin_accounts_username",
    tableName: "admin_accounts",
  });
}

module.exports = {
  ensureAdminAccountColumns,
};
