# Jharkhand Civic Reporter — Mobile (Expo)

This is a React Native app built with Expo that connects to the Flask backend in `../app.py`.
It provides:
- Report Issue (camera/gallery, GPS, submit to backend)
- Issues list with filters (status/category/priority)
- Track Issue by ID

## Prerequisites
- Node.js 18+
- npm or yarn
- Expo Go app on your phone (Android/iOS)
- Flask backend running and reachable on your LAN (same Wi‑Fi)

## 1) Start the backend
From the project root:

```bash
cd ../
source venv/bin/activate
export FLASK_APP=app.py
flask run --host 0.0.0.0 --port 5060
```

Note your machine IP on the LAN, e.g. `192.168.1.23`.

## 2) Configure the mobile app backend URL
Update the `BASE_URL` constant to point to your backend in these files:
- `screens/ReportScreen.js`
- `screens/IssuesScreen.js`
- `screens/TrackScreen.js`

Example:
```js
const BASE_URL = 'http://192.168.1.23:5060';
```

## 3) Install and run the mobile app
```bash
cd mobile
npm install
npx expo start
```
- Scan the QR with the Expo Go app on your phone.
- Approve camera and location permissions when prompted.

## 4) Demo Flow
- Report Issue tab: fill details, tap Use GPS, add photo (camera/gallery), Submit. You’ll get an Issue ID.
- Issues tab: pull to refresh, filter by status/category/priority, view IDs.
- Track tab: paste the Issue ID to see details.

## Notes
- CORS is not required for React Native fetch calls.
- Ensure the phone and the laptop are on the same Wi‑Fi network.
- If you cannot access your backend from the phone, verify:
  - Firewall rules
  - Correct IP and port
  - Backend is running with `--host 0.0.0.0`
