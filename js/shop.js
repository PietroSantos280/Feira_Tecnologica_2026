class ShopSystem {
  constructor(game) {
    this.game = game;
    this.items = [
      { id: "common", name: "Semente comum", description: "Espécie pioneira e resistente.", icon: "🌱", cost: 0, species: "common" },
      { id: "pine", name: "Pinheiro", description: "Cresce rápido e tolera solo seco.", icon: "🌲", cost: 8, species: "pine" },
      { id: "oak", name: "Carvalho", description: "Lento, robusto e excelente para o solo.", icon: "🌳", cost: 15, species: "oak" },
      { id: "ipê", name: "Ipê", description: "Grande valor ecológico e biodiversidade.", icon: "🌼", cost: 22, species: "ipê" }
    ];
  }

  buy(itemId) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return false;
    if (!this.game.player.spendCoins(item.cost)) return false;
    this.game.player.seeds += 1;
    this.game.player.selectedSpecies = item.species;
    this.game.ui.showToast("Semente adquirida", `${item.name} pronta para plantar.`);
    this.game.ui.refresh();
    return true;
  }

  render(container) {
    container.innerHTML = this.items.map(item => {
      const selected = this.game.player.selectedSpecies === item.species;
      const disabled = this.game.player.coins < item.cost;
      return `
        <div class="shop-item">
          <div class="shop-icon">${item.icon}</div>
          <div>
            <h3>${item.name}${selected ? " · selecionada" : ""}</h3>
            <p>${item.description}</p>
          </div>
          <div>
            <button class="buy-button" data-buy="${item.id}" ${item.cost === 0 ? "" : disabled ? "disabled" : ""}>
              ${item.cost === 0 ? "Usar" : "Comprar"}
            </button>
            <span class="price">${item.cost === 0 ? "gratuita" : `◉ ${item.cost}`}</span>
          </div>
        </div>`;
    }).join("");

    container.querySelectorAll("[data-buy]").forEach(button => {
      button.addEventListener("click", () => {
        const item = this.items.find(i => i.id === button.dataset.buy);
        if (item.cost === 0) {
          this.game.player.selectedSpecies = item.species;
          this.game.ui.showToast("Espécie selecionada", `${item.name} será usada no próximo plantio.`);
          this.game.ui.refresh();
        } else {
          this.buy(button.dataset.buy);
        }
      });
    });
  }
}
