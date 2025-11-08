let table;
let simplifiedData = []; 
let categories = {}; // oggetto che definisce a quale categoria appartiene ogni alimento
let colors = {}; // colore associato a ciascuna categoria
let cats = []; // lista ordinata delle categorie principali
let forkImg, knifeImg;

function preload() {
  table = loadTable("assets/data.csv", "csv", "header");
  
  forkImg = loadImage("assets/fork.png");
  knifeImg = loadImage("assets/knife.png");
}

// funzione per evitare sovrapposizioni mantenendo i punti nel piatto
function avoidOverlap(points, minDistBase, centerX, centerY, maxRadius) {
  if (!points || points.length === 0) return;

  for (let i = 0; i < points.length; i++) {
    let p1 = points[i];
    if (typeof p1.x !== 'number' || typeof p1.y !== 'number') continue;
    if (typeof p1.r !== 'number') p1.r = minDistBase;

    for (let j = i + 1; j < points.length; j++) {
      let p2 = points[j];
      if (typeof p2.x !== 'number' || typeof p2.y !== 'number') continue;
      if (typeof p2.r !== 'number') p2.r = minDistBase;

      let dx = p2.x - p1.x;
      let dy = p2.y - p1.y;
      let dist = sqrt(dx * dx + dy * dy);

      // distanza minima desiderata considerando i raggi dei due punti
      let desired = max(minDistBase, (p1.r + p2.r) * 0.6 + 2);

      if (dist > 0 && dist < desired) {
        let angle = atan2(dy, dx);
        let overlap = (desired - dist);
        let shift = overlap * 0.5;
        let moveX = cos(angle) * shift;
        let moveY = sin(angle) * shift;

        let d1 = sqrt((p1.x - centerX) ** 2 + (p1.y - centerY) ** 2);
        let d2 = sqrt((p2.x - centerX) ** 2 + (p2.y - centerY) ** 2);
        let edgeFactor1 = constrain(map(d1, 0, maxRadius, 1, 0.3), 0.3, 1);
        let edgeFactor2 = constrain(map(d2, 0, maxRadius, 1, 0.3), 0.3, 1);

        p1.x -= moveX * edgeFactor1;
        p1.y -= moveY * edgeFactor1;
        p2.x += moveX * edgeFactor2;
        p2.y += moveY * edgeFactor2;

        // mantiene entrambi i punti all’interno del cerchio del piatto
        keepInside(p1, centerX, centerY, maxRadius, p1.r);
        keepInside(p2, centerX, centerY, maxRadius, p2.r);
      }
    }
  }
}

// mantiene un punto dentro il cerchio massimo 
function keepInside(p, cx, cy, maxRadius, pr) {
  let dx = p.x - cx;
  let dy = p.y - cy;
  let dist = sqrt(dx * dx + dy * dy);
  let limit = maxRadius - (pr || 0) / 2 - 2; // margine perché il punto non tocchi il bordo
  if (dist > limit && dist > 0) {
    p.x = cx + (dx / dist) * limit;
    p.y = cy + (dy / dist) * limit;
  }
}

function setup() {
  let canvasHeight = min(windowHeight * 0.8, 800);
  createCanvas(windowWidth * 0.9, canvasHeight).parent("canvas-holder");

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
    Cereals: color("#FFD966"),
    Fruits: color("#FFB6C1"),
    Vegetables: color("#9FE2BF"),
    Meat: color("#FF6B6B"),
    Dairy: color("#B5E3FF"),
    Fish: color("#A1C4FD"),
    Roots: color("#E7C6A0"),
    Others: color("#CCCCCC")
  };

  cats = Object.keys(categories);

  // raggruppa i dati per paese e filtra per ridurre la densità 
  let grouped = {};
  for (let r = 0; r < table.getRowCount(); r++) {
    let country = table.getString(r, "country"); 
    let commodity = table.getString(r, "commodity");
    let loss = float(table.getString(r, "loss_percentage"));
    if (isNaN(loss) || loss < 10) continue; // filtra i prodotti con perdita bassa (<10%)
    if (!grouped[country]) grouped[country] = [];
    grouped[country].push({ commodity, loss });
  }

  // conteggio delle voci per categoria
  let totalPerCat = {};
  for (let key of cats) totalPerCat[key] = 0;
  for (let c in grouped) {
    for (let d of grouped[c]) {
      let cat = getCategory(d.commodity);
      totalPerCat[cat]++;
    }
  }

  // disposizione radiale con distanza legata alla perdita
  let catCounts = {};
  for (let key of cats) catCounts[key] = 0;

  let angleStep = TWO_PI / cats.length;

  for (let c in grouped) {
    for (let d of grouped[c]) {
      let cat = getCategory(d.commodity);
      let catIndex = cats.indexOf(cat);
      let baseAngle = catIndex * angleStep;
      let pointIndex = catCounts[cat];
      let ring = floor(pointIndex / 12); // 12 punti per anello
      let posInRing = pointIndex % 12;

      // raggio proporzionale alla perdita, senza uscire dal piatto
      let maxRadius = min(width, height) / 2 - 150;
      let baseRadius = map(d.loss, 0, 50, 120, maxRadius - 50);
      let radius = min(baseRadius + ring * 10, maxRadius);

      // distribuzione angolare uniforme all’interno del settore
      let sectorWidth = angleStep * 0.7; 
      let angleOffset = map(posInRing, 0, 12, -sectorWidth / 2, sectorWidth / 2);
      let angle = baseAngle + angleOffset;

      catCounts[cat]++;

      simplifiedData.push({
        country: c,
        commodity: d.commodity,
        loss: d.loss,
        category: cat,
        x: width / 2 + cos(angle) * radius,
        y: height / 2 + sin(angle) * radius,
        r: map(d.loss, 0, 50, 8, 14)
      });
    }
  }

  // calcola una sola volta le posizioni corrette evitando sovrapposizioni
  let plateRadius = min(width, height) / 2 - 100;
  for (let k = 0; k < 3; k++) {
    avoidOverlap(simplifiedData, 10, width / 2, height / 2, plateRadius);
  }

  noStroke();
}

function draw() {
  background("#FFF8E7");

  // disegno il piatto
  push();
  translate(width / 2, height / 2);
  noStroke();
  fill(200, 200, 200, 100);
  ellipse(20, 20, min(width, height) - 100, min(width, height) - 100);
  for (let i = 0; i < 40; i++) {
    let inter = map(i, 0, 39, 0, 1);
    let c = lerpColor(color("#E0E0E0"), color("#FFFFFF"), inter);
    stroke(c);
    strokeWeight(3);
    noFill();
    ellipse(0, 0, min(width, height) - 120 + i * 2);
  }
  noStroke();
  for (let i = 0; i < 100; i++) {
    let inter = map(i, 0, 99, 0, 1);
    let c = lerpColor(color("#FFFFFF"), color("#F4F4F4"), inter);
    fill(c);
    ellipse(0, 0, min(width, height) - 200 + i * 1.5);
  }
  pop();

  // cerchi concentrici di riferimento
  noFill();
  stroke(200);
  for (let r = 100; r < min(width, height) / 2; r += 100) {
    ellipse(width / 2, height / 2, r * 2);
  }

  // etichette delle categorie intorno al cerchio esterno
  textAlign(CENTER, CENTER);
  noStroke();
  fill(80);
  textSize(16);
  for (let i = 0; i < cats.length; i++) {
    let angle = i * TWO_PI / cats.length;
    let labelX = width / 2 + cos(angle) * (min(width, height) / 2 - 40);
    let labelY = height / 2 + sin(angle) * (min(width, height) / 2 - 40);
    text(cats[i], labelX, labelY);
  }

  // evitiamo sovrapposizioni dei punti
  let plateRadius = min(width, height) / 2 - 100;
  for (let k = 0; k < 3; k++) {
    avoidOverlap(simplifiedData, 10, width / 2, height / 2, plateRadius);
  }

  // disegno punti e impongo hover detection
  let hovered = null;
  noStroke();

  for (let d of simplifiedData) {
    let baseColor = colors[d.category] || color(200);
    let r = d.r;

    // effetto hover morbido e preciso
    let dMouse = dist(mouseX, mouseY, d.x, d.y);
    let isHover = dMouse < r; // soglia per maggiore precisione

    if (d.hoverAmt === undefined) d.hoverAmt = 0;
    let target = isHover ? 1 : 0;
    d.hoverAmt = lerp(d.hoverAmt, target, 0.15); // transizione dolce

    // colore e dimensione con transizione
    let hoverColor = lerpColor(baseColor, color(255), d.hoverAmt * 0.5);
    let scale = 1 + d.hoverAmt * 0.25;

    fill(hoverColor);
    ellipse(d.x, d.y, r * scale);

    if (isHover) {
      hovered = d;
      stroke(255, 220);
      noFill();
      ellipse(d.x, d.y, r * scale + 6);
      noStroke();
    }
  }

  // tooltip traslucido
  if (hovered) {
    let tooltipText = `${hovered.country}\n${hovered.commodity}\nLoss: ${nf(hovered.loss, 1, 1)}%`;

    textSize(14);
    textAlign(LEFT, TOP);
    let padding = 10;
    let lines = tooltipText.split("\n");
    let w = 0;
    for (let line of lines) w = max(w, textWidth(line));
    let h = lines.length * 18 + padding * 2;

    let x = mouseX + 15;
    let y = mouseY - h - 10;
    if (x + w + padding * 2 > width) x = width - w - padding * 2;
    if (y < 0) y = mouseY + 15;

    fill(255, 240);
    stroke(200);
    rect(x, y, w + padding * 2, h, 8);

    noStroke();
    fill(60);
    let ty = y + padding;
    for (let line of lines) {
      text(line, x + padding, ty);
      ty += 18;
    }
  }

  // posate realistiche (immagini) intorno al piatto
  push();
  imageMode(CENTER);

  let plateR = min(width, height) / 2 - 100; // raggio effettivo del piatto
  let forkScale = 1.3;  // regola la dimensione delle posate
  let knifeScale = 1.3;

  // forchetta a sinistra del piatto
  push();
  translate(width / 2 - plateR - 120, height / 2 + 10);
  rotate(radians(-7)); // leggero angolo naturale
  image(forkImg, 0, 0, forkImg.width * forkScale, forkImg.height * forkScale);
  pop();

  // coltello a destra del piatto
  push();
  translate(width / 2 + plateR + 120, height / 2 + 10);
  rotate(radians(7));
  image(knifeImg, 0, 0, knifeImg.width * knifeScale, knifeImg.height * knifeScale);
  pop();

  pop();
}

// controlla se il nome del prodotto contiene una delle parole chiave 
// di una categoria e restituisce quella giusta
function getCategory(commodityName) {
  let name = commodityName.toLowerCase();
  for (let key in categories) {
    if (categories[key].some(k => name.includes(k))) return key;
  }
  return "Others";
}