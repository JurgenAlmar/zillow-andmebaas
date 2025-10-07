Zillow andmebaasi seemne skript

See projekt sisaldab MariaDB andmebaasi skeemi ja suurandmete seemne skripti, mis täidab tabelid realistlike andmetega. Kõige suurem mitte-lookup tabel properties sisaldab vähemalt 2 000 000 rida. Teistes tabelites on mõistlik suurus ja kõik FK-seosed on korrektsed.

Sisu

dump.sql — andmebaasi skeem.

seed.js — Bun skript suurandmete genereerimiseks ja lisamiseks.

README.md — juhend projekti käivitamiseks nullist.

Eeldused

MariaDB 12.0.2 või uuem

Bun (https://bun.sh/
) — JavaScript runtime

Võrgukonfiguratsioon ja ligipääs andmebaasile

Sammud nullist käivitamiseks
1. Andmebaasi loomine ja skeemi import

Loo andmebaas:

CREATE DATABASE zillow CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;


Impordi skeem:

mysql -u kasutaja -p zillow < dump.sql


Asenda kasutaja ja vajadusel -p parooliga.

2. Vajalikud paketid

Installi vajalikud npm paketid Bun-iga:

bun install

3. Seadista seed.js

Muuda failis seed.js andmebaasi ühenduse parameetrid vastavalt oma keskkonnale:

const pool = mariadb.createPool({
  host: 'localhost',
  user: 'dbuser',       // oma kasutajanimi
  password: 'dbpass',   // oma parool
  database: 'zillow',
  connectionLimit: 5,
});

4. Seed skripti käivitamine

Käivita andmete genereerimise ja importimise skript:

bun run seed.js


See täidab tabelid järgmiste mahtudega:

Tabel	Ridade arv	Märkused
users	200 000	Kasutajad
properties	2 000 000	Peamine mitte-lookup tabel (suurem)
property_images	~10 000 000	Keskmiselt 5 pilti kinnisvara kohta
favorites	1 000 000	Kasutajate lemmikud
inquiries	500 000	Päringud kinnisvara kohta
5. Ehtsus ja terviklikkus

Kõik andmed on genereeritud realistlikena, kasutades faker raamatukogu.

Võõrvõtmed on kontrollitud ja ei teki orvukirjeid.

Andmed on genereeritud partii kaupa, mis tagab jõudluse ja takistab massilist lockimist.

Seeder on reprodutseeritav seemne abil (faker.seed(12345)).

Indeksid ja FK kontrollid on deaktiveeritud sisestuse ajal ja aktiveeritud pärast seda.

6. Indeksite ja FK-de haldamine

Seed skript lülitab enne sisestust FOREIGN_KEY_CHECKS=0 ja lülitab pärast tagasi 1. Indekseid ei kustutata, vaid täidetakse massiliselt.

7. Täiendavad märkused

Skript on mõeldud kasutamiseks Bun runtime keskkonnas.

Võimalik suurendada või vähendada ridade arvu seed.js failis funktsioonide argumentides.

Kui andmebaas on suur, võib kogu täitmine võtta mitu tundi, olenevalt riistvarast.
