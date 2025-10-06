CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS midik (
                                     id INT AUTO_INCREMENT PRIMARY KEY,
                                     name VARCHAR(255) NOT NULL
    );

INSERT INTO midik (name) VALUES
                             ('Akai MPK mini MK3 MIDI mesterbillentyűzet Red'),
                             ('Arturia MiniLab 3 MIDI mesterbillentyűzet White'),
                             ('Arturia KeyLab Essential 61 mk3 MIDI mesterbillentyűzet White'),
                             ('M-Audio Oxygen Pro Mini MIDI mesterbillentyűzet'),
                             ('Novation FLkey Mini MIDI mesterbillentyűzet'),
                             ('Nektar SE61 MIDI mesterbillentyűzet'),
                             ('Native Instruments Komplete Kontrol M32 MIDI mesterbillentyűzet'),
                             ('Arturia MicroLab mk3 MIDI mesterbillentyűzet White'),
                             ('Novation FLkey 61 MIDI mesterbillentyűzet');
