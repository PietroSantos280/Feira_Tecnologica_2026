class UIManager {
  constructor(game) {
    this.game = game;
    this.canvas = document.getElementById("worldCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.toastStack = document.getElementById("toastStack");
    this.shopList = document.getElementById("shopList");
    this.selectedDetails = document.getElementById("selectionDetails");
    this.emptySelection = document.getElementById("emptySelection");
    this.lastStats = null;
    this.setupTools();
    this.setupActions();
  }

  setupTools() {
    document.querySelectorAll(".tool").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".tool").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        this.game.player.selectedTool = button.dataset.tool;
        this.updateHint();
      });
    });
  }

  setupActions() {
    document.getElementById("saveButton").addEventListener("click", () => this.game.save.save(false));
    document.getElementById("sellWoodButton")?.addEventListener("click", () => {
      if (this.game.player.wood <= 0) {
        this.showToast("Sem madeira", "Remova uma árvore para obter madeira.");
        return;
      }
      const amount = this.game.player.wood;
      this.game.player.wood = 0;
      this.game.player.addCoins(amount * 5);
      this.showToast("Madeira vendida", `+${amount * 5} moedas`);
      this.refresh();
      this.game.save.save();
    });
    document.getElementById("exportButton").addEventListener("click", () => this.game.save.export());
    document.getElementById("resetButton").addEventListener("click", () => {
      if (confirm("Resetar o planeta? Todo o progresso local será apagado.")) this.game.save.reset();
    });
    document.getElementById("importInput").addEventListener("change", event => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => this.game.save.import(reader.result);
      reader.readAsText(file);
      event.target.value = "";
    });
  }

  updateHint() {
    const hints = {
      plant: "Selecione Plantar e clique em um tile morto.",
      inspect: "Clique em um tile para analisar o terreno.",
      remove: "Clique em uma árvore para removê-la.",
      river: "Clique em um tile seco para criar um rio por 50 moedas.",
      animal: "Compre um animal e clique em uma área seca dentro do planeta."
    };
    document.getElementById("canvasHint").innerHTML = `<span>${this.game.player.selectedTool === "plant" ? "🌱" : this.game.player.selectedTool === "remove" ? "✋" : "🔎"}</span> ${hints[this.game.player.selectedTool]}`;
  }

  showToast(title, message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
    this.toastStack.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "toast-out .25s ease forwards";
      setTimeout(() => toast.remove(), 260);
    }, 3000);
  }

  setSaveStatus(text) {
    document.getElementById("saveStatus").textContent = text;
  }

  refresh() {
    const player = this.game.player;
    const stats = this.game.world.getStats();
    this.lastStats = stats;

    document.getElementById("coinsValue").textContent = Math.floor(player.coins);
    document.getElementById("seedsValue").textContent = Math.floor(player.seeds);
    document.getElementById("woodValue").textContent = Math.floor(player.wood);
    document.getElementById("treesValue").textContent = stats.trees;
    document.getElementById("bioValue").textContent = `${Math.floor(stats.biodiversity)}%`;
    document.getElementById("soilMetric").textContent = `${Math.floor(stats.avgFertility)}%`;
    document.getElementById("vegetationMetric").textContent = `${Math.floor(stats.greenPercent)}%`;

    const level = this.getPlanetLevel(stats);
    document.getElementById("planetLevelText").textContent = `Nível ${level.level}`;
    document.getElementById("planetStage").textContent = level.name;
    document.getElementById("planetProgress").style.width = `${level.progress}%`;

    document.getElementById("worldCondition").textContent = level.name;
    document.getElementById("conditionOrb").textContent = level.level >= 3 ? "✦" : level.level === 2 ? "·" : "—";

    const missionData = this.game.missions.progress();
    document.getElementById("missionTitle").textContent = missionData.mission.title;
    document.getElementById("missionDescription").textContent = missionData.mission.description;
    document.getElementById("missionCounter").textContent = `${Math.floor(missionData.value)} / ${missionData.mission.target}`;
    document.getElementById("missionProgress").style.width = `${(missionData.value / missionData.mission.target) * 100}%`;

    document.getElementById("dayValue").textContent = this.game.climate.day;

    this.game.shop.render(this.shopList);
    this.renderSelection();
    this.updateHint();
  }

  getPlanetLevel(stats) {
    const score = Math.max(stats.trees * 2.5, stats.biodiversity, stats.greenPercent * .9);
    const levels = [
      [0, "Terra devastada"],
      [8, "Primeiros brotos"],
      [20, "Campos começando a viver"],
      [38, "Florestas jovens"],
      [62, "Ecossistema equilibrado"],
      [82, "Planeta restaurado"]
    ];
    let current = levels[0];
    for (const item of levels) if (score >= item[0]) current = item;
    const next = levels.find(item => item[0] > score);
    const progress = next
      ? ((score - current[0]) / (next[0] - current[0])) * 100
      : 100;
    return { level: levels.indexOf(current) + 1, name: current[1], progress: Math.max(0, Math.min(100, progress)) };
  }

  selectTile(tile) {
    this.game.world.selected = tile;
    this.renderSelection();
  }

  renderSelection() {
    const tile = this.game.world.selected;
    if (!tile) {
      this.emptySelection.classList.remove("hidden");
      this.selectedDetails.classList.add("hidden");
      return;
    }
    this.emptySelection.classList.add("hidden");
    this.selectedDetails.classList.remove("hidden");
    const tree = tile.tree;
    this.selectedDetails.innerHTML = `
      <div class="tile-title">Tile ${tile.x + 1}, ${tile.y + 1} <small>· ${tile.tipoSolo === "wasteland" ? "solo degradado" : "solo seco"}</small></div>
      <div class="detail-grid">
        <div class="detail"><span>Fertilidade</span><strong>${tile.fertility.toFixed(1)}%</strong></div>
        <div class="detail"><span>Umidade</span><strong>${tile.humidity.toFixed(1)}%</strong></div>
        <div class="detail"><span>Vegetação</span><strong>${tile.vegetation.toFixed(1)}%</strong></div>
        <div class="detail"><span>Árvore</span><strong>${tree ? tree.data.name : "Nenhuma"}</strong></div>
        <div class="detail"><span>Animal</span><strong>${tile.animal ? ({ chicken: "Galinhas", horse: "Cavalos", cow: "Vacas" }[tile.animal]) : "Nenhum"}</strong></div>
        <div class="detail"><span>Idade</span><strong>${tree ? `${Math.floor(tree.age)}%` : "—"}</strong></div>
        <div class="detail"><span>Estágio</span><strong>${tree ? tree.stage.name : "—"}</strong></div>
      </div>`;
  }

  drawWorld(time) {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const world = this.game.world;
    const scaleX = canvas.width / (world.cols * WORLD_CONFIG.tileSize);
    const scaleY = canvas.height / (world.rows * WORLD_CONFIG.tileSize);
    const sx = WORLD_CONFIG.tileSize * scaleX;
    const sy = WORLD_CONFIG.tileSize * scaleY;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Base: terreno morto com variação procedural sutil.
    for (let y = 0; y < world.rows; y++) {
      for (let x = 0; x < world.cols; x++) {
        const tile = world.get(x, y);
        const px = x * sx, py = y * sy;
        if (!tile.inPlanet) {
          ctx.fillStyle = "#102b3a";
          ctx.fillRect(px, py, sx + .5, sy + .5);
          continue;
        }
        const dryness = 1 - Math.min(1, tile.fertility / 100);
        const green = Math.min(1, tile.vegetation / 100 + (tile.tree ? .12 : 0));
        const r = Math.round(68 - green * 38 + dryness * 8);
        const g = Math.round(67 + green * 52 - dryness * 5);
        const b = Math.round(54 + green * 20 - dryness * 5);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(px, py, sx + .5, sy + .5);

        // Ruído visual de solo.
        const noise = ((x * 17 + y * 31) % 7) / 7;
        ctx.fillStyle = `rgba(25,20,12,${.06 + noise * .035})`;
        ctx.fillRect(px + sx * .2, py + sy * .35, sx * .12, sy * .08);

        if (tile.water > 0.1) {
          ctx.fillStyle = `rgba(53,113,132,${.55 + tile.water * .3})`;
          ctx.fillRect(px, py, sx, sy);
        }

        if (tile.hover) {
          ctx.fillStyle = "rgba(255,255,255,.10)";
          ctx.fillRect(px, py, sx, sy);
        }
      }
    }

    // Gramíneas aparecem conforme a recuperação.
    for (let y = 0; y < world.rows; y++) {
      for (let x = 0; x < world.cols; x++) {
        const tile = world.get(x, y);
        if (tile.vegetation < 10) continue;
        const px = x * sx, py = y * sy;
        const amount = Math.min(4, Math.floor(tile.vegetation / 22));
        ctx.strokeStyle = "rgba(109,156,83,.55)";
        ctx.lineWidth = Math.max(1, sx * .035);
        for (let i = 0; i < amount; i++) {
          const gx = px + ((x * 13 + y * 7 + i * 11) % 100) / 100 * sx;
          const gy = py + sy * .78;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx - sx * .05, gy - sy * .18);
          ctx.stroke();
        }
      }
    }

    // Árvores em estilo pixel-art suave.
    for (let y = 0; y < world.rows; y++) {
      for (let x = 0; x < world.cols; x++) {
        const tile = world.get(x, y);
        if (!tile.tree) continue;
        const tree = tile.tree;
        const px = x * sx + sx / 2;
        const py = y * sy + sy / 2;
        this.drawTree(ctx, px, py, sx, sy, tree, time);
      }
    }

    // Animais: sprites vetoriais leves, desenhados no próprio canvas.
    for (let y = 0; y < world.rows; y++) {
      for (let x = 0; x < world.cols; x++) {
        const tile = world.get(x, y);
        if (!tile.animal || !tile.inPlanet) continue;
        this.drawAnimal(ctx, x * sx + sx / 2, y * sy + sy / 2, sx, sy, tile.animal, time);
      }
    }

    // Seleção.
    if (world.selected) {
      const t = world.selected;
      ctx.strokeStyle = "rgba(198,236,205,.75)";
      ctx.lineWidth = Math.max(1.2, sx * .045);
      ctx.strokeRect(t.x * sx + 1, t.y * sy + 1, sx - 2, sy - 2);
    }
  }

  drawTree(ctx, x, y, sx, sy, tree, time) {
    const stage = tree.stageIndex;
    const min = Math.min(sx, sy);
    const sway = Math.sin(time * .0017 + x * .08 + y * .05) * sx * (.008 + stage * .003);
    const growth = [.12, .22, .38, .58, .78][stage];
    const trunkH = sy * (.10 + growth * .28);
    const crown = min * (.24 + growth * .34);

    // Sombra macia no chão.
    ctx.save();
    ctx.fillStyle = "rgba(20, 28, 20, .20)";
    ctx.beginPath();
    ctx.ellipse(x + sx * .02, y + sy * .19, crown * .72, crown * .23, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tronco com dois tons para dar volume.
    if (stage > 0) {
      ctx.fillStyle = "#5b432d";
      ctx.fillRect(x - sx * .045, y + sy * .02 - trunkH, sx * .09, trunkH);
      ctx.fillStyle = "rgba(184, 132, 76, .55)";
      ctx.fillRect(x - sx * .012, y + sy * .02 - trunkH, sx * .024, trunkH);
    }

    if (stage === 0) {
      ctx.fillStyle = "#6fa95f";
      ctx.beginPath();
      ctx.ellipse(x, y - sy * .035, sx * .055, sy * .065, -.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const cx = x + sway;
    const cy = y - trunkH;

    // Pinheiro: camadas triangulares.
    if (tree.species === "pine") {
      const layers = stage >= 4 ? 4 : stage >= 2 ? 3 : 2;
      for (let i = 0; i < layers; i++) {
        const yy = cy - crown * .72 + i * crown * .40;
        const half = crown * (.45 + i * .12);
        ctx.fillStyle = i % 2 ? "#286343" : "#347653";
        ctx.beginPath();
        ctx.moveTo(cx, yy - crown * .48);
        ctx.lineTo(cx - half, yy + crown * .38);
        ctx.lineTo(cx + half, yy + crown * .38);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Copa orgânica em 3 massas, evitando o círculo único artificial.
      const base = tree.data.color;
      const hi = tree.species === "ipê" ? "#79a95a" : "#6da15a";
      ctx.fillStyle = base;
      const blobs = [
        [-.34, .06, .58], [.30, .04, .64], [0, -.30, .70], [0, .18, .58]
      ];
      for (const [ox, oy, r] of blobs) {
        ctx.beginPath();
        ctx.arc(cx + crown * ox, cy + crown * oy, crown * r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = hi;
      ctx.globalAlpha = .58;
      ctx.beginPath();
      ctx.arc(cx - crown * .23, cy - crown * .28, crown * .43, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Ipê ganha pequenas flores douradas quando adulto.
      if (tree.species === "ipê" && stage >= 3) {
        ctx.fillStyle = "#f2c95c";
        const flowers = stage === 4 ? 7 : 4;
        for (let i = 0; i < flowers; i++) {
          const a = i * 2.399 + x * .17;
          const rr = crown * (.35 + (i % 3) * .14);
          const fx = cx + Math.cos(a) * rr;
          const fy = cy + Math.sin(a) * rr * .72;
          ctx.beginPath();
          ctx.arc(fx, fy, Math.max(1.2, min * .035), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Pequenos brilhos naturais em árvores maduras.
    if (stage >= 4) {
      ctx.fillStyle = "rgba(205, 231, 132, .48)";
      ctx.beginPath();
      ctx.arc(cx - crown * .28, cy - crown * .25, Math.max(1, min * .025), 0, Math.PI * 2);
      ctx.arc(cx + crown * .18, cy - crown * .05, Math.max(1, min * .022), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawAnimal(ctx, x, y, sx, sy, species, time) {
    const s = Math.min(sx, sy);
    const bob = Math.sin(time * .004 + x * .05) * s * .018;
    const scale = Math.max(.72, Math.min(1.18, s / 24));
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(scale, scale);

    // Sombra.
    ctx.fillStyle = "rgba(20, 28, 20, .18)";
    ctx.beginPath();
    ctx.ellipse(0, s * .22, s * .30, s * .09, 0, 0, Math.PI * 2);
    ctx.fill();

    if (species === "chicken") {
      // Corpo, cabeça, asa e crista.
      ctx.fillStyle = "#f2eee2";
      ctx.beginPath(); ctx.ellipse(-s*.03, s*.02, s*.22, s*.15, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(s*.18, -s*.10, s*.105, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#d95f4d";
      ctx.beginPath(); ctx.arc(s*.18, -s*.20, s*.045, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#e5a83b";
      ctx.beginPath(); ctx.moveTo(s*.27,-s*.08); ctx.lineTo(s*.37,-s*.04); ctx.lineTo(s*.27,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#27372c";
      ctx.beginPath(); ctx.arc(s*.21,-s*.13, s*.018, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#b88332"; ctx.lineWidth = s*.025;
      ctx.beginPath(); ctx.moveTo(-s*.08,s*.13); ctx.lineTo(-s*.08,s*.23); ctx.moveTo(s*.08,s*.13); ctx.lineTo(s*.08,s*.23); ctx.stroke();
    } else if (species === "horse") {
      ctx.fillStyle = "#9a6a49";
      ctx.beginPath(); ctx.ellipse(-s*.02,s*.03,s*.28,s*.16,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s*.23,-s*.10,s*.12,s*.16,-.2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#4c3429";
      ctx.beginPath(); ctx.moveTo(s*.15,-s*.22); ctx.lineTo(s*.07,-s*.35); ctx.lineTo(s*.18,-s*.28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#2d352f";
      ctx.beginPath(); ctx.arc(s*.27,-s*.14,s*.018,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#604332"; ctx.lineWidth = s*.035;
      for (const lx of [-.18,-.02,.13,.25]) {
        ctx.beginPath(); ctx.moveTo(s*lx,s*.13); ctx.lineTo(s*lx,s*.25); ctx.stroke();
      }
    } else {
      // Vaca: corpo branco, manchas e chifres.
      ctx.fillStyle = "#eee8da";
      ctx.beginPath(); ctx.ellipse(-s*.03,s*.02,s*.30,s*.17,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(s*.25,-s*.08,s*.13,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#6b5145";
      ctx.beginPath(); ctx.arc(-s*.14,-s*.04,s*.09,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(s*.05,s*.07,s*.07,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#c79a92";
      ctx.beginPath(); ctx.ellipse(s*.29,s*.01,s*.07,s*.045,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#c7a76d"; ctx.lineWidth = s*.025;
      ctx.beginPath(); ctx.moveTo(s*.20,-s*.18); ctx.lineTo(s*.13,-s*.26); ctx.moveTo(s*.31,-s*.18); ctx.lineTo(s*.37,-s*.25); ctx.stroke();
      ctx.fillStyle = "#27372c";
      ctx.beginPath(); ctx.arc(s*.28,-s*.12,s*.018,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#6f5a4a"; ctx.lineWidth = s*.035;
      for (const lx of [-.18,-.02,.15]) {
        ctx.beginPath(); ctx.moveTo(s*lx,s*.14); ctx.lineTo(s*lx,s*.25); ctx.stroke();
      }
    }
    ctx.restore();
  }
}
