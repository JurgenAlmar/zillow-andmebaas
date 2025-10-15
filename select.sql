-- 1️⃣ Kuvab kõik aktiivsed kuulutused, hinnatud alates odavaimast
SELECT 
    p.property_id AS ID,
    p.address AS Aadress,
    p.city AS Linn,
    p.price AS Hind,
    p.property_type AS Tüüp
FROM properties p
WHERE p.status = 'active'
ORDER BY p.price ASC
LIMIT 10;

-- 2️⃣ Kuvab iga kasutaja ja tema lisatud kinnisvara koguarvu
SELECT 
    u.username AS Kasutaja,
    COUNT(p.property_id) AS 'Lisatud kuulutused'
FROM users u
LEFT JOIN properties p ON u.user_id = p.owner_id
GROUP BY u.user_id
ORDER BY COUNT(p.property_id) DESC;

-- 3️⃣ Kuvab populaarsemad linnad, kus on üle 1 kuulutuse
SELECT 
    p.city AS Linn,
    COUNT(p.property_id) AS 'Kuulutuste arv'
FROM properties p
GROUP BY p.city
HAVING COUNT(p.property_id) > 1
ORDER BY COUNT(p.property_id) DESC;

-- 4️⃣ Kuvab kasutajate lemmikuks märgitud kuulutused koos kasutajanime ja hinnaga
SELECT 
    u.username AS Kasutaja,
    p.address AS Aadress,
    p.price AS Hind
FROM favorites f
INNER JOIN users u ON f.user_id = u.user_id
INNER JOIN properties p ON f.property_id = p.property_id
ORDER BY u.username;

-- 5️⃣ Kuvab iga kinnisvara keskmise magamistubade ja vannitubade suhte linna kaupa
SELECT 
    city AS Linn,
    AVG(bedrooms) AS 'Keskmine magamistubade arv',
    AVG(bathrooms) AS 'Keskmine vannitubade arv'
FROM properties
GROUP BY city
ORDER BY AVG(bedrooms) DESC;

-- 6️⃣ Kuvab kõik päringud, koos kasutaja ja kinnisvara andmetega (3 tabeli ühendus)
SELECT 
    i.inquiry_id AS Päringu_ID,
    u.username AS Küsimuse_esitaja,
    p.address AS Kinnisvara_aadress,
    i.message AS Sõnum,
    i.inquiry_at AS Kuupäev
FROM inquiries i
INNER JOIN users u ON i.user_id = u.user_id
INNER JOIN properties p ON i.property_id = p.property_id
WHERE i.message IS NOT NULL
ORDER BY i.inquiry_at DESC;
