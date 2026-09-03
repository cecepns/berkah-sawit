-- ==========================================================
-- RAM BERKAH SAWIT TUA - DATABASE SCHEMA
-- Palm Oil Weighing & Order Management System
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `ram_berkah_sawit_tua` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ram_berkah_sawit_tua`;

-- ----------------------------------------------------------
-- 1. SETTINGS TABLE (RAM Identity & General Settings)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ram_name` VARCHAR(150) NOT NULL DEFAULT 'RAM BERKAH SAWIT TUA',
  `ram_code` VARCHAR(20) NOT NULL DEFAULT 'BST',
  `location_line1` VARCHAR(150) NOT NULL DEFAULT 'Tanjung Enim',
  `location_line2` VARCHAR(150) NOT NULL DEFAULT 'Muara Enim, Sumatera Selatan',
  `phone` VARCHAR(50) DEFAULT '0812-3456-7890',
  `address` TEXT DEFAULT 'Jl. Lintas Sumatera Km. 12, Tanjung Enim',
  `ticket_prefix` VARCHAR(10) NOT NULL DEFAULT 'BST',
  `receipt_footer` TEXT DEFAULT 'Terima kasih atas kerjasama Anda\nHarap simpan nota ini sebagai bukti timbang yang sah.',
  `receipt_width` VARCHAR(10) NOT NULL DEFAULT '58mm',
  `rounding_rule` VARCHAR(20) NOT NULL DEFAULT 'exact', -- exact, round_nearest, round_floor, round_ceil
  `default_price` DECIMAL(12, 2) NOT NULL DEFAULT 2650.00,
  `default_loading_fee` DECIMAL(10, 2) NOT NULL DEFAULT 10.00, -- Biaya / upah bongkar default per kg
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 2. USERS TABLE (Role-based access)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'operator') NOT NULL DEFAULT 'operator',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. SUPPLIERS TABLE
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `supplier_code` VARCHAR(50) UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `do_name` VARCHAR(150) DEFAULT NULL, -- Nama DO / KUD
  `phone` VARCHAR(50) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `village` VARCHAR(100) DEFAULT NULL, -- Desa
  `district` VARCHAR(100) DEFAULT NULL, -- Kecamatan
  `regency` VARCHAR(100) DEFAULT 'Muara Enim', -- Kabupaten
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_supplier_name` (`name`),
  INDEX `idx_supplier_do` (`do_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. DRIVERS TABLE (Cached / Master Sopir)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `drivers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(50) DEFAULT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 5. VEHICLES TABLE (Cached / Master Plat Nomor)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `plate_number` VARCHAR(20) NOT NULL UNIQUE,
  `owner_name` VARCHAR(100) DEFAULT NULL,
  `type` VARCHAR(50) DEFAULT 'Truck / Pick Up',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 6. SORTATION SETTINGS TABLE (Master Kategori Sortasi)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sortation_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `default_deduction_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `badge_color` VARCHAR(20) NOT NULL DEFAULT 'green', -- green, yellow, red, orange, gray
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 7. PRICE SETTINGS TABLE (Master Harga Harian TBS)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `price_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `effective_date` DATE NOT NULL UNIQUE,
  `price_per_kg` DECIMAL(12, 2) NOT NULL,
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 8. TRANSACTIONS TABLE (Pencatatan Penimbangan TBS)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_number` VARCHAR(50) NOT NULL UNIQUE,
  `supplier_id` INT DEFAULT NULL,
  `supplier_name` VARCHAR(150) NOT NULL,
  `supplier_do` VARCHAR(150) DEFAULT NULL,
  `driver_name` VARCHAR(100) NOT NULL,
  `plate_number` VARCHAR(20) NOT NULL,
  `origin` VARCHAR(150) DEFAULT NULL,
  `block` VARCHAR(100) DEFAULT NULL,
  
  -- Weighing Data
  `gross_kg` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `tare_kg` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `netto_kg` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  
  -- Deductions & Sortation
  `sortation` VARCHAR(50) NOT NULL DEFAULT 'Matang',
  `deduction_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `deduction_kg` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `clean_kg` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  
  -- Pricing & Fees
  `price_per_kg` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `loading_fee_per_kg` DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
  `loading_fee` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `total_price` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  
  -- Meta & Operator
  `transaction_date` DATE NOT NULL,
  `transaction_time` TIME NOT NULL,
  `operator_id` INT DEFAULT NULL,
  `operator_name` VARCHAR(100) DEFAULT 'Operator',
  `notes` TEXT DEFAULT NULL,
  
  -- Status & Sync
  `status` ENUM('completed', 'cancelled', 'draft') NOT NULL DEFAULT 'completed',
  `cancel_reason` TEXT DEFAULT NULL,
  `cancelled_by` INT DEFAULT NULL,
  `cancelled_at` DATETIME DEFAULT NULL,
  `sync_status` ENUM('synced', 'local_only', 'pending') NOT NULL DEFAULT 'synced',
  `local_uuid` VARCHAR(100) DEFAULT NULL UNIQUE,
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`cancelled_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_trans_date` (`transaction_date`),
  INDEX `idx_trans_ticket` (`ticket_number`),
  INDEX `idx_trans_plate` (`plate_number`),
  INDEX `idx_trans_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 9. AUDIT LOGS TABLE
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `user_name` VARCHAR(100) DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` VARCHAR(50) DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- INITIAL SEED DATA
-- ==========================================================

-- 1. Default RAM Settings
INSERT INTO `settings` (`id`, `ram_name`, `ram_code`, `location_line1`, `location_line2`, `phone`, `address`, `ticket_prefix`, `receipt_footer`, `receipt_width`, `rounding_rule`, `default_price`)
VALUES (1, 'RAM BERKAH SAWIT TUA', 'BST', 'Tanjung Enim', 'Tanjung Enim', '0812-7890-1234', 'Jl. Sawit Raya No. 88, Tanjung Enim', 'BST', 'TERIMA KASIH\nRAM BERKAH SAWIT TUA', '58mm', 'exact', 2650.00)
ON DUPLICATE KEY UPDATE `ram_name` = VALUES(`ram_name`);

-- 2. Default Users (Passwords hashed for 'admin123' and 'operator123')
-- Hash for 'admin123' is $2a$10$w8c6qBwzR81gLdklqH7tOOnpWjUeO1E2x1Kj0i/N.z7pQn4M45x2q
-- Hash for 'operator123' is $2a$10$w8c6qBwzR81gLdklqH7tOOnpWjUeO1E2x1Kj0i/N.z7pQn4M45x2q (or dynamic in server.js seed check)
INSERT INTO `users` (`id`, `name`, `username`, `password`, `role`, `status`)
VALUES 
(1, 'Administrator RAM', 'admin', '$2a$10$qV0tNfxIcgj8wL61nZ8nmeFmQ7/e7tT891eFhZqWfB0Gz7Z1wKqeq', 'admin', 'active'),
(2, 'Operator Timbang 1', 'operator', '$2a$10$qV0tNfxIcgj8wL61nZ8nmeFmQ7/e7tT891eFhZqWfB0Gz7Z1wKqeq', 'operator', 'active')
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- 3. Default Sortation Master
INSERT INTO `sortation_settings` (`id`, `name`, `default_deduction_percent`, `badge_color`, `status`)
VALUES
(1, 'Matang', 0.00, 'green', 'active'),
(2, 'Mengkal', 3.00, 'orange', 'active'),
(3, 'Mentah', 5.00, 'red', 'active'),
(4, 'Lewat Matang', 3.00, 'orange', 'active'),
(5, 'Busuk', 10.00, 'red', 'active'),
(6, 'Brondolan', 1.00, 'yellow', 'active'),
(7, 'Campuran', 3.00, 'gray', 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 4. Initial Daily Price (Today)
INSERT INTO `price_settings` (`effective_date`, `price_per_kg`, `notes`, `created_by`)
VALUES (CURDATE(), 2650.00, 'Harga harian standar TBS', 1)
ON DUPLICATE KEY UPDATE `price_per_kg` = VALUES(`price_per_kg`);

-- 5. Default Suppliers
INSERT INTO `suppliers` (`supplier_code`, `name`, `do_name`, `phone`, `address`, `village`, `district`, `regency`, `status`, `notes`)
VALUES
('SUP-001', 'PT Sinar Jaya', 'KUD Makmur', '0812-7123-4567', 'Jl. Raya Desa Air Paku', 'Air Paku', 'Lawang Kidul', 'Muara Enim', 'active', 'Supplier reguler armada truk'),
('SUP-002', 'CV Tani Subur', 'DO Tani Mandiri', '0813-8822-1100', 'Desa Lingga Blok C', 'Lingga', 'Lawang Kidul', 'Muara Enim', 'active', 'Kelompok tani plasma'),
('SUP-003', 'Petani Mandiri', 'Petani Swadaya', '0852-9900-3344', 'Dusun IV Tanjung Enim', 'Tanjung Enim', 'Lawang Kidul', 'Muara Enim', 'active', 'Petani swadaya langsung'),
('SUP-004', 'Koperasi Sawit Sejahtera', 'KUD Sejahtera', '0821-3456-9988', 'Desa Keban Agung', 'Keban Agung', 'Lawang Kidul', 'Muara Enim', 'active', 'Koperasi kemitraan pabrik'),
('SUP-005', 'H. Syamsul Bahri', 'DO Pribadi', '0812-6677-8899', 'Jl. Tambang Banko', 'Tegal Rejo', 'Lawang Kidul', 'Muara Enim', 'active', 'Kebun mandiri 50 hektar')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 6. Default Drivers & Vehicles
INSERT INTO `drivers` (`name`, `phone`, `status`)
VALUES 
('Budi Santoso', '0812-9988-1122', 'active'),
('Andi Wijaya', '0813-7766-5544', 'active'),
('Rudi Hermawan', '0852-3344-9988', 'active'),
('Yanto', '0822-1122-3344', 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `vehicles` (`plate_number`, `owner_name`, `type`, `status`)
VALUES 
('KH 1234 AB', 'PT Sinar Jaya', 'Colt Diesel PS120', 'active'),
('BG 8765 EA', 'CV Tani Subur', 'Dump Truck Hino Dutro', 'active'),
('BG 4321 CD', 'H. Syamsul Bahri', 'Canter HD125', 'active'),
('BG 9988 TA', 'KUD Makmur', 'Isuzu Giga', 'active')
ON DUPLICATE KEY UPDATE `plate_number` = VALUES(`plate_number`);

-- 7. Sample Initial Transactions (For immediate preview & reporting demonstrations)
INSERT INTO `transactions` 
(`ticket_number`, `supplier_id`, `supplier_name`, `supplier_do`, `driver_name`, `plate_number`, `origin`, `block`, `gross_kg`, `tare_kg`, `netto_kg`, `sortation`, `deduction_percent`, `deduction_kg`, `clean_kg`, `price_per_kg`, `total_price`, `transaction_date`, `transaction_time`, `operator_id`, `operator_name`, `status`, `sync_status`)
VALUES
(CONCAT('BST-', DATE_FORMAT(CURDATE(), '%y%m%d'), '-0001'), 1, 'PT Sinar Jaya', 'KUD Makmur', 'Budi Santoso', 'KH 1234 AB', 'Blok A12, Desa Air Paku', 'A12', 5529.00, 1500.00, 4029.00, 'Matang', 3.00, 120.87, 3908.13, 2650.00, 10356544.50, CURDATE(), '08:23:00', 2, 'Operator Timbang 1', 'completed', 'synced'),
(CONCAT('BST-', DATE_FORMAT(CURDATE(), '%y%m%d'), '-0002'), 2, 'CV Tani Subur', 'DO Tani Mandiri', 'Andi Wijaya', 'BG 8765 EA', 'Lingga Blok C', 'C3', 6850.00, 1850.00, 5000.00, 'Mengkal', 3.00, 150.00, 4850.00, 2650.00, 12852500.00, CURDATE(), '08:45:00', 2, 'Operator Timbang 1', 'completed', 'synced'),
(CONCAT('BST-', DATE_FORMAT(CURDATE(), '%y%m%d'), '-0003'), 3, 'Petani Mandiri', 'Petani Swadaya', 'Yanto', 'BG 4321 CD', 'Tanjung Enim Hulu', 'Blok 1', 3420.00, 1220.00, 2200.00, 'Matang', 0.00, 0.00, 2200.00, 2650.00, 5830000.00, CURDATE(), '09:12:00', 2, 'Operator Timbang 1', 'completed', 'synced');
