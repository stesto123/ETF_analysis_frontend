# ETF Analytics Mobile App

Un'applicazione mobile completa per l'analisi di dati ETF con grafici interattivi, sviluppata con React Native, Expo e TypeScript.

## 📱 Caratteristiche

- **Grafici Interattivi**: Visualizzazione dell'andamento dei prezzi ETF con grafici lineari
- **Query Personalizzate**: Form intuitivo per selezionare ticker e range di date
- **Cache Intelligente**: Memorizzazione locale dei dati per performance ottimali
- **Design Moderno**: Interfaccia elegante ottimizzata per iOS e Android
- **Gestione Errori**: Feedback chiaro per errori di rete e validazione
- **Pull-to-Refresh**: Aggiornamento dati con gesture nativo

## 🛠 Prerequisiti

Prima di iniziare, assicurati di avere installato:

### Requisiti Base
- **Node.js** (versione 18 o superiore)
  - Scarica da: https://nodejs.org/
  - Verifica installazione: `node --version`

- **npm** o **yarn** (incluso con Node.js)
  - Verifica installazione: `npm --version`

### Per Testing Mobile
- **Expo Go** sul tuo dispositivo mobile:
  - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
  - Android: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Per Simulatori (Opzionale)
- **Xcode** (solo Mac) per simulatore iOS
- **Android Studio** per emulatore Android

## 🚀 Installazione e Setup

### 1. Clona o Scarica il Progetto
```bash
# Se hai git
git clone <repository-url>
cd etf-analytics-app

# Oppure scarica e estrai il file ZIP
```

### 2. Installa le Dipendenze
```bash
# Installa tutte le dipendenze del progetto
npm install

# Oppure con yarn
yarn install
```

### 3. Installa Expo CLI (se non già installato)
```bash
npm install -g @expo/cli
```

## 📱 Come Testare l'App

### Metodo 1: Expo Go (Consigliato per iniziare)

1. **Avvia il server di sviluppo:**
```bash
npm run dev
# oppure
expo start
```

2. **Scansiona il QR Code:**
   - **iOS**: Apri l'app Fotocamera e inquadra il QR code
   - **Android**: Apri Expo Go e usa lo scanner integrato

3. **Requisiti di rete:**
   - Assicurati che computer e dispositivo siano sulla stessa rete WiFi
   - Se hai problemi di connessione, usa il tunnel mode:
   ```bash
   expo start --tunnel
   ```

### Metodo 2: Simulatori/Emulatori

**iOS Simulator (solo Mac):**
```bash
# Assicurati di avere Xcode installato
expo start --ios
```

**Android Emulator:**
```bash
# Assicurati di avere Android Studio e un emulatore configurato
expo start --android
```

### Metodo 3: Web Browser
```bash
# Avvia il server
npm run dev

# Nel terminale, premi 'w' per aprire nel browser
# Oppure vai su http://localhost:8081
```

## 🔧 Comandi Disponibili

```bash
# Avvia il server di sviluppo
npm run dev

# Build per web
npm run build:web

# Lint del codice
npm run lint

# Pulisci cache Expo
expo start --clear
```

## 📊 Come Usare l'App

### 1. Schermata Analytics
- Inserisci un **ID Ticker** (es: 1, 2, 3...)
- Seleziona **Data Inizio** toccando il campo data
- Seleziona **Data Fine** toccando il campo data
- Premi **"Fetch Data"** per caricare i dati
- Interagisci con il grafico toccando i punti per vedere i dettagli

Nota performance grafici:
- I grafici a linee applicano un downsampling automatico per mantenere l'app reattiva su range di date molto ampi.
- Per impostazione predefinita, vengono mostrati al massimo ~60 punti per serie.
- Puoi modificare questo limite in tempo reale dalla schermata Settings (campo "Max Points per Line Chart").
- In alternativa, puoi ancora passare la prop `maxPoints` a `ETFLineChart` per override locale.

### 2. Schermata Settings
- **Clear Cache**: Rimuove tutti i dati memorizzati localmente
- **About**: Informazioni sull'app e versione
- **API Information**: Dettagli sulla configurazione API

## 🌐 Configurazione API

L'app è preconfigurata per utilizzare l'API ETF:
- **Base URL**: `https://wa-etf-analysis-d0enavd0h5e9f5gr.italynorth-01.azurewebsites.net`
- **Endpoint**: `/api/dati`

### Parametri Supportati:
- `id_ticker`: ID numerico del ticker ETF
- `start_date`: Data inizio (formato YYYYMMDD)
- `end_date`: Data fine (formato YYYYMMDD)

### Esempio di Risposta API:
```json
[
  {
    "ID_ticker": 1,
    "calendar_id": 20250101,
    "close_price": "45.67",
    "id_etf_data": 123,
    "insert_datetime": "2025-01-01T10:00:00Z",
    "ticker": "VWCE",
    "volume": 1500000
  }
]
```

## 🏗 Architettura del Progetto

```
├── app/                    # Routing e schermate principali
│   ├── (tabs)/            # Navigazione a tab
│   │   ├── index.tsx      # Schermata Analytics
│   │   ├── settings.tsx   # Schermata Settings
│   │   └── _layout.tsx    # Layout tab
│   ├── _layout.tsx        # Layout root
│   └── +not-found.tsx     # Schermata 404
├── components/            # Componenti riutilizzabili
│   ├── Chart/            # Componenti grafici
│   ├── Form/             # Componenti form
│   └── common/           # Componenti comuni
├── services/             # Servizi API
├── types/                # Definizioni TypeScript
├── utils/                # Utility functions
└── hooks/                # Custom hooks
```

## 🎨 Tecnologie Utilizzate

- **React Native**: Framework per app mobile cross-platform
- **Expo**: Piattaforma per sviluppo React Native
- **TypeScript**: Type safety e migliore developer experience
- **Expo Router**: Navigazione file-based moderna
- **react-native-chart-kit**: Libreria per grafici interattivi
- **Downsampling uniforme**: Capping dei punti grafico per evitare sovraccarichi su dataset estesi
- **AsyncStorage**: Cache locale dei dati
- **Lucide Icons**: Icone moderne e consistenti

## 🐛 Troubleshooting

### Problemi Comuni

**1. "Unable to resolve module"**
```bash
# Pulisci cache e reinstalla
rm -rf node_modules package-lock.json
npm install
expo start --clear
```

**2. "Network request failed"**
- Verifica la connessione internet
- Controlla che l'API sia raggiungibile
- Prova con dati di test diversi

**3. "Metro bundler issues"**
```bash
# Riavvia Metro bundler
expo start --clear
```

**4. "App non si carica su dispositivo"**
- Verifica che dispositivo e computer siano sulla stessa rete
- Prova il tunnel mode: `expo start --tunnel`
- Riavvia Expo Go sul dispositivo

### Debug e Sviluppo

**Aprire Developer Menu:**
- **iOS**: Scuoti il dispositivo o premi Cmd+D nel simulatore
- **Android**: Scuoti il dispositivo o premi Cmd+M (Mac) / Ctrl+M (Windows/Linux)

**Console Logs:**
- I log sono visibili nel terminale dove hai avviato `expo start`
- Usa `console.log()` nel codice per debug

## 📱 Testing su Dispositivi Reali

### iOS (iPhone/iPad)
1. Installa Expo Go dall'App Store
2. Assicurati di essere sulla stessa rete WiFi del computer
3. Scansiona il QR code con l'app Fotocamera
4. L'app si aprirà automaticamente in Expo Go

### Android
1. Installa Expo Go da Google Play Store
2. Apri Expo Go e tocca "Scan QR Code"
3. Scansiona il QR code mostrato nel terminale
4. L'app si caricherà automaticamente

## 🔄 Aggiornamenti in Tempo Reale

L'app supporta **Fast Refresh**: le modifiche al codice si riflettono automaticamente sull'app senza perdere lo stato corrente.

## 📈 Dati di Test

Per testare l'app, puoi usare questi parametri di esempio:
- **ID Ticker**: 1, 2, 3, 4, 5
- **Date Range**: Ultimi 30 giorni (preimpostato)

## 🚀 Deploy in Produzione

Per pubblicare l'app:

```bash
# Build per produzione
expo build:android
expo build:ios

# Oppure usa EAS Build (consigliato)
npm install -g @expo/eas-cli
eas build --platform all
```

## 📞 Supporto

Se incontri problemi:
1. Controlla la sezione Troubleshooting sopra
2. Verifica i log nel terminale
3. Consulta la [documentazione Expo](https://docs.expo.dev/)

## 📄 Licenza

Questo progetto è sviluppato per scopi dimostrativi e di analisi finanziaria.

---

**Buon testing! 🚀**