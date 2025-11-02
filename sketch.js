let table;
let simplifiedData = []; 
let categories = {}; // oggetto che definisce a quale categoria appartiene ogni alimento
let colors = {}; // colore associato a ciascuna categoria
let cats = []; // lista ordinata delle categorie principali

function preload() {
  table = loadTable("assets/data.csv", "csv", "header");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Helvetica");
  angleMode(RADIANS);

  // definisco le categorie e i relativi colori
  categories = {
    Cereals: ["rice", "maize", "wheat", "barley", "grain", "oat"],
    Fruits: ["fruit", "banana", "apple", "citrus", "grape", "mango"],
    Vegetables: ["vegetable", "tomato", "onion", "bean", "pulse", "cabbage", "carrot"],
    Meat: ["meat", "beef", "chicken", "pork", "poultry", "lamb"],
    Dairy: ["milk", "dairy", "cheese", "butter", "yogurt"],
    Fish: ["fish", "seafood", "tuna", "salmon", "sea product"],
    Roots: ["cassava", "yam", "potato", "plantain", "sweet potato"],
    Others: []
  };

  colors = {
    Cereals: color("yellow"),
    Fruits: color("purple"),
    Vegetables: color("green"),
    Meat: color("red"),
    Dairy: color("lightblue"),
    Fish: color("blue"),
    Roots: color("brown"),
    Others: color("grey")
  };

  cats = Object.keys(categories); // prende un oggetto e restituisce un array contenente tutte le sue chiavi

  // raggruppa i dati per paese (mantenendo tutti i prodotti)
  let grouped = {};
  for (let r = 0; r < table.getRowCount(); r++) {
    // leggo i dati della riga
    let country = table.getString(r, "country"); 
    let commodity = table.getString(r, "commodity");
    let loss = float(table.getString(r, "loss_percentage"));
    // converte il valore di perdita in numero (float)
    if (isNaN(loss)) continue; // salta i valori non numerici
    if (!grouped[country]) grouped[country] = []; // inizializza l'array se non esiste
    // raggruppa i dati per paese (così ogni nazione ha la sua lista di prodotti)
    grouped[country].push({ commodity, loss });
  }

  // conteggio delle voci per categoria
  // serve per spaziare i punti in modo regolare (evita sovrapposizioni)
  let totalPerCat = {};
  for (let key of cats) totalPerCat[key] = 0;
  for (let c in grouped) {
    for (let d of grouped[c]) {
      let cat = getCategory(d.commodity);
      totalPerCat[cat]++;
    }
  }

  // posizionamento radiale ordinato
let catCounts = {};
for (let key of cats) catCounts[key] = 0;

// trovo il massimo numero di punti tra tutte le categorie
let maxPerCat = 0;
for (let key in totalPerCat) {
  if (totalPerCat[key] > maxPerCat) maxPerCat = totalPerCat[key];
}

let angleStep = TWO_PI / cats.length; // divide il cerchio in parti uguali

for (let c in grouped) {
  for (let d of grouped[c]) {
    let cat = getCategory(d.commodity);
    let catIndex = cats.indexOf(cat);
    let angleBase = catIndex * angleStep;

    // la distanza dal centro (lossMapped) dipende dalla percentuale di perdita
    // più alta è la perdita, più lontano dal centro sarà il punto
    let radiusOffset = map(catCounts[cat], 0, totalPerCat[cat], -5, 5); // piccolo offset radiale
    let lossMapped = map(d.loss, 0, 50, 100, min(width, height) / 2 - 120) + radiusOffset;

    // calcolo arco proporzionale al numero di punti nella categoria
    let arcSpan = map(totalPerCat[cat], 1, maxPerCat, angleStep / 2, angleStep);
    let offset = map(catCounts[cat], 0, totalPerCat[cat]-1, -arcSpan / 2, arcSpan / 2); 
    catCounts[cat]++;

    let angle = angleBase + offset;

    // riduzione dinamica del raggio in base alla densità della categoria
    let densityFactor = totalPerCat[cat] / maxPerCat;
    let r = map(d.loss, 0, 50, 5, 12) * (1 - 0.3 * densityFactor);

    // salvataggio di tutti i punti con coordinate già pronte per il disegno
    simplifiedData.push({
      country: c,
      commodity: d.commodity,
      loss: d.loss,
      category: cat,
      x: width / 2 + cos(angle) * lossMapped,
      y: height / 2 + sin(angle) * lossMapped,
      angle: angle,
      r: r // salvo il raggio calcolato
    });
  }
}
  noStroke();
}

function draw() {
  background(15);

  // cerchi concentrici di riferimento
  noFill();
  stroke(50);
  for (let r = 100; r < min(width, height) / 2; r += 100) {
    ellipse(width / 2, height / 2, r * 2);
  }

  // etichette categorie intorno al cerchio
  textAlign(CENTER, CENTER);
  noStroke();
  fill(180);
  textSize(16);
  for (let i = 0; i < cats.length; i++) {
    let angle = i * TWO_PI / cats.length;
    let labelX = width / 2 + cos(angle) * (min(width, height) / 2 - 40);
    let labelY = height / 2 + sin(angle) * (min(width, height) / 2 - 40);
    text(cats[i], labelX, labelY);
  }

  // disegno punti e impongo hover detection
  let hovered = null;

  // ogni dato viene rappresentato con un cerchio colorato
  noStroke();
  for (let d of simplifiedData) {
    let baseColor = colors[d.category] || color(200);
    let r = map(d.loss, 0, 50, 5, 12);

    fill(baseColor);
    ellipse(d.x, d.y, r);

    // se il mouse si avvicina al centro del cerchio (dMouse < r/2), 
    // quel punto diventa l’elemento attivo (hovered)
    let dMouse = dist(mouseX, mouseY, d.x, d.y);
    if (dMouse < r / 2) {
      hovered = d;
      stroke(255);
      noFill();
      ellipse(d.x, d.y, r + 5);
      noStroke();
    }
  }

  // tooltip traslucido
  // “segue” il mouse, ma con un piccolo margine per rimanere leggibile
  if (hovered) {
    let tooltipText = `${hovered.country}\n${hovered.commodity}\nLoss: ${nf(hovered.loss, 1, 1)}%`;

    textSize(14);
    textAlign(LEFT, TOP);
    let padding = 10;
    let lines = tooltipText.split("\n");
    let w = 0;
    for (let line of lines) {
      w = max(w, textWidth(line));
    }
    let h = lines.length * 18 + padding * 2;

    let x = mouseX + 15;
    let y = mouseY - h - 10;
    if (x + w + padding * 2 > width) x = width - w - padding * 2;
    if (y < 0) y = mouseY + 15;

    // box traslucido
    fill(30, 30, 30, 200);
    stroke(255, 100);
    strokeWeight(1);
    rect(x, y, w + padding * 2, h, 8);

    // testo bianco
    noStroke();
    fill(255);
    let ty = y + padding;
    for (let line of lines) {
      text(line, x + padding, ty);
      ty += 18;
    }
  }
}

// controlla se il nome del prodotto contiene una delle parole chiave 
// di una categoria e restituisce quella giusta
// serve per assegnare automaticamente ogni riga del CSV alla categoria corretta
function getCategory(commodityName) {
  let name = commodityName.toLowerCase();
  for (let key in categories) {
    if (categories[key].some(k => name.includes(k))) return key;
  }
  // altrimenti restituisce "Others"
  return "Others";
}