CREATE TABLE IF NOT EXISTS vendor_followups (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NULL,
  date DATE NOT NULL,
  type ENUM('Call','Email','Meeting','Visit') NOT NULL DEFAULT 'Call',
  subject VARCHAR(200) NULL,
  notes TEXT NULL,
  priority ENUM('High','Medium','Low') NOT NULL DEFAULT 'Medium',
  status ENUM('Pending','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  business_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vf_vendor (vendor_id),
  INDEX idx_vf_business (business_id),
  CONSTRAINT fk_vf_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  CONSTRAINT fk_vf_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
