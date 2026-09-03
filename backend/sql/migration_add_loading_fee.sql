-- ==========================================================
-- MIGRATION: ADD LOADING FEE (BIAYA BONGKAR) COLUMNS
-- Date: 2026-09-03
-- Project: RAM BERKAH SAWIT TUA
-- ==========================================================

USE `ram_berkah_sawit_tua`;

-- 1. Tambah tarif default biaya bongkar pada tabel settings
ALTER TABLE `settings` 
ADD COLUMN IF NOT EXISTS `default_loading_fee` DECIMAL(10, 2) NOT NULL DEFAULT 10.00 AFTER `default_price`;

-- 2. Tambah tarif dan nominal biaya bongkar pada tabel transactions
ALTER TABLE `transactions` 
ADD COLUMN IF NOT EXISTS `loading_fee_per_kg` DECIMAL(10, 2) NOT NULL DEFAULT 10.00 AFTER `price_per_kg`,
ADD COLUMN IF NOT EXISTS `loading_fee` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 AFTER `loading_fee_per_kg`;

-- 3. Update data transaksi lama yang sudah ada (hitung loading_fee jika diperlukan)
UPDATE `transactions`
SET 
  `loading_fee_per_kg` = 10.00,
  `loading_fee` = ROUND(`netto_kg` * 10.00, 2)
WHERE `loading_fee` = 0.00 AND `netto_kg` > 0;
