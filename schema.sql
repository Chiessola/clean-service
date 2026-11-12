-- Clean & Services (MySQL) : à importer dans phpMyAdmin (onglet Importer)
SET NAMES utf8mb4;
CREATE TABLE users(id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(190) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role ENUM('admin','user') NOT NULL DEFAULT 'user', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE profiles(user_id INT PRIMARY KEY, full_name VARCHAR(150), phone VARCHAR(30), quartier VARCHAR(100), address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB;
CREATE TABLE plans(id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(80), position INT, passages_per_week INT, price INT, description TEXT) ENGINE=InnoDB;
CREATE TABLE subscriptions(id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, plan_id INT NOT NULL, amount INT, passage_days TEXT, payer_name VARCHAR(150), payer_phone VARCHAR(30), payment_ref VARCHAR(100), status ENUM('pending','active','expired','rejected') DEFAULT 'pending', start_date DATE, end_date DATE, reminded_3d TINYINT(1) DEFAULT 0, reminded_1d TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, validated_at DATETIME NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(plan_id) REFERENCES plans(id)) ENGINE=InnoDB;
CREATE TABLE notifications(id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, audience ENUM('admin','client'), phone VARCHAR(30), kind VARCHAR(30), message TEXT, sent TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
INSERT INTO plans(name,position,passages_per_week,price,description) VALUES
('Pack Classique',1,1,3000,'1 passage / semaine (4 passages / mois)'),
('Classique Plus',2,2,4000,'2 passages / semaine (8 passages / mois)'),
('Classique Full',3,3,5000,'3 passages / semaine (12 passages / mois)'),
('Pack Premium',4,2,5000,'2 passages / semaine (8 / mois) + conditionnement des ordures (02 sacs-poubelle à domicile inclus)'),
('Pack VIP',5,3,10000,'3 passages / semaine (12 / mois) + conditionnement des ordures (01 bac à ordures de 120L à domicile inclus)');
