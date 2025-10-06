CREATE DATABASE IF NOT EXISTS datas;
USE datas;

CREATE TABLE IF NOT EXISTS dawok (
                                     id INT AUTO_INCREMENT PRIMARY KEY,
                                     name VARCHAR(255) NOT NULL
    );

INSERT INTO dawok (name) VALUES
                             ('Behringer X-TOUCH ONE DAW vezérlő'),
                             ('Behringer X-Touch Compact DAW vezérlő'),
                             ('Behringer X-Touch Extender DAW vezérlő'),
                             ('Nektar Panorama CS12 DAW vezérlő'),
                             ('Novation Launch Control XL MK3 DAW vezérlő'),
                             ('Korg nanoKONTROL Studio DAW vezérlő'),
                             ('Presonus FaderPort 16 DAW vezérlő'),
                             ('Novation Launch Control XL MK2 BK DAW vezérlő'),
                             ('Slate Audio Raven Core Station Duo DAW vezérlő'),
                             ('AVID Pro Tools Dock Control Surface DAW vezérlő');
