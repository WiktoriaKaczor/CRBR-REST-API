const express = require("express");
const soap = require("soap");
const bodyParser = require("body-parser");
const xml2js = require("xml2js");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());

// Walidacja NIP
function isValidNIP(nip) {
    if (!/^\d{10}$/.test(nip)) return false;
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    const digits = nip.split("").map(d => parseInt(d, 10));
    const control = digits.slice(0, 9)
        .reduce((acc, d, i) => acc + d * weights[i], 0) % 11;
    return control === digits[9];
}

// Parser SOAP XML - lista beneficjentów
async function parseBeneficiaries(xmlString) {
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlString);

    const body = result['soap:Envelope']?.['soap:Body'];
    if (!body) return [];

    const response = body['ns3:PobierzZgloszeniaOdpowiedz'] || body['PobierzZgloszeniaOdpowiedz'];
    const dane = response?.PobierzZgloszeniaOdpowiedzDane;
    const listaZgloszen = dane?.['ns2:ListaZgloszenSpolki']?.['ns2:ZgloszenieSpolki'];

    if (!listaZgloszen) return [];

    const benefsArray = [];
    const zgloszenia = Array.isArray(listaZgloszen) ? listaZgloszen : [listaZgloszen];

    for (const z of zgloszenia) {
        const listaBenef = z?.['ns2:ListaBeneficjentowRzeczywistych']?.['ns2:BeneficjentRzeczywisty'];
        if (!listaBenef) continue;

        const beneficjenci = Array.isArray(listaBenef) ? listaBenef : [listaBenef];

        for (const b of beneficjenci) {
            benefsArray.push({
                firstName: b['ns2:PierwszeImie'] || b.PierwszeImie,
                lastName: b['ns2:Nazwisko'] || b.Nazwisko,
                pesel: b['ns2:PESEL'] || b.PESEL,
            });
        }
    }

    return benefsArray;
}

// Funkcja pobierająca beneficjentów z CRBR
async function fetchBeneficialOwnersFromCRBR(nip) {
    const wsdlUrl = "https://bramka-crbr.mf.gov.pl:5058/uslugiBiznesowe/uslugiESB/AP/ApiPrzegladoweCRBR/2022/12/01?wsdl";

    return new Promise((resolve, reject) => {
        soap.createClient(wsdlUrl, (err, client) => {
            if (err) return reject(err);

            client.addSoapHeader({
                "xmlns:crbr": "http://www.mf.gov.pl/uslugiBiznesowe/uslugiESB/AP/ApiPrzegladoweCRBR/2022/12/01",
            });

            client.PobierzInformacjeOSpolkachIBeneficjentach(
                { "crbr:nip": nip },
                (err, result, rawResponse) => {
                    if (err) {
                        // Błąd lub brak danych
                        if (err.root?.Envelope?.Body?.Fault?.faultcode === "env:Client") {
                            return resolve([]);
                        }
                        return reject(new Error("UPSTREAM_ERROR"));
                    }

                    parseBeneficiaries(rawResponse)
                        .then(resolve)
                        .catch(reject);
                }
            );
        });
    });
}

// Endpoint: lista beneficjentów
app.get("/beneficial-owners/:nip", async (req, res) => {
    const { nip } = req.params;

    if (!isValidNIP(nip)) {
        return res.status(400).json({ error: "INVALID_NIP" });
    }

    try {
        const owners = await fetchBeneficialOwnersFromCRBR(nip);

        if (!owners || owners.length === 0) {
            return res.status(404).json({ error: "NOT_FOUND" });
        }

        res.json(owners);
    } catch (e) {
        console.error(e);
        res.status(502).json({ error: "UPSTREAM_ERROR" });
    }
});

// Endpoint: dane kandydata
app.get("/me", (req, res) => {
    res.json({
        firstName: "TwojeImię",
        lastName: "TwojeNazwisko",
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
