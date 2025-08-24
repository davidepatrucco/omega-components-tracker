# STATEMENT OF WORK (SOW)
## Sistema Omega Components Tracker
### Soluzione Completa per il Tracciamento di Componenti Industriali

---

**Data:** 24 Agosto 2025  
**Versione:** 1.0  
**Fornitore:** [Nome Azienda]  
**Cliente:** [Nome Cliente]  

---

## 📋 SOMMARIO ESECUTIVO

Omega Components Tracker è una soluzione software completa per il tracciamento e la gestione del ciclo di vita di componenti industriali attraverso tutte le fasi produttive. Il sistema include una **applicazione web** completa e una **applicazione mobile** con scanner per codici a barre, progettate per ottimizzare i processi di produzione e garantire tracciabilità completa.

### Benefici Chiave
- **Tracciabilità Completa**: Monitoraggio in tempo reale di tutti i componenti
- **Efficienza Operativa**: Riduzione del tempo di gestione fino al 60%
- **Mobilità**: Gestione diretta dal piano di produzione tramite dispositivi mobili
- **Sicurezza Dati**: Autenticazione JWT e backup automatici
- **Scalabilità**: Architettura cloud-native pronta per crescita aziendale

---

## 🎯 SCOPE DEL PROGETTO

### Applicazione Web Completa

#### Dashboard e Gestione Commesse
- **Dashboard Operativa**: Vista d'insieme con statistiche in tempo reale
- **Gestione Commesse**: Creazione, modifica e tracciamento ordini di produzione
- **Codici Univoci**: Sistema di generazione automatica codici commessa
- **Ricerca Avanzata**: Filtri multipli per data, stato, cliente, codice

#### Sistema di Tracciamento Componenti
- **Stati Configurabili**: 
  - 1 - Da lavorare
  - 2 - In lavorazione  
  - 2-ext - Lavorazione esterna
  - 3 - Costruito
  - 4 - Controllato
  - 5 - Finito
  - Stati personalizzabili su richiesta
- **Cronologia Completa**: Storico di tutti i cambi stato con timestamp e operatore
- **Gestione Massiva**: Operazioni su selezioni multiple di componenti
- **Esportazione Dati**: Export Excel con template personalizzabili

#### Sistema di Gestione File
- **Upload Documenti**: Gestione allegati per commesse e componenti
- **Integrazione Azure**: Storage cloud sicuro e scalabile
- **Visualizzazione**: Preview integrato per documenti comuni
- **Controllo Accessi**: Permessi granulari per categorie di file

#### Sistema di Notifiche
- **Notifiche Real-time**: Aggiornamenti istantanei su cambi stato
- **Filtri Personalizzabili**: Configurazione per ruolo e preferenze
- **Storico Notifiche**: Registro completo delle comunicazioni
- **Email Integration**: Notifiche via email per eventi critici

#### Gestione Utenti e Sicurezza
- **Profili Ruolo**: ADMIN (completo), UFF (operativo), COLL (collaudo), TRATT
- **Autenticazione JWT**: Sistema sicuro con refresh token automatico
- **Session Management**: Gestione sessioni multiple e logout remoto
- **Audit Trail**: Log completo delle azioni utente

### Applicazione Mobile (iOS/Android)

#### Scanner Codici a Barre
- **Code128 Support**: Scanner ottimizzato per codici industriali
- **Ricerca Immediata**: Lookup istantaneo componenti dal codice
- **Camera Integration**: Utilizzo camera nativa del dispositivo
- **Feedback Visivo**: Conferme immediate di scansione

#### Gestione Stati Mobile
- **Transizioni Rapide**: Cambio stato con un tap dopo scansione
- **Offline Capability**: Funzionamento anche senza connessione
- **Device Tracking**: Identificazione automatica dispositivo nelle modifiche
- **Sincronizzazione**: Sync automatica con sistema centrale

#### Interface Ottimizzata
- **Design Responsive**: Interfaccia adattiva per tutti i dispositivi
- **Navigazione Touch**: Ottimizzata per uso con guanti industriali
- **Modalità Scura**: Utilizzo in ambienti con illuminazione variabile

---

## 🏗️ ARCHITETTURA TECNICA

### Stack Tecnologico
- **Backend**: Node.js + Express.js + MongoDB
- **Frontend Web**: React 18 + Vite + Ant Design
- **Mobile**: React Native + Expo (iOS/Android)
- **Database**: MongoDB con replica set per alta disponibilità
- **Hosting**: AWS ECR + Lightsail con Docker containers
- **Storage**: Azure File Share per documenti
- **Security**: JWT Authentication con refresh tokens

### Caratteristiche Infrastrutturali
- **Containerizzazione**: Deployment via Docker per portabilità
- **CI/CD Pipeline**: Deployment automatizzato con GitHub Actions
- **Load Balancing**: Traefik proxy per distribuzione carico
- **SSL/TLS**: Certificati automatici con Let's Encrypt
- **Backup**: Backup automatici giornalieri database e file
- **Monitoring**: Logging applicativo e monitoring sistema

### Performance e Scalabilità
- **Response Time**: < 200ms per operazioni standard
- **Concurrent Users**: Supporto fino a 100 utenti simultanei
- **Database**: Ottimizzato con indici per query rapide
- **Caching**: Sistema di cache per dati frequenti
- **Mobile Performance**: Sincronizzazione ottimizzata per reti lente

---

## 📱 SPECIFICHE MOBILE APP

### Funzionalità Core
1. **Login Unificato**: Stesse credenziali dell'applicazione web
2. **Scanner Barcode**: Lettura codici Code128 per componenti
3. **Ricerca Componenti**: Lookup istantaneo dal codice scansionato
4. **Cambio Stati**: Transizione automatica stati 1/2/2-ext → "3 - Costruito"
5. **Tracking Dispositivo**: Registrazione device ID per audit trail

### Compatibilità
- **iOS**: Versione 12.0 o superiore
- **Android**: API Level 21 (Android 5.0) o superiore
- **Distribuzione**: App Store e Google Play Store
- **Update OTA**: Aggiornamenti automatici via Expo

---

## 🚀 PIANO DI IMPLEMENTAZIONE

### Fase 1: Setup e Configurazione (Settimana 1)
- [ ] Provisioning infrastruttura AWS
- [ ] Configurazione database MongoDB
- [ ] Setup pipeline CI/CD
- [ ] Configurazione domini e SSL

### Fase 2: Deployment Sistema (Settimana 1-2)
- [ ] Deploy applicazione web in ambiente produzione
- [ ] Configurazione backup automatici
- [ ] Setup monitoring e alerting
- [ ] Test di stress e performance

### Fase 3: Mobile App Deployment (Settimana 2)
- [ ] Build e packaging app mobile
- [ ] Submission a App Store e Google Play
- [ ] Configurazione notifiche push
- [ ] Test integrazione end-to-end

### Fase 4: Training e Go-Live (Settimana 3)
- [ ] Formazione amministratori sistema
- [ ] Training utenti finali
- [ ] Go-live assistito
- [ ] Supporto post-lancio

---

## 📚 DELIVERABLES

### Documentazione Tecnica
- [ ] Manuale Amministratore Sistema
- [ ] Guida Utente Applicazione Web
- [ ] Guida Utente Applicazione Mobile
- [ ] Documentazione API (OpenAPI 3.0)
- [ ] Manuale Installazione e Configurazione

### Software e Licenze
- [ ] Applicazione Web completa
- [ ] Applicazione Mobile (iOS/Android)
- [ ] Codice sorgente completo
- [ ] Script di deployment e backup
- [ ] Licenze software necessarie

### Supporto e Formazione
- [ ] 8 ore di formazione amministratori
- [ ] 16 ore di formazione utenti finali
- [ ] 30 giorni di supporto post go-live
- [ ] Documentazione video tutorial

---

## 💰 STRUTTURA PRICING

### Costo di Implementazione (Una Tantum)
**€ 12.500** IVA esclusa

**Include:**
- Licenza software perpetua per uso interno
- Setup completo infrastruttura
- Configurazione personalizzata
- Deployment applicazioni web e mobile
- Formazione completa del team
- 30 giorni di supporto incluso

### Fee di Mantenimento Mensile
**€ 60** al mese IVA esclusa

**Include:**
- Hosting e infrastruttura AWS
- Backup automatici giornalieri
- Monitoring e alerting 24/7
- Aggiornamenti di sicurezza
- Supporto tecnico via email
- Manutenzione sistema

### Servizi Opzionali
- **Customizzazioni aggiuntive**: €800/giorno sviluppatore
- **Formazione extra**: €150/ora
- **Supporto telefonico prioritario**: +€20/mese
- **SLA 99.9% uptime**: +€50/mese
- **Backup ridondante geografico**: +€30/mese

---

## 📋 TERMS & CONDITIONS

### 1. TERMINI DI PAGAMENTO
- **Anticipo**: 50% alla firma contratto (€6.250)
- **Saldo**: 50% al go-live (€6.250)
- **Fee mensile**: Addebito automatico il 1° di ogni mese
- **Modalità**: Bonifico bancario con fattura elettronica

### 2. DURATA E RINNOVO
- **Durata minima**: 12 mesi dalla data di go-live
- **Rinnovo**: Automatico per periodi di 12 mesi
- **Preavviso disdetta**: 60 giorni prima della scadenza
- **Aumento tariffe**: Massimo 3% annuale su inflazione ISTAT

### 3. LIVELLI DI SERVIZIO (SLA)
- **Uptime garantito**: 99.5% (escluse manutenzioni programmate)
- **Response time supporto**: 24 ore 
- **Risoluzione bug critici**: 24 ore
- **Manutenzioni programmate**: Preavviso 48 ore, weekend preferred

### 4. SUPPORTO E MANUTENZIONE
- **Orari supporto**: Lunedì-Venerdì 9:00-18:00
- **Canali**: Email, ticket system, documentazione online
- **Lingue**: Italiano, Inglese
- **Escalation**: Manager tecnico per issues critiche

### 5. PROPRIETÀ INTELLETTUALE
- **Licenza d'uso**: Perpetua per ambiente cliente specificato
- **Codice sorgente**: Proprietà del fornitore
- **Personalizzazioni**: Proprietà del cliente se sviluppate ad-hoc
- **Dati**: Proprietà esclusiva del cliente

### 6. SICUREZZA E PRIVACY
- **Conformità GDPR**: Piena compliance normativa europea
- **Crittografia**: TLS 1.3 per tutte le comunicazioni
- **Backup**: Crittografati e georidondanti
- **Accesso dati**: Solo personale autorizzato con audit trail

### 7. RESPONSABILITÀ E LIMITAZIONI
- **Responsabilità massima**: Importo fatturato ultimi 12 mesi
- **Forza maggiore**: Eventi non controllabili escludono responsabilità
- **Backup dati**: Responsabilità condivisa con policy definite
- **Customizzazioni**: Testing e acceptance a carico cliente

### 8. RISOLUZIONE CONTROVERSIE
- **Foro competente**: Tribunale di [Città]
- **Legge applicabile**: Legislazione italiana
- **Mediazione**: Tentativo obbligatorio prima di azioni legali
- **Arbitrato**: Camera di Commercio locale per importi > €5.000

### 9. TERMINI SPECIALI COVID-19
- **Smart working**: Supporto completo modalità remote
- **Force majeure**: Estensione per emergenze sanitarie
- **Training**: Modalità online alternative sempre disponibili

### 10. CLAUSOLE AGGIUNTIVE
- **Modifiche contrattuali**: Solo per iscritto con firma ambo parti
- **Cessione contratto**: Possibile con preavviso 30 giorni
- **Aggiornamenti legali**: Adeguamenti normativi inclusi nel canone
- **Exit strategy**: Procedure di migrazione dati in caso di disdetta

---

## ✍️ ACCETTAZIONE

Il presente Statement of Work rappresenta l'offerta completa per la fornitura del Sistema Omega Components Tracker. L'accettazione da parte del Cliente mediante firma costituisce contratto vincolante.

**Validità offerta**: 30 giorni dalla data di emissione

**Per accettazione:**

**FORNITORE**  
Nome: _________________________  
Ruolo: _________________________  
Data: _________________________  
Firma: _________________________  

**CLIENTE**  
Nome: _________________________  
Ruolo: _________________________  
Azienda: ______________________  
Data: _________________________  
Firma: _________________________  

---

*Documento generato automaticamente - Versione 1.0 del 24 Agosto 2025*
