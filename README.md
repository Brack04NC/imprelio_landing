# Imprelio landing

Sito di presentazione di Imprelio, con landing e manuale utente, costruito con Vite, HTML, CSS e JavaScript.

## Sviluppo

Richiede Node.js 20.19 o Node.js 22.12 e successivi, secondo il requisito di Vite. Avvia lo sviluppo dalla radice del repository.

```bash
npm ci
npm run dev
```

Esegui i controlli e genera la build di produzione in `dist/`.

```bash
npm test
npm run build
```

`npm test` verifica i riferimenti agli asset, le ancore interne e la sintassi degli URL della landing e della guida. Gli asset si trovano in `public/`. Per servire la build in locale, esegui `npm run preview`.

## Confronto prima e dopo

Per generare il confronto, usa un checkout Git che contenga il commit di partenza `ab40995`. Lo script usa Git, `tar` e npm. Crea `/prima/` dal commit di partenza e `/dopo/` dai file correnti, mantenendo la guida e il PDF all’interno di ciascuna versione.

```bash
npm run build:confronto
npm run preview -- --outDir dist-confronto
```

L’indice per scegliere la versione è alla radice dell’anteprima. La configurazione Sites usa `dist-confronto/` come radice statica. Esegui `npm run build:confronto` prima di avviare `sites-preview start .` in un ambiente che supporta l’anteprima Sites.

## Guida operativa

La pagina del manuale è in `guida/index.html`. I moduli principali del gestionale hanno ciascuno un capitolo raggiungibile dall’indice. La versione scaricabile `public/guida-imprelio.pdf` deriva dalla stessa pagina con gli stili di stampa in `src/guide.css`.

Dopo aver modificato la guida, avvia Vite con `npm run dev`, apri `/guida/` in Chromium e salva la pagina in PDF impostando il formato A4 e disattivando intestazioni e piè di pagina del browser. Sostituisci `public/guida-imprelio.pdf`, quindi esegui `npm test` e `npm run build`. Gli stili della guida aggiungono la numerazione delle pagine.

## Brief e accettazione

La pagina si rivolge alle imprese che montano e smontano ponteggi. Presenta le funzioni del prodotto e propone due destinazioni, l’accesso al gestionale per gli utenti e il sito DoubleN per chi vuole approfondire. I clic verso queste destinazioni sono un possibile indicatore per una futura misurazione. La landing non installa strumenti di tracciamento.

Il collaudo copre la lettura su desktop e mobile, l’apertura di navigazione e FAQ con la tastiera, il caricamento degli asset e la verifica della build. Il proxy cloud ha restituito un `403` per entrambi i siti pubblici. La direzione visiva riprende il marchio, la fotografia e i colori di Imprelio dal repository sorgente.

## Provenienza dei contenuti

Le funzionalità presentate e le schermate di Dashboard e Agenda provengono dalla versione `21b8dfa` di Imprelio. Le schermate sono state acquisite eseguendo la demo locale con dati sintetici. [Repository sorgente](https://github.com/Brack04NC/Imprelio/tree/21b8dfa505a04901d231bc0f34f46ce74be8f10b)
