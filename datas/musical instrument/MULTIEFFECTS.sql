CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS effektek_multieffekt (
                                                    id INT AUTO_INCREMENT PRIMARY KEY,
                                                    name VARCHAR(255) NOT NULL
    );

INSERT INTO effektek_multieffekt (name) VALUES
                                            ('BOSS GT-1 gitár multieffekt processzor'),
                                            ('Line 6 HX Stomp gitár padló multieffekt'),
                                            ('BOSS GT-1000 gitár padló multieffekt'),
                                            ('HeadRush MX5 gitár padló multieffekt'),
                                            ('VOX StompLab 1B basszusgitár padló multieffekt'),
                                            ('Zoom MS-50G+ MultiStomp gitár effektpedál'),
                                            ('Line 6 Helix Floor gitár padló multieffekt'),
                                            ('BOSS SY-1 Synthesizer gitár/basszusgitár szintetizátor effektpedál'),
                                            ('JAM pedals Pink Flow gitár padló multieffekt'),
                                            ('BOSS SL-2 Slicer effektpedál'),
                                            ('BOSS GM-800 gitárszintetizátor');
