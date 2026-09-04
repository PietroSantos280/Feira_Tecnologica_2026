class EventSystem {
  constructor(game) {
    this.game = game;
    this.timer = 0;
  }

  update(dt) {
    // Eventos completos entram na Fase 5. Este ponto mantém a arquitetura pronta.
    this.timer += dt;
  }
}
