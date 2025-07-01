const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const DATA_FILE = './data.json';

// Чтение данных
function readData() {
  if (!fs.existsSync(DATA_FILE)) return { bookings: [], zones: [] };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Запись данных
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Получить все брони
app.get('/api/bookings', (req, res) => {
  const data = readData();
  res.json(data.bookings);
});

// Добавить бронь
app.post('/api/bookings', (req, res) => {
  const data = readData();
  const booking = { ...req.body, id: Date.now().toString() };
  data.bookings.push(booking);
  writeData(data);
  res.json(booking);
});

// Редактировать бронь
app.put('/api/bookings/:id', (req, res) => {
  const data = readData();
  const idx = data.bookings.findIndex(b => b.id === req.params.id);
  if (idx !== -1) {
    data.bookings[idx] = { ...data.bookings[idx], ...req.body };
    writeData(data);
    res.json(data.bookings[idx]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Удалить бронь
app.delete('/api/bookings/:id', (req, res) => {
  const data = readData();
  data.bookings = data.bookings.filter(b => b.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

// Получить все зоны
app.get('/api/zones', (req, res) => {
  const data = readData();
  res.json(data.zones);
});

// Добавить зону
app.post('/api/zones', (req, res) => {
  const data = readData();
  const zone = { ...req.body, id: Date.now().toString() };
  data.zones.push(zone);
  writeData(data);
  res.json(zone);
});

// Редактировать зону
app.put('/api/zones/:id', (req, res) => {
  const data = readData();
  const idx = data.zones.findIndex(z => z.id === req.params.id);
  if (idx !== -1) {
    data.zones[idx] = { ...data.zones[idx], ...req.body };
    writeData(data);
    res.json(data.zones[idx]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Удалить зону
app.delete('/api/zones/:id', (req, res) => {
  const data = readData();
  data.zones = data.zones.filter(z => z.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
}); 