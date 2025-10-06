CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS muanyag_trombitak (
                                                 id INT AUTO_INCREMENT PRIMARY KEY,
                                                 name VARCHAR(255) NOT NULL
    );

INSERT INTO muanyag_trombitak (name) VALUES
                                         ('pTrumpet 700626 Műanyag trombita Blue'),
                                         ('pTrumpet 700631 Műanyag trombita White'),
                                         ('pTrumpet 700627 Műanyag trombita Yellow');
