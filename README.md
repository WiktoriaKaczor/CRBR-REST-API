CRBR REST API
=============

Małe REST API do pobierania beneficjentów rzeczywistych z CRBR.

------------------------------
Wymagania
------------------------------
- Node.js 18+  
- npm

------------------------------
Instalacja
------------------------------
1. Sklonuj repozytorium:
   `git clone https://github.com/WiktoriaKaczor/CRBR-REST-API.git`

2. Przejdź do folderu projektu:
   `cd api`

3. Zainstaluj zależności:
   `npm install`

4. Uruchom serwer:
   `npm start`

Serwer będzie dostępny pod adresem:
   http://localhost:8080

------------------------------
Endpoints
------------------------------

1. **GET /me**

Zwraca dane kandydata:

Przykład wywołania:
   `curl http://localhost:8080/me`

Odpowiedź JSON:
`{
  "firstName": "TwojeImię",
  "lastName": "TwojeNazwisko"
}`

------------------------------

2. **GET /beneficial-owners/:nip**

Pobiera listę beneficjentów rzeczywistych dla wskazanego NIP.

Przykład wywołania:
   `curl http://localhost:8080/beneficial-owners/1234567890`

Przykładowa odpowiedź JSON:
`[
  { "firstName": "Jan", "lastName": "Kowalski", "pesel": "80010112345" },
  { "firstName": "Anna", "lastName": "Nowak", "pesel": "82050598765" }
]`

------------------------------
Walidacja i obsługa błędów
------------------------------

- Błędny NIP → 400 Bad Request
`{
  "error": "INVALID_NIP"
}`

- Brak danych w CRBR dla NIP → 404 Not Found
`{
  "error": "NOT_FOUND"
}`

- Błąd po stronie CRBR / timeout / limit CRBR → 502
`{
  "error": "UPSTREAM_ERROR"
}`
