Zillow andmebaasi seemne skript

See projekt sisaldab MariaDB andmebaasi skeemi ja suurandmete seemne skripti, mis täidab tabelid realistlike andmetega. Kõige suurem mitte-lookup tabel properties sisaldab vähemalt 2 000 000 rida. Teistes tabelites on mõistlik suurus ja kõik FK-seosed on korrektsed.

## Sisu

- `dump.sql` — andmebaasi skeem
- `seed.js` — andmete genereerimise skript
- `clear-db.js` — andmebaasi tühjendamise skript
- `docker-compose.yml` — MariaDB konteineri konfiguratsioon
- `README.md` — juhend projekti käivitamiseks

## Eeldused

Ainus vajalik sõltuvus:
- **Docker** ja **Docker Compose**

Kõik muu (MariaDB, Bun, Node.js moodulid) käivitatakse konteinerites.

## Kiirstart

### 1. Käivita konteinerid

```bash
docker compose up -d
```

See käivitab MariaDB ja Bun konteinerid. MariaDB impordib automaatselt `dump.sql` skeemi.

### 2. Installi sõltuvused

```bash
docker compose exec bun bun install
```

### 3. Genereeri andmed

```bash
docker compose exec bun bun seed.js
```

### 4. Tühjenda andmebaas (valikuline)

Kui soovid andmebaasi puhastada ja uuesti täita:

```bash
docker compose exec bun bun clear-db.js
docker compose exec bun bun seed.js
```

### 5. Peata konteinerid

```bash
docker compose down
```

Andmete kustutamiseks koos konteineritega:

```bash
docker compose down -v
```

## Andmemahud

| Tabel             | Ridade arv    | Märkused                              |
|-------------------|---------------|---------------------------------------|
| users             | 200 000       | Kasutajad                            |
| properties        | 2 000 000     | Peamine mitte-lookup tabel (suurem)  |
| property_images   | ~10 000 000   | Keskmiselt 5 pilti kinnisvara kohta  |
| favorites         | 1 000 000     | Kasutajate lemmikud                  |
| inquiries         | 500 000       | Päringud kinnisvara kohta            |

## Andmebaasi ühendus

Vaikimisi konfiguratsioon (muudetav `docker-compose.yml` failis):

```
Host: localhost
Port: 3306
Database: zillow
User: dbuser
Password: dbpass
Root password: rootpassword
```

## Optimeerimised

Seed skript kasutab järgmisi optimeerimisi:
- Autocommit väljalülitamine
- FK ja unique kontrolli ajutine väljalülitamine
- Suurte partii sisestused (5000-50000 rida korraga)
- Perioodilised commit'id mälu haldamiseks
- Reprodutseeritav seeme (`faker.seed(12345)`)

## Märkused

- Kogu andmete genereerimine võib võtta 30-60 minutit olenevalt riistvarast
- Andmebaasi maht võib ulatuda 10-20 GB
- Docker volume `mariadb_data` salvestab andmebaasi püsivalt
