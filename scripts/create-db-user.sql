CREATE DATABASE IF NOT EXISTS `examlist`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'examlist_app'@'localhost'
  IDENTIFIED BY 'examlist_dev_password';
CREATE USER IF NOT EXISTS 'examlist_app'@'127.0.0.1'
  IDENTIFIED BY 'examlist_dev_password';

ALTER USER 'examlist_app'@'localhost'
  IDENTIFIED BY 'examlist_dev_password';
ALTER USER 'examlist_app'@'127.0.0.1'
  IDENTIFIED BY 'examlist_dev_password';

GRANT ALL PRIVILEGES ON `examlist`.* TO 'examlist_app'@'localhost';
GRANT ALL PRIVILEGES ON `examlist`.* TO 'examlist_app'@'127.0.0.1';

FLUSH PRIVILEGES;
