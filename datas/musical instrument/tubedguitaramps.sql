CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS gitarerositok_csoves (
                                                    id INT AUTO_INCREMENT PRIMARY KEY,
                                                    name VARCHAR(255) NOT NULL
    );

INSERT INTO gitarerositok_csoves (name) VALUES
                                            ('Orange Dual Terror 30 Csöves gitárerősítők'),
                                            ('Marshall DSL1HR Csöves gitárerősítők'),
                                            ('Marshall 2525H Mini Jubilee 20W Csöves gitárerősítők'),
                                            ('Orange Dark Terror 15W Csöves gitárerősítők'),
                                            ('Marshall 2525H Mini Jubilee 20W Csöves gitárerősítők'),
                                            ('Marshall Origin 20H Csöves gitárerősítők'),
                                            ('Electro Harmonix MIG-50 Csöves gitárerősítők'),
                                            ('Engl E606 Ironball Csöves gitárerősítők'),
                                            ('Vox AC15CH Csöves gitárerősítők'),
                                            ('Victory Amplifiers VX Head The Kraken Csöves gitárerősítők'),
                                            ('Laney IRT15H Csöves gitárerősítők');
